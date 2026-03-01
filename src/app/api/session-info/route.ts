import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

// Pricing per million tokens (Feb 2026)
const PRICING: Record<string, { input: number; output: number; cacheRead: number; cacheCreate: number }> = {
  'claude-opus-4-6': { input: 15, output: 75, cacheRead: 1.5, cacheCreate: 18.75 },
  'claude-sonnet-4-6': { input: 3, output: 15, cacheRead: 0.3, cacheCreate: 3.75 },
  'claude-haiku-4-5': { input: 0.8, output: 4, cacheRead: 0.08, cacheCreate: 1 },
  'claude-haiku-4-5-20251001': { input: 0.8, output: 4, cacheRead: 0.08, cacheCreate: 1 },
};

// Context window sizes per model
const CONTEXT_WINDOW: Record<string, number> = {
  'claude-opus-4-6': 200000,
  'claude-sonnet-4-6': 200000,
  'claude-haiku-4-5': 200000,
  'claude-haiku-4-5-20251001': 200000,
};

function formatModelName(model: string): string {
  if (model.includes('opus-4')) return 'Opus 4.6';
  if (model.includes('sonnet-4-6')) return 'Sonnet 4.6';
  if (model.includes('sonnet-4-5')) return 'Sonnet 4.5';
  if (model.includes('haiku-4-5')) return 'Haiku 4.5';
  if (model.includes('haiku-4')) return 'Haiku 4';
  return model.replace('claude-', '').replace(/-\d{8}$/, '');
}

function getPricing(model: string) {
  for (const [key, price] of Object.entries(PRICING)) {
    if (model.includes(key) || model === key) return price;
  }
  // default to sonnet pricing
  return PRICING['claude-sonnet-4-6'];
}

function getContextWindow(model: string): number {
  for (const [key, size] of Object.entries(CONTEXT_WINDOW)) {
    if (model.includes(key) || model === key) return size;
  }
  return 200000;
}

interface Usage {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens: number;
  cache_creation_input_tokens: number;
}

interface TranscriptEntry {
  type: string;
  sessionId?: string;
  gitBranch?: string;
  cwd?: string;
  message?: {
    model?: string;
    usage?: Usage;
    content?: Array<{ type: string; text?: string }> | string;
  };
  timestamp?: string;
}

export interface SessionInfo {
  sessionId: string;
  model: string;
  modelDisplay: string;
  gitBranch: string;
  cwd: string;
  project: string;
  lastPrompt: string;
  tokens: {
    input: number;
    output: number;
    cacheRead: number;
    cacheCreate: number;
    total: number;
    lastTurnInput: number;
    contextPct: number;
  };
  cost: number;
  updatedAt: string;
}

async function findLatestTranscript(): Promise<string | null> {
  const home = process.env.HOME || os.homedir();
  const projectsDir = path.join(home, '.claude', 'projects');

  try {
    const dirs = await fs.readdir(projectsDir);
    const allFiles: { path: string; mtime: number }[] = [];

    for (const dir of dirs) {
      const dirPath = path.join(projectsDir, dir);
      try {
        const stat = await fs.stat(dirPath);
        if (!stat.isDirectory()) continue;
        const files = await fs.readdir(dirPath);
        for (const file of files) {
          if (!file.endsWith('.jsonl')) continue;
          const filePath = path.join(dirPath, file);
          try {
            const fstat = await fs.stat(filePath);
            // skip tiny files (< 500 bytes) — likely empty sessions
            if (fstat.size < 500) continue;
            allFiles.push({ path: filePath, mtime: fstat.mtimeMs });
          } catch { /* skip */ }
        }
      } catch { /* skip */ }
    }

    if (allFiles.length === 0) return null;
    allFiles.sort((a, b) => b.mtime - a.mtime);
    return allFiles[0].path;
  } catch {
    return null;
  }
}

export async function GET() {
  const transcriptPath = await findLatestTranscript();
  if (!transcriptPath) {
    return NextResponse.json(null);
  }

  try {
    const content = await fs.readFile(transcriptPath, 'utf-8');
    const lines = content.split('\n').filter((l) => l.trim());

    let model = '';
    let gitBranch = '';
    let cwd = '';
    let sessionId = '';
    let lastPrompt = '';
    // cumulative cost tracking
    const totalUsage: Usage = {
      input_tokens: 0,
      output_tokens: 0,
      cache_read_input_tokens: 0,
      cache_creation_input_tokens: 0,
    };
    // last turn usage for context % (reflects current context window state)
    let lastTurnUsage: Usage | null = null;

    for (const line of lines) {
      try {
        const entry: TranscriptEntry = JSON.parse(line);

        if (entry.sessionId) sessionId = entry.sessionId;
        if (entry.gitBranch && entry.gitBranch !== 'HEAD') gitBranch = entry.gitBranch;
        if (entry.cwd) cwd = entry.cwd;

        if (entry.type === 'assistant' && entry.message) {
          if (entry.message.model) model = entry.message.model;
          if (entry.message.usage) {
            const u = entry.message.usage;
            totalUsage.input_tokens += u.input_tokens || 0;
            totalUsage.output_tokens += u.output_tokens || 0;
            totalUsage.cache_read_input_tokens += u.cache_read_input_tokens || 0;
            totalUsage.cache_creation_input_tokens += u.cache_creation_input_tokens || 0;
            lastTurnUsage = u;
          }
        }

        if (entry.type === 'user' && entry.message) {
          const content = entry.message.content;
          if (typeof content === 'string' && content.trim()) {
            lastPrompt = content.trim().slice(0, 80);
          } else if (Array.isArray(content)) {
            const textPart = content.find((c) => c.type === 'text' && c.text);
            if (textPart?.text) lastPrompt = textPart.text.trim().slice(0, 80);
          }
        }
      } catch { /* skip malformed lines */ }
    }

    if (!model) return NextResponse.json(null);

    const pricing = getPricing(model);
    const contextWindow = getContextWindow(model);

    // context % from last turn (how full the window is right now)
    const lastTurn = lastTurnUsage ?? totalUsage;
    const lastTurnInput =
      (lastTurn.input_tokens || 0) +
      (lastTurn.cache_read_input_tokens || 0) +
      (lastTurn.cache_creation_input_tokens || 0);

    // total cumulative input for cost
    const totalInputTokens =
      totalUsage.input_tokens +
      totalUsage.cache_read_input_tokens +
      totalUsage.cache_creation_input_tokens;

    const cost =
      (totalUsage.input_tokens * pricing.input +
        totalUsage.output_tokens * pricing.output +
        totalUsage.cache_read_input_tokens * pricing.cacheRead +
        totalUsage.cache_creation_input_tokens * pricing.cacheCreate) /
      1_000_000;

    const contextPct = Math.min(100, Math.round((lastTurnInput / contextWindow) * 100));

    const project = cwd ? path.basename(cwd) : '';

    const sessionInfo: SessionInfo = {
      sessionId,
      model,
      modelDisplay: formatModelName(model),
      gitBranch: gitBranch || 'HEAD',
      cwd,
      project,
      lastPrompt,
      tokens: {
        input: totalUsage.input_tokens,
        output: totalUsage.output_tokens,
        cacheRead: totalUsage.cache_read_input_tokens,
        cacheCreate: totalUsage.cache_creation_input_tokens,
        total: totalInputTokens + totalUsage.output_tokens,
        lastTurnInput,
        contextPct,
      },
      cost,
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json(sessionInfo);
  } catch (error) {
    console.error('[session-info] Error:', error);
    return NextResponse.json(null);
  }
}

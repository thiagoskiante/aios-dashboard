import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

function getProjectRoot(): string {
  if (process.env.AIOS_PROJECT_ROOT) {
    return process.env.AIOS_PROJECT_ROOT;
  }
  return path.resolve(process.cwd(), '..', '..');
}

export type AgentCategory = 'aios-core' | 'chiefs' | 'specialists' | 'meta';

export interface CatalogAgent {
  id: string;
  name: string;
  description: string;
  category: AgentCategory;
}

export interface AgentsCatalogResponse {
  agents: CatalogAgent[];
  byCategory: Record<AgentCategory, CatalogAgent[]>;
  total: number;
}

function parseAgentFrontmatter(content: string): { name: string; description: string } {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) return { name: '', description: '' };

  const block = match[1];

  const nameMatch = block.match(/^name:\s*(.+)$/m);
  const name = nameMatch ? nameMatch[1].trim() : '';

  // description can be a multiline block scalar
  const descMatch = block.match(/^description:\s*\|?\s*\n([\s\S]*?)(?=\n\S|\n*$)/m);
  let description = '';
  if (descMatch) {
    description = descMatch[1]
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .join(' ')
      .trim();
  } else {
    const inlineMatch = block.match(/^description:\s*(.+)$/m);
    if (inlineMatch) description = inlineMatch[1].trim();
  }

  return { name, description };
}

function categorize(id: string): AgentCategory {
  if (id.startsWith('aios-')) return 'aios-core';
  if (id.endsWith('-chief')) return 'chiefs';
  if (id === 'squad' || id === 'oalanicolas') return 'meta';
  return 'specialists';
}

export async function GET() {
  try {
    const projectRoot = getProjectRoot();
    const agentsDir = path.join(projectRoot, 'aios-core', '.claude', 'agents');

    let files: string[];
    try {
      files = await fs.readdir(agentsDir);
    } catch {
      return NextResponse.json({ agents: [], byCategory: {}, total: 0 });
    }

    const mdFiles = files.filter((f) => f.endsWith('.md'));

    const agents: CatalogAgent[] = [];

    for (const file of mdFiles) {
      const filePath = path.join(agentsDir, file);
      const content = await fs.readFile(filePath, 'utf-8');
      const { name, description } = parseAgentFrontmatter(content);
      const id = file.replace(/\.md$/, '');
      const category = categorize(id);

      agents.push({
        id,
        name: name || id,
        description,
        category,
      });
    }

    // Sort: aios-core first, then chiefs, specialists, meta
    const ORDER: AgentCategory[] = ['aios-core', 'chiefs', 'specialists', 'meta'];
    agents.sort((a, b) => {
      const ai = ORDER.indexOf(a.category);
      const bi = ORDER.indexOf(b.category);
      if (ai !== bi) return ai - bi;
      return a.id.localeCompare(b.id);
    });

    const byCategory = agents.reduce(
      (acc, agent) => {
        if (!acc[agent.category]) acc[agent.category] = [];
        acc[agent.category].push(agent);
        return acc;
      },
      {} as Record<AgentCategory, CatalogAgent[]>
    );

    return NextResponse.json({
      agents,
      byCategory,
      total: agents.length,
    } satisfies AgentsCatalogResponse);
  } catch (error) {
    console.error('[agents-catalog] Error:', error);
    return NextResponse.json({ agents: [], byCategory: {}, total: 0 }, { status: 500 });
  }
}

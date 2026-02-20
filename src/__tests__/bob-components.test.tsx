import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { useBobStore } from '@/stores/bob-store';
import { BobPipelinePanel } from '@/components/bob/BobPipelinePanel';
import { BobAgentActivity } from '@/components/bob/BobAgentActivity';
import { BobSurfaceAlert } from '@/components/bob/BobSurfaceAlert';
import { BobOrchestrationView } from '@/components/bob/BobOrchestrationView';

const SAMPLE_STATUS = {
  active: true,
  timestamp: new Date().toISOString(),
  orchestration: { active: true },
  pipeline: {
    stages: ['validation', 'development', 'self_healing', 'quality_gate', 'push', 'checkpoint'],
    current_stage: 'development',
    story_progress: '3/8',
    completed_stages: ['validation'],
  },
  current_agent: {
    id: 'dev',
    name: 'Dex',
    task: 'implementing jwt-handler',
    reason: 'code_general',
    started_at: new Date().toISOString(),
  },
  active_terminals: [
    { agent: 'dev', pid: 12345, task: 'jwt-handler', elapsed: '4m32s' },
  ],
  surface_decisions: [],
  elapsed: { story_seconds: 272, session_seconds: 1380 },
  errors: [],
  educational: { enabled: false, tradeoffs: [], reasoning: [] },
};

beforeEach(() => {
  act(() => {
    useBobStore.getState().reset();
  });
});

describe('BobPipelinePanel', () => {
  it('should not render when Bob is inactive', () => {
    const { container } = render(<BobPipelinePanel />);
    expect(container.innerHTML).toBe('');
  });

  it('should render pipeline stages when active', () => {
    act(() => { useBobStore.getState().updateFromStatus(SAMPLE_STATUS); });
    render(<BobPipelinePanel />);

    expect(screen.getByText('Bob Orchestration')).toBeInTheDocument();
    expect(screen.getByText('Story 3/8')).toBeInTheDocument();
    expect(screen.getByText('Dev')).toBeInTheDocument();
  });

  it('should show current agent info', () => {
    act(() => { useBobStore.getState().updateFromStatus(SAMPLE_STATUS); });
    render(<BobPipelinePanel />);

    expect(screen.getByText(/implementing jwt-handler/)).toBeInTheDocument();
  });

  it('should show terminal count', () => {
    act(() => { useBobStore.getState().updateFromStatus(SAMPLE_STATUS); });
    render(<BobPipelinePanel />);

    expect(screen.getByText(/Terminals: 1 active/)).toBeInTheDocument();
  });
});

describe('BobAgentActivity', () => {
  it('should not render when Bob is inactive', () => {
    const { container } = render(<BobAgentActivity />);
    expect(container.innerHTML).toBe('');
  });

  it('should show placeholder when no agents active', () => {
    act(() => { useBobStore.getState().updateFromStatus({ ...SAMPLE_STATUS, current_agent: null, active_terminals: [] }); });
    render(<BobAgentActivity />);

    expect(screen.getByText('Nenhum agente ativo no momento')).toBeInTheDocument();
  });

  it('should show agent cards when agents active', () => {
    act(() => { useBobStore.getState().updateFromStatus(SAMPLE_STATUS); });
    render(<BobAgentActivity />);

    expect(screen.getByText('@dev')).toBeInTheDocument();
    expect(screen.getByText('jwt-handler')).toBeInTheDocument();
  });
});

describe('BobSurfaceAlert', () => {
  it('should not render when no pending decisions', () => {
    act(() => { useBobStore.getState().updateFromStatus(SAMPLE_STATUS); });
    const { container } = render(<BobSurfaceAlert />);
    expect(container.innerHTML).toBe('');
  });

  it('should render alert when surface decision pending', () => {
    act(() => { useBobStore.getState().updateFromStatus({ ...SAMPLE_STATUS, surface_decisions: [{ criteria: 'C003', action: 'present_options', timestamp: new Date().toISOString(), resolved: false }] }); });
    render(<BobSurfaceAlert />);

    expect(screen.getByText('Bob precisa da sua atenção no CLI')).toBeInTheDocument();
    expect(screen.getByText(/C003/)).toBeInTheDocument();
  });

  it('should not render resolved decisions', () => {
    act(() => { useBobStore.getState().updateFromStatus({ ...SAMPLE_STATUS, surface_decisions: [{ criteria: 'C003', action: 'present_options', timestamp: new Date().toISOString(), resolved: true }] }); });
    const { container } = render(<BobSurfaceAlert />);
    expect(container.innerHTML).toBe('');
  });
});

describe('BobOrchestrationView', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should show placeholder when Bob is not active', async () => {
    await act(async () => {
      render(<BobOrchestrationView />);
    });

    expect(screen.getByText('Bob não está ativo')).toBeInTheDocument();
    expect(screen.getByText(/Inicie Bob no CLI/)).toBeInTheDocument();
  });

  it('should render orchestration view when Bob is active', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(SAMPLE_STATUS), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    act(() => { useBobStore.getState().updateFromStatus(SAMPLE_STATUS); });
    await act(async () => {
      render(<BobOrchestrationView />);
    });

    expect(screen.getByText('Bob Orchestration')).toBeInTheDocument();
  });

  it('should show errors when present', async () => {
    const statusWithErrors = { ...SAMPLE_STATUS, errors: [{ phase: 'development', message: 'Test failure', recoverable: true }] };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(statusWithErrors), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    act(() => { useBobStore.getState().updateFromStatus(statusWithErrors); });
    await act(async () => {
      render(<BobOrchestrationView />);
    });

    expect(screen.getByText('Errors (1)')).toBeInTheDocument();
    expect(screen.getByText('Test failure')).toBeInTheDocument();
  });
});

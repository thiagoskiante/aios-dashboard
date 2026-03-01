'use client';

import { cn } from '@/lib/utils';
import { useAgentsCatalog } from '@/hooks/use-agents-catalog';
import { Loader2 } from 'lucide-react';
import type { AgentCategory } from '@/app/api/agents-catalog/route';

const CATEGORY_CONFIG: Record<AgentCategory, { label: string; description: string; color: string }> = {
  'aios-core': {
    label: 'AIOS Core',
    description: 'Agentes base do sistema — dev, qa, architect, devops e mais',
    color: 'var(--agent-dev)',
  },
  chiefs: {
    label: 'Chiefs',
    description: 'Orquestradores especializados — copy, design, tráfego, jurídico e mais',
    color: 'var(--gold)',
  },
  specialists: {
    label: 'Especialistas',
    description: 'Agentes focados — design system, banco de dados, workflows',
    color: 'var(--agent-architect)',
  },
  meta: {
    label: 'Meta',
    description: 'Criam outros agentes e squads, clonam mentes',
    color: 'var(--agent-qa)',
  },
};

const CATEGORY_ORDER: AgentCategory[] = ['aios-core', 'chiefs', 'specialists', 'meta'];

export function AgentCatalog() {
  const { byCategory, total, isLoading } = useAgentsCatalog();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="h-5 w-5 animate-spin text-gold mx-auto mb-3" />
          <span className="text-label text-text-muted uppercase tracking-wider">
            Carregando agentes...
          </span>
        </div>
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-sm text-text-muted">Nenhum agente encontrado</p>
          <p className="text-label text-text-disabled mt-1">
            Verifique que <code className="text-gold">aios-core/.claude/agents/</code> existe
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-10">
      {CATEGORY_ORDER.map((category) => {
        const agents = byCategory[category];
        if (!agents || agents.length === 0) return null;
        const config = CATEGORY_CONFIG[category];

        return (
          <section key={category}>
            <div className="mb-4">
              <div className="flex items-center gap-3 mb-1">
                <span
                  className="text-detail font-medium uppercase tracking-[0.2em]"
                  style={{ color: config.color }}
                >
                  {config.label}
                </span>
                <div className="flex-1 h-px bg-border" />
              </div>
              <p className="text-label text-text-muted">{config.description}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {agents.map((agent) => (
                <div
                  key={agent.id}
                  className={cn(
                    'p-4 bg-card border border-border border-l-2',
                    'transition-luxury hover:bg-card-hover hover:border-border-medium'
                  )}
                  style={{ borderLeftColor: config.color }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <code
                      className="text-label font-mono font-medium"
                      style={{ color: config.color }}
                    >
                      @{agent.id}
                    </code>
                  </div>
                  {agent.description && (
                    <p className="text-label text-text-muted leading-relaxed line-clamp-3">
                      {agent.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

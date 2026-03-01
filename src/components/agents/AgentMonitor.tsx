'use client';

import { useState } from 'react';
import { RefreshCw, Pause, Moon, BookOpen, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { iconMap } from '@/lib/icons';
import { useAgents } from '@/hooks/use-agents';
import { useAgentStore } from '@/stores/agent-store';
import { AgentCard } from './AgentCard';
import { AgentCatalog } from './AgentCatalog';
import { SectionLabel } from '@/components/ui/section-label';
import { StatusDot } from '@/components/ui/status-dot';

type Tab = 'monitor' | 'catalog';

export function AgentMonitor() {
  const { activeAgents, idleAgents, isLoading, refresh } = useAgents();
  const { pollingInterval, setPollingInterval } = useAgentStore();
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('monitor');

  const toggleAutoRefresh = () => {
    if (autoRefresh) {
      setPollingInterval(0);
    } else {
      setPollingInterval(5000);
    }
    setAutoRefresh(!autoRefresh);
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border-subtle">
        <div className="flex items-center gap-4">
          {/* Tabs */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('monitor')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-label font-medium',
                'border transition-luxury',
                activeTab === 'monitor'
                  ? 'bg-border-medium border-border text-text-primary'
                  : 'bg-transparent border-transparent text-text-muted hover:text-text-secondary'
              )}
            >
              <Activity className="h-3 w-3" />
              Monitor
            </button>
            <button
              onClick={() => setActiveTab('catalog')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-label font-medium',
                'border transition-luxury',
                activeTab === 'catalog'
                  ? 'bg-border-medium border-border text-text-primary'
                  : 'bg-transparent border-transparent text-text-muted hover:text-text-secondary'
              )}
            >
              <BookOpen className="h-3 w-3" />
              Catalog
            </button>
          </div>

          {activeTab === 'monitor' && (
            <>
              <div className="h-8 w-px bg-border-subtle" />
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-light text-text-primary">{activeAgents.length}</span>
                <span className="text-label text-text-muted">/ {activeAgents.length + idleAgents.length} active</span>
              </div>
            </>
          )}
        </div>

        {activeTab === 'monitor' && (
          <div className="flex items-center gap-3">
            <button
              onClick={toggleAutoRefresh}
              aria-label={autoRefresh ? 'Pause auto-refresh' : 'Enable auto-refresh'}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-label font-medium',
                'border transition-luxury',
                autoRefresh
                  ? 'bg-status-success-bg border-status-success-border text-status-success'
                  : 'bg-border border-border text-text-tertiary'
              )}
            >
              {autoRefresh ? (
                <>
                  <StatusDot status="success" size="sm" glow />
                  Live
                </>
              ) : (
                <>
                  <Pause className="h-3 w-3" />
                  Paused
                </>
              )}
            </button>

            <button
              onClick={() => refresh()}
              disabled={isLoading}
              aria-label="Refresh agent data"
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-label',
                'border border-border bg-border',
                'text-text-secondary hover:text-text-primary',
                'hover:bg-border-medium transition-luxury',
                isLoading && 'opacity-50 cursor-not-allowed'
              )}
            >
              <RefreshCw className={cn('h-3 w-3', isLoading && 'animate-spin')} />
              Refresh
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      {activeTab === 'catalog' ? (
        <div className="flex-1 overflow-y-auto scrollbar-refined">
          <AgentCatalog />
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto p-6 scrollbar-refined">
            {activeAgents.length > 0 && (
              <section className="mb-8">
                <SectionLabel withLine className="mb-4">Active</SectionLabel>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeAgents.map((agent) => (
                    <AgentCard key={agent.id} agent={agent} />
                  ))}
                </div>
              </section>
            )}

            {activeAgents.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16">
                <Moon className="h-8 w-8 text-text-disabled mb-4" />
                <p className="text-text-tertiary font-light mb-1">All agents standing by</p>
                <p className="text-label text-text-muted">
                  Activate via CLI: <code className="text-gold">@agent-name</code>
                </p>
              </div>
            )}

            {idleAgents.length > 0 && (
              <section>
                <SectionLabel variant="muted" withLine className="mb-4">Standby</SectionLabel>
                <div className="flex flex-wrap gap-2">
                  {idleAgents.map((agent) => (
                    <div
                      key={agent.id}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2',
                        'bg-border border border-border',
                        'text-label text-text-muted',
                        'transition-luxury hover:bg-border-medium hover:text-text-tertiary'
                      )}
                    >
                      <StatusDot status="idle" size="sm" glow={false} />
                      {(() => {
                        const IconComponent = iconMap[agent.icon];
                        return IconComponent ? <IconComponent className="h-3.5 w-3.5" /> : null;
                      })()}
                      <span className="font-light">@{agent.id}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          <div className="px-4 py-2 border-t border-border-subtle bg-bg-elevated text-detail text-text-muted flex items-center justify-center gap-2">
            {autoRefresh ? (
              <>
                <StatusDot status="success" size="sm" glow />
                <span>Polling every {pollingInterval / 1000}s</span>
              </>
            ) : (
              <span>Auto-refresh paused</span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

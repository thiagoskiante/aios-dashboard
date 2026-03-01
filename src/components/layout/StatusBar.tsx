'use client';

import { useAiosStatus } from '@/hooks/use-aios-status';
import { useSessionInfo } from '@/hooks/use-session-info';
import { useBobStore } from '@/stores/bob-store';
import { AGENT_CONFIG, type AgentId } from '@/types';
import { cn } from '@/lib/utils';
import { Bell, Bot, GitBranch, Cpu, DollarSign, User } from 'lucide-react';
import { iconMap } from '@/lib/icons';

interface StatusBarProps {
  className?: string;
}

export function StatusBar({ className }: StatusBarProps) {
  const { status, isLoading, isConnected } = useAiosStatus();
  const { session } = useSessionInfo();

  return (
    <footer
      className={cn(
        'flex h-7 items-center justify-between border-t px-3 text-label gap-2',
        className
      )}
      style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-elevated)' }}
    >
      {/* Left section */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Connection dot */}
        <StatusIndicator isConnected={isConnected} isLoading={isLoading} />

        {/* Current prompt */}
        {session?.lastPrompt && (
          <span
            className="text-text-muted truncate max-w-[220px] hidden md:block"
            title={session.lastPrompt}
          >
            <span className="text-text-disabled mr-1">›</span>
            <span className="text-text-tertiary italic">{session.lastPrompt}</span>
          </span>
        )}
      </div>

      {/* Center section — session info */}
      {session && (
        <div className="flex items-center gap-3 shrink-0">
          {/* Model */}
          <div className="flex items-center gap-1 text-text-muted">
            <Cpu className="h-3 w-3 text-gold" />
            <span className="text-gold font-medium">{session.modelDisplay}</span>
          </div>

          {/* Token context bar */}
          <div className="flex items-center gap-1.5" title={`Context: ${session.tokens.contextPct}% used`}>
            <div className="w-16 h-1.5 bg-border rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${session.tokens.contextPct}%`,
                  backgroundColor:
                    session.tokens.contextPct > 80
                      ? 'var(--status-error)'
                      : session.tokens.contextPct > 50
                        ? 'var(--status-warning)'
                        : 'var(--status-success)',
                }}
              />
            </div>
            <span className="text-text-muted font-mono text-detail">
              {session.tokens.contextPct}%
            </span>
          </div>

          {/* Cost */}
          <div className="flex items-center gap-1 text-text-muted">
            <DollarSign className="h-3 w-3" />
            <span className="font-mono text-detail">
              {session.cost < 0.01
                ? '$0.00'
                : `$${session.cost.toFixed(2)}`}
            </span>
          </div>

          {/* Git branch */}
          {session.gitBranch && session.gitBranch !== 'HEAD' && (
            <div className="flex items-center gap-1 text-text-muted">
              <GitBranch className="h-3 w-3" />
              <span className="text-text-tertiary font-mono text-detail">{session.gitBranch}</span>
            </div>
          )}

          {/* Project / user */}
          {session.project && (
            <div className="flex items-center gap-1 text-text-muted">
              <User className="h-3 w-3" />
              <span className="text-text-tertiary text-detail">{session.project}</span>
            </div>
          )}
        </div>
      )}

      {/* Right section */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Rate limit */}
        <RateLimitDisplay rateLimit={status?.rateLimit} />

        {/* Bob Status */}
        <BobStatusIndicator />

        {/* Active Agent */}
        {status?.activeAgent && (
          <ActiveAgentBadge agentId={status.activeAgent.id} />
        )}

        {/* Notifications */}
        <NotificationBadge count={0} />
      </div>
    </footer>
  );
}

function StatusIndicator({ isConnected, isLoading }: { isConnected: boolean; isLoading: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          isLoading && 'bg-status-warning animate-pulse',
          !isLoading && isConnected && 'bg-status-success',
          !isLoading && !isConnected && 'bg-status-error'
        )}
      />
      <span className="text-text-muted hidden sm:inline">
        {isLoading ? 'Connecting...' : isConnected ? 'AIOS' : 'Offline'}
      </span>
    </div>
  );
}

function ActiveAgentBadge({ agentId }: { agentId: AgentId }) {
  const config = AGENT_CONFIG[agentId];
  if (!config) return null;

  return (
    <div
      className="flex items-center gap-1 rounded-full px-2 py-0.5"
      style={{ backgroundColor: config.bg }}
    >
      {(() => {
        const IconComponent = iconMap[config.icon];
        return IconComponent ? <IconComponent className="h-3 w-3" style={{ color: config.color }} /> : null;
      })()}
      <span className="text-detail" style={{ color: config.color }}>@{agentId}</span>
    </div>
  );
}

function RateLimitDisplay({ rateLimit }: { rateLimit?: { used: number; limit: number } }) {
  if (!rateLimit) return null;
  const pct = (rateLimit.used / rateLimit.limit) * 100;
  return (
    <span className={cn(
      'text-detail text-text-muted',
      pct > 95 && 'text-status-error',
      pct > 80 && pct <= 95 && 'text-status-warning',
    )}>
      {rateLimit.used}/{rateLimit.limit}
    </span>
  );
}

function BobStatusIndicator() {
  const active = useBobStore((s) => s.active);
  const isInactive = useBobStore((s) => s.isInactive);

  if (!active && !isInactive) return null;
  const label = active && !isInactive ? 'active' : 'inactive';
  const color = label === 'active' ? '#22c55e' : '#6b7280';

  return (
    <div className="flex items-center gap-1 text-label">
      <Bot className="h-3 w-3" style={{ color }} />
      <span style={{ color }} className="text-detail">{label}</span>
    </div>
  );
}

function NotificationBadge({ count }: { count: number }) {
  return (
    <button
      className="relative flex items-center justify-center p-0.5 text-text-muted hover:text-text-primary transition-colors"
      title={`${count} notifications`}
    >
      <Bell className="h-3.5 w-3.5" />
      {count > 0 && (
        <span className="absolute -right-1 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-primary px-0.5 text-detail font-medium text-primary-foreground">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );
}

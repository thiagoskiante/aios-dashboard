import useSWR from 'swr';
import type { SessionInfo } from '@/app/api/session-info/route';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useSessionInfo() {
  const { data, error, isLoading } = useSWR<SessionInfo | null>(
    '/api/session-info',
    fetcher,
    {
      refreshInterval: 5000,
      revalidateOnFocus: true,
      dedupingInterval: 3000,
    }
  );

  return {
    session: data ?? null,
    isLoading,
    error,
  };
}

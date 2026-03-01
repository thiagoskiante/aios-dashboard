import useSWR from 'swr';
import type { AgentsCatalogResponse, AgentCategory, CatalogAgent } from '@/app/api/agents-catalog/route';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const EMPTY_BY_CATEGORY: Record<AgentCategory, CatalogAgent[]> = {
  'aios-core': [],
  chiefs: [],
  specialists: [],
  meta: [],
};

export function useAgentsCatalog() {
  const { data, error, isLoading, mutate } = useSWR<AgentsCatalogResponse>(
    '/api/agents-catalog',
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  );

  return {
    agents: data?.agents ?? [],
    byCategory: data?.byCategory ?? EMPTY_BY_CATEGORY,
    total: data?.total ?? 0,
    isLoading,
    error,
    refresh: mutate,
  };
}

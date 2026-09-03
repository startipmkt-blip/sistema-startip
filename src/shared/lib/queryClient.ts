import { QueryClient } from '@tanstack/react-query';

// Configuração base do TanStack Query — herdada por todos os módulos.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 min
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

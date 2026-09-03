import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/shared/lib/queryClient';
import { AuthProvider } from '@/shared/auth/AuthProvider';

// Providers globais da aplicação (ordem importa: Query por fora, Auth
// por dentro pois usa o supabase client diretamente).
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}

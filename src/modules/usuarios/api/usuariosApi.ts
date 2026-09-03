import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabaseClient';
import { IS_DEMO } from '@/shared/lib/env';
import {
  demoUsuarios,
  demoAddUsuario,
  demoUpdateUsuario,
  demoDeleteUsuario,
} from '@/shared/lib/demoData';
import type { Profile, ProfilePapel, ProfileStatus } from '@/shared/types/database';

export interface UsuarioFormData {
  nome: string;
  cargo: string;
  papel: ProfilePapel;
  permissoes: string[];
  status: ProfileStatus;
}

async function fetchUsuarios(): Promise<Profile[]> {
  if (IS_DEMO) {
    // pendentes primeiro, depois admins, depois operadores
    return [...demoUsuarios].sort((a, b) => {
      if (a.status !== b.status) return a.status === 'pendente' ? -1 : 1;
      return a.nome.localeCompare(b.nome);
    });
  }
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('tipo', 'equipe')
    .order('nome', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Profile[];
}

async function saveUsuario(id: string | undefined, dados: UsuarioFormData): Promise<void> {
  if (IS_DEMO) {
    if (id) demoUpdateUsuario(id, dados);
    else demoAddUsuario({ ...dados, tipo: 'equipe', cliente_id: null });
    return;
  }
  // Em produção, criar usuário passa pelo Auth (signup) — aqui o admin
  // apenas atualiza cargo/papel/permissões/status de um profile existente.
  const { error } = id
    ? await supabase.from('profiles').update(dados as never).eq('id', id)
    : await supabase.from('profiles').insert({ ...dados, tipo: 'equipe' } as never);
  if (error) throw error;
}

async function deleteUsuario(id: string): Promise<void> {
  if (IS_DEMO) {
    demoDeleteUsuario(id);
    return;
  }
  const { error } = await supabase.from('profiles').delete().eq('id', id);
  if (error) throw error;
}

export function useUsuarios() {
  return useQuery({ queryKey: ['usuarios'], queryFn: fetchUsuarios });
}

export function useSalvarUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { id?: string; dados: UsuarioFormData }) => saveUsuario(p.id, p.dados),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['usuarios'] }),
  });
}

export function useExcluirUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteUsuario(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['usuarios'] }),
  });
}

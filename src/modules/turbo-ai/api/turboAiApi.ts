import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabaseClient';
import { IS_DEMO } from '@/shared/lib/env';

export type AiModuleKey =
  | 'responder_avaliacoes'
  | 'otimizar_google'
  | 'relatorio_mensal'
  | 'mensagens'
  | 'aviso_feriado'
  | 'palavras_chave';

export interface AiModulo { key: AiModuleKey; nome: string; descricao: string | null; }
export interface AiPromptVersion {
  id: string; module_key: AiModuleKey; prompt_body: string;
  tag: string | null; is_active: boolean; created_at: string; created_by: string | null;
}
export interface AiTemplate {
  id: string; module_key: AiModuleKey; nome: string; body_text: string;
  created_at: string; created_by: string | null;
}

const k = {
  modulos: ['turbo-ai', 'modulos'] as const,
  versoes: (m: AiModuleKey) => ['turbo-ai', 'versoes', m] as const,
  templates: (m: AiModuleKey) => ['turbo-ai', 'templates', m] as const,
};

// ---- Módulos ----
export function useAiModulos() {
  return useQuery({
    queryKey: k.modulos,
    queryFn: async (): Promise<AiModulo[]> => {
      if (IS_DEMO) return [];
      const { data, error } = await supabase.from('ai_modules').select('*').order('key');
      if (error) throw error;
      return (data ?? []) as AiModulo[];
    },
  });
}

// ---- Versões de prompt por módulo ----
export function usePromptVersions(moduleKey: AiModuleKey | null) {
  return useQuery({
    queryKey: k.versoes(moduleKey ?? 'responder_avaliacoes'),
    enabled: !!moduleKey,
    queryFn: async (): Promise<AiPromptVersion[]> => {
      if (IS_DEMO || !moduleKey) return [];
      const { data, error } = await supabase
        .from('ai_prompt_versions')
        .select('*')
        .eq('module_key', moduleKey)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as AiPromptVersion[];
    },
  });
}

export function useSalvarVersao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { moduleKey: AiModuleKey; prompt_body: string; tag?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('ai_prompt_versions')
        .insert({
          module_key: p.moduleKey,
          prompt_body: p.prompt_body,
          tag: p.tag ?? 'manual',
          created_by: user?.id ?? null,
        } as never)
        .select('*').single();
      if (error) throw error;
      return data as AiPromptVersion;
    },
    onSuccess: (_d, p) => qc.invalidateQueries({ queryKey: k.versoes(p.moduleKey) }),
  });
}

export function useAtivarVersao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { moduleKey: AiModuleKey; versionId: string }) => {
      // Desativa todas do módulo e ativa esta (uniqueness gerenciada por índice
      // parcial no banco; race race é raro e o UPDATE cobre bem).
      await supabase
        .from('ai_prompt_versions')
        .update({ is_active: false } as never)
        .eq('module_key', p.moduleKey);
      const { error } = await supabase
        .from('ai_prompt_versions')
        .update({ is_active: true } as never)
        .eq('id', p.versionId);
      if (error) throw error;
    },
    onSuccess: (_d, p) => qc.invalidateQueries({ queryKey: k.versoes(p.moduleKey) }),
  });
}

export function useApagarVersao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { moduleKey: AiModuleKey; versionId: string }) => {
      const { error } = await supabase.from('ai_prompt_versions').delete().eq('id', p.versionId);
      if (error) throw error;
    },
    onSuccess: (_d, p) => qc.invalidateQueries({ queryKey: k.versoes(p.moduleKey) }),
  });
}

// ---- Templates por módulo ----
export function useAiTemplates(moduleKey: AiModuleKey | null) {
  return useQuery({
    queryKey: k.templates(moduleKey ?? 'responder_avaliacoes'),
    enabled: !!moduleKey,
    queryFn: async (): Promise<AiTemplate[]> => {
      if (IS_DEMO || !moduleKey) return [];
      const { data, error } = await supabase
        .from('ai_templates')
        .select('*')
        .eq('module_key', moduleKey)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as AiTemplate[];
    },
  });
}

export function useSalvarTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { id?: string; moduleKey: AiModuleKey; nome: string; body_text: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const payload = { module_key: p.moduleKey, nome: p.nome, body_text: p.body_text, created_by: user?.id ?? null };
      if (p.id) {
        const { error } = await supabase.from('ai_templates').update(payload as never).eq('id', p.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('ai_templates').insert(payload as never);
        if (error) throw error;
      }
    },
    onSuccess: (_d, p) => qc.invalidateQueries({ queryKey: k.templates(p.moduleKey) }),
  });
}

export function useApagarTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { moduleKey: AiModuleKey; id: string }) => {
      const { error } = await supabase.from('ai_templates').delete().eq('id', p.id);
      if (error) throw error;
    },
    onSuccess: (_d, p) => qc.invalidateQueries({ queryKey: k.templates(p.moduleKey) }),
  });
}

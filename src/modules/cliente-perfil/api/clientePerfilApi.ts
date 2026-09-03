import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabaseClient';
import { IS_DEMO } from '@/shared/lib/env';
import type { ClienteIcp, ClientePerfil, Persona } from '@/modules/cliente-perfil/types';

const demoIcps: Record<string, ClienteIcp> = {
  c1: {
    cliente_id: 'c1',
    publico_alvo: 'Moradores do bairro, famílias que buscam pães e doces artesanais.',
    regiao: 'Raio de 3km da loja',
    ticket_medio: 45,
    canais: ['Instagram', 'WhatsApp', 'Google Maps'],
    dores: ['Falta de tempo para cozinhar', 'Buscar qualidade artesanal', 'Preço justo'],
  },
  c2: {
    cliente_id: 'c2',
    publico_alvo: 'Mulheres 25-45 que compram moda fitness online no Brasil.',
    regiao: 'Nacional (e-commerce)',
    ticket_medio: 180,
    canais: ['Instagram', 'Meta Ads', 'Google Shopping'],
    dores: ['Encontrar caimento ideal', 'Confiança na compra online', 'Prazo de entrega'],
  },
  c3: {
    cliente_id: 'c3',
    publico_alvo: 'Adultos 30-55 interessados em qualidade de vida e reabilitação.',
    regiao: 'Cidade e região metropolitana',
    ticket_medio: 350,
    canais: ['Instagram', 'Indicação', 'Google'],
    dores: ['Dores crônicas', 'Falta de rotina de exercícios', 'Medo de lesão'],
  },
};

const demoPersonas: Persona[] = [
  {
    id: 'pe1', cliente_id: 'c1', nome: 'Dona Marta', idade: 52, ocupacao: 'Aposentada',
    descricao: 'Valoriza tradição e atendimento próximo. Compra pão fresco toda manhã.',
    objetivos: ['Café da manhã de qualidade', 'Atendimento humano'],
    objecoes: ['Preço acima do supermercado'],
  },
  {
    id: 'pe2', cliente_id: 'c2', nome: 'Juliana Fit', idade: 31, ocupacao: 'Personal trainer',
    descricao: 'Ativa nas redes, compra roupas para treinar e revender para alunas.',
    objetivos: ['Peças com bom caimento', 'Novidades frequentes'],
    objecoes: ['Frete caro', 'Dúvida no tamanho'],
  },
  {
    id: 'pe3', cliente_id: 'c3', nome: 'Carlos Escritório', idade: 44, ocupacao: 'Gerente',
    descricao: 'Sedentário, com dores nas costas, busca melhorar postura e disposição.',
    objetivos: ['Reduzir dores', 'Criar rotina saudável'],
    objecoes: ['Falta de tempo', 'Preço da mensalidade'],
  },
];

async function fetchPerfil(clienteId: string): Promise<ClientePerfil> {
  if (IS_DEMO) {
    return {
      icp: demoIcps[clienteId] ?? null,
      personas: demoPersonas.filter((p) => p.cliente_id === clienteId),
    };
  }

  const [{ data: icp }, { data: personas }] = await Promise.all([
    supabase.from('cliente_icp').select('*').eq('cliente_id', clienteId).maybeSingle(),
    supabase.from('personas').select('*').eq('cliente_id', clienteId),
  ]);
  return {
    icp: (icp as unknown as ClienteIcp | null) ?? null,
    personas: (personas as unknown as Persona[]) ?? [],
  };
}

export function useClientePerfil(clienteId: string | undefined) {
  return useQuery({
    queryKey: ['cliente-perfil', clienteId],
    queryFn: () => fetchPerfil(clienteId as string),
    enabled: Boolean(clienteId),
  });
}

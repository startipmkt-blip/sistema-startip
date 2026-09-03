// =============================================================
// database.ts — Tipos do schema public (espelham as migrations)
// =============================================================
// Mantido à mão ENQUANTO não há projeto Supabase. Assim que o banco
// existir, regenere automaticamente com:  npm run gen:types
// (isto sobrescreve este arquivo com a versão oficial do Supabase).
// =============================================================

export type TipoNegocio = 'local' | 'ecommerce';
export type ClienteStatus = 'prospect' | 'ativo' | 'inativo';
export type PlataformaAnuncio = 'meta' | 'google';
export type ProfileTipo = 'equipe' | 'cliente';
export type ProfilePapel = 'admin' | 'operador';
export type ProfileStatus = 'ativo' | 'pendente';

// Serviços que a agência presta ao cliente.
export type ServicoCliente = 'social_midia' | 'trafego_pago' | 'google_meu_negocio';

export interface Cliente {
  id: string;
  nome: string;
  logo_url: string | null;
  tipo_negocio: TipoNegocio;
  status: ClienteStatus;
  servicos: ServicoCliente[];
  conteudos_por_semana: number; // quantos conteúdos a agência produz por semana
  data_entrada: string; // date (YYYY-MM-DD)
  central_slug?: string | null;
  telegram_chat_id?: string | null;
  whatsapp_chat_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContaAnuncio {
  id: string;
  cliente_id: string;
  plataforma: PlataformaAnuncio;
  id_externo: string;
  nome_exibicao: string;
  created_at: string;
}

export interface Profile {
  id: string;
  nome: string;
  tipo: ProfileTipo;
  papel: ProfilePapel | null;
  cargo: string | null; // rótulo do cargo, ex.: "Gestor de tráfego", "Designer"
  permissoes: string[]; // módulos liberados (para operador); admin ignora
  status: ProfileStatus; // 'pendente' = aguardando aprovação do admin
  cliente_id: string | null;
  created_at: string;
}

// Formato reduzido compatível com o tipo gerado pelo Supabase, para que
// o supabase-js infira Row/Insert/Update ao ser tipado com <Database>.
export interface Database {
  public: {
    Tables: {
      clientes: {
        Row: Cliente;
        Insert: Omit<Cliente, 'id' | 'created_at' | 'updated_at'> &
          Partial<Pick<Cliente, 'id' | 'status' | 'data_entrada'>>;
        Update: Partial<Omit<Cliente, 'id' | 'created_at' | 'updated_at'>>;
      };
      contas_anuncio: {
        Row: ContaAnuncio;
        Insert: Omit<ContaAnuncio, 'id' | 'created_at'> &
          Partial<Pick<ContaAnuncio, 'id'>>;
        Update: Partial<Omit<ContaAnuncio, 'id' | 'created_at'>>;
      };
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at'> & Partial<Pick<Profile, 'nome'>>;
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>;
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_equipe: { Args: Record<string, never>; Returns: boolean };
      is_admin: { Args: Record<string, never>; Returns: boolean };
      meu_cliente_id: { Args: Record<string, never>; Returns: string };
    };
    Enums: {
      tipo_negocio: TipoNegocio;
      cliente_status: ClienteStatus;
      plataforma_anuncio: PlataformaAnuncio;
      profile_tipo: ProfileTipo;
      profile_papel: ProfilePapel;
    };
  };
}

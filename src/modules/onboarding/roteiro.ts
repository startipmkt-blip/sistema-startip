// =============================================================
// Roteiro de Onboarding de Clientes — baseado no mapa mental da agência.
// Serve de referência visual (o passo a passo, com o tempo de cada etapa)
// tanto no painel interno quanto no portal do cliente.
// =============================================================

export interface EtapaRoteiro {
  numero: number;
  titulo: string;
  tempo?: string; // ex.: "1 dia", "~30 min", "até 5 dias úteis"
  itens: string[];
}

export const ROTEIRO_ONBOARDING: EtapaRoteiro[] = [
  {
    numero: 1,
    titulo: 'Reunião de Fechamento / Confirmação',
    tempo: '15–20 min',
    itens: [
      'Confirmação de parceria ("sim")',
      'Explicar próximos passos e fluxo de onboarding',
      'Apresentar programa de indicação (30% em crédito de mídia)',
    ],
  },
  {
    numero: 2,
    titulo: 'Contrato',
    tempo: '1 dia',
    itens: [
      'Solicitar dados (CNPJ, razão social, nome, CPF, endereço, estado civil)',
      'Elaboração do contrato',
      'Enviar contrato para assinatura',
    ],
  },
  {
    numero: 3,
    titulo: 'Criação de Estruturas e Acessos',
    itens: [
      'Solicitar Gerenciador de Anúncios / Redes Sociais (Meta)',
      'Solicitar acesso ao Google Business / Google Ads (se aplicável)',
      'Solicitar todos os acessos (Meta, Google, redes sociais)',
      'Confirmar uso do WhatsApp Business (orientar migração se necessário)',
    ],
  },
  {
    numero: 4,
    titulo: 'Formulário Estratégico',
    itens: ['Enviar formulário (ICP e Persona)', 'Preenchimento tem que ser completo'],
  },
  {
    numero: 5,
    titulo: 'Grupo de Comunicação',
    itens: ['Criação do grupo no WhatsApp', 'Canal oficial de comunicação'],
  },
  {
    numero: 6,
    titulo: 'Materiais do Cliente',
    itens: [
      'Criar e compartilhar pasta no Drive',
      'Solicitar fotos, vídeos, logo, identidade visual e materiais institucionais',
    ],
  },
  {
    numero: 7,
    titulo: 'Estratégia e Setup',
    tempo: 'até 5 dias úteis',
    itens: [
      'Analisar formulário preenchido',
      'Definir ICP e Persona',
      'Estudar mercado / nicho do cliente',
      'Estruturar setup das contas (Meta / Google / Redes Sociais)',
      'Revisar redes sociais',
    ],
  },
  {
    numero: 8,
    titulo: 'Reunião de Alinhamento',
    tempo: '~30 min',
    itens: [
      'Apresentar setup e a estratégia inicial',
      'Confirmar ajustes finais',
      'Anotações fundamentais: qual produto/serviço tem mais retorno?',
      'Definir prioridades estratégicas',
    ],
  },
  {
    numero: 9,
    titulo: 'Planejamento',
    tempo: 'até 3 dias úteis',
    itens: [
      'Desenvolvimento do planejamento',
      'Estruturação de roteiro e ideias',
      'Início das captações/criações e agendamento de conteúdo',
    ],
  },
];

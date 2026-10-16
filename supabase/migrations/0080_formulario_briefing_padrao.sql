-- =============================================================
-- 0080_formulario_briefing_padrao.sql — Briefing padrão (um clique)
-- =============================================================
-- Unifica o formulário de estratégia + o briefing da Magias, só com as
-- perguntas gerais (as de nicho ficam para o formulário adaptado).
-- Perguntas com "condicao":"trafego_pago" só entram para cliente com
-- o serviço de tráfego pago. Reexecutável: atualiza o modelo.
-- =============================================================

alter type public.formulario_tipo add value if not exists 'padrao';

insert into public.formularios_modelos (chave, titulo, descricao, perguntas) values (
  'briefing_padrao',
  'Briefing de Entrada – Startip',
  'Formulário padrão de planejamento estratégico, persona, ICP, linha editorial e tráfego pago.',
  $json$[
 {
  "id": "nome_empresa",
  "tipo": "texto",
  "label": "Nome da empresa (como aparece na fachada e nas redes)",
  "secao": "Empresa e responsáveis",
  "obrigatoria": true,
  "ajuda": "Escreva o nome exato, com a grafia que será usada."
 },
 {
  "id": "origem_nome",
  "tipo": "longo",
  "label": "De onde vem o nome e o que ele quer dizer?",
  "secao": "Empresa e responsáveis",
  "ajuda": "Exemplos: junção de palavras, sobrenome da família, referência a um lugar ou conceito. Isso orienta o desenho do logo."
 },
 {
  "id": "historia",
  "tipo": "longo",
  "label": "Como começou a história do seu negócio?",
  "secao": "Empresa e responsáveis"
 },
 {
  "id": "tempo_mercado",
  "tipo": "texto",
  "label": "Há quanto tempo a empresa está no mercado?",
  "secao": "Empresa e responsáveis"
 },
 {
  "id": "endereco",
  "tipo": "longo",
  "label": "Endereço completo",
  "secao": "Empresa e responsáveis",
  "obrigatoria": true,
  "ajuda": "Rua, número, bairro, cidade/UF e CEP. É o endereço que vai no Google. Se não tiver ponto físico, diga a área de atendimento."
 },
 {
  "id": "ponto_referencia",
  "tipo": "texto",
  "label": "Ponto de referência",
  "secao": "Empresa e responsáveis",
  "ajuda": "Exemplos: em frente ao mercado X, ao lado do posto Y."
 },
 {
  "id": "horario",
  "tipo": "longo",
  "label": "Dias e horários de atendimento",
  "secao": "Empresa e responsáveis",
  "ajuda": "A empresa atende todos os dias? Informe horários, se muda em alta temporada e se abre domingos e feriados."
 },
 {
  "id": "whatsapp_leads",
  "tipo": "texto",
  "label": "WhatsApp que vai receber os leads",
  "secao": "Empresa e responsáveis",
  "obrigatoria": true,
  "ajuda": "É para esse número que os anúncios vão apontar. Diga se já é WhatsApp Business."
 },
 {
  "id": "email_empresa",
  "tipo": "texto",
  "label": "E-mail da empresa",
  "secao": "Empresa e responsáveis"
 },
 {
  "id": "telefone_fixo",
  "tipo": "texto",
  "label": "Telefone fixo, se houver",
  "secao": "Empresa e responsáveis"
 },
 {
  "id": "aprovador",
  "tipo": "texto",
  "label": "Quem aprova arte e campanha?",
  "secao": "Empresa e responsáveis",
  "obrigatoria": true,
  "ajuda": "Uma pessoa só, para não travar a aprovação. Nome e WhatsApp."
 },
 {
  "id": "o_que_faz",
  "tipo": "longo",
  "label": "Resuma em poucas palavras o que a empresa faz",
  "secao": "Propósito, posicionamento e oferta",
  "obrigatoria": true
 },
 {
  "id": "nicho",
  "tipo": "longo",
  "label": "Qual é a área de atuação e o nicho de mercado?",
  "secao": "Propósito, posicionamento e oferta"
 },
 {
  "id": "missao",
  "tipo": "longo",
  "label": "Qual é a missão da empresa?",
  "secao": "Propósito, posicionamento e oferta",
  "ajuda": "A razão de existir, no dia a dia."
 },
 {
  "id": "visao",
  "tipo": "longo",
  "label": "Qual é a visão?",
  "secao": "Propósito, posicionamento e oferta",
  "ajuda": "Onde a empresa quer chegar e em quanto tempo."
 },
 {
  "id": "valores",
  "tipo": "longo",
  "label": "Quais são os valores?",
  "secao": "Propósito, posicionamento e oferta",
  "ajuda": "O que não se negocia no atendimento e na operação."
 },
 {
  "id": "slogan",
  "tipo": "texto",
  "label": "A empresa tem slogan ou frase que a represente?",
  "secao": "Propósito, posicionamento e oferta",
  "ajuda": "Se não tiver, escreva \"criar\" e a gente propõe opções."
 },
 {
  "id": "frase_empresa",
  "tipo": "longo",
  "label": "Em uma frase, o que a empresa é?",
  "secao": "Propósito, posicionamento e oferta",
  "ajuda": "Estrutura sugerida: somos X, para quem quer Y, com Z."
 },
 {
  "id": "problema_resolve",
  "tipo": "longo",
  "label": "Qual problema o seu produto ou serviço resolve na vida do cliente?",
  "secao": "Propósito, posicionamento e oferta",
  "obrigatoria": true
 },
 {
  "id": "transformacao",
  "tipo": "longo",
  "label": "Qual é a maior transformação que o produto ou serviço entrega ao cliente?",
  "secao": "Propósito, posicionamento e oferta"
 },
 {
  "id": "diferencial",
  "tipo": "longo",
  "label": "Qual é o principal diferencial em relação à concorrência?",
  "secao": "Propósito, posicionamento e oferta",
  "obrigatoria": true
 },
 {
  "id": "entregas_pos_venda",
  "tipo": "longo",
  "label": "O que a empresa entrega depois que o cliente fecha?",
  "secao": "Propósito, posicionamento e oferta",
  "ajuda": "Entrega, orientação, suporte, acompanhamento, kit, grupo de clientes etc."
 },
 {
  "id": "garantia",
  "tipo": "longo",
  "label": "A empresa oferece garantia caso o resultado não seja o esperado?",
  "secao": "Propósito, posicionamento e oferta",
  "ajuda": "Prazo, o que cobre e o que não cobre."
 },
 {
  "id": "como_ser_vista",
  "tipo": "longo",
  "label": "Como você gostaria que a empresa fosse vista nas redes sociais?",
  "secao": "Propósito, posicionamento e oferta"
 },
 {
  "id": "principais_produtos",
  "tipo": "longo",
  "label": "Quais são os principais produtos ou serviços?",
  "secao": "Produtos, serviços e condições comerciais",
  "obrigatoria": true,
  "ajuda": "Liste cada um com nome, preço (ou faixa de preço) e para quem é."
 },
 {
  "id": "produto_destaque",
  "tipo": "longo",
  "label": "Existe algum produto ou serviço que você quer promover com mais intensidade?",
  "secao": "Produtos, serviços e condições comerciais"
 },
 {
  "id": "formas_pagamento",
  "tipo": "multipla",
  "label": "Formas de pagamento aceitas",
  "secao": "Produtos, serviços e condições comerciais",
  "opcoes": [
   "Pix",
   "Dinheiro",
   "Débito",
   "Crédito",
   "Boleto",
   "Financiamento",
   "Crediário próprio",
   "Entrada mais parcelas",
   "Outra"
  ]
 },
 {
  "id": "condicoes_pagamento",
  "tipo": "longo",
  "label": "Condições de pagamento",
  "secao": "Produtos, serviços e condições comerciais",
  "ajuda": "Desconto à vista, parcelamento (até quantas vezes, a partir de qual parcela começa o juro) e promoções fixas."
 },
 {
  "id": "oferta_atual",
  "tipo": "longo",
  "label": "Existe oferta, promoção ou lançamento previsto?",
  "secao": "Produtos, serviços e condições comerciais",
  "ajuda": "Produto, preço, condição, validade e quantidade de unidades. É o que vai no anúncio."
 },
 {
  "id": "quem_beneficia",
  "tipo": "longo",
  "label": "Que tipos de pessoas podem ser beneficiadas pelo produto ou serviço?",
  "secao": "Público-alvo, persona e cliente ideal (ICP)"
 },
 {
  "id": "quem_mais_precisa",
  "tipo": "longo",
  "label": "Quem são as pessoas que mais precisam desse produto ou serviço?",
  "secao": "Público-alvo, persona e cliente ideal (ICP)",
  "obrigatoria": true,
  "ajuda": "Pense em quem resolveria um problema real comprando."
 },
 {
  "id": "publico_principal",
  "tipo": "longo",
  "label": "Quem é o público-alvo principal?",
  "secao": "Público-alvo, persona e cliente ideal (ICP)",
  "obrigatoria": true,
  "ajuda": "Idade, gênero, localização, hábitos e interesses."
 },
 {
  "id": "publico_especifico",
  "tipo": "longo",
  "label": "Existe algum público específico que você gostaria de atingir?",
  "secao": "Público-alvo, persona e cliente ideal (ICP)"
 },
 {
  "id": "faixa_etaria",
  "tipo": "texto",
  "label": "Qual é a faixa etária do cliente ideal?",
  "secao": "Público-alvo, persona e cliente ideal (ICP)"
 },
 {
  "id": "genero",
  "tipo": "escolha",
  "label": "Gênero predominante do cliente ideal",
  "secao": "Público-alvo, persona e cliente ideal (ICP)",
  "opcoes": [
   "Mais homens",
   "Mais mulheres",
   "Equilibrado",
   "Não sei ainda"
  ]
 },
 {
  "id": "localizacao",
  "tipo": "longo",
  "label": "Onde essas pessoas moram?",
  "secao": "Público-alvo, persona e cliente ideal (ICP)",
  "ajuda": "Cidades, regiões, bairros ou área de atendimento prioritária."
 },
 {
  "id": "profissao_renda",
  "tipo": "longo",
  "label": "Qual a profissão ou ocupação e o nível de renda do cliente ideal?",
  "secao": "Público-alvo, persona e cliente ideal (ICP)"
 },
 {
  "id": "escolaridade",
  "tipo": "texto",
  "label": "Qual o grau de escolaridade e o setor em que atua?",
  "secao": "Público-alvo, persona e cliente ideal (ICP)"
 },
 {
  "id": "estado_civil",
  "tipo": "escolha",
  "label": "Status de relacionamento predominante",
  "secao": "Público-alvo, persona e cliente ideal (ICP)",
  "opcoes": [
   "Casado(a)",
   "Solteiro(a)",
   "Divorciado(a)",
   "Viúvo(a)",
   "Variado"
  ]
 },
 {
  "id": "estilo_vida",
  "tipo": "longo",
  "label": "Qual o estilo de vida e os principais interesses do cliente ideal?",
  "secao": "Público-alvo, persona e cliente ideal (ICP)",
  "ajuda": "Do que costuma gostar: viagens, esportes, tecnologia, saúde, eventos etc."
 },
 {
  "id": "habitos",
  "tipo": "longo",
  "label": "O que essas pessoas costumam fazer?",
  "secao": "Público-alvo, persona e cliente ideal (ICP)",
  "ajuda": "Hábitos de rotina, compra, consumo e comportamento."
 },
 {
  "id": "o_que_falam",
  "tipo": "longo",
  "label": "O que costumam falar sobre seus problemas e desejos?",
  "secao": "Público-alvo, persona e cliente ideal (ICP)",
  "ajuda": "Jeito de se expressar e linguagem que usam."
 },
 {
  "id": "o_que_pensam",
  "tipo": "longo",
  "label": "O que costumam pensar?",
  "secao": "Público-alvo, persona e cliente ideal (ICP)",
  "ajuda": "Crenças, valores, preocupações, medos e expectativas."
 },
 {
  "id": "o_que_escutam",
  "tipo": "longo",
  "label": "O que costumam escutar?",
  "secao": "Público-alvo, persona e cliente ideal (ICP)",
  "ajuda": "Opinião de amigos, família, influenciadores, especialistas e veículos de comunicação."
 },
 {
  "id": "desejos",
  "tipo": "longo",
  "label": "Quais são os principais desejos e o que querem conquistar?",
  "secao": "Público-alvo, persona e cliente ideal (ICP)",
  "ajuda": "Na vida pessoal ou profissional."
 },
 {
  "id": "motivacoes",
  "tipo": "longo",
  "label": "O que motiva essas pessoas a comprar?",
  "secao": "Público-alvo, persona e cliente ideal (ICP)",
  "ajuda": "Motivações internas e externas."
 },
 {
  "id": "dores",
  "tipo": "longo",
  "label": "Quais são as maiores dores, frustrações e problemas críticos que enfrentam?",
  "secao": "Público-alvo, persona e cliente ideal (ICP)",
  "obrigatoria": true
 },
 {
  "id": "necessidades",
  "tipo": "longo",
  "label": "Quais são as maiores necessidades dessas pessoas?",
  "secao": "Público-alvo, persona e cliente ideal (ICP)"
 },
 {
  "id": "habilidades_dificuldades",
  "tipo": "longo",
  "label": "Quais são as principais habilidades e dificuldades dessas pessoas?",
  "secao": "Público-alvo, persona e cliente ideal (ICP)"
 },
 {
  "id": "valorizam",
  "tipo": "longo",
  "label": "O que mais valorizam ao contratar uma empresa ou comprar um produto?",
  "secao": "Público-alvo, persona e cliente ideal (ICP)",
  "ajuda": "Exemplos: qualidade, praticidade, preço justo, confiança, atendimento, status."
 },
 {
  "id": "beneficios_esperados",
  "tipo": "longo",
  "label": "Quais benefícios esperam receber ao comprar ou contratar?",
  "secao": "Público-alvo, persona e cliente ideal (ICP)",
  "ajuda": "Considere ganhos e resultados, não só as funcionalidades."
 },
 {
  "id": "objecoes",
  "tipo": "longo",
  "label": "Quais objeções você já ouviu de clientes?",
  "secao": "Público-alvo, persona e cliente ideal (ICP)",
  "obrigatoria": true,
  "ajuda": "Exemplos: está caro, e se der problema, não sei se funciona para mim, o concorrente é mais barato."
 },
 {
  "id": "quem_decide",
  "tipo": "longo",
  "label": "Quem decide e quem paga a compra?",
  "secao": "Público-alvo, persona e cliente ideal (ICP)",
  "ajuda": "Exemplos: o casal decide junto, o filho escolhe e o pai paga."
 },
 {
  "id": "redes_persona",
  "tipo": "multipla",
  "label": "Quais redes sociais essas pessoas mais utilizam?",
  "secao": "Público-alvo, persona e cliente ideal (ICP)",
  "opcoes": [
   "Instagram",
   "Facebook",
   "TikTok",
   "YouTube",
   "WhatsApp",
   "LinkedIn",
   "Google",
   "Outras"
  ]
 },
 {
  "id": "concorrentes",
  "tipo": "longo",
  "label": "Quais empresas ou perfis disputam o mesmo mercado que você?",
  "secao": "Concorrência e referências",
  "obrigatoria": true,
  "ajuda": "Nome, tipo de empresa, Instagram e cidade de cada um."
 },
 {
  "id": "concorrentes_bem",
  "tipo": "longo",
  "label": "O que os concorrentes fazem bem?",
  "secao": "Concorrência e referências"
 },
 {
  "id": "concorrentes_mal",
  "tipo": "longo",
  "label": "Onde eles deixam a desejar?",
  "secao": "Concorrência e referências",
  "ajuda": "Demora na resposta, falta de pós-venda, atendimento ruim, só passam preço etc."
 },
 {
  "id": "referencias_area",
  "tipo": "longo",
  "label": "Quais perfis da sua área você acompanha e considera referência?",
  "secao": "Concorrência e referências",
  "ajuda": "Diga o @ e o que você gosta no que eles fazem."
 },
 {
  "id": "referencias_fora",
  "tipo": "longo",
  "label": "Perfis de fora da sua área que você gosta",
  "secao": "Concorrência e referências",
  "ajuda": "Qualquer ramo. O que importa é o jeito de comunicar."
 },
 {
  "id": "nao_fazer",
  "tipo": "longo",
  "label": "O que a marca não quer fazer na comunicação?",
  "secao": "Concorrência e referências",
  "ajuda": "Exemplos: brigar por preço, falar mal do concorrente, usar meme fora de contexto, prometer o que não cumpre."
 },
 {
  "id": "logo_status",
  "tipo": "escolha",
  "label": "Situação do logo",
  "secao": "Identidade visual",
  "opcoes": [
   "Já possuo logo e identidade pronta",
   "Existe um rascunho",
   "Em produção com outra pessoa",
   "Não existe, criar do zero"
  ]
 },
 {
  "id": "logo_tipo",
  "tipo": "escolha",
  "label": "Que tipo de logo você imagina?",
  "secao": "Identidade visual",
  "opcoes": [
   "Só o nome escrito",
   "Nome com um símbolo ao lado",
   "Símbolo que funcione sozinho",
   "Monograma com as iniciais",
   "Não tenho preferência"
  ]
 },
 {
  "id": "cores_desejadas",
  "tipo": "longo",
  "label": "Quais cores você gostaria de usar na identidade visual e no feed?",
  "secao": "Identidade visual",
  "ajuda": "Se tiver uma cor principal em mente, diga qual."
 },
 {
  "id": "cores_evitar",
  "tipo": "texto",
  "label": "Cores que você não quer de jeito nenhum",
  "secao": "Identidade visual",
  "ajuda": "Vale também: nenhuma cor que lembre um concorrente."
 },
 {
  "id": "estilo_visual",
  "tipo": "multipla",
  "label": "Estilo visual que combina com a marca (até 3)",
  "secao": "Identidade visual",
  "opcoes": [
   "Minimalista e limpo",
   "Premium e sofisticado",
   "Esportivo e cheio de energia",
   "Tecnológico e futurista",
   "Clássico e elegante",
   "Descontraído e leve",
   "Robusto e durável",
   "Acolhedor e humano",
   "Outro"
  ]
 },
 {
  "id": "estilo_descricao",
  "tipo": "longo",
  "label": "Outra forma de descrever o estilo",
  "secao": "Identidade visual",
  "ajuda": "Exemplo: parecer uma loja da Apple, parecer um consultório premium."
 },
 {
  "id": "marcas_admira",
  "tipo": "longo",
  "label": "Marcas, de qualquer ramo, cuja identidade visual você admira",
  "secao": "Identidade visual",
  "ajuda": "Diga o que te agrada em cada uma: cor, logo, ambiente, jeito de anunciar."
 },
 {
  "id": "marcas_nao_parecer",
  "tipo": "longo",
  "label": "Marcas ou visuais que a empresa não pode parecer",
  "secao": "Identidade visual"
 },
 {
  "id": "tipografia",
  "tipo": "escolha",
  "label": "Preferência de letra",
  "secao": "Identidade visual",
  "opcoes": [
   "Reta e moderna",
   "Com serifa, mais clássica",
   "Forte e condensada",
   "Não tenho preferência"
  ]
 },
 {
  "id": "referencias_visuais",
  "tipo": "longo",
  "label": "Links de referências visuais",
  "secao": "Identidade visual",
  "ajuda": "Pinterest, perfil de outra empresa, pasta no Drive ou mande no grupo. Qualquer referência ajuda."
 },
 {
  "id": "redes_ativas",
  "tipo": "longo",
  "label": "A empresa já possui redes sociais ativas? Quais?",
  "secao": "Redes sociais, conteúdo e tom de voz",
  "ajuda": "Informe os @ e links."
 },
 {
  "id": "usuario_desejado",
  "tipo": "texto",
  "label": "Nome de usuário desejado no Instagram",
  "secao": "Redes sociais, conteúdo e tom de voz",
  "ajuda": "Dê duas ou três opções: a primeira pode já estar em uso."
 },
 {
  "id": "canais",
  "tipo": "multipla",
  "label": "Em quais canais a empresa quer estar?",
  "secao": "Redes sociais, conteúdo e tom de voz",
  "opcoes": [
   "Instagram",
   "Facebook",
   "Google Meu Negócio",
   "TikTok",
   "YouTube",
   "LinkedIn",
   "WhatsApp com catálogo"
  ]
 },
 {
  "id": "objetivo_redes",
  "tipo": "multipla",
  "label": "Qual é o principal objetivo da empresa nas redes sociais? (até 3)",
  "secao": "Redes sociais, conteúdo e tom de voz",
  "obrigatoria": true,
  "opcoes": [
   "Aumentar as vendas",
   "Fortalecer a marca",
   "Gerar engajamento",
   "Captar novos clientes",
   "Ser encontrada por quem pesquisa",
   "Outro"
  ]
 },
 {
  "id": "metas",
  "tipo": "longo",
  "label": "Existem metas específicas que você deseja alcançar?",
  "secao": "Redes sociais, conteúdo e tom de voz",
  "ajuda": "Exemplos: nº de seguidores, mensagens por mês, vendas por mês, avaliações no Google."
 },
 {
  "id": "tom_voz",
  "tipo": "multipla",
  "label": "Qual tom de voz a empresa utiliza ou deseja utilizar?",
  "secao": "Redes sociais, conteúdo e tom de voz",
  "opcoes": [
   "Formal",
   "Descontraído",
   "Técnico",
   "Educativo",
   "Próximo e familiar",
   "Institucional",
   "Vendedor e direto"
  ]
 },
 {
  "id": "tom_obs",
  "tipo": "longo",
  "label": "Observações sobre o jeito de falar",
  "secao": "Redes sociais, conteúdo e tom de voz",
  "ajuda": "Exemplos: pode usar gíria, tratar por você ou senhor, nunca prometer o que não cumpre."
 },
 {
  "id": "temas",
  "tipo": "longo",
  "label": "Quais assuntos e temas você gostaria de abordar no feed?",
  "secao": "Redes sociais, conteúdo e tom de voz",
  "ajuda": "Exemplos: bastidores, novidades, clientes, dicas, perguntas frequentes, comparativos."
 },
 {
  "id": "tipo_conteudo",
  "tipo": "escolha",
  "label": "Preferência por tipo de conteúdo",
  "secao": "Redes sociais, conteúdo e tom de voz",
  "ajuda": "Educativo gera confiança, institucional constrói marca, promocional vende agora. Recomendamos equilíbrio.",
  "opcoes": [
   "Mais educativo",
   "Mais institucional",
   "Mais promocional",
   "Equilíbrio entre os três"
  ]
 },
 {
  "id": "temas_evitar",
  "tipo": "longo",
  "label": "Existem assuntos que não devem ser abordados?",
  "secao": "Redes sociais, conteúdo e tom de voz",
  "ajuda": "Exemplos: política, religião, futebol, citar concorrente pelo nome."
 },
 {
  "id": "frequencia_gravacao",
  "tipo": "escolha",
  "label": "Com que frequência você consegue gravar conteúdo?",
  "secao": "Redes sociais, conteúdo e tom de voz",
  "opcoes": [
   "Todo dia",
   "Duas a três vezes por semana",
   "Uma vez por semana",
   "Prefiro que vocês orientem e a gente se organiza"
  ]
 },
 {
  "id": "quem_grava",
  "tipo": "texto",
  "label": "Quem grava os conteúdos?",
  "secao": "Redes sociais, conteúdo e tom de voz",
  "ajuda": "Nome e WhatsApp da pessoa. Vamos orientar semana a semana."
 },
 {
  "id": "quem_aparece",
  "tipo": "longo",
  "label": "Quem da equipe pode aparecer em vídeos, fotos, depoimentos ou lives?",
  "secao": "Redes sociais, conteúdo e tom de voz"
 },
 {
  "id": "indicadores",
  "tipo": "longo",
  "label": "Quais indicadores você quer acompanhar nos relatórios mensais?",
  "secao": "Redes sociais, conteúdo e tom de voz",
  "ajuda": "Exemplos: alcance, engajamento, vendas, contatos, seguidores, cliques, mensagens recebidas."
 },
 {
  "id": "qtd_vendedores",
  "tipo": "texto",
  "label": "Quantas pessoas atendem e vendem hoje?",
  "secao": "Time comercial e atendimento"
 },
 {
  "id": "quem_responde",
  "tipo": "longo",
  "label": "Quem responde o WhatsApp em cada turno?",
  "secao": "Time comercial e atendimento",
  "ajuda": "Manhã, tarde, noite, fim de semana e feriado. Quem responde a mensagem que chega às 21h?"
 },
 {
  "id": "crm",
  "tipo": "escolha",
  "label": "A empresa usa alguma ferramenta de CRM ou sistema de atendimento?",
  "secao": "Time comercial e atendimento",
  "opcoes": [
   "Já tem (informar qual)",
   "Quer nossa indicação",
   "Vai começar no WhatsApp e migrar depois"
  ]
 },
 {
  "id": "crm_nome",
  "tipo": "texto",
  "label": "Se já usa CRM, qual?",
  "secao": "Time comercial e atendimento"
 },
 {
  "id": "meta_vendas",
  "tipo": "texto",
  "label": "Meta de vendas por mês",
  "secao": "Time comercial e atendimento",
  "ajuda": "Serve para dimensionar a verba e as campanhas."
 },
 {
  "id": "pos_venda",
  "tipo": "longo",
  "label": "O que acontece depois da venda?",
  "secao": "Time comercial e atendimento",
  "ajuda": "Acompanhamento, pedido de avaliação no Google, depoimento, indicação, convite para retorno."
 },
 {
  "id": "autoriza_imagem",
  "tipo": "escolha",
  "label": "O cliente autoriza foto e vídeo?",
  "secao": "Time comercial e atendimento",
  "ajuda": "Foto do cliente com o resultado é o conteúdo que mais converte. Vale deixar a autorização no contrato ou ficha desde o início.",
  "opcoes": [
   "Sim, vamos pedir autorização na ficha",
   "Caso a caso",
   "Ainda não pensamos nisso"
  ]
 },
 {
  "id": "treinamento",
  "tipo": "texto",
  "label": "Melhor dia e horário para o treinamento inicial do time",
  "secao": "Time comercial e atendimento"
 },
 {
  "id": "faturamento",
  "tipo": "texto",
  "label": "Qual é a média de faturamento mensal da empresa?",
  "secao": "Tráfego pago",
  "condicao": "trafego_pago"
 },
 {
  "id": "ticket_medio",
  "tipo": "texto",
  "label": "Qual é o ticket médio dos produtos ou serviços?",
  "secao": "Tráfego pago",
  "condicao": "trafego_pago"
 },
 {
  "id": "meses_melhores",
  "tipo": "texto",
  "label": "Quais meses são os melhores para a empresa?",
  "secao": "Tráfego pago",
  "condicao": "trafego_pago"
 },
 {
  "id": "meses_fracos",
  "tipo": "texto",
  "label": "Quais meses são os mais fracos?",
  "secao": "Tráfego pago",
  "condicao": "trafego_pago"
 },
 {
  "id": "orcamento",
  "tipo": "texto",
  "label": "Qual é o orçamento mensal disponível para campanhas patrocinadas?",
  "secao": "Tráfego pago",
  "condicao": "trafego_pago"
 },
 {
  "id": "pagamento_anuncio",
  "tipo": "escolha",
  "label": "Forma de pagamento do anúncio",
  "secao": "Tráfego pago",
  "ajuda": "A verba é paga direto na plataforma e não passa pela Startip. O cartão é o jeito mais organizado: o Pix exige recarga manual toda vez que acaba.",
  "opcoes": [
   "Cartão de crédito",
   "Pix na plataforma",
   "Ainda vamos definir"
  ],
  "condicao": "trafego_pago"
 },
 {
  "id": "contas_status",
  "tipo": "escolha",
  "label": "Instagram e Facebook da empresa",
  "secao": "Acessos, materiais e fechamento",
  "opcoes": [
   "Não existem ainda (criar do zero)",
   "Existem e vou passar o acesso"
  ]
 },
 {
  "id": "contas_links",
  "tipo": "longo",
  "label": "Links dos perfis, se existirem",
  "secao": "Acessos, materiais e fechamento",
  "ajuda": "Inclua qualquer perfil pessoal que esteja sendo usado para a empresa."
 },
 {
  "id": "email_contas",
  "tipo": "texto",
  "label": "E-mail que será dono das contas (Google, Meta, TikTok)",
  "secao": "Acessos, materiais e fechamento",
  "ajuda": "Evite e-mail pessoal de um sócio: se a sociedade mudar, a conta vai junto."
 },
 {
  "id": "site_status",
  "tipo": "escolha",
  "label": "Site ou domínio",
  "secao": "Acessos, materiais e fechamento",
  "opcoes": [
   "Não tem",
   "Domínio já registrado",
   "Quer registrar"
  ]
 },
 {
  "id": "site_dominio",
  "tipo": "texto",
  "label": "Qual é o site ou domínio?",
  "secao": "Acessos, materiais e fechamento"
 },
 {
  "id": "google_negocio",
  "tipo": "escolha",
  "label": "Podemos cadastrar ou otimizar a empresa no Google Meu Negócio com esse endereço?",
  "secao": "Acessos, materiais e fechamento",
  "ajuda": "O Google manda um cartão com código para o endereço: alguém precisa estar lá para receber.",
  "opcoes": [
   "Sim",
   "Só depois",
   "Já possui ficha (passar acesso)"
  ]
 },
 {
  "id": "pasta_materiais",
  "tipo": "texto",
  "label": "Pasta com fotos, vídeos e documentos",
  "secao": "Acessos, materiais e fechamento",
  "ajuda": "Link do Drive com o que já existir: fotos de produto, tabela de preços, logo, apresentação."
 },
 {
  "id": "info_adicional",
  "tipo": "longo",
  "label": "O que mais a gente precisa saber?",
  "secao": "Acessos, materiais e fechamento",
  "ajuda": "Qualquer coisa importante que não foi perguntada: planos de expansão, sócios, prazos, limitações, o que te preocupa nesse começo."
 }
]$json$::jsonb
) on conflict (chave) do update
  set titulo = excluded.titulo,
      descricao = excluded.descricao,
      perguntas = excluded.perguntas;

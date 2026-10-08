import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from '@/shared/layout/AppShell';
import { ProtectedRoute } from '@/shared/auth/ProtectedRoute';
import { RequireModulo } from '@/shared/auth/RequireModulo';
import { LoginPage } from '@/pages/LoginPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { HomeRedirect } from '@/app/HomeRedirect';
import { InicioPage } from '@/pages/InicioPage';
import { PortalShell } from '@/portal/PortalShell';
import { PortalRelatorios } from '@/portal/pages/PortalRelatorios';
import { PortalAndamento } from '@/portal/pages/PortalAndamento';
import { PortalReunioes } from '@/portal/pages/PortalReunioes';
import { PortalIndicacoes } from '@/portal/pages/PortalIndicacoes';
import { ClientesListPage } from '@/modules/clientes/pages/ClientesListPage';
import { ClienteDetailPage } from '@/modules/clientes/pages/ClienteDetailPage';
import { CrmPage } from '@/modules/crm/pages/CrmPage';
import { FinanceiroPage } from '@/modules/financeiro/pages/FinanceiroPage';
import { AreaClientePage } from '@/modules/area-cliente/pages/AreaClientePage';
import { ProcessosPage } from '@/modules/processos/pages/ProcessosPage';
import { IndicacaoPage } from '@/modules/indicacao/pages/IndicacaoPage';
import { OnboardingPage } from '@/modules/onboarding/pages/OnboardingPage';
import { AprovacaoConteudoPage } from '@/modules/aprovacao-conteudo/pages/AprovacaoConteudoPage';
import { DemandasPage } from '@/modules/demandas/pages/DemandasPage';
import { UsuariosPage } from '@/modules/usuarios/pages/UsuariosPage';
import { ContratosPage } from '@/modules/contratos/pages/ContratosPage';
import { MetaAdsGestorPage } from '@/modules/meta-ads/pages/MetaAdsGestorPage';
import { TrafegoPage } from '@/modules/trafego/pages/TrafegoPage';
import { DesignerPage } from '@/modules/designer/pages/DesignerPage';
import { Navigate } from 'react-router-dom';
import { MarketplacePublicoPage } from '@/pages/MarketplacePublicoPage';
import { CadastroPublicoPage } from '@/pages/CadastroPublicoPage';
import { CentralClientePage } from '@/pages/CentralClientePage';
import { AprovacaoPublicaPage } from '@/pages/AprovacaoPublicaPage';
import { PortalAprovacao } from '@/portal/pages/PortalAprovacao';
import { CalendarioPublicoPage } from '@/pages/CalendarioPublicoPage';
import { DatasComemorativasPage } from '@/modules/datas-comemorativas/pages/DatasComemorativasPage';
import { PainelTvPage } from '@/pages/PainelTvPage';
import { PainelTvAdminPage } from '@/modules/painel-tv/pages/PainelTvAdminPage';
import { OtimizacoesListaPage } from '@/modules/otimizacoes/pages/OtimizacoesListaPage';
import { OtimizacoesClientePage } from '@/modules/otimizacoes/pages/OtimizacoesClientePage';
import { OtimizacoesPublicaPage } from '@/pages/OtimizacoesPublicaPage';
import { IdeiasPage } from '@/modules/ideias/pages/IdeiasPage';

// Padrão para módulos futuros: envolva a page em <RequireModulo modulo="chave">
// para respeitar a permissão do cargo.
export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  // Rota pública de auto-cadastro do cliente (sem auth).
  { path: '/cadastro/:slug', element: <CadastroPublicoPage /> },
  { path: '/central/:slug', element: <CentralClientePage /> },
  { path: '/aprovar/:slug', element: <AprovacaoPublicaPage /> },
  { path: '/calendario/:slug', element: <CalendarioPublicoPage /> },
  { path: '/tv/:slug', element: <PainelTvPage /> },
  { path: '/otim/:token', element: <OtimizacoesPublicaPage /> },
  { path: '/marketplace', element: <MarketplacePublicoPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      { index: true, element: <HomeRedirect /> },
      // Portal externo do cliente
      {
        path: 'portal',
        element: <PortalShell />,
        children: [
          { index: true, element: <PortalRelatorios /> },
          { path: 'andamento', element: <PortalAndamento /> },
          { path: 'reunioes', element: <PortalReunioes /> },
          { path: 'aprovacao', element: <PortalAprovacao /> },
          { path: 'indicacoes', element: <PortalIndicacoes /> },
        ],
      },
      // Aplicação interna (equipe)
      {
        element: <AppShell />,
        children: [
          { path: 'inicio', element: <InicioPage /> },
          { path: 'clientes', element: <RequireModulo modulo="clientes"><ClientesListPage /></RequireModulo> },
          { path: 'clientes/:id', element: <RequireModulo modulo="clientes"><ClienteDetailPage /></RequireModulo> },
          { path: 'crm', element: <RequireModulo modulo="crm"><CrmPage /></RequireModulo> },
          { path: 'financeiro', element: <RequireModulo modulo="financeiro"><FinanceiroPage /></RequireModulo> },
          { path: 'area-cliente', element: <RequireModulo modulo="area-cliente"><AreaClientePage /></RequireModulo> },
          { path: 'processos', element: <RequireModulo modulo="processos"><ProcessosPage /></RequireModulo> },
          { path: 'indicacao', element: <RequireModulo modulo="indicacao"><IndicacaoPage /></RequireModulo> },
          { path: 'onboarding', element: <RequireModulo modulo="onboarding"><OnboardingPage /></RequireModulo> },
          { path: 'designer', element: <RequireModulo modulo="conteudo"><DesignerPage /></RequireModulo> },
          { path: 'conteudo', element: <Navigate to="/designer" replace /> },
          { path: 'aprovacao-conteudo', element: <RequireModulo modulo="aprovacao-conteudo"><AprovacaoConteudoPage /></RequireModulo> },
          { path: 'painel-tv', element: <RequireModulo modulo="painel-tv"><PainelTvAdminPage /></RequireModulo> },
          { path: 'datas-comemorativas', element: <RequireModulo modulo="datas-comemorativas"><DatasComemorativasPage /></RequireModulo> },
          { path: 'demandas', element: <RequireModulo modulo="demandas"><DemandasPage /></RequireModulo> },
          { path: 'usuarios', element: <RequireModulo modulo="usuarios"><UsuariosPage /></RequireModulo> },
          { path: 'contratos', element: <RequireModulo modulo="contratos"><ContratosPage /></RequireModulo> },
          { path: 'meta-ads',   element: <RequireModulo modulo="diretoria"><MetaAdsGestorPage /></RequireModulo> },
          { path: 'painel-cliente', element: <Navigate to="/area-cliente" replace /> },
          { path: 'trafego',    element: <RequireModulo modulo="diretoria"><TrafegoPage /></RequireModulo> },
          { path: 'otimizacoes', element: <RequireModulo modulo="otimizacoes"><OtimizacoesListaPage /></RequireModulo> },
          { path: 'otimizacoes/:slug', element: <RequireModulo modulo="otimizacoes"><OtimizacoesClientePage /></RequireModulo> },
          { path: 'ideias', element: <RequireModulo modulo="ideias"><IdeiasPage /></RequireModulo> },
          { path: 'social-media', element: <Navigate to="/designer" replace /> },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);

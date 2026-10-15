import { useSearchParams } from 'react-router-dom';
import { ConfigTab } from '@/modules/alertas/components/ConfigTab';
import { EquipeTab } from '@/modules/alertas/components/EquipeTab';
import { GruposTab } from '@/modules/alertas/components/GruposTab';
import { NotificacoesTab } from '@/modules/alertas/components/NotificacoesTab';
import { useAvisosAtuais } from '@/modules/alertas/hooks/useAlertasAoVivo';
import { PainelTab } from '@/modules/alertas/components/PainelTab';
import { RelatoriosTab } from '@/modules/alertas/components/RelatoriosTab';
import { PageHeader } from '@/shared/ui/PageHeader';

const ABAS = [
  { id: 'painel', label: 'Painel' },
  { id: 'notificacoes', label: 'Notificações' },
  { id: 'grupos', label: 'Grupos e contatos' },
  { id: 'equipe', label: 'Equipe' },
  { id: 'relatorios', label: 'Relatórios' },
  { id: 'config', label: 'Configurações' },
] as const;
type AbaId = (typeof ABAS)[number]['id'];

export function AlertasPage() {
  const [params, setParams] = useSearchParams();
  const { avisos } = useAvisosAtuais();
  const p = params.get('aba');
  const aba: AbaId = ABAS.some((a) => a.id === p) ? (p as AbaId) : 'painel';

  return (
    <div className="space-y-5">
      <PageHeader
        title="Startip Alertas"
        subtitle="Monitora os grupos de WhatsApp dos clientes e avisa a equipe quando ninguém responde no prazo."
      />
      <nav className="flex flex-wrap gap-2 border-b border-white/10 pb-2">
        {ABAS.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => setParams(a.id === 'painel' ? {} : { aba: a.id })}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              aba === a.id ? 'bg-brand-500/20 text-brand-200' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
            }`}
          >
            {a.label}
            {a.id === 'notificacoes' && avisos.length > 0 && (
              <span className="ml-2 rounded-full bg-red-500 px-1.5 py-0.5 text-xs font-semibold text-white">{avisos.length}</span>
            )}
          </button>
        ))}
      </nav>

      {aba === 'painel' && <PainelTab />}
      {aba === 'notificacoes' && <NotificacoesTab />}
      {aba === 'grupos' && <GruposTab />}
      {aba === 'equipe' && <EquipeTab />}
      {aba === 'relatorios' && <RelatoriosTab />}
      {aba === 'config' && <ConfigTab />}
    </div>
  );
}

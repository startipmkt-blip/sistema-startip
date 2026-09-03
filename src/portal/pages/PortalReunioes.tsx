import { useAuth } from '@/shared/auth/AuthProvider';
import { ReunioesPanel } from '@/modules/reunioes/ReunioesPanel';

export function PortalReunioes() {
  const { profile } = useAuth();
  const clienteId = profile?.cliente_id ?? '';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Reuniões</h1>
        <p className="text-sm text-slate-400">Resumos e PDFs das nossas reuniões — consulte quando quiser.</p>
      </div>
      <ReunioesPanel clienteId={clienteId} somenteLeitura />
    </div>
  );
}

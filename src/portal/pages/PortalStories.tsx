import { useAuth } from '@/shared/auth/AuthProvider';
import { useCliente } from '@/modules/clientes/api/clientesApi';
import { StoriesView } from '@/modules/stories/components/StoriesView';

// O cliente final só enxerga o próprio perfil (a RLS reforça isso no banco).
export function PortalStories() {
  const { profile } = useAuth();
  const clienteId = profile?.cliente_id ?? '';
  const { data: cliente } = useCliente(clienteId);
  if (!clienteId) return <p className="text-sm text-slate-400">Seu acesso ainda não está ligado a um cliente.</p>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-white">Ideias de Stories</h1>
        <p className="text-sm text-slate-400">Inspirações para a Black Friday 2026. Use como quiser e poste quando fizer sentido para você.</p>
      </div>
      <StoriesView clientes={[{ id: clienteId, nome: cliente?.nome ?? '' }]} clienteFixo={clienteId} />
    </div>
  );
}

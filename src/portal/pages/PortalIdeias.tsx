import { useAuth } from '@/shared/auth/AuthProvider';
import { IdeiasVipCliente } from '@/modules/ideias-vip/components/IdeiasVipCliente';

export function PortalIdeias() {
  const { profile } = useAuth();
  const clienteId = profile?.cliente_id ?? '';
  if (!clienteId) return <p className="text-sm text-slate-400">Seu acesso ainda não está ligado a um cliente.</p>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-white">Ideias</h1>
        <p className="text-sm text-slate-400">Ideias de postagem para o seu grupo VIP. Copie o texto e use quando fizer sentido.</p>
      </div>
      <IdeiasVipCliente clientId={clienteId} />
    </div>
  );
}

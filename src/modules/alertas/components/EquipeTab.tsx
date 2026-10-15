import { useState } from 'react';
import { useEquipeAlerta, useExcluirMembro, useSalvarMembro } from '@/modules/alertas/api/alertasApi';
import type { MembroEquipe } from '@/modules/alertas/types';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Input } from '@/shared/ui/Input';
import { Spinner } from '@/shared/ui/Spinner';
import { Table, type Column } from '@/shared/ui/Table';

function digitos(t: string) { return t.replace(/\D/g, ''); }
// Mesma regra do banco: DDD + número (10 ou 11 dígitos), com ou sem +55.
function telefoneValido(t: string) {
  let d = digitos(t);
  if (d.startsWith('55') && d.length >= 12) d = d.slice(2);
  return d.length === 10 || d.length === 11;
}

export function EquipeTab() {
  const equipeQ = useEquipeAlerta();
  const salvar = useSalvarMembro();
  const excluir = useExcluirMembro();
  const [nome, setNome] = useState('');
  const [cargo, setCargo] = useState('');
  const [telefone, setTelefone] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  async function adicionar() {
    setErro(null);
    if (!nome.trim()) { setErro('Informe o nome.'); return; }
    if (!telefoneValido(telefone)) { setErro('Telefone inválido. Use DDD + número, ex.: (11) 98765-4321.'); return; }
    try {
      await salvar.mutateAsync({ nome: nome.trim(), cargo: cargo.trim() || null, telefone: telefone.trim() });
      setNome(''); setCargo(''); setTelefone('');
    } catch (e) {
      const msg = (e as Error).message;
      setErro(/duplicate|unique/i.test(msg) ? 'Este telefone já está cadastrado.' : msg);
    }
  }

  const colunas: Column<MembroEquipe>[] = [
    { header: 'Nome', render: (m) => <span className="font-medium text-white">{m.nome}</span> },
    { header: 'Cargo', render: (m) => m.cargo ?? '—' },
    { header: 'WhatsApp', render: (m) => m.telefone },
    { header: 'Situação', render: (m) => <Badge tone={m.ativo ? 'green' : 'slate'}>{m.ativo ? 'Ativo' : 'Inativo'}</Badge> },
    { header: '', className: 'text-right', render: (m) => (
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={() => salvar.mutate({ ...m, ativo: !m.ativo })}>{m.ativo ? 'Desativar' : 'Ativar'}</Button>
        <Button variant="ghost" onClick={() => { if (window.confirm(`Remover ${m.nome} da equipe monitorada?`)) excluir.mutate(m.id); }}>Remover</Button>
      </div>
    ) },
  ];

  return (
    <div className="space-y-4">
      <Card className="space-y-3 p-4">
        <h2 className="text-sm font-semibold text-white">Adicionar integrante da equipe Startip</h2>
        <div className="grid gap-3 md:grid-cols-4">
          <Input placeholder="Nome" value={nome} onChange={(e) => setNome(e.target.value)} />
          <Input placeholder="Cargo (gestor, atendimento, social, tráfego…)" value={cargo} onChange={(e) => setCargo(e.target.value)} />
          <Input placeholder="WhatsApp com DDD" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
          <Button onClick={adicionar} disabled={salvar.isPending}>Adicionar</Button>
        </div>
        {erro && <p className="text-sm text-red-300">{erro}</p>}
        <p className="text-xs text-slate-500">
          Mensagens enviadas por estes números nos grupos contam como resposta da equipe, mesmo que não sejam o número conectado à Z-API.
          O número conectado também é tratado como equipe quando a mensagem é enviada manualmente pelo celular ou pelo inbox do Startip OS.
        </p>
      </Card>

      <Card className="overflow-hidden">
        {equipeQ.isLoading ? <div className="flex justify-center p-10"><Spinner /></div> : (
          <Table columns={colunas} data={equipeQ.data ?? []} keyOf={(m) => m.id}
            emptyMessage="Nenhum integrante cadastrado. Sem eles, respostas de colaboradores serão tratadas como mensagens de cliente." />
        )}
      </Card>
    </div>
  );
}

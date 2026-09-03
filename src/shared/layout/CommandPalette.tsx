import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/shared/auth/AuthProvider';
import { useClientes } from '@/modules/clientes/api/clientesApi';
import { useCrmLeads } from '@/modules/crm/api/crmApi';
import { navItems, moduloKey } from '@/shared/layout/navigation';
import { podeAcessarModulo } from '@/shared/auth/permissions';

interface Acao {
  id: string;
  grupo: 'Ir para' | 'Clientes' | 'Leads' | 'Ações';
  label: string;
  hint?: string;
  icon: string;
  onSelect: () => void;
}

export function CommandPalette() {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const nav = useNavigate();
  const { profile } = useAuth();
  const { data: clientes } = useClientes('');
  const { data: leads } = useCrmLeads('');

  // Atalho global Ctrl+K / Cmd+K
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setAberto((v) => !v);
      }
      if (e.key === 'Escape') setAberto(false);
    }
    function onOpen() { setAberto(true); }
    window.addEventListener('keydown', onKey);
    window.addEventListener('commandpalette:open', onOpen);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('commandpalette:open', onOpen);
    };
  }, []);

  useEffect(() => {
    if (aberto) {
      setBusca('');
      setCursor(0);
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [aberto]);

  const acoes = useMemo<Acao[]>(() => {
    if (!profile) return [];
    const lista: Acao[] = [];

    // Módulos
    for (const item of navItems) {
      const key = moduloKey(item);
      if (!podeAcessarModulo(profile, key)) continue;
      lista.push({
        id: `nav:${item.to}`,
        grupo: 'Ir para',
        label: item.label,
        icon: '➜',
        onSelect: () => nav(item.to),
      });
    }

    // Ações rápidas
    lista.push(
      { id: 'act:novo-cliente', grupo: 'Ações', label: 'Novo cliente', icon: '➕', onSelect: () => nav('/clientes?novo=1') },
      { id: 'act:novo-lead',    grupo: 'Ações', label: 'Novo lead',    icon: '➕', onSelect: () => nav('/crm?novo=1') },
      { id: 'act:nova-demanda', grupo: 'Ações', label: 'Nova demanda', icon: '➕', onSelect: () => nav('/demandas?novo=1') },
      { id: 'act:novo-contrato',grupo: 'Ações', label: 'Novo contrato',icon: '➕', onSelect: () => nav('/contratos?novo=1') },
    );

    // Clientes
    for (const c of clientes ?? []) {
      lista.push({
        id: `cli:${c.id}`,
        grupo: 'Clientes',
        label: c.nome,
        hint: c.tipo_negocio ?? undefined,
        icon: '🏢',
        onSelect: () => nav(`/clientes/${c.id}`),
      });
    }

    // Leads (nomeados, não grupos)
    for (const l of leads ?? []) {
      if (l.is_grupo) continue;
      lista.push({
        id: `lead:${l.id}`,
        grupo: 'Leads',
        label: l.nome || l.telefone || 'sem nome',
        hint: l.telefone ?? undefined,
        icon: '💬',
        onSelect: () => nav(`/crm?lead=${l.id}`),
      });
    }

    return lista;
  }, [profile, clientes, leads, nav]);

  // Filtro fuzzy simples: todas as palavras da busca devem aparecer em label|hint|grupo.
  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return acoes.slice(0, 40);
    const termos = q.split(/\s+/);
    return acoes
      .filter((a) => {
        const hay = `${a.label} ${a.hint ?? ''} ${a.grupo}`.toLowerCase();
        return termos.every((t) => hay.includes(t));
      })
      .slice(0, 40);
  }, [acoes, busca]);

  useEffect(() => { setCursor(0); }, [busca]);

  function executar(i: number) {
    const a = filtradas[i];
    if (!a) return;
    setAberto(false);
    a.onSelect();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((c) => Math.min(filtradas.length - 1, c + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor((c) => Math.max(0, c - 1)); }
    else if (e.key === 'Enter')   { e.preventDefault(); executar(cursor); }
  }

  if (!aberto) return null;

  // Agrupamento visual
  let ultimoGrupo: Acao['grupo'] | null = null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/60 pt-[10vh] backdrop-blur-sm"
      onClick={() => setAberto(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl overflow-hidden rounded-xl border border-white/10 bg-slate-900 shadow-2xl"
      >
        <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
          <span className="text-slate-500">🔎</span>
          <input
            ref={inputRef}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Buscar módulo, cliente, lead ou ação…"
            className="flex-1 bg-transparent py-1 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
          />
          <kbd className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-slate-400">ESC</kbd>
        </div>
        <ul className="max-h-[60vh] overflow-y-auto py-1">
          {filtradas.length === 0 && (
            <li className="p-6 text-center text-xs text-slate-500">Nada encontrado para "{busca}".</li>
          )}
          {filtradas.map((a, i) => {
            const cabecalho = a.grupo !== ultimoGrupo ? a.grupo : null;
            ultimoGrupo = a.grupo;
            return (
              <li key={a.id}>
                {cabecalho && (
                  <div className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    {cabecalho}
                  </div>
                )}
                <button
                  onClick={() => executar(i)}
                  onMouseEnter={() => setCursor(i)}
                  className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm ${
                    i === cursor ? 'bg-brand-500/20 text-white' : 'text-slate-200 hover:bg-white/5'
                  }`}
                >
                  <span className="w-5 text-center">{a.icon}</span>
                  <span className="flex-1 truncate">{a.label}</span>
                  {a.hint && <span className="truncate text-xs text-slate-500">{a.hint}</span>}
                </button>
              </li>
            );
          })}
        </ul>
        <div className="flex items-center justify-between border-t border-white/10 px-3 py-1.5 text-[10px] text-slate-500">
          <span>↑↓ navegar · ↵ abrir</span>
          <span>Ctrl+K para alternar</span>
        </div>
      </div>
    </div>
  );
}

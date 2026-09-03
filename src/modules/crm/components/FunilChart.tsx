interface Etapa {
  label: string;
  count: number;
}

// Funil de vendas: barras centralizadas com largura proporcional.
export function FunilChart({ etapas }: { etapas: Etapa[] }) {
  const max = Math.max(1, ...etapas.map((e) => e.count));
  const temDados = etapas.some((e) => e.count > 0);

  if (!temDados) {
    return (
      <div className="flex h-56 flex-col items-center justify-center text-center">
        <div className="text-sm font-medium text-slate-400">Sem dados para exibir</div>
        <div className="mt-1 text-xs text-slate-400">
          Não existem valores para montar o funil.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1 py-2">
      {etapas.map((e, i) => {
        const larg = 40 + (e.count / max) * 60; // 40%..100%
        const opacidade = 1 - i * 0.14;
        return (
          <div
            key={e.label}
            className="flex items-center justify-center rounded-sm text-xs font-medium text-white"
            style={{
              width: `${larg}%`,
              backgroundColor: `rgba(79, 70, 229, ${opacidade})`,
              paddingTop: 10,
              paddingBottom: 10,
            }}
            title={`${e.label}: ${e.count}`}
          >
            {e.label} · {e.count}
          </div>
        );
      })}
    </div>
  );
}

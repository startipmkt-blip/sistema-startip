import { useState, type ReactNode } from 'react';

export interface KanbanColumn {
  id: string;
  label: string;
}

interface KanbanBoardProps<T> {
  columns: KanbanColumn[];
  items: T[];
  columnOf: (item: T) => string;
  keyOf: (item: T) => string;
  renderCard: (item: T) => ReactNode;
  onMove?: (item: T, novaColuna: string) => void;
  /** Cards e colunas menores, para quadros com muitos itens. */
  compact?: boolean;
}

// Cor da faixa no topo de cada coluna (segue a ordem das colunas).
const CORES_COLUNA = ['#1e9be0', '#d97706', '#7c3aed', '#0e7490', '#16a34a', '#db2777', '#64748b', '#ea580c'];

// Board com drag-and-drop nativo (HTML5). Ao arrastar um card e soltar
// numa coluna diferente, chama onMove(item, novaColuna). Se onMove não
// for passado, os cards ficam estáticos (modo somente-leitura).
export function KanbanBoard<T>({
  columns,
  items,
  columnOf,
  keyOf,
  renderCard,
  onMove,
  compact = false,
}: KanbanBoardProps<T>) {
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [dropCol, setDropCol] = useState<string | null>(null);

  function onDragStart(e: React.DragEvent, item: T) {
    if (!onMove) return;
    setDragKey(keyOf(item));
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', keyOf(item));
  }
  function onDragEnd() { setDragKey(null); setDropCol(null); }
  function onDragOver(e: React.DragEvent, colId: string) {
    if (!onMove) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dropCol !== colId) setDropCol(colId);
  }
  function onDrop(e: React.DragEvent, colId: string) {
    if (!onMove) return;
    e.preventDefault();
    const k = e.dataTransfer.getData('text/plain');
    const item = items.find((it) => keyOf(it) === k);
    if (item && columnOf(item) !== colId) onMove(item, colId);
    onDragEnd();
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {columns.map((col, i) => {
        const cor = CORES_COLUNA[i % CORES_COLUNA.length];
        const cards = items.filter((it) => columnOf(it) === col.id);
        const highlight = dropCol === col.id;
        return (
          <div
            key={col.id}
            onDragOver={(e) => onDragOver(e, col.id)}
            onDrop={(e) => onDrop(e, col.id)}
            onDragLeave={() => setDropCol((c) => (c === col.id ? null : c))}
            style={{ borderTopColor: cor, ['--cor' as string]: cor } as React.CSSProperties}
            className={`kanban-col flex shrink-0 flex-col rounded-xl border border-t-[3px] transition-colors ${compact ? 'w-64' : 'w-72'} ${
              highlight ? 'border-brand-400/60 bg-brand-500/10' : 'border-white/[0.08] bg-[#121a24]'
            }`}
          >
            <div className="flex items-center gap-2 px-3 pb-2 pt-3">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: cor }} />
              <span className="text-sm font-semibold text-slate-200">{col.label}</span>
              <span className="ml-auto rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-xs text-slate-400">{cards.length}</span>
            </div>
            <div className="flex min-h-[120px] flex-1 flex-col gap-2 px-2 pb-2">
              {cards.map((it) => {
                const k = keyOf(it);
                const isDrag = dragKey === k;
                return (
                  <div
                    key={k}
                    draggable={!!onMove}
                    onDragStart={(e) => onDragStart(e, it)}
                    onDragEnd={onDragEnd}
                    className={`kanban-card rounded-lg border border-white/10 bg-[#17212d] ${compact ? 'p-2' : 'p-3'} text-slate-200 transition-colors hover:border-brand-400/60 ${
                      onMove ? 'cursor-grab active:cursor-grabbing' : ''
                    } ${isDrag ? 'opacity-40' : ''}`}
                  >
                    {renderCard(it)}
                  </div>
                );
              })}
              {cards.length === 0 && (
                <div className="px-1 py-6 text-center text-xs text-slate-400">
                  {onMove ? 'Solte aqui' : 'Vazio'}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

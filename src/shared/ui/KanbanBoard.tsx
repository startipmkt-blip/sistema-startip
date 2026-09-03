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
}

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
      {columns.map((col) => {
        const cards = items.filter((it) => columnOf(it) === col.id);
        const highlight = dropCol === col.id;
        return (
          <div key={col.id} className="flex w-72 shrink-0 flex-col">
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="text-sm font-semibold text-slate-200">{col.label}</span>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-slate-300">{cards.length}</span>
            </div>
            <div
              onDragOver={(e) => onDragOver(e, col.id)}
              onDrop={(e) => onDrop(e, col.id)}
              onDragLeave={() => setDropCol((c) => (c === col.id ? null : c))}
              className={`flex min-h-[120px] flex-1 flex-col gap-2 rounded-xl border p-2 transition-colors ${
                highlight ? 'border-brand-400/60 bg-brand-500/10' : 'border-white/5 bg-white/[0.02]'
              }`}
            >
              {cards.map((it) => {
                const k = keyOf(it);
                const isDrag = dragKey === k;
                return (
                  <div
                    key={k}
                    draggable={!!onMove}
                    onDragStart={(e) => onDragStart(e, it)}
                    onDragEnd={onDragEnd}
                    className={`rounded-lg border border-white/10 bg-white/[0.06] p-3 text-slate-200 shadow-sm backdrop-blur-sm ${
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

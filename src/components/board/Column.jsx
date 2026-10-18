import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import SortableCard from './SortableCard.jsx';
import AddBar from './AddBar.jsx';

export default function Column({ status, ids, todoMap, visible, tagList, onAdd, onEdit, onDelete, onStatusChange }) {
    const { setNodeRef, isOver } = useDroppable({ id: status.id });
    const shown = ids.filter((id) => visible(todoMap[id]));

    return (
        <section className="flex w-full flex-col rounded-xl border border-slate-800 bg-slate-900/60 md:w-80 md:shrink-0">
            <header className={`flex items-center justify-between rounded-t-xl border-t-2 ${status.accent} px-4 py-3`}>
                <h2 className="font-semibold">{status.label}</h2>
                <span className="text-xs text-slate-400">
          {shown.length}
                    {shown.length !== ids.length ? ` / ${ids.length}` : ''}
        </span>
            </header>
            <div
                ref={setNodeRef}
                className={`flex min-h-32 flex-1 flex-col gap-2 rounded-b-xl p-2 transition-colors ${isOver ? 'bg-slate-800/50' : ''}`}
            >
                <SortableContext items={shown} strategy={verticalListSortingStrategy}>
                    {shown.map((id) => (
                        <SortableCard
                            key={id}
                            id={id}
                            todo={todoMap[id]}
                            tags={tagList}
                            completed={status.id === 'completed'}
                            onEdit={() => onEdit(todoMap[id])}
                            onDelete={() => onDelete(id)}
                            onStatusChange={(st) => onStatusChange(todoMap[id].id, st)}
                        />
                    ))}
                </SortableContext>
                {ids.length === 0 && <p className="m-auto text-xs text-slate-600">Drop cards here</p>}
            </div>
            <AddBar onAdd={onAdd} />
        </section>
    );
}

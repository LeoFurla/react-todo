import { useEffect, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import SortableCard from './SortableCard.jsx';
import AddBar from './AddBar.jsx';

// Collapse is a mobile-only feature: below Tailwind's md breakpoint (768 px)
// columns stack and take vertical space, so they can be folded to their header.
function useIsMobile() {
    // matchMedia tracks the same viewport measurement CSS media queries use
    // (window.innerWidth does not — it includes the scrollbar).
    const [mobile, setMobile] = useState(() => matchMedia('(max-width: 767px)').matches);
    useEffect(() => {
        const mq = matchMedia('(max-width: 767px)');
        const onChange = (e) => setMobile(e.matches);
        mq.addEventListener('change', onChange);
        return () => mq.removeEventListener('change', onChange);
    }, []);
    return mobile;
}

export default function Column({ status, ids, todoMap, visible, tagList, onAdd, onEdit, onDelete, onStatusChange, collapsed, onToggleCollapsed }) {
    const shown = ids.filter((id) => visible(todoMap[id]));
    const isMobile = useIsMobile();
    const folded = isMobile && collapsed;
    // While folded the card list (the normal droppable) is unmounted, so the
    // header becomes the drop target instead — hovering a drag over it makes
    // the board expand the column (see handleDragOver).
    const { setNodeRef, isOver } = useDroppable({ id: folded ? `folded-${status.id}` : status.id });

    return (
        <section className="flex w-full flex-col rounded-xl border border-slate-800 bg-slate-900/60 md:w-80 md:shrink-0">
            <header
                ref={folded ? setNodeRef : undefined}
                className={`flex items-center justify-between rounded-t-xl border-t-2 ${status.accent} px-4 py-3 transition-colors ${folded ? 'rounded-b-xl' : ''} ${folded && isOver ? 'bg-slate-800/50' : ''}`}
            >
                <h2 className="font-semibold">{status.label}</h2>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">
            {shown.length}
            {shown.length !== ids.length ? ` / ${ids.length}` : ''}
        </span>
                    {isMobile && (
                    <button
                        onClick={onToggleCollapsed}
                        aria-label={collapsed ? `Expand ${status.label} column` : `Collapse ${status.label} column`}
                        title={collapsed ? 'Expand column' : 'Collapse column'}
                        className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100"
                    >
                        <svg
                            viewBox="0 0 24 24"
                            className={`h-4 w-4 transition-transform ${collapsed ? '-rotate-90' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="m6 9 6 6 6-6" />
                        </svg>
                    </button>
                    )}
                </div>
            </header>
            {folded ? null : (
            <>
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
            </>
            )}
        </section>
    );
}

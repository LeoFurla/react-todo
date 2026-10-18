import { useState } from 'react';
import { STATUSES } from '../../lib/statuses.js';

function dueDateInfo(dueDate) {
    if (!dueDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(`${dueDate}T00:00:00`);
    const days = Math.round((due - today) / 86400000);
    const cls = days < 0 ? 'text-red-400' : days <= 3 ? 'text-amber-400' : 'text-slate-400';
    const label = new Date(`${dueDate}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    return { cls, text: `Due ${label}` };
}

export default function CardBody({ todo, tags, onClick, onDelete, onStatusChange, overlay, completed }) {
    const [menuOpen, setMenuOpen] = useState(false);
    const due = dueDateInfo(todo.dueDate);

    async function setStatus(status) {
        setMenuOpen(false);
        onStatusChange(status); // errors surfaced by parent
    }

    return (
        <div
            onClick={onClick}
            className={`group relative cursor-pointer rounded-lg border bg-slate-800 p-3 shadow-sm ${
                overlay ? 'rotate-2 border-sky-500 shadow-xl' : 'border-slate-700 hover:border-slate-500'
            }`}
        >
            <div className="flex items-start justify-between gap-2">
                <p className={`text-sm font-medium ${completed ? 'text-slate-500' : 'text-slate-100'}`}>
                    {todo.title}
                </p>
                {onDelete && !overlay && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpen((o) => !o);
                        }}
                        className="rounded px-1 text-sm text-slate-500 hover:bg-slate-700 hover:text-slate-200"
                        title="Actions"
                    >
                        ⋮
                    </button>
                )}
            </div>
            {due && <p className={`mt-1 text-xs ${due.cls}`}>{due.text}</p>}
            {menuOpen && !overlay && (
                <>
                    <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }} />
                    <div
                        className="absolute right-2 top-8 z-50 w-40 overflow-hidden rounded-lg border border-slate-700 bg-slate-800 py-1 text-sm shadow-xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            className="block w-full px-3 py-1.5 text-left hover:bg-slate-700"
                            onClick={() => {
                                setMenuOpen(false);
                                onClick();
                            }}
                        >
                            Edit
                        </button>
                        {STATUSES.filter((s) => s.id !== todo.status).map((s) => (
                            <button
                                key={s.id}
                                className="block w-full px-3 py-1.5 text-left hover:bg-slate-700"
                                onClick={() => setStatus(s.id)}
                            >
                                Move to {s.label}
                            </button>
                        ))}
                        <button
                            className="block w-full px-3 py-1.5 text-left text-red-400 hover:bg-slate-700"
                            onClick={() => {
                                setMenuOpen(false);
                                if (confirm('Delete this todo?')) onDelete();
                            }}
                        >
                            Delete
                        </button>
                    </div>
                </>
            )}
            {todo.description ? <p className="mt-1 line-clamp-2 text-xs text-slate-400">{todo.description}</p> : null}
            {todo.tagIds.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                    {todo.tagIds.map((tid) => {
                        const t = tags.find((x) => x.id === tid);
                        return t ? (
                            <span key={tid} className="rounded bg-slate-700 px-1.5 py-0.5 text-[10px] text-slate-300">
                #{t.name}
              </span>
                        ) : null;
                    })}
                </div>
            )}
        </div>
    );
}

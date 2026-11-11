import { useCallback, useEffect, useRef, useState } from 'react';
import {
    DndContext,
    DragOverlay,
    MouseSensor,
    TouchSensor,
    useSensor,
    useSensors,
    closestCorners,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { api } from '../lib/api.js';
import { STATUSES } from '../lib/statuses.js';
import Avatar from '../components/Avatar.jsx';
import Column from '../components/board/Column.jsx';
import CardBody from '../components/board/CardBody.jsx';
import EditModal from '../components/board/EditModal.jsx';

export default function Board({ user, onLogout, onOpenProfile }) {
    const [todoMap, setTodoMap] = useState({});
    const [order, setOrder] = useState({ planned: [], started: [], completed: [] });
    const [tagList, setTagList] = useState([]);
    const [search, setSearch] = useState('');
    const [selectedTags, setSelectedTags] = useState([]);
    const [editing, setEditing] = useState(null);
    const [dragId, setDragId] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    const orderRef = useRef(order);
    orderRef.current = order;
    const dragStartOrderRef = useRef(null);

    const load = useCallback(async () => {
        const data = await api.board();
        const map = {};
        const ord = { planned: [], started: [], completed: [] };
        for (const t of data.todos) {
            map[t.id] = t;
            if (ord[t.status]) ord[t.status].push(t.id);
        }
        setTodoMap(map);
        setOrder(ord);
        setTagList(data.tags);
    }, []);

    useEffect(() => {
        load()
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    }, [load]);

    const visible = useCallback(
        (t) => {
            if (!t) return false;
            const q = search.trim().toLowerCase();
            if (q && !t.title.toLowerCase().includes(q) && !(t.description || '').toLowerCase().includes(q))
                return false;
            if (selectedTags.length && !selectedTags.some((id) => t.tagIds.includes(id))) return false;
            return true;
        },
        [search, selectedTags],
    );

    const colOf = (ord, id) => STATUSES.map((s) => s.id).find((st) => ord[st].includes(id)) || null;

    // Move a card. Works with or without an active filter: hidden cards
    // keep their relative slots, visible cards follow the drop.
    function applyMove(ord, activeId, overId) {
        const activeCol = colOf(ord, activeId);
        if (!activeCol) return ord;
        let targetCol = null;
        if (overId != null) targetCol = STATUSES.some((s) => s.id === overId) ? overId : colOf(ord, overId);
        if (!targetCol) return ord;

        if (targetCol === activeCol) {
            if (!overId || overId === activeId) return ord;
            const col = ord[targetCol];
            const vis = col.filter((id) => visible(todoMap[id]));
            const oldIndex = vis.indexOf(activeId);
            const newIndex = vis.indexOf(overId);
            if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return ord;
            const moved = arrayMove(vis, oldIndex, newIndex);
            const next = [];
            let vi = 0;
            for (const id of col) next.push(visible(todoMap[id]) ? moved[vi++] : id);
            return { ...ord, [targetCol]: next };
        }

        const next = { planned: [...ord.planned], started: [...ord.started], completed: [...ord.completed] };
        next[activeCol] = next[activeCol].filter((id) => id !== activeId);
        const idx =
            overId != null && next[targetCol].includes(overId)
                ? next[targetCol].indexOf(overId)
                : next[targetCol].length;
        next[targetCol].splice(idx, 0, activeId);
        return next;
    }

    // Mouse: instant drag (4 px). Touch: hold a card for 250 ms (finger
    // within 8 px) to start dragging; quick swipes scroll instead. Two
    // dedicated sensors are required — NOT PointerSensor alongside
    // TouchSensor: PointerSensor also listens to touch pointers, and on
    // touch pointerdown fires before touchstart, so the PointerSensor would
    // always win the activation AND a touch-driven PointerSensor drag gets
    // cancelled the moment the browser's native pan gesture takes over
    // (pointercancel) once the finger moves. MouseSensor only listens to
    // mousedown, so touch never triggers it. Quick taps/clicks never reach
    // the 250 ms delay, so click-to-edit keeps working.
    const sensors = useSensors(
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
        useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    );

    function handleDragStart(event) {
        setDragId(event.active.id);
        dragStartOrderRef.current = orderRef.current;
    }

    function handleDragEnd() {
        setDragId(null);
        const start = dragStartOrderRef.current;
        dragStartOrderRef.current = null;
        if (!start) return;
        const latest = orderRef.current;
        if (JSON.stringify(latest) === JSON.stringify(start)) return; // dropped without moving
        api.reorder(latest).catch((e) => {
            setError(e.message);
            load();
        });
    }

    function handleDragCancel() {
        setDragId(null);
        dragStartOrderRef.current = null;
        load();
    }

    function handleDragOver(event) {
        const { active, over } = event;
        if (!over) return;
        setOrder((prev) => applyMove(prev, active.id, over.id));
    }

    function toggleSelectedTag(id) {
        setSelectedTags((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
    }

    async function handleSaveEdit(data) {
        await api.updateTodo(editing.id, data);
        setEditing(null);
        load();
    }

    async function handleDeleteTodo(id) {
        await api.deleteTodo(id);
        setEditing(null);
        load();
    }

    const handleStatusChange = (id, status) =>
        api.updateTodo(id, { status }).then(load).catch((e) => setError(e.message));

    const dragTodo = dragId != null ? todoMap[dragId] : null;

    if (loading) return <p className="p-6 text-slate-400">Loading board…</p>;

    return (
        <div className="min-h-screen bg-slate-950 p-4 text-slate-100 md:p-6">
            <header className="mb-4 flex flex-wrap items-center gap-3">
                <h1 className="text-lg font-bold">TODO</h1>
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search todos…"
                    className="input order-3 w-full sm:order-none sm:w-52"
                />
                {tagList.length > 0 && (
                    <div className="order-4 flex w-full flex-wrap items-center gap-1.5 sm:order-none sm:w-auto">
                        {tagList.map((t) => (
                            <button
                                key={t.id}
                                onClick={() => toggleSelectedTag(t.id)}
                                className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
                                    selectedTags.includes(t.id) ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                }`}
                            >
                                #{t.name}
                            </button>
                        ))}
                    </div>
                )}
                <div className="order-2 ml-auto flex items-center gap-2 sm:order-none">
                    <button onClick={onOpenProfile} aria-label="Profile" title="Profile" className="shrink-0 transition-opacity hover:opacity-80">
                        <Avatar user={user} className="h-9 w-9 text-sm" />
                    </button>
                    <button
                        onClick={onLogout}
                        aria-label="Log out"
                        title="Log out"
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
                    >
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                            <path d="M16 17l5-5-5-5" />
                            <path d="M21 12H9" />
                        </svg>
                    </button>
                </div>
            </header>

            {error && (
                <div className="mb-3 flex items-center justify-between rounded-lg border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-300">
                    <span>{error}</span>
                    <button onClick={() => setError('')} className="hover:text-red-100">✕</button>
                </div>
            )}

            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
                onDragCancel={handleDragCancel}
            >
                <main className="flex flex-col gap-4 pb-4 md:flex-row md:items-start md:overflow-x-auto">
                    {STATUSES.map((s) => (
                        <Column
                            key={s.id}
                            status={s}
                            ids={order[s.id]}
                            todoMap={todoMap}
                            visible={visible}
                            tagList={tagList}
                            onAdd={(title) => api.createTodo({ title, status: s.id }).then(load).catch((e) => setError(e.message))}
                            onEdit={setEditing}
                            onDelete={handleDeleteTodo}
                            onStatusChange={handleStatusChange}
                        />
                    ))}
                </main>
                <DragOverlay dropAnimation={null}>
                    {dragTodo ? (
                        <CardBody todo={dragTodo} tags={tagList} overlay completed={colOf(order, dragId) === 'completed'} />
                    ) : null}
                </DragOverlay>
            </DndContext>

            {editing && (
                <EditModal
                    todo={editing}
                    tags={tagList}
                    onSave={handleSaveEdit}
                    onDelete={() => handleDeleteTodo(editing.id)}
                    onClose={() => setEditing(null)}
                    onCreateTag={async (name) => {
                        const t = await api.createTag(name);
                        load();
                        return t;
                    }}
                />
            )}
        </div>
    );
}

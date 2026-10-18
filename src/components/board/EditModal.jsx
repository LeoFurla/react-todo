import { useState } from 'react';
import { STATUSES } from '../../lib/statuses.js';

export default function EditModal({ todo, tags, onSave, onDelete, onClose, onCreateTag }) {
    const [title, setTitle] = useState(todo.title);
    const [description, setDescription] = useState(todo.description || '');
    const [tagIds, setTagIds] = useState(todo.tagIds);
    const [status, setStatus] = useState(todo.status);
    const [dueDate, setDueDate] = useState(todo.dueDate || '');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [newTag, setNewTag] = useState('');
    const [creating, setCreating] = useState(false);
    const [tagError, setTagError] = useState('');

    function toggleTag(id) {
        setTagIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
    }

    async function submitTag(e) {
        e.preventDefault();
        const n = newTag.trim().replace(/^#/, '');
        if (!n || creating) return;
        setTagError('');
        setCreating(true);
        try {
            const t = await onCreateTag(n);
            setTagIds((cur) => (cur.includes(t.id) ? cur : [...cur, t.id]));
            setNewTag('');
        } catch (err) {
            setTagError(err.message);
        } finally {
            setCreating(false);
        }
    }

    async function save() {
        setBusy(true);
        setError('');
        try {
            await onSave({ title, description, status, tagIds, dueDate: dueDate || null });
            onClose();
        } catch (e) {
            setError(e.message);
            setBusy(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
            <div
                className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-5"
                onClick={(e) => e.stopPropagation()}
            >
                <h3 className="mb-4 font-semibold text-slate-100">Edit todo</h3>
                <label className="mb-1 block text-xs text-slate-400">Title</label>
                <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
                <label className="mb-1 mt-3 block text-xs text-slate-400">Description</label>
                <textarea className="input" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
                <label className="mb-1 mt-3 block text-xs text-slate-400">Status</label>
                <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
                    {STATUSES.map((s) => (
                        <option key={s.id} value={s.id}>
                            {s.label}
                        </option>
                    ))}
                </select>
                <div className="mt-3 flex items-center gap-2">
                    <div className="flex-1">
                        <label className="mb-1 block text-xs text-slate-400">Due date</label>
                        <input type="date" className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                    </div>
                    {dueDate && (
                        <button className="btn-secondary" type="button" onClick={() => setDueDate('')}>
                            Clear
                        </button>
                    )}
                </div>
                <label className="mb-1 mt-3 block text-xs text-slate-400">Tags</label>
                {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {tags.map((t) => (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => toggleTag(t.id)}
                                className={`rounded-full px-2.5 py-1 text-xs ${
                                    tagIds.includes(t.id) ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                }`}
                            >
                                #{t.name}
                            </button>
                        ))}
                    </div>
                )}
                <form className="mt-2 flex gap-2" onSubmit={submitTag}>
                    <input
                        className="input flex-1"
                        placeholder="New tag…"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        disabled={creating}
                    />
                    <button className="btn-secondary" type="submit" disabled={creating || !newTag.trim()}>
                        {creating ? '…' : 'Add'}
                    </button>
                </form>
                {tagError && <p className="mt-1 text-xs text-red-400">{tagError}</p>}
                {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
                <div className="mt-5 flex items-center justify-between">
                    <button
                        onClick={() => {
                            if (confirm('Delete this todo?')) onDelete();
                        }}
                        className="text-sm text-red-400 hover:text-red-300"
                    >
                        Delete
                    </button>
                    <div className="flex gap-2">
                        <button className="btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button className="btn-primary" onClick={save} disabled={busy || !title.trim()}>
                            {busy ? 'Saving…' : 'Save'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

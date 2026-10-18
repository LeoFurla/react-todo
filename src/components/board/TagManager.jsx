import { useState } from 'react';

export default function TagManager({ tags, onAdd, onRename, onDelete, onClose }) {
    const [name, setName] = useState('');
    const [editId, setEditId] = useState(null);
    const [editName, setEditName] = useState('');
    const [error, setError] = useState('');

    async function submitAdd(e) {
        e.preventDefault();
        const n = name.trim();
        if (!n) return;
        try {
            await onAdd(n);
            setName('');
            setError('');
        } catch (err) {
            setError(err.message);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
            <div
                className="w-full max-w-sm rounded-xl border border-slate-700 bg-slate-900 p-5"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-semibold">Tags</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
                </div>
                <form onSubmit={submitAdd} className="mb-3 flex gap-2">
                    <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="New tag" />
                    <button className="btn-primary shrink-0" disabled={!name.trim()}>
                        Add
                    </button>
                </form>
                {error && <p className="mb-2 text-xs text-red-400">{error}</p>}
                <ul className="flex flex-col gap-1">
                    {tags.map((t) => (
                        <li key={t.id} className="flex items-center gap-2">
                            {editId === t.id ? (
                                <>
                                    <input
                                        autoFocus
                                        className="input flex-1"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        onKeyDown={async (e) => {
                                            if (e.key === 'Enter') {
                                                try {
                                                    await onRename(t.id, editName);
                                                    setEditId(null);
                                                    setError('');
                                                } catch (err) {
                                                    setError(err.message);
                                                }
                                            }
                                        }}
                                    />
                                    <button
                                        className="text-xs text-emerald-400 hover:text-emerald-300"
                                        onClick={async () => {
                                            try {
                                                await onRename(t.id, editName);
                                                setEditId(null);
                                                setError('');
                                            } catch (err) {
                                                setError(err.message);
                                            }
                                        }}
                                    >
                                        Save
                                    </button>
                                </>
                            ) : (
                                <>
                                    <span className="flex-1 rounded bg-slate-800 px-2 py-1 text-sm text-slate-200">#{t.name}</span>
                                    <button
                                        className="text-xs text-slate-400 hover:text-white"
                                        onClick={() => {
                                            setEditId(t.id);
                                            setEditName(t.name);
                                        }}
                                    >
                                        rename
                                    </button>
                                    <button
                                        className="text-xs text-red-400 hover:text-red-300"
                                        onClick={async () => {
                                            if (confirm(`Delete tag #${t.name}? It will be removed from all todos.`)) {
                                                await onDelete(t.id);
                                            }
                                        }}
                                    >
                                        delete
                                    </button>
                                </>
                            )}
                        </li>
                    ))}
                    {tags.length === 0 && <li className="text-xs text-slate-500">No tags yet.</li>}
                </ul>
            </div>
        </div>
    );
}

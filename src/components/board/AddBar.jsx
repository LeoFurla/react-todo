import { useState } from 'react';

export default function AddBar({ onAdd }) {
    const [open, setOpen] = useState(false);
    const [title, setTitle] = useState('');
    if (!open) {
        return (
            <button
                onClick={() => setOpen(true)}
                className="m-2 rounded-lg px-3 py-2 text-left text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            >
                + Add todo
            </button>
        );
    }
    return (
        <form
            className="m-2"
            onSubmit={(e) => {
                e.preventDefault();
                const t = title.trim();
                if (t) {
                    onAdd(t);
                    setTitle('');
                }
            }}
        >
            <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => {
                    if (!title.trim()) setOpen(false);
                }}
                onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                        setTitle('');
                        setOpen(false);
                    }
                }}
                placeholder="Title… (Enter to add, Esc to cancel)"
                className="input"
            />
        </form>
    );
}

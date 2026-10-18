import { useState } from 'react';
import { api } from '../lib/api.js';

export default function AuthPage({ onAuth }) {
    const [mode, setMode] = useState('login');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    async function submit(e) {
        e.preventDefault();
        setBusy(true);
        setError('');
        try {
            const user =
                mode === 'login'
                    ? await api.login(username, password)
                    : await api.register(username, password);
            onAuth(user);
        } catch (err) {
            setError(err.message);
            setBusy(false);
        }
    }

    return (
        <div className="grid min-h-screen place-items-center bg-slate-950 p-4">
            <form onSubmit={submit} className="w-full max-w-sm rounded-xl border border-slate-800 bg-slate-900 p-6">
                <h1 className="mb-1 text-xl font-bold text-slate-100">TODO</h1>
                <p className="mb-4 text-sm text-slate-400">Sign in to your board</p>
                <label className="mb-1 block text-xs text-slate-400">Username</label>
                <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
                <label className="mb-1 mt-3 block text-xs text-slate-400">Password</label>
                <input
                    className="input"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
                {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
                <button className="btn-primary mt-4 w-full" disabled={busy}>
                    {busy ? '…' : mode === 'login' ? 'Log in' : 'Create account'}
                </button>
                <button
                    type="button"
                    onClick={() => {
                        setMode((m) => (m === 'login' ? 'register' : 'login'));
                        setError('');
                    }}
                    className="mt-3 w-full text-center text-xs text-slate-400 hover:text-white"
                >
                    {mode === 'login' ? 'No account? Register' : 'Have an account? Log in'}
                </button>
            </form>
        </div>
    );
}

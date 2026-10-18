import { useEffect, useState } from 'react';
import { api } from './lib/api.js';
import AuthPage from './pages/AuthPage.jsx';
import Board from './pages/Board.jsx';

export default function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.me()
            .then(setUser)
            .catch(() => setUser(null))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        const onExpired = () => setUser(null);
        window.addEventListener('auth:expired', onExpired);
        return () => window.removeEventListener('auth:expired', onExpired);
    }, []);

    if (loading) {
        return <div className="grid min-h-screen place-items-center bg-slate-950 text-slate-400">Loading…</div>;
    }
    if (!user) return <AuthPage onAuth={setUser} />;
    return (
        <Board
            user={user}
            onLogout={async () => {
                try {
                    await api.logout();
                } catch {
                    /* ignore */
                }
                setUser(null);
            }}
        />
    );
}

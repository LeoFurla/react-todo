import { useEffect, useState } from 'react';
import { api } from './lib/api.js';
import AuthPage from './pages/AuthPage.jsx';
import Board from './pages/Board.jsx';
import ProfilePage from './pages/ProfilePage.jsx';

export default function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    // URL-backed view so /profile works as a real route (no router lib in this app):
    // the server serves index.html for every non-file path (SPA fallback).
    const viewFromPath = () => (window.location.pathname === '/profile' ? 'profile' : 'board');
    const [view, setView] = useState(viewFromPath);

    const changeView = (v) => {
        setView(v);
        window.history.pushState(null, '', v === 'profile' ? '/profile' : '/');
    };

    useEffect(() => {
        const onPop = () => setView(viewFromPath());
        window.addEventListener('popstate', onPop);
        return () => window.removeEventListener('popstate', onPop);
    }, []);

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
    if (view === 'profile') {
        return (
            <ProfilePage
                user={user}
                onBack={() => changeView('board')}
                onUserChanged={(username) => setUser((u) => ({ ...u, username }))}
            />
        );
    }
    return (
        <Board
            user={user}
            onOpenProfile={() => changeView('profile')}
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

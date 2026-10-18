import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api.js';

const USERNAME_RE = /^[A-Za-z0-9._]{2,30}$/;

function Field({ label, children }) {
    return (
        <>
            <label className="mb-1 block text-xs text-slate-400">{label}</label>
            {children}
        </>
    );
}

export default function ProfilePage({ user, onBack, onUserChanged }) {
    const [profile, setProfile] = useState(null);
    const [error, setError] = useState('');

    // avatar
    const [avatarUrl, setAvatarUrl] = useState(null);
    const fileRef = useRef(null);
    const [avatarBusy, setAvatarBusy] = useState(false);
    const [avatarMsg, setAvatarMsg] = useState('');

    // username
    const [username, setUsername] = useState('');
    const [usernameBusy, setUsernameBusy] = useState(false);

    // password
    const [currentPw, setCurrentPw] = useState('');
    const [newPw, setNewPw] = useState('');
    const [pwBusy, setPwBusy] = useState(false);
    const [pwMsg, setPwMsg] = useState('');

    useEffect(() => {
        api
            .profile()
            .then((p) => {
                setProfile(p);
                setUsername(p.username);
                setAvatarUrl(api.avatarUrl(p.avatar));
            })
            .catch((err) => setError(err.message));
    }, []);

    async function submitAvatar(e) {
        e.preventDefault();
        const file = fileRef.current?.files?.[0];
        if (!file) {
            setAvatarMsg('Choose an image first');
            return;
        }
        setAvatarBusy(true);
        setAvatarMsg('');
        try {
            const res = await api.uploadAvatar(file);
            setAvatarUrl(api.avatarUrl(res.avatar));
            setAvatarMsg('Saved');
            if (fileRef.current) fileRef.current.value = '';
        } catch (err) {
            setAvatarMsg(err.message);
        } finally {
            setAvatarBusy(false);
        }
    }

    async function submitUsername(e) {
        e.preventDefault();
        const name = username.trim();
        if (!USERNAME_RE.test(name)) {
            setError('Username must be 2-30 characters (letters, numbers, dot, underscore)');
            return;
        }
        setUsernameBusy(true);
        setError('');
        try {
            await api.changeUsername(name);
            onUserChanged(name);
        } catch (err) {
            setError(err.message);
        } finally {
            setUsernameBusy(false);
        }
    }

    async function submitPassword(e) {
        e.preventDefault();
        if (newPw.length < 8) {
            setPwMsg('New password must be at least 8 characters');
            return;
        }
        setPwBusy(true);
        setPwMsg('');
        try {
            await api.changePassword(currentPw, newPw);
            setCurrentPw('');
            setNewPw('');
            setPwMsg('Password updated');
        } catch (err) {
            setPwMsg(err.message);
        } finally {
            setPwBusy(false);
        }
    }

    return (
        <div className="min-h-screen bg-slate-950 p-4 text-slate-100 md:p-6">
            <header className="mb-4 flex items-center gap-3">
                <button onClick={onBack} className="text-slate-300 hover:text-white">
                    ← Board
                </button>
                <h1 className="text-lg font-bold">Profile</h1>
            </header>

            {error && (
                <div className="mb-3 rounded-lg border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-300">
                    {error}
                </div>
            )}

            <div className="flex max-w-xl flex-col gap-4">
                {/* avatar */}
                <form onSubmit={submitAvatar} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                    <h2 className="mb-3 text-sm font-semibold text-slate-200">Profile picture</h2>
                    <div className="flex items-center gap-4">
                        {avatarUrl ? (
                            <img src={avatarUrl} alt="avatar" className="h-16 w-16 rounded-full object-cover" />
                        ) : (
                            <div className="grid h-16 w-16 place-items-center rounded-full bg-slate-800 text-xl text-slate-500">
                                {(profile?.username || user.username).charAt(0).toUpperCase()}
                            </div>
                        )}
                        <div>
                            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="block text-xs text-slate-400" />
                            {avatarMsg && <p className="mt-2 text-xs text-slate-400">{avatarMsg}</p>}
                        </div>
                    </div>
                    <button className="btn-primary mt-3" disabled={avatarBusy}>
                        {avatarBusy ? 'Uploading…' : 'Upload'}
                    </button>
                </form>

                {/* username */}
                <form onSubmit={submitUsername} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                    <h2 className="mb-3 text-sm font-semibold text-slate-200">Username</h2>
                    <div className="flex gap-2">
                        <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} />
                        <button className="btn-primary" disabled={usernameBusy}>
                            {usernameBusy ? '…' : 'Save'}
                        </button>
                    </div>
                </form>

                {/* password */}
                <form onSubmit={submitPassword} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                    <h2 className="mb-3 text-sm font-semibold text-slate-200">Change password</h2>
                    <Field label="Current password">
                        <input className="input" type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} />
                    </Field>
                    <Field label="New password (min 8 characters)">
                        <input className="input mt-3" type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
                    </Field>
                    {pwMsg && <p className={`mt-2 text-xs ${pwMsg === 'Password updated' ? 'text-emerald-400' : 'text-red-400'}`}>{pwMsg}</p>}
                    <button className="btn-primary mt-3" disabled={pwBusy}>
                        {pwBusy ? '…' : 'Update password'}
                    </button>
                </form>
            </div>
        </div>
    );
}

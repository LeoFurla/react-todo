import { api } from '../lib/api.js';

// Round avatar: uploaded image, or a first-letter placeholder.
export default function Avatar({ user, className = 'h-16 w-16 text-xl' }) {
    const src = api.avatarUrl(user?.avatar);
    if (src) {
        return <img src={src} alt={`avatar of ${user.username}`} className={`rounded-full object-cover ${className}`} />;
    }
    return (
        <div className={`grid place-items-center rounded-full bg-slate-800 text-slate-500 ${className}`}>
            {(user?.username || '?').charAt(0).toUpperCase()}
        </div>
    );
}

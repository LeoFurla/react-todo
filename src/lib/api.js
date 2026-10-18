async function request(path, options = {}) {
    const isForm = typeof FormData !== 'undefined' && options.body instanceof FormData;
    const res = await fetch(path, {
        credentials: 'same-origin',
        method: options.method || 'GET',
        // FormData needs the browser to set the multipart boundary itself
        headers: options.body && !isForm ? { 'content-type': 'application/json' } : undefined,
        body: isForm ? options.body : options.body ? JSON.stringify(options.body) : undefined,
    });
    let data = null;
    try {
        data = await res.json();
    } catch {
        /* no body */
    }
    if (!res.ok) {
        if (res.status === 401 && !/\/api\/(login|register)$/.test(path)) {
            window.dispatchEvent(new Event('auth:expired'));
        }
        throw new Error((data && data.error) || `HTTP ${res.status}`);
    }
    return data;
}

export const api = {
    me: () => request('/api/me'),
    login: (username, password) => request('/api/login', { method: 'POST', body: { username, password } }),
    register: (username, password) => request('/api/register', { method: 'POST', body: { username, password } }),
    logout: () => request('/api/logout', { method: 'POST' }),
    profile: () => request('/api/profile'),
    changeUsername: (username) => request('/api/profile/username', { method: 'PATCH', body: { username } }),
    changePassword: (current, next) => request('/api/profile/password', { method: 'POST', body: { current, next } }),
    uploadAvatar: (file) => {
        const fd = new FormData();
        fd.append('file', file);
        return request('/api/profile/avatar', { method: 'POST', body: fd });
    },
    avatarUrl: (name) => (name ? `/avatars/${encodeURIComponent(name)}` : null),
    board: () => request('/api/board'),
    createTodo: (body) => request('/api/todos', { method: 'POST', body }),
    updateTodo: (id, body) => request(`/api/todos/${id}`, { method: 'PATCH', body }),
    deleteTodo: (id) => request(`/api/todos/${id}`, { method: 'DELETE' }),
    reorder: (columns) => request('/api/reorder', { method: 'POST', body: columns }),
    createTag: (name) => request('/api/tags', { method: 'POST', body: { name } }),
    renameTag: (id, name) => request(`/api/tags/${id}`, { method: 'PATCH', body: { name } }),
    deleteTag: (id) => request(`/api/tags/${id}`, { method: 'DELETE' }),
};
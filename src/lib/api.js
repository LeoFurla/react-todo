async function request(path, options = {}) {
    const res = await fetch(path, {
        credentials: 'same-origin',
        method: options.method || 'GET',
        headers: options.body ? { 'content-type': 'application/json' } : undefined,
        body: options.body ? JSON.stringify(options.body) : undefined,
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
    board: () => request('/api/board'),
    createTodo: (body) => request('/api/todos', { method: 'POST', body }),
    updateTodo: (id, body) => request(`/api/todos/${id}`, { method: 'PATCH', body }),
    deleteTodo: (id) => request(`/api/todos/${id}`, { method: 'DELETE' }),
    reorder: (columns) => request('/api/reorder', { method: 'POST', body: columns }),
    createTag: (name) => request('/api/tags', { method: 'POST', body: { name } }),
    renameTag: (id, name) => request(`/api/tags/${id}`, { method: 'PATCH', body: { name } }),
    deleteTag: (id) => request(`/api/tags/${id}`, { method: 'DELETE' }),
};
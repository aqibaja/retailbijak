// ─── Device Identity ────────────────────────────────────

export function getDeviceId() {
    let id = localStorage.getItem('device_id');
    if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem('device_id', id);
    }
    return id;
}

export async function registerDevice() {
    const id = getDeviceId();
    const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'X-Device-Id': id, 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data?.device_id) {
        localStorage.setItem('device_id', data.device_id);
    }
    return data;
}

// ─── PIN Operations ─────────────────────────────────────

export async function verifyPin(pin) {
    const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
    });
    return await res.json();
}

export async function setPin(pin) {
    const res = await fetch('/api/auth/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
    });
    return await res.json();
}

// ─── Identity ───────────────────────────────────────────

export async function getMyIdentity() {
    const id = getDeviceId();
    const res = await fetch('/api/auth/me', {
        headers: { 'X-Device-Id': id },
    });
    if (!res.ok) return null;
    return await res.json();
}

export async function updateNickname(name) {
    const id = getDeviceId();
    const res = await fetch('/api/auth/nickname', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Device-Id': id },
        body: JSON.stringify({ nickname: name }),
    });
    return await res.json();
}

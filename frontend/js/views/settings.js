import { animateCards } from '../main.js';

export function renderSettings(root) {
    root.innerHTML = `
        <div class="flex-between mb-4"><h1>Settings</h1></div>
        <div class="card" style="max-width:640px;">
            <h2>Interface Preferences</h2>
            <div style="margin-top:14px; display:flex; flex-direction:column; gap:12px;">
                <label style="display:flex; justify-content:space-between; align-items:center;">
                    <span>Compact table rows</span><input type="checkbox" disabled>
                </label>
                <label style="display:flex; justify-content:space-between; align-items:center;">
                    <span>Auto-refresh screener results</span><input type="checkbox" disabled>
                </label>
                <p style="font-size:12px; color:var(--text-muted);">Preferences panel is prepared and can be connected to localStorage next.</p>
            </div>
        </div>
    `;
    animateCards('.card');
}

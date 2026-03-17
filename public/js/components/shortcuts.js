// Quick-links / shortcuts in header

const SHORTCUT_ICON_CDN = 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/';

function resolveShortcutIcon(icon) {
  if (!icon) return '';
  if (icon.startsWith('http')) return icon;
  const name = icon.replace(/\.(png|jpg|svg)$/, '');
  return `${SHORTCUT_ICON_CDN}${name}.svg`;
}

async function loadShortcuts() {
  try {
    const res = await fetch('/api/shortcuts');
    const shortcuts = await res.json();
    renderShortcuts(shortcuts);
  } catch (err) {
    console.error('Failed to load shortcuts:', err);
  }
}

function renderShortcuts(shortcuts) {
  const nav = document.getElementById('quick-links');
  if (!nav) return;

  const links = shortcuts.map((s, i) => {
    const iconUrl = resolveShortcutIcon(s.icon);
    const iconHtml = iconUrl
      ? `<img src="${iconUrl}" width="18" height="18" alt="${s.name}" onerror="this.textContent='${s.name.charAt(0)}';">`
      : `<span style="font-size:14px;font-weight:600">${s.name.charAt(0)}</span>`;
    return `<a href="${s.url}" target="_blank" rel="noopener" class="quick-link" title="${s.name}" data-index="${i}">${iconHtml}</a>`;
  }).join('');

  nav.innerHTML = links +
    `<button class="quick-link quick-link-add" id="shortcut-add-btn" title="Shortcut hinzufügen">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
    </button>`;

  // Right-click to edit existing shortcuts
  nav.querySelectorAll('.quick-link:not(.quick-link-add)').forEach(link => {
    link.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const idx = parseInt(link.dataset.index);
      openShortcutModal(shortcuts, idx);
    });
  });

  document.getElementById('shortcut-add-btn').addEventListener('click', () => {
    openShortcutModal(shortcuts, -1);
  });
}

function openShortcutModal(shortcuts, editIndex) {
  const isEdit = editIndex >= 0;
  const current = isEdit ? shortcuts[editIndex] : { name: '', url: '', icon: '' };

  // Remove existing modal if any
  const existing = document.getElementById('shortcut-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'shortcut-modal';
  modal.className = 'shortcut-modal-overlay';
  modal.innerHTML = `
    <div class="shortcut-modal">
      <div class="settings-header">
        <span class="settings-title">${isEdit ? 'Shortcut bearbeiten' : 'Neuer Shortcut'}</span>
        <button class="card-btn btn-settings" id="shortcut-modal-close">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="settings-form">
        <label class="setting-row">
          <span>Name</span>
          <input type="text" class="setting-input" id="sc-name" placeholder="Unraid" value="${current.name}">
        </label>
        <label class="setting-row">
          <span>URL</span>
          <input type="text" class="setting-input" id="sc-url" placeholder="http://10.10.5.2" value="${current.url}">
        </label>
        <label class="setting-row">
          <span>Icon</span>
          <input type="text" class="setting-input" id="sc-icon" placeholder="unraid, portainer, or full URL" value="${current.icon}">
        </label>
      </div>
      <div class="shortcut-modal-actions">
        ${isEdit ? '<button class="settings-save shortcut-delete" id="sc-delete">Löschen</button>' : ''}
        <button class="settings-save" id="sc-save">Speichern</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Close
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
  document.getElementById('shortcut-modal-close').addEventListener('click', () => modal.remove());

  // Save
  document.getElementById('sc-save').addEventListener('click', async () => {
    const name = document.getElementById('sc-name').value.trim();
    const url = document.getElementById('sc-url').value.trim();
    const icon = document.getElementById('sc-icon').value.trim();
    if (!name || !url) return;

    const updated = [...shortcuts];
    if (isEdit) {
      updated[editIndex] = { name, url, icon };
    } else {
      updated.push({ name, url, icon });
    }

    await saveShortcuts(updated);
    modal.remove();
  });

  // Delete
  if (isEdit) {
    document.getElementById('sc-delete').addEventListener('click', async () => {
      const updated = shortcuts.filter((_, i) => i !== editIndex);
      await saveShortcuts(updated);
      modal.remove();
    });
  }
}

async function saveShortcuts(shortcuts) {
  try {
    await fetch('/api/shortcuts', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(shortcuts),
    });
    renderShortcuts(shortcuts);
  } catch (err) {
    console.error('Failed to save shortcuts:', err);
  }
}

// Container controls: start/stop/restart + card flip + settings save

async function containerAction(action, containerId, buttonEl) {
  const flipContainer = buttonEl?.closest('.card-flip-container');
  const card = buttonEl?.closest('.card-front');

  if (card) card.classList.add('processing');
  if (buttonEl) buttonEl.classList.add('loading');

  try {
    const res = await fetch(`/api/containers/${containerId}/${action}`, { method: 'POST' });
    const data = await res.json();

    if (!res.ok) {
      if (card) card.classList.add('action-error');
      setTimeout(() => {
        if (card) card.classList.remove('action-error', 'processing');
        refreshContainers();
      }, 1500);
      return;
    }

    if (card) card.classList.add('action-success');
    setTimeout(() => {
      if (card) card.classList.remove('action-success', 'processing');
      refreshContainers();
    }, 1200);
  } catch (err) {
    console.error(`Action ${action} error:`, err);
    if (card) card.classList.remove('processing');
  }
}

// Flip card to show/hide settings
async function flipCard(containerId) {
  const container = document.querySelector(`.card-flip-container[data-id="${containerId}"]`);
  if (!container) return;

  // If already flipped, just flip back
  if (container.classList.contains('flipped')) {
    container.classList.remove('flipped');
    return;
  }

  // Load settings BEFORE flipping
  try {
    const res = await fetch(`/api/containers/${containerId}/settings`);
    const data = await res.json();
    const form = container.querySelector('.settings-form');
    if (!form) return;

    // Populate restart policy with actual Docker value
    const policySelect = form.querySelector('[data-field="restartPolicy"]');
    if (policySelect) policySelect.value = data.restartPolicy || 'no';

    // Get current displayed values from the front card as defaults
    const front = container.querySelector('.card-front');
    const currentName = front?.querySelector('.card-name')?.textContent || '';
    const currentDesc = front?.querySelector('.card-desc')?.textContent || '';
    const currentUrl = front?.querySelector('.card-icon-wrap.clickable')?.href || front?.querySelector('a.card-name')?.href || '';
    const currentIcon = container.dataset.icon || '';

    // Fill fields with overrides if set, otherwise current values
    const ov = data.overrides || {};
    const setField = (field, override, fallback) => {
      const input = form.querySelector(`[data-field="${field}"]`);
      if (input) input.value = override || fallback || '';
    };

    setField('name', ov.name, currentName);
    setField('icon', ov.icon, currentIcon);
    setField('href', ov.href, currentUrl);
    setField('description', ov.description, currentDesc);
  } catch (err) {
    console.error('Failed to load settings:', err);
  }

  // Now flip
  container.classList.add('flipped');
}

// Save settings
async function saveSettings(containerId) {
  const container = document.querySelector(`.card-flip-container[data-id="${containerId}"]`);
  if (!container) return;

  const form = container.querySelector('.settings-form');
  if (!form) return;

  const body = {};
  form.querySelectorAll('.setting-input, .setting-select').forEach(el => {
    const field = el.dataset.field;
    const val = el.value.trim();
    if (val) body[field] = val;
  });

  const saveBtn = container.querySelector('.settings-save');
  if (saveBtn) { saveBtn.textContent = '...'; saveBtn.disabled = true; }

  try {
    const res = await fetch(`/api/containers/${containerId}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      if (saveBtn) saveBtn.textContent = '✓ Gespeichert';
      setTimeout(() => {
        container.classList.remove('flipped');
        if (saveBtn) { saveBtn.textContent = 'Speichern'; saveBtn.disabled = false; }
        // Force full re-render to apply overrides
        isFirstRender = true;
        refreshContainers();
      }, 800);
    } else {
      if (saveBtn) { saveBtn.textContent = 'Fehler!'; saveBtn.disabled = false; }
    }
  } catch (err) {
    console.error('Save error:', err);
    if (saveBtn) { saveBtn.textContent = 'Fehler!'; saveBtn.disabled = false; }
  }
}

// Delegate click events for action buttons
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.card-btn[data-action]');
  if (!btn) return;
  e.preventDefault();
  containerAction(btn.dataset.action, btn.dataset.id, btn);
});

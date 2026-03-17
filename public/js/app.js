// Main app: smart polling, tilt effect, skeleton loading, theme management

let currentGroups = null;
let isFirstRender = true;

// Skeleton loading placeholder
function showSkeleton() {
  const grid = document.getElementById('container-grid');
  if (!grid) return;
  grid.innerHTML = Array(12).fill('<div class="skeleton-card"></div>').join('');
  grid.classList.add('loading');
}

// Smart DOM update
function updateContainerGrid(groups) {
  const grid = document.getElementById('container-grid');
  if (!grid) return;

  if (Object.keys(groups).length === 0) {
    grid.className = 'container-grid';
    grid.innerHTML = '<div style="text-align:center;padding:4rem;color:var(--text-muted)">Keine Container mit Homepage-Labels gefunden</div>';
    return;
  }

  if (isFirstRender || !currentGroups) {
    grid.className = 'container-grid';
    grid.innerHTML = Object.entries(groups)
      .map(([name, containers]) => renderGroup(name, containers))
      .join('');
    isFirstRender = false;
    currentGroups = groups;
    initTiltEffect();
    return;
  }

  // Update only changed elements (skip flipped cards)
  for (const [groupName, containers] of Object.entries(groups)) {
    for (const c of containers) {
      const cardEl = grid.querySelector(`.card-flip-container[data-id="${c.id}"]`);
      if (!cardEl) continue;
      if (cardEl.classList.contains('flipped')) continue; // Don't touch settings view

      const oldState = cardEl.dataset.state;

      // Update state-dependent elements
      if (oldState !== c.state) {
        cardEl.dataset.state = c.state;
        const frontCard = cardEl.querySelector('.card-front');
        if (frontCard) frontCard.classList.toggle('alive', c.state === 'running');

        const statusEl = cardEl.querySelector('.card-front .card-status');
        if (statusEl) {
          statusEl.className = `card-status ${c.state}`;
          statusEl.innerHTML = c.state === 'running' ? '<span class="ripple"></span>' : '';
        }

        const accentEl = cardEl.querySelector('.card-front .card-accent');
        if (accentEl) accentEl.className = `card-accent ${c.state}`;

        const isStopped = c.state === 'exited' || c.state === 'dead';
        const actionsEl = cardEl.querySelector('.card-front .card-actions');
        if (actionsEl) {
          actionsEl.innerHTML = `
            ${isStopped
              ? `<button class="card-btn btn-start" data-action="start" data-id="${c.id}" title="Starten"><svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg></button>`
              : `<button class="card-btn btn-stop" data-action="stop" data-id="${c.id}" title="Stoppen"><svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg></button>`
            }
            <button class="card-btn btn-restart" data-action="restart" data-id="${c.id}" title="Neustarten"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg></button>
          `;
        }
      }

      // Update stats smoothly
      const cpuBar = cardEl.querySelector('.stat-cpu');
      const memBar = cardEl.querySelector('.stat-mem');
      const cpuVal = cardEl.querySelector('.stat-value');
      if (cpuBar && c.cpu !== null) cpuBar.style.width = Math.min(100, c.cpu) + '%';
      if (memBar && c.mem !== null && c.memLimit) memBar.style.width = Math.min(100, Math.round((c.mem / c.memLimit) * 100)) + '%';

      // Update uptime text
      const uptimeEl = cardEl.querySelector('.card-uptime');
      if (uptimeEl && c.status) uptimeEl.textContent = c.status;
    }

    // Update group count
    const countEl = grid.querySelector(`.group-count[data-group="${groupName}"]`);
    if (countEl) {
      const rc = containers.filter(c => c.state === 'running').length;
      countEl.textContent = `${rc}/${containers.length}`;
    }
  }

  currentGroups = groups;
}

// 3D Tilt effect on cards
function initTiltEffect() {
  document.querySelectorAll('.card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = ((y - centerY) / centerY) * -4; // max 4 degrees
      const rotateY = ((x - centerX) / centerX) * 4;

      card.style.transform = `perspective(600px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-2px)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(600px) rotateX(0deg) rotateY(0deg) translateY(0px)';
    });
  });
}

// Re-attach tilt on new cards after DOM update
const observer = new MutationObserver(() => {
  document.querySelectorAll('.card-front:not([data-tilt])').forEach(card => {
    card.dataset.tilt = '1';
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const rotateX = ((y - rect.height / 2) / (rect.height / 2)) * -4;
      const rotateY = ((x - rect.width / 2) / (rect.width / 2)) * 4;
      card.style.transform = `perspective(600px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-2px)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
});

async function refreshContainers() {
  try {
    const res = await fetch('/api/containers');
    const data = await res.json();
    updateContainerGrid(data.groups || {});
  } catch (err) {
    console.error('Failed to fetch containers:', err);
  }
}

async function refreshSystem() {
  try {
    const res = await fetch('/api/system');
    const data = await res.json();
    updateSystemBar(data);
  } catch (err) {
    console.error('Failed to fetch system info:', err);
  }
}

async function initThemes() {
  const select = document.getElementById('theme-select');
  if (!select) return;
  try {
    const res = await fetch('/api/themes');
    const themes = await res.json();
    select.innerHTML = themes.map(t =>
      `<option value="${t}">${t.charAt(0).toUpperCase() + t.slice(1)}</option>`
    ).join('');
    const saved = localStorage.getItem('crypt-theme') || 'crypt';
    select.value = saved;
    setTheme(saved);
    select.addEventListener('change', () => {
      setTheme(select.value);
      localStorage.setItem('crypt-theme', select.value);
    });
  } catch {
    select.innerHTML = '<option value="crypt">Crypt</option>';
  }
}

function setTheme(name) {
  const link = document.getElementById('theme-link');
  if (link) link.href = `/css/themes/${name}.css`;
}

// Search
function initSearch() {
  const toggle = document.getElementById('search-toggle');
  const wrap = document.getElementById('search-wrap');
  const input = document.getElementById('search-input');
  if (!toggle || !input || !wrap) return;

  toggle.addEventListener('click', () => {
    wrap.classList.toggle('open');
    if (wrap.classList.contains('open')) {
      input.focus();
    } else {
      input.value = '';
      filterCards('');
    }
  });

  input.addEventListener('input', () => filterCards(input.value));

  // Escape closes search
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      wrap.classList.remove('open');
      input.value = '';
      filterCards('');
    }
  });

  // Ctrl+K shortcut
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      wrap.classList.add('open');
      input.focus();
    }
  });
}

function filterCards(query) {
  const q = query.toLowerCase().trim();
  const cards = document.querySelectorAll('.card-flip-container');
  const groups = document.querySelectorAll('.group-section');

  cards.forEach(card => {
    if (!q) {
      card.classList.remove('search-hidden');
      return;
    }
    const name = card.querySelector('.card-name')?.textContent.toLowerCase() || '';
    const desc = card.querySelector('.card-desc')?.textContent.toLowerCase() || '';
    const match = name.includes(q) || desc.includes(q);
    card.classList.toggle('search-hidden', !match);
  });

  // Hide empty groups
  groups.forEach(group => {
    const visibleCards = group.querySelectorAll('.card-flip-container:not(.search-hidden)');
    group.classList.toggle('search-hidden', q && visibleCards.length === 0);
  });
}

// Init
(async function init() {
  showSkeleton();
  initThemes();
  initSearch();
  await Promise.all([refreshContainers(), refreshSystem()]);

  const grid = document.getElementById('container-grid');
  if (grid) observer.observe(grid, { childList: true, subtree: true });

  setInterval(refreshContainers, 10000);
  setInterval(refreshSystem, 5000);
})();


// ==============================
// COMPACT MODE
// ==============================
let compactSelectedId = null;

function initCompactMode() {
  const toggle = document.getElementById("compact-toggle");
  if (!toggle) return;

  const saved = localStorage.getItem("crypt-compact") === "true";
  if (saved) {
    document.body.classList.add("compact-mode");
    toggle.classList.add("active");
  }

  toggle.addEventListener("click", () => {
    const isCompact = document.body.classList.toggle("compact-mode");
    toggle.classList.toggle("active", isCompact);
    localStorage.setItem("crypt-compact", isCompact);
  });

  document.addEventListener("contextmenu", (e) => {
    if (!document.body.classList.contains("compact-mode")) return;
    const card = e.target.closest(".card-flip-container");
    if (!card) return;
    e.preventDefault();
    compactSelectedId = card.dataset.id;
    const state = card.dataset.state;
    const isRunning = state === "running";
    const menu = document.getElementById("compactCtxMenu");
    document.getElementById("cctx-open").classList.toggle("disabled", !isRunning);
    document.getElementById("cctx-start").classList.toggle("disabled", isRunning);
    document.getElementById("cctx-stop").classList.toggle("disabled", !isRunning);
    document.getElementById("cctx-restart").classList.toggle("disabled", !isRunning);
    const x = Math.min(e.clientX, window.innerWidth - 160);
    const y = Math.min(e.clientY, window.innerHeight - 180);
    menu.style.left = x + "px";
    menu.style.top = y + "px";
    menu.classList.add("visible");
  });

  document.addEventListener("click", (e) => {
    const menu = document.getElementById("compactCtxMenu");
    if (menu && !e.target.closest(".compact-ctx-menu")) {
      menu.classList.remove("visible");
    }
    if (!document.body.classList.contains("compact-mode")) return;
    const card = e.target.closest(".card-flip-container");
    if (!card) return;
    if (e.target.closest(".card-btn") || e.target.closest(".card-settings-btn")) return;
    const state = card.dataset.state;
    if (state === "running") {
      const link = card.querySelector("a.card-name, a.card-icon-wrap");
      if (link && link.href) {
        e.preventDefault();
        window.open(link.href, "_blank");
      }
    }
  });

  document.getElementById("cctx-open").addEventListener("click", () => {
    if (!compactSelectedId) return;
    const card = document.querySelector('.card-flip-container[data-id="' + compactSelectedId + '"]');
    const link = card ? card.querySelector("a.card-name, a.card-icon-wrap") : null;
    if (link && link.href) window.open(link.href, "_blank");
    document.getElementById("compactCtxMenu").classList.remove("visible");
  });

  document.getElementById("cctx-start").addEventListener("click", () => { compactAction("start"); });
  document.getElementById("cctx-stop").addEventListener("click", () => { compactAction("stop"); });
  document.getElementById("cctx-restart").addEventListener("click", () => { compactAction("restart"); });
}

async function compactAction(action) {
  if (!compactSelectedId) return;
  document.getElementById("compactCtxMenu").classList.remove("visible");
  const card = document.querySelector('.card-flip-container[data-id="' + compactSelectedId + '"]');
  const frontCard = card ? card.querySelector(".card-front") : null;
  if (frontCard) frontCard.classList.add("processing");
  try {
    const res = await fetch("/api/containers/" + compactSelectedId + "/" + action, { method: "POST" });
    if (res.ok && frontCard) {
      frontCard.classList.add("action-success");
      setTimeout(() => {
        frontCard.classList.remove("action-success", "processing");
        refreshContainers();
      }, 1200);
    }
  } catch (err) {
    console.error("Compact action error:", err);
    if (frontCard) frontCard.classList.remove("processing");
  }
}

initCompactMode();

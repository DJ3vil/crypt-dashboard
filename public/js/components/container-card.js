// Container card with flip settings panel

const ICON_CDN = 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/';

function resolveIconUrl(icon) {
  if (!icon) return '';
  if (icon.startsWith('mdi-')) return '';
  if (icon.startsWith('http')) return icon;
  const name = icon.replace(/\.(png|jpg|svg)$/, '');
  return `${ICON_CDN}${name}.svg`;
}

const MDI_MAP = {
  'mdi-music-note': '♪', 'mdi-music-box': '♫', 'mdi-api': '⚡',
  'mdi-microphone': '🎤', 'mdi-text-to-speech': '💬', 'mdi-account-voice': '👂',
  'mdi-gamepad-variant': '🎮', 'mdi-harddisk': '💾', 'mdi-printer-3d': '🖨',
  'mdi-piggy-bank': '🐷', 'mdi-checkbox-marked': '✅', 'mdi-code-braces': '⟨⟩',
  'mdi-coffin': '🏠',
};

function formatMem(bytes) {
  if (!bytes) return '—';
  if (bytes < 1048576) return (bytes / 1024).toFixed(0) + 'K';
  if (bytes < 1073741824) return (bytes / 1048576).toFixed(0) + 'M';
  return (bytes / 1073741824).toFixed(1) + 'G';
}

function formatNet(bytes) {
  if (!bytes) return '0';
  if (bytes < 1024) return bytes + 'B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(0) + 'K';
  if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + 'M';
  return (bytes / 1073741824).toFixed(1) + 'G';
}

function healthBadge(health) {
  if (!health) return '';
  const cls = health === 'healthy' ? 'health-ok' : health === 'unhealthy' ? 'health-bad' : 'health-wait';
  const label = health === 'healthy' ? '✓' : health === 'unhealthy' ? '✗' : '…';
  return `<span class="health-badge ${cls}" title="${health}">${label}</span>`;
}

function renderCard(container) {
  const iconUrl = resolveIconUrl(container.icon);
  const isMdi = container.icon && container.icon.startsWith('mdi-');
  const displayUrl = container.url || container.fallbackUrl || '';
  const hasUrl = !!displayUrl;
  const isRunning = container.state === 'running';
  const isStopped = container.state === 'exited' || container.state === 'dead';

  const iconInner = iconUrl
    ? `<img class="card-icon" src="${iconUrl}" alt="${container.name}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><span class="card-icon-letter" style="display:none">${container.name.charAt(0)}</span>`
    : isMdi
      ? `<span class="card-icon-emoji">${MDI_MAP[container.icon] || '◆'}</span>`
      : `<span class="card-icon-letter">${container.name.charAt(0)}</span>`;

  const hasCpu = container.cpu !== null;
  const hasMem = container.mem !== null;
  const cpuW = hasCpu ? Math.min(100, container.cpu) : 0;
  const memP = (hasMem && container.memLimit) ? Math.min(100, Math.round((container.mem / container.memLimit) * 100)) : 0;
  const hasNet = container.netRx !== null && container.netRx > 0;

  const portsHtml = container.ports?.length
    ? container.ports.map(p => `<span class="port-tag">${p}</span>`).join('')
    : '';

  return `
    <div class="card-flip-container" data-id="${container.id}" data-state="${container.state}" data-name="${container.containerName}" data-icon="${container.icon || ''}">
      <div class="card-flipper">

        <!-- ===== FRONT ===== -->
        <div class="card card-front ${isRunning ? 'alive' : ''}">
          <div class="card-accent ${container.state}"></div>
          <div class="card-body">
            <div class="card-top">
              ${hasUrl
                ? `<a href="${displayUrl}" target="_blank" rel="noopener" class="card-icon-wrap clickable" title="Öffne ${container.name}">${iconInner}</a>`
                : `<div class="card-icon-wrap">${iconInner}</div>`
              }
              <div class="card-info">
                <div class="card-name-row">
                  ${hasUrl
                    ? `<a href="${displayUrl}" target="_blank" rel="noopener" class="card-name clickable">${container.name}</a>`
                    : `<span class="card-name">${container.name}</span>`
                  }
                  ${healthBadge(container.health)}
                </div>
                <div class="card-desc">${container.description || container.containerName}</div>
              </div>
              <div class="card-status ${container.state}" title="${container.status}">
                ${isRunning ? '<span class="ripple"></span>' : ''}
              </div>
            </div>

            ${isRunning ? `
            <div class="card-stats">
              <div class="stat">
                <span class="stat-label">CPU</span>
                <div class="stat-bar"><div class="stat-bar-fill stat-cpu" style="width:${cpuW}%"></div></div>
                <span class="stat-value">${hasCpu ? container.cpu + '%' : '—'}</span>
              </div>
              <div class="stat">
                <span class="stat-label">RAM</span>
                <div class="stat-bar"><div class="stat-bar-fill stat-mem" style="width:${memP}%"></div></div>
                <span class="stat-value">${hasMem ? formatMem(container.mem) : '—'}</span>
              </div>
              ${hasNet ? `<div class="net-indicator" title="↓${formatNet(container.netRx)} ↑${formatNet(container.netTx)}"><span class="net-dot"></span></div>` : ''}
            </div>` : ''}

            <div class="card-meta">
              <span class="meta-image" title="${container.imageShort}:${container.imageTag}">${container.imageShort}:${container.imageTag}</span>
              ${portsHtml ? `<div class="meta-ports">${portsHtml}</div>` : ''}
            </div>

            <div class="card-bottom">
              <span class="card-uptime">${container.status}</span>
              <div class="card-actions">
                ${isStopped
                  ? `<button class="card-btn btn-start" data-action="start" data-id="${container.id}" title="Starten"><svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg></button>`
                  : `<button class="card-btn btn-stop" data-action="stop" data-id="${container.id}" title="Stoppen"><svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg></button>`
                }
                <button class="card-btn btn-restart" data-action="restart" data-id="${container.id}" title="Neustarten"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg></button>
                <button class="card-btn btn-settings" title="Einstellungen" onclick="flipCard('${container.id}')"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></button>
              </div>
            </div>
          </div>
        </div>

        <!-- ===== BACK (Settings) ===== -->
        <div class="card card-back">
          <div class="card-accent ${container.state}"></div>
          <div class="card-body settings-body">
            <div class="settings-header">
              <span class="settings-title">Einstellungen</span>
              <button class="card-btn btn-settings" title="Zurück" onclick="flipCard('${container.id}')">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div class="settings-form" data-id="${container.id}">
              <label class="setting-row">
                <span>Name</span>
                <input type="text" class="setting-input" data-field="name" placeholder="${container.name}" value="">
              </label>
              <label class="setting-row">
                <span>Icon</span>
                <input type="text" class="setting-input" data-field="icon" placeholder="${container.icon}" value="">
              </label>
              <label class="setting-row">
                <span>URL</span>
                <input type="text" class="setting-input" data-field="href" placeholder="${displayUrl || 'http://...'}" value="">
              </label>
              <label class="setting-row">
                <span>Info</span>
                <input type="text" class="setting-input" data-field="description" placeholder="${container.description}" value="">
              </label>
              <label class="setting-row">
                <span>Auto-Start</span>
                <select class="setting-select" data-field="restartPolicy">
                  <option value="no">Aus</option>
                  <option value="always">Immer</option>
                  <option value="unless-stopped">Außer gestoppt</option>
                  <option value="on-failure">Bei Fehler</option>
                </select>
              </label>
            </div>
            <button class="settings-save" onclick="saveSettings('${container.id}')">Speichern</button>
          </div>
        </div>

      </div>
    </div>
  `;
}

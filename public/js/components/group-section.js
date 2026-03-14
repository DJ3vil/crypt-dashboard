// Collapsible group sections

const COLLAPSE_KEY = 'crypt-collapsed-groups';

function getCollapsedGroups() {
  try {
    return JSON.parse(localStorage.getItem(COLLAPSE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveCollapsedGroups(groups) {
  localStorage.setItem(COLLAPSE_KEY, JSON.stringify(groups));
}

function toggleGroup(groupName) {
  const collapsed = getCollapsedGroups();
  collapsed[groupName] = !collapsed[groupName];
  saveCollapsedGroups(collapsed);

  const content = document.querySelector(`.group-content[data-group="${groupName}"]`);
  const chevron = document.querySelector(`.group-chevron[data-group="${groupName}"]`);

  if (content) content.classList.toggle('collapsed', collapsed[groupName]);
  if (chevron) chevron.classList.toggle('collapsed', collapsed[groupName]);
}

function renderGroup(groupName, containers) {
  const collapsed = getCollapsedGroups();
  const isCollapsed = collapsed[groupName] || false;
  const runningCount = containers.filter(c => c.state === 'running').length;

  return `
    <div class="group-section">
      <div class="group-header" onclick="toggleGroup('${groupName}')">
        <span class="group-chevron ${isCollapsed ? 'collapsed' : ''}" data-group="${groupName}">▼</span>
        <span class="group-name">${groupName}</span>
        <span class="group-count" data-group="${groupName}">${runningCount}/${containers.length}</span>
      </div>
      <div class="group-content ${isCollapsed ? 'collapsed' : ''}" data-group="${groupName}">
        ${containers.map(c => renderCard(c)).join('')}
      </div>
    </div>
  `;
}

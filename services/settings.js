const fs = require('fs');
const path = require('path');

const SETTINGS_FILE = process.env.SETTINGS_FILE || '/appdata/settings.json';

// In-memory cache
let cache = null;

function load() {
  if (cache) return cache;
  try {
    const raw = fs.readFileSync(SETTINGS_FILE, 'utf8');
    cache = JSON.parse(raw);
  } catch {
    cache = {};
  }
  return cache;
}

function save() {
  try {
    const dir = path.dirname(SETTINGS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(cache, null, 2));
  } catch (err) {
    console.error('Failed to save settings:', err.message);
  }
}

// Get overrides for a container (by container name as stable key)
function getOverrides(containerName) {
  const data = load();
  return data[containerName] || {};
}

// Save overrides for a container
function setOverrides(containerName, overrides) {
  const data = load();
  // Only store non-empty values
  const clean = {};
  for (const [k, v] of Object.entries(overrides)) {
    if (v !== null && v !== undefined && v !== '') clean[k] = v;
  }
  if (Object.keys(clean).length > 0) {
    data[containerName] = { ...data[containerName], ...clean };
  } else {
    delete data[containerName];
  }
  cache = data;
  save();
}

// Apply overrides to container data
function applyOverrides(container) {
  const overrides = getOverrides(container.containerName);
  if (overrides.name) container.name = overrides.name;
  if (overrides.icon) container.icon = overrides.icon;
  if (overrides.href) container.href = overrides.href;
  if (overrides.description) container.description = overrides.description;
  return container;
}

// Get shortcuts list
function getShortcuts() {
  const data = load();
  return data._shortcuts || [];
}

// Save shortcuts list
function setShortcuts(shortcuts) {
  const data = load();
  data._shortcuts = shortcuts;
  cache = data;
  save();
}

module.exports = { getOverrides, setOverrides, applyOverrides, getShortcuts, setShortcuts };

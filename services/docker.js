const Dockerode = require('dockerode');

const docker = new Dockerode({ socketPath: '/var/run/docker.sock' });

// Background stats cache
let statsCache = {};
let statsInterval = null;

async function collectStats() {
  try {
    const containers = await docker.listContainers({ filters: { status: ['running'] } });
    const newStats = {};

    await Promise.all(containers.map(async (c) => {
      try {
        const container = docker.getContainer(c.Id);
        const stats = await container.stats({ stream: false });

        const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
        const sysDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
        const cpuCount = stats.cpu_stats.online_cpus || 1;
        const cpuPercent = sysDelta > 0 ? Math.round((cpuDelta / sysDelta) * cpuCount * 1000) / 10 : 0;

        const memUsage = stats.memory_stats.usage - (stats.memory_stats.stats?.cache || 0);
        const memLimit = stats.memory_stats.limit;

        // Network I/O
        let netRx = 0, netTx = 0;
        if (stats.networks) {
          for (const iface of Object.values(stats.networks)) {
            netRx += iface.rx_bytes || 0;
            netTx += iface.tx_bytes || 0;
          }
        }

        newStats[c.Id] = { cpu: cpuPercent, mem: memUsage, memLimit, netRx, netTx };
      } catch { /* container may have stopped */ }
    }));

    statsCache = newStats;
  } catch (err) {
    console.error('Stats collection error:', err.message);
  }
}

function startStatsCollection() {
  if (statsInterval) return;
  collectStats();
  statsInterval = setInterval(collectStats, 8000);
}

function parseLabels(labels) {
  const prefix = 'homepage.';
  const result = {};
  for (const [key, value] of Object.entries(labels)) {
    if (key.startsWith(prefix)) {
      result[key.slice(prefix.length)] = value;
    }
  }
  return result;
}

// Parse uptime / downtime from Docker status string
function parseRuntime(status, state) {
  if (!status) return '';
  // "Up 3 days" → "3 Tage"
  // "Up About an hour" → "~1 Stunde"
  // "Exited (0) 2 hours ago" → "Seit 2 Stunden"
  return status;
}

// Extract port mappings from container
function extractPorts(containerData) {
  const ports = [];
  if (containerData.Ports) {
    for (const p of containerData.Ports) {
      if (p.PublicPort && p.PrivatePort) {
        ports.push(`${p.PublicPort}:${p.PrivatePort}`);
      }
    }
  }
  return ports.slice(0, 3); // Max 3 ports
}

// Extract health status
function extractHealth(status) {
  if (!status) return null;
  if (status.includes('(healthy)')) return 'healthy';
  if (status.includes('(unhealthy)')) return 'unhealthy';
  if (status.includes('(health: starting)')) return 'starting';
  return null;
}

async function getContainers() {
  const containers = await docker.listContainers({ all: true });
  const groups = {};

  for (const c of containers) {
    const labels = parseLabels(c.Labels || {});
    if (!labels.name) continue;

    const group = labels.group || 'Ungrouped';
    if (!groups[group]) groups[group] = [];

    const stats = statsCache[c.Id] || null;
    const health = extractHealth(c.Status);
    const ports = extractPorts(c);

    // Parse image tag
    const imageParts = (c.Image || '').split(':');
    const imageTag = imageParts.length > 1 ? imageParts[imageParts.length - 1] : 'latest';
    const imageShort = (imageParts[0] || '').split('/').pop();

    groups[group].push({
      id: c.Id,
      shortId: c.Id.slice(0, 12),
      name: labels.name,
      group: group,
      icon: labels.icon || '',
      href: labels.href || '',
      description: labels.description || '',
      state: c.State,
      status: c.Status,
      health: health,
      ports: ports,
      imageShort: imageShort,
      imageTag: imageTag,
      containerName: (c.Names[0] || '').replace(/^\//, ''),
      created: c.Created,
      cpu: stats ? stats.cpu : null,
      mem: stats ? stats.mem : null,
      memLimit: stats ? stats.memLimit : null,
      netRx: stats ? stats.netRx : null,
      netTx: stats ? stats.netTx : null,
    });
  }

  const sorted = {};
  for (const key of Object.keys(groups).sort()) {
    sorted[key] = groups[key].sort((a, b) => a.name.localeCompare(b.name));
  }
  return sorted;
}

async function startContainer(id) { await docker.getContainer(id).start(); }
async function stopContainer(id) { await docker.getContainer(id).stop(); }
async function restartContainer(id) { await docker.getContainer(id).restart(); }

startStatsCollection();

module.exports = { getContainers, startContainer, stopContainer, restartContainer };

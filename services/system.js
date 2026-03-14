const fs = require('fs');
const os = require('os');

const HOST_PROC = process.env.HOST_PROC || '/proc';
const HOST_SYS = process.env.HOST_SYS || '/sys';

// Read CPU usage from /proc/stat
let prevCpuIdle = 0;
let prevCpuTotal = 0;

function getCpuUsage() {
  try {
    const stat = fs.readFileSync(`${HOST_PROC}/stat`, 'utf8');
    const line = stat.split('\n')[0]; // "cpu  user nice system idle iowait irq softirq steal"
    const parts = line.split(/\s+/).slice(1).map(Number);
    const idle = parts[3] + (parts[4] || 0); // idle + iowait
    const total = parts.reduce((a, b) => a + b, 0);

    const diffIdle = idle - prevCpuIdle;
    const diffTotal = total - prevCpuTotal;
    prevCpuIdle = idle;
    prevCpuTotal = total;

    if (diffTotal === 0) return 0;
    return Math.round((1 - diffIdle / diffTotal) * 1000) / 10; // One decimal
  } catch {
    return 0;
  }
}

// Read memory info from /proc/meminfo
function getMemory() {
  try {
    const meminfo = fs.readFileSync(`${HOST_PROC}/meminfo`, 'utf8');
    const parse = (key) => {
      const match = meminfo.match(new RegExp(`${key}:\\s+(\\d+)`));
      return match ? parseInt(match[1]) * 1024 : 0; // kB to bytes
    };
    const total = parse('MemTotal');
    const available = parse('MemAvailable');
    const used = total - available;
    return {
      total,
      used,
      percent: total > 0 ? Math.round((used / total) * 1000) / 10 : 0,
    };
  } catch {
    return { total: 0, used: 0, percent: 0 };
  }
}

// Read CPU temperature
function getCpuTemp() {
  const paths = [
    `${HOST_SYS}/class/thermal/thermal_zone0/temp`,
    `${HOST_SYS}/class/hwmon/hwmon0/temp1_input`,
    `${HOST_SYS}/class/hwmon/hwmon1/temp1_input`,
  ];
  for (const p of paths) {
    try {
      const raw = fs.readFileSync(p, 'utf8').trim();
      const temp = parseInt(raw);
      return temp > 1000 ? temp / 1000 : temp; // millidegrees or degrees
    } catch { /* try next */ }
  }
  return null;
}

// Read disk usage via /proc/mounts + statfs
function getDisks() {
  const mounts = [
    { path: '/mnt/disk1', label: 'Disk 1 (SSD 1TB)' },
    { path: '/mnt/disk2', label: 'Disk 2 (HDD 1TB)' },
    { path: '/mnt/disk3', label: 'Disk 3 (HDD 2TB)' },
    { path: '/mnt/cache-ssd', label: 'Cache (SSD 240GB)' },
  ];

  // Inside container, host mounts might not be available
  // Try to read from /host/proc/mounts or use os methods
  return mounts.map((m) => {
    try {
      const stats = fs.statfsSync(m.path);
      const total = stats.blocks * stats.bsize;
      const free = stats.bfree * stats.bsize;
      const used = total - free;
      return {
        mount: m.path,
        label: m.label,
        total,
        used,
        percent: total > 0 ? Math.round((used / total) * 1000) / 10 : 0,
      };
    } catch {
      return { mount: m.path, label: m.label, total: 0, used: 0, percent: 0 };
    }
  });
}

// Get uptime
function getUptime() {
  try {
    const raw = fs.readFileSync(`${HOST_PROC}/uptime`, 'utf8');
    return Math.floor(parseFloat(raw.split(' ')[0]));
  } catch {
    return os.uptime();
  }
}

// Combined system info
function getSystemInfo() {
  return {
    cpu: {
      usage: getCpuUsage(),
      cores: os.cpus().length,
      temp: getCpuTemp(),
    },
    memory: getMemory(),
    disks: getDisks(),
    uptime: getUptime(),
  };
}

module.exports = { getSystemInfo };

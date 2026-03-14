// System bar: CPU ring, RAM ring, Temp ring, Disk bars

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + units[i];
}

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function updateSystemBar(data) {
  // CPU
  const cpuRing = document.getElementById('cpu-ring');
  const cpuValue = document.getElementById('cpu-value');
  if (cpuRing && cpuValue) {
    cpuRing.setAttribute('stroke-dasharray', `${data.cpu.usage}, 100`);
    cpuValue.textContent = `${data.cpu.usage}%`;
  }

  // Memory
  const memRing = document.getElementById('mem-ring');
  const memValue = document.getElementById('mem-value');
  if (memRing && memValue) {
    memRing.setAttribute('stroke-dasharray', `${data.memory.percent}, 100`);
    memValue.textContent = `${data.memory.percent}%`;
  }

  // Temperature
  const tempRing = document.getElementById('temp-ring');
  const tempValue = document.getElementById('temp-value');
  if (tempRing && tempValue) {
    if (data.cpu.temp !== null) {
      const tempPercent = Math.min(100, (data.cpu.temp / 100) * 100);
      tempRing.setAttribute('stroke-dasharray', `${tempPercent}, 100`);
      tempValue.textContent = `${Math.round(data.cpu.temp)}°`;
    } else {
      tempRing.setAttribute('stroke-dasharray', '0, 100');
      tempValue.textContent = '--';
    }
  }

  // Uptime
  const uptimeEl = document.getElementById('uptime');
  if (uptimeEl && data.uptime) {
    uptimeEl.textContent = `Uptime: ${formatUptime(data.uptime)}`;
  }

  // Disks
  const diskBars = document.getElementById('disk-bars');
  if (diskBars && data.disks) {
    diskBars.innerHTML = data.disks.map(disk => {
      const warnClass = disk.percent > 85 ? 'danger' : disk.percent > 70 ? 'warn' : '';
      return `
        <div class="disk-item">
          <div class="disk-label">
            <span>${disk.label}</span>
            <span>${disk.percent}%</span>
          </div>
          <div class="disk-bar">
            <div class="disk-bar-fill ${warnClass}" style="width: ${disk.percent}%"></div>
          </div>
        </div>
      `;
    }).join('');
  }
}

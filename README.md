# Crypt Dashboard

A sleek Docker management dashboard with real-time container monitoring, start/stop controls, and a compact mode.

![License](https://img.shields.io/github/license/DJ3vil/crypt-dashboard)

## Features

- **Real-time monitoring** — CPU, RAM, and network stats per container
- **Container controls** — Start, stop, restart directly from the dashboard
- **Compact mode** — Toggle between detailed cards and a minimal icon grid
- **13 themes** — Crypt, Arctic, Ember, Emerald, Neon, Synthwave, and more
- **Auto-discovery** — Reads Docker labels (`homepage.*`) to organize containers into groups
- **Per-container settings** — Override name, icon, URL, and restart policy via the UI
- **NPM integration** — Auto-detects Nginx Proxy Manager URLs (optional)
- **System metrics** — CPU, RAM, temperature, and disk usage overview
- **Search** — Filter containers with Ctrl+K
- **3D tilt effect** — Subtle card hover animations
- **Zero dependencies** — No frontend framework, pure vanilla JS

## Quick Start

```bash
git clone https://github.com/DJ3vil/crypt-dashboard.git
cd crypt-dashboard
docker compose up -d
```

Open **http://localhost:3080**

## Docker Labels

Crypt auto-discovers containers with `homepage.*` labels:

```yaml
labels:
  homepage.group: Media          # Group name
  homepage.name: Plex            # Display name
  homepage.icon: plex.png        # Icon from dashboard-icons or MDI
  homepage.href: http://ip:32400 # WebUI URL
  homepage.description: Media Server
```

Icons are loaded from [dashboard-icons](https://github.com/homarr-labs/dashboard-icons). Use the filename without extension (e.g., `plex`, `sonarr`) or MDI icons with `mdi-` prefix.

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `TZ` | Timezone | `UTC` |
| `PORT` | Internal port | `3000` |
| `SERVER_IP` | Server IP for generating URLs | auto-detect |
| `HOST_PROC` | Mounted `/proc` path for CPU/RAM stats | — |
| `HOST_SYS` | Mounted `/sys` path for disk stats | — |

### Optional Volumes

| Volume | Purpose |
|--------|---------|
| `/var/run/docker.sock` | **Required** — Docker API access |
| `/appdata` | Persist per-container settings |
| `/data/npm.sqlite` | Nginx Proxy Manager DB for auto-detecting proxy URLs |
| `/host/proc`, `/host/sys` | System metrics (CPU, RAM, temp) |
| `/mnt/diskN` | Disk usage monitoring |

### Themes

Switch themes via the dropdown in the header. Available: `crypt`, `3vil`, `arctic`, `ember`, `emerald`, `eyehurt`, `gold`, `midnight`, `neon`, `obsidian`, `phantom`, `rose`, `synthwave`.

## Compact Mode

Click the grid icon in the header to toggle compact mode:
- Icons with names and status dots
- Click to open WebUI
- Right-click for start/stop/restart context menu
- Setting persists across reloads

## Screenshots

*Coming soon*

## License

MIT

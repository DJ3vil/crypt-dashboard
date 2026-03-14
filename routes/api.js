const express = require('express');
const fs = require('fs');
const path = require('path');
const Dockerode = require('dockerode');
const { getContainers, startContainer, stopContainer, restartContainer } = require('../services/docker');
const { resolveUrl } = require('../services/npm-proxy');
const { getSystemInfo } = require('../services/system');
const { applyOverrides, getOverrides, setOverrides } = require('../services/settings');

const docker = new Dockerode({ socketPath: '/var/run/docker.sock' });
const router = express.Router();

router.use(express.json());

// GET /api/containers
router.get('/containers', async (req, res) => {
  try {
    const groups = await getContainers();

    for (const group of Object.values(groups)) {
      for (const c of group) {
        // Apply user overrides before URL resolution
        applyOverrides(c);
        const resolved = resolveUrl(c.href);
        c.url = resolved.url;
        c.fallbackUrl = resolved.fallbackUrl;
      }
    }

    res.json({ groups });
  } catch (err) {
    console.error('Error fetching containers:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/containers/:id/start
router.post('/containers/:id/start', async (req, res) => {
  try {
    await startContainer(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/containers/:id/stop
router.post('/containers/:id/stop', async (req, res) => {
  try {
    await stopContainer(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/containers/:id/restart
router.post('/containers/:id/restart', async (req, res) => {
  try {
    await restartContainer(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/containers/:id/settings — Get current settings + restart policy
router.get('/containers/:id/settings', async (req, res) => {
  try {
    const container = docker.getContainer(req.params.id);
    const info = await container.inspect();
    const name = info.Name.replace(/^\//, '');
    const overrides = getOverrides(name);
    const restartPolicy = info.HostConfig?.RestartPolicy?.Name || 'no';

    res.json({
      containerName: name,
      restartPolicy,
      overrides,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/containers/:id/settings — Save overrides + restart policy
router.put('/containers/:id/settings', async (req, res) => {
  try {
    const { name, icon, href, description, restartPolicy } = req.body;
    const container = docker.getContainer(req.params.id);
    const info = await container.inspect();
    const containerName = info.Name.replace(/^\//, '');

    // Save display overrides
    setOverrides(containerName, { name, icon, href, description });

    // Update Docker restart policy if changed
    if (restartPolicy) {
      const validPolicies = ['no', 'always', 'unless-stopped', 'on-failure'];
      if (validPolicies.includes(restartPolicy)) {
        await container.update({
          RestartPolicy: {
            Name: restartPolicy,
            MaximumRetryCount: restartPolicy === 'on-failure' ? 5 : 0,
          },
        });
      }
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/system
router.get('/system', (req, res) => {
  try {
    res.json(getSystemInfo());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/themes
router.get('/themes', (req, res) => {
  const themesDir = path.join(__dirname, '..', 'public', 'css', 'themes');
  try {
    const files = fs.readdirSync(themesDir)
      .filter(f => f.endsWith('.css'))
      .map(f => f.replace('.css', ''));
    res.json(files);
  } catch {
    res.json(['crypt']);
  }
});

module.exports = router;

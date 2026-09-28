import express from 'express';
import http from 'node:http';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { apiRouter } from './server/routes.js';
import { getDb } from './server/db.js';
import { seedSyntheticDataset } from './server/syntheticGenerator.js';
import { initRealtimeEngine } from './server/realtimeEngine.js';
import { ensureHmwQuestionsSeeded } from './server/hmwData.js';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Check and initialize SQLite dataset on startup
  try {
    const db = getDb();
    ensureHmwQuestionsSeeded();

    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    if (!userCount || userCount.count === 0) {
      console.log('Seeding initial 30-day synthetic telemetry dataset...');
      const stats = seedSyntheticDataset();
      console.log(`Seeded ${stats.usersCount} users, ${stats.eventsCount} events, ${stats.alertsCount} alerts.`);
    } else {
      console.log(`Database already populated with ${userCount.count} users.`);
    }
  } catch (err) {
    console.error('Error during database initialization:', err);
  }

  // API routes FIRST
  app.use('/api', apiRouter);
  app.use('/api/v1', (req, res, next) => {
    req.url = '/v1' + req.url;
    apiRouter(req, res, next);
  });

  // Serve static files from frontend/ for standalone dashboard.html and hmw.html
  const frontendDir = path.join(process.cwd(), 'frontend');
  app.use('/static', express.static(frontendDir));
  app.get('/dashboard.html', (req, res) => res.sendFile(path.join(frontendDir, 'dashboard.html')));
  app.get('/hmw.html', (req, res) => res.sendFile(path.join(frontendDir, 'hmw.html')));
  app.get('/styles.css', (req, res) => res.sendFile(path.join(frontendDir, 'styles.css')));
  app.get('/app.js', (req, res) => res.sendFile(path.join(frontendDir, 'app.js')));

  // Vite middleware for development or static serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Attach HTTP server & WebSocket server on /ws
  const httpServer = http.createServer(app);
  initRealtimeEngine(httpServer);

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`UEBA Sentinel server running at http://0.0.0.0:${PORT}`);
    console.log(`Real-Time WebSocket layer active on ws://0.0.0.0:${PORT}/ws`);
  });
}

startServer();

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import apiRouter from './server/routes/api.js';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { chatStore, isAdminEmail, conversationForUser } from './server/chat.js';
import { globalAuthStore } from './server/auth.js';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON and URL-encoded body parsers
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Security Headers
  app.use((req, res, next) => {
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // Mount API routes
  app.use('/api', apiRouter);

  // Clean short share routes: /s/:code and /share/:code redirect to /?code=:code
  app.get(['/s/:code', '/share/:code'], (req, res) => {
    const code = req.params.code;
    res.redirect(`/?code=${encodeURIComponent(code)}`);
  });

  // Vite middleware in dev, static files in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      // The Express server owns the HTTP listener, so Vite cannot handle the
      // WebSocket upgrade required by HMR in middleware mode. Disable HMR to
      // prevent the injected Vite client from opening a connection that can
      // never be upgraded by this server.
      server: {
        middlewareMode: true,
        hmr: false,
        watch: null,
      },
      appType: 'spa',
    });
    // This custom Express server intentionally disables Vite HMR. Prevent the
    // preview-injected client from opening a WebSocket that this server does
    // not own, which causes "WebSocket closed without opened" errors.
    app.get(['/@vite/client', '/@react-refresh'], (_req, res) => {
      res.type('application/javascript').send('');
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws/chat' });
  wss.on('connection', (socket, request) => {
    const token = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`).searchParams.get('token') || '';
    const user = globalAuthStore.getUserByToken(token);
    if (!user) { socket.close(1008, 'Authentication required'); return; }
    const canRead = (message: { conversationId: string }) => isAdminEmail(user.email) || message.conversationId === conversationForUser(user.id);
    const unsubscribe = chatStore.subscribe((message) => {
      if (canRead(message) && socket.readyState === 1) socket.send(JSON.stringify({ type: 'chat.message', message }));
    });
    socket.on('close', unsubscribe);
  });
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[DROP CODE] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[DROP CODE] Failed to start server:', err);
  process.exit(1);
});

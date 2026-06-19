import { createServer } from 'http';
import next from 'next';
import { startAutomationScheduler } from './lib/automation-scheduler';

// Default to production unless explicitly running in development.
// This avoids Turbopack/dev chunk instability when the environment sets COZE_PROJECT_ENV.
const dev = process.env.NODE_ENV === 'development';
// Force webpack dev server to avoid Turbopack chunk 500 flakiness.
process.env.NEXT_DISABLE_TURBOPACK = process.env.NEXT_DISABLE_TURBOPACK || '1';
const hostname = process.env.HOSTNAME || process.env.HOST || '0.0.0.0';
const port = parseInt(process.env.PORT || '8002', 10);

// Create Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  startAutomationScheduler();

  const server = createServer(async (req, res) => {
    try {
      await handle(req, res);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('Internal server error');
    }
  });
  server.once('error', err => {
    console.error(err);
    process.exit(1);
  });
  server.listen(port, hostname, () => {
    console.log(
      `> Server listening at http://${hostname}:${port} as ${
        dev ? 'development' : 'production'
      }`,
    );
  });
});

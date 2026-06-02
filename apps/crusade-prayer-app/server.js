import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Proxy endpoint to bypass CORS during development
  app.all('/api/proxy', async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) {
      return res.status(400).json({ error: 'Missing url parameter' });
    }

    try {
      const fetchOptions = {
        method: req.method,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Mobile; rv:48.0) Gecko/48.0 Firefox/48.0 KAIOS/2.5',
          'Accept': '*/*',
        },
      };

      if (req.method === 'POST' || req.method === 'PUT') {
        fetchOptions.body = JSON.stringify(req.body);
        fetchOptions.headers['Content-Type'] = 'application/json';
      }

      const response = await fetch(targetUrl, fetchOptions);
      const buffer = await response.arrayBuffer();

      res.setHeader('Access-Control-Allow-Origin', '*');
      const contentType = response.headers.get('content-type');
      if (contentType) {
        res.setHeader('Content-Type', contentType);
      }

      res.status(response.status).send(Buffer.from(buffer));
    } catch (error) {
      console.error('Proxy error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Serve static files from dist in production, otherwise use Vite middleware
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

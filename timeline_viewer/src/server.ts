import fs from 'fs';
import express from 'express';
import router from './lib/router';
import path from 'path';
import compression from 'compression';
import { createServer as createViteServer, ViteDevServer } from 'vite';
import assert from 'assert';

const isTest = process.env.NODE_ENV === 'test' || !!process.env.VITE_TEST_BUILD;

async function createServer(
  root = process.cwd(),
  isProd = process.env.NODE_ENV === 'production'
) {
  const resolve = (p: string) => path.resolve(__dirname, p);

  const app = express();

  // Middleware that parses json and looks at requests where the Content-Type header matches the type option.
  app.use(express.json());

  // Serve API requests from the router
  app.use('/api', router);

  // Serve storybook production bundle
  app.use('/storybook', express.static('dist/storybook'));

  let vite: ViteDevServer | undefined;

  if (!isProd) {
    vite = await createViteServer({
      root,
      logLevel: isTest ? 'error' : 'info',
      server: {
        middlewareMode: true,
        watch: {
          // During tests we edit the files too fast and sometimes chokidar
          // misses change events, so enforce polling for consistency
          usePolling: true,
          interval: 100,
        },
      },
    });

    // use vite's connect instance as middleware
    app.use(vite.middlewares);
  } else {
    app.use(compression());
    app.use(express.static('dist/timeline_viewer'));
  }

  const template = fs.readFileSync(resolve('index.html'), 'utf-8');

  app.use('*', async (req, res) => {
    try {
      let html = template;

      if (!isProd) {
        assert(vite);
        html = await vite.transformIndexHtml(req.url, html);
      }

      res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
    } catch (e) {
      if (e instanceof Error) {
        console.log(e.stack);
        res.status(500).end(e.stack);
      }
    }
  });

  return { app };
}

if (!isTest) {
  createServer().then(({ app }) =>
    app.listen(3000, () => {
      console.log('http://localhost:3000');
    })
  );
}

export { createServer };

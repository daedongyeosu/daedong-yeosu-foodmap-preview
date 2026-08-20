import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const root = path.resolve(process.cwd());
const port = Number(process.argv[2] || process.env.PORT || 4173);
const compressible = /^(?:text\/|application\/(?:javascript|json|manifest\+json|xml)|image\/svg\+xml)/;
const contentTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'application/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.mjs', 'application/javascript; charset=utf-8'],
  ['.svg', 'image/svg+xml; charset=utf-8'],
  ['.webmanifest', 'application/manifest+json; charset=utf-8'],
  ['.avif', 'image/avif'],
  ['.gif', 'image/gif'],
  ['.ico', 'image/x-icon'],
  ['.jpeg', 'image/jpeg'],
  ['.jpg', 'image/jpeg'],
  ['.png', 'image/png'],
  ['.webp', 'image/webp'],
  ['.woff2', 'font/woff2']
]);

const resolveRequestPath = (requestUrl = '/') => {
  const pathname = decodeURIComponent(new URL(requestUrl, 'http://127.0.0.1').pathname);
  const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const candidate = path.resolve(root, relative);
  if (candidate !== root && !candidate.startsWith(`${root}${path.sep}`)) return null;
  return candidate;
};

const server = http.createServer((request, response) => {
  if (!['GET', 'HEAD'].includes(request.method || '')) {
    response.writeHead(405, {'content-type': 'text/plain; charset=utf-8'});
    response.end('Method Not Allowed');
    return;
  }

  const filePath = resolveRequestPath(request.url);
  if (!filePath) {
    response.writeHead(403, {'content-type': 'text/plain; charset=utf-8'});
    response.end('Forbidden');
    return;
  }

  fs.stat(filePath, (statError, stats) => {
    if (statError || !stats.isFile()) {
      response.writeHead(404, {'content-type': 'text/plain; charset=utf-8'});
      response.end('Not Found');
      return;
    }

    const contentType = contentTypes.get(path.extname(filePath).toLowerCase()) || 'application/octet-stream';
    const acceptsBrotli = /(?:^|,)\s*br\s*(?:;|,|$)/i.test(request.headers['accept-encoding'] || '');
    const useBrotli = acceptsBrotli && compressible.test(contentType) && stats.size >= 1024;
    const headers = {
      'cache-control': 'no-store',
      'content-type': contentType,
      'vary': 'Accept-Encoding'
    };
    if (useBrotli) headers['content-encoding'] = 'br';
    else headers['content-length'] = String(stats.size);

    response.writeHead(200, headers);
    if (request.method === 'HEAD') {
      response.end();
      return;
    }

    const source = fs.createReadStream(filePath);
    source.on('error', () => response.destroy());
    if (useBrotli) {
      source.pipe(zlib.createBrotliCompress({
        params: {[zlib.constants.BROTLI_PARAM_QUALITY]: 5}
      })).pipe(response);
    } else {
      source.pipe(response);
    }
  });
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Performance fixture server listening on http://127.0.0.1:${port}`);
});

const stop = () => server.close(() => process.exit(0));
process.on('SIGINT', stop);
process.on('SIGTERM', stop);

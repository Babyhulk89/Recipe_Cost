import http from 'node:http';

const upstreamOrigin = 'https://recipecost-studio.hatchable.site';
const port = Number(process.env.PORT || 3000);

function rewriteCookie(cookie) {
  return cookie
    .replace(/;\s*Domain=[^;]+/gi, '')
    .replace(/;\s*SameSite=None/gi, '; SameSite=Lax');
}

const server = http.createServer(async (req, res) => {
  try {
    const target = new URL(req.url || '/', upstreamOrigin);
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (!value) continue;
      if (['host','content-length','connection'].includes(key.toLowerCase())) continue;
      headers.set(key, Array.isArray(value) ? value.join(', ') : value);
    }
    headers.set('x-forwarded-host', req.headers.host || '');
    headers.set('x-forwarded-proto', 'https');

    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = chunks.length ? Buffer.concat(chunks) : undefined;

    const upstream = await fetch(target, {
      method: req.method,
      headers,
      body: ['GET','HEAD'].includes(req.method || 'GET') ? undefined : body,
      redirect: 'manual'
    });

    res.statusCode = upstream.status;

    for (const [key, value] of upstream.headers) {
      const lower = key.toLowerCase();
      if (['content-length','content-encoding','transfer-encoding','connection','set-cookie','location'].includes(lower)) continue;
      res.setHeader(key, value);
    }

    const cookies = typeof upstream.headers.getSetCookie === 'function' ? upstream.headers.getSetCookie() : [];
    if (cookies.length) res.setHeader('set-cookie', cookies.map(rewriteCookie));

    const location = upstream.headers.get('location');
    if (location) {
      try {
        const loc = new URL(location, upstreamOrigin);
        if (loc.origin === upstreamOrigin) res.setHeader('location', loc.pathname + loc.search + loc.hash);
        else res.setHeader('location', location);
      } catch {
        res.setHeader('location', location);
      }
    }

    const contentType = upstream.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      let text = await upstream.text();
      text = text.replaceAll(upstreamOrigin, '');
      res.end(text);
    } else {
      const bytes = Buffer.from(await upstream.arrayBuffer());
      res.end(bytes);
    }
  } catch (error) {
    console.error('RecipeCost proxy error', error);
    res.statusCode = 502;
    res.setHeader('content-type', 'text/plain; charset=utf-8');
    res.end('RecipeCost is temporarily unavailable.');
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log('RecipeCost bridge listening on port', port);
});

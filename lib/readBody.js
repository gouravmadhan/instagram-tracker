export async function readJsonBody(req) {
  // Vercel's Node runtime sometimes pre-parses JSON bodies onto req.body,
  // and sometimes hands us the raw stream, depending on content-type/size.
  if (req.body && typeof req.body === 'object' && Object.keys(req.body).length) {
    return req.body;
  }
  if (typeof req.body === 'string' && req.body.length) {
    return JSON.parse(req.body);
  }
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

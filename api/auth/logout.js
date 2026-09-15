import { serialize } from 'cookie';
import { SESSION_COOKIE } from '../../lib/session.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  res.setHeader('Set-Cookie', serialize(SESSION_COOKIE, '', { maxAge: 0, path: '/' }));
  res.status(200).json({ ok: true });
}

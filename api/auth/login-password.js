import { serialize } from 'cookie';
import { getDb } from '../../lib/db.js';
import { verifyPassword } from '../../lib/password.js';
import { createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from '../../lib/session.js';
import { readJsonBody } from '../../lib/readBody.js';

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const body = await readJsonBody(req);
    const email = normalizeEmail(body.email);
    const password = String(body.password || '');

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const db = await getDb();
    const users = db.collection('users');
    const account = await users.findOne({ email });

    if (!account) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }
    if (!account.passwordHash) {
      res.status(401).json({ error: 'This account uses Google sign-in — use "Continue with Google" instead.' });
      return;
    }

    // Same generic message for a wrong password as for a missing account,
    // so failed attempts can't be used to probe which emails have
    // accounts.
    const valid = await verifyPassword(password, account.passwordHash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    await users.updateOne({ _id: account._id }, { $set: { lastLoginAt: new Date() } });

    const user = {
      id: account._id,
      email: account.email,
      name: account.name,
      picture: account.picture || '',
    };
    const token = createSessionToken(user);
    res.setHeader(
      'Set-Cookie',
      serialize(SESSION_COOKIE, token, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: SESSION_MAX_AGE_SECONDS,
        path: '/',
      })
    );
    res.status(200).json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Sign in failed' });
  }
}

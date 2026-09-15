import crypto from 'crypto';
import { serialize } from 'cookie';
import { getDb } from '../../lib/db.js';
import { hashPassword } from '../../lib/password.js';
import { createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from '../../lib/session.js';
import { readJsonBody } from '../../lib/readBody.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
    const name = String(body.name || '').trim() || email.split('@')[0];

    if (!email || !EMAIL_RE.test(email)) {
      res.status(400).json({ error: 'Enter a valid email address' });
      return;
    }
    if (password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters' });
      return;
    }

    const db = await getDb();
    const users = db.collection('users');

    const existing = await users.findOne({ email });
    if (existing) {
      if (existing.passwordHash) {
        res.status(409).json({ error: 'An account with this email already exists — try signing in instead.' });
      } else {
        res
          .status(409)
          .json({ error: 'This email is already linked to a Google account — use "Continue with Google" to sign in.' });
      }
      return;
    }

    // Prefixed so these ids can never collide with a Google `sub`, keeping
    // the two auth methods' internal ids distinct even though they now
    // share one account per email.
    const id = `local:${crypto.randomUUID()}`;
    const passwordHash = await hashPassword(password);
    const now = new Date();

    await users.insertOne({
      _id: id,
      email,
      name,
      picture: '',
      passwordHash,
      providers: ['local'],
      createdAt: now,
      lastLoginAt: now,
    });

    const user = { id, email, name, picture: '' };
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
    // In the narrow race where two signups for the same email land at once
    // and both pass the findOne check, the unique index (see lib/db.js)
    // makes the second insert fail here instead of creating a duplicate.
    if (err.code === 11000) {
      res.status(409).json({ error: 'An account with this email already exists — try signing in instead.' });
      return;
    }
    res.status(500).json({ error: err.message || 'Sign up failed' });
  }
}

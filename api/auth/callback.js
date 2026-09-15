import { parse, serialize } from 'cookie';
import { getDb } from '../../lib/db.js';
import { getOrigin } from '../../lib/origin.js';
import { createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from '../../lib/session.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const origin = getOrigin(req);
    const url = new URL(req.url, origin);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const oauthError = url.searchParams.get('error');
    const cookies = parse(req.headers.cookie || '');

    if (oauthError) {
      res.status(400).send(`Google sign-in was cancelled or failed: ${oauthError}`);
      return;
    }
    if (!code || !state || state !== cookies.oauth_state) {
      res.status(400).send('Invalid or expired sign-in attempt. Go back and try signing in again.');
      return;
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      res.status(500).send('GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are not set. See README for OAuth setup steps.');
      return;
    }

    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${origin}/api/auth/callback`;

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) {
      throw new Error(tokenData.error_description || tokenData.error || 'Token exchange failed');
    }

    const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await profileRes.json();
    if (!profileRes.ok) {
      throw new Error('Failed to fetch Google profile');
    }

    // Google's `sub` is the stable, unique account identifier — unlike
    // email, it never changes and isn't reused, so it's what we key data
    // on internally. Email is kept only for display.
    const user = {
      id: profile.sub,
      email: profile.email,
      name: profile.name || profile.email,
      picture: profile.picture || '',
    };

    const db = await getDb();
    await db.collection('users').updateOne(
      { _id: user.id },
      {
        $set: { email: user.email, name: user.name, picture: user.picture, lastLoginAt: new Date() },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    );

    const token = createSessionToken(user);

    res.setHeader('Set-Cookie', [
      serialize(SESSION_COOKIE, token, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: SESSION_MAX_AGE_SECONDS,
        path: '/',
      }),
      serialize('oauth_state', '', { maxAge: 0, path: '/' }),
    ]);

    res.writeHead(302, { Location: '/' });
    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).send(`Sign-in failed: ${err.message}`);
  }
}

import { serialize } from 'cookie';
import crypto from 'crypto';
import { getOrigin } from '../../lib/origin.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    res.status(500).send('GOOGLE_CLIENT_ID is not set. See README for OAuth setup steps.');
    return;
  }

  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${getOrigin(req)}/api/auth/callback`;
  const state = crypto.randomBytes(16).toString('hex');

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'online',
    prompt: 'select_account',
    state,
  });

  res.setHeader(
    'Set-Cookie',
    serialize('oauth_state', state, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 600,
      path: '/',
    })
  );

  res.writeHead(302, { Location: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` });
  res.end();
}

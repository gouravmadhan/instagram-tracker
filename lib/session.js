import jwt from 'jsonwebtoken';

export const SESSION_COOKIE = 'ft_session';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error(
      'SESSION_SECRET is not set. Add it in your Vercel project env vars (or .env for local dev) — any long random string works, e.g. `openssl rand -hex 32`.'
    );
  }
  return secret;
}

export function createSessionToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, name: user.name, picture: user.picture },
    getSecret(),
    { expiresIn: SESSION_MAX_AGE_SECONDS }
  );
}

export function verifySessionToken(token) {
  try {
    const payload = jwt.verify(token, getSecret());
    return { id: payload.sub, email: payload.email, name: payload.name, picture: payload.picture };
  } catch {
    return null;
  }
}

export { SESSION_MAX_AGE_SECONDS };

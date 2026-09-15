import { parse } from 'cookie';
import { SESSION_COOKIE, verifySessionToken } from './session.js';

export function getUserFromReq(req) {
  const cookies = parse(req.headers.cookie || '');
  const token = cookies[SESSION_COOKIE];
  if (!token) return null;
  return verifySessionToken(token);
}

/**
 * Call at the top of any protected API handler. Sends a 401 and returns
 * null if there's no valid session — the caller should just `return` in
 * that case.
 */
export function requireUser(req, res) {
  const user = getUserFromReq(req);
  if (!user) {
    res.status(401).json({ error: 'Not authenticated' });
    return null;
  }
  return user;
}

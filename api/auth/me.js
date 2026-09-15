import { getUserFromReq } from '../../lib/requireUser.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const user = getUserFromReq(req);
  res.status(200).json({ user });
}

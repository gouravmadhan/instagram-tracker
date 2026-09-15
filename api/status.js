import { getDb } from '../lib/db.js';
import { computeLiveAnalysis } from '../lib/computeAnalysis.js';
import { requireUser } from '../lib/requireUser.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const user = requireUser(req, res);
  if (!user) return;

  try {
    const db = await getDb();
    const result = await computeLiveAnalysis(db, user.id);
    res.status(200).json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Failed to load status' });
  }
}

import { getDb } from '../lib/db.js';
import { computeLiveAnalysis } from '../lib/computeAnalysis.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const db = await getDb();
    const result = await computeLiveAnalysis(db);
    res.status(200).json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Failed to load status' });
  }
}

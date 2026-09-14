import { getDb } from '../lib/db.js';
import { parseInstagramZip } from '../lib/parseInstagramZip.js';
import { computeLiveAnalysis } from '../lib/computeAnalysis.js';
import { readJsonBody } from '../lib/readBody.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const body = await readJsonBody(req);
    const { zipBase64 } = body;
    if (!zipBase64) {
      res.status(400).json({ error: 'zipBase64 is required' });
      return;
    }

    const buffer = Buffer.from(zipBase64, 'base64');
    const { followers, following, pending } = await parseInstagramZip(buffer);

    const db = await getDb();
    const snapshots = db.collection('snapshots');
    const now = new Date();

    // Full replace, not a merge: "current" always reflects exactly what was
    // just uploaded, nothing carried over from before.
    await Promise.all([
      snapshots.updateOne(
        { _id: 'followers_current' },
        { $set: { map: followers, usernames: Object.keys(followers), updatedAt: now } },
        { upsert: true }
      ),
      snapshots.updateOne(
        { _id: 'following_current' },
        { $set: { map: following, usernames: Object.keys(following), updatedAt: now } },
        { upsert: true }
      ),
      snapshots.updateOne(
        { _id: 'pending_current' },
        { $set: { map: pending, usernames: Object.keys(pending), updatedAt: now } },
        { upsert: true }
      ),
    ]);

    // Compute fresh rather than caching, so the result already reflects the
    // current allowed/disabled/allowed-pending lists.
    const result = await computeLiveAnalysis(db);
    res.status(200).json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Upload failed' });
  }
}

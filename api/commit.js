import { getDb } from '../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const db = await getDb();
    const snapshots = db.collection('snapshots');

    const [currentFollowers, currentFollowing] = await Promise.all([
      snapshots.findOne({ _id: 'followers_current' }),
      snapshots.findOne({ _id: 'following_current' }),
    ]);

    if (!currentFollowers || !currentFollowing) {
      res.status(400).json({ error: 'No current data yet — upload a zip first.' });
      return;
    }

    const now = new Date();
    await Promise.all([
      snapshots.updateOne(
        { _id: 'followers_previous' },
        {
          $set: {
            map: currentFollowers.map,
            usernames: currentFollowers.usernames,
            updatedAt: now,
          },
        },
        { upsert: true }
      ),
      snapshots.updateOne(
        { _id: 'following_previous' },
        {
          $set: {
            map: currentFollowing.map,
            usernames: currentFollowing.usernames,
            updatedAt: now,
          },
        },
        { upsert: true }
      ),
    ]);

    res.status(200).json({ ok: true, committedAt: now });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Commit failed' });
  }
}

import { getDb } from '../lib/db.js';
import { requireUser } from '../lib/requireUser.js';
import { scopedId } from '../lib/scopedId.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const user = requireUser(req, res);
  if (!user) return;

  try {
    const db = await getDb();
    const snapshots = db.collection('snapshots');

    const [currentFollowers, currentFollowing] = await Promise.all([
      snapshots.findOne({ _id: scopedId(user.id, 'followers_current') }),
      snapshots.findOne({ _id: scopedId(user.id, 'following_current') }),
    ]);

    if (!currentFollowers || !currentFollowing) {
      res.status(400).json({ error: 'No current data yet — upload a zip first.' });
      return;
    }

    const now = new Date();
    await Promise.all([
      snapshots.updateOne(
        { _id: scopedId(user.id, 'followers_previous') },
        {
          $set: {
            userId: user.id,
            map: currentFollowers.map,
            usernames: currentFollowers.usernames,
            updatedAt: now,
          },
        },
        { upsert: true }
      ),
      snapshots.updateOne(
        { _id: scopedId(user.id, 'following_previous') },
        {
          $set: {
            userId: user.id,
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

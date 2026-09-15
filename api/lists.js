import { getDb } from '../lib/db.js';
import { readJsonBody } from '../lib/readBody.js';
import { parseUsernameList } from '../lib/parseUsernames.js';
import { requireUser } from '../lib/requireUser.js';
import { scopedId } from '../lib/scopedId.js';

const VALID_TYPES = ['allowed', 'disabled', 'allowed_pending'];

export default async function handler(req, res) {
  const user = requireUser(req, res);
  if (!user) return;

  try {
    const db = await getDb();
    const lists = db.collection('lists');

    if (req.method === 'GET') {
      const ids = VALID_TYPES.map((t) => scopedId(user.id, t));
      const docs = await lists.find({ _id: { $in: ids } }).toArray();
      const result = { allowed: [], disabled: [], allowed_pending: [] };
      for (const doc of docs) {
        if (doc.type) result[doc.type] = doc.usernames || [];
      }
      res.status(200).json(result);
      return;
    }

    if (req.method === 'POST' || req.method === 'DELETE') {
      const body = await readJsonBody(req);
      const { type, all } = body;

      if (!VALID_TYPES.includes(type)) {
        res.status(400).json({ error: `type must be one of ${VALID_TYPES.join(', ')}` });
        return;
      }

      const id = scopedId(user.id, type);

      // Clear the whole list in one go.
      if (req.method === 'DELETE' && all) {
        await lists.updateOne(
          { _id: id },
          { $set: { usernames: [], userId: user.id, type } },
          { upsert: true }
        );
        res.status(200).json({ type, usernames: [] });
        return;
      }

      // Accepts a single `username`, or `usernames` as an array or a
      // comma/newline/space separated blob of many — either way we parse
      // and clean it into a deduped list.
      const raw = body.usernames ?? body.username;
      if (!raw) {
        res.status(400).json({ error: 'username(s) are required' });
        return;
      }

      const cleaned = parseUsernameList(raw);
      if (cleaned.length === 0) {
        res.status(400).json({ error: 'No valid usernames found in input' });
        return;
      }

      if (req.method === 'POST') {
        await lists.updateOne(
          { _id: id },
          {
            $addToSet: { usernames: { $each: cleaned } },
            $set: { userId: user.id, type },
          },
          { upsert: true }
        );
      } else {
        await lists.updateOne({ _id: id }, { $pull: { usernames: { $in: cleaned } } });
      }

      const doc = await lists.findOne({ _id: id });
      res.status(200).json({ type, usernames: doc?.usernames || [], processed: cleaned });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Request failed' });
  }
}

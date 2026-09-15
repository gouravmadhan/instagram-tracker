import { MongoClient } from 'mongodb';

const dbName = process.env.MONGODB_DB || 'instagram_tracker';

// Reuse the client + connection across warm serverless invocations instead
// of opening a new connection on every request.
let cachedPromise = globalThis._mongoClientPromise;
let indexesEnsured = globalThis._usersIndexesEnsured || false;

export async function getDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not set. Add it in your Vercel project env vars (or .env for local dev).');
  }
  if (!cachedPromise) {
    const client = new MongoClient(uri);
    cachedPromise = client.connect();
    globalThis._mongoClientPromise = cachedPromise;
  }
  const client = await cachedPromise;
  const db = client.db(dbName);

  // One document per email, regardless of how the account was created
  // (Google vs password) — this is what lets a Google login "find" an
  // existing password account with the same email instead of creating a
  // second, separate one.
  if (!indexesEnsured) {
    indexesEnsured = true;
    globalThis._usersIndexesEnsured = true;
    db.collection('users')
      .createIndex({ email: 1 }, { unique: true, name: 'uniq_email' })
      .catch((err) => console.error('Failed to ensure users email index:', err.message));
  }

  return db;
}

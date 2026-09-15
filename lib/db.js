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

  // Best-effort uniqueness backstop for email/password accounts (only
  // applies to docs with provider: 'local', so it never touches Google
  // accounts). The signup endpoint also checks for an existing account
  // itself, so this isn't the only thing preventing duplicates.
  if (!indexesEnsured) {
    indexesEnsured = true;
    globalThis._usersIndexesEnsured = true;
    db.collection('users')
      .createIndex(
        { email: 1 },
        { unique: true, partialFilterExpression: { provider: 'local' }, name: 'uniq_local_email' }
      )
      .catch((err) => console.error('Failed to ensure users email index:', err.message));
  }

  return db;
}

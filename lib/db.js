import { MongoClient } from 'mongodb';

const dbName = process.env.MONGODB_DB || 'instagram_tracker';

// Reuse the client + connection across warm serverless invocations instead
// of opening a new connection on every request.
let cachedPromise = globalThis._mongoClientPromise;

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
  return client.db(dbName);
}

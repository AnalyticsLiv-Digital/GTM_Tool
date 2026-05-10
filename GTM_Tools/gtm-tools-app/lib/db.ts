import bcrypt from 'bcryptjs';
import { MongoClient, Collection } from 'mongodb';

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
  var _mongoIndexesEnsured: boolean | undefined;
}

// Cache the connect() promise on globalThis in BOTH dev and prod. On Vercel
// each warm function instance reuses module-level state, so without this every
// API request would open a fresh MongoDB connection — fatal for Atlas M0's
// connection budget on the free tier.
function getClientPromise(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');
  if (!global._mongoClientPromise) {
    global._mongoClientPromise = new MongoClient(uri).connect();
  }
  return global._mongoClientPromise;
}

async function ensureIndexes(col: Collection<User>) {
  if (global._mongoIndexesEnsured) return;
  await Promise.all([
    col.createIndex({ email: 1 }, { unique: true }),
    col.createIndex({ googleId: 1 }, { sparse: true }),
    col.createIndex({ id: 1 }, { unique: true }),
  ]);
  global._mongoIndexesEnsured = true;
}

async function users(): Promise<Collection<User>> {
  const client = await getClientPromise();
  const dbName = process.env.MONGODB_DB || 'gtm_tools';
  const col = client.db(dbName).collection<User>('users');
  await ensureIndexes(col);
  return col;
}

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  googleId?: string;
  picture?: string;
  createdAt: string;
  failedLoginAttempts?: number;
  lockedUntil?: string;
  lastLoginAt?: string;
}

export async function getAllUsers(): Promise<User[]> {
  return (await users()).find({}, { projection: { _id: 0 } }).toArray();
}

export async function getUserByEmail(email: string): Promise<User | null> {
  return (await users()).findOne(
    { email: normalizeEmail(email) },
    { projection: { _id: 0 } }
  );
}

export async function getUserById(id: string): Promise<User | null> {
  return (await users()).findOne({ id }, { projection: { _id: 0 } });
}

export async function getUserByGoogleId(googleId: string): Promise<User | null> {
  return (await users()).findOne({ googleId }, { projection: { _id: 0 } });
}

export async function createUser(
  userData: Omit<User, 'id' | 'createdAt'>
): Promise<User> {
  const newUser: User = {
    ...userData,
    email: normalizeEmail(userData.email),
    id: `user_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
    createdAt: new Date().toISOString(),
  };
  await (await users()).insertOne(newUser);
  return newUser;
}

export async function updateUser(
  id: string,
  updates: Partial<User>
): Promise<User | null> {
  const col = await users();
  const sanitized = { ...updates };
  if (sanitized.email) sanitized.email = normalizeEmail(sanitized.email);
  const result = await col.findOneAndUpdate(
    { id },
    { $set: sanitized },
    { returnDocument: 'after', projection: { _id: 0 } }
  );
  return result ?? null;
}

export async function recordFailedLogin(id: string): Promise<User | null> {
  const col = await users();
  const LOCK_AFTER = 5;
  const LOCK_MINUTES = 15;
  const result = await col.findOneAndUpdate(
    { id },
    [
      {
        $set: {
          failedLoginAttempts: { $add: [{ $ifNull: ['$failedLoginAttempts', 0] }, 1] },
        },
      },
      {
        $set: {
          lockedUntil: {
            $cond: [
              { $gte: ['$failedLoginAttempts', LOCK_AFTER] },
              new Date(Date.now() + LOCK_MINUTES * 60 * 1000).toISOString(),
              '$lockedUntil',
            ],
          },
        },
      },
    ],
    { returnDocument: 'after', projection: { _id: 0 } }
  );
  return result ?? null;
}

export async function recordSuccessfulLogin(id: string): Promise<void> {
  const col = await users();
  await col.updateOne(
    { id },
    {
      $set: {
        failedLoginAttempts: 0,
        lockedUntil: undefined,
        lastLoginAt: new Date().toISOString(),
      },
    }
  );
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

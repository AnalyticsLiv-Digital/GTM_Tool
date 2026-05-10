import bcrypt from 'bcryptjs';
import { MongoClient, Collection } from 'mongodb';

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function getClientPromise(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');

  if (process.env.NODE_ENV === 'production') {
    return new MongoClient(uri).connect();
  }
  if (!global._mongoClientPromise) {
    global._mongoClientPromise = new MongoClient(uri).connect();
  }
  return global._mongoClientPromise;
}

async function users(): Promise<Collection<User>> {
  const client = await getClientPromise();
  const dbName = process.env.MONGODB_DB || 'gtm_tools';
  return client.db(dbName).collection<User>('users');
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  googleId?: string;
  picture?: string;
  createdAt: string;
}

export async function getAllUsers(): Promise<User[]> {
  return (await users()).find({}, { projection: { _id: 0 } }).toArray();
}

export async function getUserByEmail(email: string): Promise<User | null> {
  return (await users()).findOne({ email }, { projection: { _id: 0 } });
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
  const result = await col.findOneAndUpdate(
    { id },
    { $set: updates },
    { returnDocument: 'after', projection: { _id: 0 } }
  );
  return result ?? null;
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

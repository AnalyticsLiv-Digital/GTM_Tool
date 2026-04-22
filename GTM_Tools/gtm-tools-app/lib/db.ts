/* eslint-disable @typescript-eslint/no-unused-vars */
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

// Database file paths
const DATA_DIR = path.join(process.cwd(), '.data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize users file if it doesn't exist
if (!fs.existsSync(USERS_FILE)) {
  fs.writeFileSync(USERS_FILE, JSON.stringify([], null, 2));
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

// Read all users
export function getAllUsers(): User[] {
  try {
    const data = fs.readFileSync(USERS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

// Find user by email
export function getUserByEmail(email: string): User | null {
  const users = getAllUsers();
  return users.find((u) => u.email === email) || null;
}

// Find user by ID
export function getUserById(id: string): User | null {
  const users = getAllUsers();
  return users.find((u) => u.id === id) || null;
}

// Find user by Google ID
export function getUserByGoogleId(googleId: string): User | null {
  const users = getAllUsers();
  return users.find((u) => u.googleId === googleId) || null;
}

// Create new user
export function createUser(userData: Omit<User, 'id' | 'createdAt'>): User {
  const users = getAllUsers();
  
  const newUser: User = {
    ...userData,
    id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  
  return newUser;
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

// Verify password
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Update user
export function updateUser(id: string, updates: Partial<User>): User | null {
  const users = getAllUsers();
  const index = users.findIndex((u) => u.id === id);
  
  if (index === -1) return null;
  
  users[index] = { ...users[index], ...updates };
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  
  return users[index];
}

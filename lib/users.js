/**
 * Users table access. The bcrypt hash never leaves this module: every function
 * returns user objects WITHOUT `password`. Only authenticate() and
 * checkPassword() read the hash, and only to compare it.
 */
import bcrypt from 'bcryptjs';
import { sql } from './db';
import { badRequest, isValidId } from './api';
import { bumpContentVersion, cachedUser, forgetUser } from './cache';

const BCRYPT_ROUNDS = 12;

// Explicit allow-list of columns, so the hash can't be selected by accident.
const userColumns = () =>
  sql`id as _id, name, email, bio, avatar_url, email_verified, created_at, updated_at`;

function cleanName(name) {
  const trimmed = String(name ?? '').trim();
  if (!trimmed) throw badRequest('Name is required');
  if (trimmed.length > 60) throw badRequest('Name must be at most 60 characters');
  return trimmed;
}

export async function findUserById(id) {
  if (!isValidId(id)) return null;
  const [user] = await sql`select ${userColumns()} from users where id = ${id}`;
  return user || null;
}

/** findUserById through the Redis cache: runs on every authenticated request. */
export async function findUserByIdCached(id) {
  if (!isValidId(id)) return null;
  return cachedUser(id.toLowerCase(), () => findUserById(id));
}

export async function findUserByEmail(email) {
  const [user] = await sql`select ${userColumns()} from users where email = ${email}`;
  return user || null;
}

export async function createUser({ name, email, password, emailVerified = false }) {
  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const [user] = await sql`
    insert into users (name, email, password, email_verified)
    values (${cleanName(name)}, ${email}, ${hash}, ${emailVerified})
    returning ${userColumns()}`;
  return user;
}

/** Partial update of name / bio / avatarUrl / password / emailVerified. Returns the updated user. */
export async function updateUser(id, changes) {
  const set = {};
  if (changes.name !== undefined) set.name = cleanName(changes.name);
  if (changes.bio !== undefined) set.bio = changes.bio;
  if (changes.avatarUrl !== undefined) set.avatar_url = changes.avatarUrl;
  if (changes.emailVerified !== undefined) set.email_verified = changes.emailVerified;
  if (changes.password !== undefined) set.password = await bcrypt.hash(changes.password, BCRYPT_ROUNDS);
  if (!Object.keys(set).length) return findUserById(id);

  const [user] = await sql`
    update users set ${sql(set)}, updated_at = now()
    where id = ${id}
    returning ${userColumns()}`;
  await forgetUser(String(id).toLowerCase());
  // Name, bio and avatar appear in public pages (post authors, profiles).
  if (set.name !== undefined || set.bio !== undefined || set.avatar_url !== undefined) {
    await bumpContentVersion();
  }
  return user || null;
}

/** The user for this email + password, or null (same result for unknown email and wrong password). */
export async function authenticate(email, password) {
  const [row] = await sql`select ${userColumns()}, password from users where email = ${email}`;
  if (!row || !(await bcrypt.compare(password, row.password))) return null;
  const { password: _hash, ...user } = row;
  return user;
}

export async function checkPassword(id, password) {
  const [row] = await sql`select password from users where id = ${id}`;
  return Boolean(row) && bcrypt.compare(password, row.password);
}

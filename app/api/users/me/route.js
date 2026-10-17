import { badRequest, handler, json, readJson, validateUrl } from '@/lib/api';
import { publicUser, requireAuth } from '@/lib/auth';
import { checkPassword, updateUser } from '@/lib/users';

export const GET = handler(async (request) => {
  const user = await requireAuth(request);
  return json({ user: publicUser(user) });
});

// PUT /api/users/me — update name, bio, avatarUrl; optionally change password
export const PUT = handler(async (request) => {
  const user = await requireAuth(request);
  const body = await readJson(request);
  const changes = {};

  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || !body.name.trim()) throw badRequest('Name is required');
    changes.name = body.name.trim();
  }
  if (body.bio !== undefined) {
    if (typeof body.bio !== 'string') throw badRequest('Bio must be a string');
    if (body.bio.trim().length > 200) throw badRequest('Bio must be at most 200 characters');
    changes.bio = body.bio.trim();
  }
  if (body.avatarUrl !== undefined) changes.avatarUrl = validateUrl(body.avatarUrl, 'Avatar URL');

  if (body.newPassword !== undefined && body.newPassword !== '') {
    const { currentPassword, newPassword } = body;
    if (typeof newPassword !== 'string' || newPassword.length < 8 || newPassword.length > 72) {
      throw badRequest('New password must be 8–72 characters');
    }
    if (typeof currentPassword !== 'string' || !currentPassword) {
      throw badRequest('Current password is required to set a new password');
    }
    if (!(await checkPassword(user._id, currentPassword))) {
      throw badRequest('Current password is incorrect');
    }
    changes.password = newPassword; // bcrypt-hashed by updateUser
  }

  const updated = await updateUser(user._id, changes);
  return json({ user: publicUser(updated) });
});

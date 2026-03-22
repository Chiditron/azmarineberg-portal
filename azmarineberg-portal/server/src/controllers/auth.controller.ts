import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service.js';

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;
    const user = await authService.findUserByEmail(email);
    if (!user || !(await authService.verifyPassword(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      companyId: user.company_id,
    };
    const accessToken = authService.generateAccessToken(payload);
    const refreshToken = authService.generateRefreshToken(payload);
    const companyName =
      user.role === 'client' && user.company_id
        ? await authService.getCompanyName(user.company_id)
        : null;
    return res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        companyId: user.company_id,
        mustChangePassword: user.must_change_password,
        firstName: user.first_name ?? null,
        lastName: user.last_name ?? null,
        companyName,
      },
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 min in seconds
    });
  } catch (err) {
    next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  const { refreshToken } = req.body;
  let payload: ReturnType<typeof authService.verifyRefreshToken>;
  try {
    payload = authService.verifyRefreshToken(refreshToken);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
  try {
    const user = await authService.findUserById(payload.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    const newPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      companyId: user.company_id,
    };
    const accessToken = authService.generateAccessToken(newPayload);
    const newRefreshToken = authService.generateRefreshToken(newPayload);
    return res.json({
      accessToken,
      refreshToken: newRefreshToken,
      expiresIn: 900,
    });
  } catch (err) {
    next(err);
  }
}

export async function logout(_req: Request, res: Response) {
  // Stateless JWT - client discards tokens. Optional: maintain a blacklist in Redis.
  return res.json({ message: 'Logged out' });
}

export async function acceptInvite(req: Request, res: Response) {
  const { token } = req.query;
  const invite = await authService.validateInviteToken(token as string);
  if (!invite) {
    return res.status(400).json({ error: 'Invalid or expired invite link' });
  }
  return res.json({
    token,
    email: invite.email,
    message: 'Invite valid. Submit new password to complete setup.',
  });
}

export async function setPasswordFromInvite(req: Request, res: Response, next: NextFunction) {
  try {
    const { token, password } = req.body;
    const invite = await authService.validateInviteToken(token);
    if (!invite) {
      return res.status(400).json({ error: 'Invalid or expired invite link' });
    }
    await authService.setPassword(invite.user_id, password);
    await authService.markInviteTokenUsed(token);
    const user = await authService.findUserById(invite.user_id);
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      companyId: user.company_id,
    };
    const accessToken = authService.generateAccessToken(payload);
    const refreshToken = authService.generateRefreshToken(payload);
    const companyName =
      user.role === 'client' && user.company_id
        ? await authService.getCompanyName(user.company_id)
        : null;
    return res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        companyId: user.company_id,
        firstName: user.first_name ?? null,
        lastName: user.last_name ?? null,
        companyName,
      },
      accessToken,
      refreshToken,
      expiresIn: 900,
    });
  } catch (err) {
    next(err);
  }
}

export async function changePassword(req: Request, res: Response, next: NextFunction) {
  try {
    if (req.body.token) {
      return await setPasswordFromInvite(req, res, next);
    }
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const { currentPassword, newPassword } = req.body;
    const user = await authService.findUserByEmail(req.user.email);
    if (!user || !(await authService.verifyPassword(currentPassword, user.password_hash))) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    await authService.setPassword(req.user.userId, newPassword);
    return res.json({ message: 'Password updated successfully' });
  } catch (err) {
    next(err);
  }
}

import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth';

const prisma = new PrismaClient();

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { discordId, password } = req.body;

    if (!discordId || !password) {
      res.status(400).json({ success: false, error: 'Discord ID e senha são obrigatórios' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { discordId },
      include: {
        cityAccesses: {
          include: { city: { select: { id: true, name: true, slug: true, isActive: true } } }
        }
      }
    });

    if (!user || !user.isActive) {
      res.status(401).json({ success: false, error: 'Credenciais inválidas' });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({ success: false, error: 'Credenciais inválidas' });
      return;
    }

    const cityIds = user.cityAccesses.map(ca => ca.cityId);
    const cities = user.cityAccesses.map(ca => ca.city);

    const accessToken = jwt.sign(
      { userId: user.id, discordId: user.discordId, name: user.name, role: user.role, cityIds },
      process.env.JWT_SECRET as string,
      { expiresIn: (process.env.JWT_EXPIRE || '15m') as unknown as number }
    );

    const refreshToken = jwt.sign(
      { userId: user.id, discordId: user.discordId },
      process.env.REFRESH_TOKEN_SECRET as string,
      { expiresIn: (process.env.REFRESH_TOKEN_EXPIRE || '7d') as unknown as number }
    );

    res.json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          name: user.name,
          discordId: user.discordId,
          role: user.role,
          firstLogin: user.firstLogin,
          cities
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
};

export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      res.status(400).json({ success: false, error: 'Refresh token não fornecido' });
      return;
    }

    const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET!) as { userId: string };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { cityAccesses: true }
    });

    if (!user || !user.isActive) {
      res.status(401).json({ success: false, error: 'Usuário inválido' });
      return;
    }

    const cityIds = user.cityAccesses.map(ca => ca.cityId);

    const newAccessToken = jwt.sign(
      { userId: user.id, discordId: user.discordId, name: user.name, role: user.role, cityIds },
      process.env.JWT_SECRET as string,
      { expiresIn: (process.env.JWT_EXPIRE || '15m') as unknown as number }
    );

    res.json({ success: true, data: { accessToken: newAccessToken } });
  } catch {
    res.status(401).json({ success: false, error: 'Refresh token inválido ou expirado' });
  }
};

export const changePassword = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user!.userId;

    if (!currentPassword || !newPassword) {
      res.status(400).json({ success: false, error: 'Senha atual e nova senha são obrigatórias' });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ success: false, error: 'Nova senha deve ter no mínimo 6 caracteres' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ success: false, error: 'Usuário não encontrado' });
      return;
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      res.status(401).json({ success: false, error: 'Senha atual incorreta' });
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword, firstLogin: false }
    });

    res.json({ success: true, message: 'Senha alterada com sucesso' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
};

export const getMe = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      include: {
        cityAccesses: {
          include: { city: { select: { id: true, name: true, slug: true, isActive: true } } }
        }
      }
    });

    if (!user) {
      res.status(404).json({ success: false, error: 'Usuário não encontrado' });
      return;
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        discordId: user.discordId,
        email: user.email,
        role: user.role,
        firstLogin: user.firstLogin,
        cities: user.cityAccesses.map(ca => ca.city)
      }
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
};

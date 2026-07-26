import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { AuthenticatedRequest } from '../middleware/auth';

const prisma = new PrismaClient();

export const getUsers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true, name: true, discordId: true, email: true,
        role: true, isActive: true, firstLogin: true, createdAt: true,
        cityAccesses: {
          include: { city: { select: { id: true, name: true } } }
        }
      },
      orderBy: { name: 'asc' }
    });

    res.json({ success: true, data: users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ success: false, error: 'Erro ao buscar usuários' });
  }
};

export const createUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, discordId, email, role, cityIds, password } = req.body;

    if (!name || !discordId || !password) {
      res.status(400).json({ success: false, error: 'Nome, Discord ID e senha são obrigatórios' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        discordId,
        email,
        password: hashedPassword,
        role: role || 'OPERATOR',
        firstLogin: true,
        cityAccesses: cityIds && cityIds.length > 0 ? {
          create: cityIds.map((cityId: string) => ({ cityId }))
        } : undefined
      },
      include: {
        cityAccesses: {
          include: { city: { select: { id: true, name: true } } }
        }
      }
    });

    const { password: _, ...userWithoutPassword } = user as typeof user & { password: string };

    res.status(201).json({ success: true, data: userWithoutPassword, message: 'Usuário criado com sucesso' });
  } catch (error: unknown) {
    console.error('Create user error:', error);
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      res.status(409).json({ success: false, error: 'Discord ID ou email já cadastrado' });
      return;
    }
    res.status(500).json({ success: false, error: 'Erro ao criar usuário' });
  }
};

export const updateUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { name, email, role, isActive, cityIds, password } = req.body;

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (role !== undefined) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (password) updateData.password = await bcrypt.hash(password, 12);

    // Update city accesses
    if (cityIds !== undefined) {
      await prisma.userCityAccess.deleteMany({ where: { userId } });
      if (cityIds.length > 0) {
        await prisma.userCityAccess.createMany({
          data: cityIds.map((cityId: string) => ({ userId, cityId }))
        });
      }
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: {
        cityAccesses: { include: { city: { select: { id: true, name: true } } } }
      }
    });

    res.json({ success: true, data: user, message: 'Usuário atualizado com sucesso' });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ success: false, error: 'Erro ao atualizar usuário' });
  }
};

export const deleteUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    await prisma.user.update({ where: { id: userId }, data: { isActive: false } });
    res.json({ success: true, message: 'Usuário desativado com sucesso' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, error: 'Erro ao desativar usuário' });
  }
};

export const resetUserPassword = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
      res.status(400).json({ success: false, error: 'Nova senha é obrigatória' });
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword, firstLogin: true }
    });

    res.json({ success: true, message: 'Senha redefinida com sucesso' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, error: 'Erro ao redefinir senha' });
  }
};

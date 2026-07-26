import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth';

const prisma = new PrismaClient();

export const getEmployees = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const cityId = req.cityId!;
    const { page = '1', limit = '50', search } = req.query as Record<string, string>;

    const where: Record<string, unknown> = { cityId, isActive: true };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { discordId: { contains: search } },
        { cargo: { contains: search, mode: 'insensitive' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [employees, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        include: { _count: { select: { tasks: true, events: true } } },
        orderBy: { name: 'asc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.employee.count({ where })
    ]);

    res.json({
      success: true,
      data: { employees, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) } }
    });
  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({ success: false, error: 'Erro ao buscar funcionários' });
  }
};

export const getEmployeeById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const cityId = req.cityId!;
    const { employeeId } = req.params;

    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, cityId },
      include: {
        tasks: { orderBy: { createdAt: 'desc' }, take: 10 },
        events: { orderBy: { createdAt: 'desc' }, take: 10 },
        _count: { select: { tasks: true, events: true } }
      }
    });

    if (!employee) {
      res.status(404).json({ success: false, error: 'Funcionário não encontrado' });
      return;
    }

    res.json({ success: true, data: employee });
  } catch (error) {
    console.error('Get employee error:', error);
    res.status(500).json({ success: false, error: 'Erro ao buscar funcionário' });
  }
};

export const createEmployee = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const cityId = req.cityId!;
    const { name, discordId, cargo, funcao } = req.body;

    if (!name || !discordId || !cargo || !funcao) {
      res.status(400).json({ success: false, error: 'Nome, Discord ID, cargo e função são obrigatórios' });
      return;
    }

    const employee = await prisma.employee.create({
      data: { name, discordId, cargo, funcao, cityId }
    });

    res.status(201).json({ success: true, data: employee, message: 'Funcionário cadastrado com sucesso' });
  } catch (error: unknown) {
    console.error('Create employee error:', error);
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      res.status(409).json({ success: false, error: 'Este Discord ID já está cadastrado nesta cidade' });
      return;
    }
    res.status(500).json({ success: false, error: 'Erro ao cadastrar funcionário' });
  }
};

export const updateEmployee = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const cityId = req.cityId!;
    const { employeeId } = req.params;
    const { name, discordId, cargo, funcao, isActive } = req.body;

    const existing = await prisma.employee.findFirst({ where: { id: employeeId, cityId } });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Funcionário não encontrado' });
      return;
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (discordId !== undefined) updateData.discordId = discordId;
    if (cargo !== undefined) updateData.cargo = cargo;
    if (funcao !== undefined) updateData.funcao = funcao;
    if (isActive !== undefined) updateData.isActive = isActive;

    const employee = await prisma.employee.update({
      where: { id: employeeId },
      data: updateData
    });

    res.json({ success: true, data: employee, message: 'Funcionário atualizado com sucesso' });
  } catch (error) {
    console.error('Update employee error:', error);
    res.status(500).json({ success: false, error: 'Erro ao atualizar funcionário' });
  }
};

export const deleteEmployee = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const cityId = req.cityId!;
    const { employeeId } = req.params;

    const employee = await prisma.employee.findFirst({ where: { id: employeeId, cityId } });
    if (!employee) {
      res.status(404).json({ success: false, error: 'Funcionário não encontrado' });
      return;
    }

    // Hard delete — tasks e events vinculados são deletados em cascata (onDelete: Cascade no schema)
    await prisma.employee.delete({ where: { id: employeeId } });
    res.json({ success: true, message: 'Funcionário excluído com sucesso' });
  } catch (error) {
    console.error('Delete employee error:', error);
    res.status(500).json({ success: false, error: 'Erro ao excluir funcionário' });
  }
};

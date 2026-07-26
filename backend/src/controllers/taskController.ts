import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth';

const prisma = new PrismaClient();

export const getTasks = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const cityId = req.cityId!;
    const { status, employeeId, priority, page = '1', limit = '20' } = req.query as Record<string, string>;

    const where: Record<string, unknown> = { cityId };

    if (status) {
      // Filtro explícito por status (ex: ?status=COMPLETED ou ?status=CANCELLED)
      where.status = status;
    } else {
      // Sem filtro → registro geral mostra apenas PENDING e IN_PROGRESS
      where.status = { in: ['PENDING', 'IN_PROGRESS'] };
    }

    if (employeeId) where.employeeId = employeeId;
    if (priority) where.priority = priority;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        include: {
          employee: { select: { id: true, name: true, cargo: true, funcao: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.task.count({ where })
    ]);

    res.json({
      success: true,
      data: { tasks, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) } }
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ success: false, error: 'Erro ao buscar tasks' });
  }
};

export const getTaskById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const cityId = req.cityId!;
    const { taskId } = req.params;

    const task = await prisma.task.findFirst({
      where: { id: taskId, cityId }, // ⭐ Validação de isolamento
      include: {
        employee: { select: { id: true, name: true, cargo: true, funcao: true } }
      }
    });

    if (!task) {
      res.status(404).json({ success: false, error: 'Task não encontrada' });
      return;
    }

    res.json({ success: true, data: task });
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({ success: false, error: 'Erro ao buscar task' });
  }
};

export const createTask = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const cityId = req.cityId!;
    const { title, description, employeeId, dueDate, priority } = req.body;

    if (!title || !description || !employeeId || !dueDate) {
      res.status(400).json({ success: false, error: 'Título, descrição, funcionário e prazo são obrigatórios' });
      return;
    }

    // Verificar se o funcionário pertence à cidade
    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, cityId } // ⭐ Isolamento
    });

    if (!employee) {
      res.status(404).json({ success: false, error: 'Funcionário não encontrado nesta cidade' });
      return;
    }

    const task = await prisma.task.create({
      data: {
        title,
        description,
        employeeId,
        cityId,
        dueDate: new Date(dueDate),
        priority: priority || 'MEDIUM',
        createdById: req.user?.userId,
        // Snapshot preenchido na criação — garante exibição mesmo após exclusão do funcionário
        employeeSnapshot: employee.name,
        cargoSnapshot:    employee.cargo,
        funcaoSnapshot:   employee.funcao || ''
      },
      include: {
        employee: { select: { id: true, name: true, cargo: true } }
      }
    });

    res.status(201).json({ success: true, data: task, message: 'Task criada com sucesso' });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ success: false, error: 'Erro ao criar task' });
  }
};

export const updateTask = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const cityId = req.cityId!;
    const { taskId } = req.params;
    const { title, description, status, priority, dueDate, cancelReason } = req.body;

    // Verificar se a task pertence à cidade
    const existingTask = await prisma.task.findFirst({ where: { id: taskId, cityId } });
    if (!existingTask) {
      res.status(404).json({ success: false, error: 'Task não encontrada' });
      return;
    }

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (priority !== undefined) updateData.priority = priority;
    if (dueDate !== undefined) updateData.dueDate = new Date(dueDate);

    if (status !== undefined) {
      updateData.status = status;
      if (status === 'COMPLETED') updateData.completedAt = new Date();
      if (status === 'CANCELLED') {
        updateData.cancelledAt = new Date();
        updateData.cancelReason = cancelReason || 'Cancelado sem justificativa';
        updateData.cancelledBy = req.user?.name || 'Sistema';
      }
    }

    const task = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
      include: { employee: { select: { id: true, name: true, cargo: true } } }
    });

    res.json({ success: true, data: task, message: 'Task atualizada com sucesso' });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ success: false, error: 'Erro ao atualizar task' });
  }
};

export const deleteTask = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const cityId = req.cityId!;
    const { taskId } = req.params;

    const task = await prisma.task.findFirst({ where: { id: taskId, cityId } });
    if (!task) {
      res.status(404).json({ success: false, error: 'Task não encontrada' });
      return;
    }

    await prisma.task.delete({ where: { id: taskId } });
    res.json({ success: true, message: 'Task excluída com sucesso' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ success: false, error: 'Erro ao excluir task' });
  }
};

import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth';

const prisma = new PrismaClient();

export const getEvents = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const cityId = req.cityId!;
    const { employeeId, page = '1', limit = '20' } = req.query as Record<string, string>;

    const where: Record<string, unknown> = { cityId };
    if (employeeId) where.employeeId = employeeId;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        include: {
          employee: { select: { id: true, name: true, cargo: true, funcao: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.event.count({ where })
    ]);

    res.json({
      success: true,
      data: { events, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) } }
    });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ success: false, error: 'Erro ao buscar eventos' });
  }
};

export const createEvent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const cityId = req.cityId!;
    const { description, employeeId, cargo } = req.body;

    if (!description || !employeeId) {
      res.status(400).json({ success: false, error: 'Descrição e funcionário são obrigatórios' });
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

    // ⭐ Data/hora gerada pelo servidor (UTC-3), imutável após criação
    const event = await prisma.event.create({
      data: {
        description,
        employeeId,
        cityId,
        cargo: cargo || employee.cargo,
        createdById: req.user?.userId
      },
      include: {
        employee: { select: { id: true, name: true, cargo: true } }
      }
    });

    res.status(201).json({ success: true, data: event, message: 'Evento registrado com sucesso' });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ success: false, error: 'Erro ao criar evento' });
  }
};

export const deleteEvent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const cityId = req.cityId!;
    const { eventId } = req.params;

    const event = await prisma.event.findFirst({ where: { id: eventId, cityId } });
    if (!event) {
      res.status(404).json({ success: false, error: 'Evento não encontrado' });
      return;
    }

    await prisma.event.delete({ where: { id: eventId } });
    res.json({ success: true, message: 'Evento excluído com sucesso' });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ success: false, error: 'Erro ao excluir evento' });
  }
};

import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth';

const prisma = new PrismaClient();

// ─── GET /cities/:cityId/events ──────────────────────────────────────────────
export const getEvents = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const cityId = req.cityId!;
    const { employeeId, cargo, funcao, month, year, page = '1', limit = '20' } = req.query as Record<string, string>;

    const where: Record<string, unknown> = { cityId };
    if (employeeId) where.employeeId = employeeId;
    if (cargo)      where.cargo = { contains: cargo, mode: 'insensitive' };
    if (funcao)     where.funcao = { contains: funcao, mode: 'insensitive' };

    // Filtro por mês e/ou ano (baseado em createdAt)
    if (month || year) {
      const now = new Date();
      const y = year  ? parseInt(year)  : now.getFullYear();
      const m = month ? parseInt(month) : null; // 1-12

      if (m !== null) {
        // Mês + ano: intervalo exato do mês
        const start = new Date(y, m - 1, 1, 0, 0, 0, 0);
        const end   = new Date(y, m,     1, 0, 0, 0, 0); // primeiro dia do próximo mês
        where.createdAt = { gte: start, lt: end };
      } else {
        // Só ano: intervalo do ano inteiro
        const start = new Date(y,     0, 1, 0, 0, 0, 0);
        const end   = new Date(y + 1, 0, 1, 0, 0, 0, 0);
        where.createdAt = { gte: start, lt: end };
      }
    }

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
      data: {
        events,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ success: false, error: 'Erro ao buscar feedbacks' });
  }
};

// ─── POST /cities/:cityId/events ─────────────────────────────────────────────
// Accepts multipart/form-data (multer) or JSON
export const createEvent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const cityId = req.cityId!;
    const { description, employeeId, cargo, funcao, link } = req.body;

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

    // Processar imagens enviadas via multer
    const uploadedFiles = (req.files as Express.Multer.File[]) || [];
    const imageUrls = uploadedFiles.map(f => `/uploads/${f.filename}`);

    // ⭐ Data/hora gerada pelo servidor (UTC-3), imutável após criação
    const event = await prisma.event.create({
      data: {
        description,
        employeeId,
        cityId,
        cargo: cargo || employee.cargo,
        funcao: funcao || employee.funcao || '',
        link: link || null,
        images: imageUrls,
        createdById: req.user?.userId
      },
      include: {
        employee: { select: { id: true, name: true, cargo: true, funcao: true } }
      }
    });

    res.status(201).json({ success: true, data: event, message: 'Feedback registrado com sucesso' });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ success: false, error: 'Erro ao criar feedback' });
  }
};

// ─── PUT /cities/:cityId/events/:eventId ─────────────────────────────────────
export const updateEvent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const cityId = req.cityId!;
    const { eventId } = req.params;
    const { description, link } = req.body;

    const existing = await prisma.event.findFirst({ where: { id: eventId, cityId } });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Feedback não encontrado' });
      return;
    }

    // Processar novas imagens enviadas
    const uploadedFiles = (req.files as Express.Multer.File[]) || [];
    const newImageUrls = uploadedFiles.map(f => `/uploads/${f.filename}`);

    // Parse imagens mantidas (enviadas como JSON string no body)
    let keptImages: string[] = [];
    if (req.body.keptImages) {
      try {
        keptImages = JSON.parse(req.body.keptImages);
      } catch {
        keptImages = existing.images;
      }
    } else {
      // Se não veio keptImages, mantém todas as existentes
      keptImages = existing.images;
    }

    const allImages = [...keptImages, ...newImageUrls];

    const updated = await prisma.event.update({
      where: { id: eventId },
      data: {
        ...(description !== undefined && { description }),
        // Sempre atualiza link: string vazia ou undefined → null (remove o link)
        link: (link !== undefined) ? (link.trim() || null) : existing.link,
        images: allImages
      },
      include: {
        employee: { select: { id: true, name: true, cargo: true, funcao: true } }
      }
    });

    res.json({ success: true, data: updated, message: 'Feedback atualizado com sucesso' });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ success: false, error: 'Erro ao atualizar feedback' });
  }
};

// ─── DELETE /cities/:cityId/events/:eventId ──────────────────────────────────
export const deleteEvent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const cityId = req.cityId!;
    const { eventId } = req.params;

    const event = await prisma.event.findFirst({ where: { id: eventId, cityId } });
    if (!event) {
      res.status(404).json({ success: false, error: 'Feedback não encontrado' });
      return;
    }

    await prisma.event.delete({ where: { id: eventId } });
    res.json({ success: true, message: 'Feedback excluído com sucesso' });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ success: false, error: 'Erro ao excluir feedback' });
  }
};

// ─── GET /cities/:cityId/events/filter-options ───────────────────────────────
// Retorna valores únicos de cargo e funcao — combinando eventos existentes
// com employees ativos (para que novos registros também apareçam como opção)
export const getEventFilterOptions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const cityId = req.cityId!;

    // Valores que já existem em eventos gravados
    const existingEvents = await prisma.event.findMany({
      where: { cityId },
      select: { cargo: true, funcao: true }
    });

    // Valores dos employees ativos (para opções futuras)
    const employees = await prisma.employee.findMany({
      where: { cityId, isActive: true },
      select: { cargo: true, funcao: true }
    });

    // União: garante que filtramos apenas valores não-vazios
    const allCargos = [
      ...existingEvents.map(e => e.cargo),
      ...employees.map(e => e.cargo)
    ];
    const allFuncoes = [
      ...existingEvents.map(e => e.funcao),
      ...employees.map(e => e.funcao)
    ];

    const cargos = [...new Set(allCargos.filter(v => v && v.trim() !== ''))].sort();
    const funcoes = [...new Set(allFuncoes.filter(v => v && v.trim() !== ''))].sort();

    res.json({ success: true, data: { cargos, funcoes } });
  } catch (error) {
    console.error('Get filter options error:', error);
    res.status(500).json({ success: false, error: 'Erro ao buscar opções de filtro' });
  }
};

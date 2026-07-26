import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth';
import { uploadFilesToCloudinary } from '../utils/cloudinaryUpload';

const prisma = new PrismaClient();

// ─── GET /cities/:cityId/events ──────────────────────────────────────────────
export const getEvents = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const cityId = req.cityId!;
    const { employeeId, cargo, funcao, tipo, month, year, page = '1', limit = '20' } = req.query as Record<string, string>;

    const where: Record<string, unknown> = { cityId };
    if (employeeId) where.employeeId = employeeId;
    if (cargo)      where.cargo  = { contains: cargo,  mode: 'insensitive' };
    if (funcao)     where.funcao = { contains: funcao, mode: 'insensitive' };
    if (tipo && (tipo === 'POSITIVE' || tipo === 'NEGATIVE')) where.tipo = tipo;

    // Filtro por mês e/ou ano (baseado em createdAt)
    if (month || year) {
      const now = new Date();
      const y = year  ? parseInt(year)  : now.getFullYear();
      const m = month ? parseInt(month) : null;

      if (m !== null) {
        const start = new Date(y, m - 1, 1, 0, 0, 0, 0);
        const end   = new Date(y, m,     1, 0, 0, 0, 0);
        where.createdAt = { gte: start, lt: end };
      } else {
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
        pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) }
      }
    });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ success: false, error: 'Erro ao buscar feedbacks' });
  }
};

// ─── POST /cities/:cityId/events ─────────────────────────────────────────────
export const createEvent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const cityId = req.cityId!;
    const { description, employeeId, cargo, funcao, link, tipo } = req.body;

    if (!description || !employeeId) {
      res.status(400).json({ success: false, error: 'Descrição e funcionário são obrigatórios' });
      return;
    }

    const employee = await prisma.employee.findFirst({ where: { id: employeeId, cityId } });
    if (!employee) {
      res.status(404).json({ success: false, error: 'Funcionário não encontrado nesta cidade' });
      return;
    }

    // Upload das imagens para o Cloudinary
    const uploadedFiles = (req.files as Express.Multer.File[]) || [];
    const imageDataUrls = await uploadFilesToCloudinary(uploadedFiles, 'eufogroup-tasks/events');

    const tipoFeedback = (tipo === 'NEGATIVE') ? 'NEGATIVE' : 'POSITIVE';

    const event = await prisma.event.create({
      data: {
        description,
        employeeId,
        cityId,
        tipo:             tipoFeedback,
        cargo:            cargo  || employee.cargo,
        funcao:           funcao || employee.funcao || '',
        link:             link?.trim() || null,
        images:           imageDataUrls,
        // Snapshot preenchido na criação
        employeeSnapshot: employee.name,
        cargoSnapshot:    employee.cargo,
        funcaoSnapshot:   employee.funcao,
        createdById:      req.user?.userId
      },
      include: {
        employee: { select: { id: true, name: true, cargo: true, funcao: true } }
      }
    });

    res.status(201).json({ success: true, data: event, message: 'Feedback registrado com sucesso' });
  } catch (error) {
    console.error('Create event error:', error);
    const msg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: msg });
  }
};

// ─── PUT /cities/:cityId/events/:eventId ─────────────────────────────────────
export const updateEvent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const cityId = req.cityId!;
    const { eventId } = req.params;
    const { description, link, tipo } = req.body;

    const existing = await prisma.event.findFirst({ where: { id: eventId, cityId } });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Feedback não encontrado' });
      return;
    }

    // Upload das novas imagens para o Cloudinary
    const uploadedFiles = (req.files as Express.Multer.File[]) || [];
    const newImageUrls = await uploadFilesToCloudinary(uploadedFiles, 'eufogroup-tasks/events');

    // Parse imagens mantidas
    let keptImages: string[] = [];
    if (req.body.keptImages) {
      try { keptImages = JSON.parse(req.body.keptImages); }
      catch { keptImages = existing.images; }
    } else {
      keptImages = existing.images;
    }

    const allImages = [...keptImages, ...newImageUrls];

    const updateData: Record<string, unknown> = {
      images: allImages,
      // link: string vazia → null (remove o link)
      link: (link !== undefined) ? (link.trim() || null) : existing.link
    };
    if (description !== undefined) updateData.description = description;
    if (tipo === 'POSITIVE' || tipo === 'NEGATIVE') updateData.tipo = tipo;

    const updated = await prisma.event.update({
      where: { id: eventId },
      data: updateData,
      include: {
        employee: { select: { id: true, name: true, cargo: true, funcao: true } }
      }
    });

    res.json({ success: true, data: updated, message: 'Feedback atualizado com sucesso' });
  } catch (error) {
    console.error('Update event error:', error);
    const msg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: msg });
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
export const getEventFilterOptions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const cityId = req.cityId!;

    const [existingEvents, employees] = await Promise.all([
      prisma.event.findMany({ where: { cityId }, select: { cargo: true, funcao: true } }),
      prisma.employee.findMany({ where: { cityId }, select: { cargo: true, funcao: true } })
    ]);

    const allCargos  = [...existingEvents.map(e => e.cargo),  ...employees.map(e => e.cargo)];
    const allFuncoes = [...existingEvents.map(e => e.funcao), ...employees.map(e => e.funcao)];

    const cargos  = [...new Set(allCargos.filter(v  => v && v.trim() !== ''))].sort();
    const funcoes = [...new Set(allFuncoes.filter(v => v && v.trim() !== ''))].sort();

    res.json({ success: true, data: { cargos, funcoes } });
  } catch (error) {
    console.error('Get filter options error:', error);
    res.status(500).json({ success: false, error: 'Erro ao buscar opções de filtro' });
  }
};

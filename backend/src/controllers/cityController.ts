import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth';
import { uploadFilesToCloudinary, deleteFromCloudinary, extractPublicId } from '../utils/cloudinaryUpload';

const prisma = new PrismaClient();

export const getCities = async (req: Request, res: Response): Promise<void> => {
  try {
    const cities = await prisma.city.findMany({
      where: { isActive: true },
      include: {
        backgroundImages: { orderBy: { order: 'asc' } },
        _count: { select: { employees: true, tasks: true } }
      },
      orderBy: { name: 'asc' }
    });

    res.json({ success: true, data: cities });
  } catch (error) {
    console.error('Get cities error:', error);
    res.status(500).json({ success: false, error: 'Erro ao buscar cidades' });
  }
};

export const getCityById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { cityId } = req.params;

    const city = await prisma.city.findUnique({
      where: { id: cityId },
      include: {
        backgroundImages: { orderBy: { order: 'asc' } },
        _count: { select: { employees: true, tasks: true, events: true } }
      }
    });

    if (!city) {
      res.status(404).json({ success: false, error: 'Cidade não encontrada' });
      return;
    }

    res.json({ success: true, data: city });
  } catch (error) {
    console.error('Get city error:', error);
    res.status(500).json({ success: false, error: 'Erro ao buscar cidade' });
  }
};

export const createCity = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, backgroundMode, carouselInterval } = req.body;

    if (!name) {
      res.status(400).json({ success: false, error: 'Nome da cidade é obrigatório' });
      return;
    }

    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    const city = await prisma.city.create({
      data: {
        name,
        slug,
        backgroundMode: backgroundMode || 'STATIC',
        carouselInterval: carouselInterval || 5
      }
    });

    res.status(201).json({ success: true, data: city, message: 'Cidade criada com sucesso' });
  } catch (error: unknown) {
    console.error('Create city error:', error);
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      res.status(409).json({ success: false, error: 'Já existe uma cidade com este nome' });
      return;
    }
    res.status(500).json({ success: false, error: 'Erro ao criar cidade' });
  }
};

export const updateCity = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { cityId } = req.params;
    const { name, backgroundMode, carouselInterval, isActive } = req.body;

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) {
      updateData.name = name;
      updateData.slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    }
    if (backgroundMode !== undefined) updateData.backgroundMode = backgroundMode;
    if (carouselInterval !== undefined) updateData.carouselInterval = carouselInterval;
    if (isActive !== undefined) updateData.isActive = isActive;

    const city = await prisma.city.update({
      where: { id: cityId },
      data: updateData
    });

    res.json({ success: true, data: city, message: 'Cidade atualizada com sucesso' });
  } catch (error) {
    console.error('Update city error:', error);
    res.status(500).json({ success: false, error: 'Erro ao atualizar cidade' });
  }
};

export const deleteCity = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { cityId } = req.params;

    await prisma.city.delete({ where: { id: cityId } });

    res.json({ success: true, message: 'Cidade excluída com sucesso' });
  } catch (error) {
    console.error('Delete city error:', error);
    res.status(500).json({ success: false, error: 'Erro ao excluir cidade' });
  }
};

export const uploadCityBackground = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { cityId } = req.params;
    const files = req.files as Express.Multer.File[];
    const file  = req.file  as Express.Multer.File;
    const uploadedFiles = files || (file ? [file] : []);

    if (!uploadedFiles || uploadedFiles.length === 0) {
      res.status(400).json({ success: false, error: 'Nenhum arquivo enviado' });
      return;
    }

    const city = await prisma.city.findUnique({ where: { id: cityId } });
    if (!city) {
      res.status(404).json({ success: false, error: 'Cidade não encontrada' });
      return;
    }

    // Deleta backgrounds antigos do Cloudinary e do banco
    const oldBgs = await prisma.cityBackground.findMany({ where: { cityId } });
    await Promise.all(
      oldBgs.map(bg => {
        const pid = extractPublicId(bg.imageUrl);
        return pid ? deleteFromCloudinary(pid) : Promise.resolve();
      })
    );
    await prisma.cityBackground.deleteMany({ where: { cityId } });

    // Faz upload para o Cloudinary e salva as URLs no banco
    const imageUrls = await uploadFilesToCloudinary(uploadedFiles, 'eufogroup-tasks/city-backgrounds');
    const backgrounds = await Promise.all(
      imageUrls.map((imageUrl, index) =>
        prisma.cityBackground.create({
          data: { cityId, imageUrl, order: index }
        })
      )
    );

    const bgMode = uploadedFiles.length > 1 ? 'CAROUSEL' : 'STATIC';
    await prisma.city.update({ where: { id: cityId }, data: { backgroundMode: bgMode as 'STATIC' | 'CAROUSEL' } });

    res.json({ success: true, data: backgrounds, message: 'Backgrounds atualizados com sucesso' });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Upload background error:', msg);
    res.status(500).json({ success: false, error: msg });
  }
};

export const deleteCityBackground = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { cityId, bgId } = req.params;

    const bg = await prisma.cityBackground.findFirst({ where: { id: bgId, cityId } });
    if (!bg) {
      res.status(404).json({ success: false, error: 'Background não encontrado' });
      return;
    }

    // Deleta do Cloudinary e do banco
    const pid = extractPublicId(bg.imageUrl);
    if (pid) await deleteFromCloudinary(pid);
    await prisma.cityBackground.delete({ where: { id: bgId } });

    const remaining = await prisma.cityBackground.count({ where: { cityId } });
    const newMode = remaining > 1 ? 'CAROUSEL' : 'STATIC';
    await prisma.city.update({ where: { id: cityId }, data: { backgroundMode: newMode as 'STATIC' | 'CAROUSEL' } });

    res.json({ success: true, message: 'Background removido com sucesso' });
  } catch (error) {
    console.error('Delete background error:', error);
    res.status(500).json({ success: false, error: 'Erro ao remover background' });
  }
};

export const getCityBackgrounds = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { cityId } = req.params;
    const backgrounds = await prisma.cityBackground.findMany({
      where: { cityId },
      orderBy: { order: 'asc' }
    });
    res.json({ success: true, data: backgrounds });
  } catch (error) {
    console.error('Get backgrounds error:', error);
    res.status(500).json({ success: false, error: 'Erro ao buscar backgrounds' });
  }
};

export const getDashboard = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const cityId = req.cityId!;

    const [totalTasks, pendingTasks, inProgressTasks, completedTasks, cancelledTasks, overdueTasks, recentEvents] = await Promise.all([
      prisma.task.count({ where: { cityId } }),
      prisma.task.count({ where: { cityId, status: 'PENDING' } }),
      prisma.task.count({ where: { cityId, status: 'IN_PROGRESS' } }),
      prisma.task.count({ where: { cityId, status: 'COMPLETED' } }),
      prisma.task.count({ where: { cityId, status: 'CANCELLED' } }),
      prisma.task.count({
        where: { cityId, status: { in: ['PENDING', 'IN_PROGRESS'] }, dueDate: { lt: new Date() } }
      }),
      prisma.event.findMany({
        where: { cityId },
        include: { employee: { select: { name: true, cargo: true } } },
        orderBy: { createdAt: 'desc' },
        take: 5
      })
    ]);

    const slaRate = totalTasks > 0 ? Math.round(((completedTasks) / (totalTasks - cancelledTasks || 1)) * 100) : 0;

    res.json({
      success: true,
      data: {
        stats: { totalTasks, pendingTasks, inProgressTasks, completedTasks, cancelledTasks, overdueTasks, slaRate },
        recentEvents
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ success: false, error: 'Erro ao buscar dados do dashboard' });
  }
};

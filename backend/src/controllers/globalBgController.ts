import { Response, Request } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();

// GET /api/global-backgrounds?scope=LOGIN|CITY_SELECT  (público)
export const getGlobalBackgrounds = async (req: Request, res: Response): Promise<void> => {
  try {
    const { scope } = req.query as { scope?: string };
    const where = scope ? { scope: scope as 'LOGIN' | 'CITY_SELECT' } : {};
    const backgrounds = await prisma.globalBackground.findMany({
      where,
      orderBy: { order: 'asc' }
    });
    res.json({ success: true, data: backgrounds });
  } catch (error) {
    console.error('Get global backgrounds error:', error);
    res.status(500).json({ success: false, error: 'Erro ao buscar backgrounds' });
  }
};

// POST /api/global-backgrounds  (admin)
// body: scope = LOGIN | CITY_SELECT
// files: images[]
export const uploadGlobalBackgrounds = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { scope, carouselInterval } = req.body;
    const files = req.files as Express.Multer.File[];
    const file = req.file as Express.Multer.File;
    const uploadedFiles = files || (file ? [file] : []);

    if (!scope || !['LOGIN', 'CITY_SELECT'].includes(scope)) {
      res.status(400).json({ success: false, error: 'scope deve ser LOGIN ou CITY_SELECT' });
      return;
    }

    if (!uploadedFiles || uploadedFiles.length === 0) {
      res.status(400).json({ success: false, error: 'Nenhum arquivo enviado' });
      return;
    }

    // Remove arquivos antigos do mesmo scope
    const old = await prisma.globalBackground.findMany({ where: { scope } });
    for (const bg of old) {
      const filePath = path.join(process.cwd(), 'uploads', path.basename(bg.imageUrl));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    await prisma.globalBackground.deleteMany({ where: { scope } });

    // Salva novos
    const created = await Promise.all(
      uploadedFiles.map((f, index) =>
        prisma.globalBackground.create({
          data: {
            scope,
            imageUrl: `/uploads/${f.filename}`,
            order: index
          }
        })
      )
    );

    res.json({ success: true, data: created, message: 'Backgrounds globais atualizados' });
  } catch (error) {
    console.error('Upload global backgrounds error:', error);
    res.status(500).json({ success: false, error: 'Erro ao fazer upload' });
  }
};

// DELETE /api/global-backgrounds/:bgId  (admin)
export const deleteGlobalBackground = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { bgId } = req.params;
    const bg = await prisma.globalBackground.findUnique({ where: { id: bgId } });
    if (!bg) {
      res.status(404).json({ success: false, error: 'Background não encontrado' });
      return;
    }

    const filePath = path.join(process.cwd(), 'uploads', path.basename(bg.imageUrl));
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await prisma.globalBackground.delete({ where: { id: bgId } });
    res.json({ success: true, message: 'Background removido' });
  } catch (error) {
    console.error('Delete global background error:', error);
    res.status(500).json({ success: false, error: 'Erro ao remover background' });
  }
};

import { Response, Request } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth';
import { uploadFilesToCloudinary, deleteFromCloudinary, extractPublicId } from '../utils/cloudinaryUpload';

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
    const { scope } = req.body;
    const files = req.files as Express.Multer.File[];
    const file  = req.file  as Express.Multer.File;
    const uploadedFiles = files || (file ? [file] : []);

    if (!scope || !['LOGIN', 'CITY_SELECT'].includes(scope)) {
      res.status(400).json({ success: false, error: 'scope deve ser LOGIN ou CITY_SELECT' });
      return;
    }
    if (!uploadedFiles || uploadedFiles.length === 0) {
      res.status(400).json({ success: false, error: 'Nenhum arquivo enviado' });
      return;
    }

    // Deleta backgrounds antigos do Cloudinary e do banco
    const oldBgs = await prisma.globalBackground.findMany({ where: { scope } });
    await Promise.all(
      oldBgs.map(bg => {
        const pid = extractPublicId(bg.imageUrl);
        return pid ? deleteFromCloudinary(pid) : Promise.resolve();
      })
    );
    await prisma.globalBackground.deleteMany({ where: { scope } });

    // Faz upload para o Cloudinary e salva as URLs
    const imageUrls = await uploadFilesToCloudinary(uploadedFiles, 'eufogroup-tasks/global-backgrounds');
    const created = await Promise.all(
      imageUrls.map((imageUrl, index) =>
        prisma.globalBackground.create({ data: { scope, imageUrl, order: index } })
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

    // Deleta do Cloudinary e do banco
    const pid = extractPublicId(bg.imageUrl);
    if (pid) await deleteFromCloudinary(pid);
    await prisma.globalBackground.delete({ where: { id: bgId } });
    res.json({ success: true, message: 'Background removido' });
  } catch (error) {
    console.error('Delete global background error:', error);
    res.status(500).json({ success: false, error: 'Erro ao remover background' });
  }
};

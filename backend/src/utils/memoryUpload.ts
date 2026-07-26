/**
 * memoryUpload.ts
 * Instância de multer compartilhada usando memoryStorage.
 * Imagens ficam em buffer (req.files[].buffer) — sem gravar em disco.
 */
import multer from 'multer';

const MAX_SIZE_MB = 8;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

const memoryUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    // Valida por MIME type (confiável) E por extensão (fallback)
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const allowedExts  = /\.(jpg|jpeg|png|gif|webp)$/i;

    if (allowedMimes.includes(file.mimetype) || allowedExts.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Apenas imagens são permitidas (JPG, PNG, GIF, WebP)'));
    }
  },
  limits: { fileSize: MAX_SIZE_BYTES }
});

export default memoryUpload;

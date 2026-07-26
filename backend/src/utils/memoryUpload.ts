/**
 * memoryUpload.ts
 * Instância de multer compartilhada usando memoryStorage.
 * Imagens ficam em buffer (req.files[].buffer) — sem gravar em disco.
 * Isso evita perda de imagens no filesystem efêmero do Railway.
 */
import multer from 'multer';

const memoryUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|webp)$/i;
    if (allowed.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Apenas imagens são permitidas (JPG, PNG, GIF, WebP)'));
    }
  },
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB
});

export default memoryUpload;

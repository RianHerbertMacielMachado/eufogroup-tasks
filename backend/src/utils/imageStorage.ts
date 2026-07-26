/**
 * imageStorage.ts
 * Converte arquivos Multer (buffer em memória) para Data URLs base64.
 * Isso persiste as imagens no PostgreSQL — sem dependência do filesystem do Railway.
 */

/**
 * Converte um buffer de arquivo para uma data URL base64.
 * Ex: "data:image/jpeg;base64,/9j/4AAQ..."
 */
export function bufferToDataUrl(file: Express.Multer.File): string {
  const mimeType = file.mimetype || 'image/jpeg';
  const base64 = file.buffer.toString('base64');
  return `data:${mimeType};base64,${base64}`;
}

/**
 * Converte um array de arquivos Multer para data URLs.
 */
export function filesToDataUrls(files: Express.Multer.File[]): string[] {
  return files.map(bufferToDataUrl);
}

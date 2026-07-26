/**
 * cloudinaryUpload.ts
 * Upload de imagens para o Cloudinary via API REST (sem SDK pesado).
 * Usa apenas fetch nativo do Node 18+ e crypto para gerar a assinatura SHA-1.
 *
 * Variáveis de ambiente necessárias (Railway):
 *   CLOUDINARY_CLOUD_NAME
 *   CLOUDINARY_API_KEY
 *   CLOUDINARY_API_SECRET
 */
import crypto from 'crypto';

function getCloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey    = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      'Cloudinary não configurado. Defina CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY e CLOUDINARY_API_SECRET no Railway.'
    );
  }
  return { cloudName, apiKey, apiSecret };
}

/** Gera assinatura SHA-1 para autenticar o upload */
function generateSignature(params: Record<string, string | number>, apiSecret: string): string {
  const sorted = Object.keys(params)
    .sort()
    .map(k => `${k}=${params[k]}`)
    .join('&');

  return crypto.createHash('sha1').update(sorted + apiSecret).digest('hex');
}

/**
 * Faz upload de um único arquivo (buffer) para o Cloudinary.
 * Retorna a URL segura (https) da imagem.
 *
 * GIFs animados são enviados como binário (Blob) para preservar a animação.
 * Outros formatos são enviados como data URI base64.
 */
export async function uploadBufferToCloudinary(
  buffer: Buffer,
  mimeType: string,
  folder = 'eufogroup-tasks'
): Promise<string> {
  const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();

  const isGif = mimeType === 'image/gif';

  const timestamp = Math.round(Date.now() / 1000).toString();

  // GIF: preserva animação forçando format=gif e sem transformações
  const params: Record<string, string | number> = isGif
    ? { folder, format: 'gif', timestamp }
    : { folder, timestamp };

  const signature = generateSignature(params, apiSecret);

  const formData = new FormData();
  formData.append('folder',    folder);
  formData.append('timestamp', timestamp);
  formData.append('api_key',   apiKey);
  formData.append('signature', signature);

  if (isGif) {
    // GIF animado: envia como Blob binário (data URI quebra a animação)
    formData.append('format', 'gif');
    const blob = new Blob([buffer], { type: 'image/gif' });
    formData.append('file', blob, 'upload.gif');
  } else {
    // Outros formatos: data URI base64 é suficiente
    const base64Data = buffer.toString('base64');
    formData.append('file', `data:${mimeType};base64,${base64Data}`);
  }

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: 'POST', body: formData }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Cloudinary upload falhou (${response.status}): ${err}`);
  }

  const result = await response.json() as { secure_url: string };
  return result.secure_url;
}

/**
 * Faz upload de múltiplos arquivos Multer para o Cloudinary em paralelo.
 * Retorna array de URLs seguras.
 */
export async function uploadFilesToCloudinary(
  files: Express.Multer.File[],
  folder = 'eufogroup-tasks'
): Promise<string[]> {
  return Promise.all(
    files.map(f => uploadBufferToCloudinary(f.buffer, f.mimetype, folder))
  );
}

/**
 * Deleta uma imagem do Cloudinary pelo public_id.
 * O public_id está no caminho da URL: .../eufogroup-tasks/abc123
 * Passe o caminho completo incluindo a pasta: "eufogroup-tasks/abc123"
 */
export async function deleteFromCloudinary(publicId: string): Promise<void> {
  const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();

  const timestamp = Math.round(Date.now() / 1000).toString();
  const params    = { public_id: publicId, timestamp };
  const signature = generateSignature(params, apiSecret);

  const formData = new FormData();
  formData.append('public_id', publicId);
  formData.append('timestamp', timestamp);
  formData.append('api_key',   apiKey);
  formData.append('signature', signature);

  await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`,
    { method: 'POST', body: formData }
  );
  // Erros de deleção são silenciosos — não devem bloquear fluxo principal
}

/**
 * Extrai o public_id de uma URL do Cloudinary.
 * Ex: https://res.cloudinary.com/cloud/image/upload/v123/eufogroup-tasks/abc.jpg
 *     → "eufogroup-tasks/abc"
 */
export function extractPublicId(url: string): string | null {
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.\w+)?$/);
  return match ? match[1] : null;
}

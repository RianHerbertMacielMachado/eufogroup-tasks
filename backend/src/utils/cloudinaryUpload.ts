/**
 * cloudinaryUpload.ts
 * Upload de imagens para o Cloudinary via HTTPS multipart (form-data).
 * Usa `form-data` + `https` nativo do Node — sem SDK.
 * Suporta JPG, PNG, WebP e GIF animado.
 *
 * Variáveis de ambiente necessárias (Railway):
 *   CLOUDINARY_CLOUD_NAME
 *   CLOUDINARY_API_KEY
 *   CLOUDINARY_API_SECRET
 */
import crypto   from 'crypto';
import https    from 'https';
import FormData from 'form-data';
import sharp    from 'sharp';

// Limite seguro abaixo do máximo do Cloudinary Free (10MB)
const CLOUDINARY_MAX_BYTES = 9 * 1024 * 1024; // 9MB
// Largura máxima para redimensionamento automático
const MAX_WIDTH_PX = 1920;

/**
 * Comprime/redimensiona o buffer antes do upload.
 * - GIF: redimensiona se > MAX_WIDTH_PX (mantém animação via gifsicle/libvips)
 * - JPG/PNG/WebP: redimensiona + recomprime se > CLOUDINARY_MAX_BYTES
 * Retorna { buffer, mimeType } prontos para upload.
 */
async function compressBuffer(
  buffer: Buffer,
  mimeType: string
): Promise<{ buffer: Buffer; mimeType: string }> {
  const isGif = mimeType === 'image/gif';

  try {
    if (isGif) {
      // GIF: apenas redimensiona se necessário (sharp processa todos os frames)
      const meta = await sharp(buffer, { animated: true }).metadata();
      const w = meta.width ?? 0;
      if (w > MAX_WIDTH_PX) {
        const compressed = await sharp(buffer, { animated: true })
          .resize({ width: MAX_WIDTH_PX, withoutEnlargement: true })
          .gif()
          .toBuffer();
        console.log(`[compress] GIF ${w}px→${MAX_WIDTH_PX}px ${buffer.length}b→${compressed.length}b`);
        return { buffer: compressed, mimeType: 'image/gif' };
      }
      // Dentro do tamanho — usa como está
      return { buffer, mimeType };
    }

    // JPG / PNG / WebP — só comprime se necessário
    if (buffer.length <= CLOUDINARY_MAX_BYTES) {
      return { buffer, mimeType };
    }

    // Redimensiona + converte para WebP (melhor compressão)
    const compressed = await sharp(buffer)
      .resize({ width: MAX_WIDTH_PX, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    console.log(`[compress] ${mimeType} ${buffer.length}b→${compressed.length}b (webp)`);
    return { buffer: compressed, mimeType: 'image/webp' };
  } catch (err) {
    // Se sharp falhar (ex: formato inesperado), usa buffer original
    console.warn('[compress] sharp falhou, usando buffer original:', err);
    return { buffer, mimeType };
  }
}

function getCloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey    = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      'Cloudinary não configurado. Defina CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY e CLOUDINARY_API_SECRET.'
    );
  }
  return { cloudName, apiKey, apiSecret };
}

/**
 * Gera assinatura SHA-1.
 * REGRA do Cloudinary: assinar apenas params que NÃO sejam: file, api_key, resource_type, cloud_name.
 */
function generateSignature(
  params: Record<string, string | number>,
  apiSecret: string
): string {
  const str = Object.keys(params)
    .sort()
    .map(k => `${k}=${params[k]}`)
    .join('&');

  return crypto.createHash('sha1').update(str + apiSecret).digest('hex');
}

/** POST multipart com form-data via https nativo */
function httpsPostForm(
  path: string,
  form: FormData
): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const headers = {
      ...form.getHeaders(),
      // sem Content-Length manual — form-data calcula internamente
    };

    const req = https.request(
      {
        hostname: 'api.cloudinary.com',
        path,
        method: 'POST',
        headers,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => {
          const rawBody = Buffer.concat(chunks).toString('utf8');

          let parsed: Record<string, unknown>;
          try {
            parsed = JSON.parse(rawBody);
          } catch {
            reject(new Error(`Cloudinary retornou resposta inválida (HTTP ${res.statusCode}): ${rawBody}`));
            return;
          }

          if ((res.statusCode ?? 0) >= 300) {
            const cloudErr = (parsed.error as { message?: string })?.message ?? rawBody;
            reject(new Error(`Cloudinary HTTP ${res.statusCode}: ${cloudErr}`));
            return;
          }

          resolve(parsed);
        });
      }
    );

    req.on('error', reject);
    form.pipe(req);
  });
}

/**
 * Faz upload de um único Buffer para o Cloudinary.
 * Retorna a URL segura (https://res.cloudinary.com/...).
 */
export async function uploadBufferToCloudinary(
  buffer: Buffer,
  mimeType: string,
  folder = 'eufogroup-tasks'
): Promise<string> {
  const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();

  // Comprime/redimensiona antes de enviar
  const { buffer: finalBuffer, mimeType: finalMime } = await compressBuffer(buffer, mimeType);

  const timestamp = Math.round(Date.now() / 1000).toString();

  // Apenas estes campos entram na assinatura (NÃO incluir file, api_key, resource_type)
  const signedParams: Record<string, string | number> = { folder, timestamp };
  const signature = generateSignature(signedParams, apiSecret);

  // Nome do arquivo com extensão correta
  const extMap: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg':  'jpg',
    'image/png':  'png',
    'image/gif':  'gif',
    'image/webp': 'webp',
  };
  const ext      = extMap[finalMime] ?? 'jpg';
  const filename = `upload.${ext}`;

  const form = new FormData();
  form.append('file',      finalBuffer, { filename, contentType: finalMime });
  form.append('folder',    folder);
  form.append('timestamp', timestamp);
  form.append('api_key',   apiKey);
  form.append('signature', signature);

  console.log(`[Cloudinary] Upload: folder=${folder} mime=${finalMime} size=${finalBuffer.length}b`);

  const result = await httpsPostForm(`/v1_1/${cloudName}/image/upload`, form);

  const url = result.secure_url as string;
  console.log(`[Cloudinary] OK: ${url}`);
  return url;
}

/**
 * Faz upload de múltiplos arquivos Multer para o Cloudinary em paralelo.
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
 */
export async function deleteFromCloudinary(publicId: string): Promise<void> {
  try {
    const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();

    const timestamp = Math.round(Date.now() / 1000).toString();
    const params    = { public_id: publicId, timestamp };
    const signature = generateSignature(params, apiSecret);

    const form = new FormData();
    form.append('public_id', publicId);
    form.append('timestamp', timestamp);
    form.append('api_key',   apiKey);
    form.append('signature', signature);

    await httpsPostForm(`/v1_1/${cloudName}/image/destroy`, form);
  } catch (err) {
    console.warn('[Cloudinary] Delete silenciado:', err);
  }
}

/**
 * Extrai o public_id de uma URL do Cloudinary.
 * Ex: https://res.cloudinary.com/cloud/image/upload/v123/eufogroup-tasks/abc.gif
 *     → "eufogroup-tasks/abc"
 */
export function extractPublicId(url: string): string | null {
  try {
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.\w+)?$/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

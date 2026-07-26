/**
 * cloudinaryUpload.ts
 * Upload de imagens para o Cloudinary via HTTPS multipart (form-data).
 * Usa o pacote `form-data` + módulo `https` nativo do Node — sem SDK pesado.
 * Suporta JPG, PNG, WebP e GIF animado.
 *
 * Variáveis de ambiente necessárias (Railway):
 *   CLOUDINARY_CLOUD_NAME
 *   CLOUDINARY_API_KEY
 *   CLOUDINARY_API_SECRET
 */
import crypto from 'crypto';
import https  from 'https';
import FormData from 'form-data';

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

/** Gera assinatura SHA-1 — apenas parâmetros que vão no body (exceto file, api_key) */
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

/** Envia FormData via https nativo e retorna o body como string */
function httpsPost(hostname: string, path: string, form: FormData): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname,
        path,
        method: 'POST',
        headers: form.getHeaders(),
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf8');
          if ((res.statusCode ?? 0) >= 300) {
            reject(new Error(`Cloudinary upload falhou (${res.statusCode}): ${body}`));
          } else {
            resolve(body);
          }
        });
      }
    );
    req.on('error', reject);
    form.pipe(req);
  });
}

/**
 * Faz upload de um único Buffer para o Cloudinary.
 * GIF animado é enviado como binário — preserva todos os frames.
 * Retorna a URL segura (https://res.cloudinary.com/...).
 */
export async function uploadBufferToCloudinary(
  buffer: Buffer,
  mimeType: string,
  folder = 'eufogroup-tasks'
): Promise<string> {
  const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();

  const timestamp = Math.round(Date.now() / 1000).toString();

  // Parâmetros assinados (NÃO incluir: file, api_key, resource_type)
  const signedParams: Record<string, string | number> = { folder, timestamp };
  const signature = generateSignature(signedParams, apiSecret);

  // Extensão/nome de arquivo a partir do MIME type
  const extMap: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png':  'png',
    'image/gif':  'gif',
    'image/webp': 'webp',
  };
  const ext      = extMap[mimeType] ?? 'jpg';
  const filename = `upload.${ext}`;

  const form = new FormData();
  // O arquivo DEVE ser o primeiro campo para o Cloudinary
  form.append('file', buffer, { filename, contentType: mimeType });
  form.append('folder',    folder);
  form.append('timestamp', timestamp);
  form.append('api_key',   apiKey);
  form.append('signature', signature);

  const body = await httpsPost(
    'api.cloudinary.com',
    `/v1_1/${cloudName}/image/upload`,
    form
  );

  const result = JSON.parse(body) as { secure_url: string };
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
 */
export async function deleteFromCloudinary(publicId: string): Promise<void> {
  const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();

  const timestamp = Math.round(Date.now() / 1000).toString();
  const params    = { public_id: publicId, timestamp };
  const signature = generateSignature(params, apiSecret);

  const form = new FormData();
  form.append('public_id', publicId);
  form.append('timestamp', timestamp);
  form.append('api_key',   apiKey);
  form.append('signature', signature);

  try {
    await httpsPost('api.cloudinary.com', `/v1_1/${cloudName}/image/destroy`, form);
  } catch {
    // Erros de deleção são silenciosos — não devem bloquear o fluxo principal
  }
}

/**
 * Extrai o public_id de uma URL do Cloudinary.
 * Ex: https://res.cloudinary.com/cloud/image/upload/v123/eufogroup-tasks/abc.gif
 *     → "eufogroup-tasks/abc"
 */
export function extractPublicId(url: string): string | null {
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.\w+)?$/);
  return match ? match[1] : null;
}

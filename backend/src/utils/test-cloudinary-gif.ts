/**
 * test-cloudinary-gif.ts
 * Testa o upload de um GIF sintético para o Cloudinary.
 * Rode com: npx ts-node src/utils/test-cloudinary-gif.ts
 *
 * Precisa das vars CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET no ambiente.
 */
import crypto from 'crypto';
import https  from 'https';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

// ── Config ────────────────────────────────────────────────────────────────────
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey    = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (!cloudName || !apiKey || !apiSecret) {
  console.error('❌ Defina CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY e CLOUDINARY_API_SECRET');
  process.exit(1);
}

// ── GIF mínimo animado (2 frames, 1x1 px) ────────────────────────────────────
// GIF89a 1x1 com 2 frames — hex literal
const gifHex =
  '4749463839610100010080000000ff000000000021f90400000000002c' +
  '000000000100010000020144003b';
const gifBuffer = Buffer.from(gifHex, 'hex');

// ── Assinatura ────────────────────────────────────────────────────────────────
function sign(params: Record<string, string | number>, secret: string): string {
  const str = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&');
  return crypto.createHash('sha1').update(str + secret).digest('hex');
}

// ── HTTP POST com form-data ───────────────────────────────────────────────────
function post(hostname: string, path: string, form: FormData): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      { hostname, path, method: 'POST', headers: form.getHeaders() },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => {
          const body = Buffer.concat(chunks).toString();
          console.log(`\nHTTP ${res.statusCode}`);
          console.log(body);
          res.statusCode! >= 300 ? reject(new Error(body)) : resolve(body);
        });
      }
    );
    req.on('error', reject);
    form.pipe(req);
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  const folder    = 'eufogroup-tasks/test';
  const timestamp = Math.round(Date.now() / 1000).toString();
  const signed    = { folder, timestamp };
  const signature = sign(signed, apiSecret!);

  console.log('Params assinados:', signed);
  console.log('Signature:', signature);

  const form = new FormData();
  form.append('file',      gifBuffer, { filename: 'test.gif', contentType: 'image/gif' });
  form.append('folder',    folder);
  form.append('timestamp', timestamp);
  form.append('api_key',   apiKey!);
  form.append('signature', signature);

  try {
    const body = await post('api.cloudinary.com', `/v1_1/${cloudName}/image/upload`, form);
    const json = JSON.parse(body);
    console.log('\n✅ Upload OK:', json.secure_url);
  } catch (e) {
    console.error('\n❌ Upload falhou:', e);
  }
})();

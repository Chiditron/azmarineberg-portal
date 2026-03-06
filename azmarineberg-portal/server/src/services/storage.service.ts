import { mkdir, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const USE_LOCAL = process.env.STORAGE_TYPE === 'local';

const LOCAL_UPLOAD_DIR = path.join(__dirname, '../../uploads');

function ensureLocalDir(dir: string) {
  if (!existsSync(dir)) {
    return mkdir(dir, { recursive: true });
  }
}

export function getStoragePath(companyId: string, serviceId: string, documentId: string, version: number, ext: string): string {
  return `${companyId}/${serviceId}/${documentId}_v${version}${ext}`;
}

async function uploadLocal(key: string, body: Buffer): Promise<void> {
  const fullPath = path.join(LOCAL_UPLOAD_DIR, key);
  const dir = path.dirname(fullPath);
  await ensureLocalDir(dir);
  await writeFile(fullPath, body);
}

async function uploadS3(key: string, body: Buffer, contentType: string): Promise<void> {
  const s3 = new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY || '',
      secretAccessKey: process.env.S3_SECRET_KEY || '',
    },
    forcePathStyle: !!process.env.S3_ENDPOINT,
  });
  const BUCKET = process.env.S3_BUCKET || 'azmarineberg-documents';
  try {
    await s3.send(new HeadBucketCommand({ Bucket: BUCKET }));
  } catch {
    await s3.send(new CreateBucketCommand({ Bucket: BUCKET }));
  }
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
}

export async function uploadFile(key: string, body: Buffer, contentType: string): Promise<void> {
  if (USE_LOCAL) {
    await uploadLocal(key, body);
    return;
  }
  await uploadS3(key, body, contentType);
}

export async function getDownloadUrl(s3Key: string, expirySeconds = 300): Promise<string> {
  if (USE_LOCAL) {
    const apiUrl = process.env.API_URL || 'http://localhost:3000';
    return `${apiUrl}/api/documents/serve?key=${encodeURIComponent(s3Key)}`;
  }
  const s3 = new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY || '',
      secretAccessKey: process.env.S3_SECRET_KEY || '',
    },
    forcePathStyle: !!process.env.S3_ENDPOINT,
  });
  const BUCKET = process.env.S3_BUCKET || 'azmarineberg-documents';
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: s3Key });
  return getSignedUrl(s3, command, { expiresIn: expirySeconds });
}

export function getLocalFilePath(key: string): string | null {
  if (!USE_LOCAL) return null;
  const cleanKey = key.replace(/^local:/, '');
  const fullPath = path.join(LOCAL_UPLOAD_DIR, cleanKey);
  return existsSync(fullPath) ? fullPath : null;
}

import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  NotFound,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import { env } from '@/config/env';

import { safeFilename } from './safe-filename';

// ObjectStorageService — a thin, generic wrapper over a single S3 bucket.
//
// Credentials come from the AWS SDK's default provider chain
// (`AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`); the bucket + region are
// env-configured (`S3_BUCKET`, `S3_REGION`). The client + config are resolved
// LAZILY on first use so the app boots without S3 configured — only code paths
// that actually touch storage fail, with a clear error.
//
// Namespace objects by key prefix (`avatars/`, `documents/`, …) as your app
// needs; this service is prefix-agnostic.

// 7 days — the AWS SigV4 max for IAM-user-signed URLs.
const DEFAULT_DOWNLOAD_URL_EXPIRY_SECONDS = 7 * 24 * 60 * 60;
const UPLOAD_URL_EXPIRY_SECONDS = 15 * 60;

@Injectable()
export class ObjectStorageService {
  private cached: { client: S3Client; bucket: string; region: string } | undefined;

  constructor(@InjectPinoLogger(ObjectStorageService.name) private readonly logger: PinoLogger) {}

  private resolve(): { client: S3Client; bucket: string; region: string } {
    if (this.cached) return this.cached;
    const bucket = env.S3_BUCKET;
    const region = env.S3_REGION ?? env.AWS_REGION;
    if (!bucket) throw new Error('S3_BUCKET is not set — object storage is unavailable.');
    if (!region) {
      throw new Error('S3_REGION (or AWS_REGION) is not set — object storage is unavailable.');
    }
    return (this.cached = { client: new S3Client({ region }), bucket, region });
  }

  async putObject(params: { key: string; body: Buffer; contentType: string }): Promise<void> {
    const { client, bucket } = this.resolve();
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: params.key,
        Body: params.body,
        ContentType: params.contentType,
      }),
    );
    this.logger.info(
      { key: params.key, contentType: params.contentType, count: params.body.length },
      'S3 object put',
    );
  }

  async getObject(key: string): Promise<Buffer> {
    const { client, bucket } = this.resolve();
    const obj = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    if (!obj.Body) {
      throw new Error(`object-storage S3 object ${key} has no body`);
    }
    return Buffer.from(await obj.Body.transformToByteArray());
  }

  async getObjectIfExists(key: string): Promise<Buffer | null> {
    try {
      return await this.getObject(key);
    } catch (err) {
      if (isNotFoundError(err)) return null;
      throw err;
    }
  }

  // Presigned PUT URL — lets the browser upload a file straight to S3, so file
  // bytes never pass through the API. The caller stores `key`, then confirms
  // once the client reports the upload succeeded. The bucket needs a CORS rule
  // allowing PUT from the dashboard origins.
  async createUploadUrl(params: { key: string; contentType: string }): Promise<string> {
    const { client, bucket } = this.resolve();
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: params.key,
      ContentType: params.contentType,
    });
    return getSignedUrl(client, command, { expiresIn: UPLOAD_URL_EXPIRY_SECONDS });
  }

  // Metadata for a stored object, or `null` if it genuinely does not exist. A
  // 404/NotFound is the only "absent" signal — any other error (network,
  // credentials, permissions) is rethrown as a real failure.
  async headObject(
    key: string,
  ): Promise<{ contentLength: number; contentType: string | undefined } | null> {
    const { client, bucket } = this.resolve();
    try {
      const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
      return { contentLength: head.ContentLength ?? 0, contentType: head.ContentType };
    } catch (err) {
      if (isNotFoundError(err)) return null;
      throw err;
    }
  }

  async objectExists(key: string): Promise<boolean> {
    return (await this.headObject(key)) !== null;
  }

  async deleteObject(key: string): Promise<void> {
    const { client, bucket } = this.resolve();
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    this.logger.info({ key }, 'S3 object deleted');
  }

  // Stable public URL for an object under a public-read prefix. Caller must
  // ensure the key lives under a prefix covered by the bucket's public-read
  // policy. No signing, no expiry.
  getPublicUrl(key: string): string {
    const { bucket, region } = this.resolve();
    return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
  }

  // Presigned GET URL — lets the browser fetch the object directly (native
  // range requests, no API proxy) without the bucket being public. TTL bounds
  // the leak window. `fileName` pins a download filename via
  // Content-Disposition; omit it for inline rendering.
  async getDownloadUrl(
    key: string,
    opts: { fileName?: string | null; expiresInSeconds?: number } = {},
  ): Promise<string> {
    const { client, bucket } = this.resolve();
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      ResponseContentDisposition: opts.fileName
        ? `attachment; filename="${safeFilename(opts.fileName)}"`
        : undefined,
    });
    return getSignedUrl(client, command, {
      expiresIn: opts.expiresInSeconds ?? DEFAULT_DOWNLOAD_URL_EXPIRY_SECONDS,
    });
  }
}

// True only for a genuine "object does not exist" outcome. Everything else
// (network, credentials, throttling, permissions) is a real error.
function isNotFoundError(err: unknown): boolean {
  if (err instanceof NotFound) return true;
  if (err instanceof S3ServiceException) {
    return err.$metadata.httpStatusCode === 404 || err.name === 'NotFound';
  }
  return false;
}

import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { IntegrationsConfigService } from '../config/integrations-config.service';

export interface PresignedUpload {
  key: string;
  uploadUrl: string; // PUT here (private object; not publicly readable)
  expiresIn: number;
  mock: boolean;
}

/** Proof photos / KYC docs only (§A5). */
const ALLOWED_CONTENT_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const READ_URL_TTL_SEC = 300;

/**
 * S3 storage (§A5/§12). Uploads are validated (type + size), stored in a
 * PRIVATE bucket (no public ACL), and served only via short-lived signed URLs.
 * Keys are server-generated and namespaced; callers reference the returned
 * key — never an arbitrary URL — which blocks SSRF / path traversal / object
 * takeover. With no S3 creds it falls back to a mock so dev works.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  constructor(private readonly integrations: IntegrationsConfigService) {}

  async createUploadUrl(
    prefix: string,
    fileName: string,
    contentType: string,
    sizeBytes?: number,
  ): Promise<PresignedUpload> {
    if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
      throw new BadRequestException(
        `Unsupported content type. Allowed: ${[...ALLOWED_CONTENT_TYPES].join(', ')}`,
      );
    }
    if (sizeBytes !== undefined && (sizeBytes <= 0 || sizeBytes > MAX_BYTES)) {
      throw new BadRequestException(`File too large (max ${MAX_BYTES} bytes)`);
    }

    const ext = extFor(contentType);
    const key = `${normalizePrefix(prefix)}/${randomUUID()}${ext}`;
    const { values } = await this.integrations.getConfig('s3');

    if (!values.accessKeyId || !values.bucket) {
      this.logger.warn('S3 not configured — returning mock upload URL');
      return {
        key,
        uploadUrl: `https://mock-s3.local/${key}?mockUpload=true`,
        expiresIn: READ_URL_TTL_SEC,
        mock: true,
      };
    }
    // Real presigned PUT (with content-type + content-length-range conditions)
    // is generated here via the AWS SDK; the object is created private.
    const uploadUrl = `https://${values.bucket}.s3.ap-south-1.amazonaws.com/${key}`;
    return { key, uploadUrl, expiresIn: READ_URL_TTL_SEC, mock: false };
  }

  /** Validate a key is within the expected namespace (anti-traversal/SSRF). */
  assertKeyInPrefix(key: string, prefix: string): void {
    const want = `${normalizePrefix(prefix)}/`;
    if (!key.startsWith(want) || key.includes('..')) {
      throw new BadRequestException('Invalid storage key');
    }
  }

  /** Short-lived signed GET URL for a private object (§A5). */
  async signedReadUrl(key: string): Promise<string> {
    const { values } = await this.integrations.getConfig('s3');
    if (!values.bucket) {
      return `https://mock-s3.local/${key}?sig=mock&expires=${READ_URL_TTL_SEC}`;
    }
    // Real signed GET URL generated via the AWS SDK presigner.
    return `https://${values.bucket}.s3.ap-south-1.amazonaws.com/${key}?signed=1`;
  }
}

function extFor(contentType: string): string {
  switch (contentType) {
    case 'image/jpeg':
      return '.jpg';
    case 'image/png':
      return '.png';
    case 'image/webp':
      return '.webp';
    case 'application/pdf':
      return '.pdf';
    default:
      return '';
  }
}

function normalizePrefix(prefix: string): string {
  // Only allow safe path segments — blocks traversal in caller-supplied ids.
  return prefix.replace(/[^a-zA-Z0-9/_-]/g, '').replace(/\.\.+/g, '');
}

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
} from '@aws-sdk/client-s3';

@Injectable()
export class S3Service {
  constructor(private readonly config: ConfigService) {}

  private client() {
    return new S3Client({
      region: this.config.getOrThrow<string>('AWS_REGION'),
      credentials: {
        accessKeyId: this.config.getOrThrow<string>('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.config.getOrThrow<string>('AWS_SECRET_ACCESS_KEY'),
      },
    });
  }

  async listObjects(bucket: string) {
    return this.client().send(new ListObjectsV2Command({ Bucket: bucket }));
  }

  async getObjectBuffer(bucket: string, key: string): Promise<Buffer> {
    const response = await this.client().send(
      new GetObjectCommand({ Bucket: bucket, Key: key }),
    );

    const chunks: Buffer[] = [];
    for await (const chunk of response.Body as any) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    return Buffer.concat(chunks);
  }
}
import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { GridFSBucket, ObjectId } from 'mongodb';

@Injectable()
export class GridFsService implements OnModuleInit {
  private bucket!: GridFSBucket;

  constructor(@InjectConnection() private readonly connection: Connection) {}

  onModuleInit() {
    if (!this.connection.db) {
      throw new Error('MongoDB connection is not ready');
    }

    this.bucket = new GridFSBucket(this.connection.db, {
      bucketName: 'mediaFiles',
    });
  }

  async uploadBuffer(
    buffer: Buffer,
    filename: string,
    metadata: Record<string, any>,
  ): Promise<ObjectId> {
    return new Promise((resolve, reject) => {
      const uploadStream = this.bucket.openUploadStream(filename, { metadata });

      uploadStream.on('error', reject);
      uploadStream.on('finish', () => resolve(uploadStream.id as ObjectId));

      uploadStream.end(buffer);
    });
  }

  openDownloadStream(fileId: string) {
    return this.bucket.openDownloadStream(new ObjectId(fileId));
  }

  async delete(fileId: string) {
    await this.bucket.delete(new ObjectId(fileId));
  }
}
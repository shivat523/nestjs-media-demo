import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Readable } from 'node:stream';
import {
  Media,
  MediaDocument,
  MediaSource,
  MediaType,
} from './schemas/media.schema';
import { GridFsService } from '../storage/gridfs.service';
import { S3Service } from '../s3/s3.service';

@Injectable()
export class MediaService {
  constructor(
    @InjectModel(Media.name) private readonly mediaModel: Model<MediaDocument>,
    private readonly gridFsService: GridFsService,
    private readonly s3Service: S3Service,
  ) {}

  private detectMimeType(filename: string): string {
    const ext = filename.toLowerCase().split('.').pop();

    if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
    if (ext === 'png') return 'image/png';
    if (ext === 'gif') return 'image/gif';
    if (ext === 'mp3') return 'audio/mpeg';
    if (ext === 'wav') return 'audio/wav';
    if (ext === 'mp4') return 'video/mp4';
    if (ext === 'mov') return 'video/quicktime';

    return 'application/octet-stream';
  }

  private detectCategory(filename: string, mimeType?: string): MediaType {
    const mime = mimeType ?? this.detectMimeType(filename);

    if (mime.startsWith('image/')) return 'image';
    if (mime.startsWith('audio/')) return 'audio';
    return 'video';
  }

  async uploadFromHttp(file: Express.Multer.File) {
    return this.uploadFromBuffer({
      buffer: file.buffer,
      filename: file.originalname,
      originalName: file.originalname,
      mimeType: file.mimetype,
      category: this.detectCategory(file.originalname, file.mimetype),
      source: 'upload',
      size: file.size,
    });
  }

  async uploadFromBuffer(data: {
    buffer: Buffer;
    filename: string;
    originalName: string;
    mimeType: string;
    category: MediaType;
    source: MediaSource;
    size: number;
  }) {
    const gridFsFileId = await this.gridFsService.uploadBuffer(
      data.buffer,
      data.filename,
      {
        mimeType: data.mimeType,
        category: data.category,
        source: data.source,
      },
    );

    return this.mediaModel.create({
      filename: data.filename,
      originalName: data.originalName,
      mimeType: data.mimeType,
      category: data.category,
      source: data.source,
      size: data.size,
      gridFsFileId,
    });
  }

  async importFromS3(bucketName: string) {
    const result = await this.s3Service.listObjects(bucketName);
    const imported = [];

    for (const object of result.Contents || []) {
      if (!object.Key || object.Key.endsWith('/')) continue;

      const buffer = await this.s3Service.getObjectBuffer(bucketName, object.Key);
      const mimeType = this.detectMimeType(object.Key);
      const category = this.detectCategory(object.Key, mimeType);

      imported.push(
        await this.uploadFromBuffer({
          buffer,
          filename: object.Key,
          originalName: object.Key,
          mimeType,
          category,
          source: 's3',
          size: buffer.length,
        }),
      );
    }

    return {
      message: 'S3 import completed successfully',
      totalImported: imported.length,
      data: imported,
    };
  }

  findAll() {
    return this.mediaModel.find().sort({ createdAt: -1 });
  }

  findByType(category: string) {
    return this.mediaModel.find({ category }).sort({ createdAt: -1 });
  }

  searchByName(q: string) {
    return this.mediaModel.find({
      $or: [
        { filename: { $regex: q, $options: 'i' } },
        { originalName: { $regex: q, $options: 'i' } },
      ],
    });
  }

  async getById(id: string) {
    const media = await this.mediaModel.findById(id);
    if (!media) throw new NotFoundException('Media not found');
    return media;
  }

  async downloadById(id: string) {
    const media = await this.getById(id);
    const stream = this.gridFsService.openDownloadStream(
      media.gridFsFileId.toString(),
    );

    return { media, stream };
  }

  async stats() {
    const [images, audio, videos, totalFiles] = await Promise.all([
      this.mediaModel.countDocuments({ category: 'image' }),
      this.mediaModel.countDocuments({ category: 'audio' }),
      this.mediaModel.countDocuments({ category: 'video' }),
      this.mediaModel.countDocuments(),
    ]);

    return { totalFiles, images, audio, videos };
  }

  async deleteById(id: string) {
    const media = await this.getById(id);
    await this.gridFsService.delete(media.gridFsFileId.toString());
    await this.mediaModel.findByIdAndDelete(id);

    return { message: 'Media deleted successfully' };
  }
}
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { MediaService } from './media.service';
import { LocalLoaderService } from '../local-loader/local-loader.service';

@Controller('media')
export class MediaController {
  constructor(
    private readonly mediaService: MediaService,
    private readonly localLoaderService: LocalLoaderService,
    private readonly configService: ConfigService,
  ) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('file is required');
    }

    return this.mediaService.uploadFromHttp(file);
  }

  @Post('import/local')
  importLocal() {
    return this.localLoaderService.importFolder();
  }

  @Post('import/s3')
  importS3(@Body() body: { bucketName?: string }) {
    const bucketName =
      body.bucketName || this.configService.getOrThrow<string>('AWS_BUCKET_NAME');

    return this.mediaService.importFromS3(bucketName);
  }

  @Get()
  findAll() {
    return this.mediaService.findAll();
  }

  @Get('stats')
  stats() {
    return this.mediaService.stats();
  }

  @Get('search')
  search(@Query('q') q: string) {
    return this.mediaService.searchByName(q || '');
  }

  @Get('type/:category')
  findByType(@Param('category') category: string) {
    return this.mediaService.findByType(category);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.mediaService.getById(id);
  }

  @Get('download/:id')
  async download(
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { media, stream } = await this.mediaService.downloadById(id);

    res.setHeader('Content-Type', media.mimeType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${media.originalName}"`,
    );

    return new StreamableFile(stream as any);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.mediaService.deleteById(id);
  }
}
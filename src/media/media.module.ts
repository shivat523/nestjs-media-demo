import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { Media, MediaSchema } from './schemas/media.schema';
import { GridFsService } from '../storage/gridfs.service';
import { S3Service } from '../s3/s3.service';
import { LocalLoaderService } from '../local-loader/local-loader.service';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([{ name: Media.name, schema: MediaSchema }]),
  ],
  controllers: [MediaController],
  providers: [MediaService, GridFsService, S3Service, LocalLoaderService],
})
export class MediaModule {}
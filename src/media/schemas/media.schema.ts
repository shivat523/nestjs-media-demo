import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type MediaDocument = HydratedDocument<Media>;

export type MediaType = 'image' | 'audio' | 'video';
export type MediaSource = 'upload' | 'local' | 's3';

@Schema({ timestamps: true })
export class Media {
  @Prop({ required: true })
  filename: string;

  @Prop({ required: true })
  originalName: string;

  @Prop({ required: true })
  mimeType: string;

  @Prop({ required: true, enum: ['image', 'audio', 'video'] })
  category: MediaType;

  @Prop({ required: true, enum: ['upload', 'local', 's3'] })
  source: MediaSource;

  @Prop({ required: true })
  size: number;

  @Prop({ required: true, type: Types.ObjectId })
  gridFsFileId: Types.ObjectId;
}

export const MediaSchema = SchemaFactory.createForClass(Media);
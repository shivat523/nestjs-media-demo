import { Injectable } from '@nestjs/common';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { MediaService } from '../media/media.service';
import { MediaType } from '../media/schemas/media.schema';

@Injectable()
export class LocalLoaderService {
  constructor(private readonly mediaService: MediaService) {}

  async importFolder(folderPath = path.join(process.cwd(), 'data')) {
    const files = await this.collectFiles(folderPath);
    const imported = [];

    for (const fullPath of files) {
      const buffer = await fs.readFile(fullPath);
      const filename = path.basename(fullPath);
      const mimeType = this.guessMimeType(filename);
      const category = this.guessCategory(mimeType);

      imported.push(
        await this.mediaService.uploadFromBuffer({
          buffer,
          filename,
          originalName: filename,
          mimeType,
          category,
          source: 'local',
          size: buffer.length,
        }),
      );
    }

    return {
      message: 'Local folder imported successfully',
      totalImported: imported.length,
      data: imported,
    };
  }

  private async collectFiles(dir: string): Promise<string[]> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const results: string[] = [];

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        results.push(...(await this.collectFiles(fullPath)));
      } else {
        results.push(fullPath);
      }
    }

    return results;
  }

  private guessMimeType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();

    if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
    if (ext === '.png') return 'image/png';
    if (ext === '.gif') return 'image/gif';
    if (ext === '.mp3') return 'audio/mpeg';
    if (ext === '.wav') return 'audio/wav';
    if (ext === '.mp4') return 'video/mp4';
    if (ext === '.mov') return 'video/quicktime';

    return 'application/octet-stream';
  }

  private guessCategory(mimeType: string): MediaType {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('audio/')) return 'audio';
    return 'video';
  }
}
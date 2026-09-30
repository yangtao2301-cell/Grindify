/*
 * Copyright (c) 2026 FalkenDev
 *
 * This file is part of Grindify.
 *
 * Grindify is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of
 * the License, or (at your option) any later version.
 *
 * You should have received a copy of the GNU Affero General Public
 * License along with Grindify. If not, see
 * <https://www.gnu.org/licenses/>.
 */

import { Injectable } from '@nestjs/common';
import * as sharp from 'sharp';
import * as fs from 'fs/promises';
import * as path from 'path';
import { randomBytes } from 'crypto';

@Injectable()
export class UploadService {
  private readonly uploadsDir = path.join(process.cwd(), 'uploads');
  private readonly exercisesDir = path.join(this.uploadsDir, 'exercises');
  private readonly avatarsDir = path.join(this.uploadsDir, 'avatars');
  private readonly mediaDir = path.join(this.exercisesDir, 'media');
  private readonly progressPhotosDir = path.join(
    this.uploadsDir,
    'progress-photos',
  );

  constructor() {
    this.ensureDirectoriesExist();
  }

  private async ensureDirectoriesExist() {
    try {
      await fs.mkdir(this.uploadsDir, { recursive: true });
      await fs.mkdir(this.exercisesDir, { recursive: true });
      await fs.mkdir(this.avatarsDir, { recursive: true });
      await fs.mkdir(this.mediaDir, { recursive: true });
      await fs.mkdir(this.progressPhotosDir, { recursive: true });
    } catch (error) {
      console.error('Error creating upload directories:', error);
    }
  }

  /**
 * 处理并优化训练动作图片。
 * 针对移动端优化，使用更小的尺寸和文件大小。
   */
  async processExerciseImage(
    file: Express.Multer.File,
  ): Promise<{ url: string; fileSize: number }> {
    const filename = `${randomBytes(16).toString('hex')}.webp`;
    const filepath = path.join(this.exercisesDir, filename);

  // 针对移动端优化：最大宽度 800px，并使用高压缩率
    const info = await sharp(file.buffer)
      .rotate()
      .resize(800, 800, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 80 })
      .toFile(filepath);

    return { url: `/uploads/exercises/${filename}`, fileSize: info.size };
  }

  /**
 * 处理并优化头像图片。
 * 头像使用更小的尺寸。
   */
  async processAvatarImage(file: Express.Multer.File): Promise<string> {
    const filename = `${randomBytes(16).toString('hex')}.webp`;
    const filepath = path.join(this.avatarsDir, filename);

  // 头像优化为 400x400px，适合圆形裁剪
    await sharp(file.buffer)
      .rotate()
      .resize(400, 400, {
        fit: 'cover',
        position: 'center',
      })
      .webp({ quality: 85 })
      .toFile(filepath);

    return `/uploads/avatars/${filename}`;
  }

  /**
 * 处理训练动作媒体（图片或视频）。
 * 图片会转换为 WebP，视频保持原格式存储。
   */
  async processExerciseMedia(
    file: Express.Multer.File,
  ): Promise<{ url: string; type: 'image' | 'video' }> {
    const isVideo = file.mimetype === 'video/mp4';

    if (isVideo) {
      const filename = `${randomBytes(16).toString('hex')}.mp4`;
      const filepath = path.join(this.mediaDir, filename);
      await fs.writeFile(filepath, file.buffer);
      return { url: `/uploads/exercises/media/${filename}`, type: 'video' };
    }

  // 图片处理
    const filename = `${randomBytes(16).toString('hex')}.webp`;
    const filepath = path.join(this.mediaDir, filename);
    await sharp(file.buffer)
      .rotate()
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toFile(filepath);

    return { url: `/uploads/exercises/media/${filename}`, type: 'image' };
  }

  async readFileAsBuffer(relativeUrl: string): Promise<Buffer | null> {
    if (!relativeUrl) return null;
    try {
      const filepath = path.join(process.cwd(), relativeUrl);
      return await fs.readFile(filepath);
    } catch {
      return null;
    }
  }

  async writeExerciseImageFromBuffer(buffer: Buffer, ext: string): Promise<string> {
    const filename = `${randomBytes(16).toString('hex')}.${ext}`;
    const filepath = path.join(this.exercisesDir, filename);
    await fs.writeFile(filepath, buffer);
    return `/uploads/exercises/${filename}`;
  }

  async writeExerciseMediaFromBuffer(buffer: Buffer, ext: string): Promise<string> {
    const filename = `${randomBytes(16).toString('hex')}.${ext}`;
    const filepath = path.join(this.mediaDir, filename);
    await fs.writeFile(filepath, buffer);
    return `/uploads/exercises/media/${filename}`;
  }

  /**
 * 从文件系统删除图片文件。
   */
  async deleteImage(imageUrl: string): Promise<void> {
    if (!imageUrl) return;

    const relativeUrl = imageUrl.replace(/^\/+/, '');
    if (
      !relativeUrl.startsWith('uploads/') ||
      relativeUrl.includes('\\') ||
      path.posix.normalize(relativeUrl) !== relativeUrl
    ) {
      return;
    }

    const filepath = path.resolve(process.cwd(), relativeUrl);
    const uploadsRoot = `${path.resolve(this.uploadsDir)}${path.sep}`;
    if (!filepath.startsWith(uploadsRoot)) return;

    try {
      await fs.unlink(filepath);
    } catch (error) {
  // 文件可能不存在，这种情况可以忽略
      console.log('Image deletion failed (file may not exist):', error.message);
    }
  }

  /**
 * 处理并优化进度照片。
 * 最大宽度为 1080px，并保持纵向宽高比。
   */
  async processProgressPhoto(file: Express.Multer.File): Promise<string> {
    const filename = `${randomBytes(16).toString('hex')}.webp`;
    const filepath = path.join(this.progressPhotosDir, filename);

    await sharp(file.buffer)
      .rotate()
      .resize(1080, 1920, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 85 })
      .toFile(filepath);

    return `/uploads/progress-photos/${filename}`;
  }

  /**
 * 验证上传的文件（仅限图片）。
   */
  validateImageFile(file: Express.Multer.File): {
    valid: boolean;
    error?: string;
  } {
  const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/jpg',
    ];

    if (!file) {
      return { valid: false, error: 'No file provided' };
    }

    if (!allowedMimeTypes.includes(file.mimetype)) {
      return {
        valid: false,
        error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed',
      };
    }

    if (file.size > maxSize) {
      return { valid: false, error: 'File too large. Maximum size is 10MB' };
    }

    return { valid: true };
  }

  /**
 * 验证上传的媒体文件（图片和视频）。
   */
  validateMediaFile(file: Express.Multer.File): {
    valid: boolean;
    error?: string;
  } {
  const maxSize = 50 * 1024 * 1024; // 视频最大 50MB
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/jpg',
      'video/mp4',
    ];

    if (!file) {
      return { valid: false, error: 'No file provided' };
    }

    if (!allowedMimeTypes.includes(file.mimetype)) {
      return {
        valid: false,
        error: 'Invalid file type. Only JPEG, PNG, WebP, and MP4 are allowed',
      };
    }

    if (file.size > maxSize) {
      return { valid: false, error: 'File too large. Maximum size is 50MB' };
    }

    return { valid: true };
  }
}

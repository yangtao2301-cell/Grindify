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

/**
 * 根据相对路径构造完整图片 URL 的辅助函数。
 * 处理静态资源的 /v1 前缀问题。
 */
export const getImageUrl = (imagePath: string | null | undefined): string | null => {
  if (!imagePath) return null;
  
  if (imagePath.startsWith('http')) {
    return imagePath;
  }
  
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:1337/v1';
// 从 API URL 中移除 /v1，以便访问静态资源
  const baseUrl = apiUrl.replace('/v1', '');
  return `${baseUrl}${imagePath}`;
};

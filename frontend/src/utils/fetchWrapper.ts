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

import router from '@/router';
import { useAuthStore } from '@/stores/auth.store';

const isLoopbackHost = (hostname: string) =>
  hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';

const isPrivateIpv4 = (hostname: string) => {
  const octets = hostname.split('.').map(Number);
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
    return false;
  }

  return (
    octets[0] === 10 ||
    (octets[0] === 192 && octets[1] === 168) ||
    (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31)
  );
};

const isLocalDevelopmentHost = (hostname: string) =>
  isLoopbackHost(hostname) || isPrivateIpv4(hostname);

/**
 * 让本地开发请求与页面使用相同的主机。
 *
 * 身份验证令牌是 httpOnly、仅限当前主机的 Cookie。当应用从 localhost 打开，
 * 但 VITE_API_URL 指向局域网 IP（或反过来）时，浏览器会将请求视为跨站请求，
 * 并且在 SameSite=Lax 下不会发送该 Cookie。
 */
const resolveRequestUrl = (url: string) => {
  if (typeof window === 'undefined') return url;

  try {
    const requestUrl = new URL(url, window.location.href);
    const pageHost = window.location.hostname;

    if (
      pageHost !== requestUrl.hostname &&
      isLocalDevelopmentHost(pageHost) &&
      isLocalDevelopmentHost(requestUrl.hostname)
    ) {
      requestUrl.hostname = pageHost;
    }

    return requestUrl.toString();
  } catch {
    return url;
  }
};

export const fetchWrapper = async <T = unknown>(
  url: string,
  options: RequestInit = {},
): Promise<T> => {
  try {
    const mergedOptions: RequestInit = {
      ...options,
      credentials: 'include',
    };

    const headers = new Headers(mergedOptions.headers || {});
    if (
      mergedOptions.body &&
      typeof mergedOptions.body === 'string' &&
      !headers.has('Content-Type')
    ) {
      headers.set('Content-Type', 'application/json');
    }
    mergedOptions.headers = headers;

    const response = await fetch(resolveRequestUrl(url), mergedOptions);

    if (response.status === 401) {
      await handleUnauthorized();
      return Promise.reject('401 Unauthorized');
    }

    if (response.status === 403) {
      await handleForbidden();
      return Promise.reject('403 Forbidden');
    }

    if (!response.ok) {
      const errorText = await response.text();
      
// 检查是否为 404 用户不存在错误
      if (response.status === 404) {
        try {
          const errorBody = JSON.parse(errorText);
          if (errorBody.message === 'User not found') {
            await handleUserNotFound();
            return Promise.reject('User not found - logged out');
          }
        } catch {
// 不是 JSON 或属于其他错误，继续正常的错误处理
        }
      }
      
      throw new Error(
        `HTTP error! Status: ${response.status}. Body: ${errorText}`,
      );
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return (await response.json()) as T;
    }
    return (await response.text()) as unknown as T;
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
};

const handleUnauthorized = async () => {
  const authStore = useAuthStore();
  await authStore.logout();
  console.warn('401 Unauthorized: Redirecting to login...');
  router.push('/login');
};

const handleForbidden = async () => {
  const authStore = useAuthStore();
  await authStore.logout();
  console.warn('403 Forbidden: Redirecting to login...');
  router.push('/login');
};

const handleUserNotFound = async () => {
  const authStore = useAuthStore();
  await authStore.logout();
  console.warn('User not found: Logging out and redirecting to login...');
  router.push('/login');
};

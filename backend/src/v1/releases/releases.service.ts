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

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface GiteeRelease {
  tag_name?: string;
  name?: string;
  created_at?: string;
  body?: string;
  prerelease?: boolean | string;
}

export interface ReleaseHistoryEntry {
  tagName: string;
  name: string;
  publishedAt: string | null;
  body: string;
  prerelease: boolean;
  htmlUrl: string | null;
}

export interface ReleaseHistoryResponse {
  status: 'ok' | 'unconfigured' | 'unavailable';
  source: 'gitee';
  repo: string | null;
  fetchedAt: string;
  latestReleaseVersion: string | null;
  releases: ReleaseHistoryEntry[];
  message: string | null;
}

@Injectable()
export class ReleasesService {
  private readonly logger = new Logger(ReleasesService.name);

  constructor(private readonly configService: ConfigService) {}

  async getReleaseHistory(): Promise<ReleaseHistoryResponse> {
    const repo = this.getConfiguredRepo();
    if (!repo) {
      return this.buildFallbackResponse(
        'unconfigured',
        null,
        'Gitee release proxy is not configured.',
      );
    }

    try {
      const headers = new Headers({
        Accept: 'application/json',
        'User-Agent': 'Grindify Release Proxy',
      });
      const token = this.configService
        .get<string>('GITEE_RELEASES_TOKEN')
        ?.trim();
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }

      const releasesUrl = new URL(
        `https://gitee.com/api/v5/repos/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.name)}/releases`,
      );
      releasesUrl.searchParams.set('page', '1');
      releasesUrl.searchParams.set('per_page', '12');

      const response = await fetch(releasesUrl, { headers });

      if (!response.ok) {
        const details = await response.text();
        this.logger.warn(
          `Gitee releases request failed with ${response.status}: ${details}`,
        );
        return this.buildFallbackResponse(
          'unavailable',
          `${repo.owner}/${repo.name}`,
          `Gitee releases are currently unavailable (${response.status}).`,
        );
      }

      const payload = (await response.json()) as GiteeRelease[];
      if (!Array.isArray(payload)) {
        return this.buildFallbackResponse(
          'unavailable',
          `${repo.owner}/${repo.name}`,
          'Unexpected Gitee releases response.',
        );
      }

      const releases = payload
        .filter((release) => Boolean(release.tag_name))
        .map((release) => {
          const tagName = String(release.tag_name);

          return {
            tagName,
            name: release.name?.trim() || tagName,
            publishedAt: release.created_at ?? null,
            body: release.body?.trim() || '',
            prerelease: this.isPrerelease(release.prerelease),
            htmlUrl: this.buildReleaseUrl(repo, tagName),
          };
        });

      const latestStableRelease = releases.find(
        (release) => !release.prerelease,
      );

      return {
        status: 'ok',
        source: 'gitee',
        repo: `${repo.owner}/${repo.name}`,
        fetchedAt: new Date().toISOString(),
        latestReleaseVersion:
          latestStableRelease?.tagName ?? releases[0]?.tagName ?? null,
        releases,
        message: null,
      };
    } catch (error) {
      this.logger.warn(
        `Failed to fetch Gitee releases: ${error instanceof Error ? error.message : String(error)}`,
      );
      return this.buildFallbackResponse(
        'unavailable',
        `${repo.owner}/${repo.name}`,
        'Gitee releases could not be fetched right now.',
      );
    }
  }

  private getConfiguredRepo(): { owner: string; name: string } | null {
    const configuredOwner = this.configService.get<string>(
      'GITEE_RELEASES_OWNER',
    );
    const configuredRepo = this.configService.get<string>(
      'GITEE_RELEASES_REPO',
    );

    const owner =
      configuredOwner === undefined ? 'yang_taoo' : configuredOwner.trim();
    const name =
      configuredRepo === undefined ? 'grindify' : configuredRepo.trim();

    if (!owner || !name) {
      return null;
    }

    return { owner, name };
  }

  private isPrerelease(value: boolean | string | undefined): boolean {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }

    return value === true;
  }

  private buildReleaseUrl(
    repo: { owner: string; name: string },
    tagName: string,
  ): string {
    return `https://gitee.com/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.name)}/releases/tag/${encodeURIComponent(tagName)}`;
  }

  private buildFallbackResponse(
    status: ReleaseHistoryResponse['status'],
    repo: string | null,
    message: string,
  ): ReleaseHistoryResponse {
    return {
      status,
      source: 'gitee',
      repo,
      fetchedAt: new Date().toISOString(),
      latestReleaseVersion: null,
      releases: [],
      message,
    };
  }
}

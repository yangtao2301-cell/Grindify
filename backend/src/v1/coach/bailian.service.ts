import {
  Injectable,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CoachControlService } from './coach-control.service';
import { ChatInput } from './coach.types';

@Injectable()
export class BailianService {
  constructor(
    private readonly config: ConfigService,
    @Optional() private readonly control?: CoachControlService,
  ) {}

  get model(): string {
    return this.config.get<string>('COACH_CHAT_MODEL') || 'qwen-plus';
  }
  get embeddingModel(): string {
    return (
      this.config.get<string>('COACH_EMBEDDING_MODEL') || 'text-embedding-v4'
    );
  }
  get dimensions(): number {
    return this.number('COACH_EMBEDDING_DIMENSIONS', 1024, 64, 2048);
  }
  get configured(): boolean {
    const base = this.config.get<string>('DASHSCOPE_BASE_URL') || '';
    return (
      this.config.get<string>('COACH_ENABLED') === 'true' &&
      !!this.config.get<string>('DASHSCOPE_API_KEY') &&
      /^https:\/\//.test(base) &&
      !/[{}<>]/.test(base)
    );
  }
  number(key: string, fallback: number, min: number, max: number): number {
    const raw = this.config.get<string>(key);
    const value = raw ? Number(raw) : fallback;
    return Number.isFinite(value)
      ? Math.max(min, Math.min(max, Math.floor(value)))
      : fallback;
  }
  assertConfigured(): void {
    if (!this.configured)
      throw new ServiceUnavailableException('教练服务尚未配置，请联系管理员。');
  }

  private async request(
    path: string,
    body: object,
    signal?: AbortSignal,
  ): Promise<Response> {
    this.assertConfigured();
    const timeout = AbortSignal.timeout(
      this.number('COACH_TIMEOUT_MS', 60000, 5000, 120000),
    );
    let response: Response;
    try {
      response = await fetch(
        `${this.config.get<string>('DASHSCOPE_BASE_URL')!.replace(/\/$/, '')}${path}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.config.get<string>('DASHSCOPE_API_KEY')}`,
          },
          body: JSON.stringify(body),
          signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
        },
      );
    } catch {
      if (signal?.aborted) throw new Error('cancelled');
      throw Object.assign(
        new ServiceUnavailableException('百炼连接超时或暂不可用，请稍后重试。'),
        { operationCode: 'connection_timeout_or_network_error' },
      );
    }
    if (!response.ok) {
      await response.body?.cancel();
      throw Object.assign(
        new ServiceUnavailableException(
          response.status === 429
            ? '百炼服务繁忙，请稍后重试。'
            : '百炼调用失败，请管理员检查地域、模型权限和 API 配置。',
        ),
        { operationCode: 'provider_http_' + response.status },
      );
    }
    return response;
  }

  async embed(texts: string[], signal?: AbortSignal): Promise<number[][]> {
    const start = Date.now();
    let status = 'failed';
    let errorCode: string | undefined;
    let total: Usage | undefined;
    try {
      const result = await this.embedInner(texts, signal, (u) => {
        total = {
          prompt_tokens:
            (total?.prompt_tokens || 0) +
            (u.prompt_tokens ?? u.total_tokens ?? 0),
        };
      });
      status = 'success';
      return result;
    } catch (e) {
      errorCode = operationCode(e);
      throw e;
    } finally {
      await this.control?.record(
        'embedding',
        this.embeddingModel,
        signal?.aborted ? 'cancelled' : status,
        start,
        total,
        errorCode,
      );
    }
  }
  async json(messages: ChatInput[]): Promise<unknown> {
    const start = Date.now();
    let status = 'failed';
    let errorCode: string | undefined;
    let usage: Usage | undefined;
    try {
      const result = await this.jsonInner(messages, (u) => {
        usage = u;
      });
      status = 'success';
      return result;
    } catch (e) {
      errorCode = operationCode(e);
      throw e;
    } finally {
      await this.control?.record(
        'memory',
        this.config.get<string>('COACH_MEMORY_MODEL') || this.model,
        status,
        start,
        usage,
        errorCode,
      );
    }
  }
  async *stream(
    messages: ChatInput[],
    signal: AbortSignal,
    maxTokens?: number,
  ): AsyncGenerator<string> {
    const start = Date.now();
    let status = 'failed';
    let errorCode: string | undefined;
    let usage: Usage | undefined;
    try {
      yield* this.streamInner(messages, signal, maxTokens, (u) => {
        usage = u;
      });
      status = 'success';
    } catch (e) {
      errorCode = operationCode(e);
      throw e;
    } finally {
      await this.control?.record(
        'chat',
        this.model,
        signal.aborted ? 'cancelled' : status,
        start,
        usage,
        errorCode,
      );
    }
  }

  private async embedInner(
    texts: string[],
    signal: AbortSignal | undefined,
    usage: (value: Usage) => void,
  ): Promise<number[][]> {
    const results: number[][] = [];
    for (let i = 0; i < texts.length; i += 10) {
      const input = texts.slice(i, i + 10);
      const response = await this.request(
        '/embeddings',
        {
          model: this.embeddingModel,
          input,
          dimensions: this.dimensions,
          encoding_format: 'float',
        },
        signal,
      );
      const data = (await response.json()) as {
        data?: { index: number; embedding: number[] }[];
        usage?: Usage;
      };
      if (data.usage) usage(data.usage);
      const entries = data.data?.sort((a, b) => a.index - b.index);
      if (
        !entries ||
        entries.length !== input.length ||
        entries.some(
          (entry, index) =>
            entry.index !== index ||
            !Array.isArray(entry.embedding) ||
            entry.embedding.length !== this.dimensions ||
            entry.embedding.some((v) => !Number.isFinite(v)) ||
            !entry.embedding.some((v) => v !== 0),
        )
      )
        throw new ServiceUnavailableException('向量模型返回了无效的数据。');
      results.push(...entries.map((entry) => entry.embedding));
    }
    return results;
  }

  private async jsonInner(
    messages: ChatInput[],
    usage: (value: Usage) => void,
  ): Promise<unknown> {
    const response = await this.request('/chat/completions', {
      model: this.config.get<string>('COACH_MEMORY_MODEL') || this.model,
      messages,
      enable_thinking: false,
      max_tokens: 1200,
      temperature: 0.1,
      response_format: { type: 'json_object' },
    });
    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
      usage?: Usage;
    };
    if (data.usage) usage(data.usage);
    return JSON.parse(data.choices?.[0]?.message?.content || '{}') as unknown;
  }

  private async *streamInner(
    messages: ChatInput[],
    signal: AbortSignal,
    maxTokens: number | undefined,
    usage: (value: Usage) => void,
  ): AsyncGenerator<string> {
    const response = await this.request(
      '/chat/completions',
      {
        model: this.model,
        messages,
        stream: true,
        stream_options: { include_usage: true },
        enable_thinking: false,
        max_tokens:
          maxTokens ?? this.number('COACH_MAX_OUTPUT_TOKENS', 1500, 256, 4000),
        temperature: 0.4,
      },
      signal,
    );
    if (!response.body)
      throw new ServiceUnavailableException('百炼未返回回答。');
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let finished = false;
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let newline: number;
        while ((newline = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, newline).trim();
          buffer = buffer.slice(newline + 1);
          if (!line.startsWith('data:')) continue;
          const payload = line.slice(5).trim();
          if (payload === '[DONE]') {
            finished = true;
            return;
          }
          const event = JSON.parse(payload) as {
            error?: unknown;
            usage?: Usage;
            choices?: {
              delta?: { content?: string };
              finish_reason?: string;
            }[];
          };
          if (event.usage) usage(event.usage);
          if (event.error) throw new Error('provider stream error');
          const choice = event.choices?.[0];
          if (choice?.delta?.content) yield choice.delta.content;
          if (choice?.finish_reason) finished = true;
        }
        if (buffer.length > 100000) throw new Error('invalid provider stream');
      }
      if (!finished)
        throw new ServiceUnavailableException('回答连接中断，请重试。');
    } finally {
      await reader.cancel().catch(() => undefined);
      reader.releaseLock();
    }
  }
}

type Usage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
};

function operationCode(error: unknown): string | undefined {
  const code = (error as { operationCode?: unknown })?.operationCode;
  return typeof code === 'string' &&
    /^(provider_http_[0-9]{3}|connection_timeout_or_network_error)$/.test(code)
    ? code
    : undefined;
}

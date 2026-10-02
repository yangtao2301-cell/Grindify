import { ConfigService } from '@nestjs/config';
import { CoachControlService } from './coach-control.service';
import { BailianService } from './bailian.service';

describe('Bailian API boundary', () => {
  const originalFetch = global.fetch;
  let fetchMock: jest.Mock;
  let service: BailianService;
  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock;
    service = new BailianService(
      new ConfigService({
        COACH_ENABLED: 'true',
        DASHSCOPE_API_KEY: 'test-key',
        DASHSCOPE_BASE_URL:
          'https://test-workspace.cn-beijing.maas.aliyuncs.com/compatible-mode/v1',
        COACH_EMBEDDING_DIMENSIONS: '64',
      }),
    );
  });
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('decodes split UTF-8 and SSE frames without dropping Chinese text', async () => {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(
      'data: {"choices":[{"delta":{"content":"训练建议"}}]}\r\n\r\ndata: {"choices":[{"delta":{},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n',
    );
    fetchMock.mockResolvedValue(
      new Response(
        new ReadableStream({
          start(controller) {
            for (let i = 0; i < bytes.length; i += 2)
              controller.enqueue(bytes.slice(i, i + 2));
            controller.close();
          },
        }),
      ),
    );
    let text = '';
    for await (const delta of service.stream(
      [{ role: 'user', content: '你好' }],
      new AbortController().signal,
    ))
      text += delta;
    expect(text).toBe('训练建议');
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url.endsWith('/chat/completions')).toBe(true);
    expect(JSON.parse(init.body as string)).toMatchObject({
      model: 'qwen-plus',
      stream: true,
      enable_thinking: false,
    });
  });

  it('does not silently mark a truncated stream as a completed answer', async () => {
    fetchMock.mockResolvedValue(
      new Response('data: {"choices":[{"delta":{"content":"部分内容"}}]}\n\n'),
    );
    const read = async () => {
      for await (const delta of service.stream(
        [],
        new AbortController().signal,
      ))
        void delta;
    };
    await expect(read()).rejects.toThrow('回答连接中断');
  });

  it('orders embeddings by input index and rejects wrong dimensions', async () => {
    const vector = Array(64).fill(0);
    vector[0] = 1;
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: [
            { index: 1, embedding: vector.map((v) => v * 2) },
            { index: 0, embedding: vector },
          ],
        }),
      ),
    );
    expect((await service.embed(['a', 'b'])).map((v) => v[0])).toEqual([1, 2]);
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: [{ index: 0, embedding: [1, 2] }] })),
    );
    await expect(service.embed(['a'])).rejects.toThrow('无效的数据');
  });

  it('does not expose upstream bodies or credentials in an API error', async () => {
    fetchMock.mockResolvedValue(
      new Response('upstream sensitive diagnostic', { status: 401 }),
    );
    await expect(service.embed(['a'])).rejects.toThrow('百炼调用失败');
  });

  it('records final stream usage and sanitized HTTP errors without retaining prompts', async () => {
    const record = jest.fn().mockResolvedValue(undefined);
    const monitored = new BailianService(
      new ConfigService({
        COACH_ENABLED: 'true',
        DASHSCOPE_API_KEY: 'secret-test-key',
        DASHSCOPE_BASE_URL: 'https://example.invalid',
        COACH_EMBEDDING_DIMENSIONS: '64',
      }),
      { record } as unknown as CoachControlService,
    );
    fetchMock.mockResolvedValueOnce(
      new Response(
        'data: {"choices":[{"delta":{"content":"Answer"},"finish_reason":"stop"}]}\n\ndata: {"choices":[],"usage":{"prompt_tokens":12,"completion_tokens":3}}\n\ndata: [DONE]\n\n',
      ),
    );
    for await (const text of monitored.stream(
      [{ role: 'user', content: 'private question' }],
      new AbortController().signal,
      512,
    ))
      void text;
    expect(record.mock.calls[0].slice(0, 3)).toEqual([
      'chat',
      'qwen-plus',
      'success',
    ]);
    expect(record.mock.calls[0][4]).toEqual({
      prompt_tokens: 12,
      completion_tokens: 3,
    });
    expect(JSON.stringify(record.mock.calls)).not.toMatch(
      /private question|secret-test-key|Answer/,
    );
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).max_tokens).toBe(512);
    fetchMock.mockResolvedValueOnce(
      new Response('sensitive provider body', { status: 401 }),
    );
    await expect(monitored.embed(['private input'])).rejects.toThrow(
      '百炼调用失败',
    );
    expect(record.mock.calls[1][5]).toBe('provider_http_401');
    expect(JSON.stringify(record.mock.calls)).not.toContain(
      'sensitive provider body',
    );
  });

  it('refuses unconfigured or placeholder endpoints without calling fetch', () => {
    const unconfigured = new BailianService(
      new ConfigService({
        COACH_ENABLED: 'true',
        DASHSCOPE_API_KEY: 'test-key',
        DASHSCOPE_BASE_URL:
          'https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/compatible-mode/v1',
      }),
    );
    expect(() => unconfigured.assertConfigured()).toThrow('尚未配置');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

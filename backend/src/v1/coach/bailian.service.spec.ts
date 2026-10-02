import { ConfigService } from '@nestjs/config';
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

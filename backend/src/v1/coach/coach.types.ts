export type ChatInput = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};
export type Source = {
  id: string;
  documentId: string;
  title: string;
  source: string;
  demo: boolean;
  excerpt: string;
  score: number;
  citation?: number;
};
export interface Conversation {
  id: string;
  user_id: number;
  title: string;
  summary: string;
  updated_at: string;
}
export interface Message {
  id: string;
  conversation_id: string;
  request_id: string;
  role: 'user' | 'assistant';
  content: string;
  status: string;
  sources: Source[];
  created_at: string;
}
export interface Memory {
  id: string;
  kind: string;
  content: string;
  evidence: string;
  locked: boolean;
  hidden: boolean;
  updated_at: string;
}
export interface KnowledgeDocument {
  id: string;
  title: string;
  category: string;
  source: string;
  content: string;
  demo: boolean;
  revision: string;
  active_revision: string | null;
  enabled: boolean;
  state: string;
  error: string | null;
}
export const MEMORY_KINDS = [
  'goal',
  'experience',
  'schedule',
  'equipment',
  'preference',
] as const;

export function splitDocument(
  content: string,
  size = 900,
  overlap = 120,
): string[] {
  const text = content.replace(/\r\n/g, '\n').trim();
  const chunks: string[] = [];
  for (let start = 0; start < text.length; ) {
    let end = Math.min(start + size, text.length);
    if (end < text.length) {
      const boundary = Math.max(
        text.lastIndexOf('\n', end),
        text.lastIndexOf('。', end),
      );
      if (boundary > start + size / 2) end = boundary + 1;
    }
    chunks.push(text.slice(start, end));
    if (end === text.length) break;
    start = end - overlap;
  }
  return chunks;
}

/** Keep only citations actually supplied to the model and referenced in its answer. */
export function citedSources(answer: string, sources: Source[]): Source[] {
  return sources
    .map((source, index) => ({ ...source, citation: index + 1 }))
    .filter((source) => answer.includes(`[${source.citation}]`));
}

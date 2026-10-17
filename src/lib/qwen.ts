/**
 * 通义千问 API 封装
 * 支持 chat 和 embedding
 */

const API_BASE = 'https://dashscope.aliyuncs.com/compatible-mode/v1';

function getApiKey(): string {
  if (typeof window !== 'undefined') throw new Error('AI credentials are server-only');
  const key = process.env.QWEN_API_KEY;
  if (!key) throw new Error('QWEN_API_KEY is not configured on the server');
  return key;
}
function getChatModel() { return process.env.QWEN_CHAT_MODEL || 'qwen-plus'; }
function getEmbeddingModel() { return process.env.QWEN_EMBEDDING_MODEL || 'text-embedding-v3'; }

// ==================== Chat ====================

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatOptions {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  timeout?: number;
}

/**
 * 调用通义千问 Chat API
 */
export async function chat(
  messages: ChatMessage[],
  options?: ChatOptions,
): Promise<string> {
  const model = options?.model || getChatModel();
  const timeout = options?.timeout || 30000;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(`${API_BASE}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${getApiKey()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options?.temperature ?? 0.3,
        max_tokens: options?.max_tokens ?? 2000,
      }),
    });

    if (!res.ok) {
      throw new Error(`Qwen Chat API request failed (${res.status})`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || '';
  } finally {
    clearTimeout(timer);
  }
}

// ==================== Embedding ====================

interface EmbeddingOptions {
  model?: string;
  dimensions?: number;
  timeout?: number;
}

/**
 * 生成文本 embedding 向量
 */
export async function embedding(
  text: string,
  options?: EmbeddingOptions,
): Promise<number[]> {
  const model = options?.model || getEmbeddingModel();
  const timeout = options?.timeout || 30000;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(`${API_BASE}/embeddings`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${getApiKey()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        input: text,
        dimensions: options?.dimensions ?? 1024,
      }),
    });

    if (!res.ok) {
      throw new Error(`Qwen Embedding API request failed (${res.status})`);
    }

    const data = await res.json();
    return data.data?.[0]?.embedding || [];
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 批量生成 embedding（自动分批，每批 25 条）
 */
export async function batchEmbedding(
  texts: string[],
  options?: EmbeddingOptions,
): Promise<number[][]> {
  const model = options?.model || getEmbeddingModel();
  const timeout = options?.timeout || 60000;
  const batchSize = 10; // 通义千问限制最大批量 10 条
  const results: number[][] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const res = await fetch(`${API_BASE}/embeddings`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Authorization': `Bearer ${getApiKey()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          input: batch,
          dimensions: options?.dimensions ?? 1024,
        }),
      });

      if (!res.ok) {
        throw new Error(`Qwen Embedding API request failed (${res.status})`);
      }

      const data = await res.json();
      const embeddings = (data.data || [])
        .sort((a: { index: number }, b: { index: number }) => a.index - b.index)
        .map((d: { embedding: number[] }) => d.embedding);
      results.push(...embeddings);
    } finally {
      clearTimeout(timer);
    }

    // 批次间隔，避免限流
    if (i + batchSize < texts.length) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  return results;
}

// ==================== 辅助函数 ====================

/**
 * 用 LLM 提取岗位的结构化标签
 */
export async function extractStructuredTags(
  title: string,
  organization: string,
  description: string,
): Promise<Record<string, unknown>> {
  const prompt = `请从以下招聘信息中提取结构化标签，以JSON格式返回。

岗位：${title}
单位：${organization}
描述：${description.slice(0, 1500)}

请提取以下字段（如无法判断则为null）：
{
  "disciplines": ["一级学科1", "一级学科2"],
  "research_directions": ["研究方向1", "研究方向2"],
  "keywords": ["关键词1", "关键词2", "关键词3"],
  "degree_requirement": "博士/硕士/本科",
  "bianzhi_hint": "事业编制/备案制/人事代理/合同制/未标注"
}

只返回JSON，不要其他内容。`;

  try {
    const result = await chat([{ role: 'user', content: prompt }], {
      temperature: 0.1,
      timeout: 20000,
    });

    // 提取 JSON
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch {
    // LLM 提取失败不影响主流程
  }

  return {};
}

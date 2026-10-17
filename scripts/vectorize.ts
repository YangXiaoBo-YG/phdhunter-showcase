/**
 * 批量生成岗位 embedding + LLM 提取 structured_tags
 * 运行：npx tsx scripts/vectorize.ts [--tags]
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

import { batchEmbedding, extractStructuredTags } from '../src/lib/qwen';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const BATCH_SIZE = 10; // 通义千问 batch embedding 限制最大 10
const WITH_TAGS = process.argv.includes('--tags');

/**
 * 为岗位生成 embedding 文本
 */
function buildEmbeddingText(job: {
  title: string;
  organization: string;
  department?: string;
  discipline?: string[];
  research_direction?: string;
  raw_description?: string;
}): string {
  const parts = [
    job.title,
    job.organization,
    job.department,
    job.discipline?.join(' '),
    job.research_direction,
    // 描述截取前 500 字符
    job.raw_description?.slice(0, 500),
  ].filter(Boolean);
  return parts.join(' ');
}

async function main() {
  // 1. 查询需要向量化的岗位（embedding 为 null）
  console.log('查询待向量化岗位...');
  const { data: jobs, error } = await supabase
    .from('jobs')
    .select('id, title, organization, department, discipline, research_direction, raw_description, bianzhi_type, structured_tags')
    .is('embedding', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('查询失败:', error.message);
    return;
  }

  console.log(`共 ${jobs.length} 条待处理\n`);

  if (jobs.length === 0) {
    console.log('所有岗位已有 embedding，无需处理。');
    return;
  }

  // 2. 分批生成 embedding
  let embeddingCount = 0;
  let tagsCount = 0;

  for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
    const batch = jobs.slice(i, i + BATCH_SIZE);
    const texts = batch.map(buildEmbeddingText);

    console.log(`Embedding 批次 ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(jobs.length / BATCH_SIZE)}（${batch.length} 条）`);

    try {
      const embeddings = await batchEmbedding(texts, { dimensions: 1024 });

      // 逐条更新
      for (let j = 0; j < batch.length; j++) {
        const job = batch[j];
        const emb = embeddings[j];

        if (!emb || emb.length === 0) {
          console.log(`  跳过 ${job.title}（embedding 为空）`);
          continue;
        }

        const updateData: Record<string, unknown> = {
          embedding: JSON.stringify(emb),
        };

        // 3. LLM 提取 structured_tags（可选）
        if (WITH_TAGS && !job.structured_tags) {
          try {
            const tags = await extractStructuredTags(
              job.title,
              job.organization,
              job.raw_description || '',
            );

            if (Object.keys(tags).length > 0) {
              updateData.structured_tags = tags;

              // 如果 LLM 识别了编制类型且当前为未标注，更新
              if (
                tags.bianzhi_hint &&
                typeof tags.bianzhi_hint === 'string' &&
                tags.bianzhi_hint !== '未标注' &&
                job.bianzhi_type === '未标注'
              ) {
                updateData.bianzhi_type = tags.bianzhi_hint;
              }

              // 提取研究方向
              if (tags.research_directions && Array.isArray(tags.research_directions)) {
                updateData.research_direction = (tags.research_directions as string[]).join('、');
              }

              tagsCount++;
            }
          } catch {
            // LLM 失败不影响 embedding 写入
          }

          // LLM 调用间隔
          await new Promise((r) => setTimeout(r, 300));
        }

        const { error: updateErr } = await supabase
          .from('jobs')
          .update(updateData)
          .eq('id', job.id);

        if (updateErr) {
          console.log(`  更新失败 ${job.title}: ${updateErr.message}`);
        } else {
          embeddingCount++;
        }
      }
    } catch (e) {
      console.error(`  批次失败:`, (e as Error).message);
    }

    // 批次间隔
    if (i + BATCH_SIZE < jobs.length) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  console.log(`\n完成！Embedding: ${embeddingCount} 条, Tags: ${tagsCount} 条`);
}

main().catch(console.error);

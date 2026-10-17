/**
 * 爬虫总入口脚本
 * 运行：npx tsx scripts/crawl.ts [--vectorize] [--tags]
 *
 * 流程：爬取所有数据源 → 可选向量化
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

import { runAllPipelines } from '../src/lib/crawler/pipeline';
import { gaoxiaojobSource } from '../src/lib/crawler/sources/gaoxiaojob';
import { zjuSource } from '../src/lib/crawler/sources/university-zju';
import { hduSource } from '../src/lib/crawler/sources/university-hdu';
import { wzuSource } from '../src/lib/crawler/sources/university-wzu';
import { zjhrssSource } from '../src/lib/crawler/sources/gov-zjhrss';
import { cetcSource } from '../src/lib/crawler/sources/enterprise-cetc';

// 所有数据源
const ALL_SOURCES = [
  zjuSource,        // 浙江大学（API，最快）
  hduSource,        // 杭州电子科技大学
  wzuSource,        // 温州大学
  zjhrssSource,     // 浙江省人社厅
  cetcSource,       // 中电科
  gaoxiaojobSource, // 高校人才网（可能被限流）
];

async function main() {
  const startTime = Date.now();

  console.log('╔══════════════════════════════════════╗');
  console.log('║       PhDHunter 爬虫系统              ║');
  console.log('╚══════════════════════════════════════╝\n');
  console.log(`数据源: ${ALL_SOURCES.map((s) => s.name).join(', ')}`);
  console.log(`时间: ${new Date().toISOString()}\n`);

  // 执行爬虫
  const reports = await runAllPipelines(ALL_SOURCES);

  // 汇总报告
  console.log('\n╔══════════════════════════════════════╗');
  console.log('║            运行报告                    ║');
  console.log('╚══════════════════════════════════════╝');

  for (const r of reports) {
    const status = r.errors.length > 0 ? '⚠' : '✓';
    console.log(`${status} ${r.source.padEnd(15)} 爬取=${String(r.crawled).padStart(4)} 入库=${String(r.inserted).padStart(4)} 耗时=${(r.duration_ms / 1000).toFixed(0)}s`);
  }

  const totalCrawled = reports.reduce((s, r) => s + r.crawled, 0);
  const totalInserted = reports.reduce((s, r) => s + r.inserted, 0);
  const totalErrors = reports.reduce((s, r) => s + r.errors.length, 0);
  const totalDuration = Date.now() - startTime;

  console.log(`${'─'.repeat(50)}`);
  console.log(`合计: 爬取=${totalCrawled} 入库=${totalInserted} 错误=${totalErrors} 总耗时=${(totalDuration / 1000).toFixed(0)}s`);

  // 可选：向量化
  if (process.argv.includes('--vectorize')) {
    console.log('\n开始向量化...');
    // 动态导入避免不需要时加载
    const { createClient } = await import('@supabase/supabase-js');
    const { batchEmbedding } = await import('../src/lib/qwen');

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { data: jobs } = await supabase
      .from('jobs')
      .select('id, title, organization, department, discipline, research_direction, raw_description')
      .is('embedding', null);

    if (jobs && jobs.length > 0) {
      console.log(`${jobs.length} 条待向量化`);

      for (let i = 0; i < jobs.length; i += 20) {
        const batch = jobs.slice(i, i + 20);
        const texts = batch.map((j) =>
          [j.title, j.organization, j.department, j.discipline?.join(' '), j.raw_description?.slice(0, 500)].filter(Boolean).join(' ')
        );

        try {
          const embeddings = await batchEmbedding(texts, { dimensions: 1024 });
          for (let k = 0; k < batch.length; k++) {
            if (embeddings[k]?.length > 0) {
              await supabase
                .from('jobs')
                .update({ embedding: JSON.stringify(embeddings[k]) })
                .eq('id', batch[k].id);
            }
          }
          console.log(`  向量化 ${Math.min(i + 20, jobs.length)}/${jobs.length}`);
        } catch (e) {
          console.error(`  向量化批次失败:`, (e as Error).message);
        }

        await new Promise((r) => setTimeout(r, 1000));
      }
    } else {
      console.log('所有岗位已有 embedding');
    }
  }
}

main().catch(console.error);

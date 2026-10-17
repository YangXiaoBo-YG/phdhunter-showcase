/**
 * 高校官网爬虫测试脚本
 * 运行：npx tsx scripts/crawl-universities.ts [zju|hdu|wzu|all]
 */
import { runPipeline, runAllPipelines } from '../src/lib/crawler/pipeline';
import { zjuSource } from '../src/lib/crawler/sources/university-zju';
import { hduSource } from '../src/lib/crawler/sources/university-hdu';
import { wzuSource } from '../src/lib/crawler/sources/university-wzu';

const SOURCES: Record<string, typeof zjuSource> = {
  zju: zjuSource,
  hdu: hduSource,
  wzu: wzuSource,
};

async function main() {
  const target = process.argv[2] || 'all';

  console.log('========================================');
  console.log('高校官网爬虫');
  console.log('========================================\n');

  if (target === 'all') {
    const reports = await runAllPipelines(Object.values(SOURCES));
    for (const r of reports) {
      console.log(`\n[${r.source}] 爬取=${r.crawled}, 入库=${r.inserted}, 错误=${r.errors.length}, 耗时=${(r.duration_ms / 1000).toFixed(1)}s`);
    }
  } else if (SOURCES[target]) {
    const report = await runPipeline(SOURCES[target]);
    console.log(`\n爬取=${report.crawled}, 入库=${report.inserted}, 错误=${report.errors.length}, 耗时=${(report.duration_ms / 1000).toFixed(1)}s`);
    if (report.errors.length > 0) {
      report.errors.forEach((e) => console.log(`  - ${e}`));
    }
  } else {
    console.log(`用法: npx tsx scripts/crawl-universities.ts [${Object.keys(SOURCES).join('|')}|all]`);
  }
}

main().catch(console.error);

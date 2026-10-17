-- 修改 embedding 维度：1536 → 1024（适配通义千问 text-embedding-v3）

-- 删除旧索引
DROP INDEX IF EXISTS idx_jobs_embedding;

-- 修改列类型
ALTER TABLE jobs ALTER COLUMN embedding TYPE VECTOR(1024);

-- 重建索引（需要表中有数据后才能生效）
-- CREATE INDEX idx_jobs_embedding ON jobs USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);

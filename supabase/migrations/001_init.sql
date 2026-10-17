-- PhDHunter 初始化迁移：岗位表 + 限流表 + RLS

-- 启用 pgvector 扩展
CREATE EXTENSION IF NOT EXISTS vector;

-- ==================== 岗位表 ====================
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(500) NOT NULL,
  organization VARCHAR(500) NOT NULL,
  department VARCHAR(500),
  location_city VARCHAR(100),

  bianzhi_type VARCHAR(50),
  position_type VARCHAR(50),
  institution_type VARCHAR(50),

  degree_requirement VARCHAR(100),
  discipline TEXT[],
  research_direction TEXT,
  salary_range VARCHAR(200),
  benefits TEXT[],

  source_url TEXT NOT NULL,
  publish_date DATE,
  deadline DATE,
  crawl_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'active',

  raw_description TEXT,
  structured_tags JSONB,
  embedding VECTOR(1024),

  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(source_url, organization, title)
);

-- 索引
CREATE INDEX idx_jobs_embedding ON jobs USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_bianzhi ON jobs(bianzhi_type);
CREATE INDEX idx_jobs_city ON jobs(location_city);
CREATE INDEX idx_jobs_institution ON jobs(institution_type);
CREATE INDEX idx_jobs_position ON jobs(position_type);

-- ==================== AI匹配限流表 ====================
CREATE TABLE rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_key VARCHAR(255) NOT NULL,
  used_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_rate_client ON rate_limits(client_key, used_at DESC);

-- ==================== RLS 策略 ====================

-- jobs 表：公开只读
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "jobs_public_read" ON jobs
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- rate_limits 表：仅 service_role 可读写（后端 API 专用）
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- anon/authenticated 无任何权限，只有 service_role 绕过 RLS
-- 不需要额外创建 policy，service_role 默认绕过 RLS

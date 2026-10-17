-- 向量匹配 RPC 函数
CREATE OR REPLACE FUNCTION match_jobs(
  query_embedding VECTOR(1024),
  match_threshold FLOAT DEFAULT 0.0,
  match_count INT DEFAULT 100
)
RETURNS TABLE (
  id UUID,
  title VARCHAR(500),
  organization VARCHAR(500),
  similarity FLOAT
)
LANGUAGE sql STABLE
AS $$
  SELECT
    jobs.id,
    jobs.title,
    jobs.organization,
    1 - (jobs.embedding <=> query_embedding) AS similarity
  FROM jobs
  WHERE jobs.status = 'active'
    AND jobs.embedding IS NOT NULL
    AND 1 - (jobs.embedding <=> query_embedding) > match_threshold
  ORDER BY jobs.embedding <=> query_embedding
  LIMIT match_count;
$$;

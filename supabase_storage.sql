-- 创建战队图片存储桶
INSERT INTO storage.buckets (id, name, public) VALUES ('team-images', 'team-images', true) ON CONFLICT (id) DO NOTHING;

-- 创建战队图片存储桶的 RLS 策略
CREATE POLICY "Team members can upload images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'team-images'
  );

CREATE POLICY "Team members can view images" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'team-images'
  );

CREATE POLICY "Team members can delete images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'team-images'
  );

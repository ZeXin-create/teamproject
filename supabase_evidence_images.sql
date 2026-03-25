-- 创建证据图片存储桶
INSERT INTO storage.buckets (id, name, public) VALUES 
('evidence-images', 'evidence-images', true);

-- 为存储桶添加权限策略
CREATE POLICY "Evidence images are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'evidence-images');

CREATE POLICY "Users can upload evidence images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'evidence-images' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Users can update evidence images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'evidence-images' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Users can delete evidence images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'evidence-images' AND
    auth.role() = 'authenticated'
  );
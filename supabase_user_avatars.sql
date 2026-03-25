-- 创建用户头像存储桶
INSERT INTO storage.buckets (id, name, public) VALUES 
('user-avatars', 'user-avatars', true);

-- 为存储桶添加权限策略
CREATE POLICY "User avatars are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'user-avatars');

CREATE POLICY "Users can upload avatars" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'user-avatars' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Users can update avatars" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'user-avatars' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Users can delete avatars" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'user-avatars' AND
    auth.role() = 'authenticated'
  );
-- 创建存储桶
INSERT INTO storage.buckets (id, name, public) VALUES 
('team-avatars', 'team-avatars', true);

-- 为存储桶添加权限策略
CREATE POLICY "Team avatars are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'team-avatars');

CREATE POLICY "Team leaders can upload avatars" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'team-avatars' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Team leaders can update avatars" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'team-avatars' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Team leaders can delete avatars" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'team-avatars' AND
    auth.role() = 'authenticated'
  );

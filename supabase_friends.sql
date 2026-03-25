-- 创建好友关系表
CREATE TABLE IF NOT EXISTS friends (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 创建唯一约束，确保好友关系是双向唯一的
CREATE UNIQUE INDEX IF NOT EXISTS idx_friends_unique ON friends(
  LEAST(sender_id, receiver_id),
  GREATEST(sender_id, receiver_id)
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_friends_sender_id ON friends(sender_id);
CREATE INDEX IF NOT EXISTS idx_friends_receiver_id ON friends(receiver_id);
CREATE INDEX IF NOT EXISTS idx_friends_status ON friends(status);

-- 启用 Row Level Security
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;

-- 创建策略，允许用户查看自己的好友请求和关系
CREATE POLICY "Users can view their friend requests" ON friends
  FOR SELECT USING (
    sender_id = auth.uid() OR receiver_id = auth.uid()
  );

-- 创建策略，允许用户发送好友请求
CREATE POLICY "Users can send friend requests" ON friends
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND sender_id != receiver_id
  );

-- 创建策略，允许用户更新好友请求状态
CREATE POLICY "Users can update friend requests" ON friends
  FOR UPDATE USING (
    receiver_id = auth.uid() AND status = 'pending'
  );

-- 创建策略，允许用户删除好友关系
CREATE POLICY "Users can delete friend relationships" ON friends
  FOR DELETE USING (
    sender_id = auth.uid() OR receiver_id = auth.uid()
  );

-- 创建存储函数来更新 updated_at 字段
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
CREATE TRIGGER update_friends_updated_at
  BEFORE UPDATE ON friends
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

-- 创建用户在线状态表
CREATE TABLE IF NOT EXISTS user_status (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE PRIMARY KEY,
  status VARCHAR(20) DEFAULT 'offline' CHECK (status IN ('online', 'away', 'offline')),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 启用 Row Level Security
ALTER TABLE user_status ENABLE ROW LEVEL SECURITY;

-- 创建策略，允许用户查看自己和好友的在线状态
CREATE POLICY "Users can view their own and friends' status" ON user_status
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM friends
      WHERE (
        (sender_id = auth.uid() AND receiver_id = user_status.user_id) OR
        (sender_id = user_status.user_id AND receiver_id = auth.uid())
      ) AND status = 'accepted'
    )
  );

-- 创建策略，允许用户更新自己的在线状态
CREATE POLICY "Users can update their own status" ON user_status
  FOR ALL USING (
    user_id = auth.uid()
  );

-- 创建触发器，确保用户状态记录存在
CREATE OR REPLACE FUNCTION ensure_user_status()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_status (user_id, status)
  VALUES (NEW.id, 'offline')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为 profiles 表创建触发器
CREATE TRIGGER after_profile_create
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE PROCEDURE ensure_user_status();

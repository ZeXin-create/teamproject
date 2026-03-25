-- 创建聊天消息表
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_chat_messages_team_id ON chat_messages(team_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);

-- 启用 Row Level Security
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- 创建策略，允许战队成员查看和发送消息
CREATE POLICY "Team members can view chat messages" ON chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_id = chat_messages.team_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can send chat messages" ON chat_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_id = chat_messages.team_id 
      AND user_id = auth.uid()
    )
  );

-- 启用实时更新
ALTER TABLE chat_messages REPLICA IDENTITY FULL;

-- 创建存储函数来更新 updated_at 字段
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
CREATE TRIGGER update_chat_messages_updated_at
  BEFORE UPDATE ON chat_messages
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

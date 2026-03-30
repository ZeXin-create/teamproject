-- 步骤1: 检查并删除旧表
DROP TABLE IF EXISTS chat_messages;
DROP TABLE IF EXISTS chat_sessions;

-- 步骤2: 创建聊天会话表
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  team_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  title VARCHAR(255),
  last_message TEXT
);

-- 步骤3: 创建聊天消息表
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'ai')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 步骤4: 添加外键约束
ALTER TABLE chat_messages 
ADD CONSTRAINT fk_session 
FOREIGN KEY (session_id) 
REFERENCES chat_sessions(id) 
ON DELETE CASCADE;

-- 步骤5: 创建索引
CREATE INDEX idx_chat_sessions_user_team ON chat_sessions(user_id);
CREATE INDEX idx_chat_messages_session ON chat_messages(session_id);
CREATE INDEX idx_chat_messages_created ON chat_messages(created_at);

-- 步骤6: 添加RLS策略
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- 步骤7: 创建策略（先删除可能存在的旧策略）
DROP POLICY IF EXISTS "用户可以管理自己的聊天会话" ON chat_sessions;
DROP POLICY IF EXISTS "用户可以管理自己的聊天消息" ON chat_messages;

CREATE POLICY "用户可以管理自己的聊天会话" ON chat_sessions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "用户可以管理自己的聊天消息" ON chat_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM chat_sessions 
      WHERE chat_sessions.id = chat_messages.session_id 
      AND chat_sessions.user_id = auth.uid()
    )
  );

-- 步骤8: 创建触发器函数
DROP FUNCTION IF EXISTS update_updated_at_column();
CREATE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 步骤9: 创建触发器
DROP TRIGGER IF EXISTS update_chat_sessions_updated_at ON chat_sessions;
CREATE TRIGGER update_chat_sessions_updated_at
  BEFORE UPDATE ON chat_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

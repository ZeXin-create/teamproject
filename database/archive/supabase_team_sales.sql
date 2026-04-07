-- 王者荣耀战队/ID出售系统数据库表设计

-- 创建 team_sales 表
CREATE TABLE team_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goods_type TEXT NOT NULL CHECK (goods_type IN ('TEAM', 'ID', 'TEAM_AND_ID')),
  server_area TEXT NOT NULL CHECK (server_area IN ('IOS_QQ', 'ANDROID_QQ', 'IOS_WECHAT', 'ANDROID_WECHAT')),
  price DECIMAL(10, 2) NOT NULL CHECK (price > 0),
  description TEXT NOT NULL,
  contact TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ON_SALE' CHECK (status IN ('ON_SALE', 'SOLD', 'OFF_SHELF')),
  team_size INTEGER CHECK (team_size > 0),
  team_badge TEXT CHECK (team_badge IN ('NONE', 'THIRD_PLACE', 'SECOND_PLACE', 'FIRST_PLACE')),
  id_name TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 创建索引
CREATE INDEX idx_team_sales_goods_type ON team_sales(goods_type);
CREATE INDEX idx_team_sales_server_area ON team_sales(server_area);
CREATE INDEX idx_team_sales_status ON team_sales(status);
CREATE INDEX idx_team_sales_team_badge ON team_sales(team_badge);

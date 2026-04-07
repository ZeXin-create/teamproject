-- 更新避雷榜单表，添加 region 和 custom_team 字段
ALTER TABLE 避雷榜单
ADD COLUMN region TEXT,
ADD COLUMN custom_team TEXT;

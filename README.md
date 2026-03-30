# 王者荣耀战队管理系统

## 项目概述

王者荣耀战队管理系统是一个专为王者荣耀战队设计的综合管理平台，提供队员管理、分组匹配、AI助手、比赛记录、训练计划等功能，帮助战队提升管理效率和竞技水平。

## 核心功能

### 1. 战队管理
- 战队创建与编辑
- 队员管理与权限控制
- 战队动态与公告
- 战队数据统计与分析

### 2. 队员资料管理
- 个人游戏资料填写（游戏ID、段位、擅长位置、常用英雄等）
- 资料卡片展示与编辑
- 数据持久化存储

### 3. AI 智能助手
- 自动化分组（基于位置、时间、胜率等因素）
- 阵容推荐
- 段位提升建议
- 团队建设建议
- 比赛预测

### 4. 分组管理
- 智能分组生成
- 可视化小组面板
- 拖拽调组功能
- 分组结果保存

### 5. 比赛管理
- 比赛记录管理
- 对手分析
- 胜率统计

### 6. 训练计划
- 训练计划制定
- 训练进度跟踪
- 训练效果分析

### 7. 论坛系统
- 战队内部论坛
- 帖子发布与回复
- 讨论管理

## 技术栈

- **前端**：React + TypeScript + Next.js 14 + Tailwind CSS
- **后端**：Supabase（数据库 + 认证）
- **AI**：智谱AI API
- **状态管理**：React Context + useState
- **图表**：Chart.js

## 安装与部署

### 环境要求

- Node.js 18.0.0 或更高版本
- npm 或 yarn
- Supabase 账号

### 安装步骤

1. **克隆项目**

```bash
git clone <项目仓库地址>
cd team-project
```

2. **安装依赖**

```bash
npm install
# 或
yarn install
```

3. **配置 Supabase**

- 在 Supabase 创建项目
- 复制项目的 `SUPABASE_URL` 和 `SUPABASE_ANON_KEY`
- 创建 `.env.local` 文件并添加以下内容：

```env
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

4. **导入数据库 schema**

运行项目根目录下的 SQL 文件，按顺序导入：

```bash
# 导入基础表结构
psql -h db.<your-project-ref>.supabase.co -U postgres -d postgres -f supabase.sql

# 导入其他扩展表
psql -h db.<your-project-ref>.supabase.co -U postgres -d postgres -f supabase_profiles.sql
psql -h db.<your-project-ref>.supabase.co -U postgres -d postgres -f supabase_team_info.sql
psql -h db.<your-project-ref>.supabase.co -U postgres -d postgres -f supabase_team_grouping.sql
# 其他 SQL 文件依此类推
```

5. **启动开发服务器**

```bash
npm run dev
# 或
yarn dev
```

6. **构建生产版本**

```bash
npm run build
# 或
yarn build

# 启动生产服务器
npm start
# 或
yarn start
```

## 使用指南

### 1. 注册与登录

- 访问 `/auth/register` 注册新账号
- 访问 `/auth/login` 登录现有账号

### 2. 创建或加入战队

- 登录后，访问 `/teams/new` 创建新战队
- 或访问 `/teams/join` 输入战队ID加入现有战队

### 3. 填写个人游戏资料

- 进入战队空间后，访问 `/teams/[id]/profile`
- 填写游戏ID、段位、擅长位置、常用英雄等信息
- 点击保存生成资料卡片

### 4. 使用 AI 助手

- 访问 `/teams/ai-chat` 或在战队空间中点击 AI 助手
- 可以询问：
  - 自动化分组
  - 阵容推荐
  - 段位提升建议
  - 团队建设建议
  - 比赛预测

### 5. 管理战队分组

- 访问 `/teams/[id]/grouping`
- 点击「生成分组」按钮自动生成最优分组
- 可以通过拖拽方式调整分组
- 调整后自动保存结果

### 6. 管理比赛记录

- 访问 `/teams/[id]/data/match-records`
- 添加新的比赛记录
- 查看历史比赛数据和胜率统计

### 7. 制定训练计划

- 访问 `/teams/[id]/data/training-plans`
- 创建新的训练计划
- 跟踪训练进度和效果

## 项目结构

```
app/
├── ai-assistant/        # AI 助手页面
├── auth/                # 认证相关页面
├── components/          # 通用组件
├── context/             # 上下文管理
├── forum/               # 论坛系统
├── friends/             # 好友系统
├── hooks/               # 自定义 hooks
├── lib/                 # 工具库
├── profile/             # 个人资料页面
├── services/            # 服务层
├── styles/              # 样式文件
├── team-sales/          # 战队交易系统
├── teams/               # 战队相关页面
│   ├── [id]/            # 战队详情
│   │   ├── grouping/    # 分组管理
│   │   └── profile/     # 队员资料
│   ├── ai-chat/         # 战队 AI 聊天
│   ├── announcements/   # 战队公告
│   ├── applications/    # 入队申请
│   ├── data/            # 战队数据
│   ├── dynamics/        # 战队动态
│   ├── edit/            # 编辑战队
│   ├── join/            # 加入战队
│   ├── manage/          # 管理战队
│   ├── new/             # 创建战队
│   ├── recruit/         # 招募队员
│   ├── space/           # 战队空间
│   └── training/        # 训练管理
├── tournaments/         #  tournament 系统
├── types/               # TypeScript 类型定义
└── utils/               # 工具函数
```

## API 文档

### 核心服务

1. **AI 服务** (`services/aiService.ts`)
   - `processQuery`: 处理用户查询
   - `generateTeamGroups`: 生成战队分组
   - `recommendFormation`: 推荐阵容
   - `getRankImprovementSuggestions`: 获取段位提升建议
   - `getTeamBuildingSuggestions`: 获取团队建设建议
   - `predictMatchResult`: 预测比赛结果

2. **团队分组服务** (`services/teamGroupingService.ts`)
   - `getPlayerProfile`: 获取队员资料
   - `createOrUpdatePlayerProfile`: 创建或更新队员资料
   - `getTeamPlayerProfiles`: 获取战队所有队员资料
   - `createGroups`: 生成分组
   - `getTeamGroups`: 获取战队分组
   - `updateGroupMembers`: 更新分组队员

3. **战队数据服务** (`services/teamDataService.ts`)
   - `getTeamInfo`: 获取战队信息
   - `updateTeamInfo`: 更新战队信息
   - `getTeamMembers`: 获取战队成员
   - `updatePlayerProfile`: 更新队员资料

## 常见问题

### 1. 无法登录或注册
- 检查网络连接
- 确认 Supabase 配置正确
- 检查浏览器控制台是否有错误信息

### 2. 资料保存失败
- 检查表单是否填写完整
- 确认网络连接正常
- 查看控制台错误信息

### 3. AI 助手无法获取资料
- 确保已填写个人游戏资料
- 检查网络连接
- 尝试刷新页面

### 4. 分组生成失败
- 确保战队成员足够（至少5人）
- 检查队员是否已填写游戏资料
- 查看控制台错误信息

## 版本历史

### v1.0.0 (2026-03-30)
- 初始版本
- 实现核心功能：战队管理、队员资料、AI 助手、分组管理、比赛记录、训练计划、论坛系统
- 优化 AI 分组算法，支持位置多样性和时间重叠匹配
- 实现拖拽调组功能
- 确保常用英雄数据与 AI 接口同步

## 贡献指南

1. **Fork 项目**
2. **创建分支** (`git checkout -b feature/AmazingFeature`)
3. **提交更改** (`git commit -m 'Add some AmazingFeature'`)
4. **推送到分支** (`git push origin feature/AmazingFeature`)
5. **开启 Pull Request**

## 许可证

ISC License

## 联系方式

- 项目维护者：[Your Name]
- 邮箱：[your-email@example.com]
- 项目地址：[https://github.com/your-username/team-project](https://github.com/your-username/team-project)
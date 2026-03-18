# BioLink MVP — 生物医药撮合平台

面向生物医药行业的 BD（商务拓展）撮合平台 MVP，支持企业发布需求、BD 注册虚拟身份、平台审核撮合，并集成 AI 背调报告生成。

---

## 技术架构

| 层次 | 技术 | 说明 |
|------|------|------|
| 前端 | React 18 + Tailwind CSS + React Router | 企业端/BD端/管理端 |
| 后端 | Node.js + Express | REST API |
| 数据库 | PostgreSQL 14+ | 主数据存储 |
| AI | Claude API (Anthropic) | 背调报告生成、匹配评分 |
| 认证 | JWT | 无状态令牌认证 |

---

## 目录结构

```
biotech-mvp/
├── frontend/               # React 前端
│   └── src/
│       ├── components/     # 共用组件（Navbar, ProjectCard, CreditScoreBadge）
│       ├── pages/          # 页面组件
│       │   ├── EnterpriseDashboard.jsx  # 企业端（项目管理 + BD列表）
│       │   ├── BDDashboard.jsx          # BD端（虚拟身份 + 邀请管理）
│       │   ├── AdminDashboard.jsx       # 管理端（审核 + 撮合队列）
│       │   ├── AIReport.jsx             # AI背调报告展示
│       │   ├── Login.jsx / Register.jsx
│       ├── hooks/          # useAuth
│       └── services/       # api.js（axios封装）
├── backend/                # Node.js 后端
│   └── src/
│       ├── routes/         # API路由
│       │   ├── auth.js     # 注册/登录
│       │   ├── projects.js # 项目CRUD + 邀请
│       │   ├── bds.js      # BD档案 + 邀请处理 + 信用分
│       │   ├── admin.js    # 审核 + 撮合队列 + 信用管理
│       │   ├── ai.js       # AI报告生成接口
│       │   └── chat.js     # 平台内聊天中转
│       ├── middleware/     # auth.js, errorHandler.js
│       └── services/
│           ├── db.js       # PostgreSQL连接池
│           └── aiService.js # Claude API调用（背调报告+匹配评分）
└── database/
    ├── schema.sql          # 完整数据库表结构 + 索引 + 触发器
    └── seed.sql            # 测试数据
```

---

## 快速启动

### 1. 数据库初始化

```bash
# 创建数据库
createdb biolink_mvp

# 执行schema
psql biolink_mvp -f database/schema.sql

# 导入测试数据（可选）
psql biolink_mvp -f database/seed.sql
```

### 2. 后端启动

```bash
cd backend
cp .env.example .env
# 编辑 .env，填入数据库连接和 ANTHROPIC_API_KEY
npm install
npm run dev   # 开发模式，自动重启
# 或 npm start（生产）
```

### 3. 前端启动

```bash
cd frontend
npm install
npm start     # http://localhost:3000
```

---

## 核心功能

### 企业端
- 注册企业账号（需平台审核）
- 发布科研合作 / CDMO / 临床试验 / 采购需求
- 浏览已审核 BD 列表，按领域/信用分筛选
- 查看 BD 虚拟身份和 AI 背调报告
- 向目标 BD 发出合作邀请

### BD端
- 注册虚拟身份（匿名代号，真实身份仅平台可见）
- 填写专业能力、专利、论文、成功案例
- 接收/拒绝项目邀请
- 查看自身信用评分和分项详情
- 通过平台聊天频道与企业沟通（身份保护）

### 平台管理端
- 审核 BD 和企业资质（通过/拒绝+理由）
- 管理撮合队列（确认/拒绝 BD接受的邀请）
- 触发/查看 AI 背调报告
- 手动调整 BD 信用评分

### AI背调模块
- **报告生成**：调用 Claude API，分析科研能力、专利成果、论文影响力、行业信用
- **匹配评分**：为每个项目-BD 组合计算 0-100 的匹配分
- **批量排名**：为项目推荐最匹配的 BD 候选人
- **降级方案**：AI 不可用时，自动切换基于规则的计算

---

## 数据库设计

| 表 | 说明 |
|----|------|
| `users` | 所有角色用户（enterprise/bd/admin）|
| `enterprises` | 企业档案，含审核状态 |
| `bd_profiles` | BD虚拟档案，含信用评分 |
| `projects` | 企业发布的项目需求 |
| `project_invitations` | 撮合流程状态机 |
| `ai_reports` | AI背调报告存储 |
| `credit_score_history` | 信用评分变更历史 |
| `chat_rooms` / `chat_messages` | 平台内聊天中转 |
| `audit_logs` | 操作审计日志 |

### 撮合状态流转

```
企业邀请BD → pending
BD接受    → accepted
平台审核  → platform_approved / platform_rejected
合作完成  → completed
```

---

## 信用评分体系

| 维度 | 权重 | 说明 |
|------|------|------|
| 成功案例 | 30分 | 每个案例+5分，最高30分 |
| 行业经验 | 20分 | 每年+3分，最高20分 |
| 专利成果 | 20分 | 每项+2分，最高20分 |
| 论文发表 | 15分 | 每篇+1分，最高15分 |
| 平台行为 | 15分 | 响应率、合规性等 |

---

## 部署建议（低成本MVP）

| 服务 | 推荐 | 费用 |
|------|------|------|
| 后端 | Railway / Render | 免费层起 |
| 数据库 | Supabase / Railway PostgreSQL | 免费层起 |
| 前端 | Vercel / Netlify | 免费 |
| AI | Anthropic Claude API | 按量计费 |

---

## 环境变量

参考 `backend/.env.example`，关键配置：
- `ANTHROPIC_API_KEY`：Claude API 密钥
- `DATABASE_URL`：PostgreSQL 连接字符串
- `JWT_SECRET`：JWT 签名密钥（生产环境使用随机长字符串）

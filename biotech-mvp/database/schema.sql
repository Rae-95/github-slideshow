-- ============================================================
-- BioLink MVP 数据库设计
-- PostgreSQL 14+
-- ============================================================

-- 启用UUID扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 用户表（所有角色共用）────────────────────────────────
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(20) NOT NULL CHECK (role IN ('enterprise', 'bd', 'admin')),
  display_name  VARCHAR(100) NOT NULL,
  status        VARCHAR(20) NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'pending', 'suspended')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ── 企业档案 ──────────────────────────────────────────────
CREATE TABLE enterprises (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_name  VARCHAR(200) NOT NULL,
  credit_code   VARCHAR(50),                   -- 统一社会信用代码
  industry      VARCHAR(100),                  -- 细分行业
  description   TEXT,
  website       VARCHAR(255),
  status        VARCHAR(20) NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')),
  reject_reason TEXT,
  verified_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_enterprises_user_id ON enterprises(user_id);
CREATE INDEX idx_enterprises_status ON enterprises(status);

-- ── BD虚拟档案 ────────────────────────────────────────────
CREATE TABLE bd_profiles (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_name         VARCHAR(100) NOT NULL,      -- 平台展示代号（匿名）
  summary           TEXT,                       -- 职业简介
  expertise_tags    JSONB NOT NULL DEFAULT '[]', -- 专业领域标签数组
  years_experience  INTEGER NOT NULL DEFAULT 0,
  patent_count      INTEGER NOT NULL DEFAULT 0,
  paper_count       INTEGER NOT NULL DEFAULT 0,
  success_cases     INTEGER NOT NULL DEFAULT 0,  -- 成功撮合案例数
  achievements      TEXT,                        -- 主要成就（AI背调使用）
  linkedin_url      VARCHAR(255),
  credit_score      INTEGER NOT NULL DEFAULT 60  -- 信用评分 0-100
                    CHECK (credit_score >= 0 AND credit_score <= 100),
  status            VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')),
  reject_reason     TEXT,
  verified_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_bd_profiles_user_id ON bd_profiles(user_id);
CREATE INDEX idx_bd_profiles_status ON bd_profiles(status);
CREATE INDEX idx_bd_profiles_credit_score ON bd_profiles(credit_score DESC);
CREATE INDEX idx_bd_profiles_expertise ON bd_profiles USING GIN(expertise_tags);

-- ── 项目表 ────────────────────────────────────────────────
CREATE TABLE projects (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enterprise_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title         VARCHAR(300) NOT NULL,
  type          VARCHAR(50) NOT NULL
                CHECK (type IN ('research', 'cdmo', 'clinical', 'procurement', 'other')),
  description   TEXT NOT NULL,
  requirements  TEXT,
  budget        VARCHAR(100),
  duration      VARCHAR(100),
  tags          JSONB NOT NULL DEFAULT '[]',
  status        VARCHAR(20) NOT NULL DEFAULT 'open'
                CHECK (status IN ('draft', 'open', 'matching', 'closed')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_projects_enterprise_id ON projects(enterprise_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_type ON projects(type);
CREATE INDEX idx_projects_tags ON projects USING GIN(tags);

-- ── 项目邀请/撮合表 ───────────────────────────────────────
CREATE TABLE project_invitations (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  enterprise_id UUID NOT NULL REFERENCES users(id),
  bd_id         UUID NOT NULL REFERENCES bd_profiles(id),
  status        VARCHAR(30) NOT NULL DEFAULT 'pending'
                CHECK (status IN (
                  'pending',           -- 企业已邀请，等待BD回复
                  'accepted',          -- BD已接受，等待平台确认
                  'declined',          -- BD拒绝
                  'platform_approved', -- 平台确认撮合
                  'platform_rejected', -- 平台拒绝撮合
                  'completed',         -- 合作完成
                  'cancelled'          -- 中途取消
                )),
  chat_room_id  UUID,                  -- 关联聊天室
  match_score   INTEGER,              -- AI匹配分
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(project_id, bd_id)           -- 同一项目-BD组合唯一
);

CREATE INDEX idx_project_invitations_project ON project_invitations(project_id);
CREATE INDEX idx_project_invitations_bd ON project_invitations(bd_id);
CREATE INDEX idx_project_invitations_enterprise ON project_invitations(enterprise_id);
CREATE INDEX idx_project_invitations_status ON project_invitations(status);

-- ── AI背调报告表 ──────────────────────────────────────────
CREATE TABLE ai_reports (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bd_id          UUID NOT NULL REFERENCES bd_profiles(id) ON DELETE CASCADE,
  overall_score  INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),
  sections       JSONB NOT NULL DEFAULT '{}', -- 各维度文字分析
  scores         JSONB NOT NULL DEFAULT '{}', -- 各维度数值评分
  risk_flags     JSONB NOT NULL DEFAULT '[]', -- 风险提示列表
  model_used     VARCHAR(100) DEFAULT 'claude-opus-4-6',
  generated_by   UUID REFERENCES users(id),
  generated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_ai_reports_bd_id ON ai_reports(bd_id);
CREATE INDEX idx_ai_reports_generated_at ON ai_reports(generated_at DESC);

-- ── 信用评分详情表 ────────────────────────────────────────
CREATE TABLE credit_score_details (
  id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bd_id    UUID NOT NULL REFERENCES bd_profiles(id) ON DELETE CASCADE,
  breakdown JSONB NOT NULL DEFAULT '{}',  -- 分项评分详情
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(bd_id)
);

-- ── 信用评分历史 ──────────────────────────────────────────
CREATE TABLE credit_score_history (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bd_id        UUID NOT NULL REFERENCES bd_profiles(id) ON DELETE CASCADE,
  score        INTEGER NOT NULL,
  prev_score   INTEGER,
  reason       TEXT,
  event_type   VARCHAR(50) DEFAULT 'manual', -- manual, ai_update, case_complete, complaint
  updated_by   UUID REFERENCES users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_credit_history_bd ON credit_score_history(bd_id);
CREATE INDEX idx_credit_history_date ON credit_score_history(created_at DESC);

-- ── 聊天室表 ──────────────────────────────────────────────
CREATE TABLE chat_rooms (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id    UUID REFERENCES projects(id),
  enterprise_id UUID NOT NULL REFERENCES users(id),
  bd_id         UUID NOT NULL REFERENCES bd_profiles(id),
  type          VARCHAR(20) DEFAULT 'match'
                CHECK (type IN ('match', 'official', 'support')),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chat_rooms_enterprise ON chat_rooms(enterprise_id);
CREATE INDEX idx_chat_rooms_bd ON chat_rooms(bd_id);

-- 添加外键关联到邀请表
ALTER TABLE project_invitations
  ADD CONSTRAINT fk_invitation_chat_room
  FOREIGN KEY (chat_room_id) REFERENCES chat_rooms(id);

-- ── 消息表 ────────────────────────────────────────────────
CREATE TABLE chat_messages (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id     UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id   UUID NOT NULL REFERENCES users(id),
  content     TEXT NOT NULL,
  is_system   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_room ON chat_messages(room_id, created_at DESC);

-- ── 审计日志 ──────────────────────────────────────────────
CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES users(id),
  action      VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id   UUID,
  details     JSONB,
  ip_address  INET,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_date ON audit_logs(created_at DESC);

-- ── 初始化管理员账号 ──────────────────────────────────────
-- 密码: Admin@123456（请在生产环境修改）
INSERT INTO users (email, password_hash, role, display_name, status)
VALUES (
  'admin@biolink.com',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBpj2NgTT/W5lW', -- bcrypt hash
  'admin',
  '平台管理员',
  'active'
);

-- ── 常用视图 ──────────────────────────────────────────────

-- BD综合视图（含用户信息）
CREATE VIEW v_bd_profiles AS
SELECT
  b.*,
  u.email,
  u.created_at as registered_at,
  ar.overall_score as ai_score,
  ar.generated_at as last_report_at,
  COUNT(pi.id) FILTER (WHERE pi.status = 'completed') as completed_matches
FROM bd_profiles b
JOIN users u ON b.user_id = u.id
LEFT JOIN ai_reports ar ON ar.bd_id = b.id
LEFT JOIN project_invitations pi ON pi.bd_id = b.id
GROUP BY b.id, u.email, u.created_at, ar.overall_score, ar.generated_at;

-- 项目概览视图
CREATE VIEW v_projects AS
SELECT
  p.*,
  u.display_name as enterprise_name,
  COUNT(DISTINCT pi.bd_id) as invited_bd_count,
  COUNT(DISTINCT pi.bd_id) FILTER (WHERE pi.status = 'platform_approved') as matched_bd_count
FROM projects p
JOIN users u ON p.enterprise_id = u.id
LEFT JOIN project_invitations pi ON pi.project_id = p.id
GROUP BY p.id, u.display_name;

-- ── 触发器：自动更新 updated_at ──────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_enterprises_updated_at BEFORE UPDATE ON enterprises FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_bd_profiles_updated_at BEFORE UPDATE ON bd_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_invitations_updated_at BEFORE UPDATE ON project_invitations FOR EACH ROW EXECUTE FUNCTION update_updated_at();

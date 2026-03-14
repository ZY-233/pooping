# Supabase 接入说明（单迁移版）

## 1. 配置环境变量
将 `.env.example` 复制为 `.env.local`，并填写 Supabase 项目信息：
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`（用于服务端健康检查与受信任任务，不可暴露给客户端）

## 2. 执行 migration
在 Supabase SQL Editor 执行：
- `supabase/migrations/20260314150000_init_all_in_one.sql`

该脚本会创建并配置：
- 核心表：`user_profiles`、`poop_records`、`user_settings`
- 社交表：`friend_relations`、`friend_share_settings`、`friend_interactions`、`friend_invites`、`friend_aliases`
- 轻状态表：`daily_statuses`
- 必要索引、`updated_at` 触发器与基础 RLS 策略
- 噗友关系库层约束：任一用户同一时刻最多 1 条 `active` 关系
- 受控可见能力：RPC `get_friend_visible_summary`、`get_relation_peer_profile`
- 一致性约束：`poop_records` 与 `daily_statuses` 同日互斥（DB 触发器）

说明：
- 当前 `supabase/migrations` 目录仅保留单文件迁移，避免多版本执行顺序导致环境分叉。
- 若数据库已存在旧结构，建议先在测试库执行并验证，再应用到正式库。

## 3. Next.js 接入入口
- 浏览器端 client：`src/lib/supabase/client.ts`
- 服务端 client：`src/lib/supabase/server.ts`
- 数据库类型：`src/types/database.ts`
- 核心服务：
  - `src/services/record.service.ts`
  - `src/services/profile.service.ts`
  - `src/services/settings.service.ts`
  - `src/services/daily-status.service.ts`

## 4. 连通性检查
启动项目后访问：
- `GET /api/health/supabase`

返回 `ok: true` 表示 Next.js 已成功连接 Supabase 且可以访问数据库表。

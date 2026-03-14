# 今日顺顺

移动端优先的轻量记录应用（非医疗用途）。

## 技术栈

- Next.js (App Router) + TypeScript
- Tailwind CSS + shadcn/ui + Framer Motion
- Supabase (Auth / Postgres / RLS)

## 本地启动

```bash
npm install
npm run dev
```

## 环境变量

复制 `.env.example` 为 `.env.local`：

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## PWA 与 SEO

已配置：

- `src/app/manifest.ts`
- `public/sw.js`
- `src/app/robots.ts`
- `src/app/sitemap.ts`
- `public/icons/icon-192.svg`
- `public/icons/icon-512.svg`

## 上线前检查

```bash
npm run lint
npm run build
```

请确认：

- Supabase RLS 与 migration 已执行
- Supabase Auth 已开启匿名登录与邮箱 Magic Link
- `NEXT_PUBLIC_SITE_URL` 已设置为正式域名
- Vercel 域名已绑定，HTTPS 正常

## 说明

- 本产品仅用于日常记录，不提供医疗诊断或治疗建议。

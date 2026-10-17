# سامانه مدیریت پرونده پرسنلی

MVP محلی و غیرتولیدی برای سازمان‌دهی پرونده‌های پرسنلی فارسی/RTL. این پروژه به سرور آینده، DNS، VPN یا پایگاه‌داده تولیدی متصل نمی‌شود.

## راه‌اندازی محلی
1. PostgreSQL 17 محلی را اجرا و یک نقش/پایگاه‌داده اختصاصی ایجاد کنید.
2. فایل env.example را به .env کپی و فقط مقادیر محلی را تنظیم کنید.
3. npm install و سپس npm run db:generate را اجرا کنید.
4. npm run db:migrate و npm run db:seed را اجرا کنید.
5. npm run dev و سپس http://localhost:3000 را باز کنید.

## ساختار داده و امنیت
- Prisma/PostgreSQL با روابط نرمال‌شده، حذف منطقی کارکنان و ایندکس‌های جست‌وجو.
- نشست هش‌شده در کوکی HttpOnly، Argon2، RBAC سمت سرور و رویدادهای audit.
- اسناد خصوصی در DOCUMENT_STORAGE_PATH، خارج از public، با MIME و سقف ۱۰ مگابایت.
- خروجی Excel محدود به نقش‌های HR/مدیر ارشد/حسابرسی و ورودی‌های فرمول‌مانند خنثی می‌شوند.
- داده‌های seed ساختگی‌اند؛ رمز اولیه باید فقط در محیط محلی تنظیم و فوراً تغییر کند.

## بررسی
npm run typecheck، npm test، npm run build

## وضعیت باز
- فعال‌سازی migration/seed به credential اختصاصی PostgreSQL محلی نیاز دارد؛ از رمز یا دیتابیس تولیدی استفاده نکنید.
- PDF فارسی به فونت سازمانی تأییدشده و تست رندر نیاز دارد؛ فعلاً Excel در MVP فعال است.
- فرم‌های کامل قرارداد/تحصیلات/اصلاحات و صفحات مدیریت کاربران در گام بعدی توسعه می‌یابند؛ API پایه و مدل‌ها ایجاد شده‌اند.

## آینده Windows Server 2025
نصب runtime و PostgreSQL با نقش اختصاصی، ذخیره‌سازی خصوصی جدا از web root، TLS پشت VPN، firewall فقط برای VPN، backup روی دیسک مستقل، آزمون restore، مدیریت secrets خارج از Git، مهاجرت نسخه‌بندی‌شده، rollback از backup/نسخه قبلی. هرگونه اتصال یا استقرار نیازمند تأیید صریح است.

## Prisma migration privileges
`prisma migrate dev` uses a shadow database and may require `CREATEDB` for the local `admin` role. A separately provisioned shadow database configured explicitly in Prisma can avoid granting `CREATEDB`; `prisma migrate deploy` applies committed migrations without creating a shadow database. Do not use either URL for production.

## Verified local database procedure

The application reads `DATABASE_URL` from the process environment or a local `.env` file. Prisma uses PostgreSQL and does not consume alternate variable names. The committed `.env.example` contains placeholders only; never commit `.env` or real credentials.

For an isolated development installation, an administrator must first confirm that `charb_personnel_dev` and `charb_personnel_app` do not belong to another application, then create only the missing database and role. Grant the application role only the privileges required by the schema and runtime. Do not drop, reset, recreate, or reuse an existing database, and do not change PostgreSQL authentication policy.

After the administrator supplies the local password through the approved secret mechanism, configure `DATABASE_URL` for the dedicated local target:

```text
postgresql://charb_personnel_app:<local-secret>@127.0.0.1:5432/charb_personnel_dev?schema=public
```

Do not place the real value in source, command-line arguments, logs, reports, or Git. Verify the connection with the application’s actual environment before running migrations. `npm run db:migrate` is a development workflow and may require a separately authorized migration/shadow-database capability; never grant or use production access to satisfy it. Where committed migrations are already complete and the target is approved, use the repository’s non-destructive deployment workflow instead of a reset.

Set `INITIAL_ADMIN_PASSWORD` locally to a synthetic password of at least 12 characters before `npm run db:seed`. The seed is restricted in code to localhost and the database name `charb_personnel_dev`, creates fictional records, and is designed to be rerunnable without replacing existing rows. Use only `INITIAL_ADMIN_EMAIL` values intended for this isolated development target.

### `P1000` troubleshooting

`P1000` means PostgreSQL rejected authentication; an open TCP port proves only network reachability. Check the exact `DATABASE_URL` variable name, local target database, role, and password through the approved administrative interface. Do not retry guessed passwords. If no authorized administrator connection is available, stop database-changing operations and have an administrator provision the isolated role/database and configure the secret securely.

## Verification commands

```text
npm run typecheck
npm test
npm run build
npm audit --offline --audit-level=high
npm run db:generate
npm run db:migrate
npm run db:seed
```

`npm run lint` is currently not a non-interactive check because this repository has no ESLint configuration and the installed Next.js command opens setup interactively. Do not run interactive setup or install a linter without an explicit dependency/configuration decision.

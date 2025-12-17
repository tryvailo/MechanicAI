# Implementation Guide: MechanicAI Commercial Release

Детальный план реализации каждого пункта TODO_COMMERCIAL.md для Vercel архитектуры.

---

## 📊 Оценка сложности и рисков

### Шкала сложности
- 🟢 **Easy** — Стандартная интеграция, хорошая документация
- 🟡 **Medium** — Требует кастомной логики, возможны edge cases
- 🔴 **Hard** — Сложная архитектура, много зависимостей, мало примеров

### Шкала рисков
- ⚪ **Low** — Проверенные решения, откат прост
- 🟡 **Medium** — Зависимость от внешних API, возможны задержки
- 🔴 **High** — Критично для бизнеса, сложно откатить, vendor lock-in

---

## 🔴 P0: Critical

| ID | Задача | Сложность | Риски | Комментарий |
|----|--------|-----------|-------|-------------|
| **AUTH-001** | Аутентификация | 🟢 Easy | ⚪ Low | Clerk имеет отличную документацию и Vercel интеграцию. 90% работы — copy-paste из docs |
| **DB-001** | База данных | 🟡 Medium | 🟡 Medium | Простая настройка, но **миграция localStorage → DB требует осторожности**. Риск потери данных пользователей |
| **PAY-001** | Stripe платежи | 🟡 Medium | 🔴 High | Webhooks сложны в отладке. **Ошибка = потеря денег или доступа**. Нужно много тестирования |
| **SEC-001** | Rate Limiting | 🟢 Easy | ⚪ Low | Upstash имеет готовый SDK. 2-3 часа работы |
| **SEC-002** | Input Validation | 🟢 Easy | 🟡 Medium | Zod прост, но нужно **покрыть ВСЕ endpoints**. Пропущенный endpoint = уязвимость |
| **CORE-001** | Гараж пользователя | 🟢 Easy | ⚪ Low | Стандартный CRUD. VIN decoder через бесплатный NHTSA API |
| **CORE-002** | История в облаке | 🟡 Medium | 🟡 Medium | Синхронизация localStorage ↔ DB может создать **конфликты данных** |

### Детали рисков P0:

**PAY-001 — Почему 🔴 High:**
- Webhook не дошёл → пользователь заплатил, но подписка не активировалась
- Неправильная обработка `customer.subscription.deleted` → пользователь платит, но доступ заблокирован
- Тестировать нужно ВСЕ сценарии: успех, отмена, refund, failed payment, card update

**DB-001 — Риск миграции:**
```
Сценарий: Пользователь имеет 50 сканов в localStorage
1. Логинится → запускается миграция
2. Интернет обрывается на 30-м скане
3. localStorage очищен, в DB только 30 сканов
→ Потеряно 20 сканов
```
**Решение:** Не удалять localStorage до подтверждения успешной миграции

---

## 🟡 P1: High Priority

| ID | Задача | Сложность | Риски | Комментарий |
|----|--------|-----------|-------|-------------|
| **MECH-001** | Каталог запчастей | 🔴 Hard | 🔴 High | TecDoc API дорогой (~€500/мес), сложная документация, **долгий onboarding** (2-4 недели на получение доступа) |
| **MECH-002** | Совместимость деталей | 🔴 Hard | 🟡 Medium | Зависит от MECH-001. Данные TecDoc не всегда точны — нужна **оговорка "проверьте у продавца"** |
| **MECH-003** | Источники в ответах | 🟡 Medium | ⚪ Low | Prompt engineering. Риск: AI может **галлюцинировать источники** |
| **MECH-004** | Рейтинги брендов | 🟡 Medium | 🟡 Medium | Откуда брать данные? Нет открытого API. Нужно **собирать вручную или парсить** |
| **PRED-001** | Сервисные интервалы | 🟡 Medium | 🟡 Medium | Данные разрозненны. Для каждой марки свои интервалы. **Ошибка = неправильная рекомендация ТО** |
| **PRED-002** | Push-уведомления | 🟡 Medium | ⚪ Low | Web Push API хорошо документирован. Vercel Cron бесплатен до 2 jobs |
| **VIS-001** | Видео-анализ | 🔴 Hard | 🟡 Medium | Client-side video processing **тяжёл для слабых телефонов**. Frame extraction может занять 10-30 сек |
| **VIS-002** | Аудио-анализ | 🟡 Medium | 🟡 Medium | Whisper хорош с речью, но **звуки двигателя — не речь**. Точность классификации ~60-70% |

### Детали рисков P1:

**MECH-001 — Почему 🔴 Hard + 🔴 High:**
```
Проблемы:
1. TecDoc требует бизнес-контракт (не self-service)
2. Onboarding 2-4 недели
3. Стоимость €300-1000/мес в зависимости от объёма
4. Альтернатива Autodoc — тоже требует контракт
5. Бесплатных API каталогов запчастей НЕТ
```
**Альтернатива:** Начать с парсинга открытых источников или партнёрства с локальным магазином запчастей

**VIS-001 — Проблемы производительности:**
```javascript
// На iPhone 12: ~3 сек на кадр
// На бюджетном Android: ~8-15 сек на кадр
// 10 кадров = 30 сек - 2.5 мин ожидания
```
**Решение:** 
- Показывать прогресс-бар
- Обрабатывать в Web Worker
- Уменьшить разрешение кадров

**VIS-002 — Ограничения Whisper:**
```
Whisper обучен на речи, не на:
- Стуке клапанов
- Скрипе ремня
- Гуле подшипника

Whisper услышит: "тук-тук-тук" или тишину
GPT-4 должен интерпретировать контекст от пользователя
```
**Решение:** Просить пользователя **описывать звук голосом** во время записи

---

## 🟢 P2: Medium Priority

| ID | Задача | Сложность | Риски | Комментарий |
|----|--------|-----------|-------|-------------|
| **UX-001** | Onboarding | 🟢 Easy | ⚪ Low | Стандартный wizard. Много готовых библиотек |
| **UX-002** | PWA | 🟡 Medium | ⚪ Low | next-pwa работает, но **кэширование API может создать проблемы** с устаревшими данными |
| **UX-003** | Dark mode | 🟢 Easy | ⚪ Low | Tailwind dark: prefix. Проверить Google Maps (нужен отдельный mapId) |
| **UX-004** | i18n | 🟡 Medium | 🟡 Medium | next-intl прост, но **перевод контента = много ручной работы**. 4 языка × 200 строк = 800 переводов |
| **GEO-001** | Parkopedia | 🟡 Medium | 🟡 Medium | API платный. Нужен контракт. Альтернатива: только Google Places |
| **GEO-002** | Парковка по маршруту | 🟡 Medium | ⚪ Low | Google Directions API + Places. Straightforward |
| **MON-001** | Sentry | 🟢 Easy | ⚪ Low | Wizard настраивает за 5 минут |
| **MON-002** | PostHog | 🟢 Easy | ⚪ Low | Copy-paste интеграция |
| **MON-003** | Logging | 🟡 Medium | ⚪ Low | Vercel Logs бесплатны. Для advanced — Axiom или Logtail |

---

## 🔵 P3: Low Priority

| ID | Задача | Сложность | Риски | Комментарий |
|----|--------|-----------|-------|-------------|
| **GRW-001** | Referral | 🟡 Medium | ⚪ Low | Простая логика, но нужен fraud detection |
| **GRW-002** | Social sharing | 🟢 Easy | ⚪ Low | Share API + OG meta tags |
| **GRW-003** | Community forum | 🔴 Hard | 🟡 Medium | Лучше использовать готовое: Discord или интеграция с существующим форумом |
| **GRW-004** | Gamification | 🟡 Medium | ⚪ Low | Fun, но отвлекает от core product |
| **B2B-001** | API для партнёров | 🔴 Hard | 🔴 High | Документация, rate limits, billing, support — много работы |
| **B2B-002** | White-label | 🔴 Hard | 🔴 High | Требует полного рефакторинга theming и multi-tenancy |
| **B2B-003** | СТО dashboard | 🔴 Hard | 🟡 Medium | Отдельный продукт по сути |
| **MOB-001** | React Native | 🔴 Hard | 🔴 High | 2-3 месяца работы. Лучше сначала валидировать PWA |
| **MOB-002** | Deep links | 🟡 Medium | ⚪ Low | Universal Links / App Links — документация есть |
| **MOB-003** | Native camera | 🟡 Medium | ⚪ Low | Expo Camera API |

---

## 📈 Матрица приоритизации

```
          СЛОЖНОСТЬ
          Low    Medium    High
    ┌─────────────────────────────┐
 H  │ SEC-001  │ PAY-001 │ MECH-001│  🔴 Делать осторожно
 I  │ AUTH-001 │ DB-001  │ VIS-001 │     или искать альтернативы
 G  │          │ SEC-002 │         │
 H  ├──────────┼─────────┼─────────┤
    │ CORE-001 │ PRED-001│ MECH-002│  🟡 Планировать буфер
 R  │ CORE-002 │ VIS-002 │         │     времени
 I  │          │ MECH-003│         │
 S  ├──────────┼─────────┼─────────┤
 K  │ UX-001   │ UX-002  │         │  🟢 Безопасно делать
    │ MON-001  │ UX-004  │         │
 L  │ MON-002  │ PRED-002│         │
 O  │ UX-003   │         │         │
 W  └─────────────────────────────┘
```

---

## ⚠️ Главные риски проекта

### 1. **Vendor Lock-in**
- Clerk, Supabase, Vercel — если один упадёт или поднимет цены, миграция болезненна
- **Митигация:** Абстракции над SDK, готовность к миграции

### 2. **API Costs Explosion**
```
Сценарий: 1000 DAU, каждый делает 5 сканов
= 5000 GPT-4o Vision calls/day
= $0.01 × 5000 = $50/day = $1500/month только на AI
```
- **Митигация:** Жёсткие лимиты в Free tier, кэширование похожих запросов

### 3. **Ответственность за диагноз**
- Если AI скажет "всё ок", а машина сломается — кто виноват?
- **Митигация:** Disclaimer везде: "Не заменяет профессиональную диагностику"

### 4. **MECH-001 Blockers**
- Без каталога запчастей продукт теряет 40% ценности
- TecDoc onboarding может занять месяц
- **Митигация:** Начать процесс получения API сейчас, параллельно с разработкой

---

## 🎯 Рекомендуемый порядок

1. **Неделя 1-2:** AUTH-001 + DB-001 + SEC-001 (низкий риск, основа)
2. **Неделя 3-4:** PAY-001 + CORE-001 (деньги + ценность)
3. **Параллельно:** Начать onboarding TecDoc/Autodoc
4. **Неделя 5-6:** CORE-002 + SEC-002 + MON-001
5. **Неделя 7-8:** VIS-001 + VIS-002 (wow-features)
6. **После запуска:** MECH-* (когда получим API доступ)

---

## 🔴 P0: Critical

---

### AUTH-001: Аутентификация пользователей (8h)

**Рекомендация:** Clerk (лучше интегрируется с Vercel)

**Шаги:**

1. **Установка:**
   ```bash
   pnpm add @clerk/nextjs
   ```

2. **Настройка Clerk:**
   - Создать проект на [clerk.com](https://clerk.com)
   - Добавить в `.env.local`:
     ```env
     NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
     CLERK_SECRET_KEY=sk_...
     NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
     NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
     ```

3. **Обернуть приложение:**
   ```tsx
   // app/layout.tsx
   import { ClerkProvider } from '@clerk/nextjs'
   
   export default function RootLayout({ children }) {
     return (
       <ClerkProvider>
         <html>
           <body>{children}</body>
         </html>
       </ClerkProvider>
     )
   }
   ```

4. **Создать страницы авторизации:**
   ```
   app/
   ├── sign-in/[[...sign-in]]/page.tsx
   └── sign-up/[[...sign-up]]/page.tsx
   ```

5. **Middleware для защиты роутов:**
   ```ts
   // middleware.ts
   import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
   
   const isProtectedRoute = createRouteMatcher(['/dashboard(.*)'])
   
   export default clerkMiddleware((auth, req) => {
     if (isProtectedRoute(req)) auth().protect()
   })
   ```

6. **Использование в компонентах:**
   ```tsx
   import { useAuth, useUser } from '@clerk/nextjs'
   ```

7. **Добавить переменные в Vercel Dashboard → Environment Variables**

---

### DB-001: Персистентное хранение данных (12h)

**Рекомендация:** Supabase (хорошо работает с Vercel)

**Шаги:**

1. **Установка:**
   ```bash
   pnpm add @supabase/supabase-js
   ```

2. **Создать проект на [supabase.com](https://supabase.com)**

3. **Добавить env переменные:**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   SUPABASE_SERVICE_ROLE_KEY=eyJ...  # только серверная
   ```

4. **Создать клиент:**
   ```ts
   // lib/supabase/client.ts
   import { createBrowserClient } from '@supabase/ssr'
   
   export function createClient() {
     return createBrowserClient(
       process.env.NEXT_PUBLIC_SUPABASE_URL!,
       process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
     )
   }
   ```

5. **Серверный клиент:**
   ```ts
   // lib/supabase/server.ts
   import { createServerClient } from '@supabase/ssr'
   import { cookies } from 'next/headers'
   ```

6. **Схема базы данных (SQL в Supabase Dashboard):**
   ```sql
   -- Users (синк с Clerk через webhook)
   CREATE TABLE users (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     clerk_id TEXT UNIQUE NOT NULL,
     email TEXT,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   
   -- Vehicles (гараж)
   CREATE TABLE vehicles (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID REFERENCES users(id) ON DELETE CASCADE,
     vin TEXT,
     make TEXT,
     model TEXT,
     year INTEGER,
     mileage INTEGER,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   
   -- Scans (история сканирований)
   CREATE TABLE scans (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID REFERENCES users(id) ON DELETE CASCADE,
     vehicle_id UUID REFERENCES vehicles(id),
     image_url TEXT,
     analysis JSONB,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   
   -- Chats (история чатов)
   CREATE TABLE chats (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID REFERENCES users(id) ON DELETE CASCADE,
     vehicle_id UUID REFERENCES vehicles(id),
     messages JSONB,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   
   -- RLS политики
   ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
   ALTER TABLE scans ENABLE ROW LEVEL SECURITY;
   ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
   ```

7. **Webhook Clerk → Supabase для синхронизации users:**
   ```ts
   // app/api/webhooks/clerk/route.ts
   import { Webhook } from 'svix'
   
   export async function POST(req: Request) {
     // Верификация webhook + создание user в Supabase
   }
   ```

---

### PAY-001: Платежная система (16h)

**Шаги:**

1. **Установка:**
   ```bash
   pnpm add stripe @stripe/stripe-js
   ```

2. **Настройка Stripe:**
   - Создать аккаунт на [stripe.com](https://stripe.com)
   - Создать Products: Free, Pro ($9.99/mo), Business ($29.99/mo)
   - Добавить env:
     ```env
     STRIPE_SECRET_KEY=sk_...
     NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
     STRIPE_WEBHOOK_SECRET=whsec_...
     ```

3. **Создать серверный клиент:**
   ```ts
   // lib/stripe.ts
   import Stripe from 'stripe'
   
   export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
     apiVersion: '2024-10-28.acacia'
   })
   ```

4. **API для создания checkout:**
   ```ts
   // app/api/stripe/checkout/route.ts
   export async function POST(req: Request) {
     const { priceId, userId } = await req.json()
     
     const session = await stripe.checkout.sessions.create({
       mode: 'subscription',
       payment_method_types: ['card'],
       line_items: [{ price: priceId, quantity: 1 }],
       success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true`,
       cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
       metadata: { userId }
     })
     
     return Response.json({ url: session.url })
   }
   ```

5. **Webhook для обработки событий:**
   ```ts
   // app/api/webhooks/stripe/route.ts
   export async function POST(req: Request) {
     const body = await req.text()
     const sig = headers().get('stripe-signature')!
     
     const event = stripe.webhooks.constructEvent(
       body, sig, process.env.STRIPE_WEBHOOK_SECRET!
     )
     
     switch (event.type) {
       case 'checkout.session.completed':
         // Активировать подписку в DB
         break
       case 'customer.subscription.deleted':
         // Деактивировать подписку
         break
     }
   }
   ```

6. **Customer Portal для управления подпиской:**
   ```ts
   // app/api/stripe/portal/route.ts
   const session = await stripe.billingPortal.sessions.create({
     customer: customerId,
     return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`
   })
   ```

7. **Добавить колонку subscription в users:**
   ```sql
   ALTER TABLE users ADD COLUMN subscription_tier TEXT DEFAULT 'free';
   ALTER TABLE users ADD COLUMN stripe_customer_id TEXT;
   ALTER TABLE users ADD COLUMN subscription_ends_at TIMESTAMPTZ;
   ```

---

### SEC-001: Rate Limiting (4h)

**Рекомендация:** Upstash Redis (serverless, идеально для Vercel)

**Шаги:**

1. **Установка:**
   ```bash
   pnpm add @upstash/ratelimit @upstash/redis
   ```

2. **Создать Redis на [upstash.com](https://upstash.com):**
   ```env
   UPSTASH_REDIS_REST_URL=https://...
   UPSTASH_REDIS_REST_TOKEN=...
   ```

3. **Создать rate limiter:**
   ```ts
   // lib/rate-limit.ts
   import { Ratelimit } from '@upstash/ratelimit'
   import { Redis } from '@upstash/redis'
   
   const redis = new Redis({
     url: process.env.UPSTASH_REDIS_REST_URL!,
     token: process.env.UPSTASH_REDIS_REST_TOKEN!
   })
   
   // 10 requests per 10 seconds для бесплатных
   export const freeLimiter = new Ratelimit({
     redis,
     limiter: Ratelimit.slidingWindow(10, '10 s'),
     prefix: 'ratelimit:free'
   })
   
   // 100 requests per 10 seconds для Pro
   export const proLimiter = new Ratelimit({
     redis,
     limiter: Ratelimit.slidingWindow(100, '10 s'),
     prefix: 'ratelimit:pro'
   })
   ```

4. **Middleware или использование в API:**
   ```ts
   // app/api/chat/route.ts
   import { freeLimiter } from '@/lib/rate-limit'
   import { auth } from '@clerk/nextjs'
   
   export async function POST(req: Request) {
     const { userId } = auth()
     const identifier = userId || req.headers.get('x-forwarded-for') || 'anonymous'
     
     const { success, remaining, reset } = await freeLimiter.limit(identifier)
     
     if (!success) {
       return new Response('Too many requests', {
         status: 429,
         headers: {
           'X-RateLimit-Remaining': remaining.toString(),
           'X-RateLimit-Reset': reset.toString()
         }
       })
     }
     
     // ... продолжить обработку
   }
   ```

---

### SEC-002: Input Validation & Sanitization (6h)

**Шаги:**

1. **Установка Zod:**
   ```bash
   pnpm add zod
   ```

2. **Создать schemas:**
   ```ts
   // lib/validations/index.ts
   import { z } from 'zod'
   
   export const analyzePhotoSchema = z.object({
     image: z.string()
       .max(10 * 1024 * 1024, 'Image too large (max 10MB)')
       .refine(s => s.startsWith('data:image/'), 'Invalid image format'),
     prompt: z.string().max(1000).optional()
   })
   
   export const chatSchema = z.object({
     messages: z.array(z.object({
       role: z.enum(['user', 'assistant', 'system']),
       content: z.string().max(10000)
     })).max(50),
     context: z.string().max(5000).optional()
   })
   
   export const vehicleSchema = z.object({
     vin: z.string().length(17).optional(),
     make: z.string().min(1).max(50),
     model: z.string().min(1).max(50),
     year: z.number().min(1900).max(new Date().getFullYear() + 1),
     mileage: z.number().min(0).optional()
   })
   ```

3. **Использование в API:**
   ```ts
   // app/api/analyze-photo/route.ts
   import { analyzePhotoSchema } from '@/lib/validations'
   
   export async function POST(req: Request) {
     const body = await req.json()
     
     const result = analyzePhotoSchema.safeParse(body)
     if (!result.success) {
       return Response.json(
         { error: result.error.flatten() },
         { status: 400 }
       )
     }
     
     const { image, prompt } = result.data
     // ...
   }
   ```

4. **XSS protection (уже включён в React, но для markdown):**
   ```bash
   pnpm add dompurify isomorphic-dompurify
   ```
   ```ts
   import DOMPurify from 'isomorphic-dompurify'
   
   const cleanHtml = DOMPurify.sanitize(htmlContent)
   ```

5. **Content Security Policy в next.config.mjs:**
   ```js
   const securityHeaders = [
     {
       key: 'Content-Security-Policy',
       value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://maps.googleapis.com; ..."
     }
   ]
   ```

---

### CORE-001: Гараж пользователя (8h)

**Шаги:**

1. **Создать API routes:**
   ```
   app/api/vehicles/
   ├── route.ts           # GET (list), POST (create)
   └── [id]/route.ts      # GET, PUT, DELETE
   ```

2. **API реализация:**
   ```ts
   // app/api/vehicles/route.ts
   import { auth } from '@clerk/nextjs'
   import { createClient } from '@/lib/supabase/server'
   
   export async function GET() {
     const { userId } = auth()
     if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })
     
     const supabase = createClient()
     const { data, error } = await supabase
       .from('vehicles')
       .select('*')
       .eq('user_id', userId)
       .order('created_at', { ascending: false })
     
     return Response.json(data)
   }
   
   export async function POST(req: Request) {
     const { userId } = auth()
     const body = await req.json()
     
     // Validate with Zod
     const result = vehicleSchema.safeParse(body)
     if (!result.success) return Response.json({ error: result.error }, { status: 400 })
     
     const supabase = createClient()
     const { data, error } = await supabase
       .from('vehicles')
       .insert({ ...result.data, user_id: userId })
       .select()
       .single()
     
     return Response.json(data)
   }
   ```

3. **VIN декодирование (бесплатный NHTSA API):**
   ```ts
   // lib/vin-decoder.ts
   export async function decodeVin(vin: string) {
     const res = await fetch(
       `https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/${vin}?format=json`
     )
     const data = await res.json()
     
     return {
       make: data.Results.find(r => r.Variable === 'Make')?.Value,
       model: data.Results.find(r => r.Variable === 'Model')?.Value,
       year: data.Results.find(r => r.Variable === 'Model Year')?.Value
     }
   }
   ```

4. **Компонент гаража:**
   ```tsx
   // components/garage-screen.tsx
   'use client'
   
   export function GarageScreen() {
     const [vehicles, setVehicles] = useState([])
     const [selectedVehicle, setSelectedVehicle] = useState(null)
     
     // CRUD операции через useSWR или React Query
   }
   ```

---

### CORE-002: История сканирований в облаке (6h)

**Шаги:**

1. **Миграция localStorage → Supabase:**
   ```ts
   // lib/sync-history.ts
   export async function syncLocalToCloud(userId: string) {
     const localScans = JSON.parse(localStorage.getItem('scanHistory') || '[]')
     
     if (localScans.length === 0) return
     
     const supabase = createClient()
     
     // Загрузить локальные сканы в облако
     await supabase.from('scans').insert(
       localScans.map(scan => ({
         user_id: userId,
         analysis: scan.analysis,
         created_at: scan.timestamp
       }))
     )
     
     // Очистить localStorage
     localStorage.removeItem('scanHistory')
   }
   ```

2. **API для истории:**
   ```ts
   // app/api/scans/route.ts
   export async function GET(req: Request) {
     const { searchParams } = new URL(req.url)
     const vehicleId = searchParams.get('vehicleId')
     const search = searchParams.get('search')
     
     let query = supabase
       .from('scans')
       .select('*')
       .eq('user_id', userId)
     
     if (vehicleId) query = query.eq('vehicle_id', vehicleId)
     if (search) query = query.textSearch('analysis', search)
     
     const { data } = await query.order('created_at', { ascending: false })
     return Response.json(data)
   }
   ```

3. **Export данных (GDPR compliance):**
   ```ts
   // app/api/export/route.ts
   export async function GET() {
     const { userId } = auth()
     
     const [vehicles, scans, chats] = await Promise.all([
       supabase.from('vehicles').select('*').eq('user_id', userId),
       supabase.from('scans').select('*').eq('user_id', userId),
       supabase.from('chats').select('*').eq('user_id', userId)
     ])
     
     return new Response(JSON.stringify({ vehicles, scans, chats }, null, 2), {
       headers: {
         'Content-Type': 'application/json',
         'Content-Disposition': 'attachment; filename=mechanic-ai-export.json'
       }
     })
   }
   ```

---

## 🟡 P1: High Priority

---

### MECH-001: Интеграция каталога запчастей (20h)

**Опции:**
- **TecDoc API** — стандарт отрасли, платный
- **Autodoc API** — нужен контракт
- **PartsLink24** — альтернатива

**Шаги:**

1. **Получить доступ к TecDoc API:**
   - Зарегистрироваться на [tecdocweb.com](https://www.tecdocweb.com)
   - Получить API credentials

2. **Создать клиент:**
   ```ts
   // lib/tecdoc/client.ts
   export class TecDocClient {
     private baseUrl = 'https://webservice.tecdoc.de/v2/'
     
     async searchByOEM(oemNumber: string) {
       // Поиск запчасти по OEM номеру
     }
     
     async getArticlesByVehicle(vehicleId: string, categoryId: string) {
       // Запчасти для конкретного авто
     }
     
     async getCrossReferences(articleId: string) {
       // Аналоги других производителей
     }
   }
   ```

3. **API route:**
   ```ts
   // app/api/parts/search/route.ts
   export async function GET(req: Request) {
     const { searchParams } = new URL(req.url)
     const oem = searchParams.get('oem')
     const vin = searchParams.get('vin')
     
     const tecdoc = new TecDocClient()
     
     if (oem) {
       const parts = await tecdoc.searchByOEM(oem)
       return Response.json(parts)
     }
   }
   ```

4. **Кэширование результатов (Upstash Redis):**
   ```ts
   const cacheKey = `parts:${oem}`
   const cached = await redis.get(cacheKey)
   if (cached) return Response.json(cached)
   
   const parts = await tecdoc.searchByOEM(oem)
   await redis.set(cacheKey, parts, { ex: 86400 }) // 24h cache
   ```

---

### MECH-002: Проверка совместимости детали (12h)

**Шаги:**

1. **VIN → Vehicle ID mapping:**
   ```ts
   async function getVehicleCompatibility(vin: string, partNumber: string) {
     // 1. Декодировать VIN → make/model/year
     const vehicle = await decodeVin(vin)
     
     // 2. Найти vehicle ID в TecDoc
     const tecdocVehicle = await tecdoc.findVehicle({
       make: vehicle.make,
       model: vehicle.model,
       year: vehicle.year
     })
     
     // 3. Проверить совместимость
     const compatible = await tecdoc.checkCompatibility(
       partNumber,
       tecdocVehicle.id
     )
     
     return { compatible, alternatives: compatible.alternatives }
   }
   ```

2. **UI компонент:**
   ```tsx
   // components/compatibility-checker.tsx
   export function CompatibilityChecker({ vin, partNumber }) {
     const { data, isLoading } = useSWR(
       `/api/parts/compatibility?vin=${vin}&part=${partNumber}`
     )
     
     return (
       <div>
         {data?.compatible ? (
           <Badge variant="success">✓ Совместимо</Badge>
         ) : (
           <Badge variant="destructive">✗ Не подходит</Badge>
         )}
       </div>
     )
   }
   ```

---

### MECH-003: Источники информации в ответах (8h)

**Шаги:**

1. **Расширить system prompt:**
   ```ts
   const systemPrompt = `
   Ты автомеханик-эксперт. При ответе:
   1. Указывай источники информации в формате [1], [2], etc.
   2. В конце ответа добавь секцию "Источники:" со ссылками
   3. Ссылайся на TSB (Technical Service Bulletins) если применимо
   4. Указывай номера страниц в мануалах
   `
   ```

2. **База TSB (можно начать с бесплатных источников):**
   ```ts
   // lib/tsb/index.ts
   export async function searchTSB(make: string, model: string, year: number, symptom: string) {
     // Поиск в NHTSA Complaints/Recalls
     const recalls = await fetch(
       `https://api.nhtsa.gov/recalls/recallsByVehicle?make=${make}&model=${model}&modelYear=${year}`
     )
     return recalls.json()
   }
   ```

3. **Добавить context в chat API:**
   ```ts
   // app/api/chat/route.ts
   // Перед отправкой в AI, добавить релевантные TSB
   const tsbs = await searchTSB(vehicle.make, vehicle.model, vehicle.year, userMessage)
   
   const messagesWithContext = [
     { role: 'system', content: systemPrompt },
     { role: 'system', content: `Relevant TSBs: ${JSON.stringify(tsbs)}` },
     ...messages
   ]
   ```

---

### MECH-004: Рейтинги брендов запчастей (10h)

**Шаги:**

1. **Создать таблицу рейтингов:**
   ```sql
   CREATE TABLE brand_ratings (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     brand_name TEXT UNIQUE NOT NULL,
     quality_score DECIMAL(2,1),  -- 1-5
     price_score DECIMAL(2,1),    -- 1-5 (5 = budget friendly)
     total_reviews INTEGER DEFAULT 0,
     category TEXT  -- 'OEM', 'aftermarket-premium', 'budget'
   );
   
   CREATE TABLE user_reviews (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID REFERENCES users(id),
     brand_id UUID REFERENCES brand_ratings(id),
     rating INTEGER CHECK (rating >= 1 AND rating <= 5),
     comment TEXT,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

2. **Seed начальными данными:**
   ```ts
   const brands = [
     { brand_name: 'Bosch', quality_score: 4.5, price_score: 3.0, category: 'OEM' },
     { brand_name: 'Brembo', quality_score: 4.8, price_score: 2.0, category: 'aftermarket-premium' },
     { brand_name: 'TRW', quality_score: 4.2, price_score: 3.5, category: 'OEM' },
     // ...
   ]
   ```

3. **Интеграция в результаты поиска запчастей:**
   ```tsx
   // При отображении запчасти показывать рейтинг бренда
   <PartCard>
     <BrandBadge 
       name="Bosch"
       qualityScore={4.5}
       priceScore={3.0}
     />
   </PartCard>
   ```

---

### PRED-001: Сервисные интервалы (12h)

**Шаги:**

1. **Создать базу интервалов:**
   ```sql
   CREATE TABLE service_intervals (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     make TEXT NOT NULL,
     model TEXT,  -- NULL = applies to all models
     year_from INTEGER,
     year_to INTEGER,
     service_type TEXT NOT NULL,  -- 'oil_change', 'timing_belt', etc.
     interval_km INTEGER,
     interval_months INTEGER
   );
   ```

2. **Seed популярными данными:**
   ```ts
   const intervals = [
     { make: 'Toyota', service_type: 'oil_change', interval_km: 10000, interval_months: 12 },
     { make: 'BMW', service_type: 'oil_change', interval_km: 15000, interval_months: 12 },
     { make: 'Toyota', service_type: 'timing_belt', interval_km: 100000, interval_months: null },
     // ...
   ]
   ```

3. **Калькулятор следующего ТО:**
   ```ts
   // lib/service-calculator.ts
   export function calculateNextService(vehicle: Vehicle, serviceHistory: ServiceRecord[]) {
     const intervals = await getIntervalsForVehicle(vehicle)
     
     return intervals.map(interval => {
       const lastService = serviceHistory.find(s => s.type === interval.service_type)
       
       const nextKm = lastService 
         ? lastService.mileage + interval.interval_km
         : vehicle.mileage + interval.interval_km
       
       const dueIn = nextKm - vehicle.mileage
       
       return {
         type: interval.service_type,
         nextKm,
         dueIn,
         urgent: dueIn < 1000
       }
     })
   }
   ```

---

### PRED-002: Push-уведомления о ТО (8h)

**Рекомендация:** Web Push API + Vercel Cron

**Шаги:**

1. **Настроить Service Worker:**
   ```ts
   // public/sw.js
   self.addEventListener('push', (event) => {
     const data = event.data.json()
     self.registration.showNotification(data.title, {
       body: data.body,
       icon: '/icon-192.png'
     })
   })
   ```

2. **Создать API для подписки:**
   ```ts
   // app/api/notifications/subscribe/route.ts
   import webpush from 'web-push'
   
   webpush.setVapidDetails(
     'mailto:support@mechanicai.com',
     process.env.VAPID_PUBLIC_KEY!,
     process.env.VAPID_PRIVATE_KEY!
   )
   ```

3. **Vercel Cron для проверки (vercel.json):**
   ```json
   {
     "crons": [{
       "path": "/api/cron/service-reminders",
       "schedule": "0 9 * * *"
     }]
   }
   ```

4. **Cron handler:**
   ```ts
   // app/api/cron/service-reminders/route.ts
   export async function GET(req: Request) {
     // Проверить authorization header от Vercel
     
     // Найти пользователей с приближающимся ТО
     const dueServices = await findDueServices()
     
     // Отправить уведомления
     for (const service of dueServices) {
       await webpush.sendNotification(service.pushSubscription, JSON.stringify({
         title: 'Приближается ТО',
         body: `Замена масла через ${service.dueIn} км`
       }))
     }
   }
   ```

---

### VIS-001: Видео-анализ (16h)

**Архитектура:** Client-side frame extraction → Server-side analysis

**Шаги:**

1. **Client-side frame extraction:**
   ```tsx
   // components/video-analyzer.tsx
   async function extractFrames(videoFile: File, interval: number = 1000) {
     const video = document.createElement('video')
     video.src = URL.createObjectURL(videoFile)
     await video.play()
     
     const canvas = document.createElement('canvas')
     const ctx = canvas.getContext('2d')!
     const frames: string[] = []
     
     const duration = video.duration * 1000
     for (let time = 0; time < duration; time += interval) {
       video.currentTime = time / 1000
       await new Promise(r => video.onseeked = r)
       
       canvas.width = video.videoWidth
       canvas.height = video.videoHeight
       ctx.drawImage(video, 0, 0)
       
       frames.push(canvas.toDataURL('image/jpeg', 0.8))
     }
     
     return frames
   }
   ```

2. **Batch analysis API:**
   ```ts
   // app/api/analyze-video/route.ts
   export async function POST(req: Request) {
     const { frames, prompt } = await req.json()
     
     // Ограничение: max 10 frames
     const selectedFrames = selectKeyFrames(frames, 10)
     
     // Параллельный анализ
     const results = await Promise.all(
       selectedFrames.map((frame, i) => 
         analyzeFrame(frame, `Frame ${i + 1}: ${prompt}`)
       )
     )
     
     // Агрегация результатов
     const summary = await summarizeResults(results)
     
     return Response.json({
       frames: results,
       summary,
       timeline: createTimeline(results)
     })
   }
   ```

3. **Timeline UI:**
   ```tsx
   // components/video-timeline.tsx
   export function VideoTimeline({ results }) {
     return (
       <div className="flex gap-2 overflow-x-auto">
         {results.map((result, i) => (
           <div key={i} className="flex-shrink-0">
             <img src={result.thumbnail} className="w-20 h-20 object-cover" />
             <Badge variant={result.issues.length > 0 ? 'destructive' : 'success'}>
               {result.timestamp}s
             </Badge>
           </div>
         ))}
       </div>
     )
   }
   ```

---

### VIS-002: Аудио-анализ звуков двигателя (12h)

**Архитектура:** Whisper transcription + классификация через GPT-4

**Шаги:**

1. **Запись аудио:**
   ```tsx
   // hooks/useAudioRecorder.ts
   export function useAudioRecorder() {
     const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
     
     const startRecording = async () => {
       const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
       const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
       
       recorder.ondataavailable = (e) => {
         // Собрать chunks
       }
       
       recorder.start()
       setMediaRecorder(recorder)
     }
     
     return { startRecording, stopRecording, audioBlob }
   }
   ```

2. **API для анализа:**
   ```ts
   // app/api/analyze-audio/route.ts
   import OpenAI from 'openai'
   
   export async function POST(req: Request) {
     const formData = await req.formData()
     const audioFile = formData.get('audio') as File
     
     const openai = new OpenAI()
     
     // 1. Транскрипция через Whisper
     const transcription = await openai.audio.transcriptions.create({
       file: audioFile,
       model: 'whisper-1',
       language: 'ru',
       prompt: 'Описание звуков двигателя автомобиля: стук, скрип, свист, гул, вибрация'
     })
     
     // 2. Классификация звуков через GPT-4
     const analysis = await openai.chat.completions.create({
       model: 'gpt-4o',
       messages: [
         {
           role: 'system',
           content: `Ты эксперт-диагност. Анализируй описание звуков двигателя.
           Определи:
           1. Тип звука (стук, скрежет, свист, гул, вибрация)
           2. Вероятную причину
           3. Срочность (критично/требует внимания/норма)
           4. Рекомендации`
         },
         {
           role: 'user',
           content: `Пользователь записал звук двигателя. Транскрипция: "${transcription.text}"`
         }
       ]
     })
     
     return Response.json({
       transcription: transcription.text,
       analysis: analysis.choices[0].message.content
     })
   }
   ```

3. **UI компонент:**
   ```tsx
   // components/engine-sound-analyzer.tsx
   export function EngineSoundAnalyzer() {
     const { startRecording, stopRecording, audioBlob, isRecording } = useAudioRecorder()
     
     return (
       <div>
         <Button 
           onClick={isRecording ? stopRecording : startRecording}
           variant={isRecording ? 'destructive' : 'default'}
         >
           {isRecording ? '⏹ Остановить' : '🎤 Записать звук'}
         </Button>
         
         {audioBlob && <AudioAnalysisResults audio={audioBlob} />}
       </div>
     )
   }
   ```

---

## 🟢 P2: Medium Priority

---

### UX-001: Onboarding flow (6h)

```tsx
// components/onboarding/index.tsx
const steps = [
  { id: 'welcome', component: WelcomeStep },
  { id: 'add-vehicle', component: AddVehicleStep },
  { id: 'first-scan', component: FirstScanStep },
  { id: 'features', component: FeaturesOverviewStep }
]

export function OnboardingFlow() {
  const [step, setStep] = useState(0)
  
  // Сохранять прогресс в localStorage/DB
}
```

---

### UX-002: PWA полноценный (8h)

```ts
// next.config.mjs
import withPWA from 'next-pwa'

export default withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/api\.openai\.com/,
      handler: 'NetworkOnly'
    },
    {
      urlPattern: /\/_next\/static/,
      handler: 'CacheFirst'
    }
  ]
})({
  // next config
})
```

---

### MON-001: Error tracking - Sentry (4h)

```bash
pnpm add @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

```ts
// sentry.client.config.ts
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1
})
```

---

### MON-002: Product analytics - PostHog (6h)

```bash
pnpm add posthog-js
```

```tsx
// app/providers.tsx
import posthog from 'posthog-js'
import { PostHogProvider } from 'posthog-js/react'

posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
  api_host: 'https://app.posthog.com'
})

// Трекинг событий
posthog.capture('scan_completed', { vehicle_type: 'sedan' })
```

---

## Следующие шаги

1. Начать с **Sprint 1**: AUTH-001 + DB-001 + CORE-001
2. Настроить CI/CD в Vercel
3. Добавить все env variables в Vercel Dashboard

# TODO: MechanicAI → Commercial Release

**Цель:** Подготовить продукт к коммерческому запуску  
**Timeline:** Q1 2025

---

## 📊 Статус реализации по блокам

```
Block 1: Vision & Perception    [████████░░] 80%
Block 2: Core Mechanic          [███░░░░░░░] 30%
Block 3: Prediction             [█░░░░░░░░░] 10%
Block 4: Parking & Geo          [████████░░] 80%
Infrastructure                  [████░░░░░░] 40%
```

---

## 🔴 P0: Critical (Must Have для запуска)

### Infrastructure & Security

- [ ] **AUTH-001** Аутентификация пользователей
  - Интеграция Clerk или NextAuth.js
  - OAuth (Google, Apple)
  - Email/password
  - Session management
  - **Effort:** 8h | **Priority:** P0

- [ ] **DB-001** Персистентное хранение данных
  - Supabase или PlanetScale
  - Схема: users, vehicles, scans, chats
  - Миграции
  - **Effort:** 12h | **Priority:** P0

- [ ] **PAY-001** Платежная система
  - Stripe интеграция
  - Subscription management (Free/Pro/Business)
  - Webhook handlers
  - Customer portal
  - **Effort:** 16h | **Priority:** P0

- [ ] **SEC-001** Rate Limiting
  - Per-user API limits
  - Защита от abuse
  - Graceful degradation
  - **Effort:** 4h | **Priority:** P0

- [ ] **SEC-002** Input validation & sanitization
  - Zod schemas для всех API
  - XSS protection
  - File upload limits
  - **Effort:** 6h | **Priority:** P0

### Core Features

- [ ] **CORE-001** Гараж пользователя
  - CRUD для автомобилей
  - VIN привязка
  - Пробег tracking
  - **Effort:** 8h | **Priority:** P0

- [ ] **CORE-002** История сканирований в облаке
  - Синхронизация localStorage → DB
  - Поиск и фильтры
  - Export данных
  - **Effort:** 6h | **Priority:** P0

---

## 🟡 P1: High Priority (Нужно для конкурентоспособности)

### Block 2: Core Mechanic

- [ ] **MECH-001** Интеграция каталога запчастей
  - TecDoc API или Autodoc API
  - Поиск по OEM номеру
  - Кросс-референсы аналогов
  - **Effort:** 20h | **Priority:** P1

- [ ] **MECH-002** Проверка совместимости детали
  - VIN → applicability check
  - Марка/модель/год → фильтрация
  - **Effort:** 12h | **Priority:** P1

- [ ] **MECH-003** Источники информации в ответах
  - Citations в AI ответах
  - Ссылки на мануалы
  - TSB references
  - **Effort:** 8h | **Priority:** P1

- [ ] **MECH-004** Рейтинги брендов запчастей
  - Aggregated reviews
  - Price/quality score
  - User reviews
  - **Effort:** 10h | **Priority:** P1

### Block 3: Predictions

- [ ] **PRED-001** Сервисные интервалы
  - База данных интервалов по моделям
  - Персонализация под пробег
  - **Effort:** 12h | **Priority:** P1

- [ ] **PRED-002** Push-уведомления о ТО
  - Напоминания
  - Календарь обслуживания
  - **Effort:** 8h | **Priority:** P1


---

## 🟢 P2: Medium Priority (Nice to Have)

### UX Improvements

- [ ] **UX-001** Onboarding flow
  - Добавление первого авто
  - Объяснение функций
  - **Effort:** 6h | **Priority:** P2

- [ ] **UX-002** PWA полноценный
  - Service Worker
  - Offline mode
  - App install prompt
  - **Effort:** 8h | **Priority:** P2

- [ ] **UX-003** Dark mode polish
  - Проверка всех компонентов
  - Карта в dark mode
  - **Effort:** 4h | **Priority:** P2

- [ ] **UX-004** Multi-language (i18n)
  - next-intl интеграция
  - EN, DE, UK, RU
  - **Effort:** 12h | **Priority:** P2

### Block 4: Geo (расширение)

- [ ] **GEO-001** Parkopedia интеграция
  - Цены парковок
  - Свободные места
  - **Effort:** 8h | **Priority:** P2

- [ ] **GEO-002** Рекомендация парковки по маршруту
  - "Еду туда-то, где оставить машину?"
  - **Effort:** 6h | **Priority:** P2

### Analytics & Monitoring

- [ ] **MON-001** Error tracking
  - Sentry интеграция
  - Source maps
  - **Effort:** 4h | **Priority:** P2

- [ ] **MON-002** Product analytics
  - PostHog или Mixpanel
  - Funnels, retention
  - **Effort:** 6h | **Priority:** P2

- [ ] **MON-003** Logging & observability
  - Structured logging
  - Request tracing
  - **Effort:** 6h | **Priority:** P2

---

## 🔵 P3: Low Priority (Future)

### Growth Features

- [ ] **GRW-001** Referral program
- [ ] **GRW-002** Social sharing (share diagnostic)
- [ ] **GRW-003** Community forum
- [ ] **GRW-004** Gamification (achievements)

### B2B Features

- [ ] **B2B-001** API для партнёров
- [ ] **B2B-002** White-label решение
- [ ] **B2B-003** СТО dashboard

### Mobile

- [ ] **MOB-001** React Native приложение
- [ ] **MOB-002** Deep links
- [ ] **MOB-003** Native camera integration

---

## 📋 Checklist перед запуском

### Legal & Compliance
- [ ] Privacy Policy
- [ ] Terms of Service
- [ ] GDPR compliance (cookie consent, data deletion)
- [ ] App Store / Play Store policies (если PWA → native)

### Marketing
- [ ] Landing page
- [ ] App Store listing
- [ ] Social media accounts
- [ ] Press kit

### Operations
- [ ] Customer support (email/chat)
- [ ] FAQ / Help center
- [ ] Monitoring dashboards
- [ ] Incident response plan

### Quality
- [ ] E2E тесты (Playwright)
- [ ] Load testing
- [ ] Security audit
- [ ] Accessibility audit (WCAG)

---

## 📅 Sprint Plan (Example)

### Sprint 1 (Week 1-2): Auth & Database
- AUTH-001: Clerk integration
- DB-001: Supabase setup
- CORE-001: User garage

### Sprint 2 (Week 3-4): Payments & History
- PAY-001: Stripe integration
- CORE-002: Cloud history
- SEC-001: Rate limiting

### Sprint 3 (Week 5-6): Parts Catalog
- MECH-001: TecDoc integration
- MECH-002: Compatibility check
- MECH-003: Sources in responses

### Sprint 4 (Week 7-8): Polish & Launch
- UX-001: Onboarding
- MON-001: Sentry
- MON-002: Analytics
- Final QA

---

## 💰 Estimated Costs (Monthly)

| Service | Free Tier | Pro Tier |
|---------|-----------|----------|
| Vercel | $0 | $20 |
| Supabase | $0 | $25 |
| Clerk | $0 (5k MAU) | $25 |
| OpenAI | ~$50-200 | ~$200-500 |
| Google Maps | $200 free | $200+ |
| Stripe | 2.9% + 30¢ | same |
| Sentry | $0 | $26 |
| **Total** | ~$50-200 | ~$500-800 |

---

## 🔗 API Integrations Needed

| API | Purpose | Priority | Docs |
|-----|---------|----------|------|
| TecDoc | Parts catalog | P1 | [tecdoc.net](https://tecdoc.net) |
| Autodoc | Parts + prices | P1 | Contact sales |
| Parkopedia | Parking prices | P2 | [parkopedia.com](https://parkopedia.com) |
| Stripe | Payments | P0 | [stripe.com](https://stripe.com/docs) |
| Clerk | Auth | P0 | [clerk.com](https://clerk.com/docs) |
| Supabase | Database | P0 | [supabase.com](https://supabase.com/docs) |
| Sentry | Errors | P2 | [sentry.io](https://docs.sentry.io) |
| PostHog | Analytics | P2 | [posthog.com](https://posthog.com/docs) |

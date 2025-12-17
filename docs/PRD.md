# PRD: MechanicAI — AI-помощник для автовладельцев

**Версия:** 1.0  
**Дата:** Декабрь 2024  
**Статус:** Draft  

---

## 1. Обзор продукта

### 1.1 Vision
MechanicAI — интеллектуальный мобильный ассистент, который помогает автовладельцам диагностировать проблемы, подбирать правильные запчасти и находить ближайшие сервисы/парковки.

### 1.2 Mission Statement
> Сделать владение автомобилем проще, безопаснее и экономичнее через AI-powered диагностику и рекомендации.

### 1.3 Target Audience

| Сегмент | Описание | Потребности |
|---------|----------|-------------|
| **DIY-автовладельцы** | Самостоятельно обслуживают авто | Подбор деталей, инструкции |
| **Новички** | Первый автомобиль, мало опыта | Понимание проблем, что делать |
| **Экономные водители** | Хотят избежать переплат в СТО | Сравнение цен, аналоги деталей |
| **Путешественники** | Часто в дороге | Парковки, экстренная помощь |

---

## 2. Архитектура продукта (блоки)

```
┌─────────────────────────────────────────────────────────────────┐
│                        MechanicAI                                │
├─────────────────┬─────────────────┬─────────────────┬───────────┤
│   BLOCK 1       │   BLOCK 2       │   BLOCK 3       │  BLOCK 4  │
│   VISION &      │   CORE          │   PREDICTION &  │  PARKING  │
│   PERCEPTION    │   MECHANIC      │   RECOMMENDATIONS│  & GEO   │
├─────────────────┼─────────────────┼─────────────────┼───────────┤
│ • Фото анализ   │ • Подбор деталей│ • Когда менять  │ • Парковки│
│ • VIN OCR       │ • Совместимость │ • ТО напоминания│ • СТО     │
│ • Видео анализ  │ • Аналоги       │ • Износ прогноз │ • Маршруты│
│ • Звук анализ   │ • База знаний   │ • Cost estimates│ • Навигация│
│ • Dashboard     │ • Диагностика   │ • Brand ratings │           │
│   индикаторы    │   по симптомам  │                 │           │
└─────────────────┴─────────────────┴─────────────────┴───────────┘
```

---

## 3. Функциональные требования

### 3.1 BLOCK 1: Vision & Perception

#### F1.1 Анализ фото детали
- **Input:** Фото запчасти
- **Output:** Название детали, OEM номер, аналоги, где купить
- **Acceptance:** Точность распознавания >85%

#### F1.2 VIN OCR
- **Input:** Фото VIN-кода (дверь, стойка, лобовое)
- **Output:** VIN, марка, модель, год, двигатель, страна
- **Status:** ✅ Реализовано

#### F1.3 Анализ индикаторов приборной панели
- **Input:** Фото приборной панели
- **Output:** Список горящих индикаторов, их значение, срочность, рекомендации
- **Status:** ✅ Базовая реализация

#### F1.4 Анализ повреждений
- **Input:** Фото повреждения (царапина, вмятина, коррозия)
- **Output:** Тип повреждения, причина, способ ремонта, примерная стоимость

#### F1.5 Анализ износа шин
- **Input:** Фото протектора шины
- **Output:** Остаточный износ %, рекомендация замены, тип износа
- **Status:** ✅ Реализовано (tire-analysis API)

#### F1.6 Видео-анализ (v2.0)
- **Input:** Видео (до 60 сек): звук двигателя, мигающие индикаторы, дым
- **Output:** Timeline проблем, аудио-события, рекомендации
- **Priority:** Medium

#### F1.7 Анализ звука (v2.0)
- **Input:** Аудио записи стуков, скрипов, свистов
- **Output:** Возможная причина звука, срочность

---

### 3.2 BLOCK 2: Core Mechanic & Knowledge

#### F2.1 Подбор деталей по VIN
- **Input:** VIN-код + название детали
- **Output:** OEM номер, совместимые аналоги, цены, где купить
- **Data Sources:** TecDoc, PartsCatalog API, Autodoc API

#### F2.2 Подбор по марке/модели/двигателю
- **Input:** Марка, модель, год, объём двигателя + деталь
- **Output:** Список совместимых деталей с фильтрами

#### F2.3 Диагностика по симптомам
- **Input:** Текстовое описание проблемы
- **Output:** Возможные причины (ранжированные), что проверить, какие детали могут понадобиться

#### F2.4 Проверка совместимости
- **Input:** OEM номер детали + данные авто
- **Output:** Подходит/не подходит, почему

#### F2.5 Объяснение рекомендаций
- Каждая рекомендация должна содержать:
  - ✅ Источник информации (мануал, TSB, форум)
  - ✅ Почему именно эта деталь
  - ✅ Альтернативы с pros/cons
  - ✅ Рейтинг бренда и отзывы

#### F2.6 База знаний автомобилей
- Технические характеристики
- Типичные проблемы по моделям
- Интервалы ТО
- TSB (Technical Service Bulletins)

---

### 3.3 BLOCK 3: Prediction & Recommendations

#### F3.1 Интервалы замены
- Масло, фильтры, тормозные колодки, ремни, свечи
- Персонализация под стиль вождения и пробег

#### F3.2 Напоминания о ТО
- Push-уведомления
- Календарь обслуживания
- Синхронизация с пробегом

#### F3.3 Прогноз износа
- На основе пробега, возраста, условий эксплуатации
- "Через 5000 км рекомендуется заменить..."

#### F3.4 Оценка стоимости ремонта
- Стоимость деталей + работы
- Сравнение: сделать самому vs СТО

#### F3.5 Рейтинги брендов
- Aggregated reviews
- Соотношение цена/качество
- Рекомендации по бюджету

---

### 3.4 BLOCK 4: Parking & Geo/Locations

#### F4.1 Поиск парковок
- **Input:** Пункт назначения
- **Output:** Ближайшие парковки с ценами, свободными местами
- **Status:** ✅ Базовая реализация

#### F4.2 Поиск автосервисов
- **Status:** ✅ Реализовано (nearby-places API)
- Фильтры: рейтинг, специализация, время работы

#### F4.3 Построение маршрута
- **Status:** ✅ Реализовано (directions API)
- Навигация до парковки/СТО

#### F4.4 Интеграции
- Google Maps/Places ✅
- Parkopedia (парковки с ценами) — TODO
- OpenStreetMap (альтернатива) — TODO

---

## 4. Нефункциональные требования

### 4.1 Performance
| Метрика | Target |
|---------|--------|
| Время отклика Vision API | < 3 сек |
| Время загрузки приложения | < 2 сек |
| Offline-режим | История + кэш |

### 4.2 Security
- [ ] Аутентификация пользователей
- [ ] HTTPS everywhere
- [ ] API keys в env variables ✅
- [ ] GDPR compliance (EU users)

### 4.3 Scalability
- [ ] Serverless architecture (Vercel) ✅
- [ ] CDN для статики
- [ ] Rate limiting API
- [ ] Caching layer (Redis)

### 4.4 Reliability
- [ ] Error tracking (Sentry)
- [ ] Health checks
- [ ] Graceful degradation
- [ ] Fallback AI providers ✅

---

## 5. Монетизация

### 5.1 Freemium Model

| Tier | Цена | Лимиты |
|------|------|--------|
| **Free** | €0 | 5 сканирований/день, базовый чат |
| **Pro** | €4.99/мес | Unlimited сканирования, видео-анализ, история |
| **Business** | €19.99/мес | API доступ, white-label, приоритетная поддержка |

### 5.2 Дополнительные источники дохода
- Affiliate links на запчасти (Autodoc, Amazon)
- Партнёрство с СТО (лидогенерация)
- Рекламные интеграции (ненавязчивые)

---

## 6. Tech Stack

### Current (MVP)
| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, React 19, TypeScript |
| UI | Tailwind CSS 4, shadcn/ui |
| AI | OpenAI GPT-4o, Claude |
| Maps | Google Maps/Places API |
| State | React hooks, localStorage |
| Deploy | Vercel |
| Testing | Vitest ✅ |

### Target (Production)
| Layer | Technology |
|-------|------------|
| Auth | Clerk / NextAuth.js |
| Database | Supabase / PlanetScale |
| Cache | Upstash Redis |
| Analytics | PostHog / Mixpanel |
| Payments | Stripe |
| Monitoring | Sentry |
| Parts Data | TecDoc API, Autodoc API |

---

## 7. Риски и митигация

| Риск | Вероятность | Impact | Митигация |
|------|-------------|--------|-----------|
| AI галлюцинации | High | High | Добавить источники, валидация ответов |
| Высокая стоимость API | Medium | High | Кэширование, rate limits, tiered pricing |
| Низкая точность Vision | Medium | Medium | Fine-tuning, fallback на ручной ввод |
| Конкуренция | Medium | Medium | Focus on UX, нишевые фичи |
| GDPR compliance | Low | High | Privacy-first design |

---

## 8. Метрики успеха

### 8.1 Product Metrics
- MAU (Monthly Active Users)
- Retention D1/D7/D30
- Scans per user per day
- Chat messages per session
- Conversion Free → Pro

### 8.2 Business Metrics
- MRR (Monthly Recurring Revenue)
- CAC (Customer Acquisition Cost)
- LTV (Lifetime Value)
- Churn rate

### 8.3 Quality Metrics
- Vision accuracy rate
- User satisfaction (NPS)
- Support ticket volume
- Error rate

---

## 9. Roadmap

### Phase 1: MVP Stabilization (Current)
- ✅ Photo analysis
- ✅ VIN OCR
- ✅ Chat interface
- ✅ Places/parking
- ✅ Unit tests

### Phase 2: Production Ready (Q1 2025)
- Auth & user accounts
- Database persistence
- Payment integration
- Parts catalog integration
- Video analysis

### Phase 3: Growth (Q2 2025)
- Mobile app (React Native)
- Predictive maintenance
- Social features (share diagnostics)
- Multi-language support

### Phase 4: Scale (Q3-Q4 2025)
- B2B API
- White-label solution
- AI fine-tuning
- Marketplace integration

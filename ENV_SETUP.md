# Настройка переменных окружения

## ⚠️ ВАЖНО: Безопасность

**НИКОГДА не коммитьте файлы `.env.local` в git!** Они уже добавлены в `.gitignore`.

## Быстрая настройка

1. Создайте файл `.env.local` в корне проекта:

```bash
touch .env.local
```

2. Добавьте следующие переменные в `.env.local`:

```env
# OpenAI API Key
OPENAI_API_KEY=sk-proj-your-openai-api-key-here

# Anthropic/Claude API Key
CLAUDE_API_KEY=sk-ant-api03-your-claude-api-key-here

# Vision API Provider (openai or claude)
VISION_API_PROVIDER=openai

# Optional: Model overrides
# OPENAI_MODEL=gpt-4o
# CLAUDE_MODEL=claude-3-5-sonnet-20241022
```

## Для Vercel

При деплое на Vercel:

1. Перейдите в Settings → Environment Variables
2. Добавьте каждую переменную:
   - `OPENAI_API_KEY`
   - `CLAUDE_API_KEY`
   - `VISION_API_PROVIDER` (опционально)

## Переменные окружения

| Переменная | Описание | Обязательная |
|-----------|----------|--------------|
| `OPENAI_API_KEY` | Ключ API OpenAI для анализа фото и чата | Да (или CLAUDE_API_KEY) |
| `CLAUDE_API_KEY` | Ключ API Anthropic/Claude | Да (или OPENAI_API_KEY) |
| `VISION_API_PROVIDER` | Выбор провайдера: `openai` или `claude` | Нет (по умолчанию: openai) |
| `OPENAI_MODEL` | Модель OpenAI (по умолчанию: `gpt-4o`) | Нет |
| `CLAUDE_MODEL` | Модель Claude (по умолчанию: `claude-3-5-sonnet-20241022`) | Нет |

## ⚠️ Рекомендация по безопасности

Если вы случайно закоммитили ключи в git, **немедленно**:
1. Удалите их из истории git
2. Сгенерируйте новые ключи в панелях OpenAI и Anthropic
3. Отзовите старые ключи


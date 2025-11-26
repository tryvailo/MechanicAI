# Проверка настройки API чата

## ✅ Проверено:

### 1. Системный промпт используется
- ✅ Импортируется из `@/config/system-prompt` (строка 2)
- ✅ Используется через `buildSystemMessage()` → `getSystemPrompt()` (строки 127-128, 251)
- ✅ Добавляется как системное сообщение в массив messages (строки 248-252)

### 2. Реальные API вызовы
- ✅ `callOpenAI()` делает fetch к `https://api.openai.com/v1/chat/completions` (строка 59)
- ✅ `callClaude()` делает fetch к `https://api.anthropic.com/v1/messages` (строка 101)
- ✅ Нет моков или заглушек - все вызовы реальные

### 3. По умолчанию используется OpenAI
- ✅ `CHAT_API_PROVIDER` по умолчанию = `'openai'` (строка 238)
- ✅ Логика выбора провайдера (строки 263-271):
  - Если `CHAT_API_PROVIDER === 'claude'` И есть `claudeKey` → Claude
  - Если нет `openaiKey` И есть `claudeKey` → Claude (fallback)
  - Иначе (если есть `openaiKey`) → OpenAI (по умолчанию)

## Тестовый запрос:

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "test message"
      }
    ]
  }'
```

**Ожидаемый результат:**
- Ответ должен начинаться с приветствия согласно системному промпту
- Должен запрашивать данные автомобиля (make, model, year)
- Должен быть на английском языке (согласно промпту)

## Структура системного промпта:

Файл: `config/system-prompt.ts`
- Содержит полный промпт для AutoDoc assistant
- Включает инструкции по языку (English only)
- Включает ограничения домена (только автомобили)
- Включает задачи (greeting, diagnostics, parts recommendation)


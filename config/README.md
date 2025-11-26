# Configuration Files

## system-prompt.ts

This file contains the system prompt used by the chat API (`/app/api/chat/route.ts`).

### How to Edit

1. Open `config/system-prompt.ts`
2. Edit the `SYSTEM_PROMPT` constant
3. Save the file
4. The changes will be applied on the next API request (no restart needed in development)

### Structure

- `SYSTEM_PROMPT`: The main prompt text
- `getSystemPrompt(diagnosticSummary?)`: Function that returns the prompt with optional diagnostic context

### Notes

- The prompt is automatically combined with diagnostic context if provided
- All changes are immediately reflected in the chat API
- Keep the prompt focused on automotive diagnostics and AutoDoc services


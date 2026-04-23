# AI English Study Platform

AI-powered English learning platform for students with basic English skills.

## Stack
- Frontend: React + Vite + Tailwind CSS + Zustand
- Backend: Go + Gin + Gorm + SQLite

## Run locally
1. Backend:
   - `cp backend/.env.example backend/.env`
   - 把 `backend/.env` 里的 `DOUBAO_API_KEY` 填成你的火山方舟 API Key
   - `go run ./backend/cmd/server --config backend/.env`
2. Frontend:
   - `cp frontend/.env.example frontend/.env`
   - `cd frontend && npm install && npm run dev`

### Doubao / 方舟配置
- `DOUBAO_ENDPOINT=https://ark.cn-beijing.volces.com/api/v3`
- `LLM_MODEL_GENERATE_QUESTIONS=seed-2-0-pro`
- `LLM_MODEL_SUBMIT_ANSWER=seed-2-0-pro`
- `LLM_MODEL_CHAT=seed-2-0-pro`
- 项目后端走 OpenAI 兼容协议，保持上面配置即可直接调用豆包模型。

### One-command local start (no Docker)
- Start both services:
  - `bash scripts/start-local.sh`
- Stop both services:
  - `bash scripts/stop-local.sh`

## API response contract
All backend APIs return:
```json
{
  "code": 200,
  "msg": "ok",
  "result": {}
}
```

## Core APIs
- Auth: `/api/v1/auth/register`, `/api/v1/auth/login`, `/api/v1/auth/me`
- Modes CRUD: `/api/v1/modes`
- Questions CRUD + generate: `/api/v1/questions`, `/api/v1/questions/generate`
- Daily score: `/api/v1/scores/today`, `/api/v1/scores/recalculate`

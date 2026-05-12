SHELL := /bin/bash

.PHONY: backend frontend miniapp-check miniapp-upload test lint

backend:
	go run ./backend/cmd/server --config backend/.env

frontend:
	cd frontend && npm run dev

miniapp-check:
	cd miniapp && npm run check

miniapp-upload:
	bash scripts/deploy-miniapp.sh

test:
	go test ./backend/...
	cd frontend && npm run build

lint:
	cd frontend && npm run lint

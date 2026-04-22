SHELL := /bin/bash

.PHONY: backend frontend test lint

backend:
	go run ./backend/cmd/server --config backend/.env

frontend:
	cd frontend && npm run dev

test:
	go test ./backend/...
	cd frontend && npm run build

lint:
	cd frontend && npm run lint

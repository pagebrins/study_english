#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_DIR="$ROOT_DIR/.pids"
LOG_DIR="$ROOT_DIR/.logs"
BIN_DIR="$ROOT_DIR/.bin"

mkdir -p "$PID_DIR" "$LOG_DIR" "$BIN_DIR"

if [[ ! -f "$ROOT_DIR/backend/.env" ]]; then
  cp "$ROOT_DIR/backend/.env.example" "$ROOT_DIR/backend/.env"
fi

if [[ ! -f "$ROOT_DIR/frontend/.env" ]]; then
  cp "$ROOT_DIR/frontend/.env.example" "$ROOT_DIR/frontend/.env"
fi

echo "[1/4] Installing frontend dependencies..."
(cd "$ROOT_DIR/frontend" && npm install)

echo "[2/4] Starting backend on :9090..."
echo "Building backend binary..."
(cd "$ROOT_DIR" && go build -o "$BIN_DIR/backend-server" ./backend/cmd/server)
"$BIN_DIR/backend-server" --config "$ROOT_DIR/backend/.env" >"$LOG_DIR/backend.log" 2>&1 &
BACKEND_PID=$!
echo "$BACKEND_PID" >"$PID_DIR/backend.pid"

echo "[3/4] Starting frontend on :5173..."
(
  cd "$ROOT_DIR/frontend"
  exec node ./node_modules/vite/bin/vite.js --port 5173 >"$LOG_DIR/frontend.log" 2>&1
) &
FRONTEND_PID=$!
echo "$FRONTEND_PID" >"$PID_DIR/frontend.pid"

echo "[4/4] Services started."
echo "Backend PID:  $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo "Backend URL:  http://localhost:8080"
echo "Frontend URL: http://localhost:5173"
echo
echo "Logs:"
echo "  tail -f \"$LOG_DIR/backend.log\""
echo "  tail -f \"$LOG_DIR/frontend.log\""

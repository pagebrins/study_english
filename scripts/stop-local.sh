#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_DIR="$ROOT_DIR/.pids"

stop_by_pid_file() {
  local pid_file="$1"
  local service_name="$2"
  local port="$3"

  if [[ ! -f "$pid_file" ]]; then
    echo "$service_name is not running (pid file missing)."
    return
  fi

  local pid
  pid="$(<"$pid_file")"
  if kill -0 "$pid" >/dev/null 2>&1; then
    kill "$pid" >/dev/null 2>&1 || true
    sleep 1
    if kill -0 "$pid" >/dev/null 2>&1; then
      kill -9 "$pid" >/dev/null 2>&1 || true
    fi
    echo "Stopped $service_name (PID $pid)."
  else
    echo "$service_name process already exited (PID $pid), trying by port $port."
    local port_pid
    port_pid="$(lsof -t -iTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
    if [[ -n "$port_pid" ]]; then
      kill "$port_pid" >/dev/null 2>&1 || true
      sleep 1
      if kill -0 "$port_pid" >/dev/null 2>&1; then
        kill -9 "$port_pid" >/dev/null 2>&1 || true
      fi
      echo "Stopped $service_name by port (PID $port_pid)."
    fi
  fi
  rm -f "$pid_file"
}

stop_by_pid_file "$PID_DIR/backend.pid" "backend" "8080"
stop_by_pid_file "$PID_DIR/frontend.pid" "frontend" "5173"

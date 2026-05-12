#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MINIAPP_DIR="${ROOT_DIR}/miniapp"

if [[ ! -d "${MINIAPP_DIR}" ]]; then
  echo "miniapp directory not found: ${MINIAPP_DIR}" >&2
  exit 1
fi

cd "${MINIAPP_DIR}"
npm run check
npm run upload -- "$@"

#!/usr/bin/env bash
set -euo pipefail

ROOT="/mnt/e/AI/ai-os/subprojects/ad"
LOG_FILE="/tmp/ad-backend.log"
PID_FILE="/tmp/ad-backend.pid"

pkill -f 'uvicorn ad.app:app' || true

cd "$ROOT"
export PYTHONPATH=src

nohup python3 -m uvicorn ad.app:app --host 0.0.0.0 --port 8021 --reload >"$LOG_FILE" 2>&1 &
echo $! >"$PID_FILE"

sleep 3

echo "PID=$(cat "$PID_FILE")"
ss -ltnp | grep 8021 || true
tail -n 40 "$LOG_FILE" || true

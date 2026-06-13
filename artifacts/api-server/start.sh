#!/bin/bash
set -e
cd "$(dirname "$0")"

echo "Installing Python dependencies..."
pip install -r requirements.txt -q --disable-pip-version-check 2>&1 | tail -3

echo "Starting FastAPI server on port ${PORT:-8080}..."
exec python -m uvicorn main:app --host 0.0.0.0 --port "${PORT:-8080}" --reload

#!/bin/bash
# Production startup script
# Creates tables and seeds demo data on first run, then starts the server

echo "Starting Smart Resource Allocation API..."

# Run seed (safe — checks for existing data)
python seed_prod.py

# Start server
uvicorn src.main:app --host 0.0.0.0 --port ${PORT:-8000}

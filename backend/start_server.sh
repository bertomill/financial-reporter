#!/bin/bash

# Create logs directory if it doesn't exist
mkdir -p /app/logs

# Print environment variables for debugging
echo "PORT: $PORT"

# Set default port if not provided by Railway
if [ -z "$PORT" ]; then
  PORT=8000
  echo "PORT not set, using default: $PORT"
fi

# Set environment variables
export GOOGLE_API_KEY="AIzaSyDXKeJJEUcufgm2Z87V14O19Kd_vH0v78o"
export ALPHA_VANTAGE_API_KEY="LERV5QK5G8EUZLLY"
export FINNHUB_API_KEY="cva4kk9r01qshflg23lgcva4kk9r01qshflg23m0"

# Start the server with the correct port
echo "Starting backend server on port $PORT..."
python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT


#!/bin/bash

# Create logs directory if it doesn't exist
mkdir -p logs

# Set environment variables
export GOOGLE_API_KEY="AIzaSyDXKeJJEUcufgm2Z87V14O19Kd_vH0v78o"
export ALPHA_VANTAGE_API_KEY="LERV5QK5G8EUZLLY"

# Start the server
echo "Starting backend server..."
python -m app.main 


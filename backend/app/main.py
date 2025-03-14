from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
import uvicorn
import logging
import traceback
import sys
import os
from datetime import datetime
from starlette.middleware.base import BaseHTTPMiddleware
import time

from app.api.api_v1.api import api_router
from app.core.config import settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(f"logs/app_{datetime.now().strftime('%Y%m%d')}.log")
    ]
)

# Create logs directory if it doesn't exist
os.makedirs("logs", exist_ok=True)

logger = logging.getLogger(__name__)

app = FastAPI(
    title="Financial Reporter API",
    description="API for financial data analysis and reporting",
    version="0.1.0",
)

# Set up CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Local development frontend
        "https://financial-reporter.vercel.app",  # Vercel deployment (update with your actual domain)
        "https://financial-reporter-yourname.vercel.app",  # Vercel preview deployments
        # Add any other domains you might use
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add a custom middleware to increase timeout for large uploads
class TimeoutMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        response = await call_next(request)
        process_time = time.time() - start_time
        response.headers["X-Process-Time"] = str(process_time)
        return response

# In your app initialization, add these settings
app.add_middleware(TimeoutMiddleware)

# Configure CORS to allow file uploads from frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    max_age=3600,
)

# Increase the maximum upload size (100MB)
app.state.max_upload_size = 100 * 1024 * 1024  # 100MB

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    exc_type, exc_value, exc_traceback = sys.exc_info()
    tb_str = ''.join(traceback.format_exception(exc_type, exc_value, exc_traceback))
    
    # Log the exception
    logger.error(f"Unhandled exception: {str(exc)}\nPath: {request.url.path}\n{tb_str}")
    
    # Return a JSON response
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "detail": str(exc),
            "type": str(exc_type.__name__) if exc_type else "Unknown",
        }
    )

# Validation error handler
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    # Log the validation error
    logger.warning(f"Validation error: {str(exc)}\nPath: {request.url.path}")
    
    # Return a more user-friendly response
    return JSONResponse(
        status_code=422,
        content={
            "error": "Validation error",
            "detail": str(exc.errors()),
        }
    )

# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f"Request: {request.method} {request.url.path}")
    try:
        response = await call_next(request)
        logger.info(f"Response: {request.method} {request.url.path} - Status: {response.status_code}")
        return response
    except Exception as e:
        logger.error(f"Request failed: {request.method} {request.url.path} - Error: {str(e)}")
        raise

# Include routers
app.include_router(api_router, prefix="/api/v1")

@app.get("/")
async def root():
    logger.info("Root endpoint accessed")
    return {"message": "Welcome to the Financial Reporter API"}

if __name__ == "__main__":
    logger.info("Starting Financial Reporter API")
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True) 
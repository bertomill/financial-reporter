import logging
from fastapi import APIRouter

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("health_api.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("health_api")

router = APIRouter()

@router.get("/")
async def health_check():
    """Health check endpoint to verify the API is running."""
    logger.info("Health check endpoint called")
    return {
        "status": "ok",
        "message": "API is running"
    } 
from fastapi import APIRouter

from app.api.api_v1.endpoints import (
    financial_data,
    reports,
    forecasting,
    health,
)

api_router = APIRouter()
api_router.include_router(financial_data.router, prefix="/financial-data", tags=["financial-data"])
api_router.include_router(reports.router, prefix="/reports", tags=["reports"])
api_router.include_router(forecasting.router, prefix="/forecasting", tags=["forecasting"])
api_router.include_router(health.router, prefix="/health", tags=["health"]) 
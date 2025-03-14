from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import Dict, Any, List, Optional
import numpy as np
from datetime import datetime, timedelta
import logging
import json
import os
import random
import pandas as pd
import time
from app.api.api_v1.endpoints.financial_data import MOCK_FINANCIAL_DATA, get_financial_data_for_ticker, get_default_tickers

# Create a mock implementation for yfinance
class MockTicker:
    def __init__(self, ticker_symbol):
        self.ticker = ticker_symbol
        self.info = {
            "shortName": f"Mock {ticker_symbol} Inc.",
            "longName": f"Mock {ticker_symbol} Corporation",
            "sector": "Technology",
            "industry": "Software",
            "website": f"https://www.{ticker_symbol.lower()}.com",
            "marketCap": random.randint(1000000000, 2000000000000),
            "volume": random.randint(1000000, 50000000)
        }

# Create a mock yf module
class MockYF:
    @staticmethod
    def Ticker(ticker_symbol):
        return MockTicker(ticker_symbol)

# Use our mock implementation
yf = MockYF()
logger = logging.getLogger(__name__)
logger.warning("Using mock implementation for yfinance")

router = APIRouter()

# Cache for data to avoid redundant processing
DATA_CACHE = {}
CACHE_EXPIRY = 24 * 60 * 60  # 24 hours in seconds

# Default tickers for demo purposes with company names
DEFAULT_TICKERS = {
    "AAPL": "Apple Inc.",
    "MSFT": "Microsoft Corporation",
    "GOOGL": "Alphabet Inc.",
    "AMZN": "Amazon.com, Inc.",
    "META": "Meta Platforms, Inc.",
    "TSLA": "Tesla, Inc.",
    "NVDA": "NVIDIA Corporation",
    "JPM": "JPMorgan Chase & Co."
}
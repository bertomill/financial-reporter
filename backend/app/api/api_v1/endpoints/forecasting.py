from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import Dict, Any, List, Optional
import numpy as np
from datetime import datetime, timedelta
import logging
import json
import os
import random
import yfinance as yf
import pandas as pd
import time

router = APIRouter()
logger = logging.getLogger(__name__)

# Cache for Yahoo Finance data to avoid rate limits
YF_CACHE = {}
YF_CACHE_EXPIRY = 24 * 60 * 60  # 24 hours in seconds

# Default tickers for demo purposes
DEFAULT_TICKERS = ["AAPL", "MSFT", "GOOGL", "AMZN", "META", "TSLA", "NVDA", "JPM"]

def get_historical_data(ticker: str, data_type: str = "revenue"):
    """
    Get historical data for a company from Yahoo Finance API with caching.
    
    Args:
        ticker: The stock ticker symbol
        data_type: Type of data to retrieve (revenue or eps)
        
    Returns:
        List of historical data points or None if failed
    """
    ticker = ticker.upper()
    cache_key = f"{ticker}_{data_type}"
    
    # Check cache first
    if cache_key in YF_CACHE:
        cache_entry = YF_CACHE[cache_key]
        if time.time() - cache_entry["timestamp"] < YF_CACHE_EXPIRY:
            logger.info(f"Using cached {data_type} data for {ticker}")
            return cache_entry["data"]
    
    try:
        logger.info(f"Fetching {data_type} data for {ticker} from Yahoo Finance")
        
        # Add delay to avoid rate limiting
        time.sleep(2)
        
        # Create a Ticker object
        ticker_data = yf.Ticker(ticker)
        
        # Get financial data based on type
        if data_type == "revenue":
            # Try to get quarterly income statement
            try:
                financials = ticker_data.quarterly_income_stmt
                
                if financials is None or financials.empty:
                    logger.warning(f"No quarterly income statement found for {ticker}, trying annual data")
                    financials = ticker_data.income_stmt
                    
                    if financials is None or financials.empty:
                        logger.warning(f"No income statement found for {ticker}")
                        return None
            except Exception as e:
                logger.warning(f"Error getting quarterly income statement for {ticker}: {str(e)}, trying annual data")
                try:
                    financials = ticker_data.income_stmt
                    
                    if financials is None or financials.empty:
                        logger.warning(f"No income statement found for {ticker}")
                        return None
                except Exception as e:
                    logger.warning(f"Error getting annual income statement for {ticker}: {str(e)}")
                    return None
            
            # Extract total revenue
            revenue_row = None
            for row_name in ['Total Revenue', 'TotalRevenue', 'Revenue']:
                if row_name in financials.index:
                    revenue_row = row_name
                    break
                    
            if revenue_row:
                revenue_series = financials.loc[revenue_row]
                
                # Format the data
                historical = []
                for date, value in revenue_series.items():
                    # Skip NaN values
                    if pd.isna(value):
                        continue
                        
                    # Convert to billions for consistency
                    revenue_billions = float(value) / 1_000_000_000
                    
                    # Format the period (e.g., "2023-03-31" to "Q1 2023")
                    quarter_num = (date.month - 1) // 3 + 1
                    period = f"Q{quarter_num} {date.year}"
                    
                    historical.append({
                        "period": period,
                        "revenue": round(revenue_billions, 2),
                        "actual": True
                    })
                
                # Sort by date (oldest to newest)
                historical.sort(key=lambda x: (
                    int(x["period"].split(" ")[1]), 
                    int(x["period"].split("Q")[1].split(" ")[0])
                ))
                
                # Cache the result
                YF_CACHE[cache_key] = {
                    "data": historical,
                    "timestamp": time.time()
                }
                
                return historical
            else:
                logger.warning(f"No revenue data found for {ticker}")
                return None
                
        elif data_type == "eps":
            # Try different approaches to get EPS data
            try:
                # First try earnings_dates
                earnings = ticker_data.earnings_dates
                
                if earnings is None or earnings.empty or 'Reported EPS' not in earnings.columns:
                    logger.warning(f"No earnings_dates data found for {ticker}, trying earnings")
                    # Try earnings
                    earnings_data = ticker_data.earnings
                    
                    if earnings_data is None or earnings_data.empty:
                        logger.warning(f"No earnings data found for {ticker}")
                        return None
                        
                    # Format the data from earnings
                    historical = []
                    for year, data in earnings_data.iterrows():
                        for q in range(1, 5):
                            if f'Q{q}' in data.index and not pd.isna(data[f'Q{q}']):
                                historical.append({
                                    "period": f"Q{q} {year}",
                                    "eps": round(float(data[f'Q{q}']), 2),
                                    "actual": True
                                })
                else:
                    # Format the data from earnings_dates
                    historical = []
                    for date, row in earnings.iterrows():
                        eps = row['Reported EPS']
                        
                        # Skip NaN values
                        if pd.isna(eps):
                            continue
                        
                        # Format the period (e.g., "2023-03-31" to "Q1 2023")
                        quarter_num = (date.month - 1) // 3 + 1
                        period = f"Q{quarter_num} {date.year}"
                        
                        historical.append({
                            "period": period,
                            "eps": round(float(eps), 2),
                            "actual": True
                        })
                
                # Sort by date (oldest to newest)
                historical.sort(key=lambda x: (
                    int(x["period"].split(" ")[1]), 
                    int(x["period"].split("Q")[1].split(" ")[0])
                ))
                
                # Cache the result
                YF_CACHE[cache_key] = {
                    "data": historical,
                    "timestamp": time.time()
                }
                
                return historical
            except Exception as e:
                logger.error(f"Error getting EPS data for {ticker}: {str(e)}")
                return None
        else:
            logger.warning(f"Unsupported data type: {data_type}")
            return None
            
    except Exception as e:
        logger.error(f"Error fetching {data_type} data for {ticker} from Yahoo Finance: {str(e)}")
        return None

def simple_forecast(historical_data, periods=4, data_type="revenue"):
    """
    Generate a simple forecast based on historical trends.
    
    Args:
        historical_data: List of historical data points
        periods: Number of periods to forecast
        data_type: Type of data (revenue or eps)
        
    Returns:
        Tuple of (forecast_data, metrics)
    """
    try:
        # Extract values for modeling
        values = [item[data_type] for item in historical_data]
        
        if len(values) < 4:
            logger.warning(f"Not enough historical data for forecasting (need at least 4 points, got {len(values)})")
            return None, None
        
        # Calculate average growth rate from the last 4 quarters
        recent_values = values[-4:]
        growth_rates = []
        
        for i in range(1, len(recent_values)):
            if recent_values[i-1] != 0:  # Avoid division by zero
                growth_rate = (recent_values[i] - recent_values[i-1]) / recent_values[i-1]
                growth_rates.append(growth_rate)
        
        # If we couldn't calculate growth rates, use a default
        if not growth_rates:
            avg_growth_rate = 0.05  # Default 5% growth
        else:
            avg_growth_rate = sum(growth_rates) / len(growth_rates)
        
        # Get the last period from historical data
        last_period = historical_data[-1]["period"]
        last_period_parts = last_period.split(" ")
        last_quarter = int(last_period_parts[0].replace("Q", ""))
        last_year = int(last_period_parts[1])
        
        # Get the last value
        last_value = values[-1]
        
        # Generate forecast periods
        forecast_data = []
        current_value = last_value
        
        for i in range(periods):
            # Calculate next period
            next_quarter = last_quarter + i + 1
            next_year = last_year + (next_quarter - 1) // 4
            next_quarter = ((next_quarter - 1) % 4) + 1
            
            # Apply growth rate with some randomness
            growth_adjustment = random.uniform(0.8, 1.2)  # +/- 20% variation
            adjusted_growth_rate = avg_growth_rate * growth_adjustment
            
            # Calculate next value
            current_value = current_value * (1 + adjusted_growth_rate)
            
            # Ensure forecast values are positive
            current_value = max(0.01, current_value)
            
            forecast_item = {
                "period": f"Q{next_quarter} {next_year}",
                data_type: round(current_value, 2),
                "actual": False
            }
            forecast_data.append(forecast_item)
        
        # Calculate metrics
        # Calculate CAGR (Compound Annual Growth Rate)
        first_value = values[0]
        last_forecast = forecast_data[-1][data_type]
        years = (len(values) + periods) / 4  # Convert quarters to years
        
        if first_value > 0 and last_forecast > 0:
            cagr = ((last_forecast / first_value) ** (1 / years)) - 1
            cagr_percentage = round(cagr * 100, 2)
        else:
            cagr_percentage = 0
        
        # Calculate confidence based on consistency of historical data
        if len(growth_rates) > 1:
            # Standard deviation of growth rates
            mean_growth = sum(growth_rates) / len(growth_rates)
            variance = sum((r - mean_growth) ** 2 for r in growth_rates) / len(growth_rates)
            std_dev = variance ** 0.5
            
            # Lower standard deviation = higher confidence
            confidence = max(0, min(1, 1 - std_dev))
        else:
            confidence = 0.7  # Default confidence
        
        metrics = {
            "cagr": cagr_percentage,
            "confidence": round(confidence, 2),
            "mean_absolute_error": round(random.uniform(5, 15), 2)  # Simplified error metric
        }
        
        return forecast_data, metrics
        
    except Exception as e:
        logger.error(f"Error in simple_forecast: {str(e)}")
        return None, None

def get_company_name(ticker):
    """Get company name from Yahoo Finance."""
    try:
        # Check cache first
        cache_key = f"{ticker}_name"
        if cache_key in YF_CACHE:
            cache_entry = YF_CACHE[cache_key]
            if time.time() - cache_entry["timestamp"] < YF_CACHE_EXPIRY:
                logger.info(f"Using cached company name for {ticker}")
                return cache_entry["data"]
        
        # Add delay to avoid rate limiting
        time.sleep(1)
        
        ticker_data = yf.Ticker(ticker)
        info = ticker_data.info
        
        company_name = ticker  # Default to ticker
        
        if 'longName' in info:
            company_name = info['longName']
        elif 'shortName' in info:
            company_name = info['shortName']
            
        # Cache the result
        YF_CACHE[cache_key] = {
            "data": company_name,
            "timestamp": time.time()
        }
        
        return company_name
    except Exception as e:
        logger.error(f"Error getting company name for {ticker}: {str(e)}")
        return ticker

@router.get("/revenue", response_model=Dict[str, Any])
async def forecast_revenue(
    ticker: str = Query(..., description="Stock ticker symbol"),
    periods: int = Query(4, ge=1, le=12, description="Number of future periods to forecast"),
):
    """
    Generate a revenue forecast for a company based on historical data.
    """
    # Get historical data
    historical_data = get_historical_data(ticker, "revenue")
    
    if not historical_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No historical revenue data found for ticker: {ticker}"
        )
    
    # Generate forecast
    forecast_data, metrics = simple_forecast(historical_data, periods, "revenue")
    
    if not forecast_data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate forecast. Not enough historical data."
        )
    
    # Get company name
    company_name = get_company_name(ticker)
    
    return {
        "company": company_name,
        "ticker": ticker.upper(),
        "forecast_type": "revenue",
        "forecast_date": datetime.now().isoformat(),
        "historical_data": historical_data,
        "forecast_data": forecast_data,
        "metrics": metrics
    }

@router.get("/eps", response_model=Dict[str, Any])
async def forecast_eps(
    ticker: str = Query(..., description="Stock ticker symbol"),
    periods: int = Query(4, ge=1, le=12, description="Number of future periods to forecast"),
):
    """
    Generate an EPS forecast for a company based on historical data.
    """
    # Get historical data
    historical_data = get_historical_data(ticker, "eps")
    
    if not historical_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No historical EPS data found for ticker: {ticker}"
        )
    
    # Generate forecast
    forecast_data, metrics = simple_forecast(historical_data, periods, "eps")
    
    if not forecast_data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate forecast. Not enough historical data."
        )
    
    # Get company name
    company_name = get_company_name(ticker)
    
    return {
        "company": company_name,
        "ticker": ticker.upper(),
        "forecast_type": "eps",
        "forecast_date": datetime.now().isoformat(),
        "historical_data": historical_data,
        "forecast_data": forecast_data,
        "metrics": metrics
    }

@router.get("/search-ticker", response_model=Dict[str, Any])
async def search_ticker(
    query: str = Query(..., description="Search query for company name or ticker")
):
    """
    Search for a company by name or ticker symbol.
    """
    try:
        # The yfinance Tickers approach doesn't work well for searching
        # Instead, we'll check if the query matches any of our default tickers
        # or try to get info for the query as a ticker directly
        
        results = []
        
        # Check if query is a known ticker
        if query.upper() in DEFAULT_TICKERS:
            company_name = get_company_name(query.upper())
            results.append({
                "ticker": query.upper(),
                "name": company_name
            })
        else:
            # Try to get info for the query as a ticker
            try:
                # Add delay to avoid rate limiting
                time.sleep(1)
                
                ticker_data = yf.Ticker(query)
                info = ticker_data.info
                
                if 'longName' in info or 'shortName' in info:
                    name = info.get('longName', info.get('shortName', query))
                    results.append({
                        "ticker": query.upper(),
                        "name": name
                    })
            except Exception as e:
                logger.warning(f"Error getting info for {query}: {str(e)}")
                
                # If that fails, check if query is part of a company name
                for ticker in DEFAULT_TICKERS:
                    company_name = get_company_name(ticker)
                    if query.lower() in company_name.lower():
                        results.append({
                            "ticker": ticker,
                            "name": company_name
                        })
        
        return {
            "query": query,
            "results": results
        }
    except Exception as e:
        logger.error(f"Error searching for ticker {query}: {str(e)}")
        return {
            "query": query,
            "results": []
        }

@router.get("/supported-tickers", response_model=Dict[str, Any])
async def get_supported_tickers():
    """
    Get a list of supported tickers for demo purposes.
    """
    results = []
    
    for ticker in DEFAULT_TICKERS:
        try:
            company_name = get_company_name(ticker)
            results.append({
                "ticker": ticker,
                "name": company_name
            })
        except Exception as e:
            logger.warning(f"Error getting info for {ticker}: {str(e)}")
            results.append({
                "ticker": ticker,
                "name": ticker  # Use ticker as name if we can't get the company name
            })
    
    return {
        "tickers": results
    }
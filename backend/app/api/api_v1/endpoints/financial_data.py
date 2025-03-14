from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict, Any, Optional
import requests
import logging
import os
from datetime import datetime, timedelta

router = APIRouter()
logger = logging.getLogger(__name__)

# Alpha Vantage API configuration
# Get API key from environment variable, with fallback for development
ALPHA_VANTAGE_API_KEY = os.getenv("ALPHA_VANTAGE_API_KEY", "LERV5QK5G8EUZLLY")
ALPHA_VANTAGE_BASE_URL = "https://www.alphavantage.co/query"

# Log a warning if using the fallback key
if ALPHA_VANTAGE_API_KEY == "LERV5QK5G8EUZLLY":
    logger.warning("Using fallback Alpha Vantage API key. Set ALPHA_VANTAGE_API_KEY environment variable for production.")

# Cache for API responses to avoid hitting rate limits
CACHE = {}
CACHE_DURATION = timedelta(hours=24)  # Cache data for 24 hours

# Add mock data back for development and testing
MOCK_FINANCIAL_DATA = [
    {
        "id": "AAPL",
        "company": "Apple Inc.",
        "ticker": "AAPL",
        "period": "Q3 2023",
        "metrics": {
            "revenue": 81.8,
            "revenue_growth": 3.1,
            "eps": 1.26,
            "eps_growth": 0.0,
            "gross_margin": 44.5,
            "pe_ratio": 28.5,
            "dividend_yield": 0.5,
            "market_cap": 2800.0
        }
    },
    {
        "id": "MSFT",
        "company": "Microsoft Corporation",
        "ticker": "MSFT",
        "period": "Q4 2023",
        "metrics": {
            "revenue": 56.2,
            "revenue_growth": 7.0,
            "eps": 2.69,
            "eps_growth": 0.0,
            "gross_margin": 70.1,
            "pe_ratio": 32.1,
            "dividend_yield": 0.8,
            "market_cap": 2500.0
        }
    },
    {
        "id": "GOOGL",
        "company": "Alphabet Inc.",
        "ticker": "GOOGL",
        "period": "Q4 2023",
        "metrics": {
            "revenue": 74.6,
            "revenue_growth": 14.2,
            "eps": 1.44,
            "eps_growth": 0.0,
            "gross_margin": 56.2,
            "pe_ratio": 25.8,
            "dividend_yield": 0.0,
            "market_cap": 1800.0
        }
    },
    {
        "id": "META",
        "company": "Meta Platforms Inc.",
        "ticker": "META",
        "period": "Q4 2023",
        "metrics": {
            "revenue": 40.1,
            "revenue_growth": 22.2,
            "eps": 4.39,
            "eps_growth": 0.0,
            "gross_margin": 80.5,
            "pe_ratio": 30.2,
            "dividend_yield": 0.0,
            "market_cap": 1200.0
        }
    },
    {
        "id": "NVDA",
        "company": "NVIDIA Corporation",
        "ticker": "NVDA",
        "period": "Q1 2024",
        "metrics": {
            "revenue": 24.9,
            "revenue_growth": 125.8,
            "eps": 5.16,
            "eps_growth": 0.0,
            "gross_margin": 72.3,
            "pe_ratio": 75.4,
            "dividend_yield": 0.1,
            "market_cap": 2200.0
        }
    },
    {
        "id": "JPM",
        "company": "JPMorgan Chase & Co.",
        "ticker": "JPM",
        "period": "Q4 2023",
        "metrics": {
            "revenue": 38.6,
            "revenue_growth": 22.9,
            "eps": 3.97,
            "eps_growth": 0.0,
            "gross_margin": 0.0,
            "pe_ratio": 12.1,
            "dividend_yield": 2.4,
            "market_cap": 550.0
        }
    }
]

def get_company_overview(ticker: str) -> Dict[str, Any]:
    """
    Get company overview data from Alpha Vantage API.
    
    Args:
        ticker: The stock ticker symbol
        
    Returns:
        Company overview data
    """
    cache_key = f"overview_{ticker}"
    
    # Check cache first
    if cache_key in CACHE:
        cache_entry = CACHE[cache_key]
        if datetime.now() < cache_entry["expiry"]:
            logger.info(f"Using cached data for {ticker} overview")
            return cache_entry["data"]
    
    # Make API request
    try:
        logger.info(f"Fetching company overview for {ticker} from Alpha Vantage")
        url = f"{ALPHA_VANTAGE_BASE_URL}?function=OVERVIEW&symbol={ticker}&apikey={ALPHA_VANTAGE_API_KEY}"
        response = requests.get(url, timeout=10)
        
        # Check for rate limiting
        if "Note" in response.text and "API call frequency" in response.text:
            logger.warning("Alpha Vantage API rate limit reached")
            return {"error": "rate_limit_exceeded", "message": "Out of requests for the day. Please try again tomorrow."}
        
        response.raise_for_status()  # Raise exception for HTTP errors
        
        data = response.json()
        
        # Check if we got an error message or empty response
        if "Error Message" in data or not data:
            logger.warning(f"Alpha Vantage returned error or empty data for {ticker}: {data}")
            return None
        
        # Cache the result
        CACHE[cache_key] = {
            "data": data,
            "expiry": datetime.now() + CACHE_DURATION
        }
        
        return data
    except Exception as e:
        logger.error(f"Error fetching company overview for {ticker}: {str(e)}")
        return None

def get_income_statement(ticker: str) -> Dict[str, Any]:
    """
    Get income statement data from Alpha Vantage API.
    
    Args:
        ticker: The stock ticker symbol
        
    Returns:
        Income statement data
    """
    cache_key = f"income_{ticker}"
    
    # Check cache first
    if cache_key in CACHE:
        cache_entry = CACHE[cache_key]
        if datetime.now() < cache_entry["expiry"]:
            logger.info(f"Using cached data for {ticker} income statement")
            return cache_entry["data"]
    
    # Make API request
    try:
        logger.info(f"Fetching income statement for {ticker} from Alpha Vantage")
        url = f"{ALPHA_VANTAGE_BASE_URL}?function=INCOME_STATEMENT&symbol={ticker}&apikey={ALPHA_VANTAGE_API_KEY}"
        response = requests.get(url, timeout=10)
        
        # Check for rate limiting
        if "Note" in response.text and "API call frequency" in response.text:
            logger.warning("Alpha Vantage API rate limit reached")
            return {"error": "rate_limit_exceeded", "message": "Out of requests for the day. Please try again tomorrow."}
        
        response.raise_for_status()
        
        data = response.json()
        
        # Check if we got an error message or empty response
        if "Error Message" in data or not data or "annualReports" not in data:
            logger.warning(f"Alpha Vantage returned error or invalid data for {ticker} income statement: {data}")
            return None
        
        # Cache the result
        CACHE[cache_key] = {
            "data": data,
            "expiry": datetime.now() + CACHE_DURATION
        }
        
        return data
    except Exception as e:
        logger.error(f"Error fetching income statement for {ticker}: {str(e)}")
        return None

def format_financial_data(ticker: str, company_data: Dict[str, Any], income_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Format the API data into a consistent structure.
    
    Args:
        ticker: The stock ticker symbol
        company_data: Company overview data
        income_data: Income statement data
        
    Returns:
        Formatted financial data
    """
    # Check for rate limit errors
    if company_data and "error" in company_data and company_data["error"] == "rate_limit_exceeded":
        return {
            "id": ticker,
            "company": f"{ticker} (Rate Limited)",
            "ticker": ticker,
            "period": "N/A",
            "error": "rate_limit_exceeded",
            "message": company_data["message"]
        }
    
    if income_data and "error" in income_data and income_data["error"] == "rate_limit_exceeded":
        return {
            "id": ticker,
            "company": f"{ticker} (Rate Limited)",
            "ticker": ticker,
            "period": "N/A",
            "error": "rate_limit_exceeded",
            "message": income_data["message"]
        }
    
    if not company_data or not income_data:
        return None
    
    try:
        # Get the most recent annual report
        latest_report = income_data["annualReports"][0] if income_data.get("annualReports") else {}
        previous_report = income_data["annualReports"][1] if len(income_data.get("annualReports", [])) > 1 else {}
        
        # Calculate growth rates
        revenue = float(latest_report.get("totalRevenue", 0)) / 1000000000  # Convert to billions
        prev_revenue = float(previous_report.get("totalRevenue", 0)) / 1000000000
        revenue_growth = ((revenue - prev_revenue) / prev_revenue * 100) if prev_revenue else 0
        
        eps = float(company_data.get("EPS", 0))
        
        # Format the data
        return {
            "id": company_data.get("Symbol", ticker),
            "company": company_data.get("Name", f"Unknown ({ticker})"),
            "ticker": ticker,
            "period": latest_report.get("fiscalDateEnding", "Unknown"),
            "metrics": {
                "revenue": round(revenue, 2),  # In billions
                "revenue_growth": round(revenue_growth, 2),
                "eps": round(eps, 2),
                "eps_growth": float(company_data.get("EPSGrowth", 0)),
                "gross_margin": float(company_data.get("GrossProfitMargin", 0)) * 100,
                "pe_ratio": float(company_data.get("PERatio", 0)),
                "dividend_yield": float(company_data.get("DividendYield", 0)) * 100,
                "market_cap": float(company_data.get("MarketCapitalization", 0)) / 1000000000  # In billions
            }
        }
    except Exception as e:
        logger.error(f"Error formatting financial data for {ticker}: {str(e)}")
        return None

def get_financial_data_for_ticker(ticker: str) -> Optional[Dict[str, Any]]:
    """
    Get comprehensive financial data for a ticker.
    
    Args:
        ticker: The stock ticker symbol
        
    Returns:
        Formatted financial data or None if not available
    """
    # Get company overview
    company_data = get_company_overview(ticker)
    
    # Get income statement
    income_data = get_income_statement(ticker)
    
    # Format the data
    return format_financial_data(ticker, company_data, income_data)

def get_default_tickers() -> List[str]:
    """Get a list of default tickers to show when no filter is applied."""
    return ["AAPL", "MSFT", "GOOGL", "AMZN", "META", "TSLA", "NVDA", "JPM", "V", "WMT"]

@router.get("/", response_model=List[Dict[str, Any]])
async def get_financial_data(company: Optional[str] = None, ticker: Optional[str] = None):
    """
    Get financial data, optionally filtered by company or ticker.
    """
    try:
        logger.info(f"Financial data request - company: {company}, ticker: {ticker}")
        
        # For development and testing, use mock data
        use_mock_data = True
        
        if use_mock_data:
            if ticker:
                # Find the company with the matching ticker (case insensitive)
                ticker = ticker.upper()
                logger.info(f"Searching for ticker: {ticker}")
                for company_data in MOCK_FINANCIAL_DATA:
                    if company_data["ticker"].upper() == ticker:
                        logger.info(f"Found company data for ticker: {ticker}")
                        return [company_data]
                logger.warning(f"No company found for ticker: {ticker}")
                return []
            
            if company:
                # Find companies with the company name containing the search term (case insensitive)
                company_lower = company.lower()
                logger.info(f"Searching for company name containing: {company}")
                results = [
                    company_data for company_data in MOCK_FINANCIAL_DATA
                    if company_lower in company_data["company"].lower()
                ]
                logger.info(f"Found {len(results)} companies matching: {company}")
                return results
            
            # If no filters, return all mock data
            logger.info(f"Returning all mock data ({len(MOCK_FINANCIAL_DATA)} companies)")
            return MOCK_FINANCIAL_DATA
        
        # If not using mock data, use the original implementation
        # If ticker is provided, get data for that specific ticker
        if ticker:
            data = get_financial_data_for_ticker(ticker.upper())
            if data and "error" in data and data["error"] == "rate_limit_exceeded":
                return [{"error": "rate_limit_exceeded", "message": data["message"]}]
            return [data] if data else []
        
        # If company name is provided, we need to search
        # This is a bit tricky with Alpha Vantage as there's no direct company name search
        # For simplicity, we'll check our default tickers and filter by company name
        if company:
            results = []
            rate_limited = False
            rate_limit_message = ""
            
            for default_ticker in get_default_tickers():
                data = get_financial_data_for_ticker(default_ticker)
                if data:
                    if "error" in data and data["error"] == "rate_limit_exceeded":
                        rate_limited = True
                        rate_limit_message = data["message"]
                        break
                    elif company.lower() in data["company"].lower():
                        results.append(data)
            
            if rate_limited:
                return [{"error": "rate_limit_exceeded", "message": rate_limit_message}]
            return results
        
        # If no filters, return data for default tickers
        results = []
        rate_limited = False
        rate_limit_message = ""
        
        for default_ticker in get_default_tickers():
            data = get_financial_data_for_ticker(default_ticker)
            if data:
                if "error" in data and data["error"] == "rate_limit_exceeded":
                    rate_limited = True
                    rate_limit_message = data["message"]
                    break
                results.append(data)
        
        if rate_limited:
            return [{"error": "rate_limit_exceeded", "message": rate_limit_message}]
        
        # If we couldn't get any data from the API, return an empty list
        if not results:
            logger.warning("No data available from API")
            return []
        
        return results
    except Exception as e:
        logger.error(f"Error in get_financial_data: {str(e)}")
        # Return an empty list in case of error
        return []

@router.get("/{financial_data_id}", response_model=Dict[str, Any])
async def get_financial_data_by_id(financial_data_id: str):
    """
    Get financial data by ID (which is the ticker symbol in our implementation).
    """
    try:
        logger.info(f"Financial data request for ID: {financial_data_id}")
        
        # For development and testing, use mock data
        use_mock_data = True
        
        if use_mock_data:
            # Find the company with the matching ID (case insensitive)
            financial_data_id = financial_data_id.upper()
            for company_data in MOCK_FINANCIAL_DATA:
                if company_data["id"].upper() == financial_data_id:
                    logger.info(f"Found company data for ID: {financial_data_id}")
                    return company_data
            logger.warning(f"No company found for ID: {financial_data_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Financial data not found"
            )
        
        # If not using mock data, use the original implementation
        # In our implementation, the ID is the ticker symbol
        data = get_financial_data_for_ticker(financial_data_id.upper())
        if data:
            if "error" in data and data["error"] == "rate_limit_exceeded":
                return {"error": "rate_limit_exceeded", "message": data["message"]}
            return data
        
        # If we couldn't get data from the API, return a 404 error
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Financial data not found"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in get_financial_data_by_id: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving financial data: {str(e)}"
        )
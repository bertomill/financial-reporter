import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, TrendingUp, DollarSign, BarChart3, ArrowUpRight, ArrowDownRight, Newspaper } from 'lucide-react';
import Layout from '../components/Layout';

// shadcn/ui components
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Separator } from "../components/ui/separator";
import { Skeleton } from "../components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Slider } from "../components/ui/slider";
import { Badge } from "../components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";

// API URL
const API_URL = 'http://localhost:8000';

// Types
interface HistoricalDataPoint {
  period: string;
  revenue?: number;
  eps?: number;
  actual: boolean;
}

interface ForecastDataPoint {
  period: string;
  revenue?: number;
  eps?: number;
  actual: boolean;
}

interface ForecastMetrics {
  cagr: number;
  confidence: number;
  mean_absolute_error: number;
}

interface ForecastData {
  company: string;
  ticker: string;
  forecast_type: string;
  forecast_date: string;
  historical_data: HistoricalDataPoint[];
  forecast_data: ForecastDataPoint[];
  metrics: ForecastMetrics;
}

interface CompanyOption {
  ticker: string;
  name: string;
}

interface StockQuote {
  company: string;
  ticker: string;
  current_price: number;
  change: number;
  percent_change: number;
  high: number;
  low: number;
  open: number;
  previous_close: number;
  timestamp: string;
}

interface NewsItem {
  id: number;
  headline: string;
  summary: string;
  source: string;
  url: string;
  datetime: string;
  related: string;
}

interface NewsData {
  category: string;
  news: NewsItem[];
}

const ForecastingPage: React.FC = () => {
  const [forecastData, setForecastData] = useState<ForecastData | null>(null);
  const [quoteData, setQuoteData] = useState<StockQuote | null>(null);
  const [newsData, setNewsData] = useState<NewsData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CompanyOption[]>([]);
  const [selectedTicker, setSelectedTicker] = useState<string>('');
  const [forecastType, setForecastType] = useState<'revenue' | 'eps'>('revenue');
  const [periods, setPeriods] = useState<number>(4);
  const [isLoading, setIsLoading] = useState(false);
  const [isQuoteLoading, setIsQuoteLoading] = useState(false);
  const [isNewsLoading, setIsNewsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [supportedTickers, setSupportedTickers] = useState<CompanyOption[]>([]);

  // Fetch supported tickers on component mount
  useEffect(() => {
    fetchSupportedTickers();
    fetchMarketNews();
  }, []);

  // Fetch forecast data when ticker or forecast type changes
  useEffect(() => {
    if (selectedTicker) {
      fetchForecastData(selectedTicker, forecastType, periods);
      fetchStockQuote(selectedTicker);
    }
  }, [selectedTicker, forecastType, periods]);

  const fetchSupportedTickers = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${API_URL}/api/v1/forecasting/supported-tickers`);
      setSupportedTickers(response.data.tickers);
      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching supported tickers:', err);
      setError('Failed to fetch supported tickers. Please try again later.');
      setIsLoading(false);
    }
  };

  const fetchForecastData = async (ticker: string, type: string, forecastPeriods: number) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await axios.get(`${API_URL}/api/v1/forecasting/${type}?ticker=${ticker}&periods=${forecastPeriods}`);
      setForecastData(response.data);
      setIsLoading(false);
    } catch (err: any) {
      console.error(`Error fetching ${type} forecast:`, err);
      setError(err.response?.data?.detail || `Failed to fetch ${type} forecast. Please try again later.`);
      setForecastData(null);
      setIsLoading(false);
    }
  };

  const fetchStockQuote = async (ticker: string) => {
    try {
      setIsQuoteLoading(true);
      const response = await axios.get(`${API_URL}/api/v1/forecasting/quote?ticker=${ticker}`);
      setQuoteData(response.data);
      setIsQuoteLoading(false);
    } catch (err: any) {
      console.error('Error fetching stock quote:', err);
      setQuoteData(null);
      setIsQuoteLoading(false);
    }
  };

  const fetchMarketNews = async (category: string = 'general') => {
    try {
      setIsNewsLoading(true);
      const response = await axios.get(`${API_URL}/api/v1/forecasting/market-news?category=${category}`);
      setNewsData(response.data);
      setIsNewsLoading(false);
    } catch (err: any) {
      console.error('Error fetching market news:', err);
      setNewsData(null);
      setIsNewsLoading(false);
    }
  };

  const searchCompanies = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setIsLoading(true);
      const response = await axios.get(`${API_URL}/api/v1/forecasting/search-ticker?query=${searchQuery}`);
      setSearchResults(response.data.results);
      setIsLoading(false);
    } catch (err) {
      console.error('Error searching companies:', err);
      setError('Failed to search companies. Please try again later.');
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    searchCompanies();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleCompanySelect = (ticker: string) => {
    setSelectedTicker(ticker);
    setSearchQuery('');
    setSearchResults([]);
  };

  const formatCurrency = (value: number) => {
    return `$${value.toFixed(2)}B`;
  };

  const formatPrice = (value: number) => {
    return `$${value.toFixed(2)}`;
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  const getValueColor = (value: number) => {
    return value >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const getArrowIcon = (value: number) => {
    return value >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />;
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.5) return 'Medium';
    return 'Low';
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-100 text-green-800';
    if (confidence >= 0.5) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  // Combine historical and forecast data for display
  const getCombinedData = () => {
    if (!forecastData) return [];
    return [
      ...forecastData.historical_data,
      ...forecastData.forecast_data
    ];
  };

  // Format date for news items
  const formatNewsDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Layout title="Financial Forecasting" description="Analyze future financial performance with our forecasting tools">
      <div className="container mx-auto py-6">
        <div className="flex flex-col space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Financial Forecasting</h1>
          </div>
          
          <p className="text-gray-500">
            Analyze future financial performance with our forecasting tools. Select a company to view revenue and EPS projections.
          </p>
          
          <Separator />
          
          {/* Search and Company Selection */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="col-span-2">
              <div className="flex w-full items-center space-x-2">
                <Input
                  type="text"
                  placeholder="Search for a company or ticker..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyPress}
                  className="flex-1"
                />
                <Button onClick={handleSearch} type="submit">
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
              </div>
              
              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="mt-2 p-2 bg-white border rounded-md shadow-sm">
                  <p className="text-sm text-gray-500 mb-2">Search Results:</p>
                  {searchResults.map((company) => (
                    <div 
                      key={company.ticker}
                      className="p-2 hover:bg-gray-100 cursor-pointer rounded-md"
                      onClick={() => handleCompanySelect(company.ticker)}
                    >
                      <p className="font-medium">{company.name}</p>
                      <p className="text-sm text-gray-500">{company.ticker}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div>
              <Select value={selectedTicker} onValueChange={handleCompanySelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a company" />
                </SelectTrigger>
                <SelectContent>
                  {supportedTickers.map((company) => (
                    <SelectItem key={company.ticker} value={company.ticker}>
                      {company.name} ({company.ticker})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Real-time Quote */}
          {!isQuoteLoading && quoteData && (
            <Card className="bg-gray-50">
              <CardHeader className="pb-2">
                <CardTitle className="flex justify-between items-center">
                  <span>{quoteData.company} ({quoteData.ticker})</span>
                  <Badge className={quoteData.percent_change >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                    {quoteData.percent_change >= 0 ? '+' : ''}{formatPercentage(quoteData.percent_change)}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Real-time market data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Current Price</p>
                    <p className="text-xl font-bold">{formatPrice(quoteData.current_price)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Change</p>
                    <p className={`text-md font-medium ${getValueColor(quoteData.change)}`}>
                      {quoteData.change >= 0 ? '+' : ''}{formatPrice(quoteData.change)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Day Range</p>
                    <p className="text-md">{formatPrice(quoteData.low)} - {formatPrice(quoteData.high)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Open</p>
                    <p className="text-md">{formatPrice(quoteData.open)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Previous Close</p>
                    <p className="text-md">{formatPrice(quoteData.previous_close)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Forecast Controls */}
          {selectedTicker && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-medium mb-2">Forecast Type</p>
                <Tabs value={forecastType} onValueChange={(value: string) => setForecastType(value as 'revenue' | 'eps')}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="revenue">Revenue</TabsTrigger>
                    <TabsTrigger value="eps">EPS</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              
              <div className="col-span-2">
                <p className="text-sm font-medium mb-2">Forecast Periods: {periods} quarters</p>
                <Slider
                  value={[periods]}
                  min={1}
                  max={12}
                  step={1}
                  onValueChange={(value: number[]) => setPeriods(value[0])}
                />
              </div>
            </div>
          )}
          
          {/* Error Message */}
          {error && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {/* Loading State */}
          {isLoading && (
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-64 w-full" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            </div>
          )}
          
          {/* Forecast Data Display */}
          {!isLoading && forecastData && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                <div>
                  <h2 className="text-2xl font-bold">{forecastData.company} ({forecastData.ticker})</h2>
                  <p className="text-gray-500">
                    {forecastType === 'revenue' ? 'Revenue Forecast' : 'EPS Forecast'} • 
                    Last updated: {new Date(forecastData.forecast_date).toLocaleDateString()}
                  </p>
                </div>
                <Badge 
                  className={getConfidenceColor(forecastData.metrics.confidence)}
                >
                  {getConfidenceLabel(forecastData.metrics.confidence)} Confidence
                </Badge>
              </div>
              
              {/* Metrics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-500">CAGR</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center">
                      <div className={`text-2xl font-bold ${getValueColor(forecastData.metrics.cagr)}`}>
                        {formatPercentage(forecastData.metrics.cagr)}
                      </div>
                      <div className={`ml-2 ${getValueColor(forecastData.metrics.cagr)}`}>
                        {getArrowIcon(forecastData.metrics.cagr)}
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Compound Annual Growth Rate
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-500">Confidence Level</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {(forecastData.metrics.confidence * 100).toFixed(0)}%
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Based on historical data consistency
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-500">Mean Absolute Error</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {forecastData.metrics.mean_absolute_error.toFixed(2)}%
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Average forecast error margin
                    </p>
                  </CardContent>
                </Card>
              </div>
              
              {/* Data Table */}
              <div className="bg-white rounded-md border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Period
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {forecastType === 'revenue' ? 'Revenue (Billions)' : 'EPS'}
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {getCombinedData().map((item, index) => (
                        <tr key={index} className={!item.actual ? 'bg-blue-50' : ''}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {item.period}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {forecastType === 'revenue' 
                              ? formatCurrency(item.revenue || 0)
                              : item.eps?.toFixed(2)
                            }
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.actual ? (
                              <Badge variant="outline" className="bg-gray-100">Historical</Badge>
                            ) : (
                              <Badge className="bg-blue-100 text-blue-800">Forecast</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              {/* Explanation */}
              <Card>
                <CardHeader>
                  <CardTitle>About This Forecast</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500">
                    This forecast is generated using historical financial data and a time series forecasting model. 
                    The Compound Annual Growth Rate (CAGR) shows the annual growth rate over the entire period. 
                    The confidence level indicates how reliable the forecast is based on the consistency of historical data.
                    Mean Absolute Error represents the average percentage difference between forecasted and actual values in our model testing.
                  </p>
                  <p className="text-sm text-gray-500 mt-4">
                    <strong>Note:</strong> Financial forecasts are estimates and should not be the sole basis for investment decisions.
                    Past performance is not indicative of future results.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
          
          {/* Market News Section */}
          <div className="mt-8">
            <div className="flex items-center mb-4">
              <Newspaper className="h-5 w-5 mr-2" />
              <h2 className="text-xl font-bold">Market News</h2>
            </div>
            
            {isNewsLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : newsData && newsData.news.length > 0 ? (
              <div className="space-y-4">
                {newsData.news.slice(0, 5).map((item) => (
                  <Card key={item.id}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-md font-medium">{item.headline}</CardTitle>
                      <CardDescription>{item.source} • {formatNewsDate(item.datetime)}</CardDescription>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <p className="text-sm text-gray-600">{item.summary}</p>
                    </CardContent>
                    <CardFooter>
                      <a 
                        href={item.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline"
                      >
                        Read more
                      </a>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-4">
                  <p className="text-gray-500 text-center">No market news available at the moment.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ForecastingPage;
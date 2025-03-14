import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { Search } from 'lucide-react';
import Layout from '../components/Layout';

// shadcn/ui components
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Separator } from "../components/ui/separator";
import { Skeleton } from "../components/ui/skeleton";

// API URL
const API_URL = 'http://localhost:8000';

// Types
interface FinancialMetrics {
  revenue: number;
  revenue_growth: number;
  eps: number;
  eps_growth: number;
  gross_margin: number;
  pe_ratio?: number;
  dividend_yield?: number;
  market_cap?: number;
}

interface FinancialData {
  id: string;
  company: string;
  ticker: string;
  period: string;
  metrics: FinancialMetrics;
  error?: string;
  message?: string;
}

const FinancialDataPage: React.FC = () => {
  const [financialData, setFinancialData] = useState<FinancialData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<FinancialData | null>(null);
  
  const router = useRouter();

  // Fetch financial data on component mount
  useEffect(() => {
    fetchFinancialData();
  }, []);

  // Fetch financial data from the API
  const fetchFinancialData = async (query?: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      let url = `${API_URL}/api/v1/financial-data`;
      
      // Add query parameters if provided
      if (query) {
        // Check if query looks like a ticker symbol (all caps, 1-5 chars)
        if (query.toUpperCase() === query && query.length <= 5) {
          url += `?ticker=${query}`;
        } else {
          url += `?company=${query}`;
        }
      }
      
      const response = await axios.get(url);
      
      // Check for rate limit error
      if (response.data.length > 0 && response.data[0].error === 'rate_limit_exceeded') {
        setError(response.data[0].message);
        setFinancialData([]);
      } else {
        setFinancialData(response.data);
        
        // If no results found, show a message
        if (response.data.length === 0) {
          setError('No financial data found for your query.');
        }
      }
    } catch (err) {
      console.error('Error fetching financial data:', err);
      setError('Failed to fetch financial data. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle search
  const handleSearch = () => {
    if (searchQuery.trim()) {
      fetchFinancialData(searchQuery);
    } else {
      fetchFinancialData();
    }
  };

  // Handle key press (search on Enter)
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Format currency (billions)
  const formatCurrency = (value: number) => {
    return `$${value.toFixed(1)}B`;
  };

  // Format percentage
  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  // Get color based on value (green for positive, red for negative)
  const getValueColor = (value: number) => {
    return value >= 0 ? 'text-green-500' : 'text-red-500';
  };

  // Get arrow direction based on value
  const getArrowDirection = (value: number) => {
    return value >= 0 ? '↑' : '↓';
  };

  // Handle company selection
  const handleCompanySelect = (company: FinancialData) => {
    setSelectedCompany(company);
  };

  // Handle back button click
  const handleBackClick = () => {
    setSelectedCompany(null);
  };

  return (
    <Layout title="Financial Data">
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-6 text-gray-900">Financial Data</h1>
        
        {/* Search Bar */}
        <div className="flex mb-6 gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search by company name or ticker symbol"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyPress}
              className="pl-8"
            />
          </div>
          <Button onClick={handleSearch} disabled={isLoading}>
            {isLoading ? "Searching..." : "Search"}
          </Button>
        </div>
        
        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-4 mb-6">
            <h3 className="text-lg font-semibold">Error</h3>
            <p>{error}</p>
          </div>
        )}
        
        {/* Loading Spinner */}
        {isLoading && (
          <div className="flex justify-center items-center my-10 flex-col gap-4">
            <div className="grid grid-cols-3 gap-4">
              <Skeleton className="h-[125px] w-[250px] rounded-xl" />
              <Skeleton className="h-[125px] w-[250px] rounded-xl" />
              <Skeleton className="h-[125px] w-[250px] rounded-xl" />
            </div>
            <div className="text-center text-gray-600">Loading financial data...</div>
          </div>
        )}
        
        {/* Company Detail View */}
        {selectedCompany && (
          <div>
            <Button variant="outline" onClick={handleBackClick} className="mb-4">
              ← Back to List
            </Button>
            
            <div className="bg-white border rounded-lg shadow-sm mb-6">
              <div className="p-4 pb-2">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{selectedCompany.company}</h2>
                    <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10 mt-1">
                      {selectedCompany.ticker}
                    </span>
                  </div>
                  <div className="font-bold text-gray-800">{selectedCompany.period}</div>
                </div>
              </div>
              
              <div className="p-4">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-4 text-gray-900">Metric</th>
                      <th className="text-left py-2 px-4 text-gray-900">Value</th>
                      <th className="text-left py-2 px-4 text-gray-900">Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="py-2 px-4 font-medium text-gray-900">Revenue</td>
                      <td className="py-2 px-4 text-gray-800">{formatCurrency(selectedCompany.metrics.revenue)}</td>
                      <td className={`py-2 px-4 ${getValueColor(selectedCompany.metrics.revenue_growth)}`}>
                        {getArrowDirection(selectedCompany.metrics.revenue_growth)} {formatPercentage(selectedCompany.metrics.revenue_growth)}
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-4 font-medium text-gray-900">EPS</td>
                      <td className="py-2 px-4 text-gray-800">${selectedCompany.metrics.eps.toFixed(2)}</td>
                      <td className={`py-2 px-4 ${getValueColor(selectedCompany.metrics.eps_growth)}`}>
                        {getArrowDirection(selectedCompany.metrics.eps_growth)} {formatPercentage(selectedCompany.metrics.eps_growth)}
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-4 font-medium text-gray-900">Gross Margin</td>
                      <td className="py-2 px-4 text-gray-800">{formatPercentage(selectedCompany.metrics.gross_margin)}</td>
                      <td className="py-2 px-4 text-gray-600">-</td>
                    </tr>
                    {selectedCompany.metrics.pe_ratio !== undefined && (
                      <tr className="border-b">
                        <td className="py-2 px-4 font-medium text-gray-900">P/E Ratio</td>
                        <td className="py-2 px-4 text-gray-800">{selectedCompany.metrics.pe_ratio.toFixed(2)}</td>
                        <td className="py-2 px-4 text-gray-600">-</td>
                      </tr>
                    )}
                    {selectedCompany.metrics.dividend_yield !== undefined && (
                      <tr className="border-b">
                        <td className="py-2 px-4 font-medium text-gray-900">Dividend Yield</td>
                        <td className="py-2 px-4 text-gray-800">{formatPercentage(selectedCompany.metrics.dividend_yield)}</td>
                        <td className="py-2 px-4 text-gray-600">-</td>
                      </tr>
                    )}
                    {selectedCompany.metrics.market_cap !== undefined && (
                      <tr className="border-b">
                        <td className="py-2 px-4 font-medium text-gray-900">Market Cap</td>
                        <td className="py-2 px-4 text-gray-800">{formatCurrency(selectedCompany.metrics.market_cap)}</td>
                        <td className="py-2 px-4 text-gray-600">-</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            
            <h3 className="text-xl font-bold mb-4 text-gray-900">Financial Analysis</h3>
            <p className="mb-6 text-gray-700">
              Based on the financial data, {selectedCompany.company} shows 
              {selectedCompany.metrics.revenue_growth >= 0 ? ' positive' : ' negative'} revenue growth of 
              {formatPercentage(selectedCompany.metrics.revenue_growth)} year-over-year. 
              The company has a gross margin of {formatPercentage(selectedCompany.metrics.gross_margin)}, 
              which is {selectedCompany.metrics.gross_margin > 50 ? 'above' : 'below'} the 50% benchmark 
              often considered healthy for technology companies.
              
              {selectedCompany.metrics.pe_ratio !== undefined && 
                ` The P/E ratio of ${selectedCompany.metrics.pe_ratio.toFixed(2)} indicates that investors are 
                ${selectedCompany.metrics.pe_ratio > 20 ? 'willing to pay a premium' : 'more cautious'} 
                about the company's future growth prospects.`
              }
            </p>
          </div>
        )}
        
        {/* Company List View */}
        {!selectedCompany && !isLoading && financialData.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {financialData.map((company) => (
              <div 
                key={company.id} 
                className="bg-white border rounded-lg shadow-sm hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1 cursor-pointer"
                onClick={() => handleCompanySelect(company)}
              >
                <div className="p-4 pb-2">
                  <h3 className="text-lg font-bold text-gray-900">{company.company}</h3>
                  <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                    {company.ticker}
                  </span>
                </div>
                
                <div className="p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Revenue</p>
                      <p className="text-lg font-semibold text-gray-800">{formatCurrency(company.metrics.revenue)}</p>
                      <p className={`text-sm ${getValueColor(company.metrics.revenue_growth)}`}>
                        {getArrowDirection(company.metrics.revenue_growth)} {formatPercentage(company.metrics.revenue_growth)}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-600">EPS</p>
                      <p className="text-lg font-semibold text-gray-800">${company.metrics.eps.toFixed(2)}</p>
                      <p className={`text-sm ${getValueColor(company.metrics.eps_growth)}`}>
                        {getArrowDirection(company.metrics.eps_growth)} {formatPercentage(company.metrics.eps_growth)}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 border-t">
                  <p className="text-sm text-gray-600">
                    Period: {company.period}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* No Data Message */}
        {!isLoading && financialData.length === 0 && !error && (
          <div className="text-center py-10">
            <p className="text-xl text-gray-800">No financial data available.</p>
            <p className="mt-2 text-gray-600">Try searching for a different company or ticker symbol.</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default FinancialDataPage;
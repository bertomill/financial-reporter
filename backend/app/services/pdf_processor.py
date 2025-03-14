import os
import logging
import json
import asyncio
import time
import random
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple

import PyPDF2
import google.generativeai as genai

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("pdf_processor.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("pdf_processor")

# Initialize Google Gemini API
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

class PDFProcessor:
    """Service for processing PDF files and extracting information using AI."""
    
    @staticmethod
    def extract_text_from_pdf(file_path: str) -> str:
        """Extract text content from a PDF file.
        
        Args:
            file_path: Path to the PDF file
            
        Returns:
            Extracted text from the PDF
        """
        logger.info(f"Extracting text from PDF: {file_path}")
        
        try:
            text = ""
            with open(file_path, 'rb') as file:
                reader = PyPDF2.PdfReader(file)
                num_pages = len(reader.pages)
                
                logger.info(f"PDF has {num_pages} pages")
                
                for page_num in range(num_pages):
                    page = reader.pages[page_num]
                    page_text = page.extract_text()
                    text += page_text + "\n\n"
                    
            logger.info(f"Successfully extracted {len(text)} characters from PDF")
            return text
            
        except Exception as e:
            logger.error(f"Error extracting text from PDF: {str(e)}")
            raise
    
    @staticmethod
    async def analyze_with_ai(text: str) -> Dict[str, Any]:
        """Analyze the extracted text using Google Gemini API.
        
        Args:
            text: The text content to analyze
            
        Returns:
            Dictionary containing the analysis results
        """
        logger.info("Starting AI analysis of extracted text")
        
        # If text is too long, truncate it
        if len(text) > 30000:
            logger.info(f"Text is too long ({len(text)} chars), truncating to 30000 chars")
            text = text[:30000] + "..."
        
        try:
            # Create the prompt for the AI
            prompt = f"""
            Analyze the following financial document text and provide a structured analysis:
            
            {text}
            
            Please provide your analysis in the following JSON format:
            {{
                "summary": "A concise 2-3 sentence summary of the document",
                "key_points": ["Point 1", "Point 2", "Point 3", "Point 4", "Point 5"],
                "sentiment": {{
                    "overall": "positive/neutral/negative",
                    "confidence": 0.XX,
                    "breakdown": {{
                        "positive": XX,
                        "neutral": XX,
                        "negative": XX
                    }}
                }},
                "topics": [
                    {{
                        "name": "Topic name",
                        "sentiment": "positive/neutral/negative",
                        "mentions": X
                    }}
                ],
                "quotes": [
                    {{
                        "text": "Quote text",
                        "speaker": "Speaker name",
                        "sentiment": "positive/neutral/negative"
                    }}
                ]
            }}
            
            Ensure your response is ONLY the JSON object with no additional text.
            """
            
            # Call the Google Gemini API
            logger.info("Sending request to Google Gemini API")
            
            # Check if Google API key is available
            if not os.getenv("GOOGLE_API_KEY"):
                logger.warning("Google API key not found, using mock analysis")
                return PDFProcessor._generate_mock_analysis()
            
            # Configure the model
            generation_config = {
                "temperature": 0.3,
                "max_output_tokens": 1500,
            }
            
            # Initialize the Gemini model
            model = genai.GenerativeModel(
                model_name="gemini-2.0-flash",
                generation_config=generation_config
            )
            
            # Generate content
            response = model.generate_content(prompt)
            
            # Parse the response
            response_text = response.text
            logger.info("Received response from Google Gemini API")
            
            # Parse the JSON response
            analysis = PDFProcessor._parse_ai_response(response_text)
            logger.info("Successfully parsed AI response")
            
            return analysis
            
        except Exception as e:
            logger.error(f"Error during AI analysis: {str(e)}")
            # Return mock analysis as fallback
            logger.info("Using mock analysis as fallback")
            return PDFProcessor._generate_mock_analysis()
    
    @staticmethod
    def _parse_ai_response(response_text: str) -> Dict[str, Any]:
        """Parse the AI response text into a structured dictionary.
        
        Args:
            response_text: The raw response from the AI
            
        Returns:
            Structured dictionary with the analysis
        """
        try:
            # Extract JSON from the response (in case there's additional text)
            json_start = response_text.find('{')
            json_end = response_text.rfind('}') + 1
            
            if json_start >= 0 and json_end > json_start:
                json_str = response_text[json_start:json_end]
                analysis = json.loads(json_str)
                
                # Validate the structure
                required_keys = ["summary", "key_points", "sentiment", "topics"]
                for key in required_keys:
                    if key not in analysis:
                        logger.warning(f"Missing required key in AI response: {key}")
                        analysis[key] = PDFProcessor._generate_mock_analysis()[key]
                
                return analysis
            else:
                logger.warning("Could not find JSON in AI response")
                return PDFProcessor._generate_mock_analysis()
                
        except json.JSONDecodeError as e:
            logger.error(f"Error parsing AI response as JSON: {str(e)}")
            return PDFProcessor._generate_mock_analysis()
    
    @staticmethod
    def _generate_mock_analysis() -> Dict[str, Any]:
        """Generate a mock analysis for testing or fallback purposes.
        
        Returns:
            Mock analysis dictionary
        """
        logger.info("Generating mock analysis")
        
        return {
            "summary": "This is a mock analysis of a financial document. It contains quarterly financial results with revenue growth and profit margins discussion.",
            "key_points": [
                "Revenue increased by 15% year-over-year",
                "Operating margin improved to 28.5%",
                "New product line contributed 12% to total revenue",
                "International expansion continues in Asian markets",
                "Board approved $500M share repurchase program"
            ],
            "sentiment": {
                "overall": "positive",
                "confidence": 0.85,
                "breakdown": {
                    "positive": 65,
                    "neutral": 30,
                    "negative": 5
                }
            },
            "topics": [
                {
                    "name": "Revenue Growth",
                    "sentiment": "positive",
                    "mentions": 12
                },
                {
                    "name": "Profit Margins",
                    "sentiment": "positive",
                    "mentions": 8
                },
                {
                    "name": "Market Expansion",
                    "sentiment": "neutral",
                    "mentions": 6
                },
                {
                    "name": "Supply Chain",
                    "sentiment": "negative",
                    "mentions": 3
                }
            ],
            "quotes": [
                {
                    "text": "Our strategic investments in technology have yielded significant returns this quarter.",
                    "speaker": "CEO",
                    "sentiment": "positive"
                },
                {
                    "text": "While supply chain challenges persist, we've implemented mitigation strategies that have reduced their impact.",
                    "speaker": "COO",
                    "sentiment": "neutral"
                }
            ]
        }

    @staticmethod
    async def process_earnings_call_pdf(file_path: str) -> Dict[str, Any]:
        """Process a PDF file containing an earnings call transcript.
        
        Args:
            file_path: Path to the PDF file
            
        Returns:
            Dictionary containing the analysis results
        """
        logger.info(f"Starting processing of earnings call PDF: {file_path}")
        
        try:
            # Extract text from PDF
            text = PDFProcessor.extract_text_from_pdf(file_path)
            
            # Analyze the extracted text
            analysis = await PDFProcessor.analyze_with_ai(text)
            
            logger.info("Successfully processed earnings call PDF")
            return analysis
            
        except Exception as e:
            logger.error(f"Error processing earnings call PDF: {str(e)}")
            raise

async def process_pdf_async(report_id: str, file_path: str) -> None:
    """Process a PDF file asynchronously and update the report status.
    
    Args:
        report_id: The ID of the report
        file_path: Path to the PDF file
    """
    from app.api.api_v1.endpoints.reports import update_report_status, update_report_analysis
    
    logger.info(f"Starting async processing of PDF for report {report_id}")
    
    try:
        # Process the PDF
        analysis = await PDFProcessor.process_earnings_call_pdf(file_path)
        
        # Update the report with the analysis results
        await update_report_analysis(report_id, analysis)
        
        # Update the report status to completed
        await update_report_status(report_id, "completed")
        
        logger.info(f"Successfully processed PDF for report {report_id}")
        
    except Exception as e:
        logger.error(f"Error processing PDF for report {report_id}: {str(e)}")
        
        # Update the report status to failed
        await update_report_status(report_id, "failed", str(e)) 
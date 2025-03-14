from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status, Form, BackgroundTasks
from fastapi.responses import JSONResponse
from typing import List, Optional, Dict, Any
import os
import uuid
from datetime import datetime
import logging
import traceback
import sys
import asyncio
from pathlib import Path
from pydantic import BaseModel
import PyPDF2

# You'll need to implement the actual auth and AI processing for production
# from app.core.auth import get_current_user
# from app.services.pdf_processor import process_earnings_call_pdf

# Import the PDF processor
from app.services.pdf_processor import PDFProcessor
# Import the Firebase service
from app.services.firebase_service import FirebaseService

router = APIRouter()
logger = logging.getLogger(__name__)

# In a real application, you'd store this in a database
REPORTS = []

# Create uploads directory if it doesn't exist
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

class ReportCreate(BaseModel):
    file_name: str
    user_id: str

class ReportUpdate(BaseModel):
    status: str
    analysis: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_report_pdf(
    file: UploadFile = File(...),
    user_id: str = Form(...),
    # current_user: User = Depends(get_current_user)
):
    """
    Upload an earnings call PDF report for processing.
    """
    try:
        logger.info(f"Received upload request for file: {file.filename} from user: {user_id}")
        
        # Validate the file
        if not file.filename.endswith('.pdf'):
            logger.warning(f"Invalid file type: {file.filename}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only PDF files are allowed"
            )
        
        # Create a unique ID for the report
        report_id = str(uuid.uuid4())
        logger.info(f"Generated report ID: {report_id}")
        
        # Create file path
        file_path = UPLOAD_DIR / f"{report_id}.pdf"
        
        # Read and save file in smaller chunks to handle large files
        file_size = 0
        chunk_size = 256 * 1024  # 256KB chunks (even smaller chunks to prevent timeouts)
        
        # Increased file size limit to 100MB
        max_file_size = 100 * 1024 * 1024  # 100MB
        
        try:
            with open(file_path, "wb") as buffer:
                logger.info(f"Saving file to: {file_path} in chunks")
                
                # Update report status to show upload progress
                progress_report = {
                    "id": report_id,
                    "file_name": file.filename,
                    "upload_date": datetime.utcnow().isoformat(),
                    "status": "uploading",
                    "user_id": user_id,
                    "file_path": str(file_path),
                    "progress": "0%"
                }
                
                # Add to in-memory store
                REPORTS.append(progress_report)
                
                # Save initial progress to Firebase
                FirebaseService.save_report(report_id, progress_report)
                
                # Read and write file in chunks
                while True:
                    # Use a timeout for reading chunks to prevent hanging
                    try:
                        # Set a timeout for reading each chunk
                        chunk = await asyncio.wait_for(file.read(chunk_size), timeout=30.0)  # Increased timeout
                        if not chunk:
                            break
                            
                        buffer.write(chunk)
                        file_size += len(chunk)
                        
                        # Update progress more frequently (every 512KB)
                        if file_size % (512 * 1024) < chunk_size:
                            progress = min(99, int((file_size / max_file_size) * 100)) if max_file_size > 0 else 99
                            progress_msg = f"{progress}%"
                            
                            # Update progress in Firebase
                            FirebaseService.update_report(report_id, {"progress": progress_msg})
                            
                            # Update in-memory store
                            progress_report["progress"] = progress_msg
                            logger.info(f"Upload progress for {report_id}: {progress_msg}")
                            
                            # Give the system a moment to breathe
                            await asyncio.sleep(0.1)
                        
                        # Check if file exceeds size limit
                        if file_size > max_file_size:
                            logger.warning(f"File too large: {file_size / (1024 * 1024):.2f} MB")
                            
                            # Clean up the partial file
                            buffer.close()
                            os.remove(file_path)
                            
                            # Remove from in-memory store and Firebase
                            REPORTS.remove(progress_report)
                            FirebaseService.delete_report(report_id)
                            
                            raise HTTPException(
                                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                                detail=f"File size exceeds {max_file_size / (1024 * 1024):.0f}MB limit"
                            )
                    except asyncio.TimeoutError:
                        logger.warning(f"Timeout while reading chunk for {report_id}")
                        # Continue trying to read the next chunk
                        continue
                    except Exception as chunk_error:
                        logger.error(f"Error reading chunk: {str(chunk_error)}")
                        raise
                
            logger.info(f"File saved successfully: {file_path}, size: {file_size / (1024 * 1024):.2f} MB")
        except HTTPException:
            # Re-raise HTTP exceptions
            raise
        except Exception as e:
            logger.error(f"Error saving file: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error saving file: {str(e)}"
            )
        
        # Create report metadata
        report = {
            "id": report_id,
            "file_name": file.filename,
            "upload_date": datetime.utcnow().isoformat(),
            "status": "uploaded",
            "user_id": user_id,
            "file_path": str(file_path),
            "file_size_mb": round(file_size / (1024 * 1024), 2)
        }
        
        # Update in-memory store
        for i, r in enumerate(REPORTS):
            if r["id"] == report_id:
                REPORTS[i] = report
                break
        
        # Save to Firebase
        FirebaseService.update_report(report_id, report)
        
        # For large files, we'll process them in sections
        if file_size > 10 * 1024 * 1024:  # If larger than 10MB
            # Start a background task to process the file in sections
            # Don't wait for this to complete
            asyncio.create_task(process_large_pdf_in_sections(report_id, str(file_path)))
            logger.info(f"Started sectional processing for large report {report_id}")
        else:
            # For smaller files, use the regular extraction
            # Don't wait for this to complete
            asyncio.create_task(extract_text_only(report_id, str(file_path)))
            logger.info(f"Started asynchronous text extraction for report {report_id}")
        
        # Return immediately with the report ID
        return {"id": report_id, "status": "uploaded"}
    
    except HTTPException:
        # Re-raise HTTP exceptions as they already have the proper format
        raise
    
    except Exception as e:
        # Log the full exception with traceback
        exc_type, exc_value, exc_traceback = sys.exc_info()
        tb_str = ''.join(traceback.format_exception(exc_type, exc_value, exc_traceback))
        logger.error(f"Unexpected error in upload_report_pdf: {str(e)}\n{tb_str}")
        
        # Return a detailed error response
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": "Internal server error",
                "detail": str(e),
                "type": str(exc_type.__name__) if exc_type else "Unknown",
            }
        )

@router.get("/", response_model=List[dict])
async def get_user_reports(
    # current_user: User = Depends(get_current_user),
    status: Optional[str] = None,
):
    """
    Get all reports for the current user.
    """
    # Get reports from Firebase
    reports = FirebaseService.get_all_reports()
    
    # Filter by status if provided
    if status:
        reports = [report for report in reports if report.get("status") == status]
    
    return reports

@router.get("/{report_id}", response_model=dict)
async def get_report_details(
    report_id: str,
    # current_user: User = Depends(get_current_user)
):
    """
    Get detailed information about a specific report.
    """
    # Get report from Firebase
    report = FirebaseService.get_report(report_id)
    
    if not report:
        # Try to get from in-memory store as fallback
        report = next((r for r in REPORTS if r["id"] == report_id), None)
        
        if not report:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Report not found"
            )
    
    return report

@router.put("/{report_id}/status", response_model=dict)
async def update_report_status(
    report_id: str,
    status: str,
    error: Optional[str] = None,
    # current_user: User = Depends(get_current_user)
):
    """
    Update the status of a report (for testing purposes).
    In a real app, this would be done by the background process.
    """
    # Validate status
    valid_statuses = ["processing", "completed", "failed", "uploaded", "extracted"]
    if status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Status must be one of: {', '.join(valid_statuses)}"
        )
    
    # Get report from Firebase
    report = FirebaseService.get_report(report_id)
    
    if not report:
        # Try to get from in-memory store as fallback
        report = next((r for r in REPORTS if r["id"] == report_id), None)
        
        if not report:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Report not found"
            )
    
    # Update status
    report["status"] = status
    
    # Update error if provided
    if error:
        report["error"] = error
    
    # Update in Firebase
    FirebaseService.update_report(report_id, {"status": status, "error": error} if error else {"status": status})
    
    # Update in-memory store if it exists there
    in_memory_report = next((r for r in REPORTS if r["id"] == report_id), None)
    if in_memory_report:
        in_memory_report["status"] = status
        if error:
            in_memory_report["error"] = error
    
    return report 

@router.put("/{report_id}")
async def update_report(report_id: str, report_update: ReportUpdate):
    """Update a report's status and/or analysis."""
    logger.info(f"Received update request for report: {report_id}")
    
    # Get report from Firebase
    report = FirebaseService.get_report(report_id)
    
    if not report:
        # Try to get from in-memory store as fallback
        report = next((r for r in REPORTS if r.get("id") == report_id), None)
        
        if not report:
            logger.warning(f"Report not found for update: {report_id}")
            raise HTTPException(status_code=404, detail="Report not found")
    
    # Update report fields
    update_data = {}
    
    report["status"] = report_update.status
    update_data["status"] = report_update.status
    
    if report_update.analysis:
        report["analysis"] = report_update.analysis
        update_data["analysis"] = report_update.analysis
    
    if report_update.error:
        report["error"] = report_update.error
        update_data["error"] = report_update.error
    
    # Update in Firebase
    FirebaseService.update_report(report_id, update_data)
    
    # Update in-memory store if it exists there
    in_memory_report = next((r for r in REPORTS if r.get("id") == report_id), None)
    if in_memory_report:
        if report_update.status:
            in_memory_report["status"] = report_update.status
        if report_update.analysis:
            in_memory_report["analysis"] = report_update.analysis
        if report_update.error:
            in_memory_report["error"] = report_update.error
    
    logger.info(f"Report {report_id} updated successfully")
    return report

async def update_report_analysis(report_id: str, analysis: Dict[str, Any]):
    """Update a report with analysis results.
    
    Args:
        report_id: The ID of the report
        analysis: The analysis results
    """
    logger.info(f"Updating report {report_id} with analysis results")
    
    # Update in Firebase
    FirebaseService.update_report(report_id, {"analysis": analysis})
    
    # Update in-memory store if it exists there
    report = next((r for r in REPORTS if r["id"] == report_id), None)
    if report:
        report["analysis"] = analysis
        logger.info(f"Report {report_id} analysis updated in memory")
    else:
        logger.warning(f"Report {report_id} not found in memory for analysis update")
    
    logger.info(f"Report {report_id} analysis updated successfully")

@router.delete("/{report_id}")
async def delete_report(report_id: str):
    """Delete a report."""
    logger.info(f"Received delete request for report: {report_id}")
    
    # Get report from Firebase
    report = FirebaseService.get_report(report_id)
    
    if not report:
        # Try to get from in-memory store as fallback
        report = next((r for r in REPORTS if r.get("id") == report_id), None)
        
        if not report:
            logger.warning(f"Report not found for deletion: {report_id}")
            raise HTTPException(status_code=404, detail="Report not found")
    
    # Delete from Firebase
    FirebaseService.delete_report(report_id)
    
    # Remove from in-memory store if it exists there
    in_memory_report = next((r for r in REPORTS if r.get("id") == report_id), None)
    if in_memory_report:
        REPORTS.remove(in_memory_report)
    
    # Delete the file if it exists
    file_path = report.get("file_path")
    if file_path and os.path.exists(file_path):
        try:
            os.remove(file_path)
            logger.info(f"Deleted file: {file_path}")
        except Exception as e:
            logger.error(f"Error deleting file {file_path}: {str(e)}")
    
    logger.info(f"Report {report_id} deleted successfully")
    return {"message": "Report deleted successfully"}

@router.post("/{report_id}/analyze", response_model=dict)
async def analyze_report(
    report_id: str,
    # current_user: User = Depends(get_current_user)
):
    """
    Analyze a report that has already been uploaded and processed.
    """
    logger.info(f"Received analyze request for report: {report_id}")
    
    try:
        # Get the report
        report = FirebaseService.get_report(report_id)
        
        if not report:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Report not found"
            )
        
        # Check if the report is ready for analysis
        if report.get("status") not in ["extracted", "uploaded"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Report is not ready for analysis. Current status: {report.get('status')}"
            )
        
        # Get the file path
        file_path = report.get("file_path")
        
        if not file_path or not os.path.exists(file_path):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Report file not found"
            )
        
        # Start analysis in the background
        asyncio.create_task(analyze_pdf_async(report_id=report_id, file_path=file_path))
        
        # Update the report status to analyzing
        await update_report_status(report_id, "analyzing")
        
        return {"id": report_id, "status": "analyzing"}
    
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    
    except Exception as e:
        logger.error(f"Error analyzing report: {str(e)}")
        
        # Update the report status to failed
        await update_report_status(report_id, "failed", str(e))
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error analyzing report: {str(e)}"
        )

async def extract_text_only(report_id: str, file_path: str) -> None:
    """Extract text from a PDF file asynchronously and update the report.
    
    Args:
        report_id: The ID of the report
        file_path: Path to the PDF file
    """
    logger.info(f"Starting async text extraction for report {report_id}")
    
    try:
        # Update status to processing
        await update_report_status(report_id, "processing", "Extracting text from PDF")
        
        # Get the report to check file size
        report = FirebaseService.get_report(report_id)
        file_size_mb = report.get("file_size_mb", 0)
        
        # For large files, use a different approach
        if file_size_mb > 10:  # If file is larger than 10MB
            logger.info(f"Large file detected ({file_size_mb}MB), using chunked extraction")
            
            # Extract text from PDF in chunks
            text = ""
            with open(file_path, 'rb') as file:
                reader = PyPDF2.PdfReader(file)
                num_pages = len(reader.pages)
                
                logger.info(f"PDF has {num_pages} pages")
                
                # Process pages in batches to avoid memory issues
                batch_size = 5  # Process 5 pages at a time
                for batch_start in range(0, num_pages, batch_size):
                    batch_end = min(batch_start + batch_size, num_pages)
                    batch_text = ""
                    
                    for page_num in range(batch_start, batch_end):
                        try:
                            page = reader.pages[page_num]
                            page_text = page.extract_text()
                            batch_text += page_text + "\n\n"
                        except Exception as page_error:
                            logger.warning(f"Error extracting text from page {page_num}: {str(page_error)}")
                            batch_text += f"[Error extracting page {page_num}]\n\n"
                    
                    # Add batch text to total text
                    text += batch_text
                    
                    # Update progress
                    progress = min(99, int((batch_end / num_pages) * 100))
                    progress_msg = f"Extracted {batch_end} of {num_pages} pages ({progress}%)"
                    
                    # Update the report with progress
                    await update_report_status(
                        report_id=report_id,
                        status="processing",
                        error=progress_msg
                    )
                    
                    # Sleep briefly to prevent overwhelming the system
                    await asyncio.sleep(0.1)
        else:
            # For smaller files, use the original method
            text = PDFProcessor.extract_text_from_pdf(file_path)
            num_pages = None
            with open(file_path, 'rb') as file:
                reader = PyPDF2.PdfReader(file)
                num_pages = len(reader.pages)
        
        # Calculate text statistics instead of storing the full text
        text_stats = {
            "text_length": len(text),
            "word_count": len(text.split()),
            "page_count": num_pages,
            "text_sample": text[:500] + "..." if len(text) > 500 else text,  # Just store a small sample
            "status": "extracted"
        }
        
        # Store the text locally in a temporary file for analysis
        temp_text_path = f"{file_path}.txt"
        with open(temp_text_path, "w", encoding="utf-8") as text_file:
            text_file.write(text)
        
        # Update in Firebase with stats only, not the full text
        FirebaseService.update_report(report_id, text_stats)
        
        # Update in-memory store if it exists there
        report = next((r for r in REPORTS if r["id"] == report_id), None)
        if report:
            report.update(text_stats)
        
        logger.info(f"Successfully extracted text for report {report_id}, saved to {temp_text_path}")
        
    except Exception as e:
        logger.error(f"Error extracting text for report {report_id}: {str(e)}")
        
        # Update the report status to failed
        await update_report_status(report_id, "failed", str(e))

async def analyze_pdf_async(report_id: str, extracted_text: str = None, file_path: str = None) -> None:
    """Analyze extracted text asynchronously and update the report status.
    
    Args:
        report_id: The ID of the report
        extracted_text: Previously extracted text (optional)
        file_path: Path to the PDF file (as fallback)
    """
    logger.info(f"Starting async analysis of PDF for report {report_id}")
    
    try:
        # Update status to analyzing
        await update_report_status(report_id, "analyzing", "Analyzing document content")
        
        # If no extracted text is provided, try to read from the temporary file
        if not extracted_text and file_path:
            temp_text_path = f"{file_path}.txt"
            if os.path.exists(temp_text_path):
                logger.info(f"Reading extracted text from temporary file: {temp_text_path}")
                with open(temp_text_path, "r", encoding="utf-8") as text_file:
                    extracted_text = text_file.read()
        
        # If still no extracted text, extract it from the PDF
        if not extracted_text and file_path:
            logger.info(f"No extracted text found, extracting from PDF: {file_path}")
            extracted_text = PDFProcessor.extract_text_from_pdf(file_path)
        
        # If we have text, analyze it
        if extracted_text:
            logger.info(f"Analyzing text for report {report_id} ({len(extracted_text)} characters)")
            analysis = await PDFProcessor.analyze_with_ai(extracted_text)
            
            # Update the report with the analysis results
            await update_report_analysis(report_id, analysis)
            
            # Update the report status to completed
            await update_report_status(report_id, "completed")
            
            logger.info(f"Successfully analyzed PDF for report {report_id}")
        else:
            # No text to analyze
            logger.error(f"No text available for analysis for report {report_id}")
            await update_report_status(report_id, "failed", "No text available for analysis")
        
    except Exception as e:
        logger.error(f"Error analyzing PDF for report {report_id}: {str(e)}")
        
        # Update the report status to failed
        await update_report_status(report_id, "failed", str(e))

async def process_large_pdf_in_sections(report_id: str, file_path: str) -> None:
    """Process a large PDF file by breaking it into manageable sections.
    
    This function handles large PDFs by:
    1. Extracting text in smaller batches
    2. Processing each section separately
    3. Combining the results
    
    Args:
        report_id: The ID of the report
        file_path: Path to the PDF file
    """
    logger.info(f"Starting sectional processing for large PDF: {report_id}")
    
    try:
        # Update status to processing
        await update_report_status(report_id, "processing", "Breaking large PDF into sections")
        
        # Extract text from PDF in sections
        with open(file_path, 'rb') as file:
            reader = PyPDF2.PdfReader(file)
            num_pages = len(reader.pages)
            
            logger.info(f"Large PDF has {num_pages} pages, processing in sections")
            
            # Determine section size based on total pages
            section_size = min(20, max(5, num_pages // 5))  # Between 5-20 pages per section
            
            # Initialize variables to store combined results
            full_text = ""
            section_count = 0
            
            # Process PDF in sections
            for section_start in range(0, num_pages, section_size):
                section_count += 1
                section_end = min(section_start + section_size, num_pages)
                
                # Update status
                await update_report_status(
                    report_id=report_id,
                    status="processing",
                    error=f"Processing section {section_count} (pages {section_start+1}-{section_end} of {num_pages})"
                )
                
                # Extract text for this section
                section_text = ""
                for page_num in range(section_start, section_end):
                    try:
                        page = reader.pages[page_num]
                        page_text = page.extract_text()
                        section_text += page_text + "\n\n"
                        
                        # Free memory
                        page = None
                        
                        # Periodically update progress
                        if (page_num - section_start) % 5 == 0 or page_num == section_end - 1:
                            progress = min(99, int((page_num + 1) / num_pages * 100))
                            await update_report_status(
                                report_id=report_id,
                                status="processing",
                                error=f"Extracting page {page_num+1}/{num_pages} ({progress}%)"
                            )
                    except Exception as e:
                        logger.error(f"Error extracting text from page {page_num}: {str(e)}")
                        section_text += f"[Error extracting page {page_num+1}]\n\n"
                
                # Add section text to full text
                full_text += section_text
                
                # Give the system a moment to breathe between sections
                await asyncio.sleep(0.5)
            
            # Store the text locally in a temporary file for analysis
            temp_text_path = f"{file_path}.txt"
            with open(temp_text_path, "w", encoding="utf-8") as text_file:
                text_file.write(full_text)
            
            # Calculate text statistics instead of storing the full text
            text_stats = {
                "text_length": len(full_text),
                "word_count": len(full_text.split()),
                "page_count": num_pages,
                "text_sample": full_text[:500] + "..." if len(full_text) > 500 else full_text,  # Just store a small sample
                "sections_processed": section_count,
                "status": "extracted"
            }
            
            # Update in Firebase with stats only, not the full text
            FirebaseService.update_report(report_id, text_stats)
            
            # Update in-memory store if it exists there
            report = next((r for r in REPORTS if r["id"] == report_id), None)
            if report:
                report.update(text_stats)
            
            logger.info(f"Successfully processed large PDF in {section_count} sections for report {report_id}, saved to {temp_text_path}")
    
    except Exception as e:
        logger.error(f"Error processing large PDF in sections for report {report_id}: {str(e)}")
        
        # Update the report status to failed
        await update_report_status(report_id, "failed", str(e))
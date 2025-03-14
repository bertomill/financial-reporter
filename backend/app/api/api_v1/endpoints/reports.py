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
        
        # Validate file size (10MB limit)
        try:
            contents = await file.read()
            file_size = len(contents)
            logger.info(f"File size: {file_size / (1024 * 1024):.2f} MB")
            
            if file_size > 10 * 1024 * 1024:  # 10MB
                logger.warning(f"File too large: {file_size / (1024 * 1024):.2f} MB")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="File size exceeds 10MB limit"
                )
        except Exception as e:
            logger.error(f"Error reading file: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error reading file: {str(e)}"
            )
        
        # Reset file read position
        try:
            await file.seek(0)
        except Exception as e:
            logger.error(f"Error seeking file: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error seeking file: {str(e)}"
            )
        
        # Create a unique ID for the report
        report_id = str(uuid.uuid4())
        logger.info(f"Generated report ID: {report_id}")
        
        # Create file path
        file_path = UPLOAD_DIR / f"{report_id}.pdf"
        
        # Save the file to disk
        try:
            logger.info(f"Saving file to: {file_path}")
            
            with open(file_path, "wb") as buffer:
                buffer.write(contents)
                
            logger.info(f"File saved successfully: {file_path}")
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
            "file_path": str(file_path)
        }
        
        # Add to in-memory store (in a real app, save to database)
        REPORTS.append(report)
        logger.info(f"Report added to in-memory store: {report}")
        
        # Save to Firebase
        FirebaseService.save_report(report_id, report)
        
        # Extract text from PDF but don't analyze yet
        asyncio.create_task(extract_text_only(report_id, str(file_path)))
        logger.info(f"Started asynchronous text extraction for report {report_id}")
        
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
    Trigger AI analysis for a specific report.
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
    
    # Check if the report is in the right state
    if report["status"] not in ["uploaded", "extracted"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Report cannot be analyzed in its current state: {report['status']}"
        )
    
    # Update status to processing
    report["status"] = "processing"
    
    # Update in Firebase
    FirebaseService.update_report(report_id, {"status": "processing"})
    
    # Update in-memory store if it exists there
    in_memory_report = next((r for r in REPORTS if r["id"] == report_id), None)
    if in_memory_report:
        in_memory_report["status"] = "processing"
    
    # Start asynchronous processing of the PDF
    asyncio.create_task(analyze_pdf_async(report_id, report.get("extracted_text", ""), report["file_path"]))
    logger.info(f"Started asynchronous analysis of report {report_id}")
    
    return {"id": report_id, "status": "processing"}

async def extract_text_only(report_id: str, file_path: str) -> None:
    """Extract text from a PDF file asynchronously and update the report.
    
    Args:
        report_id: The ID of the report
        file_path: Path to the PDF file
    """
    logger.info(f"Starting async text extraction for report {report_id}")
    
    try:
        # Extract text from PDF
        text = PDFProcessor.extract_text_from_pdf(file_path)
        
        # Update the report with the extracted text
        update_data = {
            "extracted_text": text,
            "status": "extracted"
        }
        
        # Update in Firebase
        FirebaseService.update_report(report_id, update_data)
        
        # Update in-memory store if it exists there
        report = next((r for r in REPORTS if r["id"] == report_id), None)
        if report:
            report["extracted_text"] = text
            report["status"] = "extracted"
        
        logger.info(f"Successfully extracted text for report {report_id}")
        
    except Exception as e:
        logger.error(f"Error extracting text for report {report_id}: {str(e)}")
        
        # Update the report status to failed
        await update_report_status(report_id, "failed", str(e))

async def analyze_pdf_async(report_id: str, extracted_text: str, file_path: str) -> None:
    """Analyze extracted text asynchronously and update the report status.
    
    Args:
        report_id: The ID of the report
        extracted_text: Previously extracted text
        file_path: Path to the PDF file (as fallback)
    """
    logger.info(f"Starting async analysis of PDF for report {report_id}")
    
    try:
        # Analyze the extracted text
        if extracted_text:
            analysis = await PDFProcessor.analyze_with_ai(extracted_text)
        else:
            # Fallback to extracting and analyzing the PDF if no extracted text is available
            text = PDFProcessor.extract_text_from_pdf(file_path)
            analysis = await PDFProcessor.analyze_with_ai(text)
        
        # Update the report with the analysis results
        await update_report_analysis(report_id, analysis)
        
        # Update the report status to completed
        await update_report_status(report_id, "completed")
        
        logger.info(f"Successfully processed PDF for report {report_id}")
        
    except Exception as e:
        logger.error(f"Error processing PDF for report {report_id}: {str(e)}")
        
        # Update the report status to failed
        await update_report_status(report_id, "failed", str(e)) 
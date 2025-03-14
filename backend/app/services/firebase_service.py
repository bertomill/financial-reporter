import os
import json
import logging
from typing import Dict, Any, List, Optional

import firebase_admin
from firebase_admin import credentials, firestore

# Configure logging
logger = logging.getLogger(__name__)

# Initialize Firebase
db = None
try:
    # Path to service account key
    service_account_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 
                                       "serviceAccountKey.json")
    
    # Check if the file exists
    if os.path.exists(service_account_path):
        # Initialize Firebase Admin SDK
        cred = credentials.Certificate(service_account_path)
        firebase_admin.initialize_app(cred)
        
        # Get Firestore client
        db = firestore.client()
        logger.info("Firebase initialized successfully")
    else:
        logger.warning("Firebase credentials file not found. Using mock implementation.")
except Exception as e:
    logger.error(f"Error initializing Firebase: {str(e)}")
    logger.warning("Using mock implementation for Firebase.")

# In-memory storage for mock implementation
mock_reports = {}

class FirebaseService:
    """Service for interacting with Firebase Firestore database."""
    
    @staticmethod
    def save_report(report_id: str, report_data: Dict[str, Any]) -> bool:
        """Save a report to Firestore.
        
        Args:
            report_id: The ID of the report
            report_data: The report data to save
            
        Returns:
            True if successful, False otherwise
        """
        if db:
            try:
                # Save to reports collection
                db.collection('reports').document(report_id).set(report_data)
                logger.info(f"Report {report_id} saved to Firebase")
                return True
            except Exception as e:
                logger.error(f"Error saving report to Firebase: {str(e)}")
                return False
        else:
            # Mock implementation
            mock_reports[report_id] = report_data
            logger.info(f"Report {report_id} saved to mock storage")
            return True
    
    @staticmethod
    def update_report(report_id: str, update_data: Dict[str, Any]) -> bool:
        """Update a report in Firestore.
        
        Args:
            report_id: The ID of the report
            update_data: The data to update
            
        Returns:
            True if successful, False otherwise
        """
        if db:
            try:
                # Check if there's a large extracted_text field
                if "extracted_text" in update_data and len(update_data["extracted_text"]) > 900000:  # ~900KB limit
                    logger.info(f"Large extracted text detected ({len(update_data['extracted_text'])} bytes), chunking...")
                    
                    # Get the full text
                    full_text = update_data["extracted_text"]
                    
                    # Create a summary (first 1000 chars + last 1000 chars)
                    text_summary = full_text[:1000] + "... [TEXT TRUNCATED DUE TO SIZE] ..." + full_text[-1000:]
                    
                    # Replace the full text with the summary in the main document
                    update_data["extracted_text"] = text_summary
                    update_data["text_truncated"] = True
                    update_data["full_text_size"] = len(full_text)
                    
                    # Store the full text in chunks
                    chunk_size = 500000  # ~500KB per chunk
                    num_chunks = (len(full_text) + chunk_size - 1) // chunk_size  # Ceiling division
                    
                    # Create chunks collection for this report
                    for i in range(num_chunks):
                        start_idx = i * chunk_size
                        end_idx = min((i + 1) * chunk_size, len(full_text))
                        chunk_text = full_text[start_idx:end_idx]
                        
                        # Store chunk in a subcollection
                        db.collection("reports").document(report_id).collection("text_chunks").document(f"chunk_{i}").set({
                            "text": chunk_text,
                            "chunk_index": i,
                            "start_position": start_idx,
                            "end_position": end_idx
                        })
                    
                    logger.info(f"Text successfully chunked into {num_chunks} parts")
                
                # Update the report
                db.collection("reports").document(report_id).update(update_data)
                logger.info(f"Report {report_id} updated in Firebase")
                return True
            except Exception as e:
                logger.error(f"Error updating report in Firebase: {str(e)}")
                return False
        else:
            # Mock implementation
            if report_id in mock_reports:
                mock_reports[report_id].update(update_data)
                logger.info(f"Report {report_id} updated in mock storage")
                return True
            else:
                logger.warning(f"Report {report_id} not found in mock storage")
                return False
    
    @staticmethod
    def get_report(report_id: str) -> Optional[Dict[str, Any]]:
        """Get a report from Firestore.
        
        Args:
            report_id: The ID of the report
            
        Returns:
            The report data or None if not found
        """
        if db:
            try:
                # Get the report
                doc_ref = db.collection('reports').document(report_id)
                doc = doc_ref.get()
                
                if doc.exists:
                    logger.info(f"Report {report_id} retrieved from Firebase")
                    return doc.to_dict()
                else:
                    logger.warning(f"Report {report_id} not found in Firebase")
                    return None
            except Exception as e:
                logger.error(f"Error getting report from Firebase: {str(e)}")
                return None
        else:
            # Mock implementation
            if report_id in mock_reports:
                logger.info(f"Report {report_id} retrieved from mock storage")
                return mock_reports[report_id]
            else:
                logger.warning(f"Report {report_id} not found in mock storage")
                return None
    
    @staticmethod
    def get_all_reports(user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get all reports from Firestore, optionally filtered by user ID.
        
        Args:
            user_id: Optional user ID to filter by
            
        Returns:
            List of report data
        """
        if db:
            try:
                # Query reports collection
                query = db.collection('reports')
                
                # Filter by user ID if provided
                if user_id:
                    query = query.where('user_id', '==', user_id)
                
                # Execute query
                docs = query.stream()
                
                # Convert to list of dictionaries
                reports = []
                for doc in docs:
                    report_data = doc.to_dict()
                    report_data['id'] = doc.id  # Add document ID as 'id' field
                    reports.append(report_data)
                
                logger.info(f"Retrieved {len(reports)} reports from Firebase")
                return reports
            except Exception as e:
                logger.error(f"Error getting reports from Firebase: {str(e)}")
                return []
        else:
            # Mock implementation
            reports = []
            for report_id, report_data in mock_reports.items():
                if user_id is None or report_data.get('user_id') == user_id:
                    report_copy = report_data.copy()
                    report_copy['id'] = report_id
                    reports.append(report_copy)
            
            logger.info(f"Retrieved {len(reports)} reports from mock storage")
            return reports
    
    @staticmethod
    def delete_report(report_id: str) -> bool:
        """Delete a report from Firestore.
        
        Args:
            report_id: The ID of the report
            
        Returns:
            True if successful, False otherwise
        """
        if db:
            try:
                # Delete the report
                db.collection('reports').document(report_id).delete()
                logger.info(f"Report {report_id} deleted from Firebase")
                return True
            except Exception as e:
                logger.error(f"Error deleting report from Firebase: {str(e)}")
                return False
        else:
            # Mock implementation
            if report_id in mock_reports:
                del mock_reports[report_id]
                logger.info(f"Report {report_id} deleted from mock storage")
                return True
            else:
                logger.warning(f"Report {report_id} not found in mock storage")
                return False

    @staticmethod
    def get_full_text(report_id: str) -> str:
        """Get the full text of a report by combining chunks if necessary.
        
        Args:
            report_id: The ID of the report
            
        Returns:
            The full text of the report
        """
        try:
            # Get the report
            report = FirebaseService.get_report(report_id)
            
            # Check if text was truncated
            if report and report.get("text_truncated"):
                logger.info(f"Report {report_id} has truncated text, retrieving chunks...")
                
                # Get all chunks
                chunks_ref = db.collection("reports").document(report_id).collection("text_chunks").order_by("chunk_index")
                chunks = chunks_ref.get()
                
                # Combine chunks
                full_text = ""
                for chunk in chunks:
                    chunk_data = chunk.to_dict()
                    full_text += chunk_data.get("text", "")
                
                logger.info(f"Successfully retrieved full text ({len(full_text)} bytes) from {len(chunks)} chunks")
                return full_text
            else:
                # Return the extracted text directly
                return report.get("extracted_text", "") if report else ""
        except Exception as e:
            logger.error(f"Error getting full text for report {report_id}: {str(e)}")
            return report.get("extracted_text", "") if report else "" 
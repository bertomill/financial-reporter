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
                # Update the report
                db.collection('reports').document(report_id).update(update_data)
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
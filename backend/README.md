# Financial Reporter Backend

This is the backend server for the Financial Reporter application. It provides APIs for uploading and analyzing financial reports.

## Setup

### Prerequisites

- Python 3.9+
- pip (Python package manager)
- Firebase account with Firestore and Storage enabled

### Installation

1. Clone the repository
2. Navigate to the backend directory
3. Install dependencies:

```bash
pip install -r requirements.txt
```

4. Set up Firebase:
   - Create a Firebase project
   - Enable Firestore and Storage
   - Generate a service account key (JSON file)
   - Save the key as `serviceAccountKey.json` in the backend directory

### Running the Server

You can start the server using the provided script:

```bash
./start_server.sh
```

Or manually:

```bash
python -m app.main
```

The server will run on http://localhost:8000 by default.

## API Endpoints

- `GET /`: Health check endpoint
- `POST /api/v1/reports/upload`: Upload a financial report (PDF)
- `GET /api/v1/reports/`: Get all reports for the current user
- `GET /api/v1/reports/{report_id}`: Get details of a specific report

## Troubleshooting

### Common Issues

#### 500 Internal Server Error on Upload

If you're getting a 500 error when uploading files, check the following:

1. **Firebase Configuration**: Ensure your `serviceAccountKey.json` file is correctly set up and has the necessary permissions.

2. **File Permissions**: Make sure the backend has write permissions to the `uploads` directory.

3. **File Size**: Ensure the file is under the 10MB limit.

4. **Server Logs**: Check the logs in the `logs` directory for detailed error information.

#### Connection Refused

If the frontend can't connect to the backend:

1. **Server Running**: Ensure the backend server is running on port 8000.

2. **CORS Issues**: If you're getting CORS errors, check that the frontend origin is allowed in the CORS middleware.

3. **Network Issues**: Make sure there are no firewall or network issues blocking the connection.

### Debugging

For more detailed logging, you can check the log files in the `logs` directory. Each server run creates a new log file with a timestamp.

## Development

### Project Structure

- `app/`: Main application package
  - `api/`: API endpoints
    - `api_v1/`: API version 1
      - `endpoints/`: API endpoint modules
  - `core/`: Core functionality
  - `services/`: Service modules
  - `main.py`: Application entry point

### Adding New Endpoints

To add a new endpoint:

1. Create a new file in `app/api/api_v1/endpoints/`
2. Define your router and endpoints
3. Include your router in `app/api/api_v1/api.py`

### Running Tests

```bash
pytest
```

## Environment Variables

For production, set the following environment variables:

- `NODE_ENV`: Set to "production"
- `PORT`: The port to run the server on
- `GOOGLE_API_KEY`: Google Gemini API key for PDF analysis
- `ALPHA_VANTAGE_API_KEY`: Alpha Vantage API key for financial data
- `FIREBASE_TYPE`: Service account type
- `FIREBASE_PROJECT_ID`: Firebase project ID
- `FIREBASE_PRIVATE_KEY_ID`: Private key ID
- `FIREBASE_PRIVATE_KEY`: Private key
- `FIREBASE_CLIENT_EMAIL`: Client email
- `FIREBASE_CLIENT_ID`: Client ID
- `FIREBASE_AUTH_URI`: Auth URI
- `FIREBASE_TOKEN_URI`: Token URI
- `FIREBASE_AUTH_PROVIDER_X509_CERT_URL`: Auth provider cert URL
- `FIREBASE_CLIENT_X509_CERT_URL`: Client cert URL

You can also create a `.env` file in the backend directory with these variables. See `.env.example` for a template. 
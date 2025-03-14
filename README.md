# Financial Reporter

A web application for uploading, analyzing, and visualizing financial reports using AI.

## Features

- **PDF Upload**: Upload financial reports in PDF format
- **AI-Powered Analysis**: Extract key information, sentiment, and topics from financial documents
- **Interactive Dashboard**: View and manage your uploaded reports
- **Detailed Report View**: See comprehensive analysis of each report
- **Responsive Design**: Works on desktop and mobile devices

## AI Analysis Features

The application uses advanced AI to analyze financial reports:

1. **Text Extraction**: Extracts text content from uploaded PDF files
2. **Sentiment Analysis**: Determines the overall sentiment (positive, neutral, negative) of the document
3. **Key Points Extraction**: Identifies the most important points from the document
4. **Topic Analysis**: Recognizes main topics discussed and their sentiment
5. **Notable Quotes**: Extracts significant quotes with speaker attribution

## Technology Stack

### Frontend
- Next.js
- React
- Tailwind CSS
- Firebase Authentication

### Backend
- Express.js
- Firebase Storage
- OpenAI API for text analysis
- PyPDF2 for PDF text extraction

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Firebase account
- OpenAI API key

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/financial-reporter.git
   cd financial-reporter
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up Firebase:
   - Create a Firebase project
   - Enable Authentication (Email/Password)
   - Create a Storage bucket
   - Generate a service account key and save it as `backend/serviceAccountKey.json`

4. Set up environment variables:
   - Create a `.env.local` file in the root directory
   - Add your Firebase configuration
   - Add your OpenAI API key

5. Start the development servers:
   ```
   npm run dev
   ```

## Usage

1. **Sign Up/Login**: Create an account or log in
2. **Upload**: Upload a financial report PDF
3. **Processing**: The system will extract text and analyze it with AI
4. **View Results**: See the detailed analysis of your report
5. **Dashboard**: View all your reports and their status

## Project Structure

```
financial-reporter/
├── frontend/           # Next.js frontend application
│   ├── public/         # Static assets
│   └── src/            # Source code
│       ├── components/ # React components
│       ├── firebase/   # Firebase configuration
│       └── pages/      # Next.js pages
├── backend/            # Express.js backend server
│   ├── app/            # Application code
│   │   ├── api/        # API endpoints
│   │   └── services/   # Business logic services
│   └── uploads/        # Temporary storage for uploads
└── README.md           # Project documentation
```

## License

This project is licensed under the MIT License - see the LICENSE file for details. 
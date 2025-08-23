# Construction Document Viewer

A modern web application for viewing, annotating, and analyzing construction documents with AI-powered insights.

## Features

- **PDF Viewer**: View and annotate construction documents
- **AI Assistant**: Powered by Llama Qwen2.5VL for document analysis
- **Annotation Tools**: Highlight, comment, and mark up documents
- **Project Management**: Organize documents into projects
- **Real-time Collaboration**: Share documents with team members

## Setup

### Prerequisites

- Node.js 18+ 
- npm or pnpm

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   # or
   pnpm install
   ```

### AI Integration Setup

To enable the AI assistant with Llama Qwen2.5VL:

1. Get your API key from [Llama API](https://api.llama-api.com/)
2. Create a `.env.local` file in the root directory:
   ```bash
   LLAMA_API_KEY=your_llama_api_key_here
   ```
3. The AI assistant will automatically extract text from PDFs and provide context-aware responses

### Running the Application

```bash
npm run dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Usage

1. **Upload Documents**: Use the "Import Files" button in the project sidebar
2. **View PDFs**: Click on documents in the sidebar to view them
3. **Ask AI**: Use the AI sidebar to ask questions about document content
4. **Annotate**: Use the annotation toolbar to mark up documents
5. **Share**: Use the share button to create shareable links

## AI Features

The AI assistant can:
- Analyze construction specifications
- Extract measurements and dimensions
- Identify materials and components
- Answer questions about technical details
- Provide document summaries

## Technology Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **UI**: Tailwind CSS, Radix UI
- **PDF**: react-pdf, PDF.js
- **AI**: Llama Qwen2.5VL via API
- **Styling**: Tailwind CSS with custom theme

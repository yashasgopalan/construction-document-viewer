// Only import pdfjs on the client side to avoid SSR issues
let pdfjs: any = null

if (typeof window !== 'undefined') {
  // Dynamic import to avoid SSR issues
  import('react-pdf').then((module) => {
    pdfjs = module.pdfjs
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs"
  })
}

export interface PDFContext {
  text: string
  pages: number
  documentName: string
}

export async function extractPDFText(file: File | string): Promise<PDFContext> {
  // Ensure we're on the client side
  if (typeof window === 'undefined') {
    return {
      text: 'PDF processing is only available on the client side.',
      pages: 0,
      documentName: typeof file === 'string' ? 'Current Document' : file.name
    }
  }

  try {
    // Dynamically import pdfjs if not already loaded
    if (!pdfjs) {
      const module = await import('react-pdf')
      pdfjs = module.pdfjs
      pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs"
    }

    const loadingTask = pdfjs.getDocument(file)
    const pdf = await loadingTask.promise
    const numPages = pdf.numPages
    
    let fullText = ''
    const maxPages = Math.min(numPages, 10) // Limit to first 10 pages for performance
    
    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      const page = await pdf.getPage(pageNum)
      const textContent = await page.getTextContent()
      
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim()
      
      fullText += `Page ${pageNum}: ${pageText}\n\n`
    }
    
    const documentName = typeof file === 'string' ? 'Current Document' : file.name
    
    return {
      text: fullText,
      pages: numPages,
      documentName
    }
  } catch (error) {
    console.error('Error extracting PDF text:', error)
    return {
      text: 'Unable to extract text from this PDF.',
      pages: 0,
      documentName: typeof file === 'string' ? 'Current Document' : file.name
    }
  }
}

export function preparePDFContext(pdfContext: PDFContext): string {
  const { text, pages, documentName } = pdfContext
  
  return `Document: ${documentName}
Total Pages: ${pages}
Extracted Text (first 10 pages):
${text}

Please analyze this construction document and answer questions about its content, specifications, measurements, materials, and technical details.`
}

export function truncateContext(context: string, maxLength: number = 8000): string {
  if (context.length <= maxLength) {
    return context
  }
  
  // Try to truncate at a sentence boundary
  const truncated = context.substring(0, maxLength)
  const lastPeriod = truncated.lastIndexOf('.')
  const lastNewline = truncated.lastIndexOf('\n')
  const cutPoint = Math.max(lastPeriod, lastNewline)
  
  if (cutPoint > maxLength * 0.8) {
    return truncated.substring(0, cutPoint + 1) + '\n\n[Content truncated for length...]'
  }
  
  return truncated + '\n\n[Content truncated for length...]'
}

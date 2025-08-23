"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { PDFViewer } from "@/components/pdf-viewer"
import { Header } from "@/components/header"

interface SharedDocumentData {
  document: string
  annotations: any[]
  commentThreads: any[]
  timestamp: string
}

export default function SharedDocumentPage() {
  const params = useParams()
  const shareId = params.id as string

  const [documentData, setDocumentData] = useState<SharedDocumentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!shareId) return

    try {
      // In a real app, you'd fetch this from your API/database
      const storedData = localStorage.getItem(`share_${shareId}`)

      if (!storedData) {
        setError("Shared document not found or has expired")
        setLoading(false)
        return
      }

      const parsedData = JSON.parse(storedData)
      setDocumentData(parsedData)
    } catch (err) {
      setError("Failed to load shared document")
    } finally {
      setLoading(false)
    }
  }, [shareId])

  if (loading) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-semibold mb-2">Loading shared document...</div>
          <div className="text-sm text-muted-foreground">Please wait while we load the document</div>
        </div>
      </div>
    )
  }

  if (error || !documentData) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-semibold mb-2 text-destructive">Document Not Found</div>
          <div className="text-sm text-muted-foreground mb-4">
            {error || "The shared document you're looking for doesn't exist or has expired."}
          </div>
          <a href="/" className="text-primary hover:underline">
            Return to Home
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-background flex flex-col">
      <Header />
      <div className="flex-1 flex">
        <div className="flex-1 flex flex-col">
          <div className="bg-card border-b border-border p-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg font-semibold">Shared Document: {documentData.document}</h1>
                <p className="text-sm text-muted-foreground">
                  Read-only view • Shared on {new Date(documentData.timestamp).toLocaleDateString()}
                </p>
              </div>
              <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">VIEW ONLY</div>
            </div>
          </div>
          <PDFViewer
            document={documentData.document}
            annotations={documentData.annotations}
            activeAnnotationTool="cursor" // Force cursor tool for read-only
            onAnnotationsChange={() => {}} // No-op for read-only
          />
        </div>
      </div>
    </div>
  )
}

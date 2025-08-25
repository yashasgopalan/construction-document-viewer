"use client"

import { useState, useRef, useCallback } from "react"
import { ProjectSidebar } from "@/components/project-sidebar"
import { PDFViewer } from "@/components/pdf-viewer"
import { AnnotationToolbar } from "@/components/annotation-toolbar"
import { Header } from "@/components/header"
import { ShareDialog } from "@/components/share-dialog"
import { ChevronLeft, PanelLeft, PanelRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import React from "react"
import dynamic from "next/dynamic"

// Dynamically import AISidebar to avoid SSR issues
const AISidebar = dynamic(() => import("@/components/ai-sidebar").then(mod => ({ default: mod.AISidebar })), {
  ssr: false,
  loading: () => (
    <div className="bg-sidebar border-l border-sidebar-border flex flex-col h-full">
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2 mb-2">
          <img src="/images/star-icon.png" alt="AI Assistant" className="w-5 h-5" />
          <span className="font-semibold text-sidebar-foreground">Smortr AI assistant</span>
        </div>
        <p className="text-sm text-muted-foreground">Loading AI assistant...</p>
      </div>
    </div>
  )
})

export default function ConstructionDocsApp() {
  const [selectedFile, setSelectedFile] = useState("L0-AW102")
  const [currentPDFFile, setCurrentPDFFile] = useState<File | string | null>(null)
  const [annotations, setAnnotations] = useState([])
  const [activeAnnotationTool, setActiveAnnotationTool] = useState("cursor")
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true)
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true)
  const [shareUrl, setShareUrl] = useState("")
  const [showShareDialog, setShowShareDialog] = useState(false)
  const [rightPanelWidth, setRightPanelWidth] = useState(320) // Default width in pixels
  const [isResizing, setIsResizing] = useState(false)
  const resizeRef = useRef<HTMLDivElement>(null)
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const pdfViewerRef = useRef<any>(null)


  const handleShare = () => {
    // Generate unique share ID
    const shareId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    // Create shareable document data
    const shareData = {
      file: selectedFile,
      annotations: annotations,
      commentThreads: [], // This would come from PDFViewer if we had access to it
      timestamp: new Date().toISOString(),
    }

    // Store the share data (in a real app, this would be sent to your backend)
    localStorage.setItem(`share_${shareId}`, JSON.stringify(shareData))

    // Generate the share URL
    const baseUrl = window.location.origin
    const generatedShareUrl = `${baseUrl}/shared/${shareId}`

    setShareUrl(generatedShareUrl)
    setShowShareDialog(true)
  }

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsResizing(true)
    e.preventDefault()
  }, [])

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing) return

      const containerWidth = window.innerWidth
      const newWidth = containerWidth - e.clientX

      // Set min and max width constraints
      const minWidth = 280
      const maxWidth = Math.min(800, containerWidth * 0.6)
      const collapseThreshold = 50

      if (newWidth <= collapseThreshold) {
        // Collapse the panel when dragged close to the edge
        setIsRightPanelOpen(false)
        setIsResizing(false)
      } else if (newWidth >= minWidth && newWidth <= maxWidth) {
        setRightPanelWidth(newWidth)
      }
    },
    [isResizing],
  )

  const handleMouseUp = useCallback(() => {
    setIsResizing(false)
  }, [])

  React.useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
      document.body.style.cursor = "col-resize"
      document.body.style.userSelect = "none"
    } else {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
    }
  }, [isResizing, handleMouseMove, handleMouseUp])

  return (
    <div className="h-screen flex flex-col">
      <Header />

      <div className="flex-1 flex overflow-hidden">
        {isLeftPanelOpen && <ProjectSidebar selectedFile={selectedFile} onFileSelect={setSelectedFile} />}

        <div className="flex flex-col justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsLeftPanelOpen(!isLeftPanelOpen)}
            className="h-12 w-6 rounded-none border-r border-sidebar-border bg-sidebar hover:bg-sidebar-accent"
          >
            {isLeftPanelOpen ? <ChevronLeft className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
          </Button>
        </div>

        

        {/* Main PDF Viewer */}
        <div className="flex-1 flex flex-col">
          <PDFViewer
            ref={pdfViewerRef}
            document={selectedFile}
            annotations={annotations}
            activeAnnotationTool={activeAnnotationTool}
            onAnnotationsChange={setAnnotations}
            onPDFFileChange={setCurrentPDFFile}
            onScreenshot={setScreenshot}
          />

          {/* Bottom Annotation Toolbar */}
          <AnnotationToolbar
            activeTool={activeAnnotationTool}
            onToolChange={setActiveAnnotationTool}
            onShare={handleShare}
          />
        </div>

        {isRightPanelOpen && (
          <div className="flex">
            {/* Resize handle */}
            <div
              ref={resizeRef}
              onMouseDown={handleMouseDown}
              className={`w-1 bg-sidebar-border hover:bg-primary cursor-col-resize transition-colors ${
                isResizing ? "bg-primary" : ""
              }`}
              style={{ minHeight: "100%" }}
            />

            {/* AI Sidebar with dynamic width */}
            <div style={{ width: `${rightPanelWidth}px` }}>
            <AISidebar
              document={currentPDFFile}
              screenshot={screenshot}
              onSendMessage={async (userMessage: string) => {
                // 1. Take the screenshot of the current view
                if (pdfViewerRef.current) {
                  
                 // await pdfViewerRef.current.takeScreenshot();
                }

                // 2. Wait a little for the screenshot state to update
                setTimeout(async () => {
                  // 3. Send chat message and screenshot to backend
                  try {
                    const response = await fetch('/api/chat', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        message: userMessage,
                        screenshot, // from parent state
                        // You can add more info if needed, e.g. documentName, pdfContext, etc
                      }),
                    });

                    if (!response.ok) throw new Error('API error!');

                    const data = await response.json();
                    // e.g., data.response contains AI's reply

                    // 4. TODO: You probably want to update chat UI here
                    // - You could lift chat messages into parent, or call a callback in AISidebar
                    // For now, you could log it:
                    console.log('AI reply:', data.response);

                  } catch (err) {
                    console.error('Error sending chat:', err);
                    // Optionally show error to user here
                  }
                  // 5. Optionally clear screenshot after sending
                  setScreenshot(null);

                }, 250); // delay to ensure screenshot state updates -- tweak if necessary!
              }}
              screenshot={screenshot}
            />
            </div>
          </div>
        )}

        {!isRightPanelOpen && (
          <div className="flex flex-col justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setRightPanelWidth(320)
                setIsRightPanelOpen(true)
              }}
              className="h-12 w-6 rounded-none border-l border-sidebar-border bg-sidebar hover:bg-sidebar-accent"
            >
              <PanelRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      <ShareDialog isOpen={showShareDialog} onClose={() => setShowShareDialog(false)} shareUrl={shareUrl} />
    </div>
  )
}

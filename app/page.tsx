"use client"
import React from "react"
import { useState, useRef, useCallback } from "react"
// Message type for chat
type Message = {
  type: "user" | "ai";
  content: string;
  timestamp: Date;
};
import { ProjectSidebar } from "@/components/project-sidebar"
import { PDFViewer } from "@/components/pdf-viewer"
import { AnnotationToolbar } from "@/components/annotation-toolbar"
import { Header } from "@/components/header"
import { ShareDialog } from "@/components/share-dialog"
import { AuthPopup } from "@/components/auth-popup"
import { ChevronLeft, PanelLeft, PanelRight } from "lucide-react"
import { Button } from "@/components/ui/button"
// ...existing code...
import dynamic from "next/dynamic"
import { supabase } from "@/lib/supabase-client"
import type { User } from "@supabase/supabase-js"
import { useEffect } from "react"



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
  // AI chat messages state
  const [messages, setMessages] = useState<Message[]>([
    {
      type: "ai",
      content: "Hello! I'm your AI assistant. I can help you analyze your documents and answer questions about the PDF content.",
      timestamp: new Date(),
    },
  ]);
  const [selectedFile, setSelectedFile] = useState("")
  const [currentPDFFile, setCurrentPDFFile] = useState<File | string | null>(null)
  const [annotations, setAnnotations] = React.useState<any[]>([])
  const [activeAnnotationTool, setActiveAnnotationTool] = useState("cursor")
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true)
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true)
  const [shareUrl, setShareUrl] = useState("")
  const [showShareDialog, setShowShareDialog] = useState(false)
  const [rightPanelWidth, setRightPanelWidth] = useState(320) // Default width in pixels
  const [isResizing, setIsResizing] = useState(false)
  const resizeRef = useRef<HTMLDivElement>(null)
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const pdfViewerRef = React.useRef<any>(null)

  // Auth state
  const [user, setUser] = useState<User | null>(null)
  const [showAuthPopup, setShowAuthPopup] = useState(false)

  // Check for user on mount
  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabase.auth.getUser()
      setUser(data?.user ?? null)
    }
    getSession()

    // Set up listener for changes
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      // Close auth popup when user signs in
      if (session?.user) {
        setShowAuthPopup(false)
      }
    })
    return () => listener?.subscription.unsubscribe()
  }, [])

  // Show auth popup when user is not authenticated
  useEffect(() => {
    if (user === null) {
      setShowAuthPopup(true)
    }
  }, [user])

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
        {isLeftPanelOpen && <ProjectSidebar selectedFile={selectedFile} onFileSelect={setSelectedFile} showOnlyPDFs={true} />}

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
          {selectedFile ? (
            <PDFViewer
              ref={pdfViewerRef}
              document={selectedFile}
              annotations={annotations}
              activeAnnotationTool={activeAnnotationTool}
              onAnnotationsChange={setAnnotations}
              onPDFFileChange={setCurrentPDFFile}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center bg-muted/20">
              <div className="text-center">
                <div className="text-6xl mb-4">📄</div>
                <h3 className="text-lg font-semibold text-muted-foreground mb-2">No Document Selected</h3>
                <p className="text-sm text-muted-foreground">Select a PDF document from the sidebar to get started</p>
              </div>
            </div>
          )}

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
              messages={messages}
              setMessagesAction={setMessages}
              onSendMessage={async (userMessage: string) => {
                let screenshotData = null;
                if (pdfViewerRef.current && typeof pdfViewerRef.current.takeScreenshot === 'function') {
                  screenshotData = await pdfViewerRef.current.takeScreenshot();
                }
                // Add user message immediately
                setMessages((prev: Message[]) => [...prev, { type: "user", content: userMessage, timestamp: new Date() }]);

                // Check screenshot size (base64 string length, ~1.33 bytes per char)
                const MAX_SCREENSHOT_SIZE = 1.5 * 1024 * 1024; // 1.5MB
                if (screenshotData && screenshotData.length * 0.75 > MAX_SCREENSHOT_SIZE) {
                  setMessages((prev: Message[]) => [
                    ...prev,
                    {
                      type: "ai",
                      content: "The screenshot is too large to process. Please try uploading a smaller file or reduce the screenshot area.",
                      timestamp: new Date(),
                    },
                  ]);
                  return;
                }

                // Build the messages array for the API (excluding the welcome message)
                const apiMessages = messages
                  .filter((msg: Message) => msg.type === "user" || (msg.type === "ai" && msg.content !== messages[0].content))
                  .map((msg: Message) => ({
                    role: msg.type === "user" ? "user" : "assistant",
                    content: msg.content
                  }));
                apiMessages.push({ role: "user", content: userMessage });
                const pdfContext = null; // Set this to your actual PDF context if available
                const documentName = typeof currentPDFFile === 'string' ? currentPDFFile : (currentPDFFile?.name || '');
                const payload = {
                  messages: apiMessages,
                  pdfContext,
                  documentName,
                  screenshot: screenshotData ?? null,
                };
                try {
                  const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                  });
                  if (!response.ok) throw new Error('API error!');
                  const data = await response.json();
                  setMessages((prev: Message[]) => [...prev, { type: "ai", content: data.response, timestamp: new Date() }]);
                } catch (err) {
                  setMessages((prev: Message[]) => [...prev, { type: "ai", content: "I apologize, but I encountered an error processing your request. Please try again or check your connection.", timestamp: new Date() }]);
                  console.error('Error sending chat:', err);
                }
              }}
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
      <AuthPopup isOpen={showAuthPopup} onClose={() => setShowAuthPopup(false)} />
    </div>
  )
}


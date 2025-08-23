"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, Loader2 } from "lucide-react"
import { extractPDFText, preparePDFContext, truncateContext, type PDFContext } from "@/lib/pdf-utils"

interface AISidebarProps {
  document: string | File | null
}

interface Message {
  type: "user" | "ai"
  content: string
  timestamp: Date
}

export function AISidebar({ document }: AISidebarProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      type: "ai",
      content: "Hello! I'm your AI assistant. I can help you analyze your documents and answer questions about the PDF content.",
      timestamp: new Date(),
    },
  ])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [pdfContext, setPdfContext] = useState<PDFContext | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  const suggestedPrompts = [
    "What are the main specifications in this document?",
    "Summarize the key construction details",
    "What materials are mentioned in this document?",
    "Are there any measurements or dimensions specified?"
  ]

  // Extract PDF context when document changes
  useEffect(() => {
    if (document) {
      extractPDFContext()
    }
  }, [document])

  const extractPDFContext = async () => {
    if (!document) return
    
    try {
      setIsLoading(true)
      const context = await extractPDFText(document)
      setPdfContext(context)
      
      // Update welcome message with document info
      if (messages.length === 1 && messages[0].type === "ai") {
        setMessages(prev => [
          {
            type: "ai",
            content: `Hello! I'm analyzing "${context.documentName}" (${context.pages} pages). I can help you understand the construction details, specifications, and technical information in this document.`,
            timestamp: new Date(),
          }
        ])
      }
    } catch (error) {
      console.error('Error extracting PDF context:', error)
      setPdfContext(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [inputValue])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage = inputValue.trim()
    setInputValue("")
    setIsLoading(true)

    // Add user message immediately
    const newUserMessage: Message = {
      type: "user",
      content: userMessage,
      timestamp: new Date(),
    }
    
    setMessages(prev => [...prev, newUserMessage])

    try {
      // Prepare context for the API
      let contextString = ""
      if (pdfContext) {
        const preparedContext = preparePDFContext(pdfContext)
        contextString = truncateContext(preparedContext, 6000) // Leave room for conversation
      }

      // Prepare messages for the API (excluding the welcome message)
      const apiMessages = messages
        .filter(msg => msg.type === "user" || (msg.type === "ai" && msg.content !== messages[0].content))
        .map(msg => ({
          role: msg.type === "user" ? "user" as const : "assistant" as const,
          content: msg.content
        }))

      // Add the new user message
      apiMessages.push({ role: "user", content: userMessage })

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: apiMessages,
          pdfContext: contextString,
          documentName: pdfContext?.documentName || 'Current Document'
        }),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()
      
      const aiMessage: Message = {
        type: "ai",
        content: data.response,
        timestamp: new Date(),
      }

      setMessages(prev => [...prev, aiMessage])

    } catch (error) {
      console.error('Error sending message:', error)
      
      const errorMessage: Message = {
        type: "ai",
        content: "I apologize, but I encountered an error processing your request. Please try again or check your connection.",
        timestamp: new Date(),
      }
      
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSuggestedPrompt = (prompt: string) => {
    setInputValue(prompt)
  }

  const formatTime = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="bg-sidebar border-l border-sidebar-border flex flex-col h-full">
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2 mb-2">
          <img src="/images/star-icon.png" alt="AI Assistant" className="w-5 h-5" />
          <span className="font-semibold text-sidebar-foreground">Smortr AI assistant</span>
          {isLoading && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
        </div>
        <p className="text-sm text-muted-foreground">
          {pdfContext 
            ? `Analyzing: ${pdfContext.documentName} (${pdfContext.pages} pages)`
            : "Ask questions about your documents"
          }
        </p>
      </div>

      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-4 mb-6">
          {messages.map((message, index) => (
            <div key={index} className={`flex gap-2 ${message.type === "user" ? "justify-end" : ""}`}>
              <div
                className={`p-3 rounded-lg text-sm break-words chat-bubble ${
                  message.type === "user"
                    ? "bg-primary text-primary-foreground max-w-[85%]"
                    : "bg-sidebar-accent text-sidebar-foreground max-w-[90%]"
                }`}
              >
                <div className="whitespace-pre-wrap">{message.content}</div>
                <div className="text-xs opacity-70 mt-1">
                  {formatTime(message.timestamp)}
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-2">
              <div className="p-3 rounded-lg text-sm bg-sidebar-accent text-sidebar-foreground max-w-[90%]">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing document and generating response...
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-sidebar-border">
        <div className="mb-4">
          <h3 className="text-sm font-medium text-sidebar-foreground mb-3">Suggested Prompts</h3>
          <div className="space-y-2">
            {suggestedPrompts.map((prompt, index) => (
              <div
                key={index}
                className="flex items-center gap-2 p-2 text-sm text-primary hover:text-primary/80 cursor-pointer hover:bg-sidebar-accent rounded transition-colors"
                onClick={() => handleSuggestedPrompt(prompt)}
              >
                <img src="/images/arrow-icon.png" alt="Arrow" className="w-3 h-3" />
                {prompt}
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            placeholder="Ask Smortr AI a question about your document"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
            disabled={isLoading}
            className="flex-1 min-h-[40px] max-h-[120px] px-3 py-2 text-sm border border-sidebar-border rounded-md text-sidebar-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50"
            rows={1}
            style={{ backgroundColor: "#2D2D2D" }}
          />
          <Button
            size="sm"
            onClick={handleSendMessage}
            disabled={isLoading || !inputValue.trim()}
            className="bg-primary text-primary-foreground hover:bg-primary/90 h-10 disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  )
}

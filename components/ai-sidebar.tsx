"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, Loader2 } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { extractPDFText, preparePDFContext, truncateContext, type PDFContext } from "@/lib/pdf-utils"

interface Message {
  type: "user" | "ai"
  content: string
  timestamp: Date
}

interface AISidebarProps {
  document: string | File | null
  messages: Message[]
  setMessagesAction: React.Dispatch<React.SetStateAction<Message[]>>
  onSendMessage?: (userMessage: string) => Promise<void>;
}

interface Message {
  type: "user" | "ai"
  content: string
  timestamp: Date
}

export function AISidebar({ document, messages, setMessagesAction, onSendMessage }: AISidebarProps) {
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
        setMessagesAction((prev: Message[]) => [
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
    if (!inputValue.trim() || isLoading) return;
    const userMessage = inputValue.trim();
    setInputValue("");
    setIsLoading(true);



    if (onSendMessage) {
      try {
        await onSendMessage(userMessage);
        // Optionally, you can update messages with AI response here if you want to lift state up
      } catch (error) {
        console.error('Error sending message:', error);
        const errorMessage: Message = {
          type: "ai",
          content: "I apologize, but I encountered an error processing your request. Please try again or check your connection.",
          timestamp: new Date(),
        };
  setMessagesAction(prev => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
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

  <ScrollArea className="flex-1 p-4">
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
                {message.type === "ai" ? (
                  <div className="prose prose-sm prose-invert max-w-none">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        // Custom styling for markdown elements
                        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                        ul: ({ children }) => <ul className="list-disc list-inside mb-2">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal list-inside mb-2">{children}</ol>,
                        li: ({ children }) => <li className="mb-1">{children}</li>,
                        code: ({ children, className }) => {
                          const isInline = !className;
                          return isInline ? (
                            <code className="bg-gray-700 px-1 py-0.5 rounded text-sm">{children}</code>
                          ) : (
                            <code className={`${className} block bg-gray-700 p-2 rounded text-sm overflow-x-auto`}>{children}</code>
                          );
                        },
                        pre: ({ children }) => <pre className="bg-gray-700 p-2 rounded text-sm overflow-x-auto mb-2">{children}</pre>,
                        blockquote: ({ children }) => <blockquote className="border-l-4 border-gray-500 pl-4 italic mb-2">{children}</blockquote>,
                        h1: ({ children }) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
                        h2: ({ children }) => <h2 className="text-base font-bold mb-2">{children}</h2>,
                        h3: ({ children }) => <h3 className="text-sm font-bold mb-2">{children}</h3>,
                        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                        em: ({ children }) => <em className="italic">{children}</em>,
                        table: ({ children }) => <table className="border-collapse border border-gray-600 mb-2 text-xs">{children}</table>,
                        th: ({ children }) => <th className="border border-gray-600 px-2 py-1 bg-gray-700">{children}</th>,
                        td: ({ children }) => <td className="border border-gray-600 px-2 py-1">{children}</td>,
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap">{message.content}</div>
                )}
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

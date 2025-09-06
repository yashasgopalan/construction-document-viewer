"use client"

import React, { useRef, useEffect, useState, useImperativeHandle } from "react"
import { FigmaCommentDialog, type CommentThread, type CommentReply } from "./figma-comment-dialog"
import { ZoomIn, ZoomOut, RotateCcw, Upload, MessageCircle, Camera } from "lucide-react"
import { Button } from "./ui/button"
import dynamic from "next/dynamic"
import { TextAnnotationEditor } from "./text-annotation-editor"
import html2canvas from "html2canvas-pro"
import { generateSignedUrl } from "@/lib/storage-utils"


// Dynamically import react-pdf components to avoid SSR and ESM issues
const Document = dynamic(() => import("react-pdf").then((mod) => mod.Document), { 
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-96"><div className="text-muted-foreground">Loading PDF...</div></div>
})
const Page = dynamic(() => import("react-pdf").then((mod) => mod.Page), { 
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-96"><div className="text-muted-foreground">Loading page...</div></div>
})

// Import worker for PDF.js 
let pdfjs: any = null
if (typeof window !== "undefined") {
  import("react-pdf").then((mod) => {
    pdfjs = mod.pdfjs
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  })
}

interface VectorElement {
  id: string
  type: "wall" | "door" | "window" | "room" | "dimension" | "text"
  bounds: { x: number; y: number; width: number; height: number }
  path?: { x: number; y: number }[]
}

interface PDFViewerProps {
  document: string
  annotations: any[]
  activeAnnotationTool: string
  onAnnotationsChange: (annotations: any[]) => void
  onPDFFileChange?: (file: File | string | null) => void
  onScreenshotRequest?: (imgData: string) => void
}
export const PDFViewer = React.forwardRef(function PDFViewer({ document, annotations, activeAnnotationTool, onAnnotationsChange, onPDFFileChange, onScreenshotRequest }: PDFViewerProps, ref) {
  // Expose takeScreenshot method to parent via ref
  useImperativeHandle(ref, () => ({
    takeScreenshot: async () => {
      if (!containerRef.current) return null;
      const el = containerRef.current;
      const canvas = await html2canvas(el, { useCORS: true });
      return canvas.toDataURL("image/png");
    }
  }), []);
  const containerRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pdfImageDataUrl, setPdfImageDataUrl] = useState<string | null>(null);


  const [isDrawing, setIsDrawing] = useState(false)
  const [currentAnnotation, setCurrentAnnotation] = useState(null)

  // Enhanced comment system
  const [commentThreads, setCommentThreads] = useState<CommentThread[]>([])
  const [showCommentDialog, setShowCommentDialog] = useState(false)
  const [commentPosition, setCommentPosition] = useState({ x: 0, y: 0 })
  const [activeThread, setActiveThread] = useState<CommentThread | undefined>()
  const [isCreatingComment, setIsCreatingComment] = useState(false)
  const [pendingCommentPosition, setPendingCommentPosition] = useState<{ x: number; y: number } | null>(null)
  const [containerBounds, setContainerBounds] = useState<DOMRect | undefined>()

  const [selectedAnnotations, setSelectedAnnotations] = useState<number[]>([])
  const [selectedThreads, setSelectedThreads] = useState<string[]>([])
  const [draggedAnnotation, setDraggedAnnotation] = useState<{
    index: number
    offset: { x: number; y: number }
  } | null>(null)
  const [resizingAnnotation, setResizingAnnotation] = useState<{ index: number; handle: string } | null>(null)
  const [draggedThread, setDraggedThread] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 })
  const [isShiftPressed, setIsShiftPressed] = useState(false)
  const [isSelecting, setIsSelecting] = useState(false)
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null)
  const [selectionEnd, setSelectionEnd] = useState<{ x: number; y: number } | null>(null)
  const [selectedElements, setSelectedElements] = useState<string[]>([])
  const [hoveredThread, setHoveredThread] = useState<string | null>(null)
  const [isDraggingSelection, setIsDraggingSelection] = useState(false)
  const [selectionThreshold] = useState(5)

  // Mock vector elements for demonstration
  const vectorElements: VectorElement[] = [
    { id: "wall-1", type: "wall", bounds: { x: 50, y: 50, width: 700, height: 3 } },
    { id: "wall-2", type: "wall", bounds: { x: 50, y: 550, width: 700, height: 3 } },
    { id: "wall-3", type: "wall", bounds: { x: 50, y: 50, width: 3, height: 500 } },
    { id: "wall-4", type: "wall", bounds: { x: 750, y: 50, width: 3, height: 500 } },
    { id: "room-1", type: "room", bounds: { x: 50, y: 50, width: 250, height: 150 } },
    { id: "room-2", type: "room", bounds: { x: 500, y: 50, width: 250, height: 300 } },
    { id: "text-1", type: "text", bounds: { x: 120, y: 120, width: 100, height: 20 } },
    { id: "text-2", type: "text", bounds: { x: 580, y: 190, width: 80, height: 20 } },
  ]

  const [pdfFile, setPdfFile] = useState<File | string | null>("/placeholder-construction-drawing.pdf")
  const [numPages, setNumPages] = useState<number>(1)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [pdfError, setPdfError] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isLoadingPdf, setIsLoadingPdf] = useState(false)

  const [activeTextAnnotation, setActiveTextAnnotation] = useState<{
    id: string
    x: number
    y: number
    width: number
    height: number
    text: string
    formatting: any
  } | null>(null)
  const [editingTextAnnotation, setEditingTextAnnotation] = useState<string | null>(null)


  
  const handleScreenshot = async () => {
    if (!containerRef.current) return;
    if (typeof window === "undefined" || typeof document === "undefined") return;
    const el = containerRef.current;
    if (!el) return;
    // Optionally, add a highlight to show what is being captured
    //el.style.boxShadow = "0 0 0 4px red inset";
    setTimeout(async () => {
      const canvas = await html2canvas(el, { useCORS: true });
      el.style.boxShadow = ""; // Remove highlight
      const imgData = canvas.toDataURL("image/png");
      const win = window.open();
      if (typeof onScreenshotRequest === "function") {
        onScreenshotRequest(imgData); // THIS sends the screenshot to the parent/App
      }
      // Button to debug and open screenshot in a tab using a button
        if (win) {
        win.document.write(`<img src="${imgData}" style="max-width:100vw;max-height:100vh;display:block;margin:auto;" alt="Screenshot"/>`);
        win.document.title = "PDF Screenshot";
      }
    }, 50);
  };

  // Load PDF from Supabase when document prop changes
  useEffect(() => {
    const loadPdfFromSupabase = async () => {
      // Check if document is a Supabase path (contains user ID)
      if (document && document.includes('/') && !document.startsWith('/') && !document.startsWith('http')) {
        setIsLoadingPdf(true)
        setPdfError(null)
        
        try {
          const signedUrlResult = await generateSignedUrl('user-files', document)
          
          if (signedUrlResult.error) {
            setPdfError(`Failed to load PDF: ${signedUrlResult.error}`)
            setPdfFile("/placeholder-construction-drawing.pdf")
          } else {
            setPdfFile(signedUrlResult.signedUrl)
            setPdfError(null)
          }
        } catch (err) {
          console.error('Error loading PDF from Supabase:', err)
          setPdfError(`Failed to load PDF: ${err instanceof Error ? err.message : 'Unknown error'}`)
          setPdfFile("/placeholder-construction-drawing.pdf")
        } finally {
          setIsLoadingPdf(false)
        }
      } else {
        // Use the document as-is (for local files or URLs)
        setPdfFile(document)
        setPdfError(null)
      }
    }

    loadPdfFromSupabase()
  }, [document])

  // Notify parent when PDF file changes
  useEffect(() => {
    if (onPDFFileChange) {
      onPDFFileChange(pdfFile)
    }
  }, [pdfFile, onPDFFileChange])

  const handleZoomOut = () => {
    setZoom((prevZoom) => Math.max(0.1, prevZoom - 0.05))
  }

  const handleZoomIn = () => {
    setZoom((prevZoom) => Math.min(5, prevZoom + 0.05))
  }

  const handleResetView = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type === "application/pdf") {
      setPdfFile(file)
      setPdfError(null)
    } else {
      setPdfError("Please select a valid PDF file")
    }
  }

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
    setCurrentPage(1)
    setPdfError(null)
  }

  const onDocumentLoadError = (error: Error) => {
    console.error("PDF load error:", error)
    setPdfError("Failed to load PDF. Please try another file.")
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Shift") {
        setIsShiftPressed(true)
      } else if (e.key === "Backspace" || e.key === "Delete") {
        if (selectedAnnotations.length > 0) {
          const newAnnotations = annotations.filter((_, index) => !selectedAnnotations.includes(index))
          onAnnotationsChange(newAnnotations)
          setSelectedAnnotations([])
        }
        if (selectedThreads.length > 0) {
          const newThreads = commentThreads.filter((thread) => !selectedThreads.includes(thread.id))
          setCommentThreads(newThreads)
          setSelectedThreads([])
        }
      } else if (e.key === "Escape") {
        setSelectedAnnotations([])
        setSelectedThreads([])
        setDraggedAnnotation(null)
        setResizingAnnotation(null)
        setShowCommentDialog(false)
        setIsCreatingComment(false)
        setActiveTextAnnotation(null)
        setEditingTextAnnotation(null)
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Shift") {
        setIsShiftPressed(false)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
    }
  }, [selectedAnnotations, selectedThreads, annotations, commentThreads, onAnnotationsChange])

  const getOverlayCoordinates = (clientX: number, clientY: number) => {
    const rect = overlayRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }

    const x = (clientX - rect.left - pan.x) / zoom
    const y = (clientY - rect.top - pan.y) / zoom

    console.log("[v0] Coordinate calculation:", {
      clientX,
      clientY,
      rectLeft: rect.left,
      rectTop: rect.top,
      pan,
      zoom,
      result: { x, y },
    })

    return { x, y }
  }

  const getElementsInBounds = (x1: number, y1: number, x2: number, y2: number) => {
    const minX = Math.min(x1, x2)
    const maxX = Math.max(x1, x2)
    const minY = Math.min(y1, y2)
    const maxY = Math.max(y1, y2)

    return vectorElements
      .filter((element) => {
        const { x, y, width, height } = element.bounds
        return !(x > maxX || x + width < minX || y > maxY || y + height < minY)
      })
      .map((el) => el.id)
  }

  const getElementAtPoint = (x: number, y: number) => {
    return vectorElements.find((element) => {
      const { x: ex, y: ey, width, height } = element.bounds
      return x >= ex && x <= ex + width && y >= ey && y <= ey + height
    })?.id
  }

  const getThreadAtPoint = (x: number, y: number) => {
    return commentThreads.find((thread) => {
      const distance = Math.sqrt(Math.pow(x - thread.x, 2) + Math.pow(y - thread.y, 2))
      return distance <= 15
    })
  }

  const getAnnotationBounds = (annotation: any) => {
    if (annotation.type === "circle") {
      return {
        x: annotation.x - annotation.radius,
        y: annotation.y - annotation.radius,
        width: annotation.radius * 2,
        height: annotation.radius * 2,
      }
    }
    return {
      x: annotation.x,
      y: annotation.y,
      width: Math.abs(annotation.width || 0),
      height: Math.abs(annotation.height || 0),
    }
  }

  const getResizeHandle = (annotation: any, x: number, y: number) => {
    const bounds = getAnnotationBounds(annotation)
    const handleSize = 8 / zoom

    if (annotation.type === "circle") {
      const centerX = annotation.x
      const centerY = annotation.y
      const radius = annotation.radius

      const circleHandles = [
        { name: "top", x: centerX, y: centerY - radius },
        { name: "right", x: centerX + radius, y: centerY },
        { name: "bottom", x: centerX, y: centerY + radius },
        { name: "left", x: centerX - radius, y: centerY },
      ]

      for (const handle of circleHandles) {
        if (
          x >= handle.x - handleSize &&
          x <= handle.x + handleSize &&
          y >= handle.y - handleSize &&
          y <= handle.y + handleSize
        ) {
          return handle.name
        }
      }
      return null
    }

    const handles = [
      { name: "nw", x: bounds.x, y: bounds.y },
      { name: "ne", x: bounds.x + bounds.width, y: bounds.y },
      { name: "sw", x: bounds.x, y: bounds.y + bounds.height },
      { name: "se", x: bounds.x + bounds.width, y: bounds.y + bounds.height },
    ]

    for (const handle of handles) {
      if (
        x >= handle.x - handleSize &&
        x <= handle.x + handleSize &&
        y >= handle.y - handleSize &&
        y <= handle.y + handleSize
      ) {
        return handle.name
      }
    }
    return null
  }

  const isPointInAnnotation = (annotation: any, x: number, y: number) => {
    if (annotation.type === "circle") {
      const centerX = annotation.x
      const centerY = annotation.y
      const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2))
      return distance <= annotation.radius * 0.8 // Slightly smaller area for center dragging
    } else {
      const bounds = getAnnotationBounds(annotation)
      return x >= bounds.x && x <= bounds.x + bounds.width && y >= bounds.y && y <= bounds.y + bounds.height
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!overlayRef.current) return

    const rect = overlayRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left - pan.x) / zoom
    const y = (e.clientY - rect.top - pan.y) / zoom

    console.log("[v0] Mouse down at:", { x, y, tool: activeAnnotationTool })

    if (activeAnnotationTool === "comment") {
      // Create a new comment annotation
      const newComment = {
        id: Date.now().toString(),
        type: "comment",
        x,
        y,
        width: 20,
        height: 20,
        text: "",
        color: "#0078D4",
      }

      // Add to annotations
      onAnnotationsChange([...annotations, newComment])

      // Show comment dialog for editing
      setCommentPosition({ x: e.clientX, y: e.clientY })
      setActiveThread({
        id: newComment.id,
        x: e.clientX,
        y: e.clientY,
        resolved: false,
        comments: [],
        replies: [],
      })
      setShowCommentDialog(true)
      setIsCreatingComment(true)
      return
    }

    if (activeAnnotationTool === "cursor") {
      // Check for resize handles on selected annotations first
      for (const index of selectedAnnotations) {
        const annotation = annotations[index]
        const handle = getResizeHandle(annotation, x, y)
        if (handle) {
          setResizingAnnotation({ index, handle })
          return
        }
      }

      // Check for annotation selection/dragging
      const clickedAnnotationIndex = annotations.findIndex((annotation) => isPointInAnnotation(annotation, x, y))

      if (clickedAnnotationIndex !== -1) {
        const annotation = annotations[clickedAnnotationIndex]
        const bounds = getAnnotationBounds(annotation)

        setDraggedAnnotation({
          index: clickedAnnotationIndex,
          offset: { x: x - bounds.x, y: y - bounds.y },
        })

        if (e.ctrlKey || e.metaKey) {
          setSelectedAnnotations((prev) =>
            prev.includes(clickedAnnotationIndex)
              ? prev.filter((i) => i !== clickedAnnotationIndex)
              : [...prev, clickedAnnotationIndex],
          )
        } else {
          setSelectedAnnotations([clickedAnnotationIndex])
        }
        setSelectedThreads([])
        return
      }

      // Check for comment thread interactions
      const clickedThread = getThreadAtPoint(x, y)
      if (clickedThread) {
        setDraggedThread(clickedThread.id)
        setDragOffset({
          x: x - clickedThread.x,
          y: y - clickedThread.y,
        })

        if (e.ctrlKey || e.metaKey) {
          // Multi-select with Ctrl/Cmd
          setSelectedThreads((prev) =>
            prev.includes(clickedThread.id)
              ? prev.filter((id) => id !== clickedThread.id)
              : [...prev, clickedThread.id],
          )
        } else {
          setSelectedThreads([clickedThread.id])
        }
        setSelectedAnnotations([])
        return
      }

      // Clear selections if clicking on empty space
      setSelectedAnnotations([])
      setSelectedThreads([])
    }

    // Handle comment thread interactions first
    if (activeAnnotationTool === "cursor" || activeAnnotationTool === "comment") {
      const clickedThread = getThreadAtPoint(x, y)

      if (clickedThread) {
        if (activeAnnotationTool === "cursor") {
          // Start dragging thread
          setDraggedThread(clickedThread.id)
          setDragOffset({
            x: x - clickedThread.x,
            y: y - clickedThread.y,
          })

          if (e.ctrlKey || e.metaKey) {
            // Multi-select with Ctrl/Cmd
            setSelectedThreads((prev) =>
              prev.includes(clickedThread.id)
                ? prev.filter((id) => id !== clickedThread.id)
                : [...prev, clickedThread.id],
            )
          } else {
            setSelectedThreads([clickedThread.id])
          }
          setSelectedAnnotations([])
          return
        } else if (activeAnnotationTool === "comment") {
          // Open existing thread
          const containerRect = containerRef.current?.getBoundingClientRect()
          setContainerBounds(containerRect)
          setCommentPosition({ x: e.clientX, y: e.clientY })
          setActiveThread(clickedThread)
          setIsCreatingComment(false)
          setShowCommentDialog(true)
          return
        }
      }
    }

    // Handle annotation selection with cursor tool (before panning check)
    if (activeAnnotationTool === "cursor") {
      const clickedAnnotationIndex = annotations.findIndex((annotation) => {
        // Handle different annotation types with proper bounds
        if (annotation.type === "circle") {
          const centerX = annotation.x
          const centerY = annotation.y
          const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2))
          return distance <= (annotation.radius || 0)
        } else {
          // Rectangle, highlight, and other rectangular annotations
          const annotationBounds = {
            x: annotation.x,
            y: annotation.y,
            width: Math.abs(annotation.width || 0),
            height: Math.abs(annotation.height || 0),
          }

          // Adjust bounds for negative width/height
          if (annotation.width < 0) {
            annotationBounds.x = annotation.x + annotation.width
          }
          if (annotation.height < 0) {
            annotationBounds.y = annotation.y + annotation.height
          }

          return (
            x >= annotationBounds.x &&
            x <= annotationBounds.x + annotationBounds.width &&
            y >= annotationBounds.y &&
            y <= annotationBounds.y + annotationBounds.height
          )
        }
      })

      if (clickedAnnotationIndex !== -1) {
        if (e.ctrlKey || e.metaKey) {
          setSelectedAnnotations((prev) =>
            prev.includes(clickedAnnotationIndex)
              ? prev.filter((i) => i !== clickedAnnotationIndex)
              : [...prev, clickedAnnotationIndex],
          )
        } else {
          setSelectedAnnotations([clickedAnnotationIndex])
        }
        setSelectedThreads([])
        return
      }
    }

    // Handle panning - only if Shift is pressed OR if cursor tool and clicking on empty space
    if (isShiftPressed || (activeAnnotationTool === "cursor" && !e.ctrlKey && !e.metaKey)) {
      setIsPanning(true)
      setLastPanPoint({ x: e.clientX, y: e.clientY })
      // Clear selections when starting to pan
      setSelectedAnnotations([])
      setSelectedThreads([])
      return
    }

    // Handle comment creation
    if (activeAnnotationTool === "comment") {
      setIsSelecting(true)
      setIsDraggingSelection(false)
      setSelectionStart({ x, y })
      setSelectionEnd({ x, y })

      const elementAtPoint = getElementAtPoint(x, y)
      if (elementAtPoint) {
        setSelectedElements([elementAtPoint])
      } else {
        setSelectedElements([])
      }
      return
    }

    if (activeAnnotationTool === "text") {
      // Check if clicking on existing text annotation
      const clickedTextAnnotation = annotations.find((annotation, index) => {
        if (annotation.type === "text") {
          return (
            x >= annotation.x &&
            x <= annotation.x + annotation.width &&
            y >= annotation.y &&
            y <= annotation.y + annotation.height
          )
        }
        return false
      })

      if (clickedTextAnnotation) {
        setEditingTextAnnotation(clickedTextAnnotation.id)
        setActiveTextAnnotation({
          id: clickedTextAnnotation.id,
          x: clickedTextAnnotation.x,
          y: clickedTextAnnotation.y,
          width: clickedTextAnnotation.width,
          height: clickedTextAnnotation.height,
          text: clickedTextAnnotation.text || "",
          formatting: clickedTextAnnotation.formatting || {},
        })
      } else {
        // Create new text annotation
        const newTextAnnotation = {
          id: Date.now().toString(),
          x,
          y,
          width: 250,
          height: 150,
          text: "",
          formatting: {},
        }
        setActiveTextAnnotation(newTextAnnotation)
        setEditingTextAnnotation(newTextAnnotation.id)
      }
      return
    }

    // Handle other annotation tools
    if (
      activeAnnotationTool === "highlight" ||
      activeAnnotationTool === "rectangle" ||
      activeAnnotationTool === "circle"
    ) {
      console.log("[v0] Starting annotation:", { x, y, type: activeAnnotationTool })
      setIsDrawing(true)
      setCurrentAnnotation({ x, y, type: activeAnnotationTool, width: 0, height: 0 })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      const deltaX = e.clientX - lastPanPoint.x
      const deltaY = e.clientY - lastPanPoint.y

      const smoothingFactor = isShiftPressed ? 1.0 : 0.8
      setPan((prev) => ({
        x: prev.x + deltaX * smoothingFactor,
        y: prev.y + deltaY * smoothingFactor,
      }))
      setLastPanPoint({ x: e.clientX, y: e.clientY })
      return
    }

    const { x, y } = getOverlayCoordinates(e.clientX, e.clientY)

    if (resizingAnnotation) {
      const { index, handle } = resizingAnnotation
      const annotation = annotations[index]
      const updatedAnnotations = [...annotations]

      if (annotation.type === "circle") {
        const centerX = annotation.x
        const centerY = annotation.y
        let newRadius

        switch (handle) {
          case "top":
            newRadius = Math.abs(centerY - y)
            break
          case "right":
            newRadius = Math.abs(x - centerX)
            break
          case "bottom":
            newRadius = Math.abs(y - centerY)
            break
          case "left":
            newRadius = Math.abs(centerX - x)
            break
          default:
            newRadius = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2))
        }

        updatedAnnotations[index] = { ...annotation, radius: Math.max(10, newRadius) }
      } else {
        const bounds = getAnnotationBounds(annotation)
        let newBounds = { ...bounds }

        switch (handle) {
          case "nw":
            newBounds = { x, y, width: bounds.x + bounds.width - x, height: bounds.y + bounds.height - y }
            break
          case "ne":
            newBounds = { x: bounds.x, y, width: x - bounds.x, height: bounds.y + bounds.height - y }
            break
          case "sw":
            newBounds = { x, y: bounds.y, width: bounds.x + bounds.width - x, height: y - bounds.y }
            break
          case "se":
            newBounds = { x: bounds.x, y: bounds.y, width: x - bounds.x, height: y - bounds.y }
            break
        }

        updatedAnnotations[index] = {
          ...annotation,
          x: newBounds.x,
          y: newBounds.y,
          width: Math.max(10, newBounds.width),
          height: Math.max(10, newBounds.height),
        }
      }

      onAnnotationsChange(updatedAnnotations)
      return
    }

    if (draggedAnnotation) {
      const { index, offset } = draggedAnnotation
      const annotation = annotations[index]
      const updatedAnnotations = [...annotations]

      if (annotation.type === "circle") {
        updatedAnnotations[index] = { ...annotation, x: x, y: y }
      } else {
        updatedAnnotations[index] = { ...annotation, x: x - offset.x, y: y - offset.y }
      }

      onAnnotationsChange(updatedAnnotations)
      return
    }

    // Handle thread dragging
    if (draggedThread) {
      const newX = x - dragOffset.x
      const newY = y - dragOffset.y

      setCommentThreads((prev) =>
        prev.map((thread) => (thread.id === draggedThread ? { ...thread, x: newX, y: newY } : thread)),
      )
      return
    }

    // Handle comment selection
    if (isSelecting && selectionStart) {
      const distance = Math.sqrt(Math.pow(x - selectionStart.x, 2) + Math.pow(y - selectionStart.y, 2))

      if (distance > selectionThreshold && !isDraggingSelection) {
        setIsDraggingSelection(true)
      }

      setSelectionEnd({ x, y })

      if (isDraggingSelection) {
        const elements = getElementsInBounds(selectionStart.x, selectionStart.y, x, y)
        setSelectedElements(elements)
      } else {
        const elementAtPoint = getElementAtPoint(selectionStart.x, selectionStart.y)
        setSelectedElements(elementAtPoint ? [elementAtPoint] : [])
      }
      return
    }

    // Handle hover effects for comment threads
    if (activeAnnotationTool === "cursor" || activeAnnotationTool === "comment") {
      const hoveredThread = getThreadAtPoint(x, y)
      setHoveredThread(hoveredThread?.id || null)
    }

    // Handle drawing annotations
    if (isDrawing && currentAnnotation) {
      const updatedAnnotation = {
        ...currentAnnotation,
        width: x - currentAnnotation.x,
        height: y - currentAnnotation.y,
        radius: Math.sqrt(Math.pow(x - currentAnnotation.x, 2) + Math.pow(y - currentAnnotation.y, 2)),
      }

      console.log("[v0] Updating annotation:", updatedAnnotation)
      setCurrentAnnotation(updatedAnnotation)
    }
  }

  const handleMouseUp = (e: React.MouseEvent) => {
    if (isPanning) {
      setIsPanning(false)
      return
    }

    if (draggedAnnotation) {
      setDraggedAnnotation(null)
      return
    }

    if (resizingAnnotation) {
      setResizingAnnotation(null)
      return
    }

    if (draggedThread) {
      setDraggedThread(null)
      setDragOffset({ x: 0, y: 0 })
      return
    }

    if (isSelecting && activeAnnotationTool === "comment") {
      setIsSelecting(false)
      setIsDraggingSelection(false)

      if (selectedElements.length > 0) {
        const containerRect = containerRef.current?.getBoundingClientRect()
        setContainerBounds(containerRect)

        const commentX = selectionStart?.x || 0
        const commentY = selectionStart?.y || 0

        setPendingCommentPosition({ x: commentX, y: commentY })
        setCommentPosition({ x: e.clientX, y: e.clientY })
        setActiveThread(undefined)
        setIsCreatingComment(true)
        setShowCommentDialog(true)
      } else {
        setSelectionStart(null)
        setSelectionEnd(null)
        setSelectedElements([])
      }
      return
    }

    if (currentAnnotation && isDrawing) {
      // Only add annotation if it has meaningful dimensions
      const hasValidDimensions =
        (currentAnnotation.type === "circle" && currentAnnotation.radius > 5) ||
        (currentAnnotation.type !== "circle" &&
          (Math.abs(currentAnnotation.width) > 5 || Math.abs(currentAnnotation.height) > 5))

      if (hasValidDimensions) {
        console.log("[v0] Adding annotation:", currentAnnotation)
        onAnnotationsChange([...annotations, currentAnnotation])
      } else {
        console.log("[v0] Annotation too small, not adding")
      }
    }

    setIsDrawing(false)
    setCurrentAnnotation(null)
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()

    if (isShiftPressed) {
      const panSpeed = 2
      const deltaX = e.deltaX * panSpeed
      const deltaY = e.deltaY * panSpeed
      setPan((prev) => ({ x: prev.x - deltaX, y: prev.y - deltaY }))
    } else {
      const rect = overlayRef.current?.getBoundingClientRect()
      if (!rect) return

      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top

      const zoomSpeed = 0.05
      const delta = e.deltaY > 0 ? -zoomSpeed : zoomSpeed
      const newZoom = Math.max(0.1, Math.min(5, zoom + delta))

      const zoomFactor = newZoom / zoom
      const newPanX = mouseX - (mouseX - pan.x) * zoomFactor
      const newPanY = mouseY - (mouseY - pan.y) * zoomFactor

      setPan({ x: newPanX, y: newPanY })
      setZoom(newZoom)
    }
  }

  // Comment thread management functions
  const handleSaveComment = (text: string, threadId?: string) => {
    if (threadId) {
      // Add reply to existing thread
      const newReply: CommentReply = {
        id: Date.now().toString(),
        text,
        author: "Current User",
        timestamp: new Date(),
      }

      setCommentThreads((prev) =>
        prev.map((thread) => (thread.id === threadId ? { ...thread, replies: [...thread.replies, newReply] } : thread)),
      )
    } else if (pendingCommentPosition) {
      // Create new thread
      const newThread: CommentThread = {
        id: Date.now().toString(),
        x: pendingCommentPosition.x,
        y: pendingCommentPosition.y,
        timestamp: new Date(),
        associatedElements: [...selectedElements],
        resolved: false,
        replies: [
          {
            id: Date.now().toString(),
            text,
            author: "Current User",
            timestamp: new Date(),
          },
        ],
      }
      setCommentThreads((prev) => [...prev, newThread])
    }

    setShowCommentDialog(false)
    setPendingCommentPosition(null)
    setSelectedElements([])
    setSelectionStart(null)
    setSelectionEnd(null)
    setActiveThread(undefined)
    setIsCreatingComment(false)
  }

  const handleReplyToThread = (threadId: string, text: string) => {
    const newReply: CommentReply = {
      id: Date.now().toString(),
      text,
      author: "Current User",
      timestamp: new Date(),
    }

    setCommentThreads((prev) =>
      prev.map((thread) => (thread.id === threadId ? { ...thread, replies: [...thread.replies, newReply] } : thread)),
    )
  }

  const handleResolveThread = (threadId: string) => {
    setCommentThreads((prev) =>
      prev.map((thread) => (thread.id === threadId ? { ...thread, resolved: !thread.resolved } : thread)),
    )
  }

  const handleDeleteThread = (threadId: string, replyId?: string) => {
    if (replyId) {
      // Delete specific reply
      setCommentThreads((prev) =>
        prev
          .map((thread) =>
            thread.id === threadId
              ? { ...thread, replies: thread.replies.filter((reply) => reply.id !== replyId) }
              : thread,
          )
          .filter((thread) => thread.replies.length > 0),
      ) // Remove thread if no replies left
    } else {
      // Delete entire thread
      setCommentThreads((prev) => prev.filter((thread) => thread.id !== threadId))
    }
    setShowCommentDialog(false)
  }

  const handleEditReply = (threadId: string, replyId: string, newText: string) => {
    setCommentThreads((prev) =>
      prev.map((thread) =>
        thread.id === threadId
          ? {
              ...thread,
              replies: thread.replies.map((reply) =>
                reply.id === replyId ? { ...reply, text: newText, edited: true } : reply,
              ),
            }
          : thread,
      ),
    )
  }

  const handleCancelComment = () => {
    setShowCommentDialog(false)
    setPendingCommentPosition(null)
    setSelectedElements([])
    setSelectionStart(null)
    setSelectionEnd(null)
    setActiveThread(undefined)
    setIsCreatingComment(false)
  }

  const handleSaveTextAnnotation = (text: string, formatting: any) => {
    if (!activeTextAnnotation) return

    const newAnnotation = {
      id: activeTextAnnotation.id,
      type: "text",
      x: activeTextAnnotation.x,
      y: activeTextAnnotation.y,
      width: activeTextAnnotation.width,
      height: activeTextAnnotation.height,
      text,
      formatting,
      color: "#000000",
    }

    const existingIndex = annotations.findIndex((ann) => ann.id === activeTextAnnotation.id)
    if (existingIndex >= 0) {
      // Update existing annotation
      const updatedAnnotations = [...annotations]
      updatedAnnotations[existingIndex] = newAnnotation
      onAnnotationsChange(updatedAnnotations)
    } else {
      // Add new annotation
      onAnnotationsChange([...annotations, newAnnotation])
    }

    setActiveTextAnnotation(null)
    setEditingTextAnnotation(null)
  }

  const handleCancelTextAnnotation = () => {
    setActiveTextAnnotation(null)
    setEditingTextAnnotation(null)
  }

  const handleMoveTextAnnotation = (x: number, y: number) => {
    if (!activeTextAnnotation) return
    setActiveTextAnnotation((prev) => (prev ? { ...prev, x, y } : null))
  }

  const handleResizeTextAnnotation = (width: number, height: number) => {
    if (!activeTextAnnotation) return
    setActiveTextAnnotation((prev) => (prev ? { ...prev, width, height } : null))
  }

  const getCursorStyle = () => {
    if (isPanning) return "cursor-grabbing"
    if (isShiftPressed) return "cursor-grab"
    if (draggedThread || draggedAnnotation) return "cursor-grabbing"
    if (resizingAnnotation) {
      const handle = resizingAnnotation.handle
      if (handle === "nw" || handle === "se") return "cursor-nw-resize"
      if (handle === "ne" || handle === "sw") return "cursor-ne-resize"
    }

    switch (activeAnnotationTool) {
      case "comment":
        if (isSelecting && isDraggingSelection) return "cursor-crosshair"
        return "cursor-pointer"
      case "cursor":
        return hoveredThread ? "cursor-pointer" : "cursor-default"
      default:
        return "cursor-crosshair"
    }
  }

  const getThreadDisplayNumber = (threadId: string) => {
    const index = commentThreads.findIndex((thread) => thread.id === threadId)
    return index + 1
  }

  return (
    <div ref={containerRef} className="flex-1 bg-background p-4 overflow-hidden relative">
      <div className="bg-card rounded-lg shadow-sm p-4 border border-border h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-foreground">{document}</h2>
            {/* Removed upload button */}
            <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileUpload} className="hidden" />
          </div>
        </div>

        <div className="flex-1 border border-border rounded overflow-hidden relative">
          {isLoadingPdf ? (
            <div className="flex items-center justify-center h-full bg-muted/20">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading PDF...</p>
              </div>
            </div>
          ) : pdfError ? (
            <div className="flex items-center justify-center h-full bg-muted/20">
              <div className="text-center">
                <p className="text-destructive mb-2">{pdfError}</p>
                <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" />
                  Try Another PDF
                </Button>
              </div>
            </div>
          ) : (
            <div className="relative h-full overflow-hidden">
              {/* PDF Document */}
              <div
                className="absolute inset-0"
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  transformOrigin: "0 0",
                }}
              >
                <Document
                  file={pdfFile}
                  onLoadSuccess={onDocumentLoadSuccess}
                  onLoadError={onDocumentLoadError}
                >
                  <Page
                    pageNumber={currentPage}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                    className="shadow-lg"
                  />
                </Document>
              </div>

              {/* Interactive Overlay */}
              <div
                ref={overlayRef}
                className={`absolute inset-0 ${getCursorStyle()}`}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onWheel={handleWheel}
                style={{ zIndex: 10 }}
              >
                {/* Selection Box */}
                {isSelecting && selectionStart && selectionEnd && isDraggingSelection && (
                  <div
                    className="absolute border border-primary border-dashed bg-primary/10"
                    style={{
                      left: Math.min(selectionStart.x, selectionEnd.x) * zoom + pan.x,
                      top: Math.min(selectionStart.y, selectionEnd.y) * zoom + pan.y,
                      width: Math.abs(selectionEnd.x - selectionStart.x) * zoom,
                      height: Math.abs(selectionEnd.y - selectionStart.y) * zoom,
                    }}
                  />
                )}

                {/* Comment Thread Markers */}
                {commentThreads.map((thread) => (
                  <div
                    key={thread.id}
                    className={`absolute w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold cursor-pointer hover:scale-110 transition-all shadow-lg ${
                      selectedThreads.includes(thread.id)
                        ? "bg-destructive ring-2 ring-destructive ring-offset-2"
                        : thread.resolved
                          ? "bg-green-500"
                          : "bg-primary"
                    }`}
                    style={{
                      left: thread.x * zoom + pan.x - 16,
                      top: thread.y * zoom + pan.y - 16,
                    }}
                    onMouseEnter={() => setHoveredThread(thread.id)}
                    onMouseLeave={() => setHoveredThread(null)}
                  >
                    {thread.resolved ? <MessageCircle className="h-4 w-4" /> : getThreadDisplayNumber(thread.id)}
                  </div>
                ))}

                {/* Current annotation being drawn */}
                {currentAnnotation && (
                  <div
                    className="absolute border-2 border-dashed pointer-events-none"
                    style={{
                      left:
                        currentAnnotation.type === "circle"
                          ? (currentAnnotation.x - currentAnnotation.radius) * zoom + pan.x
                          : currentAnnotation.x * zoom + pan.x,
                      top:
                        currentAnnotation.type === "circle"
                          ? (currentAnnotation.y - currentAnnotation.radius) * zoom + pan.y
                          : currentAnnotation.y * zoom + pan.y,
                      width:
                        currentAnnotation.type === "circle"
                          ? Math.abs(currentAnnotation.radius * 2 * zoom)
                          : Math.abs(currentAnnotation.width * zoom),
                      height:
                        currentAnnotation.type === "circle"
                          ? Math.abs(currentAnnotation.radius * 2 * zoom)
                          : Math.abs(currentAnnotation.height * zoom),
                      borderColor: currentAnnotation.type === "highlight" ? "#ffff00" : "#ff0000",
                      backgroundColor:
                        currentAnnotation.type === "highlight" ? "rgba(255, 255, 0, 0.3)" : "transparent",
                      borderRadius: currentAnnotation.type === "circle" ? "50%" : "0",
                    }}
                  />
                )}

                {/* Annotations with selection indicators and resize handles */}
                {annotations.map((annotation, index) => (
                  <div key={annotation.id || index}>
                    {annotation.type === "text" && (
                      <div
                        className="absolute pointer-events-none border border-gray-300 bg-white/90 p-2 text-sm"
                        style={{
                          left: annotation.x * zoom + pan.x,
                          top: annotation.y * zoom + pan.y,
                          width: annotation.width * zoom,
                          height: annotation.height * zoom,
                          fontSize: `${(annotation.formatting?.fontSize || 14) * zoom}px`,
                          fontWeight: annotation.formatting?.bold ? "bold" : "normal",
                          fontStyle: annotation.formatting?.italic ? "italic" : "normal",
                          textDecoration:
                            [
                              annotation.formatting?.underline ? "underline" : "",
                              annotation.formatting?.strikethrough ? "line-through" : "",
                            ]
                              .filter(Boolean)
                              .join(" ") || "none",
                          color: annotation.formatting?.color || "#000000",
                          backgroundColor: annotation.formatting?.backgroundColor || "rgba(255, 255, 255, 0.9)",
                          overflow: "hidden",
                          wordWrap: "break-word",
                        }}
                      >
                        {annotation.text}
                      </div>
                    )}

                    {annotation.type === "comment" && (
                      <div
                        className="absolute pointer-events-auto cursor-pointer"
                        style={{
                          left: annotation.x * zoom + pan.x - 10,
                          top: annotation.y * zoom + pan.y - 10,
                          width: 20,
                          height: 20,
                        }}
                        onClick={(e) => {
                          e.stopPropagation()
                          setCommentPosition({ x: e.clientX, y: e.clientY })
                          setActiveThread({
                            id: annotation.id,
                            x: e.clientX,
                            y: e.clientY,
                            resolved: false,
                            comments: [],
                            replies: [],
                          })
                          setShowCommentDialog(true)
                        }}
                      >
                        <MessageCircle
                          className="w-5 h-5 text-white bg-blue-500 rounded-full p-1"
                          style={{ backgroundColor: annotation.color || "#0078D4" }}
                        />
                      </div>
                    )}

                    {/* Annotation visual for shapes */}
                    {(annotation.type === "highlight" ||
                      annotation.type === "rectangle" ||
                      annotation.type === "circle") && (
                      <div
                        className="absolute pointer-events-none"
                        style={{
                          left:
                            annotation.type === "circle"
                              ? (annotation.x - annotation.radius) * zoom + pan.x
                              : annotation.x * zoom + pan.x,
                          top:
                            annotation.type === "circle"
                              ? (annotation.y - annotation.radius) * zoom + pan.y
                              : annotation.y * zoom + pan.y,
                          width:
                            annotation.type === "circle"
                              ? Math.abs(annotation.radius * 2 * zoom)
                              : Math.abs(annotation.width) * zoom,
                          height:
                            annotation.type === "circle"
                              ? Math.abs(annotation.radius * 2 * zoom)
                              : Math.abs(annotation.height) * zoom,
                          border:
                            annotation.type === "rectangle" ? `2px solid ${annotation.color || "#ff0000"}` : "none",
                          backgroundColor:
                            annotation.type === "highlight"
                              ? annotation.color || "rgba(255, 255, 0, 0.3)"
                              : annotation.type === "circle"
                                ? "transparent"
                                : "transparent",
                          borderRadius: annotation.type === "circle" ? "50%" : "0",
                          ...(annotation.type === "circle" && {
                            border: `2px solid ${annotation.color || "#ff0000"}`,
                          }),
                        }}
                      />
                    )}

                    {selectedAnnotations.includes(index) && activeAnnotationTool === "cursor" && (
                      <>
                        {annotation.type === "text" && (
                          // Text annotation selection with corner handles
                          <>
                            {["nw", "ne", "sw", "se"].map((handle) => {
                              const handleX = handle.includes("e") ? annotation.x + annotation.width : annotation.x
                              const handleY = handle.includes("s") ? annotation.y + annotation.height : annotation.y

                              return (
                                <div
                                  key={handle}
                                  className="absolute w-2 h-2 bg-primary border border-white rounded-full cursor-nw-resize pointer-events-auto"
                                  style={{
                                    left: handleX * zoom + pan.x - 4,
                                    top: handleY * zoom + pan.y - 4,
                                  }}
                                  onMouseDown={(e) => {
                                    e.stopPropagation()
                                    setResizingAnnotation({ index, handle })
                                  }}
                                />
                              )
                            })}
                            <div
                              className="absolute border-2 border-blue-500 border-dashed pointer-events-none"
                              style={{
                                left: annotation.x * zoom + pan.x - 2,
                                top: annotation.y * zoom + pan.y - 2,
                                width: annotation.width * zoom + 4,
                                height: annotation.height * zoom + 4,
                              }}
                            />
                          </>
                        )}

                        {annotation.type === "comment" && (
                          // Comment annotation selection indicator
                          <div
                            className="absolute border-2 border-blue-500 border-dashed rounded-full pointer-events-none"
                            style={{
                              left: annotation.x * zoom + pan.x - 12,
                              top: annotation.y * zoom + pan.y - 12,
                              width: 24,
                              height: 24,
                            }}
                          />
                        )}

                        {annotation.type === "circle" ? (
                          <>
                            {["top", "right", "bottom", "left"].map((handle) => {
                              const centerX = annotation.x
                              const centerY = annotation.y
                              const radius = annotation.radius

                              let handleX, handleY
                              switch (handle) {
                                case "top":
                                  handleX = centerX
                                  handleY = centerY - radius
                                  break
                                case "right":
                                  handleX = centerX + radius
                                  handleY = centerY
                                  break
                                case "bottom":
                                  handleX = centerX
                                  handleY = centerY + radius
                                  break
                                case "left":
                                  handleX = centerX - radius
                                  handleY = centerY
                                  break
                                default:
                                  handleX = centerX
                                  handleY = centerY
                              }

                              return (
                                <div
                                  key={handle}
                                  className="absolute w-2 h-2 bg-blue-500 border border-white rounded-full cursor-pointer"
                                  style={{
                                    left: handleX * zoom + pan.x - 4,
                                    top: handleY * zoom + pan.y - 4,
                                    transform: "translate(0, 0)", // Remove transform to fix positioning
                                  }}
                                  onMouseDown={(e) => {
                                    e.stopPropagation()
                                    setResizingAnnotation({ index, handle })
                                  }}
                                />
                              )
                            })}
                            <div
                              className="absolute border-2 border-blue-500 border-dashed rounded-full pointer-events-none"
                              style={{
                                left: (annotation.x - annotation.radius - 2 / zoom) * zoom + pan.x,
                                top: (annotation.y - annotation.radius - 2 / zoom) * zoom + pan.y,
                                width: (annotation.radius * 2 + 4 / zoom) * zoom,
                                height: (annotation.radius * 2 + 4 / zoom) * zoom,
                              }}
                            />
                          </>
                        ) : (
                          // Corner resize handles for rectangles
                          <>
                            {["nw", "ne", "sw", "se"].map((handle) => {
                              const bounds = getAnnotationBounds(annotation)
                              const handleX = handle.includes("e") ? bounds.x + bounds.width : bounds.x
                              const handleY = handle.includes("s") ? bounds.y + bounds.height : bounds.y

                              return (
                                <div
                                  key={handle}
                                  className="absolute w-2 h-2 bg-primary border border-white rounded-full cursor-nw-resize pointer-events-auto"
                                  style={{
                                    left: handleX * zoom + pan.x - 4,
                                    top: handleY * zoom + pan.y - 4,
                                  }}
                                />
                              )
                            })}
                          </>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-border">
          <div className="text-xs text-muted-foreground">
            {activeAnnotationTool === "comment"
              ? "Click element or drag to select • Shift+drag to pan"
              : activeAnnotationTool === "cursor"
                ? "Click to select • Drag to move • Corner handles to resize • Backspace to delete"
                : activeAnnotationTool === "text"
                  ? "Click to edit text • Shift+drag to pan"
                  : "Hold Shift to pan"}
          </div>

          {/* Zoom controls moved to right side */}
          <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={handleScreenshot}
            className="h-8 w-8 p-0 ml-1 bg-transparent"
            title="Capture Screenshot"
          >
              📸
            </Button>

            <Button variant="outline" size="sm" onClick={handleZoomOut} className="h-8 w-8 p-0 bg-transparent">
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground min-w-[60px] text-center">{Math.round(zoom * 100)}%</span>
            <Button variant="outline" size="sm" onClick={handleZoomIn} className="h-8 w-8 p-0 bg-transparent">
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleResetView} className="h-8 w-8 p-0 ml-1 bg-transparent">
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <FigmaCommentDialog
        isOpen={showCommentDialog}
        position={commentPosition}
        thread={activeThread}
        onSave={handleSaveComment}
        onReply={handleReplyToThread}
        onResolve={handleResolveThread}
        onDelete={handleDeleteThread}
        onEdit={handleEditReply}
        onCancel={handleCancelComment}
        containerBounds={containerBounds}
        isCreating={isCreatingComment}
      />

      {activeTextAnnotation && editingTextAnnotation && (
        <TextAnnotationEditor
          x={activeTextAnnotation.x}
          y={activeTextAnnotation.y}
          width={activeTextAnnotation.width}
          height={activeTextAnnotation.height}
          zoom={zoom}
          pan={pan}
          onSave={handleSaveTextAnnotation}
          onCancel={handleCancelTextAnnotation}
          onMove={handleMoveTextAnnotation}
          onResize={handleResizeTextAnnotation}
          initialText={activeTextAnnotation.text}
          initialFormatting={activeTextAnnotation.formatting}
        />
      )}
    </div>
  );
});

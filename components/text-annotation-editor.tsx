"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "./ui/button"
import { Bold, Italic, Underline, Strikethrough, Code, Type, MoreHorizontal, Move, X } from "lucide-react"

interface TextAnnotationEditorProps {
  x: number
  y: number
  width: number
  height: number
  zoom: number
  pan: { x: number; y: number }
  onSave: (text: string, formatting: any) => void
  onCancel: () => void
  onResize: (width: number, height: number) => void
  onMove: (x: number, y: number) => void
  initialText?: string
  initialFormatting?: any
}

export function TextAnnotationEditor({
  x,
  y,
  width,
  height,
  zoom,
  pan,
  onSave,
  onCancel,
  onResize,
  onMove,
  initialText = "",
  initialFormatting = {},
}: TextAnnotationEditorProps) {
  const [text, setText] = useState(initialText)
  const [formatting, setFormatting] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    code: false,
    fontSize: 14,
    color: "#ffffff",
    backgroundColor: "#2D2D2D",
    ...initialFormatting,
  })
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showBackgroundPicker, setShowBackgroundPicker] = useState(false)
  const [showMoreOptions, setShowMoreOptions] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [resizeStart, setResizeStart] = useState({ width: 0, height: 0 })
  const [isHovered, setIsHovered] = useState(false)
  const [hasSelection, setHasSelection] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const textColorOptions = [
    "#ffffff",
    "#000000",
    "#ff4757",
    "#2ed573",
    "#3742fa",
    "#ffa502",
    "#ff6b81",
    "#70a1ff",
    "#5352ed",
    "#ff3838",
    "#2f3462",
    "#57606f",
  ]

  const backgroundColorOptions = [
    "#2D2D2D",
    "#1a1a1a",
    "#0f3460",
    "#2d3436",
    "#6c5ce7",
    "#a29bfe",
    "#fd79a8",
    "#fdcb6e",
    "#e17055",
    "#00b894",
    "#00cec9",
    "#74b9ff",
  ]

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [])

  const handleTextSelect = () => {
    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart
      const end = textareaRef.current.selectionEnd
      setHasSelection(start !== end)
    }
  }

  const handleFormatToggle = (format: string) => {
    setFormatting((prev) => ({
      ...prev,
      [format]: !prev[format],
    }))
  }

  const handleFontSizeChange = (delta: number) => {
    setFormatting((prev) => ({
      ...prev,
      fontSize: Math.max(8, Math.min(72, prev.fontSize + delta)),
    }))
  }

  const handleColorChange = (color: string, type: "text" | "background") => {
    setFormatting((prev) => ({
      ...prev,
      [type === "text" ? "color" : "backgroundColor"]: color,
    }))
    setShowColorPicker(false)
    setShowBackgroundPicker(false)
  }

  const handleMouseDown = (e: React.MouseEvent, action: "drag" | "resize") => {
    e.preventDefault()
    e.stopPropagation()

    if (action === "drag") {
      setIsDragging(true)
      setDragStart({ x: e.clientX, y: e.clientY })
    } else if (action === "resize") {
      setIsResizing(true)
      setResizeStart({ width, height })
      setDragStart({ x: e.clientX, y: e.clientY })
    }
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      const deltaX = (e.clientX - dragStart.x) / zoom
      const deltaY = (e.clientY - dragStart.y) / zoom
      onMove(x + deltaX, y + deltaY)
      setDragStart({ x: e.clientX, y: e.clientY })
    } else if (isResizing) {
      const deltaX = (e.clientX - dragStart.x) / zoom
      const deltaY = (e.clientY - dragStart.y) / zoom
      const newWidth = Math.max(250, resizeStart.width + deltaX)
      const newHeight = Math.max(120, resizeStart.height + deltaY)
      onResize(newWidth, newHeight)
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    setIsResizing(false)
  }

  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
      return () => {
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("mouseup", handleMouseUp)
      }
    }
  }, [isDragging, isResizing, dragStart, resizeStart])

  const handleSave = () => {
    if (text.trim()) {
      onSave(text, formatting)
    } else {
      onCancel()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onCancel()
    } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      handleSave()
    } else if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case "b":
          e.preventDefault()
          handleFormatToggle("bold")
          break
        case "i":
          e.preventDefault()
          handleFormatToggle("italic")
          break
        case "u":
          e.preventDefault()
          handleFormatToggle("underline")
          break
      }
    }
  }

  const getTextStyle = () => ({
    fontWeight: formatting.bold ? "bold" : "normal",
    fontStyle: formatting.italic ? "italic" : "normal",
    textDecoration:
      [formatting.underline ? "underline" : "", formatting.strikethrough ? "line-through" : ""]
        .filter(Boolean)
        .join(" ") || "none",
    fontFamily: formatting.code ? "monospace" : "inherit",
    fontSize: `${formatting.fontSize}px`,
    color: formatting.color,
  })

  const renderToolbar = () => (
    <div
      className={`flex items-center gap-1 p-2 bg-[#1a1a1a] border border-[#404040] rounded-lg shadow-lg transition-all duration-200 ${isHovered || hasSelection ? "opacity-100" : "opacity-90"}`}
    >
      {/* Primary formatting tools */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className={`h-8 w-8 p-0 transition-all ${formatting.bold ? "bg-[#0078D4] text-white" : "text-gray-300 hover:bg-[#404040] hover:text-white"}`}
          onClick={() => handleFormatToggle("bold")}
          title="Bold (Ctrl+B)"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={`h-8 w-8 p-0 transition-all ${formatting.italic ? "bg-[#0078D4] text-white" : "text-gray-300 hover:bg-[#404040] hover:text-white"}`}
          onClick={() => handleFormatToggle("italic")}
          title="Italic (Ctrl+I)"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={`h-8 w-8 p-0 transition-all ${formatting.underline ? "bg-[#0078D4] text-white" : "text-gray-300 hover:bg-[#404040] hover:text-white"}`}
          onClick={() => handleFormatToggle("underline")}
          title="Underline (Ctrl+U)"
        >
          <Underline className="h-4 w-4" />
        </Button>
      </div>

      <div className="w-px h-6 bg-[#404040] mx-2"></div>

      {/* Text color */}
      <div className="relative">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-gray-300 hover:bg-[#404040] hover:text-white relative transition-all"
          onClick={() => setShowColorPicker(!showColorPicker)}
          title="Text Color"
        >
          <Type className="h-4 w-4" />
          <div
            className="absolute bottom-1 right-1 w-2 h-2 rounded-full border border-gray-400"
            style={{ backgroundColor: formatting.color }}
          ></div>
        </Button>

        {showColorPicker && (
          <div className="absolute top-10 left-0 bg-[#1a1a1a] border border-[#404040] rounded-lg p-3 shadow-xl z-20 animate-in fade-in-0 zoom-in-95 min-w-[200px]">
            <div className="text-xs text-gray-400 mb-2">Text Color</div>
            <div className="grid grid-cols-6 gap-2">
              {textColorOptions.map((color) => (
                <button
                  key={color}
                  className="w-6 h-6 rounded border border-gray-500 hover:scale-110 transition-transform hover:border-white"
                  style={{ backgroundColor: color }}
                  onClick={() => handleColorChange(color, "text")}
                  title={color}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* More options */}
      <div className="relative">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-gray-300 hover:bg-[#404040] transition-all"
          onClick={() => setShowMoreOptions(!showMoreOptions)}
          title="More Options"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>

        {showMoreOptions && (
          <div className="absolute top-10 right-0 bg-[#1a1a1a] border border-[#404040] rounded-lg p-2 shadow-xl z-20 animate-in fade-in-0 zoom-in-95 min-w-[200px]">
            <div className="flex items-center gap-2 p-2">
              <Button
                variant="ghost"
                size="sm"
                className={`h-8 w-8 p-0 ${formatting.strikethrough ? "bg-[#0078D4] text-white" : "text-gray-300 hover:bg-[#404040]"}`}
                onClick={() => handleFormatToggle("strikethrough")}
              >
                <Strikethrough className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={`h-8 w-8 p-0 ${formatting.code ? "bg-[#0078D4] text-white" : "text-gray-300 hover:bg-[#404040]"}`}
                onClick={() => handleFormatToggle("code")}
              >
                <Code className="h-4 w-4" />
              </Button>
            </div>

            <div className="border-t border-[#404040] my-2"></div>

            <div className="p-2">
              <div className="text-xs text-gray-400 mb-2">Font Size</div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-gray-300 hover:bg-[#404040]"
                  onClick={() => handleFontSizeChange(-2)}
                >
                  -
                </Button>
                <span className="text-sm text-white min-w-[30px] text-center">{formatting.fontSize}px</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-gray-300 hover:bg-[#404040]"
                  onClick={() => handleFontSizeChange(2)}
                >
                  +
                </Button>
              </div>
            </div>

            <div className="border-t border-[#404040] my-2"></div>

            <div className="p-2">
              <div className="text-xs text-gray-400 mb-2">Background</div>
              <div className="grid grid-cols-6 gap-1">
                {backgroundColorOptions.map((color) => (
                  <button
                    key={color}
                    className="w-5 h-5 rounded border border-gray-500 hover:scale-110 transition-transform hover:border-white"
                    style={{ backgroundColor: color }}
                    onClick={() => handleColorChange(color, "background")}
                    title={color}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div
      ref={containerRef}
      className="absolute rounded-lg shadow-xl z-50 transition-all duration-200"
      style={{
        left: x * zoom + pan.x,
        top: y * zoom + pan.y,
        width: width * zoom,
        height: height * zoom,
        minWidth: "250px",
        minHeight: "120px",
        backgroundColor: formatting.backgroundColor,
        border: `2px solid ${isHovered ? "#0078D4" : "#404040"}`,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onKeyDown={handleKeyDown}
    >
      <div className="flex items-center justify-between p-2 border-b border-[#404040]">
        <div
          className="flex items-center gap-2 cursor-move flex-1 py-1"
          onMouseDown={(e) => handleMouseDown(e, "drag")}
        >
          <Move className="w-4 h-4 text-gray-400" />
          <span className="text-xs text-gray-400">Text Annotation</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-gray-400 hover:text-white hover:bg-[#404040]"
          onClick={onCancel}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>

      {(isHovered || hasSelection) && <div className="absolute -top-12 left-0 z-10">{renderToolbar()}</div>}

      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onSelect={handleTextSelect}
        onMouseUp={handleTextSelect}
        onKeyUp={handleTextSelect}
        placeholder="Start typing your annotation..."
        className="w-full flex-1 p-4 border-none outline-none resize-none bg-transparent placeholder-gray-500 transition-all"
        style={{
          ...getTextStyle(),
          height: `${height * zoom - 100}px`,
          lineHeight: "1.5",
        }}
      />

      <div className="flex justify-end gap-2 p-3 border-t border-[#404040]">
        <Button
          variant="ghost"
          size="sm"
          className="text-gray-400 hover:text-white hover:bg-[#404040] transition-all"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button size="sm" className="bg-[#0078D4] hover:bg-[#0078D4]/90 text-white transition-all" onClick={handleSave}>
          Save
        </Button>
      </div>

      <div
        className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize group"
        onMouseDown={(e) => handleMouseDown(e, "resize")}
      >
        <div className="absolute bottom-1 right-1 w-3 h-3 border-r-2 border-b-2 border-gray-400 group-hover:border-white transition-colors"></div>
      </div>
    </div>
  )
}

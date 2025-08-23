"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { X } from "lucide-react"

interface CommentDialogProps {
  isOpen: boolean
  position: { x: number; y: number }
  onSave: (comment: string) => void
  onCancel: () => void
  initialComment?: string
  containerBounds?: DOMRect
}

export function CommentDialog({
  isOpen,
  position,
  onSave,
  onCancel,
  initialComment = "",
  containerBounds,
}: CommentDialogProps) {
  const [comment, setComment] = useState(initialComment)
  const dialogRef = useRef<HTMLDivElement>(null)
  const [adjustedPosition, setAdjustedPosition] = useState(position)

  useEffect(() => {
    if (isOpen && dialogRef.current && containerBounds) {
      const dialogRect = dialogRef.current.getBoundingClientRect()
      const dialogWidth = 320 // min-w-[300px] + padding
      const dialogHeight = 200 // estimated height

      let adjustedX = position.x
      let adjustedY = position.y

      // Check right boundary
      if (position.x + dialogWidth > containerBounds.right) {
        adjustedX = containerBounds.right - dialogWidth - 10
      }

      // Check left boundary
      if (adjustedX < containerBounds.left) {
        adjustedX = containerBounds.left + 10
      }

      // Check bottom boundary
      if (position.y + dialogHeight > containerBounds.bottom) {
        adjustedY = containerBounds.bottom - dialogHeight - 10
      }

      // Check top boundary
      if (adjustedY < containerBounds.top) {
        adjustedY = containerBounds.top + 10
      }

      setAdjustedPosition({ x: adjustedX, y: adjustedY })
    }
  }, [isOpen, position, containerBounds])

  if (!isOpen) return null

  const handleSave = () => {
    if (comment.trim()) {
      onSave(comment.trim())
      setComment("")
    }
  }

  const handleCancel = () => {
    onCancel()
    setComment("")
  }

  return (
    <div
      ref={dialogRef}
      className="fixed z-50 bg-card border border-border rounded-lg shadow-lg p-4 min-w-[300px]"
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y,
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">Add Comment</h3>
        <Button variant="ghost" size="sm" onClick={handleCancel} className="h-6 w-6 p-0 hover:bg-muted">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <Textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Enter your comment..."
        className="mb-3 min-h-[80px] resize-none"
        autoFocus
      />

      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={handleCancel}>
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={!comment.trim()}
          className="bg-[#0078D4] hover:bg-[#106ebe] text-white"
        >
          Save
        </Button>
      </div>
    </div>
  )
}

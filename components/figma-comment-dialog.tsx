"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "./ui/button"
import { Textarea } from "./ui/textarea"
import { X, Send, Check, Edit2, Trash2, Reply } from "lucide-react"
import { Avatar, AvatarFallback } from "./ui/avatar"

export interface CommentThread {
  id: string
  x: number
  y: number
  timestamp: Date
  associatedElements: string[]
  resolved: boolean
  replies: CommentReply[]
}

export interface CommentReply {
  id: string
  text: string
  author: string
  timestamp: Date
  edited?: boolean
}

interface FigmaCommentDialogProps {
  isOpen: boolean
  position: { x: number; y: number }
  thread?: CommentThread
  onSave: (text: string, threadId?: string) => void
  onReply: (threadId: string, text: string) => void
  onResolve: (threadId: string) => void
  onDelete: (threadId: string, replyId?: string) => void
  onEdit: (threadId: string, replyId: string, newText: string) => void
  onCancel: () => void
  containerBounds?: DOMRect
  isCreating?: boolean
}

export function FigmaCommentDialog({
  isOpen,
  position,
  thread,
  onSave,
  onReply,
  onResolve,
  onDelete,
  onEdit,
  onCancel,
  containerBounds,
  isCreating = false,
}: FigmaCommentDialogProps) {
  const [text, setText] = useState("")
  const [replyText, setReplyText] = useState("")
  const [showReplyInput, setShowReplyInput] = useState(false)
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null)
  const [editText, setEditText] = useState("")
  const [optimisticReplies, setOptimisticReplies] = useState<CommentReply[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const replyTextareaRef = useRef<HTMLTextAreaElement>(null)
  const editTextareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isOpen && isCreating) {
      setTimeout(() => textareaRef.current?.focus(), 100)
    }
  }, [isOpen, isCreating])

  useEffect(() => {
    if (showReplyInput) {
      setTimeout(() => replyTextareaRef.current?.focus(), 100)
    }
  }, [showReplyInput])

  useEffect(() => {
    if (editingReplyId) {
      setTimeout(() => editTextareaRef.current?.focus(), 100)
    }
  }, [editingReplyId])

  useEffect(() => {
    if (!isOpen || !thread) {
      setOptimisticReplies([])
    }
  }, [isOpen, thread]) // Updated to use thread instead of thread?.id

  if (!isOpen) return null

  const handleSave = () => {
    if (text.trim()) {
      onSave(text.trim(), thread?.id)
      setText("")
    }
  }

  const handleReply = () => {
    if (replyText.trim() && thread) {
      const optimisticReply: CommentReply = {
        id: `temp-${Date.now()}`,
        text: replyText.trim(),
        author: "CN",
        timestamp: new Date(),
        edited: false,
      }

      setOptimisticReplies((prev) => [...prev, optimisticReply])
      onReply(thread.id, replyText.trim())
      setReplyText("")
      setShowReplyInput(false)
    }
  }

  const handleEdit = (replyId: string) => {
    if (editText.trim() && thread) {
      onEdit(thread.id, replyId, editText.trim())
      setEditingReplyId(null)
      setEditText("")
    }
  }

  const startEdit = (reply: CommentReply) => {
    setEditingReplyId(reply.id)
    setEditText(reply.text)
  }

  const cancelEdit = () => {
    setEditingReplyId(null)
    setEditText("")
  }

  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      action()
    }
  }

  const getDialogPosition = () => {
    const dialogWidth = 320
    const dialogHeight = thread ? Math.min(500, 200 + thread.replies.length * 80) : 200

    let x = position.x
    let y = position.y

    if (containerBounds) {
      if (x + dialogWidth > containerBounds.right) {
        x = containerBounds.right - dialogWidth - 10
      }
      if (x < containerBounds.left) {
        x = containerBounds.left + 10
      }

      if (y + dialogHeight > containerBounds.bottom) {
        y = containerBounds.bottom - dialogHeight - 10
      }
      if (y < containerBounds.top) {
        y = containerBounds.top + 10
      }
    }

    return { x, y }
  }

  const allReplies = [...(thread?.replies || []), ...optimisticReplies]

  const dialogPosition = getDialogPosition()

  return (
    <div
      className="fixed bg-card border border-border rounded-lg shadow-lg p-4 z-50 max-w-sm"
      style={{
        left: dialogPosition.x,
        top: dialogPosition.y,
        width: "320px",
        maxHeight: "500px",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="text-sm font-medium text-foreground">{isCreating ? "Add Comment" : "Comment Thread"}</div>
          {thread && !thread.resolved && <div className="w-2 h-2 bg-primary rounded-full" />}
          {thread?.resolved && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Check className="h-3 w-3" />
              Resolved
            </div>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={onCancel} className="h-6 w-6 p-0">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-3 max-h-80 overflow-y-auto">
        {allReplies.map((reply) => (
          <div key={reply.id} className="space-y-2">
            <div className="flex items-start gap-2">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-xs">{reply.author.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-foreground">{reply.author}</span>
                  <span className="text-xs text-muted-foreground">{reply.timestamp.toLocaleDateString()}</span>
                  {reply.edited && <span className="text-xs text-muted-foreground">(edited)</span>}
                  {reply.id.startsWith("temp-") && (
                    <span className="text-xs text-muted-foreground opacity-60">(sending...)</span>
                  )}
                </div>
                {editingReplyId === reply.id ? (
                  <div className="space-y-2">
                    <Textarea
                      ref={editTextareaRef}
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, () => handleEdit(reply.id))}
                      className="min-h-[60px] text-sm resize-none"
                      placeholder="Edit your comment..."
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleEdit(reply.id)}
                        disabled={!editText.trim()}
                        className="h-7 px-2 text-xs"
                      >
                        Save
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={cancelEdit}
                        className="h-7 px-2 text-xs bg-transparent"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="group">
                    <p className="text-sm text-foreground whitespace-pre-wrap">{reply.text}</p>
                    {!reply.id.startsWith("temp-") && (
                      <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEdit(reply)}
                          className="h-6 px-1 text-xs text-muted-foreground hover:text-foreground"
                        >
                          <Edit2 className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => thread && onDelete(thread.id, reply.id)}
                          className="h-6 px-1 text-xs text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Delete
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {isCreating && (
          <div className="space-y-3">
            <Textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, handleSave)}
              placeholder="Add a comment..."
              className="min-h-[80px] resize-none"
            />
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={!text.trim()} size="sm">
                <Send className="h-4 w-4 mr-1" />
                Post
              </Button>
              <Button variant="outline" onClick={onCancel} size="sm">
                Cancel
              </Button>
            </div>
          </div>
        )}

        {showReplyInput && thread && (
          <div className="space-y-2 border-t border-border pt-3">
            <Textarea
              ref={replyTextareaRef}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, handleReply)}
              placeholder="Reply to this comment..."
              className="min-h-[60px] text-sm resize-none"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleReply} disabled={!replyText.trim()} className="h-7 px-2 text-xs">
                Reply
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowReplyInput(false)
                  setReplyText("")
                }}
                className="h-7 px-2 text-xs"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {thread && !isCreating && (
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowReplyInput(!showReplyInput)}
              className="h-7 px-2 text-xs"
            >
              <Reply className="h-3 w-3 mr-1" />
              Reply
            </Button>
            <Button variant="outline" size="sm" onClick={() => onResolve(thread.id)} className="h-7 px-2 text-xs">
              <Check className="h-3 w-3 mr-1" />
              {thread.resolved ? "Unresolve" : "Resolve"}
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(thread.id)}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Delete
          </Button>
        </div>
      )}
    </div>
  )
}

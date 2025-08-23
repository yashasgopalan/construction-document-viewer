"use client"

import { Button } from "@/components/ui/button"
import { MousePointer, Highlighter, Type, Circle, Square, MessageCircle, Share } from "lucide-react"

interface AnnotationToolbarProps {
  activeTool: string
  onToolChange: (tool: string) => void
  onShare?: () => void
}

export function AnnotationToolbar({ activeTool, onToolChange, onShare }: AnnotationToolbarProps) {
  const tools = [
    { id: "cursor", icon: MousePointer, label: "Select" },
    { id: "highlight", icon: Highlighter, label: "Highlight" },
    { id: "text", icon: Type, label: "Text" },
    { id: "circle", icon: Circle, label: "Circle" },
    { id: "rectangle", icon: Square, label: "Rectangle" },
    { id: "comment", icon: MessageCircle, label: "Comment" },
  ]

  return (
    <div className="h-16 bg-sidebar border-t border-sidebar-border flex items-center justify-between px-4">
      <div className="flex items-center gap-2">
        {tools.map((tool) => (
          <Button
            key={tool.id}
            variant={activeTool === tool.id ? "default" : "ghost"}
            size="sm"
            onClick={() => onToolChange(tool.id)}
            className={
              activeTool === tool.id
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "text-sidebar-foreground hover:bg-sidebar-accent"
            }
            title={tool.label}
          >
            <tool.icon className="w-4 h-4" />
          </Button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent bg-transparent"
          onClick={onShare}
        >
          <Share className="w-4 h-4 mr-2" />
          Share
        </Button>
      </div>
    </div>
  )
}

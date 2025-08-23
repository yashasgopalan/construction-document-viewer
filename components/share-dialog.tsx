"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Copy, Check, ExternalLink } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface ShareDialogProps {
  isOpen: boolean
  onClose: () => void
  shareUrl: string
}

export function ShareDialog({ isOpen, onClose, shareUrl }: ShareDialogProps) {
  const [copied, setCopied] = useState(false)

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy link:", err)
    }
  }

  const handleOpenLink = () => {
    window.open(shareUrl, "_blank")
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Document</DialogTitle>
          <DialogDescription>
            Share this annotated PDF with others. They'll be able to view the document and all annotations in read-only
            mode.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="share-link">Share Link</Label>
            <div className="flex items-center space-x-2">
              <Input id="share-link" value={shareUrl} readOnly className="flex-1" />
              <Button size="sm" onClick={handleCopyLink} className="shrink-0">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <div className="flex justify-between">
            <Button variant="outline" onClick={handleOpenLink} className="flex items-center gap-2 bg-transparent">
              <ExternalLink className="h-4 w-4" />
              Preview
            </Button>
            <Button onClick={onClose}>Done</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Home, Plus, ChevronDown, ChevronRight, FileText, AlertCircle } from "lucide-react"

interface DocumentSidebarProps {
  selectedDocument: string
  onDocumentSelect: (document: string) => void
}

export function DocumentSidebar({ selectedDocument, onDocumentSelect }: DocumentSidebarProps) {
  const [expandedFolders, setExpandedFolders] = useState(["cloud-house"])

  const toggleFolder = (folder: string) => {
    setExpandedFolders((prev) => (prev.includes(folder) ? prev.filter((f) => f !== folder) : [...prev, folder]))
  }

  const documents = [{ id: "L0-AW102", name: "L0-AW102", hasAlert: true }]

  //const documentItems = ["Screen Wall W3t", "Wall in mothers bedroom", "Window W1 added", "Window removed"]

  return (
    <div className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
      <div className="p-4 border-b border-sidebar-border">
        <Button variant="ghost" className="w-full justify-start mb-2 text-sidebar-foreground hover:bg-sidebar-accent">
          <Home className="w-4 h-4 mr-2" />
          Home
        </Button>

        <div className="mb-2">
          <Button
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={() => toggleFolder("cloud-house")}
          >
            {expandedFolders.includes("cloud-house") ? (
              <ChevronDown className="w-4 h-4 mr-2" />
            ) : (
              <ChevronRight className="w-4 h-4 mr-2" />
            )}
            Cloud House
          </Button>
        </div>

        <Button className="w-full justify-start bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" />
          Import Documents
        </Button>
      </div>

      <ScrollArea className="flex-1">
        {expandedFolders.includes("cloud-house") && (
          <div className="p-2">
            {documents.map((doc) => (
              <div key={doc.id} className="mb-2">
                <Button
                  variant={selectedDocument === doc.id ? "secondary" : "ghost"}
                  className={`w-full justify-start ${
                    selectedDocument === doc.id
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "text-sidebar-foreground hover:bg-sidebar-accent"
                  }`}
                  onClick={() => onDocumentSelect(doc.id)}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  {doc.name}
                  {doc.hasAlert && <AlertCircle className="w-4 h-4 ml-auto text-red-500" />}
                </Button>

                {selectedDocument === doc.id && (
                  <div className="ml-6 mt-1 space-y-1">
                    {documentItems.map((item, index) => (
                      <div
                        key={index}
                        className="text-sm text-muted-foreground py-1 px-2 hover:bg-sidebar-accent rounded cursor-pointer"
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:bg-sidebar-accent">
              <ChevronDown className="w-4 h-4 mr-2" />
              View all documents
            </Button>
          </div>
        )}
      </ScrollArea>
    </div>
  )
}

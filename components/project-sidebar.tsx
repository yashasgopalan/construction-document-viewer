"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { 
  Plus, 
  FileText, 
  Folder, 
  Upload, 
  MoreHorizontal, 
  Edit2, 
  Trash2, 
  FolderPlus, 
  ChevronRight, 
  Home,
  File,
  Image,
  Archive,
  FileSpreadsheet,
  FileCode,
  FolderOpen,
  Search,
  X
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { 
  listUserFiles, 
  uploadUserFile, 
  createUserFolder, 
  deleteUserFile,
  FileItem 
} from "@/lib/storage-utils"
import { supabase } from "@/lib/supabase-client"

interface ProjectSidebarProps {
  selectedFile?: string
  onFileSelect: (fileId: string) => void
  showOnlyPDFs?: boolean // New prop to filter for PDFs only
}

export function ProjectSidebar({ selectedFile, onFileSelect, showOnlyPDFs = false }: ProjectSidebarProps) {
  const [currentPath, setCurrentPath] = useState<string>("")
  const [files, setFiles] = useState<FileItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [editingFolder, setEditingFolder] = useState<string | null>(null)
  const [editingFile, setEditingFile] = useState<string | null>(null)
  const [newFolderName, setNewFolderName] = useState("")
  const [showNewFolderInput, setShowNewFolderInput] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [uploadProgress, setUploadProgress] = useState<{[key: string]: number}>({})
  const [isUploading, setIsUploading] = useState(false)
  const [renamingItem, setRenamingItem] = useState<FileItem | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const [showMoveDialog, setShowMoveDialog] = useState(false)
  const [movingItem, setMovingItem] = useState<FileItem | null>(null)
  const [availableFolders, setAvailableFolders] = useState<FileItem[]>([])
  const [selectedMoveDestination, setSelectedMoveDestination] = useState("")

  // Load files for current path
  const loadFiles = async (path: string = "") => {
    setIsLoading(true)
    setError(null)
    
    try {
      const fileItems = await listUserFiles(path, false)
      setFiles(fileItems)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load files')
      console.error('Error loading files:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Load files on mount and when path changes
  useEffect(() => {
    loadFiles(currentPath)
  }, [currentPath])

  // Handle file selection
  const handleFileSelect = (file: FileItem) => {
    if (file.isFolder) {
      // Navigate into folder
      const newPath = currentPath ? `${currentPath}/${file.name}` : file.name
      setCurrentPath(newPath)
    } else {
      // Select file for viewing
      onFileSelect(file.path)
    }
  }

  // Navigate back to parent folder
  const navigateBack = () => {
    if (currentPath) {
      const pathParts = currentPath.split('/')
      pathParts.pop()
      const newPath = pathParts.join('/')
      setCurrentPath(newPath)
    }
  }

  // Create new folder
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return

    setIsLoading(true)
    setError(null)

    try {
      const result = await createUserFolder(newFolderName.trim(), currentPath)
      if (result.success) {
        setNewFolderName("")
        setShowNewFolderInput(false)
        await loadFiles(currentPath) // Refresh the file list
      } else {
        setError(result.error || 'Failed to create folder')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create folder')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle file upload with progress tracking
  const handleImportFiles = () => {
    const input = document.createElement("input")
    input.type = "file"
    input.multiple = true
    input.accept = showOnlyPDFs ? ".pdf" : ".pdf,.dwg,.docx,.doc,.txt,.jpg,.png,.jpeg,.gif,.webp,.zip,.rar,.7z,.xlsx,.xls,.csv"

    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files
      if (files) {
        setIsUploading(true)
        setError(null)
        setUploadProgress({})
        
        try {
          const fileArray = Array.from(files)
          let completedUploads = 0
          
          for (const file of fileArray) {
            setUploadProgress(prev => ({ ...prev, [file.name]: 0 }))
            
            const result = await uploadUserFile(file.name, file, currentPath, false)
            
            if (result.error) {
              console.error(`Failed to upload ${file.name}:`, result.error)
              setError(`Failed to upload ${file.name}: ${result.error}`)
            } else {
              setUploadProgress(prev => ({ ...prev, [file.name]: 100 }))
            }
            
            completedUploads++
          }
          
          // Clear progress after a short delay
          setTimeout(() => {
            setUploadProgress({})
            loadFiles(currentPath) // Refresh the file list
          }, 1000)
          
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to upload files')
        } finally {
          setIsUploading(false)
        }
      }
    }

    input.click()
  }

  // Delete file or folder
  const handleDelete = async (item: FileItem) => {
    console.log('Deleting item:', item.name)
    try {
      const result = await deleteUserFile(item.path)
      if (result.success) {
        loadFiles(currentPath) // Refresh the file list
      } else {
        setError(result.error || 'Failed to delete item')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete item')
    }
  }

  // Start renaming an item
  const startRename = (item: FileItem) => {
    console.log('Starting rename for:', item.name)
    setRenamingItem(item)
    setRenameValue(item.name)
  }

  // Cancel rename
  const cancelRename = () => {
    setRenamingItem(null)
    setRenameValue("")
  }

  // Confirm rename
  const confirmRename = async () => {
    if (!renamingItem || !renameValue.trim()) return

    try {
      // For now, we'll use delete + upload approach since Supabase doesn't have direct rename
      // This is a simplified approach - in production you might want to implement proper rename
      setError("Rename functionality requires file re-upload. Please delete and re-upload the file.")
      cancelRename()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rename item')
    }
  }

  // Start move process
  const startMove = async (item: FileItem) => {
    console.log('Starting move for:', item.name)
    if (item.isFolder) return // Only files can be moved
    
    setMovingItem(item)
    setShowMoveDialog(true)
    
    // Load available folders (projects)
    try {
      const folders = await listUserFiles("", false)
      setAvailableFolders(folders.filter(f => f.isFolder))
    } catch (err) {
      setError("Failed to load available projects")
    }
  }

  // Confirm move
  const confirmMove = async () => {
    if (!movingItem || !selectedMoveDestination) return

    try {
      // For now, we'll show an error since move requires complex file operations
      setError("Move functionality requires file re-upload. Please download and re-upload to the new location.")
      setShowMoveDialog(false)
      setMovingItem(null)
      setSelectedMoveDestination("")
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to move item')
    }
  }

  // Cancel move
  const cancelMove = () => {
    setShowMoveDialog(false)
    setMovingItem(null)
    setSelectedMoveDestination("")
  }

  // Format file size
  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return ''
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  // Get file icon based on extension
  const getFileIcon = (fileName: string, isFolder: boolean) => {
    if (isFolder) return <Folder className="w-4 h-4 mr-2 text-blue-500" />
    
    const extension = fileName.split('.').pop()?.toLowerCase()
    switch (extension) {
      case 'pdf':
        return <FileText className="w-4 h-4 mr-2 text-red-500" />
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp':
        return <Image className="w-4 h-4 mr-2 text-green-500" />
      case 'zip':
      case 'rar':
      case '7z':
        return <Archive className="w-4 h-4 mr-2 text-purple-500" />
      case 'xlsx':
      case 'xls':
      case 'csv':
        return <FileSpreadsheet className="w-4 h-4 mr-2 text-green-600" />
      case 'js':
      case 'ts':
      case 'jsx':
      case 'tsx':
      case 'html':
      case 'css':
        return <FileCode className="w-4 h-4 mr-2 text-blue-600" />
      default:
        return <File className="w-4 h-4 mr-2 text-gray-500" />
    }
  }

  // Get breadcrumb path
  const getBreadcrumbPath = () => {
    if (!currentPath) return []
    return currentPath.split('/').filter(Boolean)
  }

  // Navigate to specific breadcrumb level
  const navigateToBreadcrumb = (index: number) => {
    const pathParts = getBreadcrumbPath()
    const newPath = pathParts.slice(0, index + 1).join('/')
    setCurrentPath(newPath)
  }

  // Filter files based on search query and PDF filter
  const filteredFiles = files.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase())
    const isPDF = !item.isFolder && item.name.toLowerCase().endsWith('.pdf')
    const isFolder = item.isFolder
    
    if (showOnlyPDFs) {
      return matchesSearch && (isPDF || isFolder) // Include folders and PDFs only
    }
    return matchesSearch
  })

  // Sort files: folders first, then files, both alphabetically
  const sortedFiles = [...filteredFiles].sort((a, b) => {
    if (a.isFolder && !b.isFolder) return -1
    if (!a.isFolder && b.isFolder) return 1
    return a.name.localeCompare(b.name)
  })

  return (
    <div className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Header Section */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="space-y-3">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-8 h-8 text-sm"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                onClick={() => setSearchQuery("")}
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>

          {/* Breadcrumb Navigation */}
          <div className="flex items-center gap-1 text-xs">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-muted-foreground hover:text-foreground"
              onClick={() => setCurrentPath("")}
            >
              <Home className="w-3 h-3 mr-1" />
              Home
            </Button>
            {getBreadcrumbPath().map((part, index) => (
              <div key={index} className="flex items-center gap-1">
                <ChevronRight className="w-3 h-3 text-muted-foreground" />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-muted-foreground hover:text-foreground"
                  onClick={() => navigateToBreadcrumb(index)}
                >
                  {part}
                </Button>
              </div>
            ))}
          </div>

          {/* New Folder Input */}
          {showNewFolderInput && (
            <div className="flex items-center gap-2">
              <Input
                placeholder="Project name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateFolder()
                  if (e.key === "Escape") {
                    setShowNewFolderInput(false)
                    setNewFolderName("")
                  }
                }}
                className="flex-1 h-8 text-sm"
                autoFocus
              />
              <Button size="sm" onClick={handleCreateFolder} disabled={!newFolderName.trim()} className="h-8 px-2">
                <Plus className="w-3 h-3" />
              </Button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowNewFolderInput(!showNewFolderInput)}
              className="flex-1 h-8 text-xs"
              disabled={isUploading}
            >
              <FolderPlus className="w-3 h-3 mr-1" />
              New Project
            </Button>
            <Button
              size="sm"
              onClick={handleImportFiles}
              disabled={isLoading || isUploading}
              className="flex-1 h-8 text-xs"
            >
              <Upload className="w-3 h-3 mr-1" />
              {isUploading ? 'Uploading...' : showOnlyPDFs ? 'Upload PDF' : 'Upload'}
            </Button>
          </div>

          {/* Upload Progress */}
          {Object.keys(uploadProgress).length > 0 && (
            <div className="space-y-1">
              {Object.entries(uploadProgress).map(([fileName, progress]) => (
                <div key={fileName} className="text-xs">
                  <div className="flex justify-between mb-1">
                    <span className="truncate text-muted-foreground">{fileName}</span>
                    <span className="text-muted-foreground">{progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1">
                    <div 
                      className="bg-blue-600 h-1 rounded-full transition-all duration-300" 
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* File List Section */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-muted-foreground">Loading...</div>
            </div>
          ) : error ? (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md mx-2">
              <div className="font-medium mb-1">Error:</div>
              <div>{error}</div>
              <div className="mt-2 text-xs text-red-500">
                Make sure you're signed in and the storage bucket is set up correctly.
              </div>
            </div>
          ) : sortedFiles.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              {searchQuery ? (
                <>
                  <div>No files match "{searchQuery}"</div>
                  <div className="mt-2 text-xs">Try a different search term</div>
                </>
              ) : currentPath ? (
                <>
                  <div>No {showOnlyPDFs ? 'PDF documents' : 'files'} in this project</div>
                  <div className="mt-2 text-xs">Upload {showOnlyPDFs ? 'PDF files' : 'construction documents'} to get started</div>
                </>
              ) : (
                <>
                  <div>No {showOnlyPDFs ? 'PDF documents' : 'projects'} yet</div>
                  <div className="mt-2 text-xs">Create a new project to organize your {showOnlyPDFs ? 'PDF documents' : 'documents'}</div>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              {/* Folders Section */}
              {sortedFiles.filter(item => item.isFolder).length > 0 && (
                <div className="mb-3">
                  <div className="text-xs font-medium text-muted-foreground mb-2 px-2">
                    Projects ({sortedFiles.filter(item => item.isFolder).length})
                  </div>
                  <div className="space-y-1">
                    {sortedFiles.filter(item => item.isFolder).map((item) => (
                      <div key={item.path} className="flex items-center group">
                        {renamingItem?.path === item.path ? (
                          <div className="flex items-center gap-2 flex-1">
                            <Input
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") confirmRename()
                                if (e.key === "Escape") cancelRename()
                              }}
                              className="flex-1 h-8 text-sm"
                              autoFocus
                            />
                            <Button size="sm" onClick={confirmRename} className="h-8 px-2">
                              <Plus className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={cancelRename} className="h-8 px-2">
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              className="flex-1 justify-start text-sm h-8 px-2 text-sidebar-foreground hover:bg-sidebar-accent"
                              onClick={() => handleFileSelect(item)}
                            >
                              <FolderOpen className="w-4 h-4 mr-2 text-blue-500" />
                              <div className="flex-1 text-left">
                                <div className="truncate font-medium">{item.name}</div>
                                <div className="text-xs text-muted-foreground">Project folder</div>
                              </div>
                            </Button>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="opacity-30 group-hover:opacity-100 h-7 w-7 p-0 hover:bg-sidebar-accent transition-opacity"
                                  onMouseDown={(e) => e.stopPropagation()}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    console.log('Dropdown trigger clicked for:', item.name)
                                  }}
                                >
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" onCloseAutoFocus={(e) => e.preventDefault()} className="z-50">
                                <DropdownMenuItem onClick={(e) => {
                                  e.stopPropagation()
                                  console.log('Rename clicked for:', item.name)
                                  startRename(item)
                                }}>
                                  <Edit2 className="w-4 h-4 mr-2" />
                                  Rename Project
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    console.log('Delete clicked for:', item.name)
                                    handleDelete(item)
                                  }}
                                  className="text-destructive"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete Project
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Files Section */}
              {sortedFiles.filter(item => !item.isFolder).length > 0 && (
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-2 px-2">
                    Documents ({sortedFiles.filter(item => !item.isFolder).length})
                  </div>
                  <div className="space-y-1">
                    {sortedFiles.filter(item => !item.isFolder).map((item) => (
                      <div key={item.path} className="flex items-center group">
                        {renamingItem?.path === item.path ? (
                          <div className="flex items-center gap-2 flex-1">
                            <Input
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") confirmRename()
                                if (e.key === "Escape") cancelRename()
                              }}
                              className="flex-1 h-8 text-sm"
                              autoFocus
                            />
                            <Button size="sm" onClick={confirmRename} className="h-8 px-2">
                              <Plus className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={cancelRename} className="h-8 px-2">
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <Button
                              variant={selectedFile === item.path ? "secondary" : "ghost"}
                              className={`flex-1 justify-start text-sm h-8 px-2 ${
                                selectedFile === item.path
                                  ? "bg-[#2D2D2D] text-white hover:bg-[#2D2D2D]/90"
                                  : "text-sidebar-foreground hover:bg-sidebar-accent"
                              }`}
                              onClick={() => handleFileSelect(item)}
                            >
                              {getFileIcon(item.name, false)}
                              <div className="flex-1 text-left">
                                <div className="truncate">{item.name}</div>
                                {item.size && (
                                  <div className="text-xs text-muted-foreground">
                                    {formatFileSize(item.size)}
                                  </div>
                                )}
                              </div>
                            </Button>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="opacity-30 group-hover:opacity-100 h-7 w-7 p-0 hover:bg-sidebar-accent transition-opacity"
                                  onMouseDown={(e) => e.stopPropagation()}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    console.log('Dropdown trigger clicked for:', item.name)
                                  }}
                                >
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" onCloseAutoFocus={(e) => e.preventDefault()} className="z-50">
                                <DropdownMenuItem onClick={(e) => {
                                  e.stopPropagation()
                                  console.log('Rename clicked for file:', item.name)
                                  startRename(item)
                                }}>
                                  <Edit2 className="w-4 h-4 mr-2" />
                                  Rename
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => {
                                  e.stopPropagation()
                                  console.log('Move clicked for file:', item.name)
                                  startMove(item)
                                }}>
                                  <Folder className="w-4 h-4 mr-2" />
                                  Move to Project
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    console.log('Delete clicked for file:', item.name)
                                    handleDelete(item)
                                  }}
                                  className="text-destructive"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Move Dialog */}
      {showMoveDialog && movingItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-96 max-w-[90vw] mx-4 p-6">
            <h3 className="text-lg font-semibold mb-4">Move File</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Move "{movingItem.name}" to a different project:
            </p>
            
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium mb-2 block">Select Project:</label>
                <select
                  value={selectedMoveDestination}
                  onChange={(e) => setSelectedMoveDestination(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="">Choose a project...</option>
                  <option value="">Root (No Project)</option>
                  {availableFolders.map((folder) => (
                    <option key={folder.path} value={folder.name}>
                      {folder.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={cancelMove}>
                Cancel
              </Button>
              <Button 
                onClick={confirmMove} 
                disabled={!selectedMoveDestination}
              >
                Move File
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

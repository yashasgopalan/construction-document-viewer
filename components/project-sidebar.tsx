"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Plus, FileText, Folder, Upload, MoreHorizontal, Edit2, Trash2 } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface Project {
  id: string
  name: string
  files: File[]
}

interface File {
  id: string
  name: string
  type: string
}

interface ProjectSidebarProps {
  selectedFile?: string
  onFileSelect: (fileId: string) => void
}

export function ProjectSidebar({ selectedFile, onFileSelect }: ProjectSidebarProps) {
  const [projects, setProjects] = useState<Project[]>([
    {
      id: "cloud-house",
      name: "Cloud House",
      files: [
        { id: "L0-AW102", name: "L0-AW102.pdf", type: "pdf" },
        { id: "floor-plan", name: "Floor Plan.dwg", type: "dwg" },
        { id: "specs", name: "Specifications.docx", type: "docx" },
      ],
    },
  ])

  const [activeProject, setActiveProject] = useState<string | null>(null)
  const [editingProject, setEditingProject] = useState<string | null>(null)
  const [editingFile, setEditingFile] = useState<string | null>(null)
  const [newProjectName, setNewProjectName] = useState("")

  const addProject = () => {
    if (newProjectName.trim()) {
      const newProject: Project = {
        id: Date.now().toString(),
        name: newProjectName.trim(),
        files: [],
      }
      setProjects((prev) => [...prev, newProject])
      setNewProjectName("")
      setActiveProject(newProject.id)
    }
  }

  const renameProject = (projectId: string, newName: string) => {
    if (newName.trim()) {
      setProjects((prev) =>
        prev.map((project) => (project.id === projectId ? { ...project, name: newName.trim() } : project)),
      )
    }
    setEditingProject(null)
  }

  const deleteProject = (projectId: string) => {
    setProjects((prev) => prev.filter((project) => project.id !== projectId))
    if (activeProject === projectId) {
      setActiveProject(null)
    }
  }

  const renameFile = (projectId: string, fileId: string, newName: string) => {
    if (newName.trim()) {
      setProjects((prev) =>
        prev.map((project) =>
          project.id === projectId
            ? {
                ...project,
                files: project.files.map((file) =>
                  file.id === fileId
                    ? { ...file, name: newName.trim(), type: newName.split(".").pop() || "file" }
                    : file,
                ),
              }
            : project,
        ),
      )
    }
    setEditingFile(null)
  }

  const deleteFile = (projectId: string, fileId: string) => {
    setProjects((prev) =>
      prev.map((project) =>
        project.id === projectId ? { ...project, files: project.files.filter((file) => file.id !== fileId) } : project,
      ),
    )
  }

  const handleImportFiles = () => {
    const input = document.createElement("input")
    input.type = "file"
    input.multiple = true
    input.accept = ".pdf,.dwg,.docx,.doc,.txt,.jpg,.png"

    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files
      if (files && projects.length > 0) {
        const targetProjectId = activeProject || projects[0].id
        const newFiles: File[] = Array.from(files).map((file) => ({
          id: Date.now().toString() + Math.random(),
          name: file.name,
          type: file.name.split(".").pop() || "file",
        }))

        setProjects((prev) =>
          prev.map((project) =>
            project.id === targetProjectId ? { ...project, files: [...project.files, ...newFiles] } : project,
          ),
        )
      }
    }

    input.click()
  }

  return (
    <div className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
      <div className="p-4 border-b border-sidebar-border">
        <div className="space-y-3">
          {activeProject && (
            <Button
              variant="ghost"
              className="w-full justify-start mb-3 text-muted-foreground hover:text-foreground"
              onClick={() => setActiveProject(null)}
            >
              ← All Projects
            </Button>
          )}

          {!activeProject && (
            <div className="flex items-center gap-2">
              <Input
                placeholder="New project name"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addProject()}
                className="flex-1"
              />
              <Button size="sm" onClick={addProject} disabled={!newProjectName.trim()}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          )}

          {activeProject && (
            <Button
              className="w-full justify-start bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleImportFiles}
            >
              <Upload className="w-4 h-4 mr-2" />
              Import Files
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {activeProject ? (
            <>
              {projects
                .filter((p) => p.id === activeProject)
                .map((project) => (
                  <div key={project.id} className="space-y-1">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <Folder className="w-4 h-4 mr-2 text-muted-foreground" />
                        <span className="font-medium">{project.name}</span>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditingProject(project.id)}>
                            <Edit2 className="w-4 h-4 mr-2" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => deleteProject(project.id)} className="text-destructive">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {project.files.map((file) => (
                      <div key={file.id} className="flex items-center group">
                        <Button
                          variant={selectedFile === file.id ? "secondary" : "ghost"}
                          className={`flex-1 justify-start text-sm ${
                            selectedFile === file.id
                              ? "bg-[#2D2D2D] text-white hover:bg-[#2D2D2D]/90"
                              : "text-sidebar-foreground hover:bg-sidebar-accent"
                          }`}
                          onClick={() => onFileSelect(file.id)}
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          {editingFile === file.id ? (
                            <Input
                              value={file.name}
                              onChange={(e) => renameFile(project.id, file.id, e.target.value)}
                              onBlur={() => setEditingFile(null)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  renameFile(project.id, file.id, (e.target as HTMLInputElement).value)
                                }
                                if (e.key === "Escape") {
                                  setEditingFile(null)
                                }
                              }}
                              className="h-6 text-sm"
                              autoFocus
                            />
                          ) : (
                            <span className="truncate">{file.name}</span>
                          )}
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditingFile(file.id)}>
                              <Edit2 className="w-4 h-4 mr-2" />
                              Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => deleteFile(project.id, file.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ))}
                  </div>
                ))}
            </>
          ) : (
            <div className="space-y-2">
              {projects.map((project) => (
                <div key={project.id} className="group">
                  <Button
                    variant="ghost"
                    className="w-full justify-between p-3 h-auto hover:bg-sidebar-accent"
                    onClick={() => setActiveProject(project.id)}
                  >
                    <div className="flex items-center">
                      <Folder className="w-5 h-5 mr-3 text-muted-foreground" />
                      <div className="text-left">
                        {editingProject === project.id ? (
                          <Input
                            value={project.name}
                            onChange={(e) => renameProject(project.id, e.target.value)}
                            onBlur={() => setEditingProject(null)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                renameProject(project.id, (e.target as HTMLInputElement).value)
                              }
                              if (e.key === "Escape") {
                                setEditingProject(null)
                              }
                            }}
                            className="h-6 text-sm"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <>
                            <div className="font-medium">{project.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {project.files.length} file{project.files.length !== 1 ? "s" : ""}
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditingProject(project.id)}>
                          <Edit2 className="w-4 h-4 mr-2" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => deleteProject(project.id)} className="text-destructive">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

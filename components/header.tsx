"use client"

import { Menu, LogOut } from "lucide-react"
import { supabase } from "@/lib/supabase-client"
import { useEffect, useState } from "react"


export function Header() {
  const [email, setEmail] = useState(null)
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setEmail(user?.email || null)
    })
  }, [])
  

  return (
    <header className="h-14 bg-[hsl(var(--sidebar))] border-b border-[hsl(var(--sidebar-border))] flex items-center justify-between px-4 border-[rgba(64,64,64,1)]">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-orange-500 rounded flex items-center justify-center">
            <span className="text-white font-bold text-sm">S</span>
          </div>
          <span className="font-semibold text-[hsl(var(--foreground))]">Smortr</span>
        </div>
        <span className="text-[hsl(var(--muted-foreground))] ml-8">Document Viewer</span>
      </div>

      <div className="flex items-center gap-2">
        <button className="p-2 hover:bg-[#2D2D2D] rounded transition-colors">
          <Menu className="w-4 h-4 text-[hsl(var(--foreground))]" />
        </button>
        <button className="p-2 hover:bg-[#2D2D2D] rounded transition-colors">
          <span className="text-[hsl(var(--foreground))] font-medium text-sm">
            {email || "Guest"}
          </span>
        </button>
        <button onClick={() => supabase.auth.signOut()} className="p-2 hover:bg-[#2D2D2D] rounded transition-colors flex items-center gap-2">
          <LogOut className="w-4 h-4 text-[hsl(var(--foreground))]" />
          <span className="text-[hsl(var(--foreground))] font-medium text-sm">Logout</span>
        </button>
      </div>
    </header>
  )
}

"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase-client"

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const handleAuth = async () => {
      // If arriving with code in hash (/#access_token=...) or query (?code=...)
      const hash = window.location.hash
      const query = new URLSearchParams(window.location.search)

      if (hash.includes("access_token") || query.get("code")) {
        await supabase.auth.exchangeCodeForSession(window.location.href)
      } else {
        await supabase.auth.getSession()
      }
      router.replace("/")
    }
    handleAuth()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p>Signing you in…</p>
    </div>
  )
}



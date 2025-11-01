"use client"

import { useState, useEffect } from "react"
import { ChatInterface } from "@/components/chat-interface"
import { AuthScreen } from "@/components/auth-screen"

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    // Check if user is already authenticated
    const storedUserId = localStorage.getItem("userId")
    if (storedUserId) {
      setUserId(storedUserId)
      setIsAuthenticated(true)
    }
  }, [])

  if (!isAuthenticated) {
    return (
      <AuthScreen
        onAuth={(id) => {
          setUserId(id)
          setIsAuthenticated(true)
          localStorage.setItem("userId", id)
        }}
      />
    )
  }

  return (
    <main className="h-screen w-full bg-background cyber-grid">
      <ChatInterface userId={userId!} />
    </main>
  )
}

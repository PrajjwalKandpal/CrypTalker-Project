"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { v4 as uuidv4 } from "uuid"
import { Lock } from "lucide-react"

interface AuthScreenProps {
  onAuth: (userId: string) => void
}

export function AuthScreen({ onAuth }: AuthScreenProps) {
  const [username, setUsername] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSignUp = async () => {
    if (!username || !displayName) return

    setIsLoading(true)
    try {
      const userId = uuidv4()
      localStorage.setItem("username", username)
      localStorage.setItem("displayName", displayName)
      onAuth(userId)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background overflow-hidden cyber-grid">
      {/* Animated hacker background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-96 h-96 bg-primary/15 rounded-full blur-3xl animate-pulse -top-32 -left-32" />
        <div
          className="absolute w-96 h-96 bg-destructive/10 rounded-full blur-3xl animate-pulse top-1/2 -right-32"
          style={{ animationDelay: "1s" }}
        />
        <div className="absolute inset-0 opacity-10 scanlines" />
      </div>

      <Card className="relative z-10 w-full max-w-md mx-auto border border-primary/30 glass neon-card">
        <div className="p-8 space-y-6">
          <div className="flex items-center justify-center mb-4 gap-3">
            <div className="p-3 bg-primary/20 rounded-lg border border-primary/40 neon-glow">
              <Lock className="w-6 h-6 text-primary terminal-text" />
            </div>
            <h1 className="text-4xl font-bold neon-glow terminal-text">CrypTalker</h1>
          </div>

          <p className="text-center text-muted-foreground text-sm terminal-text">
            Military-Grade E2E Encrypted Messaging
          </p>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-primary/80 terminal-text">HACKER_ID</label>
              <Input
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-2 neon-input"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-primary/80 terminal-text">DISPLAY_NAME</label>
              <Input
                placeholder="Enter display name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="mt-2 neon-input"
              />
            </div>

            <Button
              onClick={handleSignUp}
              disabled={!username || !displayName || isLoading}
              className="w-full neon-button text-primary-foreground font-bold mt-6 h-11 terminal-text"
            >
              {isLoading ? "INITIALIZING..." : "ENTER_NETWORK"}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center terminal-text border-t border-primary/20 pt-4">
            ▌ KEYS: LOCAL_ONLY ▌ MESSAGES: ENCRYPTED ▌ PRIVACY: GUARANTEED ▌
          </p>
        </div>
      </Card>

      <style>{`
        @keyframes glitch {
          0% { clip-path: inset(40% 0 61% 0); }
          20% { clip-path: inset(92% 0 1% 0); }
          40% { clip-path: inset(43% 0 1% 0); }
          60% { clip-path: inset(25% 0 58% 0); }
          80% { clip-path: inset(54% 0 7% 0); }
          100% { clip-path: inset(58% 0 43% 0); }
        }
      `}</style>
    </div>
  )
}

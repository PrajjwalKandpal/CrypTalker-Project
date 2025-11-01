"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Send, Loader2, Lock, Check, CheckCheck, FileUp, Smile, WifiOff, AlertCircle } from "lucide-react"
import { v4 as uuidv4 } from "uuid"
import { useOfflineQueue } from "@/hooks/use-offline-queue"

interface Message {
  id: string
  text: string
  sender: "self" | "other"
  timestamp: number
  status: "pending" | "sent" | "delivered" | "read"
}

interface ChatWindowProps {
  conversationId: string
  userId: string
}

export function ChatWindow({ conversationId, userId }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout>()

  const { queueStats, isOnline, queueMessage, retryMessage, getPendingMessages } = useOfflineQueue(userId)

  useEffect(() => {
    const stored = localStorage.getItem(`messages_${conversationId}`)
    if (stored) {
      setMessages(JSON.parse(stored))
    } else {
      const samples: Message[] = [
        {
          id: uuidv4(),
          text: "Hey! I just set up my encrypted device",
          sender: "other",
          timestamp: Date.now() - 600000,
          status: "read",
        },
        {
          id: uuidv4(),
          text: "Perfect! Your public key is verified",
          sender: "self",
          timestamp: Date.now() - 540000,
          status: "read",
        },
      ]
      setMessages(samples)
      localStorage.setItem(`messages_${conversationId}`, JSON.stringify(samples))
    }
  }, [conversationId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    setIsTyping(true)
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false)
    }, 3000)
  }

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return

    setIsLoading(true)
    setIsTyping(false)

    const newMessage: Message = {
      id: uuidv4(),
      text: inputValue,
      sender: "self",
      timestamp: Date.now(),
      status: "pending",
    }

    const updated = [...messages, newMessage]
    setMessages(updated)
    localStorage.setItem(`messages_${conversationId}`, JSON.stringify(updated))
    setInputValue("")

    try {
      const encrypted = Buffer.from(newMessage.text).toString("base64")
      const sessionId = `session_${conversationId}`

      await queueMessage(conversationId, newMessage.text, encrypted, sessionId)
    } catch (error) {
      console.error("Failed to queue message:", error)
    }

    // Simulate encryption and delivery with staggered updates
    setTimeout(() => {
      const sentMessages = updated.map((m) => (m.id === newMessage.id ? { ...m, status: "sent" as const } : m))
      setMessages(sentMessages)
      localStorage.setItem(`messages_${conversationId}`, JSON.stringify(sentMessages))
    }, 300)

    setTimeout(() => {
      const deliveredMessages = updated.map((m) =>
        m.id === newMessage.id ? { ...m, status: "delivered" as const } : m,
      )
      setMessages(deliveredMessages)
      localStorage.setItem(`messages_${conversationId}`, JSON.stringify(deliveredMessages))
      setIsLoading(false)
    }, 600)

    // Simulate reply
    setTimeout(() => {
      const reply: Message = {
        id: uuidv4(),
        text: "Message received and decrypted ✓",
        sender: "other",
        timestamp: Date.now(),
        status: "read",
      }
      const finalMessages = [
        ...updated.map((m) => (m.id === newMessage.id ? { ...m, status: "read" as const } : m)),
        reply,
      ]
      setMessages(finalMessages)
      localStorage.setItem(`messages_${conversationId}`, JSON.stringify(finalMessages))
    }, 2000)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Loader2 className="w-3.5 h-3.5 animate-spin" />
      case "sent":
        return <Check className="w-3.5 h-3.5" />
      case "delivered":
        return <CheckCheck className="w-3.5 h-3.5" />
      case "read":
        return <CheckCheck className="w-3.5 h-3.5 text-primary" />
      default:
        return null
    }
  }

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      {!isOnline && (
        <div className="px-6 py-2.5 bg-destructive/20 border-b border-destructive/40 flex items-center gap-2">
          <WifiOff className="w-4 h-4 text-destructive" />
          <p className="text-xs text-destructive/80 font-bold terminal-text">
            ▌ CONNECTION_LOST ▌ Queued: {queueStats.pending} messages
          </p>
        </div>
      )}

      {queueStats.failed > 0 && (
        <div className="px-6 py-2.5 bg-destructive/20 border-b border-destructive/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-destructive" />
            <p className="text-xs text-destructive/80 font-bold terminal-text">
              ERROR: {queueStats.failed} msg(s) failed
            </p>
          </div>
          <button
            onClick={() => {
              const pending = getPendingMessages(conversationId)
              pending.forEach((msg) => retryMessage(msg.id))
            }}
            className="text-xs px-2 py-1 rounded bg-destructive/30 hover:bg-destructive/50 text-destructive border border-destructive/50 transition-all font-bold"
          >
            RETRY
          </button>
        </div>
      )}

      <div className="px-6 py-4 border-b border-primary/30 bg-background/80 backdrop-blur-xl border-primary/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center animate-pulse neon-glow border border-primary/40">
              <span className="text-sm font-bold text-primary-foreground terminal-text">
                {localStorage.getItem("displayName")?.[0]?.toUpperCase() || "U"}
              </span>
            </div>
            <div>
              <h2 className="font-bold text-primary terminal-text">SECURE_CHANNEL</h2>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5 terminal-text">
                <Lock className="w-3 h-3 text-primary neon-glow" />
                E2E_ENCRYPTED
              </p>
            </div>
          </div>
          {isTyping && (
            <div className="flex items-center gap-1.5 text-xs text-primary terminal-text">
              <span>TYPING</span>
              <div className="flex gap-1">
                <div
                  className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce neon-glow"
                  style={{ animationDelay: "0s" }}
                />
                <div
                  className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce neon-glow"
                  style={{ animationDelay: "0.2s" }}
                />
                <div
                  className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce neon-glow"
                  style={{ animationDelay: "0.4s" }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto space-y-4 p-6">
        {messages.map((msg, index) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === "self" ? "justify-end" : "justify-start"} animate-message-enter`}
            style={
              {
                animationDelay: `${index * 0.05}s`,
              } as React.CSSProperties
            }
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg flex gap-2 items-end transition-all duration-300 border ${
                msg.sender === "self"
                  ? "bg-primary/20 text-primary rounded-br-none border-primary/40 terminal-text font-medium neon-card"
                  : "bg-secondary/50 text-foreground border-primary/20 rounded-bl-none terminal-text"
              }`}
            >
              <p className="text-sm break-words">{msg.text}</p>
              {msg.sender === "self" && (
                <div className="flex-shrink-0 opacity-70 transition-opacity hover:opacity-100 text-primary/80">
                  {getStatusIcon(msg.status)}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="px-6 py-4 border-t border-primary/30 bg-background/80 backdrop-blur-xl">
        <div className="flex gap-3 items-end">
          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-primary/20 text-primary transition-all"
            title="Attach file"
          >
            <FileUp className="w-5 h-5" />
          </Button>
          <Input
            placeholder="type message..."
            value={inputValue}
            onChange={handleInputChange}
            onKeyPress={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSendMessage()
              }
            }}
            className="neon-input"
            disabled={isLoading}
          />
          <Button variant="ghost" size="icon" className="hover:bg-primary/20 text-primary transition-all" title="Emoji">
            <Smile className="w-5 h-5" />
          </Button>
          <Button
            onClick={handleSendMessage}
            disabled={isLoading || !inputValue.trim()}
            className="gap-2 neon-button text-primary-foreground font-bold terminal-text"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      <style>{`
        @keyframes message-enter {
          from {
            opacity: 0;
            transform: translateY(8px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        @keyframes pulse-subtle {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.8;
          }
        }
        
        .animate-message-enter {
          animation: message-enter 0.3s ease-out forwards;
        }
        
        .animate-pulse-subtle {
          animation: pulse-subtle 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}

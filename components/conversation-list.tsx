"use client"

import { useState, useEffect } from "react"
import { Input } from "./ui/input"
import { Button } from "./ui/button"
import { Plus, Search, Lock } from "lucide-react"
import { v4 as uuidv4 } from "uuid"

interface Conversation {
  id: string
  name: string
  lastMessage: string
  timestamp: number
  unread: number
  avatar?: string
}

interface ConversationListProps {
  userId: string
  onSelectConversation: (conversationId: string) => void
}

export function ConversationList({ userId, onSelectConversation }: ConversationListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [search, setSearch] = useState("")
  const [showNewChat, setShowNewChat] = useState(false)

  useEffect(() => {
    // Load conversations from localStorage
    const stored = localStorage.getItem(`conversations_${userId}`)
    if (stored) {
      setConversations(JSON.parse(stored))
    } else {
      // Initialize with sample conversations
      const samples: Conversation[] = [
        {
          id: uuidv4(),
          name: "Alice Chen",
          lastMessage: "The encryption looks solid 🔒",
          timestamp: Date.now() - 300000,
          unread: 2,
        },
        {
          id: uuidv4(),
          name: "Bob Smith",
          lastMessage: "Verified your device fingerprint",
          timestamp: Date.now() - 3600000,
          unread: 0,
        },
      ]
      setConversations(samples)
      localStorage.setItem(`conversations_${userId}`, JSON.stringify(samples))
    }
  }, [userId])

  const filteredConversations = conversations.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))

  const handleCreateChat = (recipientName: string) => {
    const newConversation: Conversation = {
      id: uuidv4(),
      name: recipientName,
      lastMessage: "Start a secure conversation...",
      timestamp: Date.now(),
      unread: 0,
    }
    const updated = [newConversation, ...conversations]
    setConversations(updated)
    localStorage.setItem(`conversations_${userId}`, JSON.stringify(updated))
    setShowNewChat(false)
    onSelectConversation(newConversation.id)
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="p-4 space-y-3 border-b border-primary/30">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 neon-input terminal-text"
          />
        </div>

        <Button
          onClick={() => setShowNewChat(!showNewChat)}
          className="w-full gap-2 neon-button text-primary-foreground font-bold terminal-text"
        >
          <Plus className="w-4 h-4" />
          NEW_CHAT
        </Button>

        {showNewChat && (
          <div className="space-y-2 pt-2">
            <Input
              placeholder="username or ID..."
              onKeyPress={(e) => {
                if (e.key === "Enter" && e.currentTarget.value) {
                  handleCreateChat(e.currentTarget.value)
                  e.currentTarget.value = ""
                }
              }}
              className="neon-input terminal-text"
            />
          </div>
        )}
      </div>

      {/* Conversations list */}
      <div className="flex-1 overflow-y-auto space-y-1 p-2">
        {filteredConversations.map((conv) => (
          <button
            key={conv.id}
            onClick={() => onSelectConversation(conv.id)}
            className="w-full text-left p-3 rounded-lg hover:bg-primary/10 transition-colors group border border-primary/20 hover:border-primary/40 neon-card"
          >
            <div className="flex items-start justify-between mb-1">
              <h3 className="font-semibold text-sm flex items-center gap-1.5 text-primary terminal-text">
                <Lock className="w-3.5 h-3.5 neon-glow" />
                {conv.name}
              </h3>
              {conv.unread > 0 && (
                <span className="px-2 py-0.5 bg-primary text-primary-foreground text-xs rounded-full font-bold terminal-text">
                  {conv.unread}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate terminal-text">{conv.lastMessage}</p>
            <p className="text-xs text-muted-foreground/60 mt-1 terminal-text">
              {new Date(conv.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>
          </button>
        ))}
      </div>
    </div>
  )
}

"use client"

import { useState } from "react"
import { ConversationList } from "./conversation-list"
import { ChatWindow } from "./chat-window"
import { DevicePanel } from "./device-panel"
import { Menu, X, Lock, Terminal } from "lucide-react"

interface ChatInterfaceProps {
  userId: string
}

export function ChatInterface({ userId }: ChatInterfaceProps) {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [showDevicePanel, setShowDevicePanel] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden cyber-grid">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-1/3 h-96 bg-primary/10 rounded-full blur-3xl -top-1/4 -left-1/4 animate-pulse" />
        <div
          className="absolute w-1/3 h-96 bg-destructive/8 rounded-full blur-3xl -bottom-1/4 -right-1/4 animate-pulse"
          style={{ animationDelay: "1s" }}
        />
        <div className="absolute inset-0 opacity-5 scanlines" />
      </div>

      {/* Sidebar */}
      <div
        className={`
          fixed lg:static inset-y-0 left-0 z-40 
          flex flex-col w-80 border-r border-primary/30 bg-background/95 backdrop-blur-xl
          transition-transform duration-300 ease-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        <div className="p-6 border-b border-primary/30 bg-gradient-to-r from-primary/10 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/20 rounded-lg border border-primary/40 neon-glow">
                <Terminal className="w-5 h-5 text-primary terminal-text" />
              </div>
              <div>
                <h1 className="font-bold text-lg text-primary neon-glow terminal-text">CrypTalker</h1>
                <p className="text-xs text-muted-foreground terminal-text">ENCRYPTED_NETWORK</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 hover:bg-primary/20 rounded-lg transition-all hover:shadow-[0_0_10px_rgba(0,255,65,0.2)]"
            >
              <X className="w-5 h-5 text-primary" />
            </button>
          </div>
        </div>

        {/* Conversations */}
        <ConversationList
          userId={userId}
          onSelectConversation={(id) => {
            setSelectedConversation(id)
            setSidebarOpen(false)
          }}
        />

        <div className="mt-auto p-4 border-t border-primary/30 bg-gradient-to-r from-transparent to-primary/10">
          <button
            onClick={() => setShowDevicePanel(!showDevicePanel)}
            className="w-full px-4 py-2.5 rounded-lg bg-primary/20 hover:bg-primary/30 transition-all text-sm font-bold flex items-center gap-2 justify-center text-primary border border-primary/40 neon-button terminal-text hover:shadow-[0_0_10px_rgba(0,255,65,0.3)]"
          >
            <Lock className="w-4 h-4" />
            DEVICE_MANAGEMENT
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <div className="lg:hidden p-4 border-b border-primary/30 bg-background/80 backdrop-blur-xl flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-primary/20 rounded-lg transition-colors">
            <Menu className="w-5 h-5 text-primary" />
          </button>
          <h2 className="font-semibold flex-1 text-primary terminal-text">MESSAGING</h2>
        </div>

        {/* Chat content */}
        <div className="flex-1 overflow-hidden">
          {selectedConversation ? (
            <ChatWindow conversationId={selectedConversation} userId={userId} />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className="p-4 bg-primary/10 rounded-full mb-4 border border-primary/30 neon-glow">
                <Lock className="w-12 h-12 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-primary terminal-text">NO_CONVERSATION_SELECTED</h3>
              <p className="text-muted-foreground terminal-text">Initialize secure channel to begin communication</p>
            </div>
          )}
        </div>
      </div>

      {/* Device Panel */}
      {showDevicePanel && <DevicePanel onClose={() => setShowDevicePanel(false)} userId={userId} />}
    </div>
  )
}

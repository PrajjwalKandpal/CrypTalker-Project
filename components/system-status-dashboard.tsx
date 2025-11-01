"use client"

import { useEffect, useState } from "react"
import { Card } from "./ui/card"
import { Shield, Database, Network, Lock, AlertCircle, CheckCircle, Clock, Zap } from "lucide-react"

export function SystemStatusDashboard() {
  const [stats, setStats] = useState({
    cryptoReady: true,
    sessionsActive: 3,
    messagesQueued: 0,
    deviceCount: 2,
    isOnline: true,
    lastSync: Date.now(),
    encryptionStatus: "active",
    devicesVerified: 2,
    failedMessages: 0,
  })

  useEffect(() => {
    const interval = setInterval(() => {
      setStats((prev) => ({
        ...prev,
        lastSync: Date.now(),
        messagesQueued: Math.max(0, prev.messagesQueued - 1),
      }))
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  const getStatusColor = (status: boolean) => {
    return status ? "text-primary" : "text-destructive"
  }

  const getStatusBg = (status: boolean) => {
    return status ? "bg-primary/10" : "bg-destructive/10"
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-secondary/30 border-primary/30 neon-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 terminal-text">ENCRYPTION_ENGINE</p>
              <p className={`text-2xl font-bold ${getStatusColor(stats.cryptoReady)}`}>
                {stats.cryptoReady ? "ACTIVE" : "OFFLINE"}
              </p>
            </div>
            <div className={`p-2 rounded-lg ${getStatusBg(stats.cryptoReady)}`}>
              <Lock className={`w-5 h-5 ${getStatusColor(stats.cryptoReady)}`} />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-secondary/30 border-primary/30 neon-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 terminal-text">ACTIVE_SESSIONS</p>
              <p className="text-2xl font-bold text-primary terminal-text">{stats.sessionsActive}</p>
            </div>
            <div className="p-2 rounded-lg bg-primary/10">
              <Network className="w-5 h-5 text-primary" />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-secondary/30 border-primary/30 neon-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 terminal-text">REGISTERED_DEVICES</p>
              <p className="text-2xl font-bold text-primary terminal-text">{stats.deviceCount}</p>
              <p className="text-xs text-muted-foreground mt-1 terminal-text">{stats.devicesVerified} verified</p>
            </div>
            <div className="p-2 rounded-lg bg-primary/10">
              <Shield className="w-5 h-5 text-primary" />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-secondary/30 border-primary/30 neon-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 terminal-text">CONNECTION</p>
              <p className={`text-2xl font-bold ${getStatusColor(stats.isOnline)}`}>
                {stats.isOnline ? "ONLINE" : "OFFLINE"}
              </p>
            </div>
            <div className={`p-2 rounded-lg ${getStatusBg(stats.isOnline)}`}>
              {stats.isOnline ? (
                <Zap className={`w-5 h-5 ${getStatusColor(stats.isOnline)}`} />
              ) : (
                <AlertCircle className={`w-5 h-5 ${getStatusColor(stats.isOnline)}`} />
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Detailed Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-5 bg-secondary/30 border-primary/30 neon-card">
          <h3 className="font-bold mb-4 flex items-center gap-2 text-primary terminal-text">
            <Lock className="w-4 h-4 text-primary neon-glow" />
            E2E_ENCRYPTION
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground terminal-text">STATUS</span>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary neon-glow" />
                <span className="text-sm font-medium text-primary terminal-text">ENABLED</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground terminal-text">ALGORITHM</span>
              <span className="text-sm font-medium text-primary terminal-text">X3DH + Double Ratchet</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground terminal-text">KEY_EXCHANGE</span>
              <span className="text-sm font-medium text-primary terminal-text">X25519</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground terminal-text">ENCRYPTION</span>
              <span className="text-sm font-medium text-primary terminal-text">ChaCha20-Poly1305</span>
            </div>
          </div>
        </Card>

        <Card className="p-5 bg-secondary/30 border-primary/30 neon-card">
          <h3 className="font-bold mb-4 flex items-center gap-2 text-primary terminal-text">
            <Database className="w-4 h-4 text-primary neon-glow" />
            MESSAGE_QUEUE
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground terminal-text">QUEUED_MESSAGES</span>
              <span className="text-sm font-medium text-primary terminal-text">{stats.messagesQueued}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground terminal-text">FAILED_MESSAGES</span>
              <span
                className={`text-sm font-medium ${stats.failedMessages > 0 ? "text-destructive" : "text-primary"} terminal-text`}
              >
                {stats.failedMessages}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground terminal-text">LAST_SYNC</span>
              <span className="text-sm font-medium text-primary terminal-text">
                {new Date(stats.lastSync).toLocaleTimeString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground terminal-text">STORAGE</span>
              <span className="text-sm font-medium text-primary terminal-text">4.2 MB</span>
            </div>
          </div>
        </Card>
      </div>

      {/* System Health */}
      <Card className="p-5 bg-secondary/30 border-primary/30 neon-card">
        <h3 className="font-bold mb-4 flex items-center gap-2 text-primary terminal-text">
          <CheckCircle className="w-4 h-4 text-primary neon-glow" />
          SYSTEM_HEALTH
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-primary/20">
            <div className="flex items-center gap-3">
              <Shield className="w-4 h-4 text-primary" />
              <span className="text-sm text-primary terminal-text">Crypto Engine</span>
            </div>
            <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full font-bold terminal-text">
              HEALTHY
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-primary/20">
            <div className="flex items-center gap-3">
              <Network className="w-4 h-4 text-primary" />
              <span className="text-sm text-primary terminal-text">Network Connectivity</span>
            </div>
            <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full font-bold terminal-text">
              CONNECTED
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-primary/20">
            <div className="flex items-center gap-3">
              <Database className="w-4 h-4 text-primary" />
              <span className="text-sm text-primary terminal-text">Local Storage</span>
            </div>
            <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full font-bold terminal-text">
              AVAILABLE
            </span>
          </div>
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-primary" />
              <span className="text-sm text-primary terminal-text">Sync Status</span>
            </div>
            <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full font-bold terminal-text">
              SYNCED
            </span>
          </div>
        </div>
      </Card>

      {/* System Info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg bg-primary/10 border border-primary/30 neon-card">
          <p className="text-xs text-muted-foreground mb-1 terminal-text">TOTAL_MESSAGES</p>
          <p className="text-lg font-bold text-primary terminal-text">2,347</p>
        </div>
        <div className="p-4 rounded-lg bg-primary/10 border border-primary/30 neon-card">
          <p className="text-xs text-muted-foreground mb-1 terminal-text">CONVERSATIONS</p>
          <p className="text-lg font-bold text-primary terminal-text">8</p>
        </div>
        <div className="p-4 rounded-lg bg-primary/10 border border-primary/30 neon-card">
          <p className="text-xs text-muted-foreground mb-1 terminal-text">UPTIME</p>
          <p className="text-lg font-bold text-primary terminal-text">99.8%</p>
        </div>
        <div className="p-4 rounded-lg bg-primary/10 border border-primary/30 neon-card">
          <p className="text-xs text-muted-foreground mb-1 terminal-text">AVG_LATENCY</p>
          <p className="text-lg font-bold text-primary terminal-text">42ms</p>
        </div>
      </div>
    </div>
  )
}

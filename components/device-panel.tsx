"use client"

import { useState, useEffect } from "react"
import { Card } from "./ui/card"
import { Button } from "./ui/button"
import { X, Plus, Check, AlertCircle, Copy, Trash2, Shield } from "lucide-react"
import { v4 as uuidv4 } from "uuid"

interface Device {
  id: string
  name: string
  type: "mobile" | "desktop" | "web" | "tablet"
  verified: boolean
  fingerprint: string
  addedAt: number
  lastSeen: number
  isCurrent: boolean
}

interface DevicePanelProps {
  userId: string
  onClose: () => void
}

export function DevicePanel({ userId, onClose }: DevicePanelProps) {
  const [devices, setDevices] = useState<Device[]>([])
  const [showAddDevice, setShowAddDevice] = useState(false)
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null)
  const [copiedFingerprint, setCopiedFingerprint] = useState<string | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem(`devices_${userId}`)
    if (stored) {
      setDevices(JSON.parse(stored))
    } else {
      const initialDevice: Device = {
        id: uuidv4(),
        name: "Current Device",
        type: "web",
        verified: true,
        fingerprint: Buffer.from(Math.random().toString()).toString("base64").substring(0, 16).toUpperCase(),
        addedAt: Date.now() - 86400000,
        lastSeen: Date.now(),
        isCurrent: true,
      }
      setDevices([initialDevice])
      localStorage.setItem(`devices_${userId}`, JSON.stringify([initialDevice]))
    }
  }, [userId])

  const handleAddDevice = () => {
    const newDevice: Device = {
      id: uuidv4(),
      name: `Device ${devices.length + 1}`,
      type: "mobile",
      verified: false,
      fingerprint: Buffer.from(Math.random().toString()).toString("base64").substring(0, 16).toUpperCase(),
      addedAt: Date.now(),
      lastSeen: Date.now(),
      isCurrent: false,
    }
    const updated = [newDevice, ...devices]
    setDevices(updated)
    localStorage.setItem(`devices_${userId}`, JSON.stringify(updated))
    setShowAddDevice(false)
    setSelectedDevice(newDevice.id)
  }

  const handleVerify = (deviceId: string) => {
    const updated = devices.map((d) => (d.id === deviceId ? { ...d, verified: true, lastSeen: Date.now() } : d))
    setDevices(updated)
    localStorage.setItem(`devices_${userId}`, JSON.stringify(updated))
  }

  const handleRemove = (deviceId: string) => {
    const updated = devices.filter((d) => d.id !== deviceId)
    setDevices(updated)
    localStorage.setItem(`devices_${userId}`, JSON.stringify(updated))
    setSelectedDevice(null)
  }

  const handleCopyFingerprint = (fingerprint: string) => {
    navigator.clipboard.writeText(fingerprint)
    setCopiedFingerprint(fingerprint)
    setTimeout(() => setCopiedFingerprint(null), 2000)
  }

  const getDeviceIcon = (type: Device["type"]) => {
    switch (type) {
      case "mobile":
        return "📱"
      case "desktop":
        return "🖥️"
      case "tablet":
        return "📱"
      default:
        return "💻"
    }
  }

  const getOnlineStatus = (lastSeen: number) => {
    const minutesAgo = (Date.now() - lastSeen) / (1000 * 60)
    if (minutesAgo < 5) return { status: "online", color: "text-primary", label: "Online" }
    if (minutesAgo < 60) return { status: "idle", color: "text-yellow-500", label: `${Math.floor(minutesAgo)}m ago` }
    return { status: "offline", color: "text-muted-foreground", label: `${Math.floor(minutesAgo / 60)}h ago` }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 neon-card">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-primary/30 bg-background/95 backdrop-blur-xl">
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-lg border border-primary/40 neon-glow">
                <Shield className="w-6 h-6 text-primary terminal-text" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-primary terminal-text">DEVICE_MANAGEMENT</h2>
                <p className="text-xs text-muted-foreground terminal-text">
                  Manage connected devices and verify fingerprints
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-primary/20 rounded-lg transition-colors">
              <X className="w-5 h-5 text-primary" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/30 text-center neon-card">
              <p className="text-2xl font-bold text-primary terminal-text">{devices.length}</p>
              <p className="text-xs text-muted-foreground terminal-text">TOTAL</p>
            </div>
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/30 text-center neon-card">
              <p className="text-2xl font-bold text-primary terminal-text">
                {devices.filter((d) => d.verified).length}
              </p>
              <p className="text-xs text-muted-foreground terminal-text">VERIFIED</p>
            </div>
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-center neon-card">
              <p className="text-2xl font-bold text-destructive terminal-text">
                {devices.filter((d) => !d.verified).length}
              </p>
              <p className="text-xs text-muted-foreground terminal-text">PENDING</p>
            </div>
          </div>

          {/* Devices list */}
          <div className="space-y-3">
            {devices.map((device) => {
              const onlineStatus = getOnlineStatus(device.lastSeen)
              const isSelected = selectedDevice === device.id

              return (
                <div
                  key={device.id}
                  onClick={() => setSelectedDevice(isSelected ? null : device.id)}
                  className={`p-4 rounded-lg border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-primary/15 border-primary/50 neon-card"
                      : "bg-secondary/30 border-primary/20 hover:bg-secondary/50 hover:border-primary/30"
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">{getDeviceIcon(device.type)}</div>
                      <div>
                        <h3 className="font-semibold text-sm flex items-center gap-2 text-primary terminal-text">
                          {device.name}
                          {device.isCurrent && (
                            <span className="px-1.5 py-0.5 bg-primary/20 text-primary text-xs rounded font-medium terminal-text">
                              THIS_DEVICE
                            </span>
                          )}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1 terminal-text">
                          Added {new Date(device.addedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium terminal-text ${
                          device.verified ? "bg-primary/20 text-primary" : "bg-destructive/20 text-destructive"
                        }`}
                      >
                        {device.verified ? (
                          <>
                            <Check className="w-3 h-3" />
                            VERIFIED
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-3 h-3" />
                            PENDING
                          </>
                        )}
                      </div>
                      <div
                        className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium terminal-text ${onlineStatus.color}`}
                      >
                        <div className="w-1.5 h-1.5 bg-current rounded-full" />
                        {onlineStatus.label}
                      </div>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="space-y-3 pt-3 border-t border-primary/20">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground terminal-text">
                          DEVICE_FINGERPRINT
                        </label>
                        <div className="flex items-center gap-2 p-2 bg-background/50 rounded font-mono text-xs border border-primary/30 neon-card">
                          <span className="flex-1 text-primary terminal-text">{device.fingerprint}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleCopyFingerprint(device.fingerprint)
                            }}
                            className="h-6 px-2 hover:bg-primary/20 text-primary"
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                        {copiedFingerprint === device.fingerprint && (
                          <p className="text-xs text-primary terminal-text">✓ Copied to clipboard</p>
                        )}
                      </div>

                      {!device.verified && (
                        <Button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleVerify(device.id)
                          }}
                          className="w-full h-8 text-xs gap-2 neon-button text-primary-foreground terminal-text font-bold"
                        >
                          <Check className="w-3 h-3" />
                          VERIFY_DEVICE
                        </Button>
                      )}

                      {!device.isCurrent && (
                        <Button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRemove(device.id)
                          }}
                          className="w-full h-8 text-xs gap-2 text-destructive hover:bg-destructive/10 border border-destructive/50 terminal-text font-bold"
                        >
                          <Trash2 className="w-3 h-3" />
                          REMOVE_DEVICE
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Add device button */}
          <Button
            onClick={handleAddDevice}
            className="w-full gap-2 neon-button text-primary-foreground font-bold terminal-text"
          >
            <Plus className="w-4 h-4" />
            ADD_DEVICE
          </Button>

          {/* Info panel */}
          <div className="p-4 bg-primary/10 rounded-lg border border-primary/30 space-y-2 neon-card">
            <p className="text-xs font-semibold text-primary terminal-text">SECURITY_PROTOCOL:</p>
            <ul className="text-xs text-muted-foreground space-y-1 terminal-text">
              <li>▌ Each device: unique encryption keys</li>
              <li>▌ Verify devices: compare fingerprints</li>
              <li>▌ Access: verified devices only</li>
              <li>▌ Rotation: automatic key refresh</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  )
}

import { generateUUID } from "./uuid-helper"

export interface QueuedMessage {
  id: string
  userId: string
  conversationId: string
  content: string
  encrypted: string
  sessionId: string
  timestamp: number
  attempts: number
  maxRetries: number
  nextRetryTime: number
  status: "pending" | "sending" | "sent" | "failed" | "delivered"
  error?: string
  createdAt: number
  updatedAt: number
}

export interface DeliveryStatus {
  messageId: string
  status: "pending" | "sent" | "delivered" | "failed"
  sentAt?: number
  deliveredAt?: number
  error?: string
  retries: number
}

export interface OfflineQueueState {
  messages: Map<string, QueuedMessage[]>
  deliveryStatus: Map<string, DeliveryStatus>
  isOnline: boolean
  syncInProgress: boolean
  lastSyncTime: number
}

// Exponential backoff: 1s, 2s, 4s, 8s, 16s, 32s, 60s (capped)
const getRetryDelay = (attemptNumber: number): number => {
  const delay = Math.min(1000 * Math.pow(2, attemptNumber), 60000)
  return delay + Math.random() * 1000 // Add jitter
}

export const offlineQueueManager = {
  state: {
    messages: new Map<string, QueuedMessage[]>(),
    deliveryStatus: new Map<string, DeliveryStatus>(),
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
    syncInProgress: false,
    lastSyncTime: 0,
  } as OfflineQueueState,

  // Initialize offline queue with network listeners
  initialize: (): void => {
    if (typeof window === "undefined") return

    window.addEventListener("online", () => {
      offlineQueueManager.state.isOnline = true
      offlineQueueManager.processPendingMessages()
    })

    window.addEventListener("offline", () => {
      offlineQueueManager.state.isOnline = false
    })

    // Load persisted queue from localStorage
    offlineQueueManager.loadFromStorage()
  },

  // Add message to offline queue
  queueMessage: async (
    userId: string,
    conversationId: string,
    content: string,
    encrypted: string,
    sessionId: string,
  ): Promise<QueuedMessage> => {
    const message: QueuedMessage = {
      id: generateUUID(),
      userId,
      conversationId,
      content,
      encrypted,
      sessionId,
      timestamp: Date.now(),
      attempts: 0,
      maxRetries: 5,
      nextRetryTime: Date.now(),
      status: "pending",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    const userMessages = offlineQueueManager.state.messages.get(userId) || []
    userMessages.push(message)
    offlineQueueManager.state.messages.set(userId, userMessages)

    // Initialize delivery status
    offlineQueueManager.state.deliveryStatus.set(message.id, {
      messageId: message.id,
      status: "pending",
      retries: 0,
    })

    // Persist to localStorage
    offlineQueueManager.saveToStorage()

    // Try to send immediately if online
    if (offlineQueueManager.state.isOnline) {
      await offlineQueueManager.processMessage(userId, message.id)
    }

    return message
  },

  // Process a single message
  processMessage: async (userId: string, messageId: string): Promise<boolean> => {
    const userMessages = offlineQueueManager.state.messages.get(userId)
    if (!userMessages) return false

    const messageIndex = userMessages.findIndex((m) => m.id === messageId)
    if (messageIndex === -1) return false

    const message = userMessages[messageIndex]

    if (message.status === "sent" || message.status === "delivered") {
      return true
    }

    // Check if it's time to retry
    if (message.nextRetryTime > Date.now()) {
      return false
    }

    // Max retries exceeded
    if (message.attempts >= message.maxRetries) {
      message.status = "failed"
      message.error = "Max retries exceeded"
      message.updatedAt = Date.now()
      offlineQueueManager.saveToStorage()
      return false
    }

    try {
      // Simulate sending message
      message.attempts++
      message.updatedAt = Date.now()

      // Network request simulation
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(
          () => {
            // Random failure rate (10%) for testing
            if (Math.random() < 0.1 && message.attempts < message.maxRetries) {
              reject(new Error("Network timeout"))
            } else {
              resolve(true)
            }
          },
          Math.random() * 2000 + 500,
        )
      })

      message.status = "sent"
      message.updatedAt = Date.now()

      const status = offlineQueueManager.state.deliveryStatus.get(message.id)
      if (status) {
        status.status = "sent"
        status.sentAt = Date.now()
        status.retries = message.attempts
      }

      offlineQueueManager.saveToStorage()
      return true
    } catch (error) {
      const nextRetry = getRetryDelay(message.attempts)
      message.nextRetryTime = Date.now() + nextRetry
      message.error = error instanceof Error ? error.message : "Unknown error"
      message.updatedAt = Date.now()

      const status = offlineQueueManager.state.deliveryStatus.get(message.id)
      if (status) {
        status.error = message.error
        status.retries = message.attempts
      }

      offlineQueueManager.saveToStorage()
      return false
    }
  },

  // Process all pending messages for a user
  processPendingMessages: async (userId?: string): Promise<void> => {
    if (offlineQueueManager.state.syncInProgress) return
    if (!offlineQueueManager.state.isOnline) return

    offlineQueueManager.state.syncInProgress = true

    try {
      const usersToProcess = userId ? [userId] : Array.from(offlineQueueManager.state.messages.keys())

      for (const uid of usersToProcess) {
        const userMessages = offlineQueueManager.state.messages.get(uid) || []

        for (const message of userMessages) {
          if (message.status === "pending" || message.status === "sending") {
            await offlineQueueManager.processMessage(uid, message.id)
            // Small delay between messages to avoid overwhelming network
            await new Promise((resolve) => setTimeout(resolve, 100))
          }
        }
      }

      offlineQueueManager.state.lastSyncTime = Date.now()
      offlineQueueManager.saveToStorage()
    } finally {
      offlineQueueManager.state.syncInProgress = false
    }
  },

  // Mark message as delivered
  markDelivered: async (messageId: string): Promise<void> => {
    for (const userMessages of offlineQueueManager.state.messages.values()) {
      const message = userMessages.find((m) => m.id === messageId)
      if (message) {
        message.status = "delivered"
        message.updatedAt = Date.now()

        const status = offlineQueueManager.state.deliveryStatus.get(messageId)
        if (status) {
          status.status = "delivered"
          status.deliveredAt = Date.now()
        }

        offlineQueueManager.saveToStorage()
        return
      }
    }
  },

  // Get pending messages for user
  getPendingMessages: (userId: string): QueuedMessage[] => {
    const userMessages = offlineQueueManager.state.messages.get(userId) || []
    return userMessages.filter((m) => m.status === "pending" || m.status === "sending")
  },

  // Get all messages for conversation
  getConversationMessages: (userId: string, conversationId: string): QueuedMessage[] => {
    const userMessages = offlineQueueManager.state.messages.get(userId) || []
    return userMessages.filter((m) => m.conversationId === conversationId)
  },

  // Get delivery status for message
  getDeliveryStatus: (messageId: string): DeliveryStatus | undefined => {
    return offlineQueueManager.state.deliveryStatus.get(messageId)
  },

  // Get queue statistics
  getQueueStats: (userId?: string) => {
    const messages = userId
      ? offlineQueueManager.state.messages.get(userId) || []
      : Array.from(offlineQueueManager.state.messages.values()).flat()

    return {
      total: messages.length,
      pending: messages.filter((m) => m.status === "pending").length,
      sending: messages.filter((m) => m.status === "sending").length,
      sent: messages.filter((m) => m.status === "sent").length,
      delivered: messages.filter((m) => m.status === "delivered").length,
      failed: messages.filter((m) => m.status === "failed").length,
      isOnline: offlineQueueManager.state.isOnline,
      syncInProgress: offlineQueueManager.state.syncInProgress,
      lastSyncTime: offlineQueueManager.state.lastSyncTime,
    }
  },

  // Persist queue to localStorage
  saveToStorage: (): void => {
    if (typeof localStorage === "undefined") return

    const serialized = {
      messages: Array.from(offlineQueueManager.state.messages.entries()).map(([userId, msgs]) => ({
        userId,
        messages: msgs,
      })),
      deliveryStatus: Array.from(offlineQueueManager.state.deliveryStatus.entries()),
      lastSyncTime: offlineQueueManager.state.lastSyncTime,
    }

    localStorage.setItem("offline_queue_v1", JSON.stringify(serialized))
  },

  // Load queue from localStorage
  loadFromStorage: (): void => {
    if (typeof localStorage === "undefined") return

    try {
      const stored = localStorage.getItem("offline_queue_v1")
      if (!stored) return

      const data = JSON.parse(stored)

      offlineQueueManager.state.messages.clear()
      data.messages.forEach((item: { userId: string; messages: QueuedMessage[] }) => {
        offlineQueueManager.state.messages.set(item.userId, item.messages)
      })

      offlineQueueManager.state.deliveryStatus.clear()
      data.deliveryStatus.forEach(([id, status]: [string, DeliveryStatus]) => {
        offlineQueueManager.state.deliveryStatus.set(id, status)
      })

      offlineQueueManager.state.lastSyncTime = data.lastSyncTime || 0
    } catch (error) {
      console.error("Failed to load offline queue from storage:", error)
    }
  },

  // Clear all queued messages
  clearQueue: async (userId?: string): Promise<void> => {
    if (userId) {
      offlineQueueManager.state.messages.delete(userId)
    } else {
      offlineQueueManager.state.messages.clear()
      offlineQueueManager.state.deliveryStatus.clear()
    }
    offlineQueueManager.saveToStorage()
  },

  // Retry specific failed message
  retryMessage: async (messageId: string): Promise<boolean> => {
    for (const [userId, userMessages] of offlineQueueManager.state.messages.entries()) {
      const message = userMessages.find((m) => m.id === messageId)
      if (message) {
        message.status = "pending"
        message.nextRetryTime = Date.now()
        message.attempts = 0
        message.error = undefined
        return offlineQueueManager.processMessage(userId, messageId)
      }
    }
    return false
  },
}

// Initialize on module load
if (typeof window !== "undefined") {
  offlineQueueManager.initialize()
}

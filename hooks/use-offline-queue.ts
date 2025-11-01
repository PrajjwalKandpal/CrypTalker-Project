"use client"

import { useEffect, useState, useCallback } from "react"
import { offlineQueueManager } from "@/lib/offline-queue"

export function useOfflineQueue(userId: string) {
  const [queueStats, setQueueStats] = useState(() => offlineQueueManager.getQueueStats(userId))
  const [isOnline, setIsOnline] = useState(offlineQueueManager.state.isOnline)

  useEffect(() => {
    const updateStats = () => {
      setQueueStats(offlineQueueManager.getQueueStats(userId))
      setIsOnline(offlineQueueManager.state.isOnline)
    }

    const interval = setInterval(updateStats, 500)
    const handleOnline = () => {
      setIsOnline(true)
      offlineQueueManager.processPendingMessages(userId)
    }
    const handleOffline = () => setIsOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      clearInterval(interval)
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [userId])

  const queueMessage = useCallback(
    async (conversationId: string, content: string, encrypted: string, sessionId: string) => {
      return offlineQueueManager.queueMessage(userId, conversationId, content, encrypted, sessionId)
    },
    [userId],
  )

  const retryMessage = useCallback((messageId: string) => {
    return offlineQueueManager.retryMessage(messageId)
  }, [])

  const getPendingMessages = useCallback(
    (conversationId: string) => {
      const userMessages = offlineQueueManager.state.messages.get(userId) || []
      return userMessages.filter((m) => m.conversationId === conversationId && m.status !== "delivered")
    },
    [userId],
  )

  return {
    queueStats,
    isOnline,
    queueMessage,
    retryMessage,
    getPendingMessages,
  }
}

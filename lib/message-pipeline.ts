import { generateUUID } from "./uuid-helper"
import { cryptoUtils, type EncryptedMessage, type SessionKey } from "./crypto"
import { sessionManager, type SessionState } from "./session"
import { db, type Message } from "./db"

export interface PlaintextMessage {
  conversationId: string
  senderId: string
  senderDeviceId: string
  recipientId: string
  recipientDeviceId: string
  content: string
  attachmentIds?: string[]
  metadata?: Record<string, string>
}

export interface ProcessedMessage {
  encrypted: EncryptedMessage
  metadata: {
    conversationId: string
    senderId: string
    recipientId: string
    sessionId: string
    timestamp: number
    status: "queued" | "sending" | "sent" | "failed"
  }
}

export interface MessagePipeline {
  queue: ProcessedMessage[]
  activeSessionsMap: Map<string, SessionState>
  retryPolicies: Map<string, RetryPolicy>
}

export interface RetryPolicy {
  maxRetries: number
  retryDelayMs: number
  backoffMultiplier: number
}

// Main message encryption pipeline
export const messagePipeline = {
  // Initialize the pipeline
  init: (): MessagePipeline => {
    return {
      queue: [],
      activeSessionsMap: new Map(),
      retryPolicies: new Map(),
    }
  },

  // Step 1: Validate plaintext message
  validateMessage: async (message: PlaintextMessage): Promise<boolean> => {
    if (!message.conversationId || !message.content) return false
    if (message.content.length > 65536) return false // 64KB limit
    return true
  },

  // Step 2: Establish or retrieve session
  ensureSessionEstablished: async (
    senderId: string,
    senderDeviceId: string,
    recipientId: string,
    recipientDeviceId: string,
    senderDeviceKeys: any, // DeviceKeys type from crypto.ts
  ): Promise<SessionState | null> => {
    // Try to retrieve existing session
    const session = await sessionManager.getOrCreateSession(senderId, senderDeviceId, recipientId, recipientDeviceId)

    if (!session) {
      // Session doesn't exist - would need to perform handshake
      // For now, return null to indicate session needs establishment
      return null
    }

    return session
  },

  // Step 3: Prepare message for encryption
  prepareMessageForEncryption: async (
    plaintext: PlaintextMessage,
    sessionKey: SessionKey,
  ): Promise<{
    payload: string
    metadata: Record<string, string>
  }> => {
    const payload = {
      type: "message",
      content: plaintext.content,
      attachmentIds: plaintext.attachmentIds || [],
      metadata: plaintext.metadata || {},
      timestamp: Date.now(),
      messageId: generateUUID(),
    }

    return {
      payload: JSON.stringify(payload),
      metadata: {
        conversationId: plaintext.conversationId,
        originalTimestamp: Date.now().toString(),
      },
    }
  },

  // Step 4: Encrypt message using session key (Double Ratchet Algorithm)
  encryptMessage: async (plaintext: PlaintextMessage, session: SessionState): Promise<EncryptedMessage | null> => {
    try {
      // Prepare the message
      const { payload } = await messagePipeline.prepareMessageForEncryption(plaintext, session.sessionKey)

      // Evolve chain key for forward secrecy (Double Ratchet step)
      const newChainKey = await cryptoUtils.evolveChainKey(session.sessionKey.chainKey)
      session.sessionKey.chainKey = newChainKey

      // Encrypt using current session key
      const encrypted = await cryptoUtils.encryptMessage(
        payload,
        session.sessionKey,
        plaintext.senderId,
        plaintext.recipientId,
        plaintext.senderDeviceId,
        plaintext.recipientDeviceId,
      )

      // Update message counter
      session.sessionKey.messageCounter += 1

      return encrypted
    } catch (error) {
      console.error("[v0] Encryption failed:", error)
      return null
    }
  },

  // Step 5: Queue message for delivery
  queueMessageForDelivery: async (
    pipeline: MessagePipeline,
    plaintext: PlaintextMessage,
    encrypted: EncryptedMessage,
    session: SessionState,
  ): Promise<ProcessedMessage> => {
    const processed: ProcessedMessage = {
      encrypted,
      metadata: {
        conversationId: plaintext.conversationId,
        senderId: plaintext.senderId,
        recipientId: plaintext.recipientId,
        sessionId: session.sessionId,
        timestamp: Date.now(),
        status: "queued",
      },
    }

    pipeline.queue.push(processed)

    // Store in database for persistence
    const dbMessage: Message = {
      messageId: generateUUID(),
      conversationId: plaintext.conversationId,
      senderDeviceId: plaintext.senderDeviceId,
      senderUserId: plaintext.senderId,
      ciphertext: encrypted.ciphertext,
      nonce: encrypted.nonce,
      timestamp: encrypted.timestamp,
      messageCounter: encrypted.messageCounter,
      headerSecret: encrypted.headerSecret,
      status: "pending",
      createdAt: Date.now(),
    }

    await db.storeMessage(dbMessage)
    return processed
  },

  // Step 6: Send message (simulated transmission)
  sendMessage: async (pipeline: MessagePipeline, processed: ProcessedMessage): Promise<boolean> => {
    try {
      processed.metadata.status = "sending"

      // Simulate network transmission with delay
      await new Promise((resolve) => setTimeout(resolve, 300))

      // Mark as sent
      processed.metadata.status = "sent"

      // Remove from queue after successful sending
      const index = pipeline.queue.indexOf(processed)
      if (index > -1) {
        pipeline.queue.splice(index, 1)
      }

      return true
    } catch (error) {
      console.error("[v0] Message send failed:", error)
      processed.metadata.status = "failed"
      return false
    }
  },

  // Step 7: Decrypt incoming message
  decryptMessage: async (
    encrypted: EncryptedMessage,
    session: SessionState,
  ): Promise<{
    content: string
    metadata: Record<string, string>
  } | null> => {
    try {
      // Verify message counter is in expected range (replay protection)
      if (encrypted.messageCounter <= session.sessionKey.messageCounter) {
        console.error("[v0] Replay attack detected - invalid message counter")
        return null
      }

      // Decrypt using session key
      const decrypted = await cryptoUtils.decryptMessage(encrypted, session.sessionKey)

      // Parse message
      const message = JSON.parse(decrypted)

      // Update session state
      session.sessionKey.messageCounter = encrypted.messageCounter
      session.lastUpdated = Date.now()

      return {
        content: message.content,
        metadata: {
          messageId: message.messageId,
          originalTimestamp: message.timestamp.toString(),
        },
      }
    } catch (error) {
      console.error("[v0] Decryption failed:", error)
      return null
    }
  },

  // Step 8: Handle delivery receipts
  processDeliveryReceipt: async (
    pipeline: MessagePipeline,
    messageId: string,
    recipientId: string,
    recipientDeviceId: string,
  ): Promise<void> => {
    // Find message in database and update status
    for (const [, messages] of db.messages.entries()) {
      const message = messages.find((m) => m.messageId === messageId)
      if (message) {
        message.status = "delivered"
        break
      }
    }
  },

  // Step 9: Handle read receipts
  processReadReceipt: async (messageId: string, readBy: string, deviceId: string): Promise<void> => {
    // Record read receipt in database
    const receipt = {
      messageId,
      readBy,
      deviceId,
      timestamp: Date.now(),
    }
    await db.storeReceipt(receipt)

    // Update message status
    for (const [, messages] of db.messages.entries()) {
      const message = messages.find((m) => m.messageId === messageId)
      if (message) {
        message.status = "read"
        break
      }
    }
  },

  // Full pipeline: plaintext -> encrypted -> queued -> sent
  processOutgoingMessage: async (
    pipeline: MessagePipeline,
    plaintext: PlaintextMessage,
    senderDeviceKeys: any,
  ): Promise<ProcessedMessage | null> => {
    try {
      // Validate
      const isValid = await messagePipeline.validateMessage(plaintext)
      if (!isValid) {
        console.error("[v0] Invalid message")
        return null
      }

      // Ensure session exists
      const session = await messagePipeline.ensureSessionEstablished(
        plaintext.senderId,
        plaintext.senderDeviceId,
        plaintext.recipientId,
        plaintext.recipientDeviceId,
        senderDeviceKeys,
      )

      if (!session) {
        console.error("[v0] Session not established")
        return null
      }

      // Encrypt
      const encrypted = await messagePipeline.encryptMessage(plaintext, session)
      if (!encrypted) {
        console.error("[v0] Encryption failed")
        return null
      }

      // Queue and store
      const processed = await messagePipeline.queueMessageForDelivery(pipeline, plaintext, encrypted, session)

      // Send
      const sendSuccess = await messagePipeline.sendMessage(pipeline, processed)
      if (!sendSuccess) {
        console.error("[v0] Send failed")
        // Message remains in queue for retry
      }

      return processed
    } catch (error) {
      console.error("[v0] Pipeline error:", error)
      return null
    }
  },

  // Process incoming encrypted message
  processIncomingMessage: async (
    encrypted: EncryptedMessage,
    session: SessionState,
  ): Promise<{
    content: string
    metadata: Record<string, string>
  } | null> => {
    return messagePipeline.decryptMessage(encrypted, session)
  },

  // Get pipeline statistics
  getStats: (pipeline: MessagePipeline) => {
    return {
      queuedMessages: pipeline.queue.length,
      pendingMessages: pipeline.queue.filter((m) => m.metadata.status === "queued").length,
      failedMessages: pipeline.queue.filter((m) => m.metadata.status === "failed").length,
      activeSessions: pipeline.activeSessionsMap.size,
    }
  },
}

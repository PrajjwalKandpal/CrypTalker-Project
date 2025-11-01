// Database utilities
import { generateUUID } from "./uuid-helper"

export interface User {
  userId: string
  username: string
  displayName: string
  createdAt: number
}

export interface Device {
  deviceId: string
  userId: string
  deviceName: string
  publicSigningKey: string
  publicAgreementKey: string
  verified: boolean
  createdAt: number
  lastSeen: number
}

export interface Conversation {
  conversationId: string
  participantIds: string[]
  createdAt: number
  name?: string
}

export interface Message {
  messageId: string
  conversationId: string
  senderDeviceId: string
  senderUserId: string
  ciphertext: string
  nonce: string
  timestamp: number
  messageCounter: number
  headerSecret: string
  status: "pending" | "sent" | "delivered" | "read"
  createdAt: number
}

export interface ReadReceipt {
  messageId: string
  readBy: string
  deviceId: string
  timestamp: number
}

export interface DeliveryQueue {
  queueId: string
  userId: string
  message: Message
  retryCount: number
  nextRetry: number
  createdAt: number
}

// Simulated in-memory database
export const db = {
  users: new Map<string, User>(),
  devices: new Map<string, Device[]>(),
  conversations: new Map<string, Conversation>(),
  messages: new Map<string, Message[]>(),
  receipts: new Map<string, ReadReceipt[]>(),
  queue: new Map<string, DeliveryQueue[]>(),

  createUser: async (username: string, displayName: string): Promise<User> => {
    const user: User = {
      userId: generateUUID(),
      username,
      displayName,
      createdAt: Date.now(),
    }
    db.users.set(user.userId, user)
    return user
  },

  registerDevice: async (userId: string, device: Device): Promise<void> => {
    const devices = db.devices.get(userId) || []
    devices.push(device)
    db.devices.set(userId, devices)
  },

  createConversation: async (participantIds: string[], name?: string): Promise<Conversation> => {
    const conversation: Conversation = {
      conversationId: generateUUID(),
      participantIds,
      createdAt: Date.now(),
      name,
    }
    db.conversations.set(conversation.conversationId, conversation)
    return conversation
  },

  storeMessage: async (message: Message): Promise<void> => {
    const messages = db.messages.get(message.conversationId) || []
    messages.push(message)
    db.messages.set(message.conversationId, messages)
  },

  storeReceipt: async (receipt: ReadReceipt): Promise<void> => {
    const receipts = db.receipts.get(receipt.messageId) || []
    receipts.push(receipt)
    db.receipts.set(receipt.messageId, receipts)
  },

  addToQueue: async (userId: string, message: Message): Promise<void> => {
    const queued: DeliveryQueue = {
      queueId: generateUUID(),
      userId,
      message,
      retryCount: 0,
      nextRetry: Date.now() + 1000,
      createdAt: Date.now(),
    }
    const queue = db.queue.get(userId) || []
    queue.push(queued)
    db.queue.set(userId, queue)
  },
}

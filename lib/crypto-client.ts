"use client"

// Client-side crypto context and state management
import { createContext, useContext } from "react"
import type { DeviceKeys, SessionKey, EncryptedMessage } from "./crypto"

export interface CryptoContextType {
  deviceKeys: DeviceKeys | null
  sessions: Map<string, SessionKey>
  generateKeys: () => Promise<void>
  establishSession: (recipientId: string) => Promise<void>
  encryptMessage: (text: string, recipientId: string) => Promise<EncryptedMessage>
  decryptMessage: (message: EncryptedMessage) => Promise<string>
  isReady: boolean
}

export const CryptoContext = createContext<CryptoContextType | null>(null)

export const useCrypto = () => {
  const context = useContext(CryptoContext)
  if (!context) {
    throw new Error("useCrypto must be used within CryptoProvider")
  }
  return context
}

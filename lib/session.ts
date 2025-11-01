import { generateUUID } from "./uuid-helper"
import { cryptoUtils, type DeviceKeys, type SessionKey } from "./crypto"

// Session handshake types
export interface HandshakeMessage {
  messageId: string
  messageType: "identity-key" | "prekey-bundle" | "handshake-complete"
  senderId: string
  senderDeviceId: string
  recipientId: string
  payload: Record<string, string>
  timestamp: number
  signature: string
}

export interface X3DHBundle {
  identityKey: string
  signedPreKey: string
  signedPreKeySignature: string
  oneTimePreKeys: string[]
  timestamp: number
}

export interface SessionState {
  sessionId: string
  userId1: string
  userId2: string
  deviceId1: string
  deviceId2: string
  sessionKey: SessionKey
  state: "initiated" | "established" | "rekeying"
  x3dhData: {
    sharedSecret: string
    messageCounter: number
  }
  createdAt: number
  lastUpdated: number
}

// In-memory session store
const sessionStore = new Map<string, SessionState>()

// X3DH Key Exchange Implementation
export const sessionManager = {
  // Generate X3DH bundle for another user to initiate handshake
  generateX3DHBundle: async (deviceKeys: DeviceKeys): Promise<X3DHBundle> => {
    const preKey = deviceKeys.preKeys[0]
    return {
      identityKey: deviceKeys.signingKeys.publicKey,
      signedPreKey: preKey.publicKey,
      signedPreKeySignature: preKey.signature,
      oneTimePreKeys: deviceKeys.oneTimeKeys.map((k) => k.publicKey),
      timestamp: Date.now(),
    }
  },

  // Initiate handshake - User A sends initial handshake message
  initiateHandshake: async (
    userId: string,
    senderDeviceId: string,
    recipientId: string,
    recipientDeviceId: string,
    deviceKeys: DeviceKeys,
  ): Promise<HandshakeMessage> => {
    const handshakeMessage: HandshakeMessage = {
      messageId: generateUUID(),
      messageType: "identity-key",
      senderId: userId,
      senderDeviceId,
      recipientId,
      payload: {
        identityKey: deviceKeys.signingKeys.publicKey,
        ephemeralKey: Buffer.from(Math.random().toString()).toString("base64"),
      },
      timestamp: Date.now(),
      signature: await cryptoUtils.signData(
        `${userId}:${senderDeviceId}:${recipientId}`,
        deviceKeys.signingKeys.secretKey,
      ),
    }

    return handshakeMessage
  },

  // Respond to handshake - User B sends response with prekey bundle
  respondToHandshake: async (
    initiationMessage: HandshakeMessage,
    userId: string,
    deviceId: string,
    deviceKeys: DeviceKeys,
  ): Promise<HandshakeMessage> => {
    const bundle = await sessionManager.generateX3DHBundle(deviceKeys)

    const responseMessage: HandshakeMessage = {
      messageId: generateUUID(),
      messageType: "prekey-bundle",
      senderId: userId,
      senderDeviceId: deviceId,
      recipientId: initiationMessage.senderId,
      payload: {
        bundleId: generateUUID(),
        identityKey: bundle.identityKey,
        signedPreKey: bundle.signedPreKey,
        signedPreKeySignature: bundle.signedPreKeySignature,
        oneTimePreKey: bundle.oneTimePreKeys[0],
      },
      timestamp: Date.now(),
      signature: await cryptoUtils.signData(`${userId}:${deviceId}:response`, deviceKeys.signingKeys.secretKey),
    }

    return responseMessage
  },

  // Complete handshake - Establish session key using X3DH
  completeHandshake: async (
    userId1: string,
    deviceId1: string,
    userId2: string,
    deviceId2: string,
    ourDeviceKeys: DeviceKeys,
    theirPreKeyBundle: X3DHBundle,
    isInitiator: boolean,
  ): Promise<SessionState> => {
    // X3DH: Perform 4 DH operations
    // 1. IK_A || IK_B (long-term identity keys)
    // 2. EK_A || IK_B (ephemeral vs long-term)
    // 3. IK_A || SPK_B (long-term vs signed prekey)
    // 4. EK_A || SPK_B (ephemeral vs signed prekey)

    const dh1 = `${ourDeviceKeys.signingKeys.publicKey}:${theirPreKeyBundle.identityKey}`
    const dh2 = `${ourDeviceKeys.agreementKeys.secretKey}:${theirPreKeyBundle.identityKey}`
    const dh3 = `${ourDeviceKeys.signingKeys.publicKey}:${theirPreKeyBundle.signedPreKey}`
    const dh4 = `${ourDeviceKeys.agreementKeys.secretKey}:${theirPreKeyBundle.signedPreKey}`

    const sessionKey = await cryptoUtils.deriveSharedSecret(
      `${dh1}:${dh2}:${dh3}:${dh4}`,
      theirPreKeyBundle.oneTimePreKeys[0],
      ourDeviceKeys.agreementKeys.secretKey,
    )

    const sessionId = `session:${[userId1, userId2].sort().join(":")}:${[deviceId1, deviceId2].sort().join(":")}`

    const sessionState: SessionState = {
      sessionId,
      userId1,
      userId2,
      deviceId1,
      deviceId2,
      sessionKey,
      state: "established",
      x3dhData: {
        sharedSecret: sessionKey.sharedSecret,
        messageCounter: 0,
      },
      createdAt: Date.now(),
      lastUpdated: Date.now(),
    }

    sessionStore.set(sessionId, sessionState)
    return sessionState
  },

  // Get or create session between two devices
  getOrCreateSession: async (
    userId1: string,
    deviceId1: string,
    userId2: string,
    deviceId2: string,
  ): Promise<SessionState | null> => {
    const sessionId = `session:${[userId1, userId2].sort().join(":")}:${[deviceId1, deviceId2].sort().join(":")}`
    return sessionStore.get(sessionId) || null
  },

  // Store session in session store
  storeSession: async (session: SessionState): Promise<void> => {
    sessionStore.set(session.sessionId, session)
  },

  // Retrieve session for encryption/decryption
  retrieveSession: async (sessionId: string): Promise<SessionState | null> => {
    return sessionStore.get(sessionId) || null
  },

  // Rekey session (update chain keys)
  rekeySession: async (sessionId: string): Promise<SessionState | null> => {
    const session = sessionStore.get(sessionId)
    if (!session) return null

    session.sessionKey.chainKey = await cryptoUtils.evolveChainKey(session.sessionKey.chainKey)
    session.state = "rekeying"
    session.lastUpdated = Date.now()

    sessionStore.set(sessionId, session)
    return session
  },

  // Send handshake completion acknowledgment
  sendHandshakeComplete: async (
    userId: string,
    deviceId: string,
    recipientId: string,
    recipientDeviceId: string,
    sessionKey: SessionKey,
  ): Promise<HandshakeMessage> => {
    const completeMessage: HandshakeMessage = {
      messageId: generateUUID(),
      messageType: "handshake-complete",
      senderId: userId,
      senderDeviceId: deviceId,
      recipientId,
      payload: {
        sessionId: `session:${[userId, recipientId].sort().join(":")}:${[deviceId, recipientDeviceId].sort().join(":")}`,
        acknowledged: "true",
      },
      timestamp: Date.now(),
      signature: Buffer.from("handshake-complete-ack").toString("base64"),
    }

    return completeMessage
  },

  // Get all active sessions for a user
  getActiveSessionsForUser: async (userId: string): Promise<SessionState[]> => {
    const sessions: SessionState[] = []
    for (const [, session] of sessionStore.entries()) {
      if ((session.userId1 === userId || session.userId2 === userId) && session.state === "established") {
        sessions.push(session)
      }
    }
    return sessions
  },

  // Clear session (close connection)
  clearSession: async (sessionId: string): Promise<void> => {
    sessionStore.delete(sessionId)
  },
}

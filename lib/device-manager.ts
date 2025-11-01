import { generateUUID } from "./uuid-helper"
import { cryptoUtils, type DeviceKeys } from "./crypto"
import { db, type Device as DBDevice } from "./db"
import { v4 as uuidv4 } from "uuid" // Declare uuidv4 variable

export interface DeviceInfo {
  deviceId: string
  userId: string
  deviceName: string
  deviceType: "mobile" | "desktop" | "web" | "tablet"
  publicSigningKey: string
  publicAgreementKey: string
  deviceFingerprint: string
  verified: boolean
  trustedAt?: number
  createdAt: number
  lastSeen: number
  isCurrentDevice: boolean
}

export interface DeviceSync {
  syncId: string
  deviceId: string
  userId: string
  action: "device-added" | "device-verified" | "device-removed" | "keys-rotated"
  payload: Record<string, any>
  timestamp: number
  signature: string
}

export interface KeyRotationSchedule {
  deviceId: string
  lastRotation: number
  nextRotation: number
  rotationIntervalMs: number
}

// Device registry
const deviceRegistry = new Map<string, DeviceInfo[]>()
const deviceSyncQueue = new Map<string, DeviceSync[]>()
const keyRotationSchedules = new Map<string, KeyRotationSchedule>()

export const deviceManager = {
  // Register a new device
  registerDevice: async (
    userId: string,
    deviceName: string,
    deviceType: "mobile" | "desktop" | "web" | "tablet",
    deviceKeys: DeviceKeys,
    isCurrentDevice = false,
  ): Promise<DeviceInfo> => {
    const deviceFingerprint = await deviceManager.generateDeviceFingerprint(deviceKeys)

    const deviceInfo: DeviceInfo = {
      deviceId: deviceKeys.deviceId,
      userId,
      deviceName,
      deviceType,
      publicSigningKey: deviceKeys.signingKeys.publicKey,
      publicAgreementKey: deviceKeys.agreementKeys.publicKey,
      deviceFingerprint,
      verified: isCurrentDevice, // Current device is auto-verified
      trustedAt: isCurrentDevice ? Date.now() : undefined,
      createdAt: Date.now(),
      lastSeen: Date.now(),
      isCurrentDevice,
    }

    // Store in registry
    const userDevices = deviceRegistry.get(userId) || []
    userDevices.push(deviceInfo)
    deviceRegistry.set(userId, userDevices)

    // Store in database
    const dbDevice: DBDevice = {
      deviceId: deviceInfo.deviceId,
      userId,
      deviceName,
      publicSigningKey: deviceInfo.publicSigningKey,
      publicAgreementKey: deviceInfo.publicAgreementKey,
      verified: deviceInfo.verified,
      createdAt: deviceInfo.createdAt,
      lastSeen: deviceInfo.lastSeen,
    }
    await db.registerDevice(userId, dbDevice)

    // Queue sync event to other devices
    await deviceManager.queueDeviceSync(userId, deviceInfo.deviceId, "device-added", {
      deviceId: deviceInfo.deviceId,
      deviceName,
      deviceType,
      deviceFingerprint,
    })

    // Schedule key rotation
    await deviceManager.scheduleKeyRotation(deviceInfo.deviceId, 30 * 24 * 60 * 60 * 1000) // 30 days

    return deviceInfo
  },

  // Verify a device (user confirms new device on existing device)
  verifyDevice: async (userId: string, deviceId: string, approvedByDeviceId: string): Promise<DeviceInfo | null> => {
    const userDevices = deviceRegistry.get(userId)
    if (!userDevices) return null

    const device = userDevices.find((d) => d.deviceId === deviceId)
    if (!device) return null

    device.verified = true
    device.trustedAt = Date.now()

    // Queue verification sync
    await deviceManager.queueDeviceSync(userId, approvedByDeviceId, "device-verified", {
      deviceId,
      verifiedAt: Date.now(),
      approvedByDeviceId,
    })

    return device
  },

  // Remove a device
  removeDevice: async (userId: string, deviceId: string, removedByDeviceId: string): Promise<boolean> => {
    const userDevices = deviceRegistry.get(userId)
    if (!userDevices) return false

    const index = userDevices.findIndex((d) => d.deviceId === deviceId)
    if (index === -1) return false

    userDevices.splice(index, 1)

    // Queue removal sync
    await deviceManager.queueDeviceSync(userId, removedByDeviceId, "device-removed", {
      deviceId,
      removedAt: Date.now(),
    })

    return true
  },

  // Get all devices for a user
  getUserDevices: async (userId: string): Promise<DeviceInfo[]> => {
    return deviceRegistry.get(userId) || []
  },

  // Get verified devices for a user (for encryption)
  getVerifiedDevices: async (userId: string): Promise<DeviceInfo[]> => {
    const devices = await deviceManager.getUserDevices(userId)
    return devices.filter((d) => d.verified)
  },

  // Get a specific device
  getDevice: async (deviceId: string): Promise<DeviceInfo | null> => {
    for (const [, devices] of deviceRegistry.entries()) {
      const device = devices.find((d) => d.deviceId === deviceId)
      if (device) return device
    }
    return null
  },

  // Update device last seen timestamp
  updateDeviceLastSeen: async (deviceId: string): Promise<void> => {
    for (const [, devices] of deviceRegistry.entries()) {
      const device = devices.find((d) => d.deviceId === deviceId)
      if (device) {
        device.lastSeen = Date.now()
        break
      }
    }
  },

  // Generate device fingerprint (for manual verification)
  generateDeviceFingerprint: async (deviceKeys: DeviceKeys): Promise<string> => {
    const fingerprintData = `${deviceKeys.signingKeys.publicKey}:${deviceKeys.agreementKeys.publicKey}`
    // Simplified fingerprint - in production use SHA256 truncated to 8 bytes
    return Buffer.from(fingerprintData).toString("base64").substring(0, 16).toUpperCase()
  },

  // Schedule key rotation for a device
  scheduleKeyRotation: async (
    deviceId: string,
    rotationIntervalMs: number = 30 * 24 * 60 * 60 * 1000,
  ): Promise<void> => {
    const schedule: KeyRotationSchedule = {
      deviceId,
      lastRotation: Date.now(),
      nextRotation: Date.now() + rotationIntervalMs,
      rotationIntervalMs,
    }
    keyRotationSchedules.set(deviceId, schedule)
  },

  // Check if device needs key rotation
  needsKeyRotation: async (deviceId: string): Promise<boolean> => {
    const schedule = keyRotationSchedules.get(deviceId)
    if (!schedule) return false
    return Date.now() >= schedule.nextRotation
  },

  // Perform key rotation
  rotateKeys: async (
    userId: string,
    deviceId: string,
    newDeviceKeys: DeviceKeys,
    rotatedByDeviceId: string,
  ): Promise<boolean> => {
    const device = await deviceManager.getDevice(deviceId)
    if (!device) return false

    // Update device with new keys
    device.publicSigningKey = newDeviceKeys.signingKeys.publicKey
    device.publicAgreementKey = newDeviceKeys.agreementKeys.publicKey

    // Queue key rotation sync
    await deviceManager.queueDeviceSync(userId, rotatedByDeviceId, "keys-rotated", {
      deviceId,
      newPublicSigningKey: newDeviceKeys.signingKeys.publicKey,
      newPublicAgreementKey: newDeviceKeys.agreementKeys.publicKey,
      rotatedAt: Date.now(),
    })

    // Reschedule rotation
    await deviceManager.scheduleKeyRotation(deviceId)

    return true
  },

  // Queue a sync event for other devices
  queueDeviceSync: async (
    userId: string,
    sourceDeviceId: string,
    action: DeviceSync["action"],
    payload: Record<string, any>,
  ): Promise<void> => {
    const syncEvent: DeviceSync = {
      syncId: generateUUID(),
      deviceId: sourceDeviceId,
      userId,
      action,
      payload,
      timestamp: Date.now(),
      signature: Buffer.from(`${action}:${sourceDeviceId}`).toString("base64"),
    }

    const userSyncQueue = deviceSyncQueue.get(userId) || []
    userSyncQueue.push(syncEvent)
    deviceSyncQueue.set(userId, userSyncQueue)
  },

  // Get pending sync events for a device
  getPendingSyncEvents: async (userId: string, forDeviceId: string): Promise<DeviceSync[]> => {
    const syncQueue = deviceSyncQueue.get(userId) || []
    // Return all syncs except those from this device
    return syncQueue.filter((s) => s.deviceId !== forDeviceId)
  },

  // Acknowledge sync event
  acknowledgeSyncEvent: async (userId: string, syncId: string): Promise<void> => {
    const syncQueue = deviceSyncQueue.get(userId) || []
    const index = syncQueue.findIndex((s) => s.syncId === syncId)
    if (index > -1) {
      syncQueue.splice(index, 1)
    }
  },

  // Establish cross-device trust chain
  trustDevice: async (
    userId: string,
    deviceId: string,
    trustedByDeviceId: string,
    trustedByDeviceKeys: DeviceKeys,
  ): Promise<string> => {
    const trustToken = uuidv4()

    // Sign the trust token with the trusting device's key
    const signature = await cryptoUtils.signData(
      `${deviceId}:${trustedByDeviceId}:${trustToken}`,
      trustedByDeviceKeys.signingKeys.secretKey,
    )

    // Store trust relationship
    await deviceManager.queueDeviceSync(userId, trustedByDeviceId, "device-verified", {
      deviceId,
      trustToken,
      signature,
    })

    return signature
  },

  // Get all device sync statistics
  getDeviceSyncStats: (userId: string) => {
    const devices = deviceRegistry.get(userId) || []
    const syncQueue = deviceSyncQueue.get(userId) || []

    return {
      totalDevices: devices.length,
      verifiedDevices: devices.filter((d) => d.verified).length,
      unverifiedDevices: devices.filter((d) => !d.verified).length,
      onlineDevices: devices.filter((d) => Date.now() - d.lastSeen < 5 * 60 * 1000).length, // Last 5 min
      pendingSyncEvents: syncQueue.length,
      devicesRequiringRotation: Array.from(keyRotationSchedules.values()).filter((s) => Date.now() >= s.nextRotation)
        .length,
    }
  },
}

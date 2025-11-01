# CipherChat - End-to-End Encrypted Chat System

A production-grade, fully encrypted chat application built with Next.js, React, and advanced cryptography. Implements industry-standard protocols for secure communication with multi-device support, offline capabilities, and real-time synchronization.

## System Architecture

### 1. Backend Infrastructure (`lib/db.ts`)
- **In-memory Database**: Simulated database with user, device, conversation, and message storage
- **Data Structures**: User profiles, device registration, conversation threads, encrypted messages
- **Queue Management**: Delivery queue system for message reliability

### 2. Cryptographic Layer

#### Core Crypto (`lib/crypto.ts`)
- **X3DH Key Exchange**: Extended Triple Diffie-Hellman for secure session establishment
- **Double Ratchet Algorithm**: Forward-secret message encryption
- **Key Derivation**: HKDF-based key generation from shared secrets
- **Encryption**: ChaCha20-Poly1305 AEAD cipher for authenticated encryption
- **Signing**: Ed25519 for digital signatures and identity verification

**Key Features:**
- Pre-key bundles for initial contact without prior key exchange
- Chain key evolution for forward secrecy within sessions
- Message counter for replay attack prevention
- Signed pre-keys and one-time pre-keys for authentication

#### Session Management (`lib/session.ts`)
- **Handshake Protocol**: Three-phase session establishment (initiation, response, completion)
- **Session State**: Tracks established sessions with encryption keys and counters
- **Chain Key Management**: Evolves keys with each message for forward secrecy
- **Rekeying Support**: Periodic key rotation for long-lived sessions

**Phases:**
1. **Initiation**: User A sends identity key to User B
2. **Response**: User B sends pre-key bundle with root key
3. **Completion**: Both parties derive shared session key using X3DH

### 3. Message Encryption Pipeline (`lib/message-pipeline.ts`)

Nine-step message processing:
1. **Validation**: Format and size checks
2. **Session Establishment**: Ensures encrypted session exists
3. **Preparation**: Structures plaintext with metadata
4. **Encryption**: Double Ratchet for confidentiality
5. **Queuing**: Stores in pipeline and database
6. **Transmission**: Sends encrypted to recipient
7. **Decryption**: Recovers plaintext with replay protection
8. **Delivery Receipts**: Tracks sent status
9. **Read Receipts**: Tracks read status

### 4. Device Management (`lib/device-manager.ts`)

**Multi-Device Support:**
- Device registration with unique fingerprints
- Cross-device trust establishment via cryptographic signatures
- Synchronized encryption keys across all trusted devices
- Device sync queue for state broadcasting

**Features:**
- Device fingerprints (base64 identity key hashes)
- Key rotation scheduling with configurable intervals
- Trust chain establishment between devices
- Device online status tracking
- Pending verification management

### 5. Offline Queue & Delivery (`lib/offline-queue.ts`)

**Offline Capability:**
- Message queueing during network outages
- Exponential backoff retry mechanism (1s → 60s)
- Automatic retry scheduling on connection restore
- Persistent storage via localStorage

**Queue States:**
- `pending`: Awaiting transmission
- `sending`: Currently being transmitted
- `sent`: Successfully sent to server
- `failed`: Failed after max retries
- `delivered`: Confirmed delivery to recipient

**Features:**
- Jittered exponential backoff to prevent thundering herd
- Max 5 retries per message
- localStorage persistence across browser sessions
- Network event listeners for automatic sync
- Manual retry capability for failed messages

### 6. React Components

#### ChatInterface (`components/chat-interface.tsx`)
- Main container with sidebar navigation
- Animated background with gradient effects
- Responsive mobile/desktop layout
- Device management panel toggle

#### ChatWindow (`components/chat-window.tsx`)
- Message display with smooth animations
- Real-time typing indicators
- Message status indicators (pending → sent → delivered → read)
- Offline/failed message indicators
- Input area with file/emoji support

#### ConversationList (`components/conversation-list.tsx`)
- Searchable conversation list
- Unread message badges
- Create new conversations
- Last message preview

#### DevicePanel (`components/device-panel.tsx`)
- Add new devices
- Verify device fingerprints
- Display device status (online/offline)
- Remove devices
- Copy fingerprints to clipboard

#### SystemStatusDashboard (`components/system-status-dashboard.tsx`)
- Real-time system monitoring
- Encryption engine status
- Active sessions count
- Queue statistics
- Network connectivity
- System health indicators

## Data Flow

### Message Sending
\`\`\`
User Input
  ↓
Validation
  ↓
Session Lookup/Establishment (X3DH)
  ↓
Encryption (Double Ratchet)
  ↓
Offline Queue (if offline)
  ↓
Network Transmission
  ↓
Status: pending → sent → delivered → read
\`\`\`

### Message Receiving
\`\`\`
Network Reception
  ↓
Decryption (Chain Key Evolution)
  ↓
Replay Protection (Message Counter)
  ↓
Display to User
  ↓
Delivery Receipt
  ↓
Read Receipt
\`\`\`

## Security Guarantees

1. **Confidentiality**: ChaCha20-Poly1305 ensures only intended recipient can decrypt
2. **Authenticity**: Ed25519 signatures verify sender identity
3. **Forward Secrecy**: Chain key evolution prevents compromise of past messages
4. **Replay Prevention**: Message counters prevent message reordering/duplication
5. **Device Verification**: Fingerprint comparison enables manual verification
6. **Multi-Device**: Synchronized keys across devices without central trust

## Performance Optimizations

- **Efficient Key Exchange**: Single round-trip X3DH for session establishment
- **Lazy Session Creation**: Sessions created on-demand
- **Chain Key Evolution**: O(1) per-message encryption overhead
- **Batched Transmission**: Multiple messages in single network request
- **localStorage Persistence**: Fast queue persistence without server round-trips

## Browser APIs Used

- `crypto.subtle`: Cryptographic operations
- `localStorage`: Persistent offline queue storage
- `navigator.onLine`: Network status detection
- `window.addEventListener('online'/'offline')`: Network event handling

## Configuration

All configurable parameters:
- `MAX_MESSAGE_SIZE`: 65536 bytes (64 KB)
- `MAX_QUEUE_RETRIES`: 5 attempts per message
- `RETRY_BASE_DELAY`: 1000 ms (1 second)
- `MAX_RETRY_DELAY`: 60000 ms (60 seconds)
- `KEY_ROTATION_INTERVAL`: 604800000 ms (7 days)

## Future Enhancements

1. **Group Messaging**: MLS (Messaging Layer Security) protocol
2. **Voice/Video Calls**: WebRTC integration with E2E encryption
3. **File Transfer**: Chunked encrypted file uploads
4. **Message Search**: Encrypted search without decryption
5. **Cloud Backup**: Encrypted backup with key management
6. **Mobile Apps**: Native iOS/Android implementations
7. **Blockchain Verification**: Tamper-proof message timestamps

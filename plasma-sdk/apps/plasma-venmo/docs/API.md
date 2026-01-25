# Plenmo API Reference

Complete API documentation for Plenmo's backend services. All endpoints use JSON request/response format.

## Base URL

- **Development:** `http://localhost:3005`
- **Production:** `https://plenmo.vercel.app`

## Authentication

Most endpoints require either:
- **User Address**: Passed as query parameter or request body
- **Bearer Token**: For secure endpoints (`Authorization: Bearer <API_AUTH_SECRET>`)

---

## Core Payment APIs

### Submit Transfer (Gasless EIP-3009)

Executes a gasless USDT0 transfer using a signed EIP-3009 authorization.

```
POST /api/submit-transfer
```

**Request Body:**
```json
{
  "from": "0x1234...sender",
  "to": "0x5678...recipient",
  "value": "1000000",
  "validAfter": 1706140800,
  "validBefore": 1706144400,
  "nonce": "0xabc123...32bytes",
  "v": 27,
  "r": "0x...",
  "s": "0x..."
}
```

| Field | Type | Description |
|-------|------|-------------|
| `from` | address | Sender's wallet address |
| `to` | address | Recipient's wallet address |
| `value` | string | Amount in smallest units (6 decimals for USDT0) |
| `validAfter` | number | Unix timestamp - authorization valid after |
| `validBefore` | number | Unix timestamp - authorization valid before |
| `nonce` | bytes32 | Unique nonce (random 32 bytes) |
| `v`, `r`, `s` | - | EIP-712 signature components |

**Success Response (200):**
```json
{
  "success": true,
  "txHash": "0x123...abc",
  "blockNumber": "12345678"
}
```

**Error Responses:**
| Status | Error | Cause |
|--------|-------|-------|
| 400 | "Missing required parameters" | Incomplete request body |
| 400 | "Amount is below the minimum of $0.01" | Amount < 10000 (0.01 USDT0) |
| 400 | "Amount exceeds the maximum of $10,000" | Amount > 10000000000 |
| 400 | "Authorization expired or not yet valid" | Current time outside validity window |
| 429 | "Rate limit exceeded" | Too many requests |
| 500 | "Transfer failed" | On-chain transaction reverted |

**Example:**
```typescript
// Client-side signing
const authorization = {
  from: userAddress,
  to: recipientAddress,
  value: parseUnits("10", 6).toString(), // $10 USDT0
  validAfter: Math.floor(Date.now() / 1000),
  validBefore: Math.floor(Date.now() / 1000) + 3600, // 1 hour
  nonce: generateNonce(), // random bytes32
};

const signature = await walletClient.signTypedData({
  domain: USDT0_EIP712_DOMAIN,
  types: TRANSFER_WITH_AUTHORIZATION_TYPES,
  primaryType: 'TransferWithAuthorization',
  message: authorization,
});

const { v, r, s } = parseSignature(signature);

const response = await fetch('/api/submit-transfer', {
  method: 'POST',
  body: JSON.stringify({ ...authorization, v, r, s }),
});
```

---

### Payment (Authenticated)

Process payments with bearer token authentication. Used for server-to-server calls.

```
POST /api/payment
```

**Headers:**
```
Authorization: Bearer <API_AUTH_SECRET>
```

**Request Body:**
```json
{
  "from": "0x1234...",
  "to": "0x5678...",
  "amount": "100.00",
  "validAfter": 1706140800,
  "validBefore": 1706144400,
  "nonce": "0x...",
  "signature": {
    "v": 27,
    "r": "0x...",
    "s": "0x..."
  },
  "method": "transfer"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `amount` | string | Human-readable amount (e.g., "100.00") |
| `method` | string | `"transfer"` or `"receive"` (EIP-3009 method) |

**Success Response (200):**
```json
{
  "success": true,
  "transactionHash": "0x...",
  "blockNumber": 12345678,
  "gasUsed": "65000",
  "from": "0x...",
  "to": "0x...",
  "amount": "100.00"
}
```

---

### Balance Check

Get USDT0 balance for any address.

```
GET /api/balance?address=0x1234...
```

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `address` | string | Yes | Wallet address to check |

**Success Response (200):**
```json
{
  "address": "0x1234...",
  "balance": "1000000000",
  "formattedBalance": "1000.00",
  "decimals": 6,
  "symbol": "USDT0",
  "name": "Tether USD (Plasma)",
  "timestamp": 1706140800000
}
```

---

## Payment Links

### Create Payment Link

Generate a shareable link that lets anyone pay you.

```
POST /api/payment-links
```

**Request Body:**
```json
{
  "creatorAddress": "0x1234...",
  "creatorEmail": "alice@example.com",
  "amount": "50.00",
  "memo": "Dinner last night",
  "expiresInDays": 30
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `creatorAddress` | address | Yes | Wallet receiving payments |
| `creatorEmail` | string | No | For notifications |
| `amount` | string | No | Fixed amount (omit for any amount) |
| `memo` | string | No | Description shown to payer |
| `expiresInDays` | number | No | Days until expiration (default: never) |

**Success Response (201):**
```json
{
  "success": true,
  "paymentLink": {
    "id": "clxyz123...",
    "creatorAddress": "0x1234...",
    "amount": 50.00,
    "currency": "USDT0",
    "memo": "Dinner last night",
    "status": "active",
    "expiresAt": "2024-02-25T00:00:00.000Z",
    "createdAt": "2024-01-25T12:00:00.000Z",
    "url": "https://plenmo.vercel.app/pay/clxyz123..."
  }
}
```

### List Payment Links

```
GET /api/payment-links?address=0x1234...&status=active
```

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `address` | string | Yes | Creator's wallet address |
| `status` | string | No | Filter: `active`, `paid`, `expired` |

**Success Response (200):**
```json
{
  "success": true,
  "paymentLinks": [
    {
      "id": "clxyz123...",
      "creatorAddress": "0x1234...",
      "amount": 50.00,
      "currency": "USDT0",
      "memo": "Dinner",
      "status": "active",
      "paidBy": null,
      "paidAt": null,
      "txHash": null,
      "expiresAt": "2024-02-25T00:00:00.000Z",
      "createdAt": "2024-01-25T12:00:00.000Z",
      "url": "https://plenmo.vercel.app/pay/clxyz123..."
    }
  ]
}
```

### Get Single Payment Link

```
GET /api/payment-links/[id]
```

Returns details for a specific payment link (used by the `/pay/[linkId]` page).

---

## Payment Requests

### Create Payment Request

Request money from someone via email, phone, or wallet address.

```
POST /api/requests
```

**Request Body:**
```json
{
  "fromAddress": "0x1234...",
  "fromEmail": "alice@example.com",
  "toIdentifier": "bob@example.com",
  "amount": "25.00",
  "memo": "Your share of the bill",
  "expiresInDays": 7
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `fromAddress` | address | Yes | Who is requesting payment |
| `fromEmail` | string | No | For display in notification |
| `toIdentifier` | string | Yes | Email, phone, or wallet address |
| `amount` | string | Yes | Amount to request |
| `memo` | string | No | Reason for request |
| `expiresInDays` | number | No | Days until expiration (default: 7) |

**Success Response (201):**
```json
{
  "success": true,
  "request": {
    "id": "clxyz456...",
    "fromAddress": "0x1234...",
    "toIdentifier": "bob@example.com",
    "toAddress": "0x5678...",
    "amount": 25.00,
    "currency": "USDT0",
    "memo": "Your share of the bill",
    "status": "pending",
    "expiresAt": "2024-02-01T12:00:00.000Z",
    "createdAt": "2024-01-25T12:00:00.000Z"
  }
}
```

### List Payment Requests

```
GET /api/requests?address=0x1234...&email=alice@example.com&type=all
```

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `address` | string | Yes | User's wallet address |
| `email` | string | No | Also check requests to this email |
| `type` | string | No | `sent`, `received`, or `all` (default) |

**Success Response (200):**
```json
{
  "success": true,
  "requests": {
    "sent": [
      {
        "id": "clxyz456...",
        "toIdentifier": "bob@example.com",
        "amount": 25.00,
        "status": "pending",
        "expiresAt": "2024-02-01T12:00:00.000Z"
      }
    ],
    "received": [
      {
        "id": "clxyz789...",
        "fromAddress": "0x9abc...",
        "fromEmail": "charlie@example.com",
        "amount": 15.00,
        "memo": "Coffee",
        "status": "pending"
      }
    ]
  }
}
```

### Update Request Status

```
PATCH /api/requests/[id]
```

**Request Body:**
```json
{
  "status": "paid",
  "txHash": "0x..."
}
```

### Resend Request Notification

```
POST /api/requests/[id]/resend
```

Resends the email notification to the recipient.

---

## Claims (Unregistered Recipients)

### Create Claim

Hold a payment for someone who doesn't have a wallet yet.

```
POST /api/claims
```

**Request Body:**
```json
{
  "senderAddress": "0x1234...",
  "senderEmail": "alice@example.com",
  "recipientEmail": "newuser@example.com",
  "authorization": {
    "from": "0x1234...",
    "to": "0xescrow...",
    "value": "10000000",
    "validAfter": 1706140800,
    "validBefore": 1708819200,
    "nonce": "0x...",
    "v": 27,
    "r": "0x...",
    "s": "0x..."
  },
  "amount": "10.00",
  "memo": "Welcome gift!"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "claim": {
    "id": "clxyz111...",
    "senderAddress": "0x1234...",
    "recipientEmail": "newuser@example.com",
    "amount": 10.00,
    "currency": "USDT0",
    "memo": "Welcome gift!",
    "status": "pending",
    "expiresAt": "2024-02-25T12:00:00.000Z",
    "createdAt": "2024-01-25T12:00:00.000Z"
  },
  "claimUrl": "https://plenmo.vercel.app/claim/abc123xyz...",
  "token": "abc123xyz..."
}
```

**Important:** The `token` is only returned once at creation. Store it securely or send it to the recipient.

### List Claims

```
GET /api/claims?address=0x1234...&status=pending
```

Returns claims created by the sender.

### Execute Claim

```
POST /api/claims/[token]
```

**Request Body:**
```json
{
  "claimerAddress": "0x5678..."
}
```

Executes the stored authorization to transfer funds to the claimer.

---

## Contacts

### List Contacts

```
GET /api/contacts?address=0x1234...&q=bob&favorites=true&limit=50&offset=0
```

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `address` | string | Yes | Owner's wallet address |
| `q` | string | No | Search query (name, email, phone) |
| `favorites` | boolean | No | Filter to favorites only |
| `limit` | number | No | Results per page (default: 100, max: 500) |
| `offset` | number | No | Pagination offset |

**Success Response (200):**
```json
{
  "success": true,
  "contacts": [
    {
      "id": "clxyz222...",
      "ownerAddress": "0x1234...",
      "contactAddress": "0x5678...",
      "name": "Bob Smith",
      "email": "bob@example.com",
      "phone": "+1234567890",
      "isFavorite": true,
      "lastPayment": "2024-01-20T15:00:00.000Z"
    }
  ],
  "pagination": {
    "limit": 100,
    "offset": 0,
    "total": 15,
    "hasMore": false
  }
}
```

### Create Contact

```
POST /api/contacts
```

**Request Body:**
```json
{
  "ownerAddress": "0x1234...",
  "contactAddress": "0x5678...",
  "name": "Bob Smith",
  "email": "bob@example.com",
  "phone": "+1234567890",
  "isFavorite": false
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `ownerAddress` | address | Yes | Your wallet address |
| `contactAddress` | address | No* | Contact's wallet |
| `name` | string | Yes | Display name (max 100 chars) |
| `email` | string | No* | Contact's email |
| `phone` | string | No* | Contact's phone |
| `isFavorite` | boolean | No | Add to favorites |

*At least one of `contactAddress`, `email`, or `phone` is required.

### Update/Delete Contact

```
PATCH /api/contacts/[id]
DELETE /api/contacts/[id]
```

---

## Social Feed

### Get Activity Feed

```
GET /api/feed?limit=20&offset=0&address=0x1234...
```

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `limit` | number | No | Items per page (default: 20, max: 100) |
| `offset` | number | No | Pagination offset |
| `address` | string | No | User address (shows their private activities) |

**Success Response (200):**
```json
{
  "success": true,
  "feed": [
    {
      "id": "act123...",
      "type": "payment",
      "user": {
        "name": "Alice",
        "address": "0x1234..."
      },
      "counterparty": {
        "name": "Bob",
        "address": "0x5678..."
      },
      "amount": "25.00",
      "memo": "Pizza night 🍕",
      "timestamp": 1706140800000,
      "likes": 5,
      "isLiked": false,
      "visibility": "public"
    }
  ],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total": 150,
    "hasMore": true
  }
}
```

### Like/Unlike Activity

```
POST /api/feed
```

**Request Body:**
```json
{
  "activityId": "act123...",
  "userAddress": "0x1234..."
}
```

**Success Response (200):**
```json
{
  "success": true,
  "activityId": "act123...",
  "isLiked": true,
  "likes": 6
}
```

---

## Bridge API

### Get Bridge Quote

Get quotes from multiple bridge providers to convert tokens to USDT0 on Plasma.

```
POST /api/bridge/quote
```

**Request Body:**
```json
{
  "fromChainId": 1,
  "fromToken": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  "fromAmount": "1000000000",
  "recipientAddress": "0x1234...",
  "userAddress": "0x5678..."
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `fromChainId` | number | Yes | Source chain ID (1=Ethereum, 137=Polygon, etc.) |
| `fromToken` | address | Yes | Token address on source chain |
| `fromAmount` | string | Yes | Amount in smallest units |
| `recipientAddress` | address | Yes | Destination on Plasma |
| `userAddress` | address | No | Source wallet (defaults to recipient) |

**Success Response (200):**
```json
{
  "best": {
    "provider": "stargate",
    "estimatedOutput": "999500000",
    "fee": "500000",
    "estimatedTime": 180,
    "route": {...}
  },
  "all": [...],
  "errors": [],
  "timestamp": "2024-01-25T12:00:00.000Z"
}
```

### Get Supported Chains/Tokens

```
GET /api/bridge/quote
```

**Response (200):**
```json
{
  "chains": [
    { "chainId": 1, "name": "Ethereum", "icon": "..." },
    { "chainId": 137, "name": "Polygon", "icon": "..." },
    { "chainId": 42161, "name": "Arbitrum", "icon": "..." }
  ],
  "tokens": [
    { "symbol": "USDC", "name": "USD Coin", "decimals": 6 },
    { "symbol": "USDT", "name": "Tether USD", "decimals": 6 }
  ]
}
```

---

## User Settings

### Get User Settings

```
GET /api/user-settings?address=0x1234...
```

Auto-creates settings with a referral code if they don't exist.

**Success Response (200):**
```json
{
  "settings": {
    "id": "clxyz333...",
    "walletAddress": "0x1234...",
    "displayName": "Alice",
    "email": "alice@example.com",
    "phone": null,
    "referralCode": "ALICE123",
    "totalReferred": 5,
    "preferences": "{\"theme\":\"dark\"}",
    "createdAt": "2024-01-15T10:00:00.000Z"
  }
}
```

### Update User Settings

```
POST /api/user-settings
```

**Request Body:**
```json
{
  "walletAddress": "0x1234...",
  "displayName": "Alice Smith",
  "email": "alice@example.com",
  "phone": "+1234567890",
  "preferences": {
    "theme": "dark",
    "notifications": true
  }
}
```

---

## Referrals

### Get Referral Stats

```
GET /api/referrals?address=0x1234...
```

**Success Response (200):**
```json
{
  "stats": {
    "totalReferred": 10,
    "pendingRewards": 3,
    "paidRewards": 7,
    "totalEarned": 0.70
  },
  "referrals": [
    {
      "id": "ref123...",
      "refereeAddress": "0x5678...",
      "source": "share_link",
      "rewardAmount": 0.10,
      "rewardStatus": "paid",
      "createdAt": "2024-01-20T10:00:00.000Z"
    }
  ],
  "referredBy": "0x9abc..."
}
```

### Create Referral

```
POST /api/referrals
```

**Request Body:**
```json
{
  "referrerAddress": "0x1234...",
  "refereeAddress": "0x5678...",
  "source": "share_link",
  "shareLinkId": "link123..."
}
```

---

## Share Links

### Create Share Link

```
POST /api/share-links
```

**Request Body:**
```json
{
  "creatorAddress": "0x1234...",
  "type": "referral",
  "targetUrl": "https://plenmo.vercel.app/invite",
  "targetData": { "referralCode": "ALICE123" },
  "channel": "twitter"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "link": {
    "id": "clxyz444...",
    "shortCode": "abc12345",
    "type": "referral",
    "status": "active"
  },
  "shareUrl": "https://plasma.to/s/abc12345"
}
```

---

## Notifications

### Send Notification

```
POST /api/notify
```

**Request Body:**
```json
{
  "notificationId": "notif123..."
}
```

Sends the email for a queued notification (created by claims, requests, etc.).

---

## Error Codes

All endpoints use consistent error responses:

```json
{
  "error": "Human-readable error message"
}
```

| Status | Meaning |
|--------|---------|
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Missing/invalid auth |
| 404 | Not Found - Resource doesn't exist |
| 409 | Conflict - Resource already exists |
| 429 | Rate Limited - Too many requests |
| 500 | Server Error - Internal failure |
| 503 | Service Unavailable - Service not configured |

---

## Rate Limits

| Endpoint Category | Limit | Window |
|-------------------|-------|--------|
| Read operations | 100 req | 60 sec |
| Payment operations | 10 req | 60 sec |
| Bridge quotes | 30 req | 60 sec |

Rate limit headers are included in responses:
- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset`

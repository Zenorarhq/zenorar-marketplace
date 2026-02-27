# Zenorar Script Licensing System
## Complete Implementation Guide

**Document Version:** 1.0
**Date:** February 2026
**Prepared for:** Zenorar Marketplace

---

## Table of Contents

1. [Overview](#1-overview)
2. [License Types](#2-license-types)
3. [Anti-Piracy & Protection](#3-anti-piracy--protection)
4. [License Validation](#4-license-validation)
5. [Domain/Identifier Binding](#5-domainidentifier-binding)
6. [Secure Storage & Delivery](#6-secure-storage--delivery)
7. [Support System Integration](#7-support-system-integration)
8. [Database Schema](#8-database-schema)
9. [API Endpoints](#9-api-endpoints)
10. [Implementation Phases](#10-implementation-phases)
11. [Comparison with ThemeForest](#11-comparison-with-themeforest)
12. [Gift Card Storage & Management System](#12-gift-card-storage--management-system)
13. [eSIM System - Sourcing, Integration & Delivery](#13-esim-system---sourcing-integration--delivery)
14. [Virtual Numbers System - Sourcing, Integration & Delivery](#14-virtual-numbers-system---sourcing-integration--delivery)
15. [Full Product Comparison Matrix](#15-full-product-comparison-matrix)

---

## 1. Overview

This document outlines the complete licensing system for selling scripts (web scripts, extensions, mobile and desktop apps) on Zenorar Marketplace.

### Product Types Covered
- Web Scripts (PHP, Node.js, Python, etc.)
- Browser Extensions (Chrome, Firefox, etc.)
- Mobile Apps (iOS, Android, React Native, Flutter)
- Desktop Apps (Electron, native apps)

### Core Principles
- License validation without requiring constant internet
- Tamper-proof license verification
- Support duration tracking
- Domain/identifier binding
- Anti-piracy measures

---

## 2. License Types

### License Comparison Table

| Feature | Normal License | Extended License | Pro License |
|---------|---------------|------------------|-------------|
| **Price** | Base price | ~1.5x base | ~3x base |
| **Domains/Identifiers** | 1 | 1 | 3 |
| **Support Duration** | 6 months | 12 months | 36 months |
| **Updates** | Lifetime | Lifetime | Lifetime |
| **Download Access** | Lifetime | Lifetime | Lifetime |
| **Use Case** | Single project | Single project | Multiple projects / Agency |

### License Restrictions

**Normal & Extended License:**
- Script can only be installed on ONE domain/machine/identifier
- Cannot be resold or redistributed
- Cannot be used in SaaS products (unless explicitly allowed)

**Pro License:**
- Script can be installed on up to THREE domains/machines/identifiers
- Suitable for agencies managing multiple client sites
- Cannot be resold or redistributed

---

## 3. Anti-Piracy & Protection

### 3.1 Code Obfuscation

Before storing scripts, apply obfuscation to make reverse engineering difficult:

```javascript
// Tools for different languages:
// JavaScript: javascript-obfuscator, terser
// PHP: IonCube, Zend Guard, SourceGuardian
// Python: PyArmor, Cython
// .NET: ConfuserEx, Dotfuscator
```

**Recommended JavaScript obfuscation settings:**
```javascript
const JavaScriptObfuscator = require('javascript-obfuscator');

const obfuscated = JavaScriptObfuscator.obfuscate(code, {
  compact: true,
  controlFlowFlattening: true,
  deadCodeInjection: true,
  stringArray: true,
  stringArrayEncoding: ['base64'],
  stringArrayThreshold: 0.75,
  transformObjectKeys: true,
  unicodeEscapeSequence: true
});
```

### 3.2 License Key System

**Format:** `ZNRSCR-XXXX-XXXX-XXXX-XXXX`

**Generation algorithm:**
```typescript
function generateLicenseKey(orderId: string, productId: string): string {
  const prefix = 'ZNRSCR';
  const data = `${orderId}-${productId}-${Date.now()}`;
  const hash = crypto.createHash('sha256').update(data).digest('hex');

  // Format: ZNRSCR-XXXX-XXXX-XXXX-XXXX (20 chars from hash)
  const segments = [];
  for (let i = 0; i < 4; i++) {
    segments.push(hash.substring(i * 4, (i + 1) * 4).toUpperCase());
  }

  return `${prefix}-${segments.join('-')}`;
}
```

### 3.3 Watermarking (Buyer Identification)

Inject unique buyer identifiers into downloaded code:

```javascript
// Injected at download time
/*
 * Licensed to: john@example.com
 * License Key: ZNRSCR-A1B2-C3D4-E5F6-G7H8
 * Purchase Date: 2026-02-24
 *
 * Unauthorized distribution is prohibited.
 * Trace ID: 8f4a2b1c-9d3e-4f5a-b6c7-d8e9f0a1b2c3
 */
```

If a pirated copy is found, the trace ID can identify the source.

### 3.4 Multiple Verification Points

Spread license checks throughout the code (not just at startup):

```javascript
// File: init.js
function initialize() {
  if (!_verifyIntegrity()) return showLicenseError();
  // ... initialization code
}

// File: core.js (hidden check)
function processData(data) {
  _c(); // Obfuscated license check
  // ... data processing
}

// File: api.js (another hidden check)
function callAPI() {
  if (!window._lv) return; // License verification flag
  // ... API call
}
```

---

## 4. License Validation

### 4.1 Online Validation (Phone-Home)

Best for web apps that have internet access:

```javascript
// Injected into the script at download time
const LICENSE = {
  key: "ZNRSCR-XXXX-XXXX-XXXX-XXXX",
  purchaseDate: "2026-02-24",
  supportExpires: "2026-08-24"
};

async function verifyLicense() {
  try {
    const response = await fetch('https://api.zenorar.com/licenses/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: LICENSE.key,
        domain: window.location.hostname,
        version: '1.0.0'
      })
    });

    const data = await response.json();

    if (!data.valid) {
      handleInvalidLicense(data.reason);
      return false;
    }

    return true;
  } catch (error) {
    // Network error - use offline validation
    return verifyOffline();
  }
}

// Run on startup
verifyLicense();

// Run periodically (every 24 hours)
setInterval(verifyLicense, 24 * 60 * 60 * 1000);
```

### 4.2 Offline Validation (Signed License)

For scripts that may not have internet access:

**Step 1: Generate signed license at purchase**
```typescript
// Server-side (Node.js)
import crypto from 'crypto';

const PRIVATE_KEY = process.env.LICENSE_PRIVATE_KEY;

function generateSignedLicense(data: {
  key: string;
  expires: string;
  domain: string;
  type: string;
}): string {
  const payload = `${data.key}|${data.expires}|${data.domain}|${data.type}`;

  const sign = crypto.createSign('SHA256');
  sign.update(payload);
  const signature = sign.sign(PRIVATE_KEY, 'base64');

  return JSON.stringify({
    ...data,
    signature
  });
}
```

**Step 2: Verify in script (client-side)**
```javascript
// Embedded public key (safe to expose)
const PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A...
-----END PUBLIC KEY-----`;

async function verifySignedLicense(license) {
  const payload = `${license.key}|${license.expires}|${license.domain}|${license.type}`;

  // Import public key
  const publicKey = await crypto.subtle.importKey(
    'spki',
    pemToBuffer(PUBLIC_KEY),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );

  // Verify signature
  const isValid = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    publicKey,
    base64ToBuffer(license.signature),
    new TextEncoder().encode(payload)
  );

  if (!isValid) {
    return { valid: false, reason: 'tampered' };
  }

  // Check expiration
  if (new Date() > new Date(license.expires)) {
    return { valid: false, reason: 'expired' };
  }

  // Check domain (for web apps)
  if (typeof window !== 'undefined' &&
      window.location.hostname !== license.domain) {
    return { valid: false, reason: 'domain_mismatch' };
  }

  return { valid: true };
}
```

### 4.3 Hybrid Validation (Recommended)

Combine online and offline methods:

```javascript
const LICENSE = {
  key: "ZNRSCR-XXXX-XXXX-XXXX-XXXX",
  expires: "2026-08-24",
  domain: "example.com",
  signature: "base64signature...",
  gracePeriod: 7 // Days allowed offline
};

async function validateLicense() {
  // Try online validation first
  try {
    const online = await onlineValidation();
    if (online.valid) {
      localStorage.setItem('lastVerified', new Date().toISOString());
      return true;
    }
    return false;
  } catch (networkError) {
    // Fallback to offline validation
    const lastVerified = localStorage.getItem('lastVerified');

    if (lastVerified) {
      const daysSince = daysBetween(new Date(lastVerified), new Date());

      if (daysSince < LICENSE.gracePeriod) {
        // Within grace period - verify signature only
        const offline = await verifySignedLicense(LICENSE);
        if (offline.valid) {
          console.log(`Offline mode: ${LICENSE.gracePeriod - daysSince} days remaining`);
          return true;
        }
      }
    }

    // Grace period exceeded or no previous verification
    showError('Please connect to internet to verify license');
    return false;
  }
}
```

---

## 5. Domain/Identifier Binding

### 5.1 Web Applications (Domain Binding)

```javascript
// Activation endpoint
POST /api/licenses/activate
{
  "license_key": "ZNRSCR-XXXX-XXXX-XXXX-XXXX",
  "domain": "example.com"
}

// Response
{
  "success": true,
  "registered_domain": "example.com",
  "domains_used": 1,
  "domains_allowed": 1,  // or 3 for Pro license
  "support_expires": "2026-08-24"
}
```

### 5.2 Desktop Applications (Machine Binding)

Use a combination of hardware identifiers:

```javascript
// Node.js example
const { machineIdSync } = require('node-machine-id');
const os = require('os');

function getMachineFingerprint() {
  const machineId = machineIdSync();
  const cpus = os.cpus()[0].model;
  const hostname = os.hostname();

  // Create hash of machine identifiers
  const fingerprint = crypto
    .createHash('sha256')
    .update(`${machineId}-${cpus}-${hostname}`)
    .digest('hex')
    .substring(0, 32);

  return fingerprint;
}

// Activation
POST /api/licenses/activate
{
  "license_key": "ZNRSCR-XXXX-XXXX-XXXX-XXXX",
  "identifier": "a1b2c3d4e5f6...",
  "identifier_type": "machine_id"
}
```

### 5.3 Mobile Applications (Device Binding)

```javascript
// React Native example
import DeviceInfo from 'react-native-device-info';

async function getDeviceFingerprint() {
  const deviceId = await DeviceInfo.getUniqueId();
  const manufacturer = await DeviceInfo.getManufacturer();
  const model = DeviceInfo.getModel();

  const fingerprint = crypto
    .createHash('sha256')
    .update(`${deviceId}-${manufacturer}-${model}`)
    .digest('hex')
    .substring(0, 32);

  return fingerprint;
}
```

### 5.4 Domain Management API

```typescript
// List registered domains
GET /api/licenses/{key}/domains
{
  "domains": [
    { "domain": "example.com", "registered_at": "2026-02-24", "primary": true },
    { "domain": "staging.example.com", "registered_at": "2026-02-25", "primary": false }
  ],
  "slots_used": 2,
  "slots_allowed": 3
}

// Remove domain (with cooldown)
DELETE /api/licenses/{key}/domains/{domain}
{
  "success": true,
  "message": "Domain removed. You can register a new domain in 7 days.",
  "cooldown_until": "2026-03-03"
}
```

---

## 6. Secure Storage & Delivery

### 6.1 File Storage Architecture

```
Cloud Storage (Private Bucket)
├── products/
│   └── {product_id}/
│       ├── v1.0.0/
│       │   ├── source.zip (obfuscated)
│       │   ├── source.zip.sha256 (checksum)
│       │   └── changelog.md
│       ├── v1.1.0/
│       │   └── ...
│       └── latest -> v1.1.0 (symlink)
└── licenses/
    └── {order_id}/
        └── license.json (signed license file)
```

### 6.2 Download Flow

```
1. User clicks "Download" in library
          │
          ▼
2. Server verifies ownership
   - Check order exists and is paid
   - Check user matches order user
          │
          ▼
3. Generate personalized package
   - Fetch latest version from storage
   - Inject license.json with user's license
   - Inject buyer watermarks into code
   - Create ZIP archive
          │
          ▼
4. Generate signed download URL
   - URL expires in 1 hour
   - One-time use token
          │
          ▼
5. Log download
   - Record IP, user agent, timestamp
   - Increment download counter
          │
          ▼
6. Return download URL to user
```

### 6.3 Download API Implementation

```typescript
// POST /api/library/{product_id}/download
async function handleDownload(req: Request) {
  const { product_id } = req.params;
  const user_id = req.user.id;

  // 1. Verify ownership
  const access = await db.userProductAccess.findFirst({
    where: { userId: user_id, productId: product_id }
  });

  if (!access) {
    throw new Error('You do not own this product');
  }

  // 2. Get latest product file
  const productFile = await db.productFile.findFirst({
    where: { productId: product_id, isLatest: true }
  });

  // 3. Get user's license
  const license = await db.license.findFirst({
    where: { userId: user_id, productId: product_id }
  });

  // 4. Create personalized package
  const personalizedZip = await createPersonalizedPackage({
    sourceUrl: productFile.fileUrl,
    license: {
      key: license.licenseKey,
      type: license.licenseType,
      expires: license.supportExpiresAt,
      buyer: req.user.email,
      traceId: generateTraceId()
    }
  });

  // 5. Upload to temporary storage with signed URL
  const downloadUrl = await uploadAndSign(personalizedZip, {
    expiresIn: 3600, // 1 hour
    oneTimeUse: true
  });

  // 6. Log download
  await db.downloadHistory.create({
    data: {
      userId: user_id,
      productId: product_id,
      fileId: productFile.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      version: productFile.version
    }
  });

  // 7. Update download count
  await db.userProductAccess.update({
    where: { id: access.id },
    data: { downloadsCount: { increment: 1 }, lastAccessedAt: new Date() }
  });

  return { downloadUrl, version: productFile.version };
}
```

### 6.4 Storage Solution Comparison

When choosing a storage solution for script files, we evaluated three major options:

| Feature | **Cloudflare R2** | AWS S3 | Cloudinary |
|---------|-------------------|--------|------------|
| **Storage Cost** | $0.015/GB/month | $0.023/GB/month | $0.02-0.05/GB |
| **Egress (Download) Cost** | **$0 (FREE)** | $0.09/GB | $0.05-0.15/GB |
| **Signed URLs** | ✅ Yes | ✅ Yes | ✅ Yes |
| **S3 Compatible API** | ✅ Yes | ✅ Native | ❌ No |
| **Private Buckets** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Global CDN** | ✅ Built-in | CloudFront extra | ✅ Built-in |
| **Large File Support** | Up to 5TB | Up to 5TB | 100MB max |
| **Free Tier** | 10GB storage | 5GB (12 months) | 25GB |

#### Cost Analysis Example (100GB storage, 500GB downloads/month)

| Provider | Storage | Egress | **Total/Month** |
|----------|---------|--------|-----------------|
| **Cloudflare R2** | $1.50 | $0 | **$1.50** |
| AWS S3 | $2.30 | $45.00 | **$47.30** |
| Cloudinary | $5.00 | $25-75 | **$30-80** |

### 6.5 Recommended Solution: Cloudflare R2

**Why Cloudflare R2 is the best choice for Zenorar:**

1. **Zero Egress Fees** - Script downloads are free, regardless of file size or frequency
2. **S3-Compatible API** - Uses standard AWS SDK, easy migration if needed
3. **Built-in CDN** - Fast global delivery without extra configuration
4. **Cost Predictable** - Only pay for storage, not usage patterns
5. **Generous Free Tier** - 10GB free storage, 1M requests/month
6. **Strong Security** - Private buckets, signed URLs, access controls

#### R2 Storage Architecture

```
Cloudflare R2 Bucket: zenorar-scripts (PRIVATE)
├── scripts/
│   └── {product_id}/
│       └── {version}/
│           └── {hash}-{filename}
│               Example: scripts/prod_abc123/1.0.0/a1b2c3d4-myapp.zip
└── licenses/
    └── {order_id}/
        └── license.json (signed)
```

#### R2 Service Implementation

```typescript
// zenorar-api/src/services/r2.service.ts

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import crypto from 'crypto'

const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

export class R2Service {
  private bucket = process.env.R2_BUCKET_NAME!

  // Upload file to R2
  async uploadFile(buffer: Buffer, key: string, contentType: string): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })

    await r2Client.send(command)
    return key
  }

  // Generate signed download URL (1-hour expiry by default)
  async getSignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    })

    return getSignedUrl(r2Client, command, { expiresIn })
  }

  // Delete file from R2
  async deleteFile(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    })

    await r2Client.send(command)
  }

  // Generate unique storage key for product file
  generateKey(productId: string, filename: string, version: string): string {
    const hash = crypto.randomBytes(8).toString('hex')
    return `scripts/${productId}/${version}/${hash}-${filename}`
  }
}

export const r2Service = new R2Service()
```

#### Required Dependencies

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

#### Environment Variables

```env
# Cloudflare R2 Configuration
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_BUCKET_NAME=zenorar-scripts
```

### 6.6 File Validation & Dynamic Size Limits

Different file types have different maximum size limits to prevent abuse while accommodating legitimate use cases:

#### File Size Limits by Type

| File Type | Extensions | Max Size | Rationale |
|-----------|------------|----------|-----------|
| **Archives** | .zip, .rar, .7z, .tar, .tar.gz, .tgz | 500 MB | Standard script bundles |
| **Installers** | .exe, .dmg | 1 GB | Desktop applications |
| **Mobile Installers** | .msi, .apk, .ipa | 500 MB | Mobile apps |
| **Source Code** | .js, .ts, .jsx, .tsx, .php, .py, .java, .swift, .kt, .dart, .rb, .go, .rs, .c, .cpp, .h, .cs | 10 MB | Individual source files |
| **Default** | Other allowed types | 100 MB | Safety default |

#### File Validation Service

```typescript
// zenorar-api/src/services/fileValidation.service.ts

const FILE_SIZE_LIMITS: Record<string, number> = {
  // Archives (500 MB)
  '.zip': 500 * 1024 * 1024,
  '.rar': 500 * 1024 * 1024,
  '.7z': 500 * 1024 * 1024,
  '.tar': 500 * 1024 * 1024,
  '.tar.gz': 500 * 1024 * 1024,
  '.tgz': 500 * 1024 * 1024,

  // Desktop Installers (1 GB)
  '.exe': 1024 * 1024 * 1024,
  '.dmg': 1024 * 1024 * 1024,

  // Mobile/Other Installers (500 MB)
  '.msi': 500 * 1024 * 1024,
  '.apk': 500 * 1024 * 1024,
  '.ipa': 500 * 1024 * 1024,

  // Source Code (10 MB)
  '.js': 10 * 1024 * 1024,
  '.ts': 10 * 1024 * 1024,
  '.jsx': 10 * 1024 * 1024,
  '.tsx': 10 * 1024 * 1024,
  '.php': 10 * 1024 * 1024,
  '.py': 10 * 1024 * 1024,
  '.java': 10 * 1024 * 1024,
  '.swift': 10 * 1024 * 1024,
  '.kt': 10 * 1024 * 1024,
  '.dart': 10 * 1024 * 1024,
  '.rb': 10 * 1024 * 1024,
  '.go': 10 * 1024 * 1024,
  '.rs': 10 * 1024 * 1024,
  '.c': 10 * 1024 * 1024,
  '.cpp': 10 * 1024 * 1024,
  '.h': 10 * 1024 * 1024,
  '.cs': 10 * 1024 * 1024,

  // Default fallback
  'default': 100 * 1024 * 1024,
}

const ALLOWED_EXTENSIONS = Object.keys(FILE_SIZE_LIMITS).filter(k => k !== 'default')

export class FileValidationService {
  validateFile(filename: string, size: number): { valid: boolean; error?: string } {
    const ext = this.getExtension(filename)

    // Check if extension is allowed
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return { valid: false, error: `File type ${ext} is not allowed` }
    }

    // Check against size limit for this file type
    const maxSize = FILE_SIZE_LIMITS[ext] || FILE_SIZE_LIMITS.default
    if (size > maxSize) {
      const maxMB = Math.round(maxSize / (1024 * 1024))
      return { valid: false, error: `File too large. Maximum ${maxMB}MB for ${ext} files` }
    }

    return { valid: true }
  }

  getExtension(filename: string): string {
    // Handle compound extensions like .tar.gz
    if (filename.endsWith('.tar.gz')) return '.tar.gz'
    const match = filename.match(/\.[^.]+$/)
    return match ? match[0].toLowerCase() : ''
  }

  getMaxSize(extension: string): number {
    return FILE_SIZE_LIMITS[extension] || FILE_SIZE_LIMITS.default
  }
}

export const fileValidationService = new FileValidationService()
```

### 6.7 Security Measures

#### Multi-Layer Security Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     SECURITY LAYERS                              │
├─────────────────────────────────────────────────────────────────┤
│  Layer 1: Storage Security                                       │
│  ├── Private R2 bucket (no public access)                       │
│  ├── Access keys stored in environment variables                │
│  └── Bucket-level access controls                               │
├─────────────────────────────────────────────────────────────────┤
│  Layer 2: Access Control                                         │
│  ├── Authentication required (JWT token)                        │
│  ├── Ownership verification (user must own product)             │
│  └── Admin-only upload permissions                              │
├─────────────────────────────────────────────────────────────────┤
│  Layer 3: Download Security                                      │
│  ├── Signed URLs with 1-hour expiry                             │
│  ├── One-time download tokens (optional)                        │
│  └── Rate limiting per user                                     │
├─────────────────────────────────────────────────────────────────┤
│  Layer 4: File Integrity                                         │
│  ├── SHA-256 hash stored on upload                              │
│  ├── Hash verification on download                              │
│  └── Version tracking and changelog                             │
├─────────────────────────────────────────────────────────────────┤
│  Layer 5: Audit & Monitoring                                     │
│  ├── All downloads logged (IP, user agent, timestamp)           │
│  ├── Failed access attempts recorded                            │
│  └── Anomaly detection (unusual download patterns)              │
└─────────────────────────────────────────────────────────────────┘
```

#### Signed URL Security

Signed URLs ensure:
1. **Time-Limited Access** - URLs expire after 1 hour
2. **Tamper-Proof** - URL signature verified by R2
3. **No Direct File Access** - Files cannot be accessed without valid signature
4. **Revocable** - URLs can be invalidated by changing signing keys

```typescript
// Example signed URL generation
const signedUrl = await r2Service.getSignedDownloadUrl(
  'scripts/prod_123/1.0.0/abc123-app.zip',
  3600 // Expires in 1 hour
);

// Result: https://bucket.r2.cloudflarestorage.com/scripts/prod_123/1.0.0/abc123-app.zip
//         ?X-Amz-Algorithm=AWS4-HMAC-SHA256
//         &X-Amz-Credential=...
//         &X-Amz-Date=20240101T120000Z
//         &X-Amz-Expires=3600
//         &X-Amz-Signature=...
```

#### File Integrity Verification

```typescript
// On upload: Calculate and store hash
const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex')

// Store in database
await prisma.productFile.create({
  data: {
    productId,
    fileName: file.originalname,
    fileUrl: storageKey,
    fileSize: file.size,
    metadata: {
      hash: fileHash,  // SHA-256 hash for integrity verification
      changelog: changelog,
      uploadedBy: adminUserId,
    }
  }
})

// On download: Optionally verify hash
const downloadedHash = crypto.createHash('sha256').update(downloadedBuffer).digest('hex')
if (downloadedHash !== storedHash) {
  throw new Error('File integrity check failed')
}
```

### 6.8 Admin Upload System

#### Upload API Endpoint

```typescript
// zenorar-api/src/controllers/productFiles.controller.ts

export const uploadProductFile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { productId } = req.params
  const { version, changelog } = req.body
  const file = req.file

  if (!file) {
    return res.status(400).json({ success: false, error: 'No file uploaded' })
  }

  // 1. Validate file type and size
  const validation = fileValidationService.validateFile(file.originalname, file.size)
  if (!validation.valid) {
    return res.status(400).json({ success: false, error: validation.error })
  }

  // 2. Verify product exists
  const product = await prisma.product.findUnique({ where: { id: productId } })
  if (!product) {
    return res.status(404).json({ success: false, error: 'Product not found' })
  }

  // 3. Generate unique storage key
  const storageKey = r2Service.generateKey(productId, file.originalname, version)

  // 4. Upload to R2
  await r2Service.uploadFile(file.buffer, storageKey, file.mimetype)

  // 5. Calculate file hash for integrity
  const fileHash = crypto.createHash('sha256').update(file.buffer).digest('hex')

  // 6. Mark previous versions as not latest
  await prisma.productFile.updateMany({
    where: { productId, isLatest: true },
    data: { isLatest: false }
  })

  // 7. Create database record
  const productFile = await prisma.productFile.create({
    data: {
      productId,
      fileName: file.originalname,
      fileUrl: storageKey,
      fileSize: file.size,
      fileType: file.mimetype,
      version,
      isLatest: true,
      metadata: {
        hash: fileHash,
        changelog: changelog || null,
        uploadedBy: req.user!.id,
      }
    }
  })

  res.json({
    success: true,
    data: productFile,
    message: `Version ${version} uploaded successfully`
  })
})
```

#### Admin Routes

```typescript
// zenorar-api/src/routes/productFiles.routes.ts

import { Router } from 'express'
import multer from 'multer'
import * as productFilesController from '../controllers/productFiles.controller'
import { authenticate } from '../middleware/auth.middleware'
import { requireRole } from '../middleware/rbac.middleware'

const router = Router()

// Configure multer with 1GB max (validated per type later)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 1024 * 1024 * 1024 }
})

// All routes require admin authentication
router.use(authenticate)
router.use(requireRole('ADMIN'))

// Upload new version
router.post('/:productId/files', upload.single('file'), productFilesController.uploadProductFile)

// List all versions
router.get('/:productId/files', productFilesController.getProductFiles)

// Delete a version
router.delete('/:productId/files/:fileId', productFilesController.deleteProductFile)

export default router
```

### 6.9 R2 Setup Guide

#### Step 1: Create R2 Bucket

1. Log into Cloudflare Dashboard
2. Navigate to **R2** → **Create Bucket**
3. Bucket name: `zenorar-scripts`
4. Location hint: Auto (or nearest region)
5. **Important**: Leave public access disabled

#### Step 2: Create API Token

1. Go to **R2** → **Manage R2 API Tokens**
2. Click **Create API Token**
3. Set permissions: **Object Read & Write**
4. Specify bucket: `zenorar-scripts`
5. Save the **Access Key ID** and **Secret Access Key**

#### Step 3: Configure Environment

```env
# Add to .env file
R2_ACCOUNT_ID=<your-cloudflare-account-id>
R2_ACCESS_KEY_ID=<your-access-key-id>
R2_SECRET_ACCESS_KEY=<your-secret-access-key>
R2_BUCKET_NAME=zenorar-scripts
```

#### Step 4: Install Dependencies

```bash
# In zenorar-api directory
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

### 6.10 Verification Checklist

After implementation, verify:

- [ ] R2 bucket is private (no public access URLs work)
- [ ] Files upload successfully via admin panel
- [ ] Version management works (latest flag toggles correctly)
- [ ] Signed URLs expire after 1 hour
- [ ] File type restrictions are enforced
- [ ] Size limits are enforced per file type
- [ ] Downloads require authentication
- [ ] Downloads require product ownership
- [ ] All downloads are logged with IP and timestamp
- [ ] File integrity hashes are stored and can be verified

---

## 7. Support System Integration

### 7.1 Support Ticket Validation

```typescript
// When user creates support ticket
async function createSupportTicket(req: Request) {
  const { product_id, subject, message } = req.body;
  const user_id = req.user.id;

  // Get user's license
  const license = await db.license.findFirst({
    where: { userId: user_id, productId: product_id }
  });

  if (!license) {
    throw new Error('You do not own this product');
  }

  // Check support expiration
  const supportExpired = new Date() > license.supportExpiresAt;

  if (supportExpired) {
    return {
      success: false,
      error: 'support_expired',
      message: 'Your support period has expired',
      renewUrl: `/renew-support/${product_id}`,
      expiredAt: license.supportExpiresAt
    };
  }

  // Calculate days remaining
  const daysRemaining = Math.ceil(
    (license.supportExpiresAt - Date.now()) / (1000 * 60 * 60 * 24)
  );

  // Create ticket
  const ticket = await db.supportTicket.create({
    data: {
      userId: user_id,
      productId: product_id,
      licenseKey: license.licenseKey,
      supportExpiresAt: license.supportExpiresAt,
      subject,
      message,
      status: 'OPEN'
    }
  });

  return {
    success: true,
    ticket,
    supportDaysRemaining: daysRemaining
  };
}
```

### 7.2 Support Renewal

```typescript
// Support extension pricing
const SUPPORT_EXTENSION_PRICING = {
  '6_months': 0.25,  // 25% of original price
  '12_months': 0.40, // 40% of original price
  '36_months': 0.80  // 80% of original price (best value)
};

// POST /api/support/renew
async function renewSupport(req: Request) {
  const { product_id, duration } = req.body;
  const user_id = req.user.id;

  const license = await db.license.findFirst({
    where: { userId: user_id, productId: product_id }
  });

  const product = await db.product.findUnique({
    where: { id: product_id }
  });

  // Calculate renewal price
  const basePrice = product.price;
  const renewalPrice = basePrice * SUPPORT_EXTENSION_PRICING[duration];

  // Add to cart or process payment
  return {
    productId: product_id,
    duration,
    price: renewalPrice,
    currentExpiry: license.supportExpiresAt,
    newExpiry: calculateNewExpiry(license.supportExpiresAt, duration)
  };
}
```

### 7.3 User Dashboard - Support Status

```typescript
// GET /api/library/{product_id}/support-status
{
  "product_id": "xxx",
  "product_name": "Premium Script",
  "license_type": "normal",
  "support_status": "active", // active | expiring_soon | expired
  "support_expires_at": "2026-08-24",
  "days_remaining": 180,
  "renewal_options": [
    { "duration": "6_months", "price": 12.50, "new_expiry": "2027-02-24" },
    { "duration": "12_months", "price": 20.00, "new_expiry": "2027-08-24" }
  ],
  "open_tickets": 2,
  "total_tickets": 5
}
```

---

## 8. Database Schema

### 8.1 Licenses Table

```sql
CREATE TABLE licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  product_id UUID NOT NULL REFERENCES products(id),
  order_id UUID NOT NULL REFERENCES orders(id),

  -- License details
  license_key VARCHAR(50) UNIQUE NOT NULL,
  license_type VARCHAR(20) NOT NULL, -- 'normal', 'extended', 'pro'

  -- Domain/identifier binding
  domains_allowed INT NOT NULL DEFAULT 1,
  registered_domains JSONB DEFAULT '[]',
  domain_cooldown_until TIMESTAMP,

  -- Expiration
  support_expires_at TIMESTAMP NOT NULL,
  download_expires_at TIMESTAMP, -- NULL = lifetime

  -- Status
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'suspended', 'revoked'

  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Constraints
  UNIQUE(user_id, product_id, order_id)
);

CREATE INDEX idx_licenses_key ON licenses(license_key);
CREATE INDEX idx_licenses_user ON licenses(user_id);
CREATE INDEX idx_licenses_product ON licenses(product_id);
```

### 8.2 License Activations Table

```sql
CREATE TABLE license_activations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id UUID NOT NULL REFERENCES licenses(id),

  -- Activation details
  identifier VARCHAR(255) NOT NULL, -- domain, machine_id, device_id
  identifier_type VARCHAR(50) NOT NULL, -- 'domain', 'machine_id', 'device_id'

  -- Metadata
  ip_address VARCHAR(45),
  user_agent TEXT,
  activated_at TIMESTAMP DEFAULT NOW(),
  deactivated_at TIMESTAMP,

  -- Status
  is_active BOOLEAN DEFAULT true,

  UNIQUE(license_id, identifier)
);

CREATE INDEX idx_activations_license ON license_activations(license_id);
CREATE INDEX idx_activations_identifier ON license_activations(identifier);
```

### 8.3 License Verifications Table (Audit Log)

```sql
CREATE TABLE license_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id UUID REFERENCES licenses(id),
  license_key VARCHAR(50) NOT NULL, -- Store even if license not found

  -- Request details
  identifier VARCHAR(255),
  identifier_type VARCHAR(50),
  ip_address VARCHAR(45),
  user_agent TEXT,

  -- Result
  result VARCHAR(20) NOT NULL, -- 'valid', 'invalid', 'expired', 'domain_mismatch', 'not_found'
  result_message TEXT,

  -- Timing
  verified_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_verifications_key ON license_verifications(license_key);
CREATE INDEX idx_verifications_time ON license_verifications(verified_at);
```

### 8.4 Product Licenses (Pricing per license type)

```sql
CREATE TABLE product_licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id),

  -- License type
  license_type VARCHAR(20) NOT NULL, -- 'normal', 'extended', 'pro'

  -- Pricing
  price DECIMAL(10, 2) NOT NULL,
  compare_price DECIMAL(10, 2), -- For showing discount

  -- Features
  domains_allowed INT NOT NULL DEFAULT 1,
  support_months INT NOT NULL,

  -- Status
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(product_id, license_type)
);
```

---

## 9. API Endpoints

### 9.1 License Verification (Public)

```
POST /api/licenses/verify
Content-Type: application/json

Request:
{
  "key": "ZNRSCR-XXXX-XXXX-XXXX-XXXX",
  "domain": "example.com",  // or "identifier" for non-web
  "identifier_type": "domain" // "domain", "machine_id", "device_id"
}

Response (Success):
{
  "valid": true,
  "license_type": "normal",
  "support_active": true,
  "support_expires": "2026-08-24",
  "days_remaining": 180,
  "domains_used": 1,
  "domains_allowed": 1,
  "download_access": true
}

Response (Failure):
{
  "valid": false,
  "reason": "domain_mismatch", // "expired", "invalid_key", "domain_mismatch", "suspended"
  "message": "This license is registered to a different domain",
  "registered_domain": "other-site.com"
}
```

### 9.2 License Activation

```
POST /api/licenses/activate
Authorization: Bearer {user_token}

Request:
{
  "license_key": "ZNRSCR-XXXX-XXXX-XXXX-XXXX",
  "identifier": "example.com",
  "identifier_type": "domain"
}

Response:
{
  "success": true,
  "activation_id": "uuid",
  "identifier": "example.com",
  "slots_used": 1,
  "slots_available": 0,
  "message": "License activated successfully"
}
```

### 9.3 Domain Management

```
GET /api/licenses/{key}/domains
Authorization: Bearer {user_token}

Response:
{
  "domains": [
    {
      "identifier": "example.com",
      "type": "domain",
      "activated_at": "2026-02-24T10:00:00Z",
      "is_primary": true
    }
  ],
  "slots_used": 1,
  "slots_allowed": 3,
  "slots_available": 2
}

DELETE /api/licenses/{key}/domains/{domain}
Authorization: Bearer {user_token}

Response:
{
  "success": true,
  "message": "Domain deactivated",
  "cooldown_until": "2026-03-03T10:00:00Z",
  "slots_available": 3
}
```

### 9.4 License Details (User Dashboard)

```
GET /api/library/{product_id}/license
Authorization: Bearer {user_token}

Response:
{
  "product_id": "uuid",
  "product_name": "Premium Script",
  "license_key": "ZNRSCR-XXXX-XXXX-XXXX-XXXX",
  "license_type": "normal",
  "purchase_date": "2026-02-24",
  "support_expires": "2026-08-24",
  "support_status": "active",
  "downloads_count": 5,
  "last_download": "2026-02-25T14:30:00Z",
  "registered_domains": ["example.com"],
  "domains_allowed": 1,
  "version_installed": "1.0.0",
  "latest_version": "1.2.0",
  "update_available": true
}
```

---

## 10. Implementation Phases

### Phase 1: Core Foundation (Week 1-2)
- [ ] Database schema creation (licenses, activations tables)
- [ ] License key generation service
- [ ] Basic license verification endpoint
- [ ] Update order completion to generate licenses

### Phase 2: Download System (Week 2-3)
- [ ] Secure file storage setup (Cloudinary/S3)
- [ ] License injection into downloads
- [ ] Signed URL generation
- [ ] Download logging

### Phase 3: Activation & Binding (Week 3-4)
- [ ] Domain activation endpoint
- [ ] Machine/device ID activation
- [ ] Domain management UI (user dashboard)
- [ ] Cooldown period logic

### Phase 4: Verification API (Week 4-5)
- [ ] Public verification endpoint
- [ ] Rate limiting
- [ ] Abuse detection
- [ ] Verification logging

### Phase 5: Support Integration (Week 5-6)
- [ ] Link support tickets to licenses
- [ ] Support expiration checks
- [ ] Renewal flow
- [ ] Support dashboard

### Phase 6: Anti-Piracy (Week 6-7)
- [ ] Code obfuscation pipeline
- [ ] Watermarking system
- [ ] Multiple verification points
- [ ] Signed license file generation

### Phase 7: Admin Tools (Week 7-8)
- [ ] License management dashboard
- [ ] Revocation system
- [ ] Analytics (activations, verifications)
- [ ] Abuse reports

---

## 11. Comparison with ThemeForest

| Feature | ThemeForest/Envato | Zenorar (Proposed) |
|---------|-------------------|-------------------|
| License Key | Purchase code | ZNRSCR-XXXX-XXXX-XXXX |
| Verification API | api.envato.com | api.zenorar.com |
| Domain Binding | Via plugin/theme | Built-in activation |
| Support Duration | 6 months (extendable) | 6/12/36 months |
| Multi-domain | Requires multiple purchases | Pro license (3 domains) |
| Updates | Lifetime | Lifetime |
| Offline Support | No | Yes (signed licenses) |
| Watermarking | Author-dependent | Built-in |
| Machine Binding | Not available | Available |
| Mobile/Desktop | Limited | Full support |

---

## Appendix A: Security Considerations

### A.1 Never Trust Client-Side Validation
- Always validate on server for critical operations
- Client-side checks are for UX, not security

### A.2 License Key Security
- Never expose private signing keys
- Rotate keys periodically
- Use separate keys for production/staging

### A.3 Rate Limiting
- Limit verification requests per key: 100/hour
- Limit activation attempts: 10/day
- Block suspicious IPs

### A.4 Legal Protection
- Clear terms of service
- DMCA takedown process
- Piracy reporting mechanism

---

## Appendix B: User Experience Guidelines

### B.1 License Activation Flow
1. User purchases script
2. Downloads ZIP (includes license.json)
3. Uploads/installs script
4. Script prompts for activation
5. User clicks "Activate" (auto-sends domain)
6. Success message with support expiry info

### B.2 Error Messages
- **Invalid key**: "License key not found. Please check your key or contact support."
- **Domain mismatch**: "This license is already activated on example.com. You can manage domains in your dashboard."
- **Expired support**: "Your support period has ended. You can still use the script, but to get help or updates, please renew your support."
- **Slot limit**: "You've reached your domain limit (3/3). Remove an existing domain to activate a new one."

---

## 12. Gift Card Storage & Management System

### 12.1 Overview

The gift card system handles two types of cards:
1. **Third-Party Cards** - Steam, PlayStation, iTunes, Amazon, etc. (reselling actual codes)
2. **Store Credit Cards** - Zenorar gift cards that add wallet balance

Unlike scripts (files stored in R2), gift cards are **encrypted code strings** stored in the database.

### 12.2 System Architecture

```
THIRD-PARTY CARDS:
┌─────────────────────────────────────────────────────────────────┐
│ IMPORT: Admin → CSV Upload → Validate → Encrypt → Database     │
│ PURCHASE: User → Pay → Reserve Code → Complete → Decrypt       │
│ DELIVERY: Email + Library Page + Copy Button                    │
└─────────────────────────────────────────────────────────────────┘

STORE CREDIT CARDS:
┌─────────────────────────────────────────────────────────────────┐
│ PURCHASE: User → Pay → Generate Code → Send to Recipient       │
│ REDEEM: Recipient → Enter Code → Add to Wallet Balance         │
└─────────────────────────────────────────────────────────────────┘
```

### 12.3 Gift Card Sourcing - Where to Get Inventory

#### Sourcing Options Comparison

| Method | Pros | Cons | Best For |
|--------|------|------|----------|
| **Bulk Suppliers** | Lower cost (5-15% off), No API fees | Upfront investment, Inventory risk | Established businesses |
| **API Providers** | On-demand, No inventory risk | Higher per-card cost, API fees | Starting out, Testing |
| **Direct from Brands** | Best pricing, Authorized | High minimums, Long approval | Large volume |
| **Manual Purchase** | No minimums, Quick start | Highest cost, Time consuming | Very small scale |

#### Recommended: Bulk Suppliers

**How it works:**
1. You purchase gift cards in bulk at 5-15% discount
2. Supplier sends you codes via secure CSV/API
3. You import codes into your system
4. You sell at face value or small discount (2-5%)
5. Your profit = Bulk discount - Selling discount

**Profit Example:**
- Buy $10,000 worth of Steam cards at 10% discount = Pay $9,000
- Sell at 3% discount to customers = Receive $9,700
- Gross profit = $700 (7%)

**Reputable Bulk Suppliers:**
- **Raise.com** - US focus, wholesale program
- **CardCash** - Business program, good variety
- **Card Kangaroo** - International focus
- **NGC (National Gift Card)** - Large minimums, best rates
- **InComm** - Direct brand partnerships

### 12.4 API Integration - Detailed Provider Comparison

Unlike bulk purchasing where you manage inventory, API integration allows **on-demand provisioning** - codes are fetched instantly when a customer purchases.

#### Gift Card API Provider Comparison

| Provider | Coverage | API Quality | Min Order | Pricing Model | Best For |
|----------|----------|-------------|-----------|---------------|----------|
| **Tillo** | 2000+ brands, 35+ countries | Excellent REST API | No minimum | Per-transaction fee | Best overall, enterprise |
| **Reloadly** | 800+ brands, 150+ countries | Good REST API | $5 prepaid | Prepaid balance | International, mobile top-up |
| **Tremendous** | 1000+ brands, US focus | Simple REST API | No minimum | Per-transaction | Business rewards, US market |
| **Runa** | 1500+ brands, global | REST + Webhooks | $100/mo | Subscription + per-transaction | Large catalog, Europe |
| **Prezzee Business** | 300+ brands, AU/NZ/UK | REST API | Contact sales | Custom pricing | Australia/NZ focus |

#### Recommended: Tillo (Best Documentation & Coverage)

**Why Tillo:**
- Largest brand catalog (2000+)
- Well-documented REST API
- Real-time inventory checks
- Instant code delivery
- Webhook notifications
- Sandbox environment for testing

**Tillo Pricing Model:**
- No monthly fees
- Per-transaction fee (typically 2-5% on top of wholesale)
- Volume discounts available
- Net-30 billing

**How to Apply:**
1. Visit business.tillo.io
2. Complete partner application
3. Business verification (1-2 weeks)
4. Receive sandbox API credentials
5. Test integration
6. Go live with production credentials

#### Tillo API Authentication

```env
# Environment Variables
TILLO_API_KEY=your_api_key
TILLO_API_SECRET=your_api_secret
TILLO_API_URL=https://api.tillo.io/v2
```

```typescript
// HMAC Signature Generation
private generateSignature(method: string, path: string, timestamp: string, body?: string): string {
  const message = `${method}\n${path}\n${timestamp}\n${body || ''}`
  return crypto.createHmac('sha256', this.apiSecret).update(message).digest('base64')
}
```

#### Tillo Order API Example

```typescript
async orderGiftCard(brandId: string, denomination: number, orderId: string) {
  const response = await this.request('POST', '/orders', {
    brand: brandId,
    face_value: denomination,
    delivery_method: 'code',
    client_order_id: orderId,
    currency: 'USD'
  })

  return {
    success: true,
    providerOrderId: response.data.order_id,
    code: response.data.code,
    pin: response.data.pin,
    expirationDate: response.data.expiration_date
  }
}
```

#### Alternative: Reloadly API

```env
# OAuth2 Authentication
RELOADLY_CLIENT_ID=your_client_id
RELOADLY_CLIENT_SECRET=your_client_secret
RELOADLY_API_URL=https://giftcards.reloadly.com
```

```typescript
// Get OAuth2 Token
const response = await axios.post('https://auth.reloadly.com/oauth/token', {
  client_id: this.clientId,
  client_secret: this.clientSecret,
  grant_type: 'client_credentials',
  audience: 'https://giftcards.reloadly.com'
})

// Order Gift Card
const order = await this.request('POST', '/orders', {
  productId: parseInt(productId),
  quantity: 1,
  unitPrice: denomination,
  customIdentifier: orderId
})
```

#### Hybrid Strategy: Bulk + API

| Scenario | Use Bulk | Use API |
|----------|----------|---------|
| High-volume brands (Steam, Amazon) | ✅ Better margins | |
| Long-tail brands (niche) | | ✅ No inventory risk |
| Testing new brands | | ✅ No upfront investment |
| Out of stock (bulk) | | ✅ Fallback option |
| Predictable demand | ✅ Lower cost | |
| Unpredictable demand | | ✅ On-demand |

```typescript
// Hybrid implementation
async purchaseGiftCard(brandId: string, denomination: number, orderId: string) {
  // 1. Check bulk inventory first (higher margin)
  const availableCode = await prisma.giftCardCode.findFirst({
    where: { brandId, denomination, status: 'available' }
  })

  if (availableCode) {
    return this.fulfillFromInventory(availableCode, orderId)
  }

  // 2. Fall back to API provider (no inventory risk)
  const brand = await prisma.giftCardBrand.findUnique({ where: { id: brandId } })
  if (brand.provider && brand.provisionMethod === 'api') {
    return giftCardOnDemandService.provisionGiftCard(...)
  }

  throw new Error('Out of stock')
}
```

### 12.5 Getting Started Strategy

**Phase 1: Manual/Small Scale**
1. Start with manual purchase + CSV import to test demand
2. Buy small batches (10-20 cards per brand/denomination)
3. Track which brands sell fastest

**Phase 2: Scale Up**
1. Apply to bulk supplier programs (usually need $1,000+ monthly)
2. Focus on top 5-10 brands that sell best
3. Consider API integration for long-tail brands

**Inventory Management Tips:**
- Keep 30-day supply based on sales velocity
- Set low-stock alerts (< 10 cards per denomination)
- Don't overstock cards that expire
- Diversify denominations ($10, $25, $50, $100)

### 12.6 Database Schema

#### Gift Card Brands Table
```sql
CREATE TABLE gift_card_brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,           -- "Steam"
  slug VARCHAR(255) UNIQUE NOT NULL,    -- "steam"
  description TEXT,
  image_url VARCHAR(500),
  category VARCHAR(100) NOT NULL,       -- "gaming", "shopping", "entertainment"

  denominations JSONB DEFAULT '[]',     -- [10, 25, 50, 100]
  discount_percent DECIMAL(5,2) DEFAULT 0,

  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,

  redemption_instructions TEXT,
  redemption_url VARCHAR(500),
  region VARCHAR(50) DEFAULT 'global',
  currency VARCHAR(3) DEFAULT 'USD',

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Gift Card Codes Table (Encrypted Inventory)
```sql
CREATE TABLE gift_card_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES gift_card_brands(id),

  -- The actual code (ENCRYPTED with AES-256-GCM)
  code_encrypted TEXT NOT NULL,
  code_hash VARCHAR(64) NOT NULL,       -- SHA-256 for duplicate detection

  denomination DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'available',  -- 'available', 'reserved', 'sold', 'invalid'

  -- Purchase linkage
  order_id UUID REFERENCES orders(id),
  sold_to_user_id UUID REFERENCES users(id),
  sold_at TIMESTAMP,

  -- Import tracking
  imported_at TIMESTAMP DEFAULT NOW(),
  imported_by UUID REFERENCES users(id),
  batch_id VARCHAR(100),

  cost_price DECIMAL(10,2),             -- What admin paid
  expires_at TIMESTAMP,                 -- Some cards expire

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_gift_card_codes_hash ON gift_card_codes(code_hash);
```

#### Store Credit Cards Table
```sql
CREATE TABLE store_gift_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  code VARCHAR(20) UNIQUE NOT NULL,     -- "ZNR-XXXX-XXXX-XXXX"
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',

  status VARCHAR(20) DEFAULT 'active',  -- 'active', 'redeemed', 'expired'

  -- Purchase info
  purchased_by UUID REFERENCES users(id),
  purchased_at TIMESTAMP,

  -- Gift recipient (if sent as gift)
  recipient_email VARCHAR(255),
  recipient_name VARCHAR(255),
  gift_message TEXT,

  -- Redemption
  redeemed_by UUID REFERENCES users(id),
  redeemed_at TIMESTAMP,
  expires_at TIMESTAMP,

  is_promotional BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 12.7 Encryption System

All third-party gift card codes are encrypted using **AES-256-GCM**:

```typescript
// Encryption Service
const ALGORITHM = 'aes-256-gcm'

export class EncryptionService {
  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv)

    let encrypted = cipher.update(plaintext, 'utf8', 'base64')
    encrypted += cipher.final('base64')

    const authTag = cipher.getAuthTag()
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`
  }

  decrypt(encryptedData: string): string {
    const [ivB64, authTagB64, encrypted] = encryptedData.split(':')
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, Buffer.from(ivB64, 'base64'))
    decipher.setAuthTag(Buffer.from(authTagB64, 'base64'))

    let decrypted = decipher.update(encrypted, 'base64', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  }

  hash(code: string): string {
    return crypto.createHash('sha256').update(code).digest('hex')
  }
}
```

**Environment Variable:**
```env
# Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
GIFT_CARD_ENCRYPTION_KEY=<64_hex_characters>
```

### 12.8 Security Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                   GIFT CARD SECURITY LAYERS                      │
├─────────────────────────────────────────────────────────────────┤
│  Layer 1: Encryption                                             │
│  ├── AES-256-GCM encryption at rest                             │
│  ├── Unique IV per code                                         │
│  ├── Authentication tag for integrity                           │
│  └── Key stored in environment variable                         │
├─────────────────────────────────────────────────────────────────┤
│  Layer 2: Access Control                                         │
│  ├── Only code owner can reveal                                 │
│  ├── Admin-only import/management                               │
│  └── JWT authentication required                                │
├─────────────────────────────────────────────────────────────────┤
│  Layer 3: Duplicate Prevention                                   │
│  ├── SHA-256 hash stored for each code                          │
│  ├── Unique constraint on hash                                  │
│  └── Pre-import duplicate check                                 │
├─────────────────────────────────────────────────────────────────┤
│  Layer 4: Audit Trail                                            │
│  ├── Every code reveal logged                                   │
│  ├── IP address and user agent recorded                         │
│  └── Partial code in logs (****ABCD)                           │
├─────────────────────────────────────────────────────────────────┤
│  Layer 5: Fraud Prevention                                       │
│  ├── Rate limiting on reveals (5/minute)                        │
│  ├── Reservation timeout (15 min)                               │
│  └── Stock verification before checkout                         │
└─────────────────────────────────────────────────────────────────┘
```

### 12.9 Purchase & Delivery Flow

#### Third-Party Cards

```
1. User adds gift card to cart
           │
           ▼
2. At checkout: Reserve code (status → 'reserved')
   - Prevents overselling via database transaction
           │
           ▼
3. User completes payment
           │
           ▼
4. On payment success:
   - Mark code as 'sold'
   - Decrypt code
   - Email code to user
   - Code appears in user's library
           │
           ▼
5. If payment fails within 15 minutes:
   - Release reservation (status → 'available')
```

#### Store Credit Cards (Self-Purchase)

```
1. User purchases Zenorar gift card ($25, $50, $100)
           │
           ▼
2. System generates unique code: ZNR-XXXX-XXXX-XXXX
           │
           ▼
3. Code stored in database (no encryption needed)
           │
           ▼
4. User can:
   - Redeem immediately (adds to their wallet)
   - Save for later
   - Send to someone else
```

#### Store Credit Cards (Gift to Others)

```
1. User selects "Send as Gift"
           │
           ▼
2. Enters recipient email, name, and message
           │
           ▼
3. Completes payment
           │
           ▼
4. System sends email to recipient:
   "John sent you a $50 Zenorar Gift Card!"
   [Redeem Now] → zenorar.com/redeem?code=ZNR-XXXX
           │
           ▼
5. Recipient logs in/creates account
           │
           ▼
6. Enters code → Balance added to wallet
```

### 12.10 Admin Interface

#### Stock Dashboard

```
┌─────────────────────────────────────────────────────────┐
│  Gift Card Inventory Dashboard                           │
├─────────────────────────────────────────────────────────┤
│  Brand         │ $10  │ $25  │ $50  │ $100 │ Total     │
├─────────────────────────────────────────────────────────┤
│  Steam         │  45  │  32  │  18  │   5  │   100     │
│  PlayStation   │  20  │  15  │  10  │   8  │    53     │
│  Xbox          │  30  │  25  │  12  │   3  │    70     │
│  iTunes        │  50  │  40  │  20  │  10  │   120     │
│  Amazon        │  ⚠️ 2│  15  │  ⚠️ 5│  20  │    42     │
├─────────────────────────────────────────────────────────┤
│  ⚠️ = Low stock (< 10)                                  │
└─────────────────────────────────────────────────────────┘
```

#### CSV Import Format

```csv
code,denomination
STEAM-XXXX-YYYY-ZZZZ,10
STEAM-AAAA-BBBB-CCCC,25
STEAM-1111-2222-3333,50
```

### 12.11 API Endpoints

#### Public Endpoints
```
GET /api/gift-cards/brands              - List all active brands
GET /api/gift-cards/brands/:slug        - Brand details with stock
GET /api/gift-cards/brands/:id/stock    - Check stock per denomination
```

#### Authenticated Endpoints
```
GET /api/gift-cards/my-cards            - User's purchased cards
POST /api/gift-cards/:codeId/reveal     - Reveal card code (logged)
POST /api/store-credit/redeem           - Redeem store credit code
```

#### Admin Endpoints
```
POST /api/admin/gift-cards/brands                    - Create brand
PATCH /api/admin/gift-cards/brands/:id               - Update brand
POST /api/admin/gift-cards/brands/:id/import         - Bulk import codes
GET /api/admin/gift-cards/inventory                  - Full inventory report
PATCH /api/admin/gift-cards/codes/:id/invalidate     - Mark code invalid
POST /api/admin/store-credit/generate                - Generate promo cards
```

### 12.12 Comparison: Scripts vs Gift Cards

| Aspect | Scripts | Gift Cards |
|--------|---------|------------|
| **Storage** | R2 files | Database (encrypted strings) |
| **Delivery** | Signed URL download | Code reveal + email |
| **Inventory** | Unlimited (same file) | Limited (unique codes) |
| **Expiration** | Never | Some cards expire |
| **Security** | Signed URLs, 1hr expiry | AES-256 encryption |
| **Size** | Up to 1GB | ~50 characters |
| **Reuse** | Same file for all buyers | One code per buyer |
| **Versioning** | Multiple versions | N/A |

### 12.13 Implementation Checklist

**Third-Party Cards:**
- [ ] Database migration for gift card tables
- [ ] Encryption service (AES-256-GCM)
- [ ] Gift card service (add, reserve, complete sale)
- [ ] Admin bulk import UI
- [ ] User library integration
- [ ] Email delivery templates
- [ ] Rate limiting on reveals

**Store Credit Cards:**
- [ ] Store credit table migration
- [ ] Code generation service
- [ ] Redemption endpoint and page
- [ ] Wallet integration
- [ ] Gift-sending flow
- [ ] Admin promotional card generator

**Security:**
- [ ] Encryption key is 32 bytes (64 hex chars)
- [ ] Codes encrypted in database
- [ ] Duplicate codes rejected on import
- [ ] Only code owner can reveal
- [ ] All reveals logged with IP
- [ ] Reservations timeout after 15 minutes
- [ ] Rate limiting (5 reveals/minute)

---

## 13. eSIM System - Sourcing, Integration & Delivery

### 13.1 Overview

An eSIM (embedded SIM) is a digital SIM that allows users to activate a mobile data plan without a physical SIM card. Users scan a QR code to install the eSIM profile on their device.

#### eSIM Business Model

```
WHOLESALE PROVIDER (Airalo, eSIM Go, etc.)
       │
       │ Bulk pricing: $5 for 5GB plan
       ▼
YOUR PLATFORM (Zenorar)
       │
       │ Retail price: $8 for 5GB plan (60% markup)
       ▼
CUSTOMER
       │
       │ Receives: QR code + activation instructions
       ▼
DEVICE (iPhone/Android)
       Scans QR → Installs eSIM → Has mobile data
```

#### Key Business Metrics
- **Wholesale cost:** $3-7 per plan (varies by data amount and region)
- **Retail price:** $5-20 per plan
- **Typical margin:** 40-60%
- **Delivery cost:** $0 (instant digital delivery)

### 13.2 eSIM Provider Comparison

| Provider | Coverage | API | Min Order | Pricing | Best For |
|----------|----------|-----|-----------|---------|----------|
| **Airalo Partners** | 200+ countries | REST API | $500/mo | Tiered | Best coverage, most popular |
| **eSIM Go** | 160+ countries | REST API | No minimum | Per-eSIM | Smaller operations |
| **BNESIM** | 150+ countries | REST API | $1000 | Wholesale | European market |
| **Holafly Business** | 170+ countries | API available | Contact | Custom | Latin America focus |
| **GigSky B2B** | 190+ countries | API | Enterprise | Custom | Enterprise clients |
| **RedteaGO** | 200+ countries | REST API | No minimum | Per-eSIM | Asia-Pacific |
| **MobiMatter** | 150+ countries | REST API | $200 | Low margins | Budget option |

#### Recommended: Airalo Partners Program

**Why Airalo:**
- Largest eSIM provider globally
- Well-documented API
- Real-time inventory
- Automatic QR code generation
- 24/7 support

**Pricing Tiers (Approximate):**
- Tier 1 (< $500/mo): 20% discount off retail
- Tier 2 ($500-2000/mo): 30% discount
- Tier 3 ($2000-5000/mo): 40% discount
- Tier 4 (> $5000/mo): 50%+ discount

**Getting Started Strategy:**
Start with eSIM Go (no minimum) → Move to Airalo once you have volume

### 13.3 Database Schema

```sql
-- eSIM regions (continents/areas)
CREATE TABLE esim_regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,           -- "Europe", "Asia Pacific"
  slug VARCHAR(100) UNIQUE NOT NULL,    -- "europe", "asia-pacific"
  description TEXT,
  image_url VARCHAR(500),
  country_count INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Countries covered by eSIM plans
CREATE TABLE esim_countries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id UUID REFERENCES esim_regions(id),
  name VARCHAR(100) NOT NULL,           -- "France"
  iso_code VARCHAR(2) NOT NULL,         -- "FR"
  flag_emoji VARCHAR(10),               -- "🇫🇷"
  networks TEXT[],                       -- ["Orange", "SFR", "Bouygues"]
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- eSIM plan templates (what we sell)
CREATE TABLE esim_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider VARCHAR(50) NOT NULL,        -- "airalo", "esimgo"
  provider_plan_id VARCHAR(100),        -- Provider's plan ID for API calls
  name VARCHAR(255) NOT NULL,           -- "Europe 5GB - 30 Days"
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  region_id UUID REFERENCES esim_regions(id),
  coverage_type VARCHAR(20) NOT NULL,   -- "single", "regional", "global"
  countries TEXT[],                      -- ISO codes: ["FR", "DE", "IT"]
  data_amount_gb DECIMAL(10,2) NOT NULL,
  data_amount_display VARCHAR(50),       -- "5GB" or "Unlimited"
  validity_days INT NOT NULL,
  is_unlimited BOOLEAN DEFAULT false,
  voice_minutes INT DEFAULT 0,
  sms_count INT DEFAULT 0,
  cost_price DECIMAL(10,2) NOT NULL,    -- What we pay
  retail_price DECIMAL(10,2) NOT NULL,  -- What we sell for
  currency VARCHAR(3) DEFAULT 'USD',
  speed_description VARCHAR(100),        -- "4G/LTE" or "5G"
  network_type VARCHAR(20),
  hotspot_allowed BOOLEAN DEFAULT true,
  supports_topup BOOLEAN DEFAULT false,
  activation_policy VARCHAR(20) DEFAULT 'first-use',
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- User's purchased eSIMs
CREATE TABLE user_esims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  plan_id UUID NOT NULL REFERENCES esim_plans(id),
  order_id UUID NOT NULL REFERENCES orders(id),
  provider VARCHAR(50) NOT NULL,
  provider_order_id VARCHAR(100),
  provider_esim_id VARCHAR(100),
  iccid VARCHAR(30),                     -- Integrated Circuit Card ID
  matching_id VARCHAR(100),              -- For manual installation
  smdp_address VARCHAR(255),             -- SM-DP+ server address
  qr_code_data TEXT,                     -- Raw QR code string
  qr_code_url VARCHAR(500),              -- Generated QR image URL
  installation_manual JSONB,
  status VARCHAR(20) DEFAULT 'pending',  -- 'pending', 'active', 'installed', 'expired', 'error'
  activated_at TIMESTAMP,
  expires_at TIMESTAMP,
  data_used_mb DECIMAL(10,2) DEFAULT 0,
  data_remaining_mb DECIMAL(10,2),
  last_usage_sync TIMESTAMP,
  delivered_at TIMESTAMP,
  delivery_method VARCHAR(20),
  error_message TEXT,
  retry_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 13.4 Purchase & Delivery Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    eSIM PURCHASE FLOW                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. BROWSE & SELECT                                                  │
│     └── User selects region → country → plan                        │
│                                                                      │
│  2. ADD TO CART                                                      │
│     └── Validate plan still available via provider API              │
│                                                                      │
│  3. CHECKOUT                                                         │
│     └── No reservation needed (eSIMs are provisioned on-demand)     │
│                                                                      │
│  4. PAYMENT SUCCESS                                                  │
│     └── Call provider API to provision eSIM                         │
│     └── Provider returns: ICCID, QR code, activation details        │
│                                                                      │
│  5. DELIVERY                                                         │
│     ├── Save eSIM details to database                               │
│     ├── Generate QR code image                                       │
│     ├── Send email with QR + instructions                           │
│     └── Show in user's library immediately                          │
│                                                                      │
│  6. INSTALLATION                                                     │
│     └── User scans QR code → eSIM installs on device                │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 13.5 Provider API Integration

#### Airalo API Flow
```typescript
// 1. Authenticate
POST /oauth/token
{ client_id, client_secret, grant_type: 'client_credentials' }

// 2. Get packages
GET /packages
Returns: Available plans with pricing

// 3. Order eSIM
POST /orders
{ package_id, quantity: 1, type: 'sim' }
Returns: { iccid, qrcode, smdp_address, matching_id }

// 4. Check usage
GET /sims/{esim_id}/usage
Returns: { status, total, remaining, expired_at }

// 5. Top-up
POST /sims/{esim_id}/topups
{ package_id }
```

#### eSIM Go API Flow
```typescript
// Get catalogue
GET /catalogue
Returns: Available bundles

// Purchase eSIM
POST /esims/apply
{ type: 'bundle', bundle: bundle_name, count: 1 }
Returns: { iccid, matchingId, smdpAddress, activationCode }

// Check status
GET /esims/{iccid}
Returns: { status, dataUsed, dataRemaining }
```

### 13.6 Security Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    eSIM SECURITY                                     │
├─────────────────────────────────────────────────────────────────────┤
│  1. QR Code Security                                                 │
│     ├── QR codes only shown to purchaser                            │
│     ├── Rate limit QR code views (prevent scraping)                 │
│     └── QR codes are one-time use (by design)                       │
├─────────────────────────────────────────────────────────────────────┤
│  2. API Security                                                     │
│     ├── Provider API keys in environment variables                   │
│     ├── Never expose provider credentials to frontend               │
│     └── Validate ownership before showing eSIM details              │
├─────────────────────────────────────────────────────────────────────┤
│  3. Provision After Payment                                          │
│     ├── Only provision after payment confirmed                      │
│     ├── No reservations needed (on-demand provisioning)             │
│     └── Retry failed provisions with exponential backoff            │
├─────────────────────────────────────────────────────────────────────┤
│  4. Fraud Prevention                                                 │
│     ├── Limit purchases per user per day                            │
│     ├── Flag bulk purchases for review                              │
│     └── Monitor for unusual patterns                                │
└─────────────────────────────────────────────────────────────────────┘
```

### 13.7 API Endpoints

#### Public Endpoints
```
GET /api/esim/regions                   - List all regions
GET /api/esim/regions/:slug             - Region details with countries
GET /api/esim/plans                     - List all plans (filterable)
GET /api/esim/plans/:slug               - Plan details
```

#### Authenticated Endpoints
```
GET /api/esim/my-esims                  - User's purchased eSIMs
GET /api/esim/:id                       - eSIM details with QR code
POST /api/esim/:id/sync-usage           - Refresh usage data
POST /api/esim/:id/topup                - Top-up existing eSIM
```

#### Admin Endpoints
```
POST /api/admin/esim/sync-plans         - Sync plans from provider
PATCH /api/admin/esim/plans/:id         - Update plan pricing
GET /api/admin/esim/sales               - Sales report
GET /api/admin/esim/failed              - Failed provisions
```

### 13.8 Environment Variables

```env
# Airalo (recommended)
AIRALO_API_URL=https://partner-api.airalo.com/v2
AIRALO_CLIENT_ID=your_client_id
AIRALO_CLIENT_SECRET=your_client_secret

# eSIM Go (alternative)
ESIMGO_API_KEY=your_api_key

# Default provider
DEFAULT_ESIM_PROVIDER=airalo
```

### 13.9 Implementation Checklist

- [ ] Choose and register with eSIM provider (Airalo or eSIM Go)
- [ ] Database migration for eSIM tables
- [ ] Provider service implementation
- [ ] QR code generation service
- [ ] Purchase flow integration
- [ ] Email delivery with QR code
- [ ] Library page eSIM section
- [ ] Usage sync cron job
- [ ] Top-up flow (if supported)
- [ ] Error retry mechanism
- [ ] Admin dashboard

---

## 14. Virtual Numbers System - Sourcing, Integration & Delivery

### 14.1 Overview

A virtual phone number (DID - Direct Inward Dialing) is a phone number not tied to a physical phone line. It can receive SMS/calls and forward them to any destination.

#### Use Cases
- **Privacy:** Temporary numbers for online signups
- **Business:** Local presence in different countries
- **Verification:** Receive SMS codes
- **Travel:** Local number while abroad
- **Marketing:** Tracking campaign performance

#### Revenue Model

```
PROVIDER (Twilio, Vonage, Plivo)
       │
       │ Monthly: $1-2/number + $0.01/SMS + $0.01/min
       ▼
YOUR PLATFORM (Zenorar)
       │
       │ Monthly: $5-15/number (subscription)
       │ OR: $3-10 for 1-day/7-day temporary numbers
       ▼
CUSTOMER
       │
       │ Gets: Phone number + SMS inbox + Call forwarding

MARGIN: 300-500% on number rental
USAGE: Pass through at 2x markup or include in subscription
```

### 14.2 Telephony Provider Comparison

| Provider | Coverage | API Quality | Pricing | Best For |
|----------|----------|-------------|---------|----------|
| **Twilio** | 100+ countries | Excellent | $1-2/mo + usage | Best overall |
| **Vonage** | 65+ countries | Good | $1-3/mo + usage | Enterprise |
| **Plivo** | 65+ countries | Good | $0.80-1.5/mo | Budget option |
| **Bandwidth** | US/Canada | Excellent | $0.25-1/mo | North America |
| **Telnyx** | 40+ countries | Good | $1-2/mo | Competitive |
| **MessageBird** | 60+ countries | Good | Varies | Europe focus |

#### Recommended: Twilio

**Why Twilio:**
- Best documentation and SDKs
- Largest country coverage
- Reliable delivery
- Programmable SMS/Voice
- Easy number provisioning API
- Compliance handling built-in

**Pricing Structure:**
- Phone number: $1-2/month (varies by country)
- Incoming SMS: $0.0075/message
- Outgoing SMS: $0.0079/message
- Incoming calls: $0.0085/minute
- Outgoing calls: $0.013/minute

**Your Markup Example:**
- You pay Twilio: $1/month for US number
- You charge customer: $5/month
- Gross margin: $4/month per number (400%)

### 14.3 Pricing Strategies

| Model | Description | Best For |
|-------|-------------|----------|
| **Subscription** | $X/month for number + N messages | Regular users |
| **Temporary** | $X for 1-day or 7-day access | SMS verification |
| **Pay-as-you-go** | $X/month + per-message fee | High-volume users |
| **Bundle** | Number + eSIM package | Travelers |

### 14.4 Database Schema

```sql
-- Available countries for virtual numbers
CREATE TABLE virtual_number_countries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,           -- "United States"
  iso_code VARCHAR(2) NOT NULL,         -- "US"
  dial_code VARCHAR(10) NOT NULL,       -- "+1"
  flag_emoji VARCHAR(10),               -- "🇺🇸"
  sms_enabled BOOLEAN DEFAULT true,
  voice_enabled BOOLEAN DEFAULT true,
  mms_enabled BOOLEAN DEFAULT false,
  provider VARCHAR(50) NOT NULL,        -- "twilio"
  cost_monthly DECIMAL(10,2) NOT NULL,  -- $1.00
  cost_sms_inbound DECIMAL(10,4),       -- $0.0075
  cost_sms_outbound DECIMAL(10,4),
  retail_monthly DECIMAL(10,2),         -- $5.00
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Subscription plans for virtual numbers
CREATE TABLE virtual_number_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,           -- "Basic SMS", "Pro", "Business"
  slug VARCHAR(100) UNIQUE NOT NULL,
  duration_type VARCHAR(20) NOT NULL,   -- 'monthly', 'daily', 'weekly'
  duration_days INT NOT NULL,           -- 30, 1, 7
  sms_included INT DEFAULT 0,           -- 100 SMS included
  voice_minutes_included INT DEFAULT 0,
  unlimited_sms BOOLEAN DEFAULT false,
  unlimited_voice BOOLEAN DEFAULT false,
  base_price DECIMAL(10,2) NOT NULL,    -- $5.00
  sms_overage_price DECIMAL(10,4),      -- $0.05 per extra SMS
  features JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- User's virtual numbers
CREATE TABLE user_virtual_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  plan_id UUID NOT NULL REFERENCES virtual_number_plans(id),
  country_id UUID NOT NULL REFERENCES virtual_number_countries(id),
  phone_number VARCHAR(20) NOT NULL,    -- "+14155551234"
  phone_number_display VARCHAR(30),     -- "(415) 555-1234"
  number_type VARCHAR(20),              -- "local", "toll-free", "mobile"
  provider VARCHAR(50) NOT NULL,
  provider_number_sid VARCHAR(50),      -- Twilio's SID
  status VARCHAR(20) DEFAULT 'active',  -- 'active', 'suspended', 'expired', 'cancelled'
  order_id UUID REFERENCES orders(id),
  started_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  next_billing_at TIMESTAMP,
  sms_forwarding_enabled BOOLEAN DEFAULT true,
  sms_forward_to VARCHAR(20),
  sms_forward_email VARCHAR(255),
  voice_forwarding_enabled BOOLEAN DEFAULT false,
  voice_forward_to VARCHAR(20),
  voicemail_enabled BOOLEAN DEFAULT false,
  sms_sent_count INT DEFAULT 0,
  sms_received_count INT DEFAULT 0,
  voice_minutes_used INT DEFAULT 0,
  current_period_sms INT DEFAULT 0,
  nickname VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

-- SMS message log
CREATE TABLE virtual_number_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  virtual_number_id UUID NOT NULL REFERENCES user_virtual_numbers(id),
  user_id UUID NOT NULL REFERENCES users(id),
  direction VARCHAR(10) NOT NULL,       -- 'inbound', 'outbound'
  from_number VARCHAR(20) NOT NULL,
  to_number VARCHAR(20) NOT NULL,
  body TEXT,
  media_urls TEXT[],                    -- MMS attachments
  provider_message_sid VARCHAR(50),
  status VARCHAR(20) DEFAULT 'delivered',
  forwarded_to VARCHAR(255),
  forwarded_at TIMESTAMP,
  cost DECIMAL(10,4),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Voice call log
CREATE TABLE virtual_number_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  virtual_number_id UUID NOT NULL REFERENCES user_virtual_numbers(id),
  user_id UUID NOT NULL REFERENCES users(id),
  direction VARCHAR(10) NOT NULL,
  from_number VARCHAR(20) NOT NULL,
  to_number VARCHAR(20) NOT NULL,
  duration_seconds INT DEFAULT 0,
  status VARCHAR(20),                   -- 'completed', 'missed', 'voicemail'
  provider_call_sid VARCHAR(50),
  recording_url VARCHAR(500),
  voicemail_url VARCHAR(500),
  cost DECIMAL(10,4),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 14.5 Purchase Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                VIRTUAL NUMBER PURCHASE FLOW                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. BROWSE                                                           │
│     └── User selects country → number type → plan                   │
│                                                                      │
│  2. SEARCH NUMBERS                                                   │
│     └── API call to provider → show available numbers               │
│                                                                      │
│  3. SELECT NUMBER                                                    │
│     └── User chooses specific number (e.g., by area code)           │
│                                                                      │
│  4. CHECKOUT                                                         │
│     └── Add to cart → payment                                       │
│                                                                      │
│  5. PROVISION                                                        │
│     └── Purchase number from provider                               │
│     └── Configure webhooks for SMS/voice                            │
│                                                                      │
│  6. DELIVERY                                                         │
│     ├── Number active immediately                                   │
│     ├── SMS inbox ready                                              │
│     └── Email confirmation sent                                      │
│                                                                      │
│  7. ONGOING                                                          │
│     └── User manages via inbox/settings                             │
│     └── Auto-renewal or expiration                                  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 14.6 Twilio API Integration

```typescript
// Search available numbers
const numbers = await client.availablePhoneNumbers(countryCode)
  .local.list({ smsEnabled: true, limit: 20 })

// Purchase number
const number = await client.incomingPhoneNumbers.create({
  phoneNumber: selectedNumber,
  smsUrl: 'https://api.zenorar.com/webhooks/twilio/sms',
  voiceUrl: 'https://api.zenorar.com/webhooks/twilio/voice'
})

// Send SMS
await client.messages.create({
  from: userNumber,
  to: recipient,
  body: message
})

// Release number
await client.incomingPhoneNumbers(numberSid).remove()
```

### 14.7 Webhook Handling

```typescript
// Incoming SMS webhook
app.post('/webhooks/twilio/sms', async (req, res) => {
  const { To, From, Body, MessageSid } = req.body

  // Validate Twilio signature
  // Find virtual number
  // Save message to database
  // Forward if configured (email or phone)
  // Send real-time notification

  res.type('text/xml').send('<Response></Response>')
})

// Incoming voice webhook
app.post('/webhooks/twilio/voice', async (req, res) => {
  const { To, From, CallSid } = req.body

  // Find virtual number and forwarding settings
  if (forwardingEnabled) {
    res.type('text/xml').send(`
      <Response>
        <Dial callerId="${To}">${forwardTo}</Dial>
      </Response>
    `)
  } else if (voicemailEnabled) {
    res.type('text/xml').send(`
      <Response>
        <Say>Please leave a message.</Say>
        <Record maxLength="120" action="/webhooks/twilio/voicemail"/>
      </Response>
    `)
  }
})
```

### 14.8 Security & Compliance

```
┌─────────────────────────────────────────────────────────────────────┐
│                VIRTUAL NUMBER SECURITY                               │
├─────────────────────────────────────────────────────────────────────┤
│  1. Webhook Security                                                 │
│     ├── Validate Twilio signature on all webhooks                   │
│     ├── Use HTTPS only                                              │
│     └── IP whitelist if supported                                   │
├─────────────────────────────────────────────────────────────────────┤
│  2. Access Control                                                   │
│     ├── Users can only access their own numbers                     │
│     ├── Rate limit API calls                                        │
│     └── Audit log all actions                                       │
├─────────────────────────────────────────────────────────────────────┤
│  3. Compliance                                                       │
│     ├── A2P 10DLC registration for US numbers                       │
│     ├── GDPR for EU numbers                                         │
│     ├── Message retention policies                                   │
│     └── Opt-out handling (STOP keywords)                            │
├─────────────────────────────────────────────────────────────────────┤
│  4. Fraud Prevention                                                 │
│     ├── Limit numbers per user (e.g., 5)                            │
│     ├── Require verified account for purchase                       │
│     ├── Monitor for abuse patterns                                  │
│     └── Block known abuse destinations                              │
└─────────────────────────────────────────────────────────────────────┘
```

### 14.9 API Endpoints

#### Public Endpoints
```
GET /api/virtual-numbers/countries              - List available countries
GET /api/virtual-numbers/plans                  - List subscription plans
POST /api/virtual-numbers/search                - Search available numbers
```

#### Authenticated Endpoints
```
GET /api/virtual-numbers/my-numbers             - User's numbers
GET /api/virtual-numbers/:id                    - Number details
GET /api/virtual-numbers/:id/inbox              - SMS inbox
POST /api/virtual-numbers/:id/send              - Send SMS
PATCH /api/virtual-numbers/:id/settings         - Update forwarding
DELETE /api/virtual-numbers/:id                 - Cancel number
POST /api/virtual-numbers/:id/renew             - Renew subscription
```

#### Admin Endpoints
```
GET /api/admin/virtual-numbers                  - All active numbers
GET /api/admin/virtual-numbers/usage            - Usage report
PATCH /api/admin/virtual-numbers/countries/:id  - Update country pricing
```

### 14.10 Environment Variables

```env
# Twilio (recommended)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890  # For sending alerts

# Plivo (alternative)
PLIVO_AUTH_ID=your_auth_id
PLIVO_AUTH_TOKEN=your_auth_token

# Default provider
DEFAULT_VN_PROVIDER=twilio
```

### 14.11 Implementation Checklist

- [ ] Register with Twilio and verify identity
- [ ] Database migration for virtual number tables
- [ ] Twilio service implementation
- [ ] Webhook endpoints with signature validation
- [ ] Number search and purchase flow
- [ ] SMS inbox and sending
- [ ] Forwarding configuration
- [ ] Subscription renewal cron job
- [ ] Expiration and release cron job
- [ ] Admin dashboard

---

## 15. Full Product Comparison Matrix

| Feature | Scripts | Gift Cards | eSIMs | Virtual Numbers |
|---------|---------|------------|-------|-----------------|
| **Provisioning** |
| Storage | R2 files | Database | Provider API | Provider API |
| On-demand | Yes | No (inventory) | Yes | Yes |
| Inventory mgmt | N/A | Required | N/A | N/A |
| **Delivery** |
| Method | Download URL | Code reveal | QR code | Instant access |
| Email | Optional | Yes | Yes | Yes |
| Time to deliver | Instant | Instant | 1-5 seconds | 1-5 seconds |
| **Business Model** |
| Pricing | One-time | One-time | One-time | Subscription |
| Recurring revenue | No | No | Top-ups | Monthly |
| **Economics** |
| Your cost | $0 | Bulk buy | Per provision | Monthly + usage |
| Typical margin | 100% | 40-60% | 40-60% | 300-500% |
| Working capital | None | High (inventory) | Low | Low |
| **Complexity** |
| Setup | Easy | Medium | Medium | Hard |
| Maintenance | Low | Medium | Low | High |
| Provider dependency | None | Low | High | High |
| **User Management** |
| Expiration | No | Some | Yes | Yes |
| Usage tracking | Downloads | N/A | Data used | SMS/Voice |
| Renewals | Updates only | N/A | Top-ups | Monthly |
| **Security Focus** |
| Primary concern | Piracy | Encryption | QR protection | Webhook auth |
| Key storage | R2 signed URLs | AES-256 | Provider-side | Provider-side |

### Recommended Implementation Order

1. **Scripts** - Foundation, easy to implement, high margin
2. **Gift Cards** - Familiar product, good for building traffic
3. **eSIMs** - Travel market, good margins, medium complexity
4. **Virtual Numbers** - Highest complexity but best recurring revenue

---

*Document generated for Zenorar Marketplace*
*Last updated: February 2026*

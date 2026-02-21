/**
 * Blockchain verification service using free public APIs
 * Supports: BTC, ETH, USDT (ERC20/BEP20/TRC20), BNB, USDC, SOL, TRON
 */

export interface VerificationParams {
  network: string
  address: string
  expectedAmount: number
  tolerancePercent: number
  sinceTimestamp: number // Unix timestamp in ms
  userTxHash?: string // Optional user-provided tx hash for faster lookup
}

export interface VerificationResult {
  found: boolean
  txHash?: string
  amount?: number
  confirmations?: number
  error?: string
}

interface ParsedTransaction {
  txHash: string
  amount: number
  timestamp: number
  confirmations: number
  toAddress?: string
}

// Blockchain explorer URLs for manual verification
export const BLOCKCHAIN_EXPLORERS: Record<string, string> = {
  BTC: 'https://blockstream.info/tx/',
  ETH: 'https://etherscan.io/tx/',
  USDT_ERC20: 'https://etherscan.io/tx/',
  USDC: 'https://etherscan.io/tx/',
  BNB: 'https://bscscan.com/tx/',
  USDT_BEP20: 'https://bscscan.com/tx/',
  TRON: 'https://tronscan.org/#/transaction/',
  USDT_TRC20: 'https://tronscan.org/#/transaction/',
  SOL: 'https://solscan.io/tx/',
}

// Network-specific API configurations
const BLOCKCHAIN_APIS = {
  BTC: {
    // Blockstream API (free, no key required)
    getTransactions: async (address: string): Promise<any[]> => {
      const res = await fetch(`https://blockstream.info/api/address/${address}/txs`)
      if (!res.ok) throw new Error('Blockstream API error')
      return res.json()
    },
    parseTransaction: (tx: any, address: string): ParsedTransaction => {
      // Find outputs to our address
      const relevantOutputs = tx.vout.filter((out: any) =>
        out.scriptpubkey_address === address
      )
      const amount = relevantOutputs.reduce((sum: number, out: any) => sum + (out.value || 0), 0) / 100000000
      return {
        txHash: tx.txid,
        amount,
        timestamp: tx.status.block_time ? tx.status.block_time * 1000 : Date.now(),
        confirmations: tx.status.confirmed ? (tx.status.block_height ? 1 : 0) : 0,
        toAddress: address
      }
    }
  },

  ETH: {
    // Etherscan API (free tier: 5 calls/sec)
    getTransactions: async (address: string): Promise<any[]> => {
      const apiKey = process.env.ETHERSCAN_API_KEY || ''
      const url = `https://api.etherscan.io/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=desc&apikey=${apiKey}`
      const res = await fetch(url)
      const data = await res.json()
      if (data.status !== '1' && data.message !== 'No transactions found') return []
      return data.result || []
    },
    parseTransaction: (tx: any): ParsedTransaction => ({
      txHash: tx.hash,
      amount: parseInt(tx.value) / 1e18,
      timestamp: parseInt(tx.timeStamp) * 1000,
      confirmations: tx.confirmations ? parseInt(tx.confirmations) : 0,
      toAddress: tx.to?.toLowerCase()
    })
  },

  USDT_ERC20: {
    // Etherscan Token Transfers API
    getTransactions: async (address: string): Promise<any[]> => {
      const apiKey = process.env.ETHERSCAN_API_KEY || ''
      const usdtContract = '0xdAC17F958D2ee523a2206206994597C13D831ec7'
      const url = `https://api.etherscan.io/api?module=account&action=tokentx&contractaddress=${usdtContract}&address=${address}&sort=desc&apikey=${apiKey}`
      const res = await fetch(url)
      const data = await res.json()
      if (data.status !== '1' && data.message !== 'No transactions found') return []
      return data.result || []
    },
    parseTransaction: (tx: any): ParsedTransaction => ({
      txHash: tx.hash,
      amount: parseInt(tx.value) / 1e6, // USDT has 6 decimals
      timestamp: parseInt(tx.timeStamp) * 1000,
      confirmations: tx.confirmations ? parseInt(tx.confirmations) : 0,
      toAddress: tx.to?.toLowerCase()
    })
  },

  USDC: {
    // Etherscan Token Transfers API for USDC
    getTransactions: async (address: string): Promise<any[]> => {
      const apiKey = process.env.ETHERSCAN_API_KEY || ''
      const usdcContract = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
      const url = `https://api.etherscan.io/api?module=account&action=tokentx&contractaddress=${usdcContract}&address=${address}&sort=desc&apikey=${apiKey}`
      const res = await fetch(url)
      const data = await res.json()
      if (data.status !== '1' && data.message !== 'No transactions found') return []
      return data.result || []
    },
    parseTransaction: (tx: any): ParsedTransaction => ({
      txHash: tx.hash,
      amount: parseInt(tx.value) / 1e6, // USDC has 6 decimals
      timestamp: parseInt(tx.timeStamp) * 1000,
      confirmations: tx.confirmations ? parseInt(tx.confirmations) : 0,
      toAddress: tx.to?.toLowerCase()
    })
  },

  BNB: {
    // BSCScan API
    getTransactions: async (address: string): Promise<any[]> => {
      const apiKey = process.env.BSCSCAN_API_KEY || ''
      const url = `https://api.bscscan.com/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=desc&apikey=${apiKey}`
      const res = await fetch(url)
      const data = await res.json()
      if (data.status !== '1' && data.message !== 'No transactions found') return []
      return data.result || []
    },
    parseTransaction: (tx: any): ParsedTransaction => ({
      txHash: tx.hash,
      amount: parseInt(tx.value) / 1e18,
      timestamp: parseInt(tx.timeStamp) * 1000,
      confirmations: tx.confirmations ? parseInt(tx.confirmations) : 0,
      toAddress: tx.to?.toLowerCase()
    })
  },

  USDT_BEP20: {
    // BSCScan Token API
    getTransactions: async (address: string): Promise<any[]> => {
      const apiKey = process.env.BSCSCAN_API_KEY || ''
      const usdtContract = '0x55d398326f99059fF775485246999027B3197955'
      const url = `https://api.bscscan.com/api?module=account&action=tokentx&contractaddress=${usdtContract}&address=${address}&sort=desc&apikey=${apiKey}`
      const res = await fetch(url)
      const data = await res.json()
      if (data.status !== '1' && data.message !== 'No transactions found') return []
      return data.result || []
    },
    parseTransaction: (tx: any): ParsedTransaction => ({
      txHash: tx.hash,
      amount: parseInt(tx.value) / 1e18, // BSC USDT has 18 decimals
      timestamp: parseInt(tx.timeStamp) * 1000,
      confirmations: tx.confirmations ? parseInt(tx.confirmations) : 0,
      toAddress: tx.to?.toLowerCase()
    })
  },

  TRON: {
    // TronScan API (free)
    getTransactions: async (address: string): Promise<any[]> => {
      const url = `https://apilist.tronscanapi.com/api/transaction?address=${address}&limit=50&sort=-timestamp`
      const res = await fetch(url)
      const data = await res.json()
      return data.data || []
    },
    parseTransaction: (tx: any): ParsedTransaction => ({
      txHash: tx.hash,
      amount: (tx.contractData?.amount || tx.amount || 0) / 1e6, // TRX has 6 decimals
      timestamp: tx.timestamp,
      confirmations: tx.confirmed ? 1 : 0,
      toAddress: tx.toAddress || tx.contractData?.to_address
    })
  },

  USDT_TRC20: {
    // TronScan TRC20 API
    getTransactions: async (address: string): Promise<any[]> => {
      const usdtContract = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'
      const url = `https://apilist.tronscanapi.com/api/token_trc20/transfers?relatedAddress=${address}&contract=${usdtContract}&limit=50&sort=-timestamp`
      const res = await fetch(url)
      const data = await res.json()
      return data.token_transfers || []
    },
    parseTransaction: (tx: any): ParsedTransaction => ({
      txHash: tx.transaction_id,
      amount: parseInt(tx.quant) / 1e6, // USDT TRC20 has 6 decimals
      timestamp: tx.block_ts,
      confirmations: tx.confirmed ? 1 : 0,
      toAddress: tx.to_address
    })
  },

  SOL: {
    // Solscan API (free)
    getTransactions: async (address: string): Promise<any[]> => {
      const url = `https://api.solscan.io/account/transfer?account=${address}&limit=50`
      const res = await fetch(url, {
        headers: { 'Accept': 'application/json' }
      })
      const data = await res.json()
      return data.data || []
    },
    parseTransaction: (tx: any): ParsedTransaction => ({
      txHash: tx.txHash || tx.signature,
      amount: (tx.lamport || 0) / 1e9, // SOL has 9 decimals
      timestamp: (tx.blockTime || 0) * 1000,
      confirmations: tx.status === 'Success' ? 10 : 0,
      toAddress: tx.dst
    })
  }
}

/**
 * Verify a blockchain payment
 * @param params Verification parameters
 * @returns Verification result
 */
export async function verifyBlockchainPayment(params: VerificationParams): Promise<VerificationResult> {
  const { network, address, expectedAmount, tolerancePercent, sinceTimestamp, userTxHash } = params

  const api = BLOCKCHAIN_APIS[network as keyof typeof BLOCKCHAIN_APIS]
  if (!api) {
    return { found: false, error: `Unsupported network: ${network}` }
  }

  try {
    const transactions = await api.getTransactions(address)

    // Calculate acceptable amount range
    const minAmount = expectedAmount * (1 - tolerancePercent / 100)
    const maxAmount = expectedAmount * (1 + tolerancePercent / 100)

    // Normalize address for comparison
    const normalizedAddress = address.toLowerCase()

    for (const tx of transactions) {
      const parsed = api.parseTransaction(tx, address)

      // If user provided TX hash, prioritize matching it
      if (userTxHash && parsed.txHash.toLowerCase() === userTxHash.toLowerCase()) {
        // Found the user's transaction - verify amount
        if (parsed.amount >= minAmount && parsed.amount <= maxAmount) {
          return {
            found: true,
            txHash: parsed.txHash,
            amount: parsed.amount,
            confirmations: parsed.confirmations
          }
        }
      }

      // Check if transaction is after our initiation time
      if (parsed.timestamp < sinceTimestamp) continue

      // Check if transaction is to our address (for networks that support it)
      if (parsed.toAddress && parsed.toAddress.toLowerCase() !== normalizedAddress) continue

      // Check if amount matches (within tolerance)
      if (parsed.amount >= minAmount && parsed.amount <= maxAmount) {
        return {
          found: true,
          txHash: parsed.txHash,
          amount: parsed.amount,
          confirmations: parsed.confirmations
        }
      }
    }

    return { found: false }
  } catch (error: any) {
    console.error(`Blockchain verification error for ${network}:`, error)
    return { found: false, error: error.message }
  }
}

/**
 * Get explorer URL for a transaction
 * @param network The blockchain network
 * @param txHash The transaction hash
 * @returns Full explorer URL
 */
export function getExplorerUrl(network: string, txHash: string): string {
  const baseUrl = BLOCKCHAIN_EXPLORERS[network]
  if (!baseUrl) return ''
  return `${baseUrl}${txHash}`
}

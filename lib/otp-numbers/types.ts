// OTP Number Types
// For one-time verification code receiving services

export interface OtpService {
  id: string
  name: string
  slug: string
  icon?: string
  popular: boolean
}

export interface OtpCountry {
  id: string
  name: string
  code: string
  flag?: string
}

export interface OtpNumber {
  id: string           // Provider's order/activation ID
  phoneNumber: string
  countryCode: string
  service: string
  status: 'pending' | 'active' | 'completed' | 'cancelled' | 'expired'
  smsCode?: string
  fullSms?: string
  expiresAt: Date
  createdAt: Date
}

export interface OtpProvider {
  name: string

  // Get available services (WhatsApp, Telegram, Google, etc.)
  getServices(): Promise<OtpService[]>

  // Get available countries for a service
  getCountries(serviceId: string): Promise<OtpCountry[]>

  // Get price for a service + country combo
  getPrice(serviceId: string, countryCode: string): Promise<number>

  // Request a number
  requestNumber(serviceId: string, countryCode: string): Promise<{
    success: boolean
    number?: OtpNumber
    error?: string
  }>

  // Check for received SMS
  checkSms(activationId: string): Promise<{
    success: boolean
    status: 'pending' | 'received' | 'cancelled' | 'expired'
    code?: string
    fullSms?: string
    error?: string
  }>

  // Cancel/finish activation
  cancelNumber(activationId: string): Promise<{ success: boolean; error?: string }>

  // Report number as bad (optional)
  reportBadNumber?(activationId: string): Promise<{ success: boolean }>

  // Get account balance
  getBalance(): Promise<number>
}

// Common OTP services
export const POPULAR_OTP_SERVICES: OtpService[] = [
  { id: 'wa', name: 'WhatsApp', slug: 'whatsapp', popular: true },
  { id: 'tg', name: 'Telegram', slug: 'telegram', popular: true },
  { id: 'go', name: 'Google/Gmail', slug: 'google', popular: true },
  { id: 'fb', name: 'Facebook', slug: 'facebook', popular: true },
  { id: 'ig', name: 'Instagram', slug: 'instagram', popular: true },
  { id: 'tw', name: 'Twitter/X', slug: 'twitter', popular: true },
  { id: 'ds', name: 'Discord', slug: 'discord', popular: true },
  { id: 'tt', name: 'TikTok', slug: 'tiktok', popular: true },
  { id: 'am', name: 'Amazon', slug: 'amazon', popular: true },
  { id: 'ms', name: 'Microsoft', slug: 'microsoft', popular: false },
  { id: 'nf', name: 'Netflix', slug: 'netflix', popular: false },
  { id: 'sp', name: 'Spotify', slug: 'spotify', popular: false },
  { id: 'ub', name: 'Uber', slug: 'uber', popular: false },
  { id: 'li', name: 'LinkedIn', slug: 'linkedin', popular: false },
  { id: 'sn', name: 'Snapchat', slug: 'snapchat', popular: false },
  { id: 'ot', name: 'Other/Any', slug: 'other', popular: false },
]

// Service code mappings (varies by provider)
export const SERVICE_CODES = {
  smspool: {
    whatsapp: '1',
    telegram: '2',
    google: '3',
    facebook: '4',
    instagram: '5',
    twitter: '6',
    discord: '7',
    tiktok: '8',
    amazon: '9',
    microsoft: '10',
    netflix: '11',
    spotify: '12',
    uber: '13',
    linkedin: '14',
    snapchat: '15',
    other: '0'
  },
  '5sim': {
    whatsapp: 'whatsapp',
    telegram: 'telegram',
    google: 'google',
    facebook: 'facebook',
    instagram: 'instagram',
    twitter: 'twitter',
    discord: 'discord',
    tiktok: 'tiktok',
    amazon: 'amazon',
    microsoft: 'microsoft',
    netflix: 'netflix',
    spotify: 'spotify',
    uber: 'uber',
    linkedin: 'linkedin',
    snapchat: 'snapchat',
    other: 'any'
  }
}

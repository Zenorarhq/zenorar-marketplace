// Twilio Provider Service for Virtual Numbers

export interface AvailableNumber {
  phoneNumber: string
  friendlyName: string
  locality?: string
  region?: string
  capabilities: {
    sms: boolean
    voice: boolean
    mms: boolean
  }
}

export interface PurchaseResult {
  success: boolean
  numberSid: string
  phoneNumber: string
  error?: string
}

export interface SmsResult {
  success: boolean
  messageSid: string
  status: string
  error?: string
}

class TwilioService {
  private accountSid: string
  private authToken: string
  private baseUrl: string

  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID || ''
    this.authToken = process.env.TWILIO_AUTH_TOKEN || ''
    this.baseUrl = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}`
  }

  private isConfigured(): boolean {
    return !!(this.accountSid && this.authToken)
  }

  private getAuthHeader(): string {
    return 'Basic ' + Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64')
  }

  /**
   * Search for available phone numbers
   */
  async searchNumbers(
    countryCode: string,
    type: 'local' | 'tollFree' | 'mobile' = 'local',
    areaCode?: string,
    limit: number = 20
  ): Promise<AvailableNumber[]> {
    if (!this.isConfigured()) {
      console.warn('Twilio not configured, returning empty results')
      return []
    }

    try {
      const typeEndpoint = type === 'tollFree' ? 'TollFree' : type === 'mobile' ? 'Mobile' : 'Local'
      let url = `${this.baseUrl}/AvailablePhoneNumbers/${countryCode}/${typeEndpoint}.json?SmsEnabled=true&PageSize=${limit}`

      if (areaCode) {
        url += `&AreaCode=${areaCode}`
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const error = await response.json()
        console.error('Twilio search error:', error)
        return []
      }

      const data = await response.json()

      return (data.available_phone_numbers || []).map((n: any) => ({
        phoneNumber: n.phone_number,
        friendlyName: n.friendly_name,
        locality: n.locality,
        region: n.region,
        capabilities: {
          sms: n.capabilities?.sms || false,
          voice: n.capabilities?.voice || false,
          mms: n.capabilities?.mms || false
        }
      }))
    } catch (error) {
      console.error('Twilio search error:', error)
      return []
    }
  }

  /**
   * Purchase a phone number
   */
  async purchaseNumber(phoneNumber: string): Promise<PurchaseResult> {
    if (!this.isConfigured()) {
      return { success: false, numberSid: '', phoneNumber: '', error: 'Twilio not configured' }
    }

    try {
      const webhookBaseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'https://zenorar.com'

      const formData = new URLSearchParams()
      formData.append('PhoneNumber', phoneNumber)
      formData.append('SmsUrl', `${webhookBaseUrl}/api/webhooks/twilio/sms`)
      formData.append('SmsMethod', 'POST')
      formData.append('VoiceUrl', `${webhookBaseUrl}/api/webhooks/twilio/voice`)
      formData.append('VoiceMethod', 'POST')

      const response = await fetch(`${this.baseUrl}/IncomingPhoneNumbers.json`, {
        method: 'POST',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData.toString()
      })

      const data = await response.json()

      if (!response.ok) {
        return {
          success: false,
          numberSid: '',
          phoneNumber: '',
          error: data.message || 'Failed to purchase number'
        }
      }

      return {
        success: true,
        numberSid: data.sid,
        phoneNumber: data.phone_number
      }
    } catch (error: any) {
      return {
        success: false,
        numberSid: '',
        phoneNumber: '',
        error: error.message || 'Failed to purchase number'
      }
    }
  }

  /**
   * Release a phone number (cancel)
   */
  async releaseNumber(numberSid: string): Promise<{ success: boolean; error?: string }> {
    if (!this.isConfigured()) {
      return { success: false, error: 'Twilio not configured' }
    }

    try {
      const response = await fetch(`${this.baseUrl}/IncomingPhoneNumbers/${numberSid}.json`, {
        method: 'DELETE',
        headers: {
          'Authorization': this.getAuthHeader()
        }
      })

      if (!response.ok && response.status !== 204) {
        const error = await response.json()
        return { success: false, error: error.message || 'Failed to release number' }
      }

      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to release number' }
    }
  }

  /**
   * Send outbound SMS
   */
  async sendSms(from: string, to: string, body: string): Promise<SmsResult> {
    if (!this.isConfigured()) {
      return { success: false, messageSid: '', status: '', error: 'Twilio not configured' }
    }

    try {
      const formData = new URLSearchParams()
      formData.append('From', from)
      formData.append('To', to)
      formData.append('Body', body)

      const response = await fetch(`${this.baseUrl}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData.toString()
      })

      const data = await response.json()

      if (!response.ok) {
        return {
          success: false,
          messageSid: '',
          status: '',
          error: data.message || 'Failed to send SMS'
        }
      }

      return {
        success: true,
        messageSid: data.sid,
        status: data.status
      }
    } catch (error: any) {
      return {
        success: false,
        messageSid: '',
        status: '',
        error: error.message || 'Failed to send SMS'
      }
    }
  }

  /**
   * Update webhook URLs for a number
   */
  async configureWebhook(numberSid: string, smsUrl: string, voiceUrl?: string): Promise<{ success: boolean; error?: string }> {
    if (!this.isConfigured()) {
      return { success: false, error: 'Twilio not configured' }
    }

    try {
      const formData = new URLSearchParams()
      formData.append('SmsUrl', smsUrl)
      formData.append('SmsMethod', 'POST')
      if (voiceUrl) {
        formData.append('VoiceUrl', voiceUrl)
        formData.append('VoiceMethod', 'POST')
      }

      const response = await fetch(`${this.baseUrl}/IncomingPhoneNumbers/${numberSid}.json`, {
        method: 'POST',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData.toString()
      })

      if (!response.ok) {
        const error = await response.json()
        return { success: false, error: error.message || 'Failed to configure webhook' }
      }

      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to configure webhook' }
    }
  }

  /**
   * Validate Twilio webhook signature
   */
  validateWebhookSignature(signature: string, url: string, params: Record<string, string>): boolean {
    if (!this.isConfigured()) {
      return false
    }

    try {
      const crypto = require('crypto')

      // Build the data string
      const sortedParams = Object.keys(params).sort()
      let data = url
      for (const key of sortedParams) {
        data += key + params[key]
      }

      // Create HMAC SHA1 signature
      const expectedSignature = crypto
        .createHmac('sha1', this.authToken)
        .update(data)
        .digest('base64')

      return signature === expectedSignature
    } catch (error) {
      console.error('Signature validation error:', error)
      return false
    }
  }
}

export const twilioService = new TwilioService()

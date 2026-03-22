'use client'

import { useState, useEffect } from 'react'
import Icon from '@/components/ui/Icon'
import { QRCodeSVG } from 'qrcode.react'
import * as esimApi from '@/lib/api/esim'
import type { UserEsim } from '@/lib/api/esim'

interface EsimDetailModalProps {
  esimId: string
  isOpen: boolean
  onClose: () => void
}

export default function EsimDetailModal({ esimId, isOpen, onClose }: EsimDetailModalProps) {
  const [esim, setEsim] = useState<UserEsim | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [activeTab, setActiveTab] = useState<'qr' | 'ios' | 'android'>('qr')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (isOpen && esimId) {
      fetchEsimDetails()
    }
  }, [isOpen, esimId])

  const fetchEsimDetails = async () => {
    setIsLoading(true)
    const result = await esimApi.getUserEsim(esimId)
    if (result.success && result.data) {
      setEsim(result.data)
    }
    setIsLoading(false)
  }

  const handleSyncUsage = async () => {
    if (!esim) return
    setIsSyncing(true)
    const result = await esimApi.syncUsage(esimId)
    if (result.success && result.data) {
      setEsim((prev) =>
        prev
          ? {
              ...prev,
              dataUsedMb: result.data!.dataUsedMb,
              dataRemainingMb: result.data!.dataRemainingMb,
              status: result.data!.status as any,
            }
          : null
      )
    }
    setIsSyncing(false)
  }

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const getUsagePercentage = () => {
    if (!esim) return 0
    const total = esim.dataUsedMb + esim.dataRemainingMb
    if (total === 0) return 0
    return (esim.dataUsedMb / total) * 100
  }

  const formatDataSize = (mb: number) => {
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(2)} GB`
    }
    return `${mb.toFixed(0)} MB`
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-[#121212] border border-border-dark rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border-dark">
          <h2 className="text-xl font-bold text-white">eSIM Details</h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
          >
            <Icon name="x" size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-slate-400">Loading eSIM details...</p>
            </div>
          ) : !esim ? (
            <div className="text-center py-12">
              <Icon name="alert-circle" size={48} className="text-red-500 mx-auto mb-4" />
              <p className="text-slate-400">Failed to load eSIM details</p>
            </div>
          ) : (
            <>
              {/* Plan Info */}
              <div className="mb-6">
                <h3 className="text-lg font-bold text-white mb-2">{esim.planName}</h3>
                <div className="flex flex-wrap gap-3 text-sm text-slate-400">
                  <span className="flex items-center gap-1">
                    <Icon name="wifi" size={14} />
                    {esim.dataAmountDisplay}
                  </span>
                  <span className="flex items-center gap-1">
                    <Icon name="clock" size={14} />
                    {esim.validityDays} days
                  </span>
                  <span className="flex items-center gap-1">
                    <Icon name="globe" size={14} />
                    {esim.regionName}
                  </span>
                </div>
              </div>

              {/* Status Badge */}
              <div className="mb-6">
                <div
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                    esim.status === 'active'
                      ? 'bg-green-900/30 text-green-400 border border-green-500/20'
                      : esim.status === 'expired'
                      ? 'bg-red-900/30 text-red-400 border border-red-500/20'
                      : 'bg-yellow-900/30 text-yellow-400 border border-yellow-500/20'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      esim.status === 'active'
                        ? 'bg-green-400'
                        : esim.status === 'expired'
                        ? 'bg-red-400'
                        : 'bg-yellow-400'
                    }`}
                  ></span>
                  {esim.status.charAt(0).toUpperCase() + esim.status.slice(1)}
                </div>
              </div>

              {/* Usage Bar */}
              <div className="mb-6 p-4 bg-surface-dark rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-400">Data Usage</span>
                  <button
                    onClick={handleSyncUsage}
                    disabled={isSyncing}
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    <Icon
                      name="refresh"
                      size={12}
                      className={isSyncing ? 'animate-spin' : ''}
                    />
                    {isSyncing ? 'Syncing...' : 'Sync'}
                  </button>
                </div>
                <div className="h-3 bg-[#1a1a1a] rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-green-400 rounded-full transition-all"
                    style={{ width: `${Math.min(getUsagePercentage(), 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>{formatDataSize(esim.dataUsedMb)} used</span>
                  <span>{formatDataSize(esim.dataRemainingMb)} remaining</span>
                </div>
              </div>

              {/* Expiration */}
              {esim.expiresAt && (
                <div className="mb-6 p-4 bg-surface-dark rounded-xl">
                  <div className="flex items-center gap-2 text-sm">
                    <Icon name="calendar" size={16} className="text-slate-400" />
                    <span className="text-slate-400">Expires:</span>
                    <span className="text-white font-medium">
                      {new Date(esim.expiresAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
              )}

              {/* Tabs */}
              <div className="flex gap-2 mb-4">
                {(['qr', 'ios', 'android'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === tab
                        ? 'bg-primary text-black'
                        : 'bg-surface-dark text-slate-400 hover:text-white'
                    }`}
                  >
                    {tab === 'qr' ? 'QR Code' : tab === 'ios' ? 'iOS' : 'Android'}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              {activeTab === 'qr' && esim.qrCodeData && (
                <div className="text-center">
                  <div className="bg-white p-4 rounded-xl inline-block mb-4">
                    <QRCodeSVG value={esim.qrCodeData} size={200} />
                  </div>
                  <p className="text-sm text-slate-400 mb-3">
                    Scan this QR code with your device's camera to install the eSIM
                  </p>
                  <a
                    href={esim.qrCodeData}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-black font-bold rounded-xl hover:brightness-105 transition-all text-sm mb-4"
                  >
                    Install eSIM on this Device
                  </a>
                  <p className="text-xs text-slate-500 mb-4">Tap on your phone · iPhone iOS 12.1+ or Android 10+</p>
                  <div className="bg-surface-dark rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-slate-500">ICCID</span>
                      <button
                        onClick={() => copyToClipboard(esim.iccid)}
                        className="text-xs text-primary hover:underline"
                      >
                        {copied ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                    <code className="text-xs text-slate-300 break-all">{esim.iccid}</code>
                  </div>
                </div>
              )}

              {activeTab === 'ios' && esim.installationManual?.ios && (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-white mb-2">
                      Automatic Installation (Recommended)
                    </h4>
                    <ol className="space-y-2">
                      {esim.installationManual.ios.automatic.map((step, i) => (
                        <li key={i} className="flex gap-3 text-sm text-slate-400">
                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center">
                            {i + 1}
                          </span>
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-white mb-2">Manual Installation</h4>
                    <ol className="space-y-2">
                      {esim.installationManual.ios.manual.map((step, i) => (
                        <li key={i} className="flex gap-3 text-sm text-slate-400">
                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-700 text-slate-300 text-xs flex items-center justify-center">
                            {i + 1}
                          </span>
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              )}

              {activeTab === 'android' && esim.installationManual?.android && (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-white mb-2">
                      Automatic Installation (Recommended)
                    </h4>
                    <ol className="space-y-2">
                      {esim.installationManual.android.automatic.map((step, i) => (
                        <li key={i} className="flex gap-3 text-sm text-slate-400">
                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center">
                            {i + 1}
                          </span>
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-white mb-2">Manual Installation</h4>
                    <ol className="space-y-2">
                      {esim.installationManual.android.manual.map((step, i) => (
                        <li key={i} className="flex gap-3 text-sm text-slate-400">
                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-700 text-slate-300 text-xs flex items-center justify-center">
                            {i + 1}
                          </span>
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border-dark">
          <button
            onClick={onClose}
            className="w-full py-3 bg-surface-dark border border-border-dark rounded-xl text-white font-medium hover:bg-[#262626] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

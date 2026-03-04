'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { QRCodeSVG } from 'qrcode.react'
import ProfileLayout from '@/components/profile/ProfileLayout'
import Icon from '@/components/ui/Icon'
import { getUserEsim, syncUsage, getTopupOptions, UserEsim } from '@/lib/api/esim'

export default function EsimDetailPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const esimId = params.id as string

  const [activeTab, setActiveTab] = useState<'details' | 'install' | 'topup'>('details')
  const [installPlatform, setInstallPlatform] = useState<'ios' | 'android'>('ios')
  const [copiedField, setCopiedField] = useState<string | null>(null)

  // Fetch eSIM details
  const {
    data: esimData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['user-esim', esimId],
    queryFn: async () => {
      const result = await getUserEsim(esimId)
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch eSIM')
      }
      return result.data
    },
    enabled: !!esimId,
  })

  // Fetch top-up options
  const { data: topupData } = useQuery({
    queryKey: ['esim-topup-options', esimId],
    queryFn: async () => {
      const result = await getTopupOptions(esimId)
      return result.success ? result.data : []
    },
    enabled: !!esimId && activeTab === 'topup',
  })

  // Sync usage mutation
  const syncMutation = useMutation({
    mutationFn: async () => {
      const result = await syncUsage(esimId)
      if (!result.success) {
        throw new Error(result.error || 'Failed to sync usage')
      }
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-esim', esimId] })
    },
  })

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  if (isLoading) {
    return (
      <ProfileLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </ProfileLayout>
    )
  }

  if (error || !esimData) {
    return (
      <ProfileLayout>
        <div className="text-center py-16">
          <Icon name="alert-circle" size={64} className="text-red-500 mx-auto mb-4" />
          <p className="text-slate-400 mb-4">Failed to load eSIM</p>
          <button
            onClick={() => router.push('/profile/library?filter=esims')}
            className="px-4 py-2 bg-surface-dark border border-border-dark rounded-lg text-slate-300 hover:text-white"
          >
            Back to Library
          </button>
        </div>
      </ProfileLayout>
    )
  }

  const dataUsedMb = esimData.dataUsedMb || 0
  const dataRemainingMb = esimData.dataRemainingMb || 0
  const totalDataMb = dataUsedMb + dataRemainingMb
  const usagePercent = totalDataMb > 0 ? (dataUsedMb / totalDataMb) * 100 : 0

  const formatDataSize = (mb: number) => {
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(2)} GB`
    }
    return `${Math.round(mb)} MB`
  }

  return (
    <ProfileLayout>
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.push('/profile/library?filter=esims')}
          className="flex items-center gap-2 text-slate-400 hover:text-white mb-4 transition-colors"
        >
          <Icon name="arrow-left" size={18} />
          Back to Library
        </button>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-white">
                {esimData.planName}
              </h1>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                  esimData.status === 'active'
                    ? 'bg-green-900/30 text-green-500 border border-green-500/20'
                    : esimData.status === 'installed'
                    ? 'bg-blue-900/30 text-blue-500 border border-blue-500/20'
                    : esimData.status === 'expired'
                    ? 'bg-red-900/30 text-red-500 border border-red-500/20'
                    : 'bg-yellow-900/30 text-yellow-500 border border-yellow-500/20'
                }`}
              >
                {esimData.status}
              </span>
            </div>
            <p className="text-slate-400">
              {esimData.regionName} - {esimData.dataAmountDisplay} / {esimData.validityDays} days
            </p>
          </div>

          <button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-surface-dark border border-border-dark rounded-lg text-slate-300 hover:text-white transition-all disabled:opacity-50"
          >
            <Icon name="refresh" size={18} className={syncMutation.isPending ? 'animate-spin' : ''} />
            {syncMutation.isPending ? 'Syncing...' : 'Sync Usage'}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-[#121212] border border-border-dark rounded-xl p-4">
          <div className="text-slate-400 text-sm mb-1">Data Used</div>
          <div className="text-2xl font-bold text-white">
            {formatDataSize(dataUsedMb)}
          </div>
          <div className="mt-2 h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${
                usagePercent >= 90 ? 'bg-red-500' : usagePercent >= 70 ? 'bg-yellow-500' : 'bg-primary'
              }`}
              style={{ width: `${Math.min(usagePercent, 100)}%` }}
            />
          </div>
        </div>

        <div className="bg-[#121212] border border-border-dark rounded-xl p-4">
          <div className="text-slate-400 text-sm mb-1">Data Remaining</div>
          <div className="text-2xl font-bold text-primary">
            {formatDataSize(dataRemainingMb)}
          </div>
        </div>

        <div className="bg-[#121212] border border-border-dark rounded-xl p-4">
          <div className="text-slate-400 text-sm mb-1">ICCID</div>
          <div className="flex items-center gap-2">
            <div className="text-sm font-mono text-white truncate">
              {esimData.iccid?.slice(0, 10)}...
            </div>
            <button
              onClick={() => copyToClipboard(esimData.iccid, 'iccid')}
              className="text-slate-400 hover:text-primary"
            >
              <Icon name={copiedField === 'iccid' ? 'check' : 'copy'} size={14} />
            </button>
          </div>
        </div>

        <div className="bg-[#121212] border border-border-dark rounded-xl p-4">
          <div className="text-slate-400 text-sm mb-1">Expires</div>
          <div className="text-lg font-bold text-white">
            {esimData.expiresAt
              ? new Date(esimData.expiresAt).toLocaleDateString()
              : 'Not activated'}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-border-dark">
        <button
          onClick={() => setActiveTab('details')}
          className={`px-4 py-3 font-medium transition-colors ${
            activeTab === 'details'
              ? 'text-primary border-b-2 border-primary'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Icon name="info" size={18} className="inline mr-2" />
          Details
        </button>
        <button
          onClick={() => setActiveTab('install')}
          className={`px-4 py-3 font-medium transition-colors ${
            activeTab === 'install'
              ? 'text-primary border-b-2 border-primary'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Icon name="download" size={18} className="inline mr-2" />
          Install
        </button>
        <button
          onClick={() => setActiveTab('topup')}
          className={`px-4 py-3 font-medium transition-colors ${
            activeTab === 'topup'
              ? 'text-primary border-b-2 border-primary'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Icon name="plus-circle" size={18} className="inline mr-2" />
          Top-up
        </button>
      </div>

      {/* Details Tab */}
      {activeTab === 'details' && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* QR Code */}
          <div className="bg-[#121212] border border-border-dark rounded-xl p-6 text-center">
            <h3 className="text-lg font-bold text-white mb-4">Activation QR Code</h3>
            {esimData.qrCodeData ? (
              <div className="inline-block p-4 bg-white rounded-xl">
                <QRCodeSVG value={esimData.qrCodeData} size={200} />
              </div>
            ) : (
              <div className="p-8 text-slate-500">
                <Icon name="qr-code" size={64} className="mx-auto mb-2 opacity-50" />
                <p>QR code not available</p>
              </div>
            )}
            <p className="text-slate-400 text-sm mt-4">
              Scan this QR code with your device to install the eSIM
            </p>
          </div>

          {/* Plan Details */}
          <div className="bg-[#121212] border border-border-dark rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">Plan Details</h3>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-slate-400">Plan</span>
                <span className="text-white font-medium">{esimData.planName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Region</span>
                <span className="text-white">{esimData.regionName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Data</span>
                <span className="text-white">{esimData.dataAmountDisplay}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Validity</span>
                <span className="text-white">{esimData.validityDays} days</span>
              </div>
              {esimData.countries && esimData.countries.length > 0 && (
                <div>
                  <span className="text-slate-400 block mb-2">Countries</span>
                  <div className="flex flex-wrap gap-1">
                    {esimData.countries.slice(0, 10).map((country) => (
                      <span
                        key={country}
                        className="px-2 py-1 bg-surface-dark rounded text-xs text-slate-300"
                      >
                        {country}
                      </span>
                    ))}
                    {esimData.countries.length > 10 && (
                      <span className="px-2 py-1 bg-surface-dark rounded text-xs text-slate-400">
                        +{esimData.countries.length - 10} more
                      </span>
                    )}
                  </div>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-400">Purchased</span>
                <span className="text-white">
                  {new Date(esimData.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Install Tab */}
      {activeTab === 'install' && (
        <div className="bg-[#121212] border border-border-dark rounded-xl p-6">
          {/* Platform Toggle */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setInstallPlatform('ios')}
              className={`flex-1 py-3 rounded-lg font-medium transition-all ${
                installPlatform === 'ios'
                  ? 'bg-primary text-black'
                  : 'bg-surface-dark text-slate-300 hover:text-white'
              }`}
            >
              <Icon name="smartphone" size={18} className="inline mr-2" />
              iPhone / iPad
            </button>
            <button
              onClick={() => setInstallPlatform('android')}
              className={`flex-1 py-3 rounded-lg font-medium transition-all ${
                installPlatform === 'android'
                  ? 'bg-primary text-black'
                  : 'bg-surface-dark text-slate-300 hover:text-white'
              }`}
            >
              <Icon name="smartphone" size={18} className="inline mr-2" />
              Android
            </button>
          </div>

          {esimData.installationManual ? (
            <div className="space-y-6">
              {/* Automatic Installation */}
              <div>
                <h4 className="text-white font-bold mb-3 flex items-center gap-2">
                  <Icon name="qr-code" size={18} className="text-primary" />
                  Automatic (Scan QR Code)
                </h4>
                <ol className="space-y-2">
                  {esimData.installationManual[installPlatform]?.automatic.map((step, idx) => (
                    <li key={idx} className="flex gap-3 text-slate-300">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary text-sm flex items-center justify-center">
                        {idx + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>

              {/* Manual Installation */}
              <div className="border-t border-border-dark pt-6">
                <h4 className="text-white font-bold mb-3 flex items-center gap-2">
                  <Icon name="edit" size={18} className="text-slate-400" />
                  Manual Installation
                </h4>
                <ol className="space-y-2">
                  {esimData.installationManual[installPlatform]?.manual.map((step, idx) => (
                    <li key={idx} className="flex gap-3 text-slate-300">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-700 text-slate-400 text-sm flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="font-mono text-sm">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Icon name="info" size={48} className="text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">Installation instructions not available</p>
              <p className="text-slate-500 text-sm mt-2">
                Scan the QR code on the Details tab to install this eSIM
              </p>
            </div>
          )}
        </div>
      )}

      {/* Top-up Tab */}
      {activeTab === 'topup' && (
        <div className="bg-[#121212] border border-border-dark rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">Add More Data</h3>

          {topupData && topupData.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {topupData.map((option) => (
                <div
                  key={option.id}
                  className="bg-surface-dark border border-border-dark rounded-xl p-4 hover:border-primary/50 transition-colors cursor-pointer"
                >
                  <div className="text-2xl font-bold text-primary mb-1">
                    {option.dataAmountDisplay}
                  </div>
                  <div className="text-slate-400 text-sm mb-3">
                    Valid for {option.validityDays} days
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-bold text-white">
                      ${option.price.toFixed(2)}
                    </span>
                    <button className="px-4 py-2 bg-primary text-black font-bold rounded-lg hover:brightness-105 transition-all text-sm">
                      Add to Cart
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Icon name="package" size={48} className="text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">No top-up options available</p>
              <p className="text-slate-500 text-sm mt-2">
                This eSIM plan does not support top-ups
              </p>
            </div>
          )}
        </div>
      )}
    </ProfileLayout>
  )
}

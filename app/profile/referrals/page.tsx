'use client'

import { useState } from 'react'
import ProfileLayout from '@/components/profile/ProfileLayout'
import Icon from '@/components/ui/Icon'

const referralHistory = [
  { user: 'john_doe', date: 'Oct 15, 2023', status: 'completed', reward: '$10.00' },
  { user: 'jane_smith', date: 'Oct 10, 2023', status: 'pending', reward: '$10.00' },
  { user: 'mike_wilson', date: 'Sep 28, 2023', status: 'completed', reward: '$10.00' },
]

export default function ReferralsPage() {
  const [copied, setCopied] = useState(false)
  const referralCode = 'ALEXM2024'
  const referralLink = `https://marketplace.com/ref/${referralCode}`

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <ProfileLayout>
      {/* Header */}
      <div className="mb-10 pb-6 border-b border-border-dark">
        <h1 className="text-3xl font-bold text-white mb-2">Referral Program</h1>
        <p className="text-slate-400">
          Invite friends and earn rewards. Get $10 for each successful referral.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-black border border-border-dark rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
              <Icon name="user-group" size={20} />
            </div>
            <span className="text-slate-400 text-sm">Total Referrals</span>
          </div>
          <p className="text-3xl font-bold text-white">12</p>
        </div>

        <div className="bg-black border border-border-dark rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
              <Icon name="check-circle" size={20} />
            </div>
            <span className="text-slate-400 text-sm">Successful</span>
          </div>
          <p className="text-3xl font-bold text-white">8</p>
        </div>

        <div className="bg-black border border-border-dark rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
              <Icon name="wallet" size={20} />
            </div>
            <span className="text-slate-400 text-sm">Total Earned</span>
          </div>
          <p className="text-3xl font-bold text-primary">$80.00</p>
        </div>
      </div>

      {/* Referral Link Section */}
      <div className="mb-12">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Icon name="link" size={20} className="text-primary" />
          Your Referral Link
        </h3>

        <div className="bg-black border border-border-dark rounded-2xl p-6 space-y-6">
          <div>
            <label className="text-sm font-semibold text-slate-300 mb-2 block">Referral Code</label>
            <div className="flex gap-3">
              <input
                type="text"
                value={referralCode}
                readOnly
                className="flex-1 bg-surface-dark border border-border-dark rounded-xl px-4 py-3 text-white font-mono text-lg"
              />
              <button
                onClick={() => copyToClipboard(referralCode)}
                className="px-6 py-3 bg-surface-dark border border-border-dark rounded-xl text-white font-medium hover:bg-border-dark transition-colors flex items-center gap-2"
              >
                <Icon name={copied ? 'check' : 'copy'} size={20} />
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-300 mb-2 block">Referral Link</label>
            <div className="flex gap-3">
              <input
                type="text"
                value={referralLink}
                readOnly
                className="flex-1 bg-surface-dark border border-border-dark rounded-xl px-4 py-3 text-slate-400 text-sm"
              />
              <button
                onClick={() => copyToClipboard(referralLink)}
                className="px-6 py-3 bg-primary text-black font-bold rounded-xl hover:brightness-105 transition-all flex items-center gap-2"
              >
                <Icon name="share" size={20} />
                Share
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="mb-12">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Icon name="info" size={20} className="text-primary" />
          How It Works
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-black border border-border-dark rounded-2xl p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary mx-auto mb-4">
              <span className="text-xl font-bold">1</span>
            </div>
            <h4 className="font-bold text-white mb-2">Share Your Link</h4>
            <p className="text-slate-500 text-sm">
              Send your referral link to friends and family who might be interested.
            </p>
          </div>

          <div className="bg-black border border-border-dark rounded-2xl p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary mx-auto mb-4">
              <span className="text-xl font-bold">2</span>
            </div>
            <h4 className="font-bold text-white mb-2">Friend Signs Up</h4>
            <p className="text-slate-500 text-sm">
              When they sign up using your link and make their first purchase.
            </p>
          </div>

          <div className="bg-black border border-border-dark rounded-2xl p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary mx-auto mb-4">
              <span className="text-xl font-bold">3</span>
            </div>
            <h4 className="font-bold text-white mb-2">Earn Rewards</h4>
            <p className="text-slate-500 text-sm">
              You both get $10 credit to spend on any product in the marketplace.
            </p>
          </div>
        </div>
      </div>

      {/* Referral History */}
      <div>
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Icon name="history" size={20} className="text-primary" />
          Referral History
        </h3>

        <div className="overflow-x-auto rounded-2xl border border-border-dark">
          <table className="w-full text-left text-sm text-slate-400">
            <thead className="text-xs uppercase bg-black text-slate-200">
              <tr>
                <th className="px-6 py-4 font-bold">Referred User</th>
                <th className="px-6 py-4 font-bold">Date</th>
                <th className="px-6 py-4 font-bold text-center">Status</th>
                <th className="px-6 py-4 font-bold text-right">Reward</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-dark bg-black/20">
              {referralHistory.map((referral, index) => (
                <tr key={index} className="hover:bg-black/40 transition-colors">
                  <td className="px-6 py-4 text-white font-medium">@{referral.user}</td>
                  <td className="px-6 py-4">{referral.date}</td>
                  <td className="px-6 py-4 text-center">
                    {referral.status === 'completed' ? (
                      <span className="text-primary bg-primary/10 px-2 py-1 rounded text-xs font-bold border border-primary/20">
                        Completed
                      </span>
                    ) : (
                      <span className="text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded text-xs font-bold border border-yellow-500/20">
                        Pending
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-white">{referral.reward}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </ProfileLayout>
  )
}

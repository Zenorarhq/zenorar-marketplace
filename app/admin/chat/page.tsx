'use client'

import { useState, useEffect, useRef } from 'react'
import AdminLayout from '@/components/admin/AdminLayout'
import Icon from '@/components/ui/Icon'
import { chatApi, ChatConversation, ChatConversationDetail, ChatMessage, ChatStatus } from '@/lib/api/chat'
import { useAuth } from '@/contexts/AuthContext'
import { formatTimeAgo } from '@/lib/date-utils'
import { useTimezone } from '@/hooks/use-timezone'
import { formatTime } from '@/lib/date-utils'
import { useChatSocket, ChatSocketMessage } from '@/hooks/use-chat-socket'

type FilterTab = 'all' | 'unassigned' | 'mine' | 'resolved'

export default function AdminChatPage() {
  const { user } = useAuth()
  const tz = useTimezone()

  // Settings
  const [isOnline, setIsOnline] = useState(true)
  const [togglingOnline, setTogglingOnline] = useState(false)

  // Conversations
  const [conversations, setConversations] = useState<ChatConversation[]>([])
  const [activeConv, setActiveConv] = useState<ChatConversationDetail | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [filterTab, setFilterTab] = useState<FilterTab>('all')

  // Stats
  const [stats, setStats] = useState({ open: 0, unassigned: 0, active: 0, totalUnread: 0 })

  // Chat
  const [replyInput, setReplyInput] = useState('')
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const notifSoundRef = useRef<HTMLAudioElement | null>(null)

  const { joinConversation, leaveConversation, joinAdmin, onNewMessage, onConversationNew, onConversationStatus, onConversationAssigned } = useChatSocket()

  // Init notification sound
  useEffect(() => {
    notifSoundRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbsGczHjqIxN3LdUQkOH250OalWiQcSKjJ3rloLBg7hbzZz4RGIzR3stPRkFooG0eYvNvQiUoeNXS43tiNShUxcq7Z1JJUJiVTibrb0o5MHzJuqNfUlVAnKU6Rw9vPhEwcL26r2tKWUiIlToq929COTBwwbKfY1JVTJylQkcLbz4RMHC5tq9nUl1MnKk+Tw9vPhUwfMG6r')
  }, [])

  const playNotifSound = () => {
    notifSoundRef.current?.play().catch(() => {})
  }

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  const showBrowserNotif = (title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/favicon.ico' })
    }
  }

  // Load initial data
  useEffect(() => {
    loadSettings()
    loadConversations()
    loadStats()
  }, [])

  // Reload conversations when filter changes
  useEffect(() => {
    loadConversations()
  }, [filterTab])

  const loadSettings = async () => {
    const res = await chatApi.getSettings()
    if (res.success && res.data) {
      setIsOnline(res.data.isOnline)
    }
  }

  const loadStats = async () => {
    const res = await chatApi.getStats()
    if (res.success && res.data) {
      setStats({
        open: res.data.open,
        unassigned: res.data.unassigned,
        active: res.data.open + res.data.assigned,
        totalUnread: res.data.unread,
      })
    }
  }

  const loadConversations = async () => {
    const filters: any = {}
    if (filterTab === 'unassigned') filters.unassigned = true
    if (filterTab === 'mine' && user) filters.assignedToId = user.id
    if (filterTab === 'resolved') filters.status = 'RESOLVED'
    if (filterTab === 'all') {
      // Show non-closed conversations
    }

    const res = await chatApi.getConversations(filters)
    if (res.success && res.data) {
      // "All" tab: exclude closed conversations
      const data = filterTab === 'all' ? res.data.filter((c: any) => c.status !== 'CLOSED') : res.data
      setConversations(data)
    }
  }

  const toggleOnline = async () => {
    setTogglingOnline(true)
    const res = await chatApi.updateSettings({ isOnline: !isOnline })
    if (res.success && res.data) {
      setIsOnline(res.data.isOnline)
    }
    setTogglingOnline(false)
  }

  // Select a conversation
  const selectConversation = async (id: string) => {
    setActiveId(id)
    const res = await chatApi.getConversation(id)
    if (res.success && res.data) {
      setActiveConv(res.data)
    }
  }

  // Socket.IO: join admin room for global updates
  useEffect(() => {
    joinAdmin()

    const unsubNewConv = onConversationNew((conv: any) => {
      loadConversations()
      loadStats()
      showBrowserNotif('New chat', `${conv.guestName || conv.user?.name || 'Guest'}: New conversation`)
      playNotifSound()
    })

    const unsubStatus = onConversationStatus(() => {
      loadConversations()
      loadStats()
    })

    const unsubAssigned = onConversationAssigned(() => {
      loadConversations()
      loadStats()
    })

    return () => {
      unsubNewConv()
      unsubStatus()
      unsubAssigned()
    }
  }, [joinAdmin, onConversationNew, onConversationStatus, onConversationAssigned])

  // Socket.IO: listen for messages in the active conversation
  useEffect(() => {
    if (!activeId) return

    joinConversation(activeId)

    const unsubMessage = onNewMessage((msg: ChatSocketMessage) => {
      if (msg.conversationId !== activeId) return

      setActiveConv(prev => {
        if (!prev) return prev
        // Dedup
        if (prev.messages.some(m => m.id === msg.id)) return prev

        const newMsg: ChatMessage = {
          id: msg.id,
          conversationId: msg.conversationId,
          senderType: msg.senderType,
          senderId: msg.senderId,
          senderName: msg.senderName,
          content: msg.content,
          attachments: msg.attachments || [],
          isRead: msg.isRead,
          createdAt: msg.createdAt,
        }

        // Notify for user messages
        if (msg.senderType === 'USER') {
          playNotifSound()
        }

        return { ...prev, messages: [...prev.messages, newMsg] }
      })

      // Also refresh the conversation list (for updated last message / unread count)
      loadConversations()
    })

    const unsubStatus = onConversationStatus((data) => {
      if (data.conversationId !== activeId) return
      setActiveConv(prev => prev ? { ...prev, status: data.status as ChatStatus } : prev)
    })

    return () => {
      leaveConversation(activeId)
      unsubMessage()
      unsubStatus()
    }
  }, [activeId, joinConversation, leaveConversation, onNewMessage, onConversationStatus])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeConv?.messages])

  // Send reply
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!replyInput.trim() || !activeId) return

    setSending(true)
    const res = await chatApi.sendMessage(activeId, replyInput.trim())
    setSending(false)

    if (res.success && res.data) {
      // Add locally
      setActiveConv(prev => {
        if (!prev) return prev
        const msg: ChatMessage = {
          id: res.data!.id,
          conversationId: activeId,
          senderType: 'AGENT',
          senderId: user?.id || null,
          senderName: user?.name || null,
          content: res.data!.content,
          attachments: res.data!.attachments || [],
          isRead: true,
          createdAt: res.data!.createdAt,
        }
        return { ...prev, messages: [...prev.messages, msg] }
      })
      setReplyInput('')
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !activeId) return

    setUploading(true)
    const uploadRes = await chatApi.uploadFile(file)
    setUploading(false)

    if (!uploadRes.success || !uploadRes.data) return

    const attachment = uploadRes.data
    await chatApi.sendMessage(activeId, '', [attachment])

    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Actions
  const handlePickUp = async () => {
    if (!activeId) return
    const res = await chatApi.assignConversation(activeId)
    if (res.success) {
      selectConversation(activeId)
      loadConversations()
    }
  }

  const handleUpdateStatus = async (status: ChatStatus) => {
    if (!activeId) return
    await chatApi.updateStatus(activeId, status)
    selectConversation(activeId)
    loadConversations()
  }

  const getDisplayName = (conv: ChatConversation) => {
    if (conv.user) return conv.user.name
    return conv.guestName || conv.guestEmail || 'Guest'
  }

  const statusColors: Record<string, string> = {
    OPEN: 'bg-blue-500/20 text-blue-400',
    ASSIGNED: 'bg-yellow-500/20 text-yellow-400',
    RESOLVED: 'bg-green-500/20 text-green-400',
    CLOSED: 'bg-slate-500/20 text-slate-400',
  }

  const renderAttachment = (att: { url: string; name: string; type: string; size: number }) => {
    const isImage = att.type?.startsWith('image/')
    if (isImage) {
      return (
        <a href={att.url} target="_blank" rel="noopener noreferrer" className="block mt-1">
          <img src={att.url} alt={att.name} className="max-w-[240px] rounded-lg" />
        </a>
      )
    }
    return (
      <a href={att.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 mt-1 text-xs text-primary hover:underline">
        <Icon name="download" size={14} />
        {att.name}
      </a>
    )
  }

  return (
    <AdminLayout>
      <div className="h-[calc(100vh-7rem)] flex flex-col">
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-white">Live Chat</h1>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-slate-400">Active: <span className="text-white font-medium">{stats.active}</span></span>
              <span className="text-slate-400">Unassigned: <span className="text-yellow-400 font-medium">{stats.unassigned}</span></span>
              <span className="text-slate-400">Unread: <span className="text-red-400 font-medium">{stats.totalUnread}</span></span>
            </div>
          </div>

          {/* Online/Offline Toggle */}
          <button
            onClick={toggleOnline}
            disabled={togglingOnline}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isOnline
                ? 'bg-primary/20 text-primary hover:bg-primary/30'
                : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-primary' : 'bg-red-500'}`} />
            {isOnline ? 'Online' : 'Offline'}
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex gap-4 min-h-0">
          {/* Left Panel — Conversation List */}
          <div className="w-80 flex-shrink-0 bg-[#111111] border border-[#1f1f1f] rounded-xl flex flex-col overflow-hidden">
            {/* Filter Tabs */}
            <div className="flex border-b border-[#1f1f1f]">
              {([
                { key: 'all', label: 'All' },
                { key: 'unassigned', label: 'Unassigned', count: stats.unassigned },
                { key: 'mine', label: 'Mine' },
                { key: 'resolved', label: 'Resolved' },
              ] as { key: FilterTab; label: string; count?: number }[]).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setFilterTab(tab.key)}
                  className={`flex-1 py-2.5 text-xs font-medium transition-colors relative ${
                    filterTab === tab.key
                      ? 'text-primary border-b-2 border-primary'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                  {tab.count ? (
                    <span className="ml-1 bg-yellow-500/20 text-yellow-400 text-[10px] px-1.5 py-0.5 rounded-full">
                      {tab.count}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto">
              {conversations.length === 0 && (
                <div className="text-center text-slate-500 text-sm py-8">No conversations</div>
              )}
              {conversations.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => selectConversation(conv.id)}
                  className={`w-full text-left px-4 py-3 border-b border-[#1f1f1f] hover:bg-[#1a1a1a] transition-colors ${
                    activeId === conv.id ? 'bg-[#1a1a1a]' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white text-sm font-medium truncate">{getDisplayName(conv)}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${statusColors[conv.status]}`}>
                      {conv.status}
                    </span>
                  </div>
                  <p className="text-slate-500 text-xs truncate">{conv.lastMessage || 'No messages'}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-slate-600 text-[10px]">
                      {conv.assignedTo ? `${conv.assignedTo.name}` : 'Unassigned'}
                    </span>
                    <div className="flex items-center gap-2">
                      {conv.unreadCount > 0 && (
                        <span className="bg-primary text-black text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                          {conv.unreadCount}
                        </span>
                      )}
                      <span className="text-slate-600 text-[10px]">
                        {conv.updatedAt ? formatTimeAgo(conv.updatedAt, tz) : ''}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Right Panel — Chat Thread */}
          <div className="flex-1 bg-[#111111] border border-[#1f1f1f] rounded-xl flex flex-col overflow-hidden">
            {!activeConv ? (
              <div className="flex-1 flex items-center justify-center text-slate-500">
                <div className="text-center">
                  <Icon name="chat" size={48} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Select a conversation to view</p>
                </div>
              </div>
            ) : (
              <>
                {/* Chat Header */}
                <div className="px-6 py-4 border-b border-[#1f1f1f] flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-semibold">
                      {activeConv.user?.name || activeConv.guestName || activeConv.guestEmail || 'Guest'}
                    </h3>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${statusColors[activeConv.status]}`}>
                        {activeConv.status}
                      </span>
                      {activeConv.assignedTo && (
                        <span className="text-slate-500 text-xs">Assigned to {activeConv.assignedTo.name}</span>
                      )}
                      {activeConv.guestEmail && (
                        <span className="text-slate-500 text-xs">{activeConv.guestEmail}</span>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    {!activeConv.assignedTo && (activeConv.status === 'OPEN' || activeConv.status === 'ASSIGNED') && (
                      <button
                        onClick={handlePickUp}
                        className="px-3 py-1.5 bg-primary/20 text-primary text-xs font-medium rounded-lg hover:bg-primary/30 transition-colors"
                      >
                        Pick Up
                      </button>
                    )}
                    {(activeConv.status === 'OPEN' || activeConv.status === 'ASSIGNED') && (
                      <button
                        onClick={() => handleUpdateStatus('RESOLVED')}
                        className="px-3 py-1.5 bg-green-500/20 text-green-400 text-xs font-medium rounded-lg hover:bg-green-500/30 transition-colors"
                      >
                        Resolve
                      </button>
                    )}
                    {(activeConv.status === 'RESOLVED' || activeConv.status === 'ASSIGNED') && (
                      <button
                        onClick={() => handleUpdateStatus('CLOSED')}
                        className="px-3 py-1.5 bg-slate-500/20 text-slate-400 text-xs font-medium rounded-lg hover:bg-slate-500/30 transition-colors"
                      >
                        Close
                      </button>
                    )}
                    {(activeConv.status === 'RESOLVED' || activeConv.status === 'CLOSED') && (
                      <button
                        onClick={() => handleUpdateStatus('OPEN')}
                        className="px-3 py-1.5 bg-blue-500/20 text-blue-400 text-xs font-medium rounded-lg hover:bg-blue-500/30 transition-colors"
                      >
                        Reopen
                      </button>
                    )}
                  </div>
                </div>

                {/* Warning if assigned to another agent */}
                {activeConv.assignedTo && user && activeConv.assignedTo.id !== user.id && (
                  <div className="px-4 py-2 bg-yellow-500/10 border-b border-yellow-500/20">
                    <p className="text-yellow-400 text-xs">This conversation is handled by {activeConv.assignedTo.name}</p>
                  </div>
                )}

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {activeConv.messages.map(msg => (
                    <div key={msg.id}>
                      {msg.senderType === 'SYSTEM' ? (
                        <div className="text-center">
                          <p className="text-xs text-slate-500 bg-[#1a1a1a] inline-block px-3 py-1.5 rounded-full">{msg.content}</p>
                        </div>
                      ) : (
                        <div className={`flex ${msg.senderType === 'AGENT' ? 'justify-end' : 'justify-start'}`}>
                          <div
                            className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                              msg.senderType === 'AGENT'
                                ? 'bg-primary text-black rounded-br-none'
                                : 'bg-[#1a1a1a] text-white rounded-bl-none'
                            }`}
                          >
                            {msg.senderType === 'AGENT' && msg.senderName && (
                              <p className="text-[10px] text-black/60 mb-1 font-medium">{msg.senderName}</p>
                            )}
                            {msg.content && (
                              <p className="text-sm">{msg.content}</p>
                            )}
                            {msg.attachments?.map((att: any, i: number) => (
                              <div key={i}>{renderAttachment(att)}</div>
                            ))}
                            <p className={`text-[10px] mt-1 ${msg.senderType === 'AGENT' ? 'text-black/60' : 'text-slate-500'}`}>
                              {formatTime(new Date(msg.createdAt), tz)}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Reply Input */}
                {activeConv.status !== 'CLOSED' && (
                  <form onSubmit={handleSendReply} className="p-4 border-t border-[#1f1f1f]">
                    <div className="flex gap-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        className="hidden"
                        accept="image/*,.pdf,.doc,.docx,.txt,.zip"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="text-slate-400 hover:text-primary transition-colors p-2 disabled:opacity-50"
                        aria-label="Attach file"
                      >
                        <Icon name={uploading ? 'loading' : 'upload'} size={20} className={uploading ? 'animate-spin' : ''} />
                      </button>
                      <input
                        type="text"
                        value={replyInput}
                        onChange={e => setReplyInput(e.target.value)}
                        placeholder="Type your reply..."
                        disabled={sending}
                        className="flex-1 bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl py-3 px-4 text-white placeholder:text-slate-500 focus:ring-1 focus:ring-primary focus:border-primary transition-all text-sm"
                      />
                      <button
                        type="submit"
                        disabled={!replyInput.trim() || sending}
                        className="bg-primary text-black w-12 h-12 rounded-xl flex items-center justify-center hover:brightness-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Send reply"
                      >
                        <Icon name="send" size={20} />
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

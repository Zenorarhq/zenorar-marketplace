'use client'

import { useState, useEffect, useRef } from 'react'
import AdminLayout from '@/components/admin/AdminLayout'
import Icon from '@/components/ui/Icon'
import { chatApi, ChatConversation, ChatConversationDetail, ChatMessage, ChatStatus, ChatAgent } from '@/lib/api/chat'
import { useAuth } from '@/contexts/AuthContext'
import { formatTimeAgo } from '@/lib/date-utils'
import { useTimezone } from '@/hooks/use-timezone'
import { formatTime } from '@/lib/date-utils'
import { useChatSocket, ChatSocketMessage } from '@/hooks/use-chat-socket'
import Link from 'next/link'

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

  // Search
  const [searchQuery, setSearchQuery] = useState('')
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Pagination
  const [convPage, setConvPage] = useState(1)
  const [convTotal, setConvTotal] = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)

  // Chat
  const [replyInput, setReplyInput] = useState('')
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  // Canned replies
  const [showCannedReplies, setShowCannedReplies] = useState(false)
  const [cannedReplies, setCannedReplies] = useState<string[]>([])
  const [showCannedEditor, setShowCannedEditor] = useState(false)
  const [newCannedReply, setNewCannedReply] = useState('')
  const [savingCanned, setSavingCanned] = useState(false)
  const cannedSnapshotRef = useRef<string[]>([])


  // Customer info sidebar
  const [showCustomerInfo, setShowCustomerInfo] = useState(false)

  // Mobile view state - 'list' shows conversation list, 'chat' shows active chat
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list')

  // Internal notes
  const [isNoteMode, setIsNoteMode] = useState(false)

  // Transfer
  const [showTransfer, setShowTransfer] = useState(false)
  const [agents, setAgents] = useState<ChatAgent[]>([])

  // Auto-close
  const [autoCloseHours, setAutoCloseHours] = useState(0)

  // Typing
  const [userTyping, setUserTyping] = useState(false)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const emitTypingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const notifSoundRef = useRef<HTMLAudioElement | null>(null)
  const transferRef = useRef<HTMLDivElement>(null)

  const { joinConversation, leaveConversation, joinAdmin, emitTyping, onNewMessage, onConversationNew, onConversationStatus, onConversationAssigned, onTyping } = useChatSocket()

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
    loadAgents()
  }, [])

  // Reload conversations when filter or search changes
  useEffect(() => {
    setConvPage(1)
    loadConversations(1)
  }, [filterTab])

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(() => {
      setConvPage(1)
      loadConversations(1)
    }, 300)
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current) }
  }, [searchQuery])

  const loadSettings = async () => {
    const res = await chatApi.getSettings()
    if (res.success && res.data) {
      setIsOnline(res.data.isOnline)
      if (res.data.cannedReplies) setCannedReplies(res.data.cannedReplies)
      if (res.data.autoCloseHours != null) setAutoCloseHours(res.data.autoCloseHours)
    }
  }

  const loadAgents = async () => {
    const res = await chatApi.getAgents()
    if (res.success && res.data) setAgents(res.data)
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

  const loadConversations = async (page = 1, append = false) => {
    const filters: any = { page }
    if (filterTab === 'unassigned') filters.unassigned = true
    if (filterTab === 'mine' && user) filters.assignedToId = user.id
    if (filterTab === 'resolved') filters.status = 'RESOLVED'
    if (filterTab === 'all') filters.excludeStatus = 'CLOSED'
    if (searchQuery.trim()) filters.search = searchQuery.trim()

    const res = await chatApi.getConversations(filters)
    if (res.success && res.data) {
      if (append) {
        setConversations(prev => [...prev, ...res.data!])
      } else {
        setConversations(res.data)
      }
      if ((res as any).pagination) {
        setConvTotal((res as any).pagination.total)
      }
    }
  }

  const loadMoreConversations = async () => {
    const nextPage = convPage + 1
    setLoadingMore(true)
    await loadConversations(nextPage, true)
    setConvPage(nextPage)
    setLoadingMore(false)
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
    setMobileView('chat') // Switch to chat view on mobile
    const res = await chatApi.getConversation(id)
    if (res.success && res.data) {
      setActiveConv(res.data)
      // Mark messages as read
      chatApi.markAsRead(id).then(() => { loadStats(); loadConversations() })
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

    // Notify for new messages in conversations other than the active one
    const unsubGlobalMsg = onNewMessage((msg: ChatSocketMessage) => {
      if (msg.senderType === 'USER') {
        loadConversations()
        loadStats()
        // Only notify if message is not in the currently viewed conversation
        if (msg.conversationId !== activeId) {
          playNotifSound()
          showBrowserNotif('New message', `${msg.senderName || 'Customer'}: ${msg.content}`)
        }
      }
    })

    return () => {
      unsubNewConv()
      unsubStatus()
      unsubAssigned()
      unsubGlobalMsg()
    }
  }, [joinAdmin, onConversationNew, onConversationStatus, onConversationAssigned, onNewMessage])

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

      // Mark as read immediately if admin is viewing this conversation, then refresh
      if (msg.senderType === 'USER') {
        chatApi.markAsRead(activeId).then(() => {
          loadConversations()
          loadStats()
        })
      } else {
        loadConversations()
        loadStats()
      }
    })

    const unsubStatus = onConversationStatus((data) => {
      if (data.conversationId !== activeId) return
      setActiveConv(prev => prev ? { ...prev, status: data.status as ChatStatus } : prev)
    })

    const unsubAssigned = onConversationAssigned((data) => {
      if (data.conversationId !== activeId) return
      setActiveConv(prev => prev ? {
        ...prev,
        status: 'ASSIGNED',
        assignedTo: { id: data.agentId, name: data.agentName || '', avatar: data.agentAvatar || null },
      } : prev)
    })

    const unsubTyping = onTyping((data) => {
      if (data.conversationId !== activeId || data.userId === user?.id) return
      setUserTyping(data.isTyping)
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      if (data.isTyping) {
        typingTimeoutRef.current = setTimeout(() => setUserTyping(false), 5000)
      }
    })

    return () => {
      leaveConversation(activeId)
      unsubMessage()
      unsubStatus()
      unsubAssigned()
      unsubTyping()
      setUserTyping(false)
    }
  }, [activeId, joinConversation, leaveConversation, onNewMessage, onConversationStatus, onConversationAssigned, onTyping])

  // Close transfer dropdown on outside click
  useEffect(() => {
    if (!showTransfer) return
    const handleClick = (e: MouseEvent) => {
      if (transferRef.current && !transferRef.current.contains(e.target as Node)) {
        setShowTransfer(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showTransfer])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeConv?.messages])

  // Send reply
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!replyInput.trim() || !activeId) return

    setSending(true)
    const res = await chatApi.sendMessage(activeId, replyInput.trim(), undefined, isNoteMode ? true : undefined)
    setSending(false)

    if (res.success && res.data) {
      // Add locally (skip if Socket.IO already added it)
      setActiveConv(prev => {
        if (!prev) return prev
        if (prev.messages.some(m => m.id === res.data!.id)) return prev
        const msg: ChatMessage = {
          id: res.data!.id,
          conversationId: activeId,
          senderType: 'AGENT',
          senderId: user?.id || null,
          senderName: user?.name || null,
          content: res.data!.content,
          attachments: res.data!.attachments || [],
          isRead: true,
          isInternal: isNoteMode,
          createdAt: res.data!.createdAt,
        }
        return { ...prev, messages: [...prev.messages, msg] }
      })
      setReplyInput('')
      setIsNoteMode(false)
      if (textareaRef.current) textareaRef.current.style.height = 'auto'
      if (activeId) emitTyping(activeId, false)
      if (emitTypingTimeoutRef.current) clearTimeout(emitTypingTimeoutRef.current)

      // Optimistically update assignment if conversation was unassigned
      if (!isNoteMode && user) {
        setActiveConv(prev => {
          if (!prev || prev.assignedTo) return prev
          return { ...prev, status: 'ASSIGNED' as ChatStatus, assignedTo: { id: user.id, name: user.name || '', avatar: user.avatar || null } }
        })
      }
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

  const handleUnassign = async () => {
    if (!activeId) return
    const res = await chatApi.unassignConversation(activeId)
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

  const handleTransfer = async (agentId: string) => {
    if (!activeId) return
    const res = await chatApi.assignConversation(activeId, agentId)
    if (res.success) {
      setShowTransfer(false)
      selectConversation(activeId)
      loadConversations()
    }
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

  const PREDEFINED_TAGS = ['Billing', 'Technical', 'Shipping', 'Refund', 'General', 'Urgent']
  const tagColors: Record<string, string> = {
    Billing: 'bg-blue-500/20 text-blue-400',
    Technical: 'bg-purple-500/20 text-purple-400',
    Shipping: 'bg-cyan-500/20 text-cyan-400',
    Refund: 'bg-red-500/20 text-red-400',
    General: 'bg-slate-500/20 text-slate-400',
    Urgent: 'bg-orange-500/20 text-orange-400',
  }

  const handleUpdateTags = async (tags: string[]) => {
    if (!activeId) return
    const res = await chatApi.updateTags(activeId, tags)
    if (res.success && res.data) {
      setActiveConv(prev => prev ? { ...prev, tags: res.data!.tags } : prev)
      loadConversations()
    }
  }

  const getDateLabel = (dateStr: string) => {
    const date = new Date(dateStr)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    if (date.toDateString() === today.toDateString()) return 'Today'
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const renderAttachment = (att: { url: string; name: string; type: string; size: number }) => {
    const isImage = att.type?.startsWith('image/')
    if (isImage) {
      return (
        <button type="button" onClick={() => setLightboxUrl(att.url)} className="block mt-1">
          <img src={att.url} alt={att.name} className="max-w-[240px] rounded-lg cursor-zoom-in" />
        </button>
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          {/* Left Side: Title & Stats */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <div className="flex items-center justify-between sm:justify-start gap-3">
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-white">Live Chat</h1>
              <Link
                href="/admin/chat/analytics"
                className="px-3 py-1.5 bg-[#1a1a1a] text-slate-400 hover:text-white text-xs font-medium rounded-lg transition-colors sm:hidden"
              >
                Analytics
              </Link>
            </div>
            <div className="flex items-center gap-3 text-xs sm:text-sm">
              <span className="text-slate-400">Active: <span className="text-white font-medium">{stats.active}</span></span>
              <span className="text-slate-400">Unassigned: <span className="text-yellow-400 font-medium">{stats.unassigned}</span></span>
              <span className="text-slate-400">Unread: <span className="text-red-400 font-medium">{stats.totalUnread}</span></span>
            </div>
            <Link
              href="/admin/chat/analytics"
              className="hidden sm:block px-3 py-1.5 bg-[#1a1a1a] text-slate-400 hover:text-white text-xs font-medium rounded-lg transition-colors"
            >
              Analytics
            </Link>
          </div>

          {/* Right Side: Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Auto-close setting */}
            <div className="flex items-center gap-1 sm:gap-2">
              <span className="text-slate-500 text-[10px] sm:text-xs hidden sm:inline">Auto-close:</span>
              <select
                value={autoCloseHours}
                onChange={async (e) => {
                  const val = Number(e.target.value)
                  setAutoCloseHours(val)
                  await chatApi.updateSettings({ autoCloseHours: val })
                }}
                className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg py-1.5 px-2 text-white text-[10px] sm:text-xs focus:ring-1 focus:ring-primary"
              >
                <option value={0}>Auto-close: Off</option>
                <option value={6}>6 hours</option>
                <option value={12}>12 hours</option>
                <option value={24}>24 hours</option>
                <option value={48}>48 hours</option>
              </select>
            </div>

            {/* Online/Offline Toggle */}
            <button
              onClick={toggleOnline}
              disabled={togglingOnline}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                isOnline
                  ? 'bg-primary/20 text-primary hover:bg-primary/30'
                  : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-primary' : 'bg-red-500'}`} />
              {isOnline ? 'Online' : 'Offline'}
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex gap-0 md:gap-4 min-h-0">
          {/* Left Panel — Conversation List */}
          <div className={`${
            mobileView === 'list' ? 'flex' : 'hidden'
          } md:flex w-full md:w-80 flex-shrink-0 bg-[#111111] border border-[#1f1f1f] rounded-xl flex-col overflow-hidden`}>
            {/* Search */}
            <div className="px-3 pt-3 pb-2">
              <div className="relative">
                <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search conversations..."
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg py-2 pl-9 pr-8 text-white placeholder:text-slate-500 text-xs focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                    <Icon name="close" size={14} />
                  </button>
                )}
              </div>
            </div>
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
              {(() => {
                return conversations.length === 0 ? (
                  <div className="text-center text-slate-500 text-sm py-8">
                    {searchQuery ? 'No matching conversations' : 'No conversations'}
                  </div>
                ) : (<>
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
                      {conv.rating && (
                        <span className="text-yellow-400 text-[10px] flex items-center gap-0.5">
                          ★{conv.rating}
                        </span>
                      )}
                      {conv.unreadCount > 0 && (conv.status === 'OPEN' || conv.status === 'ASSIGNED') && (
                        <span className="bg-primary text-black text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                          {conv.unreadCount}
                        </span>
                      )}
                      <span className="text-slate-600 text-[10px]">
                        {conv.updatedAt ? formatTimeAgo(conv.updatedAt, tz) : ''}
                      </span>
                    </div>
                  </div>
                  {conv.tags && conv.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {conv.tags.map(tag => (
                        <span key={tag} className={`text-[9px] px-1.5 py-0.5 rounded ${tagColors[tag] || 'bg-slate-500/20 text-slate-400'}`}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
                ))}
                {conversations.length < convTotal && (
                  <button
                    onClick={loadMoreConversations}
                    disabled={loadingMore}
                    className="w-full py-3 text-xs text-slate-400 hover:text-white transition-colors disabled:opacity-50"
                  >
                    {loadingMore ? 'Loading...' : 'Load More'}
                  </button>
                )}
                </>)
              })()}
            </div>
          </div>

          {/* Right Panel — Chat Thread */}
          <div className={`${
            mobileView === 'chat' ? 'flex' : 'hidden'
          } md:flex flex-1 bg-[#111111] border border-[#1f1f1f] rounded-xl flex-col overflow-hidden`}>
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
                <div className="px-3 sm:px-6 py-3 sm:py-4 border-b border-[#1f1f1f] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    {/* Mobile Back Button */}
                    <button
                      onClick={() => setMobileView('list')}
                      className="md:hidden p-1.5 -ml-1 hover:bg-white/10 rounded-lg transition-colors flex-shrink-0"
                    >
                      <Icon name="chevron-left" size={20} className="text-slate-400" />
                    </button>
                    <div className="min-w-0">
                      <h3 className="text-white font-semibold text-sm sm:text-base truncate">
                        {activeConv.user?.name || activeConv.guestName || activeConv.guestEmail || 'Guest'}
                      </h3>
                      <div className="flex items-center gap-2 sm:gap-3 mt-0.5 flex-wrap">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${statusColors[activeConv.status]}`}>
                          {activeConv.status}
                        </span>
                        {activeConv.assignedTo && (
                          <span className="text-slate-500 text-[10px] sm:text-xs hidden sm:inline">Assigned to {activeConv.assignedTo.name}</span>
                        )}
                        {activeConv.guestEmail && (
                          <span className="text-slate-500 text-[10px] sm:text-xs hidden lg:inline">{activeConv.guestEmail}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                    {!activeConv.assignedTo && (activeConv.status === 'OPEN' || activeConv.status === 'ASSIGNED') && (
                      <button
                        onClick={handlePickUp}
                        className="px-2 sm:px-3 py-1.5 bg-primary/20 text-primary text-[10px] sm:text-xs font-medium rounded-lg hover:bg-primary/30 transition-colors"
                      >
                        <span className="hidden sm:inline">Pick Up</span>
                        <Icon name="hand" size={14} className="sm:hidden" />
                      </button>
                    )}
                    {activeConv.assignedTo && (activeConv.status === 'OPEN' || activeConv.status === 'ASSIGNED') && (
                      <button
                        onClick={handleUnassign}
                        className="hidden sm:block px-3 py-1.5 bg-orange-500/20 text-orange-400 text-xs font-medium rounded-lg hover:bg-orange-500/30 transition-colors"
                      >
                        Unassign
                      </button>
                    )}
                    {(activeConv.status === 'OPEN' || activeConv.status === 'ASSIGNED') && (
                      <button
                        onClick={() => handleUpdateStatus('RESOLVED')}
                        className="px-2 sm:px-3 py-1.5 bg-green-500/20 text-green-400 text-[10px] sm:text-xs font-medium rounded-lg hover:bg-green-500/30 transition-colors"
                      >
                        <span className="hidden sm:inline">Resolve</span>
                        <Icon name="check" size={14} className="sm:hidden" />
                      </button>
                    )}
                    {(activeConv.status === 'RESOLVED' || activeConv.status === 'ASSIGNED') && (
                      <button
                        onClick={() => handleUpdateStatus('CLOSED')}
                        className="hidden sm:block px-3 py-1.5 bg-slate-500/20 text-slate-400 text-xs font-medium rounded-lg hover:bg-slate-500/30 transition-colors"
                      >
                        Close
                      </button>
                    )}
                    {(activeConv.status === 'RESOLVED' || activeConv.status === 'CLOSED') && (
                      <button
                        onClick={() => handleUpdateStatus('OPEN')}
                        className="px-2 sm:px-3 py-1.5 bg-blue-500/20 text-blue-400 text-[10px] sm:text-xs font-medium rounded-lg hover:bg-blue-500/30 transition-colors"
                      >
                        <span className="hidden sm:inline">Reopen</span>
                        <Icon name="refresh" size={14} className="sm:hidden" />
                      </button>
                    )}
                    {/* Transfer - hidden on mobile */}
                    {(activeConv.status === 'OPEN' || activeConv.status === 'ASSIGNED') && (
                      <div className="relative hidden sm:block" ref={transferRef}>
                        <button
                          onClick={() => setShowTransfer(!showTransfer)}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                            showTransfer ? 'bg-indigo-500/20 text-indigo-400' : 'bg-[#1a1a1a] text-slate-400 hover:text-white'
                          }`}
                        >
                          Transfer
                        </button>
                        {showTransfer && (
                          <div className="absolute right-0 top-full mt-1 w-48 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg shadow-xl z-10 overflow-hidden">
                            <p className="px-3 py-2 text-[10px] text-slate-500 uppercase tracking-wider border-b border-[#1f1f1f]">Transfer to</p>
                            {agents.filter(a => a.id !== user?.id && a.role === 'EDITOR').length === 0 ? (
                              <p className="px-3 py-3 text-xs text-slate-500 text-center">No other agents</p>
                            ) : agents.filter(a => a.id !== user?.id && a.role === 'EDITOR').map(agent => (
                              <button
                                key={agent.id}
                                onClick={() => handleTransfer(agent.id)}
                                className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-[#1a1a1a] hover:text-white transition-colors"
                              >
                                {agent.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    <button
                      onClick={() => setShowCustomerInfo(!showCustomerInfo)}
                      className={`p-1.5 sm:p-2 rounded-lg transition-colors ${showCustomerInfo ? 'bg-primary/20 text-primary' : 'text-slate-400 hover:text-white hover:bg-[#1a1a1a]'}`}
                      title="Customer info"
                    >
                      <Icon name="user" size={16} />
                    </button>
                  </div>
                </div>

                <div className="flex flex-1 overflow-hidden">
                <div className="flex-1 flex flex-col overflow-hidden">

                {/* Warning if assigned to another agent */}
                {activeConv.assignedTo && user && activeConv.assignedTo.id !== user.id && (
                  <div className="px-3 sm:px-4 py-2 bg-yellow-500/10 border-b border-yellow-500/20">
                    <p className="text-yellow-400 text-[10px] sm:text-xs">This conversation is handled by {activeConv.assignedTo.name}</p>
                  </div>
                )}

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
                  {activeConv.messages.map((msg, idx) => {
                    const prevMsg = idx > 0 ? activeConv.messages[idx - 1] : null
                    const showDate = !prevMsg || new Date(msg.createdAt).toDateString() !== new Date(prevMsg.createdAt).toDateString()
                    return (
                    <div key={msg.id}>
                      {showDate && (
                        <div className="text-center my-2">
                          <span className="text-[10px] text-slate-500 bg-[#1a1a1a] px-3 py-1 rounded-full">{getDateLabel(msg.createdAt)}</span>
                        </div>
                      )}
                      {msg.senderType === 'SYSTEM' ? (
                        <div className="text-center">
                          <p className="text-xs text-slate-500 bg-[#1a1a1a] inline-block px-3 py-1.5 rounded-full">{msg.content}</p>
                        </div>
                      ) : (
                        <div className={`flex ${msg.senderId === user?.id ? 'justify-end' : 'justify-start'}`}>
                          <div
                            className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-3 sm:px-4 py-2 sm:py-3 ${
                              msg.isInternal
                                ? 'bg-amber-500/15 border border-amber-500/30 text-amber-100 rounded-br-none'
                                : msg.senderId === user?.id
                                  ? 'bg-primary text-black rounded-br-none'
                                  : 'bg-[#1a1a1a] text-white rounded-bl-none'
                            }`}
                          >
                            {msg.isInternal && (
                              <p className="text-[10px] text-amber-400 mb-1 font-medium">Internal Note</p>
                            )}
                            {!msg.isInternal && msg.senderId === user?.id && msg.senderName && (
                              <p className="text-[10px] text-black/60 mb-1 font-medium">{msg.senderName}</p>
                            )}
                            {msg.content && (
                              <p className="text-sm">{msg.content}</p>
                            )}
                            {msg.attachments?.map((att: any, i: number) => (
                              <div key={i}>{renderAttachment(att)}</div>
                            ))}
                            <p className={`text-[10px] mt-1 ${msg.senderId === user?.id ? 'text-black/60' : 'text-slate-500'}`}>
                              {formatTime(new Date(msg.createdAt), tz)}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Typing Indicator */}
                {userTyping && (
                  <div className="px-3 sm:px-4 py-1.5">
                    <span className="text-slate-400 text-[10px] sm:text-xs italic flex items-center gap-1">
                      <span className="flex gap-0.5">
                        <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </span>
                      User is typing...
                    </span>
                  </div>
                )}

                {/* Canned Replies Dropdown */}
                {showCannedReplies && !showCannedEditor && (
                  <div className="mx-2 sm:mx-4 mb-1 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg overflow-hidden max-h-[200px] sm:max-h-[240px] overflow-y-auto">
                    <div className="flex items-center justify-between px-3 py-2 border-b border-[#1f1f1f]">
                      <span className="text-slate-400 text-[10px] uppercase tracking-wider font-medium">Quick Replies</span>
                      <button
                        type="button"
                        onClick={() => { cannedSnapshotRef.current = [...cannedReplies]; setShowCannedEditor(true) }}
                        className="text-primary text-[10px] hover:underline"
                      >
                        Manage
                      </button>
                    </div>
                    {cannedReplies.length === 0 ? (
                      <div className="px-3 py-4 text-center">
                        <p className="text-slate-500 text-xs">No quick replies configured</p>
                        <button type="button" onClick={() => { cannedSnapshotRef.current = [...cannedReplies]; setShowCannedEditor(true) }} className="text-primary text-xs mt-1 hover:underline">
                          Add replies
                        </button>
                      </div>
                    ) : cannedReplies.map((text, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => { setReplyInput(text); setShowCannedReplies(false); textareaRef.current?.focus() }}
                        className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-[#1a1a1a] hover:text-white transition-colors border-b border-[#1f1f1f] last:border-0"
                      >
                        {text}
                      </button>
                    ))}
                  </div>
                )}

                {/* Canned Replies Editor */}
                {showCannedEditor && (
                  <div className="mx-2 sm:mx-4 mb-1 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg overflow-hidden max-h-[280px] sm:max-h-[320px] overflow-y-auto">
                    <div className="flex items-center justify-between px-3 py-2 border-b border-[#1f1f1f]">
                      <span className="text-white text-xs font-medium">Manage Quick Replies</span>
                      <button
                        type="button"
                        onClick={() => { setCannedReplies(cannedSnapshotRef.current); setShowCannedEditor(false) }}
                        className="text-slate-400 hover:text-white"
                      >
                        <Icon name="close" size={14} />
                      </button>
                    </div>
                    <div className="p-2 space-y-1">
                      {cannedReplies.map((text, i) => (
                        <div key={i} className="flex items-start gap-2 group">
                          <p className="flex-1 text-xs text-slate-300 bg-[#111] rounded px-2 py-1.5">{text}</p>
                          <button
                            type="button"
                            onClick={() => setCannedReplies(prev => prev.filter((_, idx) => idx !== i))}
                            className="text-slate-600 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Icon name="close" size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="p-2 border-t border-[#1f1f1f]">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newCannedReply}
                          onChange={e => setNewCannedReply(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && newCannedReply.trim()) {
                              e.preventDefault()
                              setCannedReplies(prev => [...prev, newCannedReply.trim()])
                              setNewCannedReply('')
                            }
                          }}
                          placeholder="Add a quick reply..."
                          className="flex-1 bg-[#111] border border-[#2a2a2a] rounded px-2 py-1.5 text-white text-xs placeholder:text-slate-500 focus:ring-1 focus:ring-primary focus:border-primary"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (newCannedReply.trim()) {
                              setCannedReplies(prev => [...prev, newCannedReply.trim()])
                              setNewCannedReply('')
                            }
                          }}
                          disabled={!newCannedReply.trim()}
                          className="text-primary text-xs font-medium px-2 disabled:opacity-50"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                    <div className="px-2 pb-2">
                      <button
                        type="button"
                        disabled={savingCanned}
                        onClick={async () => {
                          setSavingCanned(true)
                          await chatApi.updateSettings({ cannedReplies })
                          setSavingCanned(false)
                          setShowCannedEditor(false)
                        }}
                        className="w-full bg-primary text-black text-xs font-medium py-2 rounded-lg hover:brightness-105 transition-all disabled:opacity-50"
                      >
                        {savingCanned ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Reply Input */}
                {activeConv.status !== 'CLOSED' && (
                  <form onSubmit={handleSendReply} className="p-2 sm:p-4 border-t border-[#1f1f1f]">
                    <div className="flex gap-1 sm:gap-2 items-end">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        className="hidden"
                        accept="image/*,.pdf,.doc,.docx,.txt,.zip"
                      />
                      <button
                        type="button"
                        onClick={() => setIsNoteMode(!isNoteMode)}
                        className={`text-[10px] sm:text-xs font-medium px-1.5 sm:px-2 py-1 rounded-lg transition-colors flex-shrink-0 ${
                          isNoteMode
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'text-slate-400 hover:text-white hover:bg-[#1a1a1a]'
                        }`}
                        title={isNoteMode ? 'Switch to reply' : 'Switch to internal note'}
                      >
                        {isNoteMode ? 'Note' : 'Reply'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCannedReplies(!showCannedReplies)}
                        className={`text-slate-400 hover:text-primary transition-colors p-1.5 sm:p-2 flex-shrink-0 hidden sm:block ${showCannedReplies ? 'text-primary' : ''}`}
                        aria-label="Quick replies"
                        title="Quick replies"
                      >
                        <Icon name="bolt" size={18} />
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="text-slate-400 hover:text-primary transition-colors p-1.5 sm:p-2 disabled:opacity-50 flex-shrink-0"
                        aria-label="Attach file"
                      >
                        <Icon name={uploading ? 'loading' : 'upload'} size={18} className={uploading ? 'animate-spin' : ''} />
                      </button>
                      <textarea
                        ref={textareaRef}
                        value={replyInput}
                        onChange={e => {
                          setReplyInput(e.target.value)
                          e.target.style.height = 'auto'
                          e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
                          if (activeId) {
                            emitTyping(activeId, true)
                            if (emitTypingTimeoutRef.current) clearTimeout(emitTypingTimeoutRef.current)
                            emitTypingTimeoutRef.current = setTimeout(() => { if (activeId) emitTyping(activeId, false) }, 2000)
                          }
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            if (replyInput.trim()) handleSendReply(e as any)
                          }
                        }}
                        placeholder={isNoteMode ? 'Write an internal note...' : 'Type your reply...'}
                        disabled={sending}
                        rows={1}
                        className={`flex-1 bg-[#0a0a0a] border rounded-xl py-2 sm:py-3 px-3 sm:px-4 text-white placeholder:text-slate-500 focus:ring-1 transition-all text-xs sm:text-sm resize-none overflow-hidden ${
                          isNoteMode
                            ? 'border-amber-500/30 focus:ring-amber-500/50 focus:border-amber-500/50'
                            : 'border-[#2a2a2a] focus:ring-primary focus:border-primary'
                        }`}
                      />
                      <button
                        type="submit"
                        disabled={!replyInput.trim() || sending}
                        className="bg-primary text-black w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center hover:brightness-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                        aria-label="Send reply"
                      >
                        <Icon name="send" size={18} />
                      </button>
                    </div>
                  </form>
                )}

                </div>{/* end chat column */}

                {/* Customer Info Sidebar - Slide-out on mobile, inline on desktop */}
                {showCustomerInfo && (
                  <>
                    {/* Mobile backdrop */}
                    <div
                      className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                      onClick={() => setShowCustomerInfo(false)}
                    />
                    <div className="fixed right-0 top-0 h-full w-[280px] sm:w-[320px] lg:relative lg:w-[280px] border-l border-[#1f1f1f] bg-[#0d0d0d] overflow-y-auto flex-shrink-0 z-50 lg:z-auto shadow-2xl lg:shadow-none">
                      <div className="p-4 space-y-4">
                        {/* Mobile close button */}
                        <div className="flex items-center justify-between lg:hidden">
                          <h4 className="text-white font-semibold text-sm">Customer Info</h4>
                          <button
                            onClick={() => setShowCustomerInfo(false)}
                            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                          >
                            <Icon name="close" size={16} className="text-slate-400" />
                          </button>
                        </div>
                        <h4 className="text-white font-semibold text-sm hidden lg:block">Customer Info</h4>

                      {/* Avatar & Name */}
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                          {(activeConv.user?.name || activeConv.guestName || '?')[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="text-white text-sm font-medium">
                            {activeConv.user?.name || activeConv.guestName || 'Guest'}
                          </p>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${activeConv.user ? 'bg-green-500/20 text-green-400' : 'bg-slate-500/20 text-slate-400'}`}>
                            {activeConv.user ? 'Registered' : 'Guest'}
                          </span>
                        </div>
                      </div>

                      {/* Details */}
                      <div className="space-y-3">
                        <div>
                          <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-1">Email</p>
                          <p className="text-slate-300 text-xs">{activeConv.user?.email || activeConv.guestEmail || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-1">Status</p>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${statusColors[activeConv.status]}`}>
                            {activeConv.status}
                          </span>
                        </div>
                        {activeConv.assignedTo && (
                          <div>
                            <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-1">Assigned To</p>
                            <p className="text-slate-300 text-xs">{activeConv.assignedTo.name}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-1">Started</p>
                          <p className="text-slate-300 text-xs">{formatTime(new Date(activeConv.createdAt), tz)}</p>
                        </div>
                        <div>
                          <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-1">Messages</p>
                          <p className="text-slate-300 text-xs">{activeConv.messages.length}</p>
                        </div>

                        {/* Rating */}
                        {activeConv.rating && (
                          <div>
                            <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-1">Rating</p>
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map(s => (
                                <span key={s} className={`text-sm ${s <= activeConv.rating! ? 'text-yellow-400' : 'text-slate-600'}`}>★</span>
                              ))}
                            </div>
                            {activeConv.ratingComment && (
                              <p className="text-slate-400 text-xs mt-1 italic">"{activeConv.ratingComment}"</p>
                            )}
                          </div>
                        )}

                        {/* Tags */}
                        <div>
                          <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-1">Tags</p>
                          <div className="flex flex-wrap gap-1">
                            {(activeConv.tags || []).map(tag => (
                              <span
                                key={tag}
                                className={`text-[10px] px-1.5 py-0.5 rounded cursor-pointer hover:opacity-70 ${tagColors[tag] || 'bg-slate-500/20 text-slate-400'}`}
                                onClick={() => handleUpdateTags((activeConv.tags || []).filter(t => t !== tag))}
                                title="Click to remove"
                              >
                                {tag} ×
                              </span>
                            ))}
                          </div>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {PREDEFINED_TAGS.filter(t => !(activeConv.tags || []).includes(t)).map(tag => (
                              <button
                                key={tag}
                                onClick={() => handleUpdateTags([...(activeConv.tags || []), tag])}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-[#1a1a1a] text-slate-500 hover:text-white transition-colors"
                              >
                                + {tag}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  </>
                )}

                </div>{/* end flex row */}
              </>
            )}
          </div>
        </div>
      </div>
      {/* Image lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center"
          onClick={() => setLightboxUrl(null)}
        >
          <img src={lightboxUrl} alt="Preview" className="max-w-[90vw] max-h-[90vh] rounded-lg object-contain" />
          <button
            type="button"
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 text-white/80 hover:text-white"
            aria-label="Close"
          >
            <Icon name="close" size={28} />
          </button>
        </div>
      )}
    </AdminLayout>
  )
}

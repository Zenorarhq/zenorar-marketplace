'use client'

import { useState, useRef, useEffect } from 'react'
import Icon from '@/components/ui/Icon'
import { useTimezone } from '@/hooks/use-timezone'
import { formatTime } from '@/lib/date-utils'
import { chatApi } from '@/lib/api/chat'
import { useAuth } from '@/contexts/AuthContext'
import { useChatSocket, ChatSocketMessage } from '@/hooks/use-chat-socket'

interface DisplayMessage {
  id: string
  content: string
  senderType: 'USER' | 'AGENT' | 'SYSTEM'
  senderName?: string | null
  attachments?: { url: string; name: string; type: string; size: number }[]
  createdAt: string
}

type ChatView = 'closed' | 'guest-form' | 'chat'

export default function LiveChat() {
  const [isOpen, setIsOpen] = useState(false)
  const [view, setView] = useState<ChatView>('closed')
  const [messages, setMessages] = useState<DisplayMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [isOnline, setIsOnline] = useState(true)
  const [offlineMessage, setOfflineMessage] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [guestName, setGuestName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const lastMessageTimeRef = useRef<string>('')

  const { user } = useAuth()
  const tz = useTimezone()
  const { joinConversation, leaveConversation, onNewMessage, onConversationStatus } = useChatSocket()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Load chat settings on mount
  useEffect(() => {
    chatApi.getSettings().then(res => {
      if (res.success && res.data) {
        setIsOnline(res.data.isOnline)
        setOfflineMessage(res.data.offlineMessage)
      }
    })
  }, [])

  // Check for active conversation on mount
  useEffect(() => {
    chatApi.getActiveConversation().then(res => {
      if (res.success && res.data) {
        setConversationId(res.data.id)
        loadMessages(res.data.id)
      }
    })
  }, [])

  const loadMessages = async (convId: string) => {
    const res = await chatApi.getMessages(convId)
    if (res.success && res.data) {
      const msgs: DisplayMessage[] = res.data.map(m => ({
        id: m.id,
        content: m.content,
        senderType: m.senderType,
        senderName: m.senderName,
        attachments: m.attachments,
        createdAt: m.createdAt,
      }))
      setMessages(msgs)
      if (msgs.length > 0) {
        lastMessageTimeRef.current = msgs[msgs.length - 1].createdAt
      }
    }
  }

  // Socket.IO: join conversation room and listen for new messages
  useEffect(() => {
    if (!conversationId) return

    joinConversation(conversationId)

    const unsubMessage = onNewMessage((msg: ChatSocketMessage) => {
      if (msg.conversationId !== conversationId) return

      setMessages(prev => {
        // Dedup: skip if we already have this message
        if (prev.some(m => m.id === msg.id)) return prev

        const newMsg: DisplayMessage = {
          id: msg.id,
          content: msg.content,
          senderType: msg.senderType,
          senderName: msg.senderName,
          attachments: msg.attachments,
          createdAt: msg.createdAt,
        }

        // Count agent messages as unread if chat is closed
        if (msg.senderType === 'AGENT') {
          setUnreadCount(c => c + 1)
        }

        return [...prev, newMsg]
      })

      lastMessageTimeRef.current = msg.createdAt
    })

    const unsubStatus = onConversationStatus((data) => {
      if (data.conversationId !== conversationId) return
      if (data.status === 'CLOSED' || data.status === 'RESOLVED') {
        setMessages(prev => [...prev, {
          id: 'system-' + Date.now(),
          content: `Conversation ${data.status.toLowerCase()}`,
          senderType: 'SYSTEM',
          createdAt: new Date().toISOString(),
        }])
      }
    })

    return () => {
      leaveConversation(conversationId)
      unsubMessage()
      unsubStatus()
    }
  }, [conversationId, joinConversation, leaveConversation, onNewMessage, onConversationStatus])

  const handleOpen = () => {
    setIsOpen(true)
    setUnreadCount(0)
    if (conversationId) {
      setView('chat')
    } else if (user) {
      setView('chat')
    } else {
      setView('guest-form')
    }
  }

  const handleClose = () => {
    setIsOpen(false)
    setView('closed')
  }

  const handleGuestSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!guestEmail.trim()) return
    setView('chat')
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim()) return

    const content = inputValue.trim()
    setError(null)

    // If no conversation yet, create one
    if (!conversationId) {
      setIsLoading(true)
      const res = await chatApi.createConversation({
        guestEmail: user ? undefined : guestEmail,
        guestName: user ? undefined : guestName,
        initialMessage: content,
      })
      setIsLoading(false)

      if (res.success && res.data) {
        setInputValue('')
        setConversationId(res.data.id)
        lastMessageTimeRef.current = ''
        // Load real messages from server (includes our initial message with real IDs)
        await loadMessages(res.data.id)
      } else {
        setError(res.error || 'Failed to start conversation')
      }
      return
    }

    // Existing conversation — send message
    setInputValue('')
    const localId = 'local-' + Date.now()
    const localMsg: DisplayMessage = {
      id: localId,
      content,
      senderType: 'USER',
      createdAt: new Date().toISOString(),
    }
    setMessages(prev => [...prev, localMsg])

    const res = await chatApi.sendMessage(conversationId, content)
    if (res.success && res.data) {
      // Replace local message with server version (so SSE dedup works)
      setMessages(prev => prev.map(m => m.id === localId ? {
        ...m,
        id: res.data!.id,
        createdAt: res.data!.createdAt,
      } : m))
    } else {
      setError(res.error || 'Failed to send message')
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const uploadRes = await chatApi.uploadFile(file)
    setUploading(false)

    if (!uploadRes.success || !uploadRes.data) return

    const attachment = uploadRes.data

    if (!conversationId) {
      // Create conversation with attachment
      setIsLoading(true)
      const res = await chatApi.createConversation({
        guestEmail: user ? undefined : guestEmail,
        guestName: user ? undefined : guestName,
        initialMessage: `Sent a file: ${attachment.name}`,
      })
      setIsLoading(false)
      if (res.success && res.data) {
        setConversationId(res.data.id)
        setTimeout(() => loadMessages(res.data!.id), 500)
      }
      return
    }

    // Send as message with attachment
    const localMsg: DisplayMessage = {
      id: 'local-' + Date.now(),
      content: '',
      senderType: 'USER',
      attachments: [attachment],
      createdAt: new Date().toISOString(),
    }
    setMessages(prev => [...prev, localMsg])

    await chatApi.sendMessage(conversationId, '', [attachment])

    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const renderAttachment = (att: { url: string; name: string; type: string; size: number }) => {
    const isImage = att.type?.startsWith('image/')
    if (isImage) {
      return (
        <a href={att.url} target="_blank" rel="noopener noreferrer" className="block mt-1">
          <img src={att.url} alt={att.name} className="max-w-[200px] rounded-lg" />
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
    <div className="fixed bottom-6 right-6 z-50">
      {/* Chat Window */}
      {isOpen && (
        <div className="absolute bottom-20 right-0 w-[380px] h-[520px] bg-surface-dark border border-border-dark rounded-2xl shadow-2xl shadow-black/50 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-200">
          {/* Header */}
          <div className="bg-charcoal px-6 py-4 border-b border-border-dark flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                <Icon name="customer-support" size={24} className="text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-white">Live Support</h3>
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-primary animate-pulse' : 'bg-slate-500'}`}></span>
                  <span className="text-xs text-slate-400">{isOnline ? 'Online now' : 'Offline'}</span>
                </div>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-slate-400 hover:text-white transition-colors"
              aria-label="Close chat"
            >
              <Icon name="close" size={24} />
            </button>
          </div>

          {/* Guest Form View */}
          {view === 'guest-form' && (
            <div className="flex-1 p-6 flex flex-col justify-center">
              <h4 className="text-white font-semibold mb-2">Start a conversation</h4>
              <p className="text-slate-400 text-sm mb-4">Enter your details to chat with us</p>
              <form onSubmit={handleGuestSubmit} className="space-y-3">
                <input
                  type="text"
                  value={guestName}
                  onChange={e => setGuestName(e.target.value)}
                  placeholder="Your name (optional)"
                  className="w-full bg-charcoal border border-border-dark rounded-xl py-3 px-4 text-white placeholder:text-slate-500 focus:ring-1 focus:ring-primary focus:border-primary transition-all text-sm"
                />
                <input
                  type="email"
                  value={guestEmail}
                  onChange={e => setGuestEmail(e.target.value)}
                  placeholder="Your email *"
                  required
                  className="w-full bg-charcoal border border-border-dark rounded-xl py-3 px-4 text-white placeholder:text-slate-500 focus:ring-1 focus:ring-primary focus:border-primary transition-all text-sm"
                />
                <button
                  type="submit"
                  className="w-full bg-primary text-black font-semibold py-3 rounded-xl hover:brightness-105 transition-all"
                >
                  Start Chat
                </button>
              </form>
            </div>
          )}

          {/* Chat View */}
          {view === 'chat' && (
            <>
              {/* Offline Banner */}
              {!isOnline && messages.length === 0 && (
                <div className="px-4 py-3 bg-yellow-500/10 border-b border-yellow-500/20">
                  <p className="text-yellow-400 text-xs">We&apos;re currently offline. You can still leave a message and we&apos;ll get back to you.</p>
                </div>
              )}

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                  <div className="text-center text-slate-500 text-sm mt-8">
                    Send a message to start the conversation
                  </div>
                )}
                {messages.map((message) => (
                  <div key={message.id}>
                    {message.senderType === 'SYSTEM' ? (
                      <div className="text-center">
                        <p className="text-xs text-slate-500 bg-charcoal inline-block px-3 py-1.5 rounded-full">{message.content}</p>
                      </div>
                    ) : (
                      <div className={`flex ${message.senderType === 'USER' ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                            message.senderType === 'USER'
                              ? 'bg-primary text-black rounded-br-none'
                              : 'bg-charcoal text-white rounded-bl-none'
                          }`}
                        >
                          {message.senderType === 'AGENT' && message.senderName && (
                            <p className="text-[10px] text-primary mb-1 font-medium">{message.senderName}</p>
                          )}
                          {message.content && (
                            <p className="text-sm">{message.content}</p>
                          )}
                          {message.attachments?.map((att, i) => (
                            <div key={i}>{renderAttachment(att)}</div>
                          ))}
                          <p
                            className={`text-[10px] mt-1 ${
                              message.senderType === 'USER' ? 'text-black/60' : 'text-slate-500'
                            }`}
                          >
                            {formatTime(new Date(message.createdAt), tz)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Actions (only if no messages yet) */}
              {messages.length === 0 && (
                <div className="px-4 py-2 border-t border-border-dark flex gap-2 overflow-x-auto">
                  <button
                    onClick={() => setInputValue('I need help with my order')}
                    className="whitespace-nowrap text-xs bg-charcoal text-slate-400 px-3 py-1.5 rounded-full hover:text-white hover:bg-surface-dark transition-colors"
                  >
                    Order help
                  </button>
                  <button
                    onClick={() => setInputValue('I have a payment issue')}
                    className="whitespace-nowrap text-xs bg-charcoal text-slate-400 px-3 py-1.5 rounded-full hover:text-white hover:bg-surface-dark transition-colors"
                  >
                    Payment issue
                  </button>
                  <button
                    onClick={() => setInputValue('I want a refund')}
                    className="whitespace-nowrap text-xs bg-charcoal text-slate-400 px-3 py-1.5 rounded-full hover:text-white hover:bg-surface-dark transition-colors"
                  >
                    Refund
                  </button>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="px-4 py-2 bg-red-500/10 border-t border-red-500/20">
                  <p className="text-red-400 text-xs">{error}</p>
                </div>
              )}

              {/* Input */}
              <form onSubmit={handleSendMessage} className="p-4 border-t border-border-dark">
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
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Type your message..."
                    disabled={isLoading}
                    className="flex-1 bg-charcoal border border-border-dark rounded-xl py-3 px-4 text-white placeholder:text-slate-500 focus:ring-1 focus:ring-primary focus:border-primary transition-all text-sm"
                  />
                  <button
                    type="submit"
                    disabled={!inputValue.trim() || isLoading}
                    className="bg-primary text-black w-12 h-12 rounded-xl flex items-center justify-center hover:brightness-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Send message"
                  >
                    <Icon name="send" size={24} />
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={() => isOpen ? handleClose() : handleOpen()}
        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-105 ${
          isOpen
            ? 'bg-surface-dark border border-border-dark text-white'
            : 'bg-primary text-black glow-green'
        }`}
        aria-label={isOpen ? 'Close chat' : 'Open live chat'}
      >
        <Icon name={isOpen ? 'close' : 'chat'} size={24} />
      </button>

      {/* Notification Badge */}
      {!isOpen && unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
          {unreadCount}
        </span>
      )}
    </div>
  )
}

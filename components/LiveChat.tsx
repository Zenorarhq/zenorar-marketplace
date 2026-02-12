'use client'

import { useState, useRef, useEffect } from 'react'
import Icon from '@/components/ui/Icon'
import { useTimezone } from '@/hooks/use-timezone'
import { formatTime } from '@/lib/date-utils'

interface Message {
  id: string
  text: string
  sender: 'user' | 'support'
  timestamp: Date
}

export default function LiveChat() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hello! Welcome to Marketplace support. How can I help you today?',
      sender: 'support',
      timestamp: new Date(),
    },
  ])
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: 'user',
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue('')
    setIsTyping(true)

    // Simulate support response
    setTimeout(() => {
      const responses = [
        "Thanks for reaching out! I'm looking into this for you.",
        "I understand your concern. Let me check our system.",
        "Great question! Here's what I can tell you...",
        "I'll connect you with a specialist who can help with this.",
        "Let me pull up your account details to assist you better.",
      ]
      const supportMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: responses[Math.floor(Math.random() * responses.length)],
        sender: 'support',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, supportMessage])
      setIsTyping(false)
    }, 1500)
  }

  const tz = useTimezone()

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
                  <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
                  <span className="text-xs text-slate-400">Online now</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white transition-colors"
              aria-label="Close chat"
            >
              <Icon name="close" size={24} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    message.sender === 'user'
                      ? 'bg-primary text-black rounded-br-none'
                      : 'bg-charcoal text-white rounded-bl-none'
                  }`}
                >
                  <p className="text-sm">{message.text}</p>
                  <p
                    className={`text-[10px] mt-1 ${
                      message.sender === 'user' ? 'text-black/60' : 'text-slate-500'
                    }`}
                  >
                    {formatTime(message.timestamp, tz)}
                  </p>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-charcoal rounded-2xl rounded-bl-none px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions */}
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

          {/* Input */}
          <form onSubmit={handleSendMessage} className="p-4 border-t border-border-dark">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 bg-charcoal border border-border-dark rounded-xl py-3 px-4 text-white placeholder:text-slate-500 focus:ring-1 focus:ring-primary focus:border-primary transition-all text-sm"
              />
              <button
                type="submit"
                disabled={!inputValue.trim()}
                className="bg-primary text-black w-12 h-12 rounded-xl flex items-center justify-center hover:brightness-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Send message"
              >
                <Icon name="send" size={24} />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
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
      {!isOpen && (
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
          1
        </span>
      )}
    </div>
  )
}

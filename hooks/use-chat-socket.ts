'use client'

import { useEffect, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { getAccessToken, getSessionId } from '@/lib/api/client'

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000'

let sharedSocket: Socket | null = null
let refCount = 0

function getSocket(): Socket {
  if (!sharedSocket || sharedSocket.disconnected) {
    sharedSocket = io(SOCKET_URL, {
      auth: {
        token: getAccessToken(),
        sessionId: getSessionId(),
      },
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    })
  }
  refCount++
  return sharedSocket
}

function releaseSocket() {
  refCount--
  if (refCount <= 0 && sharedSocket) {
    sharedSocket.disconnect()
    sharedSocket = null
    refCount = 0
  }
}

export interface ChatSocketMessage {
  id: string
  conversationId: string
  senderType: 'USER' | 'AGENT' | 'SYSTEM'
  senderId: string | null
  senderName: string | null
  content: string
  attachments: any[]
  isRead: boolean
  createdAt: string
}

export function useChatSocket() {
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    socketRef.current = getSocket()
    return () => {
      releaseSocket()
      socketRef.current = null
    }
  }, [])

  const joinConversation = useCallback((conversationId: string) => {
    socketRef.current?.emit('join:conversation', conversationId)
  }, [])

  const leaveConversation = useCallback((conversationId: string) => {
    socketRef.current?.emit('leave:conversation', conversationId)
  }, [])

  const joinAdmin = useCallback(() => {
    socketRef.current?.emit('admin:join')
  }, [])

  const emitTyping = useCallback((conversationId: string, isTyping: boolean) => {
    socketRef.current?.emit('typing', { conversationId, isTyping })
  }, [])

  const onNewMessage = useCallback((callback: (message: ChatSocketMessage) => void) => {
    const handler = (msg: ChatSocketMessage) => callback(msg)
    socketRef.current?.on('message:new', handler)
    return () => {
      socketRef.current?.off('message:new', handler)
    }
  }, [])

  const onConversationNew = useCallback((callback: (conversation: any) => void) => {
    const handler = (conv: any) => callback(conv)
    socketRef.current?.on('conversation:new', handler)
    return () => {
      socketRef.current?.off('conversation:new', handler)
    }
  }, [])

  const onConversationStatus = useCallback((callback: (data: { conversationId: string; status: string }) => void) => {
    const handler = (data: { conversationId: string; status: string }) => callback(data)
    socketRef.current?.on('conversation:status', handler)
    return () => {
      socketRef.current?.off('conversation:status', handler)
    }
  }, [])

  const onConversationAssigned = useCallback((callback: (data: { conversationId: string; agentId: string; agentName?: string }) => void) => {
    const handler = (data: any) => callback(data)
    socketRef.current?.on('conversation:assigned', handler)
    return () => {
      socketRef.current?.off('conversation:assigned', handler)
    }
  }, [])

  const onTyping = useCallback((callback: (data: { conversationId: string; isTyping: boolean; userId: string }) => void) => {
    const handler = (data: any) => callback(data)
    socketRef.current?.on('typing', handler)
    return () => {
      socketRef.current?.off('typing', handler)
    }
  }, [])

  return {
    socket: socketRef,
    joinConversation,
    leaveConversation,
    joinAdmin,
    emitTyping,
    onNewMessage,
    onConversationNew,
    onConversationStatus,
    onConversationAssigned,
    onTyping,
  }
}

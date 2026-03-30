import { io, Socket } from 'socket.io-client'

// WebSocket URL - 优先使用环境变量，否则根据当前页面URL推断服务器地址
const WS_BASE_URL =
  import.meta.env.VITE_WS_BASE_URL ||
  (window.location.hostname === 'localhost' ? 'http://localhost:1007' : 'http://127.0.0.1:1007')

console.log('[WebSocket Client] WS_BASE_URL determined as:', WS_BASE_URL)

class WebSocketService {
  private socket: Socket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5

  connect(): Socket {
    if (this.socket?.connected) {
      console.log('[WebSocket Client] Already connected, returning existing socket')
      return this.socket
    }

    console.log('[WebSocket Client] Connecting to:', WS_BASE_URL)
    console.log('[WebSocket Client] Current window location:', window.location.href)

    this.socket = io(WS_BASE_URL, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true,
      autoConnect: true,
    })

    this.socket.on('connect', () => {
      console.log('[WebSocket Client] Successfully connected to server')
      console.log('[WebSocket Client] Socket ID:', this.socket?.id)
      console.log('[WebSocket Client] Connected to:', WS_BASE_URL)
      this.reconnectAttempts = 0
    })

    this.socket.on('disconnect', (reason) => {
      console.log('[WebSocket Client] Disconnected from server, reason:', reason)
      console.log('[WebSocket Client] Current connection state:', this.socket?.connected)
      if (reason === 'io server disconnect') {
        // Server disconnected, manual reconnection
        console.log('[WebSocket Client] Server disconnected, attempting reconnection...')
        this.socket?.connect()
      }
    })

    this.socket.on('connect_error', (error) => {
      console.error('[WebSocket Client] Connection error:', error)
      console.error('[WebSocket Client] Failed to connect to:', WS_BASE_URL)
      console.error('[WebSocket Client] Error details:', error.message)
      this.reconnectAttempts++

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('[WebSocket Client] Max reconnection attempts reached')
        console.error('[WebSocket Client] Giving up connection attempts')
      }
    })

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('[WebSocket Client] Reconnected successfully after', attemptNumber, 'attempts')
    })

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('[WebSocket Client] Reconnection attempt', attemptNumber)
    })

    this.socket.on('reconnect_error', (error) => {
      console.error('[WebSocket Client] Reconnection error:', error)
    })

    this.socket.on('reconnect_failed', () => {
      console.error('[WebSocket Client] Reconnection failed permanently')
    })

    return this.socket
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }

  emit(event: string, data: any): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data)
    } else {
      console.warn('WebSocket not connected, cannot emit:', event)
    }
  }

  on(event: string, callback: (...args: any[]) => void): void {
    if (this.socket) {
      this.socket.on(event, callback)
    }
  }

  off(event: string, callback?: (...args: any[]) => void): void {
    if (this.socket) {
      if (callback) {
        this.socket.off(event, callback)
      } else {
        this.socket.off(event)
      }
    }
  }

  get isConnected(): boolean {
    return this.socket?.connected || false
  }
}

export const wsService = new WebSocketService()

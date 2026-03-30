import { Server as SocketIOServer } from 'socket.io'

let io: SocketIOServer | null = null

export function setWebSocketServer(server: SocketIOServer) {
  io = server
}

export function emitWebSocketEvent(event: string, data: any) {
  console.log('[WebSocket Server] Emitting event:', event, 'with data:', data)
  if (io) {
    console.log('[WebSocket Server] Connected sockets count:', io.sockets.sockets.size)
    io.emit(event, data)
    console.log('[WebSocket Server] Event emitted successfully')
  } else {
    console.error('[WebSocket Server] WebSocket server not initialized!')
  }
}

export function broadcastWebSocketEvent(event: string, data: any, excludeSocketId?: string) {
  if (io) {
    io.sockets.sockets.forEach((socket) => {
      if (excludeSocketId && socket.id === excludeSocketId) return
      socket.emit(event, data)
    })
  }
}

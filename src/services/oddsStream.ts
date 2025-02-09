
import { io, Socket } from "socket.io-client"

interface StreamConfig {
  sport: string
  gameId: string
  market: string
  selection: string
  onOddsUpdate: (price: number) => void
}

interface OddsMessage {
  type: "odds" | "error"
  price?: number
  gameId?: string
  market?: string
  selection?: string
  message?: string
}

interface ConnectError extends Error {
  description?: string
}

export class OddsStreamService {
  private socket: Socket | null = null
  private activeStreams: Map<string, StreamConfig> = new Map()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5

  private createStreamKey(config: StreamConfig): string {
    return `${config.gameId}:${config.market}:${config.selection}`
  }

  private initSocket() {
    if (this.socket?.connected) return

    console.log("[Socket.IO Client] Initializing connection")
    
    this.socket = io({
      path: "/api/ws-odds",
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    })

    this.socket.on("connect", () => {
      console.log("[Socket.IO Client] Connection established")
      this.reconnectAttempts = 0
      this.sendActiveConfigs()
    })

    this.socket.on("odds", (message: OddsMessage) => {
      console.log("[Socket.IO Client] Received odds:", message)
      if (message.type === "odds" && message.price && message.gameId && message.market && message.selection) {
        const streamKey = `${message.gameId}:${message.market}:${message.selection}`
        const config = this.activeStreams.get(streamKey)
        
        if (config) {
          console.log("[Socket.IO Client] Updating odds for:", streamKey)
          config.onOddsUpdate(message.price)
        }
      }
    })

    this.socket.on("error", (message: OddsMessage) => {
      console.error("[Socket.IO Client] Stream error:", message.message)
    })

    this.socket.on("disconnect", () => {
      console.log("[Socket.IO Client] Connection closed")
    })

    this.socket.on("connect_error", (error: ConnectError) => {
      console.error("[Socket.IO Client] Connection error:", error.message)
      this.reconnectAttempts++
    })
  }

  private sendActiveConfigs() {
    if (!this.socket?.connected) {
      console.log("[Socket.IO Client] Cannot send configs - not connected")
      return
    }
    
    this.activeStreams.forEach(config => {
      console.log("[Socket.IO Client] Subscribing to odds:", config)
      this.socket?.emit("subscribe", config)
    })
  }

  subscribeToOdds(config: StreamConfig): () => void {
    if (typeof window === "undefined") return () => {}
    
    const streamKey = this.createStreamKey(config)
    console.log("[Socket.IO Client] Setting up subscription:", streamKey)
    this.activeStreams.set(streamKey, config)
    
    this.initSocket()
    
    return () => {
      console.log("[Socket.IO Client] Cleaning up subscription:", streamKey)
      this.activeStreams.delete(streamKey)
      if (this.activeStreams.size === 0 && this.socket) {
        this.socket.disconnect()
        this.socket = null
      }
    }
  }
}

export const oddsStreamService = new OddsStreamService()

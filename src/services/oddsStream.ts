
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

export class OddsStreamService {
  private ws: WebSocket | null = null
  private activeStreams: Map<string, StreamConfig> = new Map()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5

  private createStreamKey(config: StreamConfig): string {
    return `${config.gameId}:${config.market}:${config.selection}`
  }

  private async initWebSocket() {
    if (this.ws?.readyState === WebSocket.OPEN) return
    
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
    const wsUrl = `${protocol}//${window.location.host}/api/ws-odds`
    console.log("[WS Client] Connecting to:", wsUrl)
    
    return new Promise<void>((resolve, reject) => {
      try {
        this.ws = new WebSocket(wsUrl)
        
        this.ws.onopen = () => {
          console.log("[WS Client] Connection established")
          this.reconnectAttempts = 0
          this.sendActiveConfigs()
          resolve()
        }

        this.ws.onmessage = (event) => {
          console.log("[WS Client] Received message:", event.data)
          try {
            const message: OddsMessage = JSON.parse(event.data)
            console.log("[WS Client] Parsed message:", message)
            
            if (message.type === "odds" && message.price && message.gameId && message.market && message.selection) {
              const streamKey = `${message.gameId}:${message.market}:${message.selection}`
              const config = this.activeStreams.get(streamKey)
              
              if (config) {
                console.log("[WS Client] Updating odds for:", streamKey)
                config.onOddsUpdate(message.price)
              }
            } else if (message.type === "error") {
              console.error("[WS Client] Stream error:", message.message)
              this.reconnect()
            }
          } catch (error) {
            console.error("[WS Client] Error processing message:", error)
          }
        }

        this.ws.onerror = (error) => {
          console.error("[WS Client] WebSocket error:", error)
          reject(error)
        }

        this.ws.onclose = () => {
          console.log("[WS Client] Connection closed")
          this.reconnect()
        }
      } catch (error) {
        console.error("[WS Client] Error initializing WebSocket:", error)
        reject(error)
      }
    })
  }

  private sendActiveConfigs() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.log("[WS Client] Cannot send configs - connection not open")
      return
    }
    
    this.activeStreams.forEach(config => {
      console.log("[WS Client] Sending config:", config)
      this.ws?.send(JSON.stringify(config))
    })
  }

  private async reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("[WS Client] Max reconnection attempts reached")
      return
    }
    
    this.reconnectAttempts++
    console.log(`[WS Client] Reconnecting... Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`)
    
    await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, this.reconnectAttempts)))
    await this.initWebSocket()
  }

  subscribeToOdds(config: StreamConfig): () => void {
    if (typeof window === "undefined") return () => {}
    
    const streamKey = this.createStreamKey(config)
    console.log("[WS Client] Subscribing to odds:", streamKey)
    this.activeStreams.set(streamKey, config)
    
    void this.initWebSocket()
    
    return () => {
      console.log("[WS Client] Unsubscribing from odds:", streamKey)
      this.activeStreams.delete(streamKey)
      if (this.activeStreams.size === 0) {
        this.ws?.close()
        this.ws = null
      }
    }
  }
}

export const oddsStreamService = new OddsStreamService()

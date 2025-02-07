
interface OddsMessage {
  type: string
  price?: number
  gameId?: string
  market?: string
  selection?: string
  message?: string
}

interface StreamConfig {
  sport: string
  gameId: string
  market: string
  selection: string
  onOddsUpdate: (price: number) => void
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
    
    return new Promise<void>((resolve, reject) => {
      try {
        this.ws = new WebSocket(wsUrl)

        this.ws.onopen = () => {
          console.log("WebSocket connection established")
          this.reconnectAttempts = 0
          this.sendActiveConfigs()
          resolve()
        }

        this.ws.onmessage = (event) => {
          try {
            const message: OddsMessage = JSON.parse(event.data)
            
            if (message.type === "odds" && message.price && message.gameId && message.market && message.selection) {
              const streamKey = `${message.gameId}:${message.market}:${message.selection}`
              const config = this.activeStreams.get(streamKey)
              
              if (config) {
                config.onOddsUpdate(message.price)
              }
            } else if (message.type === "error") {
              console.error("Stream error:", message.message)
              this.reconnect()
            }
          } catch (error) {
            console.error("Error processing message:", error)
          }
        }

        this.ws.onerror = (error) => {
          console.error("WebSocket error:", error)
          reject(error)
        }

        this.ws.onclose = () => {
          console.log("WebSocket connection closed")
          this.reconnect()
        }
      } catch (error) {
        console.error("Error initializing WebSocket:", error)
        reject(error)
      }
    })
  }

  private sendActiveConfigs() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return
    
    this.activeStreams.forEach(config => {
      this.ws?.send(JSON.stringify(config))
    })
  }

  private async reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("Max reconnection attempts reached")
      return
    }

    this.reconnectAttempts++
    console.log(`Reconnecting... Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`)
    
    await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, this.reconnectAttempts)))
    await this.initWebSocket()
  }

  subscribeToOdds(config: StreamConfig): () => void {
    if (typeof window === "undefined") return () => {}
    
    const streamKey = this.createStreamKey(config)
    this.activeStreams.set(streamKey, config)

    void this.initWebSocket()
    this.ws?.send(JSON.stringify(config))

    return () => {
      this.activeStreams.delete(streamKey)
      if (this.activeStreams.size === 0) {
        this.ws?.close()
        this.ws = null
      }
    }
  }
}

export const oddsStreamService = new OddsStreamService()


import type { Server as WebSocketServer, WebSocket } from "ws"
import { NextApiRequest, NextApiResponse } from "next"
import { Server as HTTPServer } from "http"
import { Socket } from "net"

interface SocketWithIO extends Socket {
  server: HTTPServer & {
    ws?: WebSocketServer
  }
}

interface NextApiResponseWithSocket extends NextApiResponse {
  socket: SocketWithIO | null
}

interface StreamConfig {
  sport: string
  market: string
  gameId: string
  selection: string
}

const API_KEY = process.env.NEXT_PUBLIC_OPTICODDS_API_KEY || ""

let wsServer: WebSocketServer | null = null

function initWebSocketServer(server: HTTPServer) {
  if (wsServer) return wsServer
  wsServer = new WebSocketServer({ server })
  
  wsServer.on("connection", (ws: WebSocket) => {
    console.log("[WS Server] New connection established")
    
    ws.on("message", async (message: string | Buffer) => {
      try {
        const config: StreamConfig = JSON.parse(message.toString())
        console.log("[WS Server] Received config:", config)
        
        const url = `https://api.opticodds.com/api/v3/stream/${config.sport}/odds?sportsbook=Pinnacle&fixture_id=${config.gameId}&market=${encodeURIComponent(config.market)}`
        console.log("[WS Server] Fetching URL:", url)

        const headers = {
          'X-Api-Key': API_KEY,
          'Accept': 'text/event-stream'
        } as const

        const response = await fetch(url, { headers })

        console.log("[WS Server] Response status:", response.status)
        if (!response.ok) {
          const text = await response.text()
          console.error("[WS Server] Error response:", text)
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const reader = response.body?.getReader()
        if (!reader) throw new Error("Failed to get stream reader")

        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            console.log("[WS Server] Stream complete")
            break
          }
          
          const text = new TextDecoder().decode(value)
          console.log("[WS Server] Received chunk:", text)
          const lines = text.split("\n")
          
          for (const line of lines) {
            if (line.startsWith("data:")) {
              try {
                const data = JSON.parse(line.slice(5))
                console.log("[WS Server] Parsed data:", data)
                
                if (data.data) {
                  const matchingOdd = data.data.find((odd: any) => 
                    odd.game_id === config.gameId &&
                    odd.market === config.market &&
                    odd.selection === config.selection &&
                    odd.sportsbook === "Pinnacle"
                  )
                  if (matchingOdd) {
                    console.log("[WS Server] Found matching odd:", matchingOdd)
                    ws.send(JSON.stringify({
                      type: "odds",
                      price: matchingOdd.price,
                      gameId: config.gameId,
                      market: config.market,
                      selection: config.selection
                    }))
                  }
                }
              } catch (e) {
                console.error("[WS Server] Error parsing odds data:", e)
              }
            }
          }
        }
      } catch (error) {
        console.error("[WS Server] Stream error:", error)
        ws.send(JSON.stringify({ 
          type: "error", 
          message: error instanceof Error ? error.message : "Stream error occurred" 
        }))
      }
    })

    ws.on("close", () => {
      console.log("[WS Server] Connection closed")
    })
  })
  return wsServer
}

export default function handler(req: NextApiRequest, res: NextApiResponseWithSocket) {
  const socket = res.socket
  if (socket && !socket.server.ws) {
    console.log("Initializing WebSocket server")
    socket.server.ws = initWebSocketServer(socket.server)
  }
  
  res.status(200).end()
}


import { Server as SocketIOServer } from "socket.io"
import { NextApiRequest } from "next"
import { Server as HTTPServer } from "http"
import { Socket } from "socket.io"

const API_KEY = process.env.NEXT_PUBLIC_OPTICODDS_API_KEY

if (!API_KEY) {
  throw new Error("OPTICODDS_API_KEY is required")
}

interface StreamConfig {
  sport: string
  market: string
  gameId: string
  selection: string
}

interface OddsData {
  game_id: string
  market: string
  selection: string
  sportsbook: string
  price: number
}

let io: SocketIOServer | null = null

function initSocketServer(server: HTTPServer) {
  if (io) return io
  
  io = new SocketIOServer(server, {
    path: "/api/ws-odds",
    addTrailingSlash: false,
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  })
  
  io.on("connection", (socket: Socket) => {
    console.log("[Socket.IO Server] New connection established")
    
    socket.on("subscribe", async (config: StreamConfig) => {
      try {
        console.log("[Socket.IO Server] Config received:", config)
        
        const url = `https://api.opticodds.com/api/v3/stream/${config.sport}/odds`
        const params = new URLSearchParams({
          sportsbook: "Pinnacle",
          fixture_id: config.gameId,
          market: config.market
        })
        
        const headers: HeadersInit = {
          "X-Api-Key": API_KEY,
          "Accept": "text/event-stream"
        }
        
        console.log("[Socket.IO Server] Request URL:", `${url}?${params.toString()}`)
        console.log("[Socket.IO Server] Request headers:", {
          "X-Api-Key": API_KEY?.slice(0, 5) + "...",
          "Accept": "text/event-stream"
        })

        const response = await fetch(`${url}?${params.toString()}`, { headers })

        console.log("[Socket.IO Server] Response status:", response.status)
        if (!response.ok) {
          const text = await response.text()
          console.error("[Socket.IO Server] Error response:", text)
          throw new Error(`HTTP ${response.status}: ${text}`)
        }

        const reader = response.body?.getReader()
        if (!reader) throw new Error("Failed to get stream reader")

        socket.on("disconnect", () => {
          console.log("[Socket.IO Server] Client disconnected, closing reader")
          reader.cancel()
        })

        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            console.log("[Socket.IO Server] Stream complete")
            break
          }
          
          const text = new TextDecoder().decode(value)
          console.log("[Socket.IO Server] Received chunk:", text)
          const lines = text.split("\n")
          
          for (const line of lines) {
            if (line.startsWith("data:")) {
              try {
                const data = JSON.parse(line.slice(5))
                if (data.data) {
                  const matchingOdd = data.data.find((odd: OddsData) => 
                    odd.game_id === config.gameId &&
                    odd.market === config.market &&
                    odd.selection === config.selection &&
                    odd.sportsbook === "Pinnacle"
                  )
                  if (matchingOdd) {
                    console.log("[Socket.IO Server] Found matching odd:", matchingOdd)
                    socket.emit("odds", {
                      type: "odds",
                      price: matchingOdd.price,
                      gameId: config.gameId,
                      market: config.market,
                      selection: config.selection
                    })
                  }
                }
              } catch (e) {
                console.error("[Socket.IO Server] Error parsing odds data:", e)
              }
            }
          }
        }
      } catch (error) {
        console.error("[Socket.IO Server] Error:", error)
        socket.emit("error", { 
          type: "error", 
          message: error instanceof Error ? error.message : "Stream error occurred" 
        })
      }
    })

    socket.on("disconnect", () => {
      console.log("[Socket.IO Server] Connection closed")
    })
  })
  
  return io
}

export default function handler(req: NextApiRequest, res: any) {
  if (!res.socket.server.io) {
    console.log("[Socket.IO Server] Initializing Socket.IO server")
    res.socket.server.io = initSocketServer(res.socket.server)
  }
  res.end()
}


import { Server, WebSocket } from "ws"
import { NextApiRequest } from "next"
import { Server as HTTPServer } from "http"

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

let wsServer: Server | null = null

function initWebSocketServer(server: HTTPServer) {
  if (wsServer) return wsServer

  wsServer = new Server({ server })
  
  wsServer.on("connection", (ws: WebSocket) => {
    console.log("New WebSocket connection established")

    ws.on("message", async (message: string | Buffer) => {
      try {
        const config: StreamConfig = JSON.parse(message.toString())
        console.log("Received stream config:", config)

        const url = `https://api.opticodds.com/api/v3/stream/${config.sport}/odds`
        const params = new URLSearchParams()
        
        if (!API_KEY) {
          throw new Error("API key is required")
        }
        
        params.append("key", API_KEY)
        params.append("sportsbook", "Pinnacle")
        params.append("market", config.market)
        params.append("fixture_id", config.gameId)

        const response = await fetch(`${url}?${params.toString()}`)
        const reader = response.body?.getReader()

        if (!reader) {
          throw new Error("Failed to get stream reader")
        }

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const text = new TextDecoder().decode(value)
          const lines = text.split("\n")

          for (const line of lines) {
            if (line.startsWith("data:")) {
              try {
                const data = JSON.parse(line.slice(5))
                if (data.data) {
                  const matchingOdd = data.data.find((odd: any) => 
                    odd.game_id === config.gameId &&
                    odd.market === config.market &&
                    odd.selection === config.selection &&
                    odd.sportsbook === "Pinnacle"
                  )

                  if (matchingOdd) {
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
                console.error("Error parsing odds data:", e)
              }
            }
          }
        }
      } catch (error) {
        console.error("Stream error:", error)
        ws.send(JSON.stringify({ type: "error", message: "Stream error occurred" }))
      }
    })

    ws.on("close", () => {
      console.log("WebSocket connection closed")
    })
  })

  return wsServer
}

export default function handler(req: NextApiRequest, res: any) {
  if (!res.socket.server.ws) {
    console.log("Initializing WebSocket server")
    res.socket.server.ws = initWebSocketServer(res.socket.server)
  }
  
  res.end()
}

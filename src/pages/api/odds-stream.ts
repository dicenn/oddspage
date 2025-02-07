
import { NextApiRequest, NextApiResponse } from "next"
import { Readable } from "stream"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { sport, market, sportsbook } = req.query
  const API_KEY = process.env.NEXT_PUBLIC_OPTICODDS_API_KEY

  const url = `https://api.opticodds.com/api/v3/stream/${sport}/odds`
  const params = new URLSearchParams({
    key: API_KEY || "",
    sportsbook: Array.isArray(sportsbook) ? sportsbook[0] : sportsbook || "Pinnacle",
    market: Array.isArray(market) ? market[0] : market || "",
  })

  try {
    const response = await fetch(`${url}?${params.toString()}`)
    
    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`)
    }

    res.setHeader("Content-Type", "text/event-stream")
    res.setHeader("Cache-Control", "no-cache")
    res.setHeader("Connection", "keep-alive")

    const reader = response.body?.getReader()
    const stream = new Readable({
      read() {}
    })

    if (!reader) {
      throw new Error("Failed to get reader from response")
    }

    const push = async () => {
      try {
        const { done, value } = await reader.read()
        
        if (done) {
          stream.push(null)
          return
        }

        stream.push(value)
        push()
      } catch (error) {
        console.error("Stream error:", error)
        stream.push(null)
      }
    }

    stream.pipe(res)
    push()

    req.on("close", () => {
      reader.cancel()
      stream.destroy()
    })
  } catch (error) {
    console.error("API error:", error)
    res.status(500).json({ error: "Failed to connect to odds stream" })
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
}

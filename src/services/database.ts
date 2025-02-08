
import { ref, onValue, set, push, remove } from "firebase/database"
import { realTimeDb } from "@/lib/firebase"

export interface BetData {
  "Away Team": string
  "Current Price": number
  "Grade": string
  "Home Team": string
  "League": string
  "Market": string
  "Match Date": string
  "Min Price": number
  "Orginator Price": string | number
  "Selection": string
  "Selection Date": string
  "Sport": string
  "Game ID"?: string
  game_id?: string
  sport?: string
  market?: string
  selection?: string
  id?: string
  [key: string]: string | number | undefined
}

export const databaseService = {
  subscribeToBets: (callback: (data: BetData[]) => void) => {
    const betsRef = ref(realTimeDb, "/")
    
    return onValue(betsRef, (snapshot) => {
      const data = snapshot.val()
      
      if (!data) {
        callback([])
        return
      }

      const betsArray = Object.entries(data).map(([id, bet]) => {
        const betData = bet as BetData
        console.log("Raw bet data:", betData)
        
        // Handle both possible game_id field names
        const gameId = betData.game_id || betData["Game ID"] || ""
        console.log("Extracted game_id:", gameId)
        
        // In databaseService.subscribeToBets
        const transformedBet = {
          ...betData,
          id,
          sport: String(betData["Sport"] || "").toLowerCase(),
          market: String(betData["Market"] || ""),
          selection: String(betData["Selection"] || ""),
          game_id: String(gameId)
        }

        console.log("DEBUG VALUES:", {
          originalMarket: betData["Market"],
          originalSelection: betData["Selection"],
          transformedMarket: transformedBet.market,
          transformedSelection: transformedBet.selection,
          rawBetData: betData
        });
        
        console.log("Transformed bet:", transformedBet)
        return transformedBet
      })

      callback(betsArray)
    }, (error) => {
      console.error("Error in database subscription:", error)
      throw error
    })
  },

  addBet: async (bet: Omit<BetData, "id">) => {
    const betsRef = ref(realTimeDb, "/")
    return push(betsRef, bet)
  },

  updateBet: async (id: string, bet: Omit<BetData, "id">) => {
    const betRef = ref(realTimeDb, `/${id}`)
    return set(betRef, bet)
  },

  deleteBet: async (id: string) => {
    const betRef = ref(realTimeDb, `/${id}`)
    return remove(betRef)
  }
}

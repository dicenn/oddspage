
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
  id?: string
  [key: string]: string | number | undefined
}

export const databaseService = {
  subscribeToBets: (callback: (data: BetData[]) => void) => {
    console.log("Initializing database subscription...")
    const betsRef = ref(realTimeDb, "/")
    
    console.log("Database reference created:", betsRef)
    
    return onValue(betsRef, (snapshot) => {
      console.log("Received database snapshot")
      const data = snapshot.val()
      console.log("Raw database data:", data)
      
      if (!data) {
        console.log("No data received from database")
        callback([])
        return
      }

      const betsArray = Object.entries(data).map(([id, bet]) => {
        console.log(`Processing bet with ID: ${id}`, bet)
        return {
          ...(bet as BetData),
          id
        }
      })

      console.log("Processed bets array:", betsArray)
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

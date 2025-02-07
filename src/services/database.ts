
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
    const betsRef = ref(realTimeDb, "/")
    return onValue(betsRef, (snapshot) => {
      const data = snapshot.val()
      if (!data) {
        callback([])
        return
      }

      const betsArray = Object.entries(data).map(([id, bet]) => ({
        ...(bet as BetData),
        id
      }))

      callback(betsArray)
    }, (error) => {
      console.error("Error fetching data:", error)
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

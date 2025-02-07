
import { ref, onValue, set, push, remove, Database } from "firebase/database"
import { realTimeDb } from "@/lib/firebase"

export interface BetData {
  [key: string]: string | number
}

const BETS_REF = "bets";

export const databaseService = {
  subscribeToBets: (callback: (data: BetData[]) => void) => {
    const betsRef = ref(realTimeDb, BETS_REF)
    return onValue(betsRef, (snapshot) => {
      const data = snapshot.val()
      const betsArray = data ? Object.entries(data).map(([id, bet]) => ({
        id,
        ...bet as BetData
      })) : []
      callback(betsArray)
    })
  },

  addBet: async (bet: BetData) => {
    const betsRef = ref(realTimeDb, BETS_REF)
    return push(betsRef, bet)
  },

  updateBet: async (id: string, bet: BetData) => {
    const betRef = ref(realTimeDb, `${BETS_REF}/${id}`)
    return set(betRef, bet)
  },

  deleteBet: async (id: string) => {
    const betRef = ref(realTimeDb, `${BETS_REF}/${id}`)
    return remove(betRef)
  }
}

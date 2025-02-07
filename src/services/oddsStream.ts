
interface OddsData {
  data: Array<{
    game_id: string;
    market: string;
    selection: string;
    price: number;
    sportsbook: string;
  }>;
}

interface StreamConfig {
  sport: string;
  gameId: string;
  market: string;
  selection: string;
  onOddsUpdate: (price: number) => void;
}

const API_KEY = process.env.NEXT_PUBLIC_OPTICODDS_API_KEY;
const BASE_URL = "https://api.opticodds.com/api/v3/stream";

export class OddsStreamService {
  private eventSource: EventSource | null = null;
  private activeStreams: Map<string, StreamConfig> = new Map();

  private createStreamKey(config: StreamConfig): string {
    return `${config.gameId}:${config.market}:${config.selection}`;
  }

  subscribeToOdds(config: StreamConfig): () => void {
    if (typeof window === "undefined") return () => {};
    
    const streamKey = this.createStreamKey(config);
    this.activeStreams.set(streamKey, config);

    if (!this.eventSource) {
      const url = `${BASE_URL}/${config.sport}/odds`;
      const params = new URLSearchParams({
        key: API_KEY || "",
        sportsbook: "Pinnacle",
        market: config.market,
      });

      this.eventSource = new EventSource(`${url}?${params.toString()}`);
      this.setupEventListeners();
    }

    return () => {
      this.activeStreams.delete(streamKey);
      if (this.activeStreams.size === 0) {
        this.cleanup();
      }
    };
  }

  private setupEventListeners() {
    if (!this.eventSource) return;

    this.eventSource.addEventListener("odds", (event: MessageEvent) => {
      try {
        const oddsData: OddsData = JSON.parse(event.data);
        
        oddsData.data.forEach((odd) => {
          this.activeStreams.forEach((config, streamKey) => {
            if (
              odd.game_id === config.gameId &&
              odd.market === config.market &&
              odd.selection === config.selection &&
              odd.sportsbook === "Pinnacle"
            ) {
              config.onOddsUpdate(odd.price);
            }
          });
        });
      } catch (error) {
        console.error("Error parsing odds data:", error);
      }
    });

    this.eventSource.onerror = (error: Event) => {
      console.error("EventSource failed:", error);
      this.cleanup();
      this.reconnect();
    };
  }

  private cleanup() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  private reconnect() {
    setTimeout(() => {
      const streams = Array.from(this.activeStreams.values());
      this.activeStreams.clear();
      streams.forEach((config) => {
        this.subscribeToOdds(config);
      });
    }, 1000);
  }
}

export const oddsStreamService = new OddsStreamService();

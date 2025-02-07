
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
      const params = new URLSearchParams({
        sport: config.sport,
        market: config.market,
        sportsbook: "Pinnacle"
      });

      const fullUrl = `/api/odds-stream?${params.toString()}`;
      console.log("Connecting to proxy stream:", fullUrl);
      console.log("Stream config:", {
        sport: config.sport,
        gameId: config.gameId,
        market: config.market,
        selection: config.selection
      });

      this.eventSource = new EventSource(fullUrl);
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

    this.eventSource.onopen = () => {
      console.log("Stream connection opened");
    };

    this.eventSource.addEventListener("odds", (event: MessageEvent) => {
      console.log("Received odds event:", event.data);
      try {
        const oddsData: OddsData = JSON.parse(event.data);
        console.log("Parsed odds data:", oddsData);
        
        oddsData.data.forEach((odd) => {
          console.log("Processing odd:", odd);
          this.activeStreams.forEach((config, streamKey) => {
            console.log("Checking against config:", {
              streamKey,
              gameId: config.gameId,
              market: config.market,
              selection: config.selection
            });

            if (
              odd.game_id === config.gameId &&
              odd.market === config.market &&
              odd.selection === config.selection &&
              odd.sportsbook === "Pinnacle"
            ) {
              console.log("Match found! Updating price:", odd.price);
              config.onOddsUpdate(odd.price);
            }
          });
        });
      } catch (error) {
        console.error("Error parsing odds data:", error);
      }
    });

    this.eventSource.addEventListener("connected", (event) => {
      console.log("Stream connected event:", event);
    });

    this.eventSource.addEventListener("ping", (event) => {
      console.log("Stream ping event:", event);
    });

    this.eventSource.onerror = (error: Event) => {
      console.error("EventSource failed:", error);
      this.cleanup();
      this.reconnect();
    };
  }

  private cleanup() {
    if (this.eventSource) {
      console.log("Cleaning up stream connection");
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  private reconnect() {
    console.log("Attempting to reconnect...");
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

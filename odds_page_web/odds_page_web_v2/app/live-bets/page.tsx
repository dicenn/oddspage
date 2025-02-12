"use client";

import { useEffect, useState } from "react";
import Papa from "papaparse";

// Define the type for a CSV row based on your CSV columns.
interface CSVRow {
  Grade: string;
  Match_Date: string;
  Sport: string;
  League: string;
  Home_Team: string;
  Away_Team: string;
  Market: string;
  Selection: string;
  Pinnacle: string;
  Pinn_Limit: string;
  game_id: string;
}

// Extend CSVRow with fields for live odds, the API URL, flash effect, and an SSE subscription flag.
interface ExtendedCSVRow extends CSVRow {
  pinnacle_live?: number | null;
  api_url?: string;
  sseSubscribed?: boolean;
  flash?: boolean;
}

const ROW_LIMIT = 18; // Only process and display this many rows.

const LiveBetsPage = () => {
  const [rows, setRows] = useState<ExtendedCSVRow[]>([]);
  const [error, setError] = useState<string>("");
  // This flag ensures we only fetch initial odds for the displayed rows once.
  const [oddsFetched, setOddsFetched] = useState<boolean>(false);

  // 1. Load CSV data from the public folder.
  useEffect(() => {
    async function fetchCSV() {
      try {
        const response = await fetch("/live_bets_sample_feb11_2025.csv");
        const csvText = await response.text();
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            console.log("CSV results:", results.data);
            // Filter out rows with no game_id.
            const parsedBets: ExtendedCSVRow[] = (results.data as any[])
              .filter((row) => row.game_id && row.game_id.trim() !== "")
              .map((row) => ({
                Grade: row["Grade"] || "",
                Match_Date: row["Match_Date"] || "",
                Sport: row["Sport"] || "",
                League: row["League"] || "",
                Home_Team: row["Home_Team"] || "",
                Away_Team: row["Away_Team"] || "",
                Market: row["Market"] || "",
                Selection: row["Selection"] || "",
                Pinnacle: row["Pinnacle"] || "",
                Pinn_Limit: row["Pinn_Limit"] || "",
                game_id: row["game_id"] || "",
              }));
            setRows(parsedBets);
          },
          error: (err: any) => {
            console.error("Error parsing CSV:", err);
            setError("Error parsing CSV data.");
          },
        });
      } catch (err) {
        console.error("Error fetching CSV:", err);
        setError("Error fetching CSV data.");
      }
    }
    fetchCSV();
  }, []);

  // 2. For each displayed row, fetch initial odds via REST (only once).
  useEffect(() => {
    if (rows.length === 0 || oddsFetched) return;

    function updateRow(index: number, updatedFields: Partial<ExtendedCSVRow>) {
      setRows((prevRows) => {
        const newRows = [...prevRows];
        newRows[index] = { ...newRows[index], ...updatedFields };
        return newRows;
      });
    }

    rows.slice(0, ROW_LIMIT).forEach((row, i) => {
      async function fetchInitialOddsForRow() {
        try {
          const url = new URL("https://api.opticodds.com/api/v3/fixtures/odds");
          url.searchParams.append("key", "d39909fa-3f0d-481f-8791-93d4434f8605");
          url.searchParams.append("fixture_id", row.game_id);
          url.searchParams.append("market", row.Market);
          url.searchParams.append("sport", row.Sport);
          url.searchParams.append("sportsbook", "Pinnacle");
          const apiUrlString = url.toString();
          console.log("Fetching initial odds for row:", row, "URL:", apiUrlString);
          updateRow(i, { api_url: apiUrlString });
          const res = await fetch(apiUrlString);
          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
          }
          const json = await res.json();
          if (Array.isArray(json.data) && json.data.length > 0) {
            const fixture = json.data[0];
            const initialOdds = fixture.odds || [];
            // Use odds.name for matching (case-insensitive).
            const filteredOdds = initialOdds.filter(
              (odd: any) =>
                odd.name.trim().toLowerCase() === row.Selection.trim().toLowerCase()
            );
            console.log("Initial odds for row:", row, filteredOdds);
            if (filteredOdds.length > 0) {
              updateRow(i, { pinnacle_live: filteredOdds[0].price });
            } else {
              updateRow(i, { pinnacle_live: null });
            }
          } else {
            updateRow(i, { pinnacle_live: null });
          }
        } catch (err) {
          console.error("Error fetching initial odds for row:", row, err);
          updateRow(i, { pinnacle_live: null });
        }
      }
      fetchInitialOddsForRow();
    });
    setOddsFetched(true);
  }, [rows, oddsFetched]);

  // 3. For each displayed row, subscribe to SSE for live updates.
  useEffect(() => {
    if (rows.length === 0) return;

    function updateRow(index: number, updatedFields: Partial<ExtendedCSVRow>) {
      setRows((prevRows) => {
        const newRows = [...prevRows];
        newRows[index] = { ...newRows[index], ...updatedFields };
        return newRows;
      });
    }

    // Process only the displayed rows.
    rows.slice(0, ROW_LIMIT).forEach((row, i) => {
      // Only subscribe if not already done.
      if (row.sseSubscribed) return;

      function subscribeToRow() {
        // Dynamically build the base URL based on the sport in the CSV row.
        const baseUrl = `https://api.opticodds.com/api/v3/stream/${row.Sport.trim().toLowerCase()}/odds`;
        const params = new URLSearchParams();
        params.append("key", "d39909fa-3f0d-481f-8791-93d4434f8605");
        params.append("fixture_id", row.game_id);
        params.append("market", row.Market);
        params.append("sport", row.Sport);
        params.append("sportsbook", "Pinnacle");
        // Do NOT send a 'selection' parameter; filter client-side.
        params.append("accept", "text/event-stream");
        const streamUrl = `${baseUrl}?${params.toString()}`;
        console.log("Subscribing to SSE for row:", row, "URL:", streamUrl);
      
        const es = new EventSource(streamUrl);
      
        es.addEventListener("odds", (event: MessageEvent) => {
          try {
            const payload = JSON.parse(event.data);
            console.log("Received SSE odds for row:", row, payload);
            const updates = payload.data.data.filter(
              (odd: any) =>
                odd.name.trim().toLowerCase() === row.Selection.trim().toLowerCase()
            );
            if (updates.length > 0) {
              const newPrice = updates[0].price;
              if (newPrice !== row.pinnacle_live) {
                updateRow(i, { pinnacle_live: newPrice, flash: true });
                setTimeout(() => {
                  updateRow(i, { flash: false });
                }, 1000);
              }
            }
          } catch (err) {
            console.error("Error parsing SSE odds event for row:", row, err);
          }
        });
      
        es.onerror = (event) => {
          console.error("SSE error for row:", row, event);
          es.close();
          // (Optionally add reconnection logic here if needed.)
        };
      
        updateRow(i, { sseSubscribed: true });
      }
      subscribeToRow();
    });
  }, [rows]);

  return (
    <div>
      <h2>Live Bets Data (CSV) with Pinnacle (Live) Odds</h2>
      {error && <div style={{ color: "red", marginBottom: "1rem" }}>Error: {error}</div>}
      <table border={1} cellPadding={5} style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            <th>Grade</th>
            <th>Match Date</th>
            <th>Sport</th>
            <th>League</th>
            <th>Home Team</th>
            <th>Away Team</th>
            <th>Market</th>
            <th>Selection</th>
            <th>Static Pinnacle</th>
            <th>Pinn Limit</th>
            <th>Game ID</th>
            <th>API URL</th>
            <th>Pinnacle (Live)</th>
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, ROW_LIMIT).length > 0 ? (
            rows.slice(0, ROW_LIMIT).map((row, idx) => (
              <tr key={idx}>
                <td>{row.Grade}</td>
                <td>{row.Match_Date}</td>
                <td>{row.Sport}</td>
                <td>{row.League}</td>
                <td>{row.Home_Team}</td>
                <td>{row.Away_Team}</td>
                <td>{row.Market}</td>
                <td>{row.Selection}</td>
                <td>{row.Pinnacle}</td>
                <td>{row.Pinn_Limit}</td>
                <td>{row.game_id}</td>
                <td style={{ fontSize: "0.7em" }}>
                  {row.api_url ? (
                    <a href={row.api_url} target="_blank" rel="noopener noreferrer">
                      {row.api_url}
                    </a>
                  ) : (
                    ""
                  )}
                </td>
                <td
                  style={{
                    backgroundColor: row.flash ? "yellow" : "transparent",
                    transition: "background-color 0.5s ease",
                  }}
                >
                  {row.pinnacle_live === undefined
                    ? "Loading..."
                    : row.pinnacle_live === null
                    ? ""
                    : row.pinnacle_live}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={13}>No data loaded yet...</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default LiveBetsPage;
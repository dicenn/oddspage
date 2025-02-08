
import Head from "next/head"
import { Card } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { useState, useEffect, useMemo } from "react"
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem, CommandSeparator } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Check, ChevronsUpDown, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { databaseService, BetData } from "@/services/database"
import { oddsStreamService } from "@/services/oddsStream"
import { Badge } from "@/components/ui/badge"

export default function Home() {
  const [data, setData] = useState<BetData[]>([])
  const [filters, setFilters] = useState<Record<string, string[]>>({})
  const [columns, setColumns] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({})
  const [openPopover, setOpenPopover] = useState<string | null>(null)
  const [pinnacleOdds, setPinnacleOdds] = useState<Record<string, number>>({})
  const [streamStatus, setStreamStatus] = useState<"connecting" | "connected" | "error">("connecting")

  const uniqueValues = useMemo(() => {
    const values: Record<string, Set<string>> = {}
    columns.forEach(column => {
      values[column] = new Set(data.map(row => String(row[column])))
    })
    return values
  }, [data, columns])

  useEffect(() => {
    try {
      setLoading(true)
      setError(null)

      const unsubscribe = databaseService.subscribeToBets((betsData) => {
        if (betsData.length > 0) {
          const firstBet = betsData[0]
          const newColumns = [...Object.keys(firstBet).filter(key => key !== "id"), "Pinnacle"]
          setColumns(newColumns)
          setData(betsData)
          setFilters(prev => {
            const newFilters: Record<string, string[]> = {}
            newColumns.forEach(col => {
              newFilters[col] = prev[col] || []
            })
            return newFilters
          })
        }
        setLoading(false)
      })

      return () => {
        unsubscribe()
      }
    } catch (error) {
      setError("Failed to load data. Please try again later.")
      console.error("Error loading data:", error)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const subscriptions: Array<() => void> = []

    if (data.length > 0) {
      data.forEach((row) => {
        if (!row.sport || !row.game_id || !row.market || !row.selection) {
          console.warn("Missing required fields for odds stream:", row)
          return
        }

        const streamConfig = {
          sport: row.sport.toLowerCase(),
          gameId: row.game_id,
          market: row.market,
          selection: row.selection,
          onOddsUpdate: (price: number) => {
            setPinnacleOdds(prev => ({
              ...prev,
              [`${row.game_id}:${row.market}:${row.selection}`]: price
            }))
            setStreamStatus("connected")
          }
        }

        try {
          const unsubscribe = oddsStreamService.subscribeToOdds(streamConfig)
          subscriptions.push(unsubscribe)
        } catch (error) {
          console.error("Error subscribing to odds stream:", error)
          setStreamStatus("error")
        }
      })
    }

    return () => {
      subscriptions.forEach(unsubscribe => unsubscribe())
    }
  }, [data])

  useEffect(() => {
    if (data.length > 0 && columns.length > 0) {
      const calculateColumnWidth = (column: string) => {
        const headerLength = column.length
        const values = Array.from(uniqueValues[column] || [])
        const maxValueLength = Math.max(...values.map(v => String(v).length), headerLength)
        return Math.min(Math.max(maxValueLength * 8, 100), 400)
      }

      const widths = columns.reduce((acc, column) => {
        acc[column] = calculateColumnWidth(column)
        return acc
      }, {} as Record<string, number>)
      setColumnWidths(widths)
    }
  }, [data, columns, uniqueValues])

  const filteredData = data.filter(row => {
    return Object.entries(filters).every(([key, selectedValues]) => {
      if (!selectedValues || selectedValues.length === 0) return true
      return selectedValues.includes(String(row[key]))
    })
  })

  const getPinnacleOdds = (row: BetData) => {
    const key = `${row.game_id}:${row.market}:${row.selection}`
    const odds = pinnacleOdds[key]
    return odds !== undefined ? odds : (streamStatus === "connecting" ? "Connecting..." : "Waiting for odds...")
  }

  const toggleFilter = (column: string, value: string) => {
    setFilters(prev => {
      const currentValues = prev[column] || []
      const newValues = currentValues.includes(value)
        ? currentValues.filter(v => v !== value)
        : [...currentValues, value]
      return {
        ...prev,
        [column]: newValues
      }
    })
  }

  const toggleAllFilters = (column: string) => {
    setFilters(prev => {
      const currentValues = prev[column] || []
      const allValues = Array.from(uniqueValues[column] || [])
      const newValues = currentValues.length === allValues.length ? [] : allValues
      return {
        ...prev,
        [column]: newValues
      }
    })
  }

  const clearColumnFilter = (column: string) => {
    setFilters(prev => ({
      ...prev,
      [column]: []
    }))
  }

  const getFilterButtonText = (column: string) => {
    const selectedCount = filters[column]?.length || 0
    const totalCount = uniqueValues[column]?.size || 0
    if (selectedCount === 0) return `Filter ${column}...`
    if (selectedCount === totalCount) return "All selected"
    return `${selectedCount} of ${totalCount} selected`
  }

  return (
    <>
      <Head>
        <title>Live Bets Data Table</title>
        <meta name="description" content="Interactive data table for live betting data" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <main className="container mx-auto py-10 px-4">
        <Card className="p-6">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <h1 className="text-2xl font-bold">Live Bets Data</h1>
              <p className="text-muted-foreground">
                View and filter live betting data
              </p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {streamStatus === "error" && (
              <Alert variant="destructive">
                <AlertDescription>Failed to connect to odds stream. Odds may be unavailable.</AlertDescription>
              </Alert>
            )}

            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : (
              <div className="relative rounded-md border">
                <ScrollArea className="h-[600px] rounded-md">
                  <div className="min-w-max">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {columns.map(column => (
                            <TableHead 
                              key={column} 
                              style={{ width: `${columnWidths[column]}px`, minWidth: `${columnWidths[column]}px` }}
                            >
                              {column}
                            </TableHead>
                          ))}
                        </TableRow>
                        <TableRow>
                          {columns.map(column => (
                            <TableHead 
                              key={`filter-${column}`} 
                              style={{ width: `${columnWidths[column]}px`, minWidth: `${columnWidths[column]}px` }}
                            >
                              <div className="space-y-2">
                                <Popover 
                                  open={openPopover === column} 
                                  onOpenChange={(open) => setOpenPopover(open ? column : null)}
                                >
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="outline"
                                      role="combobox"
                                      className="w-full justify-between"
                                    >
                                      {getFilterButtonText(column)}
                                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent 
                                    className="w-full p-0" 
                                    style={{ width: `${columnWidths[column]}px` }}
                                    align="start"
                                  >
                                    <Command>
                                      <CommandInput placeholder={`Search ${column}...`} />
                                      <CommandEmpty>No value found.</CommandEmpty>
                                      <CommandGroup>
                                        <CommandItem
                                          onSelect={() => toggleAllFilters(column)}
                                          className="justify-between"
                                        >
                                          <span>Select All</span>
                                          <Check
                                            className={cn(
                                              "h-4 w-4",
                                              filters[column]?.length === uniqueValues[column]?.size
                                                ? "opacity-100"
                                                : "opacity-0"
                                            )}
                                          />
                                        </CommandItem>
                                        <CommandSeparator />
                                        {Array.from(uniqueValues[column] || []).map((value) => (
                                          <CommandItem
                                            key={value}
                                            onSelect={() => toggleFilter(column, value)}
                                            className="justify-between"
                                          >
                                            <span>{value}</span>
                                            <Check
                                              className={cn(
                                                "h-4 w-4",
                                                filters[column]?.includes(value) ? "opacity-100" : "opacity-0"
                                              )}
                                            />
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    </Command>
                                  </PopoverContent>
                                </Popover>
                                {filters[column]?.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {filters[column].map(value => (
                                      <Badge
                                        key={value}
                                        variant="secondary"
                                        className="max-w-[150px] truncate"
                                      >
                                        {value}
                                        <button
                                          className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                          onClick={() => toggleFilter(column, value)}
                                        >
                                          <X className="h-3 w-3" />
                                          <span className="sr-only">Remove</span>
                                        </button>
                                      </Badge>
                                    ))}
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 px-2 text-xs"
                                      onClick={() => clearColumnFilter(column)}
                                    >
                                      Clear
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredData.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={columns.length} className="text-center">
                              No data found
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredData.map((row, index) => (
                            <TableRow key={row.id || index}>
                              {columns.map(column => (
                                <TableCell 
                                  key={column}
                                  style={{ width: `${columnWidths[column]}px`, minWidth: `${columnWidths[column]}px` }}
                                >
                                  {column === "Pinnacle" ? 
                                    getPinnacleOdds(row) :
                                    String(row[column])}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </div>
            )}
          </div>
        </Card>
      </main>
    </>
  )
}

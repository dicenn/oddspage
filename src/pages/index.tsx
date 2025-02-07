
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
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"

export default function Home() {
  const [data, setData] = useState<any[]>([])
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [columns, setColumns] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({})
  const [openPopover, setOpenPopover] = useState<string | null>(null)

  const uniqueValues = useMemo(() => {
    const values: Record<string, Set<string>> = {}
    columns.forEach(column => {
      values[column] = new Set(data.map(row => row[column]))
    })
    return values
  }, [data, columns])

  const calculateColumnWidth = (column: string) => {
    const headerLength = column.length
    const values = Array.from(uniqueValues[column] || [])
    const maxValueLength = Math.max(...values.map(v => String(v).length), headerLength)
    return Math.min(Math.max(maxValueLength * 8, 100), 400) // Min 100px, Max 400px
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await fetch("/live-bets-small-sample-feb6-2025-m6tvogeh.csv")
        if (!response.ok) {
          throw new Error("Failed to load data")
        }
        const text = await response.text()
        
        const rows = text.split("\n").filter(row => row.trim())
        const headers = rows[0].split(",").map(header => header.trim())
        setColumns(headers)
        
        const parsedData = rows.slice(1).map(row => {
          const values = row.split(",").map(value => value.trim())
          return headers.reduce((obj, header, index) => {
            obj[header] = values[index] || ""
            return obj
          }, {} as Record<string, string>)
        })
        
        setData(parsedData)

        const widths = headers.reduce((acc, column) => {
          acc[column] = calculateColumnWidth(column)
          return acc
        }, {} as Record<string, number>)
        setColumnWidths(widths)
      } catch (error) {
        setError("Failed to load data. Please try again later.")
        console.error("Error loading CSV:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  useEffect(() => {
    if (data.length > 0 && columns.length > 0) {
      const widths = columns.reduce((acc, column) => {
        acc[column] = calculateColumnWidth(column)
        return acc
      }, {} as Record<string, number>)
      setColumnWidths(widths)
    }
  }, [data, columns, uniqueValues])

  const filteredData = data.filter(row => {
    return Object.entries(filters).every(([key, value]) => {
      if (!value) return true
      return row[key]?.toLowerCase().includes(value.toLowerCase())
    })
  })

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
                              <Popover open={openPopover === column} onOpenChange={(open) => setOpenPopover(open ? column : null)}>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    role="combobox"
                                    className="w-full justify-between"
                                  >
                                    {filters[column] || `Filter ${column}...`}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-full p-0" style={{ width: `${columnWidths[column]}px` }}>
                                  <Command>
                                    <CommandInput placeholder={`Search ${column}...`} />
                                    <CommandEmpty>No value found.</CommandEmpty>
                                    <CommandGroup>
                                      {Array.from(uniqueValues[column] || []).map((value) => (
                                        <CommandItem
                                          key={value}
                                          onSelect={() => {
                                            setFilters(prev => ({
                                              ...prev,
                                              [column]: value
                                            }))
                                            setOpenPopover(null)
                                          }}
                                        >
                                          <Check
                                            className={cn(
                                              "mr-2 h-4 w-4",
                                              filters[column] === value ? "opacity-100" : "opacity-0"
                                            )}
                                          />
                                          {value}
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </Command>
                                </PopoverContent>
                              </Popover>
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
                            <TableRow key={index}>
                              {columns.map(column => (
                                <TableCell 
                                  key={column}
                                  style={{ width: `${columnWidths[column]}px`, minWidth: `${columnWidths[column]}px` }}
                                >
                                  {row[column]}
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

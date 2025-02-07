
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
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { useState, useEffect } from "react"

export default function Home() {
  const [data, setData] = useState<any[]>([])
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [columns, setColumns] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
      } catch (error) {
        setError("Failed to load data. Please try again later.")
        console.error("Error loading CSV:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

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
                            <TableHead key={column} className="min-w-[200px]">
                              {column}
                            </TableHead>
                          ))}
                        </TableRow>
                        <TableRow>
                          {columns.map(column => (
                            <TableHead key={`filter-${column}`} className="min-w-[200px] py-2">
                              <Input
                                placeholder={`Filter ${column}...`}
                                onChange={e => setFilters(prev => ({
                                  ...prev,
                                  [column]: e.target.value
                                }))}
                                className="w-full"
                                size={32}
                              />
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
                                <TableCell key={column} className="min-w-[200px]">
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

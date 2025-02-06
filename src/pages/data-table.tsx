
import { useState, useEffect } from "react"
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

export default function DataTablePage() {
  const [data, setData] = useState<any[]>([])
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [columns, setColumns] = useState<string[]>([])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/live-bets-sample-feb6-2025-m6tv9988.csv")
        const text = await response.text()
        
        // Parse CSV data
        const rows = text.split("\n")
        const headers = rows[0].split(",")
        setColumns(headers)
        
        const parsedData = rows.slice(1).map(row => {
          const values = row.split(",")
          return headers.reduce((obj, header, index) => {
            obj[header] = values[index]
            return obj
          }, {} as Record<string, string>)
        })
        
        setData(parsedData)
      } catch (error) {
        console.error("Error loading CSV:", error)
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
    <div className="container mx-auto py-10">
      <Card className="p-6">
        <h1 className="text-2xl font-bold mb-6">Data Table</h1>
        <div className="grid grid-cols-4 gap-4 mb-6">
          {columns.map(column => (
            <Input
              key={column}
              placeholder={`Filter ${column}...`}
              onChange={e => setFilters(prev => ({
                ...prev,
                [column]: e.target.value
              }))}
              className="max-w-sm"
            />
          ))}
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map(column => (
                  <TableHead key={column}>{column}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((row, index) => (
                <TableRow key={index}>
                  {columns.map(column => (
                    <TableCell key={column}>{row[column]}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}

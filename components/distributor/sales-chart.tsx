"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

// Mock sales data
const salesData = [
  { month: "Jan", captured: 125000, commission: 3750 },
  { month: "Fev", captured: 150000, commission: 4500 },
  { month: "Mar", captured: 100000, commission: 3000 },
  { month: "Abr", captured: 175000, commission: 5250 },
  { month: "Mai", captured: 125000, commission: 3750 },
  { month: "Jun", captured: 200000, commission: 6000 },
]

export function SalesChart() {
  return (
    <div className="h-[400px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={salesData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="month" className="text-xs" />
          <YAxis
            className="text-xs"
            tickFormatter={(value) =>
              new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
                notation: "compact",
              }).format(value)
            }
          />
          <Tooltip
            formatter={(value: number, name: string) => [
              new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(value),
              name === "captured" ? "Captado" : "Comissão",
            ]}
            labelStyle={{ color: "hsl(var(--foreground))" }}
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
            }}
          />
          <Bar dataKey="captured" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          <Bar dataKey="commission" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

import { useKPIs, useSalesTrend, useTopItems } from '../../hooks/useDashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Banknote, ShoppingCart, Users, PackageOpen } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { format, parseISO } from 'date-fns'

export default function DashboardPage() {
  const { data: kpis } = useKPIs()
  const { data: trend = [] } = useSalesTrend()
  const { data: topItems = [] } = useTopItems()

  const formatMoney = (paisa: number) => `Rs ${(paisa / 100).toFixed(0)}`

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] w-full p-4 sm:p-6 lg:p-8 overflow-y-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of your business metrics.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sales Today</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMoney(kpis?.salesToday || 0)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receivables</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMoney(kpis?.receivables || 0)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cash on Hand</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{formatMoney(kpis?.cashOnHand || 0)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-warning">Low Stock Items</CardTitle>
            <PackageOpen className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis?.lowStockCount || 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Sales Trend (30 Days)</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                <XAxis 
                  dataKey="day" 
                  tickFormatter={(val) => format(parseISO(val), 'MMM dd')}
                  stroke="var(--color-text-muted)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke="var(--color-text-muted)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `Rs ${(val/100).toFixed(0)}`}
                />
                <Tooltip 
                  formatter={(val: any) => [formatMoney(val as number), 'Sales']}
                  labelFormatter={(val: any) => format(parseISO(val as string), 'MMM dd, yyyy')}
                />
                <Line type="monotone" dataKey="total" stroke="var(--color-primary)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Top 5 Items (30 Days)</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topItems} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="var(--color-border)" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  fontSize={12}
                  width={100}
                />
                <Tooltip formatter={(val: any) => [val, 'Units Sold']} cursor={{fill: 'var(--color-muted)'}} />
                <Bar dataKey="qty" fill="var(--color-accent)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

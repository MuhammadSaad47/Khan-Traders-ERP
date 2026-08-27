import { 
  useTopItems, 
  useKPIs, 
  useSalesTrend, 
  useExpenseBreakdown, 
  useRecentActivity
} from '../../hooks/useDashboard'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  PackageOpen,
  TrendingUp,
  BarChart3,
  Package,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Banknote,
  Wallet,
  PiggyBank,
  PieChart as PieChartIcon,
  Activity
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie
} from 'recharts'
import { format, parseISO } from 'date-fns'
import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { useItems } from '../../hooks/useCatalog'

type ModalKey = 'inStock' | 'lowStock' | 'outOfStock' | null

const THEME = '#3b82f6'
const EXPENSE_COLORS = ['#3b82f6', '#f43f5e', '#8b5cf6', '#10b981', '#f59e0b', '#06b6d4', '#ec4899']
const PRODUCT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

export default function DashboardPage() {
  const { data: topItems = [] } = useTopItems()
  const { data: allItems = [] } = useItems()
  const { data: kpis } = useKPIs()
  const { data: salesTrend = [] } = useSalesTrend()
  const { data: expenseBreakdown = [] } = useExpenseBreakdown()
  const { data: recentActivity = [] } = useRecentActivity()

  const [activeInventoryModal, setActiveInventoryModal] = useState<ModalKey>(null)

  const formatMoney = (paisa: number) => `Rs ${(paisa / 100).toLocaleString('en-PK', { maximumFractionDigits: 0 })}`

  const outOfStockItems = allItems.filter((item: any) => item.current_stock <= 0)
  const lowStockItems = allItems.filter(
    (item: any) => item.current_stock > 0 && item.current_stock <= item.low_stock_threshold
  )
  const inStockItems = allItems.filter(
    (item: any) => item.current_stock > item.low_stock_threshold
  )

  const stockTiles = [
    {
      key: null as ModalKey,
      label: 'Total Items',
      count: allItems.length,
      icon: Package,
      color: THEME,
      bg: 'bg-blue-50 dark:bg-blue-950/20',
      border: 'border-blue-200 dark:border-blue-900',
      ring: '',
      clickable: false,
    },
    {
      key: 'inStock' as ModalKey,
      label: 'In Stock',
      count: inStockItems.length,
      icon: CheckCircle2,
      color: '#10b981',
      bg: 'bg-emerald-50 dark:bg-emerald-950/20',
      border: 'border-emerald-200 dark:border-emerald-900',
      ring: 'focus-visible:ring-emerald-400',
      clickable: true,
    },
    {
      key: 'lowStock' as ModalKey,
      label: 'Low Stock',
      count: lowStockItems.length,
      icon: AlertTriangle,
      color: '#f59e0b',
      bg: 'bg-amber-50 dark:bg-amber-950/20',
      border: 'border-amber-200 dark:border-amber-900',
      ring: 'focus-visible:ring-amber-400',
      clickable: true,
    },
    {
      key: 'outOfStock' as ModalKey,
      label: 'Out of Stock',
      count: outOfStockItems.length,
      icon: XCircle,
      color: '#ef4444',
      bg: 'bg-red-50 dark:bg-red-950/20',
      border: 'border-red-200 dark:border-red-900',
      ring: 'focus-visible:ring-red-400',
      clickable: true,
    },
  ]

  const activeList =
    activeInventoryModal === 'inStock'
      ? inStockItems
      : activeInventoryModal === 'lowStock'
      ? lowStockItems
      : activeInventoryModal === 'outOfStock'
      ? outOfStockItems
      : []

  const activeMeta = stockTiles.find((t) => t.key === activeInventoryModal)

  return (
    <div className="flex flex-col h-screen w-full p-4 sm:p-6 lg:p-8 bg-background overflow-y-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1 text-sm">Your business at a glance</p>
      </div>

      {/* Inventory Overview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <PackageOpen className="w-5 h-5" style={{ color: THEME }} />
            Inventory Alerts
          </CardTitle>
          <CardDescription>Click a card to view actionable items</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {stockTiles.map((tile) => {
              const Icon = tile.icon
              return (
                <div
                  key={tile.label}
                  role={tile.clickable ? 'button' : undefined}
                  tabIndex={tile.clickable ? 0 : undefined}
                  onClick={tile.clickable ? () => setActiveInventoryModal(tile.key) : undefined}
                  onKeyDown={
                    tile.clickable
                      ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') setActiveInventoryModal(tile.key)
                        }
                      : undefined
                  }
                  className={[
                    'flex flex-col items-center justify-center gap-1.5 rounded-lg border p-4 transition-all',
                    tile.bg,
                    tile.border,
                    tile.clickable
                      ? `cursor-pointer hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 ${tile.ring}`
                      : '',
                  ].join(' ')}
                >
                  <Icon className="w-5 h-5" style={{ color: tile.color }} />
                  <div className="text-2xl font-bold" style={{ color: tile.color }}>
                    {tile.count}
                  </div>
                  <div className="text-xs font-medium text-muted-foreground">{tile.label}</div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* KPIs Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Sales Today</CardTitle>
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${THEME}1A` }}>
              <Banknote className="w-4 h-4" style={{ color: THEME }} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMoney(kpis?.salesToday || 0)}</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Profit Today</CardTitle>
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-emerald-50 dark:bg-emerald-950/20">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {formatMoney(kpis?.profitToday || 0)}
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Receivables</CardTitle>
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-amber-50 dark:bg-amber-950/20">
              <Wallet className="w-4 h-4 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMoney(kpis?.receivables || 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">Pending from customers</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Cash on Hand</CardTitle>
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-purple-50 dark:bg-purple-950/20">
              <PiggyBank className="w-4 h-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMoney(kpis?.cashOnHand || 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">Across all accounts</p>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Sales Trend & Expense Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="w-5 h-5" style={{ color: THEME }} />
              Sales Trend (30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesTrend} margin={{ top: 10, right: 30, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={THEME} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={THEME} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                <XAxis
                  dataKey="day"
                  tickFormatter={(val) => format(parseISO(val), 'dd MMM')}
                  stroke="var(--color-text-muted)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  interval={Math.floor(salesTrend.length / 6)}
                />
                <YAxis
                  stroke="var(--color-text-muted)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `Rs ${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(val: any) => [formatMoney(val as number), 'Sales']}
                  labelFormatter={(val: any) => format(parseISO(val as string), 'dd MMM yyyy')}
                  contentStyle={{ backgroundColor: 'var(--color-background)', border: '1px solid var(--color-border)' }}
                />
                <Area type="monotone" dataKey="total" stroke={THEME} strokeWidth={3} fill="url(#colorSales)" dot={false} activeDot={{ r: 6, fill: THEME, stroke: 'white', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PieChartIcon className="w-5 h-5 text-rose-500" />
              Expense Breakdown
            </CardTitle>
            <CardDescription>Last 30 days</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] flex flex-col items-center justify-center">
            {expenseBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expenseBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {expenseBreakdown.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={EXPENSE_COLORS[index % EXPENSE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any) => formatMoney(Number(value))}
                    contentStyle={{ backgroundColor: 'var(--color-background)', border: '1px solid var(--color-border)', borderRadius: '8px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-muted-foreground flex flex-col items-center">
                <PieChartIcon className="w-8 h-8 opacity-20 mb-2" />
                <span>No expenses recorded</span>
              </div>
            )}
            
            {/* Custom Legend */}
            {expenseBreakdown.length > 0 && (
              <div className="w-full mt-4 flex flex-wrap justify-center gap-2 text-xs">
                {expenseBreakdown.map((entry, index) => (
                  <div key={entry.name} className="flex items-center gap-1.5">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: EXPENSE_COLORS[index % EXPENSE_COLORS.length] }} 
                    />
                    <span className="truncate max-w-[80px]">{entry.name}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Top Products & Overdue Balances */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="w-5 h-5 text-emerald-600" />
              Top 5 Products
            </CardTitle>
            <CardDescription>By volume (last 30 days)</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topItems} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 90 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="var(--color-border)" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} fontSize={12} width={85} />
                <Tooltip
                  formatter={(val: any) => [val, 'Units Sold']}
                  cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
                  contentStyle={{ backgroundColor: 'var(--color-background)', border: '1px solid var(--color-border)' }}
                />
                <Bar dataKey="qty" radius={[0, 4, 4, 0]} barSize={24}>
                  {topItems.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PRODUCT_COLORS[index % PRODUCT_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="w-5 h-5 text-blue-500" />
              Recent Activity
            </CardTitle>
            <CardDescription>Latest system actions</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] overflow-y-auto pr-2">
            {recentActivity.length > 0 ? (
              <div className="space-y-3">
                {recentActivity.map((log: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-3 border rounded-lg bg-slate-50/50 dark:bg-slate-900/10 border-slate-100 dark:border-slate-800">
                    <div>
                      <div className="font-medium text-sm flex gap-1.5 items-center">
                        <span className="capitalize">{log.action}</span>
                        <span className="text-muted-foreground capitalize">{log.entity.replace('_', ' ')}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        By {log.user}
                      </div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      {format(new Date(log.time), 'dd MMM, hh:mm a')}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                <CheckCircle2 className="w-12 h-12 text-blue-500 opacity-20 mb-3" />
                <p>No recent activity</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>


      {/* Single reusable inventory modal, themed with the brand blue */}
      <Dialog open={activeInventoryModal !== null} onOpenChange={(open) => !open && setActiveInventoryModal(null)}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden max-h-[90vh]">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle className="flex items-center gap-3">
              <span
                className="flex items-center justify-center w-9 h-9 rounded-full"
                style={{ backgroundColor: `${activeMeta?.color}1A` }}
              >
                {activeMeta && <activeMeta.icon className="w-5 h-5" style={{ color: activeMeta.color }} />}
              </span>
              <span className="flex-1">{activeMeta?.label}</span>
              <Badge
                className="font-semibold"
                style={{ backgroundColor: `${THEME}1A`, color: THEME }}
              >
                {activeList.length} {activeList.length === 1 ? 'item' : 'items'}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="max-h-[500px] overflow-y-auto px-6 py-4">
            {activeList.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <PackageOpen className="w-12 h-12 mx-auto opacity-20 mb-3" />
                <p>Nothing here right now.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {activeList.map((item: any) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 border rounded-lg transition-colors hover:bg-muted/30"
                    style={{ borderLeft: `3px solid ${activeMeta?.color}` }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{item.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {[item.size, item.packaging].filter(Boolean).join(' • ') || 'Standard'}
                      </div>
                    </div>

                    {activeInventoryModal === 'inStock' && (
                      <div className="text-right">
                        <div className="text-sm font-bold" style={{ color: activeMeta?.color }}>
                          {item.current_stock} Ctns
                        </div>
                        <div className="text-xs text-muted-foreground">Threshold: {item.low_stock_threshold}</div>
                      </div>
                    )}

                    {activeInventoryModal === 'lowStock' && (
                      <div className="flex items-center gap-2">
                        <div className="text-sm text-right">
                          <span className="font-bold" style={{ color: activeMeta?.color }}>
                            {item.current_stock}
                          </span>
                          <span className="text-muted-foreground"> / {item.low_stock_threshold} Ctns</span>
                        </div>
                        <Badge style={{ backgroundColor: `${activeMeta?.color}1A`, color: activeMeta?.color }}>
                          {Math.round((item.current_stock / item.low_stock_threshold) * 100)}%
                        </Badge>
                      </div>
                    )}

                    {activeInventoryModal === 'outOfStock' && (
                      <div className="text-right">
                        <div className="text-sm font-bold" style={{ color: activeMeta?.color }}>
                          0 Ctns
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
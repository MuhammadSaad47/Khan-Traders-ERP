import { useState } from 'react'
import { 
  useComprehensiveReport, 
  useStockValuation, 
  usePartyBalancesSummary 
} from '../../hooks/useReports'
import { downloadCSV } from '../../utils/export'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { 
  Calendar as CalendarIcon, 
  FileSpreadsheet, 
  Printer, 
  DollarSign, 
  ShoppingBag, 
  Layers, 
  PieChart, 
  Store,
  Truck,
  Building2,
  CalendarDays
} from 'lucide-react'
import { 
  format, 
  subDays, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  subMonths 
} from 'date-fns'

type DatePreset = 'today' | 'yesterday' | 'this_week' | 'this_month' | 'last_month' | 'custom'
type ActiveTab = 'pnl' | 'sales' | 'parties' | 'inventory'

export default function ReportsPage() {
  const [preset, setPreset] = useState<DatePreset>('this_month')
  const [activeTab, setActiveTab] = useState<ActiveTab>('pnl')

  const getDateRangeForPreset = (p: DatePreset) => {
    const now = new Date()
    switch (p) {
      case 'today':
        return { from: format(now, 'yyyy-MM-dd'), to: format(now, 'yyyy-MM-dd') }
      case 'yesterday': {
        const y = subDays(now, 1)
        return { from: format(y, 'yyyy-MM-dd'), to: format(y, 'yyyy-MM-dd') }
      }
      case 'this_week':
        return { from: format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'), to: format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd') }
      case 'this_month':
        return { from: format(startOfMonth(now), 'yyyy-MM-dd'), to: format(endOfMonth(now), 'yyyy-MM-dd') }
      case 'last_month': {
        const lm = subMonths(now, 1)
        return { from: format(startOfMonth(lm), 'yyyy-MM-dd'), to: format(endOfMonth(lm), 'yyyy-MM-dd') }
      }
      default:
        return { from: format(subDays(now, 30), 'yyyy-MM-dd'), to: format(now, 'yyyy-MM-dd') }
    }
  }

  const [dateRange, setDateRange] = useState(getDateRangeForPreset('this_month'))

  const handlePresetChange = (p: DatePreset) => {
    setPreset(p)
    if (p !== 'custom') {
      setDateRange(getDateRangeForPreset(p))
    }
  }

  const { data: report, isLoading: isReportLoading } = useComprehensiveReport(dateRange.from, dateRange.to)
  const { data: valuation, isLoading: isValuationLoading } = useStockValuation()
  const { data: partySummary, isLoading: isPartySummaryLoading } = usePartyBalancesSummary()

  const formatMoney = (paisa: number) => {
    const val = Math.abs(paisa || 0) / 100
    const formatted = val.toLocaleString('en-PK', { maximumFractionDigits: 0 })
    return paisa < 0 ? `-Rs ${formatted}` : `Rs ${formatted}`
  }



  const pnl = report?.pnl || { revenue: 0, cogs: 0, grossProfit: 0, grossMargin: 0, expenses: 0, expenseBreakdown: [], netProfit: 0, netMargin: 0 }
  const sales = report?.sales || { salesCount: 0, totalPaid: 0, creditAmount: 0, totalItemsSold: 0, channelBreakdown: [], topItems: [] }
  const purchases = report?.purchases || { purchasesCount: 0, totalPurchases: 0, purchasesPaid: 0, purchasesUnpaid: 0 }

  return (
    <div className="flex flex-col min-h-[calc(100vh-3.5rem)] w-full p-4 sm:p-6 lg:p-8 space-y-6 bg-background print:p-0 print:bg-white">
      
      {/* Header & Date Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Financial & Operational Reports</h1>
          <p className="text-muted-foreground mt-1">Structured accounting statements, sales breakdowns, and party ledgers.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Preset Buttons */}
          <div className="flex items-center bg-muted/30 p-1 rounded-xl border border-border">
            {(['today', 'yesterday', 'this_week', 'this_month', 'last_month', 'custom'] as DatePreset[]).map((p) => (
              <Button
                key={p}
                variant={preset === p ? "default" : "ghost"}
                size="sm"
                className="h-8 text-xs capitalize rounded-lg px-2.5 font-medium"
                onClick={() => handlePresetChange(p)}
              >
                {p.replace('_', ' ')}
              </Button>
            ))}
          </div>

          {/* Custom Date Pickers */}
          {preset === 'custom' && (
            <div className="flex items-center gap-2 bg-card p-1.5 rounded-xl border border-border text-xs font-medium">
              <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground ml-1" />
              <input 
                type="date" 
                className="bg-transparent focus:outline-none"
                value={dateRange.from}
                onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
              />
              <span className="text-muted-foreground">to</span>
              <input 
                type="date" 
                className="bg-transparent focus:outline-none"
                value={dateRange.to}
                onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
              />
            </div>
          )}

          <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5 h-9 text-xs">
            <Printer className="w-3.5 h-3.5" /> Print Statement
          </Button>
        </div>
      </div>

      {/* Date & Period Indicator */}
      <div className="flex items-center justify-between bg-muted/20 px-4 py-2 rounded-xl border border-border text-xs font-medium">
        <div className="flex items-center gap-2 text-foreground">
          <CalendarDays className="w-4 h-4 text-primary" />
          <span>Statement Period: <strong>{format(new Date(dateRange.from), 'MMM d, yyyy')}</strong> — <strong>{format(new Date(dateRange.to), 'MMM d, yyyy')}</strong></span>
        </div>
        <Badge variant="outline" className="capitalize text-[11px] font-semibold">
          {preset.replace('_', ' ')}
        </Badge>
      </div>

      {/* Clean Tabbed Navigation */}
      <div className="flex items-center gap-2 border-b border-border pb-1 print:hidden">
        <button
          onClick={() => setActiveTab('pnl')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'pnl' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <DollarSign className="w-4 h-4" /> Income Statement (P&L)
        </button>

        <button
          onClick={() => setActiveTab('sales')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'sales' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <ShoppingBag className="w-4 h-4" /> Sales & Products Breakdown
        </button>

        <button
          onClick={() => setActiveTab('parties')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'parties' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Layers className="w-4 h-4" /> Receivables & Payables (Parties)
        </button>

        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'inventory' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <PieChart className="w-4 h-4" /> Stock Valuation
        </button>
      </div>

      {/* TAB 1: FINANCIAL INCOME STATEMENT (P&L) */}
      {activeTab === 'pnl' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card className="border-border/60 bg-card shadow-sm">
              <CardHeader className="pb-1">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Sales Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                  {isReportLoading ? '...' : formatMoney(pnl.revenue)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{isReportLoading ? '-' : sales.salesCount} Invoices Issued</p>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card shadow-sm">
              <CardHeader className="pb-1">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cost of Goods (COGS)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-extrabold text-slate-700 dark:text-slate-300">
                  {isReportLoading ? '...' : formatMoney(pnl.cogs)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{isReportLoading ? '-' : sales.totalItemsSold} Items Cost</p>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card shadow-sm">
              <CardHeader className="pb-1 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Gross Profit</CardTitle>
                <Badge className="bg-primary/10 text-primary text-[10px] font-bold">{pnl.grossMargin}% Margin</Badge>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-extrabold text-primary">
                  {isReportLoading ? '...' : formatMoney(pnl.grossProfit)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Revenue minus COGS</p>
              </CardContent>
            </Card>

            <Card className={`border-border/60 bg-card shadow-sm ${pnl.netProfit >= 0 ? 'border-emerald-500/30' : 'border-rose-500/30'}`}>
              <CardHeader className="pb-1 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Net Operating Profit</CardTitle>
                <Badge className={pnl.netProfit >= 0 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}>
                  {pnl.netMargin}% Margin
                </Badge>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-extrabold ${pnl.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {isReportLoading ? '...' : formatMoney(pnl.netProfit)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">After {isReportLoading ? '...' : formatMoney(pnl.expenses)} expenses</p>
              </CardContent>
            </Card>
          </div>

          {/* Structured Statement Table */}
          <Card className="border-border/60 bg-card shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/30 border-b pb-3">
              <CardTitle className="text-base font-bold flex items-center justify-between">
                <span>Formal Profit & Loss Statement</span>
                <div className="flex gap-2 items-center">
                  <span className="text-xs font-medium text-muted-foreground mr-2">Values in Rs</span>
                  <Button variant="outline" size="sm" className="gap-2 text-xs h-7" onClick={() => {
                    const data = [
                      { Category: 'Revenue', Amount: pnl.revenue },
                      { Category: 'COGS', Amount: -pnl.cogs },
                      { Category: 'Gross Profit', Amount: pnl.grossProfit },
                      ...pnl.expenseBreakdown.map((e: any) => ({ Category: e.category + ' Expense', Amount: -e.amount })),
                      { Category: 'Net Profit', Amount: pnl.netProfit }
                    ];
                    downloadCSV(data, 'profit-and-loss.csv');
                  }}>
                    <FileSpreadsheet className="w-3.5 h-3.5" /> Export P&L
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableBody>
                  <TableRow className="bg-muted/20 font-bold">
                    <TableCell colSpan={2} className="text-sm">1. OPERATING REVENUE</TableCell>
                    <TableCell className="text-right text-sm font-mono">{formatMoney(pnl.revenue)}</TableCell>
                  </TableRow>
                  {sales.channelBreakdown.map((ch: any, i: number) => (
                    <TableRow key={i} className="text-xs text-muted-foreground">
                      <TableCell className="pl-8 capitalize">{ch.channel} Sales Revenue</TableCell>
                      <TableCell>{ch.count} invoices</TableCell>
                      <TableCell className="text-right font-mono text-foreground">{formatMoney(ch.amount)}</TableCell>
                    </TableRow>
                  ))}

                  <TableRow className="bg-muted/20 font-bold border-t">
                    <TableCell colSpan={2} className="text-sm">2. COST OF GOODS SOLD (COGS)</TableCell>
                    <TableCell className="text-right text-sm font-mono text-rose-600 dark:text-rose-400">- {formatMoney(pnl.cogs)}</TableCell>
                  </TableRow>

                  <TableRow className="bg-primary/5 font-extrabold border-t border-b text-primary">
                    <TableCell colSpan={2} className="text-base">GROSS PROFIT</TableCell>
                    <TableCell className="text-right text-base font-mono">{formatMoney(pnl.grossProfit)}</TableCell>
                  </TableRow>

                  <TableRow className="bg-muted/20 font-bold border-t">
                    <TableCell colSpan={2} className="text-sm">3. OPERATING EXPENSES</TableCell>
                    <TableCell className="text-right text-sm font-mono text-rose-600 dark:text-rose-400">- {formatMoney(pnl.expenses)}</TableCell>
                  </TableRow>
                  {pnl.expenseBreakdown.length === 0 ? (
                    <TableRow className="text-xs text-muted-foreground">
                      <TableCell colSpan={3} className="pl-8 py-2">No expenses logged for this period.</TableCell>
                    </TableRow>
                  ) : (
                    pnl.expenseBreakdown.map((exp: any, i: number) => (
                      <TableRow key={i} className="text-xs text-muted-foreground">
                        <TableCell colSpan={2} className="pl-8">{exp.category} Expense</TableCell>
                        <TableCell className="text-right font-mono text-foreground">{formatMoney(exp.amount)}</TableCell>
                      </TableRow>
                    ))
                  )}

                  <TableRow className={`font-extrabold border-t text-lg ${pnl.netProfit >= 0 ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-700 dark:text-rose-400'}`}>
                    <TableCell colSpan={2}>NET OPERATING PROFIT / (LOSS)</TableCell>
                    <TableCell className="text-right font-mono">{formatMoney(pnl.netProfit)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 2: SALES & PRODUCTS BREAKDOWN */}
      {activeTab === 'sales' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-card p-4 rounded-xl border border-border/60 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Counter Sales</p>
                <p className="font-bold text-xl mt-0.5">{formatMoney(sales.channelBreakdown.find((c: any) => c.channel === 'counter')?.amount || 0)}</p>
              </div>
              <Store className="w-6 h-6 text-blue-500 opacity-80" />
            </div>

            <div className="bg-card p-4 rounded-xl border border-border/60 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Van Distribution Sales</p>
                <p className="font-bold text-xl mt-0.5">{formatMoney(sales.channelBreakdown.find((c: any) => c.channel === 'van')?.amount || 0)}</p>
              </div>
              <Truck className="w-6 h-6 text-purple-500 opacity-80" />
            </div>

            <div className="bg-card p-4 rounded-xl border border-border/60 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Wholesale Sales</p>
                <p className="font-bold text-xl mt-0.5">{formatMoney(sales.channelBreakdown.find((c: any) => c.channel === 'wholesale')?.amount || 0)}</p>
              </div>
              <Building2 className="w-6 h-6 text-emerald-500 opacity-80" />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold">Top Selling Products Statement</h3>
              <Button variant="outline" size="sm" className="gap-2 text-xs" onClick={() => downloadCSV(sales.topItems, 'top-selling-products.csv')}>
                <FileSpreadsheet className="w-3.5 h-3.5" /> Export CSV
              </Button>
            </div>

            <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider">Product Name</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider">Size / Variant</TableHead>
                    <TableHead className="text-center text-[11px] font-bold uppercase tracking-wider">Qty Sold</TableHead>
                    <TableHead className="text-right text-[11px] font-bold uppercase tracking-wider">Total Revenue</TableHead>
                    <TableHead className="text-right text-[11px] font-bold uppercase tracking-wider">Est. Profit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.topItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                        No product sales recorded for this period.
                      </TableCell>
                    </TableRow>
                  ) : (
                    sales.topItems.map((item: any) => (
                      <TableRow key={item.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="font-bold">{item.name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{item.variant || item.size || 'Standard'}</TableCell>
                        <TableCell className="text-center font-semibold">{item.qtySold}</TableCell>
                        <TableCell className="text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                          {formatMoney(item.revenue)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-primary tabular-nums">
                          {formatMoney(item.profit)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: RECEIVABLES & PAYABLES (PARTY LEDGERS) */}
      {activeTab === 'parties' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card className="border-border/60 bg-card shadow-sm">
              <CardHeader className="pb-1">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Customer Receivables</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">
                  {isPartySummaryLoading ? '...' : formatMoney(partySummary?.totalReceivables || 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Total owed by customers</p>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card shadow-sm">
              <CardHeader className="pb-1">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Supplier Payables</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-extrabold text-rose-600 dark:text-rose-400">
                  {isPartySummaryLoading ? '...' : formatMoney(partySummary?.totalPayables || 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Total owed to suppliers</p>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card shadow-sm">
              <CardHeader className="pb-1">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Period Purchases</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">
                  {isReportLoading ? '...' : formatMoney(purchases.totalPurchases)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{isReportLoading ? '-' : purchases.purchasesCount} Purchase Invoices</p>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card shadow-sm">
              <CardHeader className="pb-1">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Empty Cartons Out</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">
                  {isPartySummaryLoading ? '...' : (partySummary?.totalCartonsOutstanding || 0)} Cartons
                </div>
                <p className="text-xs text-muted-foreground mt-1">Cartons with customers</p>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold">Customer Aging Receivables Statement</h3>
              {partySummary && (
                <Button variant="outline" size="sm" className="gap-2 text-xs" onClick={() => downloadCSV(partySummary.customerAging, 'customer-aging.csv')}>
                  <FileSpreadsheet className="w-3.5 h-3.5" /> Export Receivables CSV
                </Button>
              )}
            </div>

            <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider">Customer Name</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider">Phone</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider">Overdue Days</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider">Aging Bucket</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider">Empty Ctns</TableHead>
                    <TableHead className="text-right text-[11px] font-bold uppercase tracking-wider">Balance Owed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!partySummary || partySummary.customerAging.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        No customer overdue receivables found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    partySummary.customerAging.map((cust: any) => (
                      <TableRow key={cust.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="font-bold">{cust.name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{cust.phone || '-'}</TableCell>
                        <TableCell className="text-xs font-mono font-medium">{cust.daysOverdue} days</TableCell>
                        <TableCell>
                          <Badge className={
                            cust.bucket === '>30 Days' ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/20' : 
                            cust.bucket === '16-30 Days' ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20' : 
                            'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                          }>
                            {cust.bucket}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-semibold">{cust.ctnBalance} ctns</TableCell>
                        <TableCell className="text-right font-mono font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                          {formatMoney(cust.balance)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: WAREHOUSE STOCK VALUATION */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <Card className="border-border/60 bg-card shadow-sm">
              <CardHeader className="pb-1">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Stock Cost Value</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-extrabold text-foreground">{isValuationLoading ? '...' : formatMoney(valuation?.costValue || 0)}</div>
                <p className="text-xs text-muted-foreground mt-1">Based on purchase cost prices</p>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card shadow-sm">
              <CardHeader className="pb-1">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Stock Retail Value</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-extrabold text-foreground">{isValuationLoading ? '...' : formatMoney(valuation?.retailValue || 0)}</div>
                <p className="text-xs text-muted-foreground mt-1">Based on retail selling prices</p>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card shadow-sm">
              <CardHeader className="pb-1">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Potential Gross Margin</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{isValuationLoading ? '...' : formatMoney(valuation?.potentialProfit || 0)}</div>
                <p className="text-xs text-muted-foreground mt-1">Profit if all inventory is sold</p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}

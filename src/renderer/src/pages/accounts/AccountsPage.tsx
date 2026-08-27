import { format } from 'date-fns'
import { useState } from 'react'
import { 
  Wallet, 
  ArrowRightLeft, 
  Landmark, 
  PiggyBank, 
  Plus, 
  Search, 
  ArrowUpRight, 
  ArrowDownLeft, 
  FileText, 
  Smartphone,
  ChevronLeft,
  ChevronRight,
  RefreshCcw,
  X,
  TrendingUp,
  TrendingDown,
  CalendarDays,
  Pencil,
  Trash2
} from 'lucide-react'
import { useAccounts, useAccountTransactions, useTransferFunds, useCreateAccount, useAddCapital, useWithdrawCapital, useDeleteAccountTransaction, useUpdateAccountTransaction } from '../../hooks/useAccounts'
// useAuthStore omitted
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { numberToWords } from '../../lib/numberToWords'
import { useToast } from '@/hooks/use-toast'

export default function AccountsPage() {
  const { data: accounts = [], isLoading: isLoadingAccounts } = useAccounts()
  const transferFunds = useTransferFunds()
  const createAccount = useCreateAccount()
  const addCapital = useAddCapital()
  const withdrawCapital = useWithdrawCapital()
  const deleteTransaction = useDeleteAccountTransaction()
  const updateTransaction = useUpdateAccountTransaction()
  const { toast } = useToast()

  // Modal States
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false)
  const [isCreateAccountOpen, setIsCreateAccountOpen] = useState(false)
  const [isCapitalInvestOpen, setIsCapitalInvestOpen] = useState(false)
  const [isCapitalWithdrawOpen, setIsCapitalWithdrawOpen] = useState(false)
  const [selectedLedgerAccount, setSelectedLedgerAccount] = useState<any | null>(null)

  // Edit Transaction Modal State
  const [editTx, setEditTx] = useState<any | null>(null)

  const [deleteConfirm, setDeleteConfirm] = useState<{open: boolean, tx: any, message: string} | null>(null)
  const [editTxAmount, setEditTxAmount] = useState('')
  const [editTxDesc, setEditTxDesc] = useState('')
  const [editTxDate, setEditTxDate] = useState('')

  // Transfer Form State
  const [fromAccount, setFromAccount] = useState<number | ''>('')
  const [toAccount, setToAccount] = useState<number | ''>('')
  const [transferAmount, setTransferAmount] = useState('')
  const [transferDesc, setTransferDesc] = useState('')
  const [transferDate, setTransferDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'))

  // Capital Investment Form State
  const [investAccount, setInvestAccount] = useState<number | ''>('')
  const [investAmount, setInvestAmount] = useState('')
  const [investDesc, setInvestDesc] = useState('')
  const [investDate, setInvestDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'))

  // Capital Withdrawal Form State
  const [withdrawAccount, setWithdrawAccount] = useState<number | ''>('')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawDesc, setWithdrawDesc] = useState('')
  const [withdrawDate, setWithdrawDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'))

  // Create Account Form State
  const [newAccName, setNewAccName] = useState('')
  const [newAccType, setNewAccType] = useState<'cash' | 'bank' | 'mobile_wallet' | 'other'>('bank')
  const [newAccOpening, setNewAccOpening] = useState('')

  // Global Cash Book Filters & Pagination
  const [page, setPage] = useState(1)
  const limit = 25
  const [filterAccountId, setFilterAccountId] = useState<number | ''>('')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterRefType, setFilterRefType] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState<string>('')

  // Individual Ledger Modal Filters
  const [ledgerPage, setLedgerPage] = useState(1)

  // Fetch Global Cash Book Transactions
  const { data: cashBookData, isLoading: isLoadingCashBook, refetch: refetchCashBook } = useAccountTransactions(
    filterAccountId ? Number(filterAccountId) : null,
    page,
    limit,
    {
      type: filterType,
      reference_type: filterRefType,
      search: searchTerm
    }
  )

  // Fetch Individual Account Ledger Transactions
  const { data: ledgerData, isLoading: isLoadingLedger } = useAccountTransactions(
    selectedLedgerAccount?.id || null,
    ledgerPage,
    50
  )

  const formatMoney = (paisa: number) => {
    const val = Math.abs(paisa || 0) / 100
    const formatted = val.toLocaleString('en-PK', { maximumFractionDigits: 0 })
    return paisa < 0 ? `-Rs ${formatted}` : `Rs ${formatted}`
  }

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fromAccount || !toAccount || !transferAmount) return

    try {
      await transferFunds.mutateAsync({
        from_account_id: Number(fromAccount),
        to_account_id: Number(toAccount),
        amount: Number(transferAmount) * 100,
        date: transferDate + 'T12:00:00.000Z',
        description: transferDesc
      })
      setIsTransferModalOpen(false)
      setFromAccount('')
      setToAccount('')
      setTransferAmount('')
      setTransferDesc('')
      setTransferDate(format(new Date(), 'yyyy-MM-dd'))
      toast({ title: 'Success', description: 'Funds transferred successfully' })
    } catch (error: any) {
      console.error(error)
      toast({ title: 'Error', description: error.message || 'Transfer failed', variant: 'destructive' })
    }
  }

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newAccName.trim()) return

    try {
      await createAccount.mutateAsync({
        name: newAccName.trim(),
        type: newAccType,
        opening_balance: Number(newAccOpening || 0) * 100
      })
      setIsCreateAccountOpen(false)
      setNewAccName('')
      setNewAccType('bank')
      setNewAccOpening('')
      toast({ title: 'Success', description: 'Account created successfully' })
    } catch (error: any) {
      console.error(error)
      toast({ title: 'Error', description: error.message || 'Failed to create account', variant: 'destructive' })
    }
  }

  const handleCapitalInvest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!investAccount || !investAmount) return

    try {
      await addCapital.mutateAsync({
        account_id: Number(investAccount),
        amount: Number(investAmount) * 100,
        date: investDate + 'T12:00:00.000Z',
        description: investDesc || 'Capital Investment by Owner'
      })
      setIsCapitalInvestOpen(false)
      setInvestAccount('')
      setInvestAmount('')
      setInvestDesc('')
      setInvestDate(format(new Date(), 'yyyy-MM-dd'))
      toast({ title: 'Success', description: 'Capital investment added successfully' })
    } catch (error: any) {
      console.error(error)
      toast({ title: 'Error', description: error.message || 'Investment failed', variant: 'destructive' })
    }
  }

  const handleCapitalWithdraw = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!withdrawAccount || !withdrawAmount) return

    try {
      await withdrawCapital.mutateAsync({
        account_id: Number(withdrawAccount),
        amount: Number(withdrawAmount) * 100,
        date: withdrawDate + 'T12:00:00.000Z',
        description: withdrawDesc || 'Capital Withdrawal by Owner'
      })
      setIsCapitalWithdrawOpen(false)
      setWithdrawAccount('')
      setWithdrawAmount('')
      setWithdrawDesc('')
      setWithdrawDate(format(new Date(), 'yyyy-MM-dd'))
      toast({ title: 'Success', description: 'Capital withdrawn successfully' })
    } catch (error: any) {
      console.error(error)
      toast({ title: 'Error', description: error.message || 'Withdrawal failed', variant: 'destructive' })
    }
  }

  const handleOpenEditTx = (tx: any) => {
    setEditTx(tx)
    setEditTxAmount(((tx.amount || 0) / 100).toString())
    setEditTxDesc(tx.description || '')
    setEditTxDate(tx.date ? format(new Date(tx.date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'))
  }

  const handleSaveEditTx = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editTx) return
    try {
      await updateTransaction.mutateAsync({
        transactionId: editTx.id,
        data: {
          amount: Math.round(Number(editTxAmount) * 100),
          description: editTxDesc,
          date: editTxDate + 'T12:00:00.000Z'
        }
      })
      setEditTx(null)
      toast({ title: 'Success', description: 'Transaction updated successfully' })
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Update failed', variant: 'destructive' })
    }
  }

  const handleDeleteTx = async (tx: any) => {
    let warningMsg = `Are you sure you want to delete this transaction of Rs ${((tx.amount || 0) / 100).toLocaleString()}?`
    
    if (tx.reference_type === 'sale') {
      warningMsg = `⚠️ WARNING: This is a cash transaction for Sale ${tx.description || ''}. Deleting this will completely VOID the entire Sale invoice and return items to stock. Are you sure?`
    } else if (tx.reference_type === 'purchase') {
      warningMsg = `⚠️ WARNING: This is a cash transaction for Purchase ${tx.description || ''}. Deleting this will completely VOID the entire Purchase invoice and remove items from stock. Are you sure?`
    } else if (tx.reference_type === 'payment') {
      warningMsg = `⚠️ WARNING: This is a Payment record. Deleting this will reverse the payment, un-pay any linked invoices, and update the party's balance. Are you sure?`
    } else if (tx.reference_type === 'expense') {
      warningMsg = `Are you sure you want to delete this Expense? The amount will be refunded to your account.`
    } else {
      const label = tx.reference_type === 'capital' ? 'Capital Investment' : tx.reference_type === 'withdrawal' ? 'Capital Withdrawal' : 'Transfer'
      warningMsg = `Are you sure you want to delete this ${label}? This will reverse the account balance. This action cannot be undone.`
    }

    setDeleteConfirm({ open: true, tx, message: warningMsg })
  }

  const confirmDeleteTx = async () => {
    if (!deleteConfirm?.tx) return
    try {
      await deleteTransaction.mutateAsync(deleteConfirm.tx.id)
      toast({ title: 'Deleted', description: `Transaction deleted successfully.` })
      setDeleteConfirm(null)
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Delete failed', variant: 'destructive' })
    }
  }

  const totalBalance = accounts.reduce((sum: number, acc: any) => sum + (acc.current_balance || 0), 0)
  const transactionsList = cashBookData?.transactions || []
  const totalRecords = cashBookData?.total || 0
  const totalCredits = cashBookData?.totalCredits || 0
  const totalDebits = cashBookData?.totalDebits || 0
  const totalPages = Math.ceil(totalRecords / limit) || 1

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'cash': return <Wallet className="w-4 h-4 text-emerald-500" />
      case 'bank': return <Landmark className="w-4 h-4 text-blue-500" />
      case 'mobile_wallet': return <Smartphone className="w-4 h-4 text-purple-500" />
      default: return <PiggyBank className="w-4 h-4 text-slate-500" />
    }
  }

  const getReferenceBadge = (refType: string) => {
    switch (refType) {
      case 'sale':
        return <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-medium">Sale</Badge>
      case 'purchase':
        return <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 font-medium">Purchase</Badge>
      case 'payment':
        return <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 font-medium">Party Payment</Badge>
      case 'expense':
        return <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-medium">Expense</Badge>
      case 'transfer':
        return <Badge className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 font-medium">Transfer</Badge>
      case 'adjustment':
        return <Badge className="bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20 font-medium">Adjustment</Badge>
      case 'capital':
        return <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-medium">💰 Capital Investment</Badge>
      case 'withdrawal':
        return <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 font-medium">💸 Owner Withdrawal</Badge>
      default:
        return <Badge variant="outline" className="capitalize font-medium">{refType || 'General'}</Badge>
    }
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-3.5rem)] w-full p-4 sm:p-6 lg:p-8 space-y-6 bg-background">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Accounts & Cash Book</h1>
          <p className="text-muted-foreground mt-1">Manage accounts, record fund transfers, and track real-time cash flow.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => setIsCreateAccountOpen(true)} className="gap-2 shadow-sm">
            <Plus className="w-4 h-4" /> Add Account
          </Button>
          <Button variant="outline" onClick={() => setIsCapitalInvestOpen(true)} className="gap-2 shadow-sm bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
            <TrendingUp className="w-4 h-4" /> Add Capital
          </Button>
          <Button variant="outline" onClick={() => setIsCapitalWithdrawOpen(true)} className="gap-2 shadow-sm bg-rose-50 hover:bg-rose-100 dark:bg-rose-950 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800">
            <TrendingDown className="w-4 h-4" /> Withdraw
          </Button>
          <Button onClick={() => setIsTransferModalOpen(true)} className="gap-2 shadow-sm">
            <ArrowRightLeft className="w-4 h-4" /> Transfer Funds
          </Button>
        </div>
      </div>

      {/* Hero Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Card className="border-border/60 bg-card/80 backdrop-blur-sm shadow-sm hover:border-border transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Liquidity</CardTitle>
            <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
              <Wallet className="w-5 h-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-extrabold tracking-tight ${totalBalance < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-foreground'}`}>
              {formatMoney(totalBalance)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total balance across active accounts</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/80 backdrop-blur-sm shadow-sm hover:border-border transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Cash Inflow</CardTitle>
            <div className="p-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400">
              {formatMoney(totalCredits)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total receipts for active filter</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/80 backdrop-blur-sm shadow-sm hover:border-border transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Cash Outflow</CardTitle>
            <div className="p-2.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold tracking-tight text-rose-600 dark:text-rose-400">
              {formatMoney(totalDebits)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total payouts for active filter</p>
          </CardContent>
        </Card>
      </div>

      {/* Financial Accounts Cards Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
            <Landmark className="w-4 h-4 text-primary" /> Financial Accounts ({accounts.length})
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {isLoadingAccounts ? (
            <div className="col-span-full flex justify-center py-8 text-muted-foreground">Loading accounts...</div>
          ) : accounts.length === 0 ? (
            <div className="col-span-full flex flex-col justify-center items-center py-8 text-muted-foreground border rounded-xl border-dashed">
              <PiggyBank className="w-10 h-10 mb-3 opacity-20" />
              <p>No accounts created yet.</p>
            </div>
          ) : (
            accounts.map((account: any) => (
              <Card 
                key={account.id} 
                onClick={() => { setSelectedLedgerAccount(account); setLedgerPage(1); }}
                className="group hover:shadow-md transition-all duration-200 cursor-pointer border-border/60 hover:border-primary/40 bg-card"
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <div className="space-y-1">
                    <CardTitle className="text-base font-bold group-hover:text-primary transition-colors">
                      {account.name}
                    </CardTitle>
                    <div className="flex items-center gap-1.5">
                      <span className="capitalize text-[11px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                        {account.type.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                  <div className="p-2.5 bg-muted/80 rounded-xl group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                    {getAccountIcon(account.type)}
                  </div>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className={`text-2xl font-extrabold tracking-tight ${account.current_balance < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-foreground'}`}>
                    {formatMoney(account.current_balance)}
                  </div>
                  <div className="mt-4 pt-3 border-t border-border/50 flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Opening: {formatMoney(account.opening_balance)}</span>
                    <span className="font-semibold text-primary group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                      View Ledger →
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Global Cash Book Section */}
      <div className="space-y-4 pt-4 border-t border-border">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" /> Real-time Cash Book (All Transactions)
            </h2>
            <p className="text-xs text-muted-foreground">Every single cash flow transaction recorded across Sales, Purchases, Payments, Expenses, and Transfers.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetchCashBook()} className="gap-1.5 text-xs self-start md:self-auto">
            <RefreshCcw className="w-3.5 h-3.5" /> Refresh List
          </Button>
        </div>

        {/* Filters Bar */}
        <div className="flex flex-wrap items-center gap-3 bg-muted/20 p-3.5 rounded-xl border border-border">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search description, reference..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
              className="pl-9 h-9 text-sm bg-background"
            />
          </div>

          {/* Account Filter */}
          <select
            className="h-9 px-3 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            value={filterAccountId}
            onChange={(e) => { setFilterAccountId(e.target.value ? Number(e.target.value) : ''); setPage(1); }}
          >
            <option value="">All Accounts</option>
            {accounts.map((a: any) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>

          {/* Type Filter */}
          <select
            className="h-9 px-3 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            value={filterType}
            onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
          >
            <option value="all">All Cash Flows</option>
            <option value="credit">Cash In (Credit)</option>
            <option value="debit">Cash Out (Debit)</option>
          </select>

          {/* Reference Type Filter */}
          <select
            className="h-9 px-3 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            value={filterRefType}
            onChange={(e) => { setFilterRefType(e.target.value); setPage(1); }}
          >
            <option value="all">All Categories</option>
            <option value="sale">Sales Receipts</option>
            <option value="purchase">Purchase Payments</option>
            <option value="payment">Customer & Supplier Payments</option>
            <option value="expense">Expenses</option>
            <option value="transfer">Fund Transfers</option>
            <option value="adjustment">Opening & Adjustments</option>
          </select>

          {(searchTerm || filterAccountId || filterType !== 'all' || filterRefType !== 'all') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchTerm('')
                setFilterAccountId('')
                setFilterType('all')
                setFilterRefType('all')
                setPage(1)
              }}
              className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
            >
              <X className="w-3.5 h-3.5" /> Clear Filters
            </Button>
          )}
        </div>

        {/* Transactions Table */}
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="w-[160px] text-[11px] font-bold uppercase tracking-wider">Date & Time</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-wider">Account</TableHead>
                <TableHead className="w-[100px] text-[11px] font-bold uppercase tracking-wider">Flow</TableHead>
                <TableHead className="w-[140px] text-[11px] font-bold uppercase tracking-wider">Category</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-wider">Description / Notes</TableHead>
                <TableHead className="text-right w-[140px] text-[11px] font-bold uppercase tracking-wider">Amount</TableHead>
                <TableHead className="w-[100px] text-[11px] font-bold uppercase tracking-wider">User</TableHead>
                <TableHead className="w-[80px] text-[11px] font-bold uppercase tracking-wider text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingCashBook ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    Loading cash book transactions...
                  </TableCell>
                </TableRow>
              ) : transactionsList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    No transactions found matching your filters.
                  </TableCell>
                </TableRow>
              ) : (
                transactionsList.map((tx: any) => {
                  const isCredit = tx.type === 'credit'
                  return (
                    <TableRow key={tx.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {new Date(tx.date).toLocaleString('en-PK', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 font-semibold text-sm">
                          {getAccountIcon(tx.account_type)}
                          <span>{tx.account_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {isCredit ? (
                          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 gap-1 text-[11px]">
                            <ArrowDownLeft className="w-3 h-3" /> In
                          </Badge>
                        ) : (
                          <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/20 gap-1 text-[11px]">
                            <ArrowUpRight className="w-3 h-3" /> Out
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {getReferenceBadge(tx.reference_type)}
                      </TableCell>
                      <TableCell className="text-sm font-medium text-foreground">
                        {tx.description || `Transaction #${tx.id}`}
                      </TableCell>
                      <TableCell className={`text-right font-bold font-mono text-sm tabular-nums ${isCredit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {isCredit ? `+ ${formatMoney(tx.amount)}` : `- ${formatMoney(tx.amount)}`}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {tx.created_by_name || 'Admin'}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          {['capital', 'withdrawal', 'transfer'].includes(tx.reference_type) ? (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => handleOpenEditTx(tx)} title="Edit">
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                          ) : (
                            <span className="w-7"></span>
                          )}
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteTx(tx)} title="Delete">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>

          {/* Pagination Footer */}
          <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-t border-border text-xs text-muted-foreground">
            <div>
              Showing {totalRecords > 0 ? (page - 1) * limit + 1 : 0} to {Math.min(page * limit, totalRecords)} of {totalRecords} transactions
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="font-medium px-2">Page {page} of {totalPages}</span>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Add Account Modal */}
      <Dialog open={isCreateAccountOpen} onOpenChange={setIsCreateAccountOpen}>
        <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Account</DialogTitle>
            <DialogDescription>
              Create a new internal cash drawer, bank account, or mobile wallet.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateAccount} className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Account Name</label>
              <Input
                placeholder="e.g. Meezan Bank, Cash Drawer 2..."
                value={newAccName}
                onChange={(e) => setNewAccName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Account Type</label>
              <select
                className="w-full h-10 bg-background border border-border rounded-md px-3 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                value={newAccType}
                onChange={(e) => setNewAccType(e.target.value as any)}
              >
                <option value="bank">Bank Account</option>
                <option value="cash">Cash Account</option>
                <option value="mobile_wallet">Mobile Wallet (Easypaisa/JazzCash)</option>
                <option value="other">Other Account</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Opening Balance (Rs)</label>
              <Input
                type="number"
                placeholder="0.00"
                value={newAccOpening}
                onChange={(e) => setNewAccOpening(e.target.value)}
                min="0"
              />
              {Number(newAccOpening) > 0 && (
                <p className="text-xs text-muted-foreground italic mt-1">
                  {numberToWords(Number(newAccOpening))}
                </p>
              )}
            </div>

            <DialogFooter className="pt-4 border-t mt-4">
              <Button type="button" variant="outline" onClick={() => setIsCreateAccountOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createAccount.isPending}>
                {createAccount.isPending ? 'Creating...' : 'Create Account'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Transfer Funds Modal */}
      <Dialog open={isTransferModalOpen} onOpenChange={setIsTransferModalOpen}>
        <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Transfer Funds</DialogTitle>
            <DialogDescription>
              Move money between internal accounts safely.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleTransfer} className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">From Account (Withdraw)</label>
              <select 
                className="w-full h-10 bg-background border border-border rounded-md px-3 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                value={fromAccount}
                onChange={(e) => setFromAccount(Number(e.target.value) || '')}
                required
              >
                <option value="" disabled>Select source account...</option>
                {accounts.map((a: any) => (
                  <option key={a.id} value={a.id} disabled={a.id === toAccount}>
                    {a.name} ({formatMoney(a.current_balance)})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-center -my-1 relative z-10">
              <div className="bg-background border rounded-full p-1.5 text-muted-foreground shadow-sm">
                <ArrowRightLeft className="w-4 h-4 rotate-90" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">To Account (Deposit)</label>
              <select 
                className="w-full h-10 bg-background border border-border rounded-md px-3 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                value={toAccount}
                onChange={(e) => setToAccount(Number(e.target.value) || '')}
                required
              >
                <option value="" disabled>Select destination account...</option>
                {accounts.map((a: any) => (
                  <option key={a.id} value={a.id} disabled={a.id === fromAccount}>
                    {a.name} ({formatMoney(a.current_balance)})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Amount (Rs)</label>
              <Input 
                type="number" 
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                placeholder="0.00" 
                min="1"
                required 
              />
              {Number(transferAmount) > 0 && <p className="text-xs text-muted-foreground italic mt-1">{numberToWords(Number(transferAmount))}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Notes / Reason (Optional)</label>
              <Input
                placeholder="e.g. Bank deposit, Cash drawer refill..."
                value={transferDesc}
                onChange={(e) => setTransferDesc(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4 text-primary" /> Transfer Date
              </label>
              <input
                type="date"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={transferDate}
                onChange={(e) => setTransferDate(e.target.value)}
                max={format(new Date(), 'yyyy-MM-dd')}
              />
              <p className="text-xs text-muted-foreground italic">Defaults to today. Change to backdate this transfer.</p>
            </div>

            <DialogFooter className="pt-4 border-t mt-4">
              <Button type="button" variant="outline" onClick={() => setIsTransferModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={transferFunds.isPending}>
                {transferFunds.isPending ? 'Transferring...' : 'Confirm Transfer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Individual Account Ledger Modal */}
      <Dialog open={!!selectedLedgerAccount} onOpenChange={(open) => !open && setSelectedLedgerAccount(null)}>
        <DialogContent className="max-w-[850px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              {selectedLedgerAccount && getAccountIcon(selectedLedgerAccount.type)}
              <span>{selectedLedgerAccount?.name} — Account Statement</span>
            </DialogTitle>
            <DialogDescription>
              Complete statement of all cash inflows and outflows for this account.
            </DialogDescription>
          </DialogHeader>

          {selectedLedgerAccount && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-muted/20 p-4 rounded-xl border border-border">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Account Type</p>
                  <p className="font-semibold text-sm capitalize mt-0.5">{selectedLedgerAccount.type.replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Opening Balance</p>
                  <p className="font-semibold text-sm mt-0.5">{formatMoney(selectedLedgerAccount.opening_balance)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Current Balance</p>
                  <p className={`font-bold text-base mt-0.5 ${selectedLedgerAccount.current_balance < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {formatMoney(selectedLedgerAccount.current_balance)}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-border overflow-hidden shadow-sm">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider">Date & Time</TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider">Flow</TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider">Category</TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider">Description</TableHead>
                      <TableHead className="text-right text-[11px] font-bold uppercase tracking-wider">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingLedger ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          Loading ledger statements...
                        </TableCell>
                      </TableRow>
                    ) : !ledgerData?.transactions || ledgerData.transactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No transactions found for this account.
                        </TableCell>
                      </TableRow>
                    ) : (
                      ledgerData.transactions.map((tx: any) => {
                        const isCredit = tx.type === 'credit'
                        return (
                          <TableRow key={tx.id} className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-xs font-mono text-muted-foreground">
                              {new Date(tx.date).toLocaleString('en-PK', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </TableCell>
                            <TableCell>
                              {isCredit ? (
                                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-[10px]">
                                  + In
                                </Badge>
                              ) : (
                                <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/20 text-[10px]">
                                  - Out
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {getReferenceBadge(tx.reference_type)}
                            </TableCell>
                            <TableCell className="text-sm font-medium">
                              {tx.description || `Transaction #${tx.id}`}
                            </TableCell>
                            <TableCell className={`text-right font-bold font-mono text-sm tabular-nums ${isCredit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                              {isCredit ? `+ ${formatMoney(tx.amount)}` : `- ${formatMoney(tx.amount)}`}
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedLedgerAccount(null)}>
              Close Statement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Capital Investment Modal */}
      <Dialog open={isCapitalInvestOpen} onOpenChange={setIsCapitalInvestOpen}>
        <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              Add Capital Investment
            </DialogTitle>
            <DialogDescription>
              Invest personal money into your business. This increases your account balance and represents owner's equity.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCapitalInvest} className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Deposit Into Account</label>
              <select 
                className="w-full h-10 bg-background border border-border rounded-md px-3 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                value={investAccount}
                onChange={(e) => setInvestAccount(Number(e.target.value) || '')}
                required
              >
                <option value="" disabled>Select account to receive capital...</option>
                {accounts.map((a: any) => (
                  <option key={a.id} value={a.id}>
                    {a.name} (Current: {formatMoney(a.current_balance)})
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Choose which account will receive your investment (usually Cash in Hand or Bank).
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Investment Amount (Rs)</label>
              <Input 
                type="number" 
                value={investAmount}
                onChange={(e) => setInvestAmount(e.target.value)}
                placeholder="0.00" 
                min="1"
                required 
              />
              {Number(investAmount) > 0 && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 italic mt-1">
                  {numberToWords(Number(investAmount))}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Notes / Purpose (Optional)</label>
              <Input
                placeholder="e.g. Initial capital, Additional investment..."
                value={investDesc}
                onChange={(e) => setInvestDesc(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4 text-emerald-600" /> Investment Date
              </label>
              <input
                type="date"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={investDate}
                onChange={(e) => setInvestDate(e.target.value)}
                max={format(new Date(), 'yyyy-MM-dd')}
              />
              <p className="text-xs text-muted-foreground italic">Defaults to today. Change to backdate this investment.</p>
            </div>

            <div className="bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3">
              <p className="text-xs text-emerald-700 dark:text-emerald-400">
                <strong>Effect:</strong> This will add Rs {investAmount || '0'} to your selected account and record it as "Capital Investment" in your cash book. This represents your personal investment in the business.
              </p>
            </div>

            <DialogFooter className="pt-4 border-t mt-4">
              <Button type="button" variant="outline" onClick={() => setIsCapitalInvestOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
                Confirm Investment
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Capital Withdrawal Modal */}
      <Dialog open={isCapitalWithdrawOpen} onOpenChange={setIsCapitalWithdrawOpen}>
        <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-rose-600" />
              Withdraw Capital
            </DialogTitle>
            <DialogDescription>
              Withdraw money from your business for personal use. This reduces your account balance.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCapitalWithdraw} className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Withdraw From Account</label>
              <select 
                className="w-full h-10 bg-background border border-border rounded-md px-3 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                value={withdrawAccount}
                onChange={(e) => setWithdrawAccount(Number(e.target.value) || '')}
                required
              >
                <option value="" disabled>Select source account...</option>
                {accounts.map((a: any) => (
                  <option key={a.id} value={a.id}>
                    {a.name} (Available: {formatMoney(a.current_balance)})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Withdrawal Amount (Rs)</label>
              <Input 
                type="number" 
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="0.00" 
                min="1"
                required 
              />
              {Number(withdrawAmount) > 0 && (
                <p className="text-xs text-rose-600 dark:text-rose-400 italic mt-1">
                  {numberToWords(Number(withdrawAmount))}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Notes / Reason (Optional)</label>
              <Input
                placeholder="e.g. Personal expense, Salary..."
                value={withdrawDesc}
                onChange={(e) => setWithdrawDesc(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4 text-rose-600" /> Withdrawal Date
              </label>
              <input
                type="date"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                value={withdrawDate}
                onChange={(e) => setWithdrawDate(e.target.value)}
                max={format(new Date(), 'yyyy-MM-dd')}
              />
              <p className="text-xs text-muted-foreground italic">Defaults to today. Change to backdate this withdrawal.</p>
            </div>

            <div className="bg-rose-50 dark:bg-rose-950 border border-rose-200 dark:border-rose-800 rounded-lg p-3">
              <p className="text-xs text-rose-700 dark:text-rose-400">
                <strong>Effect:</strong> This will deduct Rs {withdrawAmount || '0'} from your selected account and record it as "Capital Withdrawal" in your cash book. Make sure you have sufficient balance.
              </p>
            </div>

            <DialogFooter className="pt-4 border-t mt-4">
              <Button type="button" variant="outline" onClick={() => setIsCapitalWithdrawOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-rose-600 hover:bg-rose-700">
                Confirm Withdrawal
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Transaction Modal */}
      <Dialog open={!!editTx} onOpenChange={(open) => !open && setEditTx(null)}>
        <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-primary" />
              Edit {editTx?.reference_type === 'capital' ? 'Capital Investment' : editTx?.reference_type === 'withdrawal' ? 'Capital Withdrawal' : 'Transfer'}
            </DialogTitle>
            <DialogDescription>
              Update the amount, description, or date of this transaction. Account balances will be adjusted automatically.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveEditTx} className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Account</label>
              <Input value={editTx?.account_name || ''} disabled className="bg-muted" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Amount (Rs)</label>
              <Input 
                type="number" 
                value={editTxAmount}
                onChange={(e) => setEditTxAmount(e.target.value)}
                placeholder="0.00" 
                min="1"
                required 
              />
              {Number(editTxAmount) > 0 && (
                <p className="text-xs text-muted-foreground italic">
                  {numberToWords(Number(editTxAmount))}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Input
                placeholder="Notes..."
                value={editTxDesc}
                onChange={(e) => setEditTxDesc(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4 text-primary" /> Date
              </label>
              <input
                type="date"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={editTxDate}
                onChange={(e) => setEditTxDate(e.target.value)}
                max={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>

            <DialogFooter className="pt-4 border-t mt-4">
              <Button type="button" variant="outline" onClick={() => setEditTx(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateTransaction.isPending}>
                {updateTransaction.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {deleteConfirm && (
        <ConfirmDialog 
          open={deleteConfirm.open} 
          onOpenChange={(o) => !o && setDeleteConfirm(null)}
          title="Delete Transaction"
          description={deleteConfirm.message}
          onConfirm={confirmDeleteTx}
        />
      )}
    </div>
  )
}

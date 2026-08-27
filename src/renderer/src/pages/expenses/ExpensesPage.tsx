import { format } from 'date-fns'
import { useState } from 'react'
import { useExpenses, useExpenseCategories, useCreateExpense, useCreateExpenseCategory } from '../../hooks/useExpenses'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'
import { useAccounts } from '../../hooks/useAccounts'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Combobox } from '@/components/ui/combobox'
import { numberToWords } from '../../lib/numberToWords'
import { Plus, Receipt, Banknote, CalendarDays } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function ExpensesPage() {
  const [filters, setFilters] = useState({ date_from: '', date_to: '', category_id: 'all' })
  
  const queryFilters = {
    date_from: filters.date_from || undefined,
    date_to: filters.date_to || undefined,
    category_id: filters.category_id !== 'all' ? Number(filters.category_id) : undefined
  }

  const { data: expenses = [] } = useExpenses(queryFilters)
  const { data: categories = [] } = useExpenseCategories()
  const { data: accounts = [] } = useAccounts()
  const createExpense = useCreateExpense()
  const createExpenseCategory = useCreateExpenseCategory()
  const { toast } = useToast()

  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState<any>({ date: format(new Date(), 'yyyy-MM-dd') })

  const handleOpenDialog = () => {
    setFormData({ date: format(new Date(), 'yyyy-MM-dd') })
    setOpen(true)
  }

  useKeyboardShortcuts({
    'Ctrl+N': () => setOpen(true),
    'Escape': () => setOpen(false)
  })

  const handleSubmit = async () => {
    if (!formData.amount || !formData.category_id || !formData.account_id) return
    
    try {
      let final_cat_id = typeof formData.category_id === 'number' ? formData.category_id : undefined
      if (typeof formData.category_id === 'string' && formData.category_id !== '') {
        if (isNaN(Number(formData.category_id))) {
          const newCat = await createExpenseCategory.mutateAsync(formData.category_id)
          final_cat_id = newCat.id
        } else {
          final_cat_id = Number(formData.category_id)
        }
      }
      
      if (!final_cat_id) return
      
      await createExpense.mutateAsync({
        amount: Math.round(Number(formData.amount) * 100),
        category_id: final_cat_id,
        account_id: Number(formData.account_id),
        date: formData.date ? formData.date + 'T12:00:00.000Z' : new Date().toISOString(),
        note: formData.note
      })
      setOpen(false)
      setFormData({ date: format(new Date(), 'yyyy-MM-dd') })
      toast({ title: 'Success', description: 'Expense recorded successfully' })
    } catch (err) {
      console.error(err)
      toast({ title: 'Error', description: 'Failed to record expense', variant: 'destructive' })
    }
  }

  const formatMoney = (paisa: number) => `Rs ${(paisa / 100).toFixed(0)}`
  const categoryOptions = categories.map((c: any) => ({ value: c.id.toString(), label: c.name }))

  const totalExpense = expenses.reduce((sum: number, e: any) => sum + e.amount, 0)
  
  const categoryTotals = expenses.reduce((acc: any, e: any) => {
    acc[e.category_name] = (acc[e.category_name] || 0) + e.amount
    return acc
  }, {})

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] w-full p-4 sm:p-6 lg:p-8 overflow-y-auto">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Expenses</h1>
          <p className="text-muted-foreground mt-1">Track daily operating expenses.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-surface border rounded-md p-1 shadow-sm">
            <Input 
              type="date" 
              className="h-8 border-none bg-transparent shadow-none w-36"
              value={filters.date_from}
              onChange={e => setFilters({...filters, date_from: e.target.value})}
            />
            <span className="text-muted-foreground text-sm">to</span>
            <Input 
              type="date" 
              className="h-8 border-none bg-transparent shadow-none w-36"
              value={filters.date_to}
              onChange={e => setFilters({...filters, date_to: e.target.value})}
            />
          </div>
          
          <Select value={filters.category_id} onValueChange={v => setFilters({...filters, category_id: v})}>
            <SelectTrigger className="w-40 h-10 bg-surface shadow-sm"><SelectValue placeholder="All Categories" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((c: any) => (
                <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={() => handleOpenDialog()} className="h-10 gap-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground ml-2">
            <Plus className="w-4 h-4" /> Record
          </Button>
        </div>
      </div>

      {/* Analytics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="rounded-xl border bg-surface p-4 shadow-sm flex flex-col justify-center">
          <p className="text-sm font-medium text-muted-foreground">Total Expenses</p>
          <p className="text-2xl font-bold text-destructive mt-1">{formatMoney(totalExpense)}</p>
          <p className="text-xs text-muted-foreground mt-1">Based on current filters</p>
        </div>
        <div className="col-span-3 flex gap-3 overflow-x-auto pb-2">
          {Object.entries(categoryTotals).map(([name, amount]: any) => (
            <div key={name} className="flex-shrink-0 min-w-[150px] rounded-xl border bg-surface p-3 shadow-sm flex flex-col justify-center">
              <p className="text-xs font-medium text-muted-foreground truncate">{name}</p>
              <p className="text-lg font-bold mt-1">{formatMoney(amount)}</p>
            </div>
          ))}
          {Object.keys(categoryTotals).length === 0 && (
            <div className="flex items-center text-sm text-muted-foreground italic h-full px-4">
              No categories to display
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border bg-surface shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
        <Table>
          <TableHeader className="bg-muted/50 sticky top-0">
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Paid From</TableHead>
              <TableHead>Note</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center">
                    <Receipt className="w-8 h-8 mb-2 opacity-50" />
                    No expenses recorded.
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              expenses.map((exp: any) => (
                <TableRow key={exp.id} className="text-sm">
                  <TableCell className="font-mono text-xs">{new Date(exp.date).toLocaleDateString()}</TableCell>
                  <TableCell className="font-medium">{exp.category_name}</TableCell>
                  <TableCell className="font-mono font-bold text-destructive">{formatMoney(exp.amount)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-xs">
                      <Banknote className="w-3 h-3" /> {exp.account_name}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{exp.note || '-'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record New Expense</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Category</label>
                <Combobox
                  options={categoryOptions}
                  value={formData.category_id?.toString() || ''}
                  onChange={(val) => setFormData({...formData, category_id: val || ''})}
                  placeholder="Select..."
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Amount (Rs)</label>
                <Input 
                  type="number" 
                  min="0"
                  value={formData.amount || ''}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                />
                {Number(formData.amount) > 0 && <p className="text-xs text-muted-foreground italic mt-1">{numberToWords(Number(formData.amount))}</p>}
              </div>
            </div>
            
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Paid From Account</label>
              <Select value={formData.account_id} onValueChange={(v) => setFormData({...formData, account_id: v})}>
                <SelectTrigger><SelectValue placeholder="Select Account" /></SelectTrigger>
                <SelectContent>
                  {accounts.map((a: any) => (
                    <SelectItem key={a.id} value={a.id.toString()}>{a.name} ({formatMoney(a.current_balance)})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Note / Description</label>
              <Input 
                value={formData.note || ''}
                onChange={(e) => setFormData({...formData, note: e.target.value})}
                placeholder="Optional description"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                <CalendarDays className="w-3.5 h-3.5 text-primary" /> Expense Date
              </label>
              <input
                type="date"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={formData.date || format(new Date(), 'yyyy-MM-dd')}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
                max={format(new Date(), 'yyyy-MM-dd')}
              />
              <p className="text-xs text-muted-foreground italic mt-1">Defaults to today. Change to backdate this expense.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleSubmit} disabled={createExpense.isPending}>Record Expense</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

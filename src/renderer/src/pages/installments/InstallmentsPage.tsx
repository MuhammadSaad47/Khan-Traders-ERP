import { CalendarDays, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function InstallmentsPage() {
  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] w-full p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Installment Plans</h1>
          <p className="text-muted-foreground mt-1">Track active payment plans and due dates.</p>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center flex-1 border-2 border-dashed rounded-xl bg-surface/50 text-muted-foreground p-12 text-center">
        <CalendarDays className="w-16 h-16 mb-4 opacity-20" />
        <h2 className="text-xl font-bold text-foreground mb-2">Installments Module</h2>
        <p className="max-w-md mb-6">Create installment plans directly from a Sale invoice. Active plans and their payment schedules will appear here.</p>
        <Button variant="outline" className="gap-2">
          <AlertCircle className="w-4 h-4" /> View Overdue Schedules
        </Button>
      </div>
    </div>
  )
}

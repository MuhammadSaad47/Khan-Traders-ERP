// React omitted
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Printer, Download } from 'lucide-react'
import { useCustomerStatement } from '../../hooks/useParties'
import { format } from 'date-fns'
import html2pdf from 'html2pdf.js'
import logo from '../../assets/logo_color.png'

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: number | null;
  customerName: string;
  fromDate: string;
  toDate: string;
}

export function CustomerStatementDialog({ open, onOpenChange, customerId, customerName, fromDate, toDate }: Props) {
  const { data, isLoading, isError, error } = useCustomerStatement(customerId || 0, fromDate, toDate)

  const handleDownloadPDF = () => {
    const element = document.getElementById('customer-statement-content');
    if (!element) return;
    
    const opt: any = {
      margin:       0.5,
      filename:     `Customer_Statement_${customerName.replace(/\\s+/g, '_')}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2 },
      jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save();
  }

  const handlePrint = () => {
    const printContent = document.getElementById('customer-statement-content');
    const originalContents = document.body.innerHTML;
    if (printContent) {
      document.body.innerHTML = printContent.innerHTML;
      window.print();
      document.body.innerHTML = originalContents;
      window.location.reload(); // Reload to restore event listeners
    }
  }

  const formatMoney = (paisa: number) => `Rs ${(paisa / 100).toLocaleString('en-PK', { maximumFractionDigits: 0 })}`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-background">
        <DialogHeader className="flex flex-row items-center justify-between p-6 pb-4 border-b pr-10">
          <DialogTitle className="text-xl">Customer Statement</DialogTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
              <Printer className="w-4 h-4" /> Print
            </Button>
            <Button size="sm" onClick={handleDownloadPDF} className="gap-2">
              <Download className="w-4 h-4" /> PDF
            </Button>
          </div>
        </DialogHeader>
        
        <div className="overflow-y-auto p-6 flex-1 bg-muted/20">
          <div id="customer-statement-content" className="bg-white p-8 rounded-xl shadow-sm border max-w-3xl mx-auto text-black">
            
            {/* Header */}
            <div className="flex justify-between items-start mb-8 border-b pb-8">
              <div className="flex items-center gap-4">
                <img src={logo} alt="Khan Traders Logo" className="h-16 w-auto" />
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">KHAN TRADERS</h2>
                  <p className="text-sm text-gray-500">Khyber Bazar, Peshawar</p>
                  <p className="text-sm text-gray-500">Ph: 091-2212323, 0300-5712123</p>
                </div>
              </div>
              <div className="text-right">
                <h3 className="text-xl font-bold text-primary">CUSTOMER STATEMENT</h3>
                <div className="mt-2 space-y-1 text-sm text-gray-600">
                  <p><span className="font-semibold w-24 inline-block">Customer:</span> {customerName}</p>
                  <p><span className="font-semibold w-24 inline-block">Period:</span> {format(new Date(fromDate), 'dd MMM yyyy')} - {format(new Date(toDate), 'dd MMM yyyy')}</p>
                  <p><span className="font-semibold w-24 inline-block">Generated:</span> {format(new Date(), 'dd MMM yyyy HH:mm')}</p>
                </div>
              </div>
            </div>

            {/* Summary Cards */}
            {!isLoading && data && (
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="p-4 border rounded-lg bg-gray-50">
                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Total Purchases</p>
                  <p className="text-lg font-bold text-gray-900">{formatMoney(data.totals.totalDebit)}</p>
                </div>
                <div className="p-4 border rounded-lg bg-gray-50">
                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Total Paid</p>
                  <p className="text-lg font-bold text-green-600">{formatMoney(data.totals.totalCredit)}</p>
                </div>
                <div className="p-4 border rounded-lg bg-gray-50">
                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Balance Owed</p>
                  <p className="text-lg font-bold text-red-600">{formatMoney(data.closingBalance)}</p>
                </div>
              </div>
            )}

            {/* Transactions Table */}
            <div className="mb-6">
              <h4 className="text-lg font-bold text-gray-900 mb-4">Transaction History</h4>
              <Table className="border rounded-lg overflow-hidden">
                <TableHeader className="bg-gray-100">
                  <TableRow>
                    <TableHead className="text-black font-bold">Date</TableHead>
                    <TableHead className="text-black font-bold">Description</TableHead>
                    <TableHead className="text-black font-bold">Ref #</TableHead>
                    <TableHead className="text-right text-black font-bold">Amount (+)</TableHead>
                    <TableHead className="text-right text-black font-bold">Paid (-)</TableHead>
                    <TableHead className="text-right text-black font-bold">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center h-24 text-gray-500">Loading statement...</TableCell>
                    </TableRow>
                  ) : isError ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center h-24 text-red-500">Error loading statement: {(error as Error)?.message || 'Unknown error'}</TableCell>
                    </TableRow>
                  ) : (
                    <>
                      <TableRow className="bg-muted/10 font-semibold">
                        <TableCell colSpan={5} className="text-right">Opening Balance</TableCell>
                        <TableCell className="text-right text-red-600">{formatMoney(data?.openingBalance || 0)}</TableCell>
                      </TableRow>
                      {data?.lines?.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center h-24 text-gray-500">No transactions in this period.</TableCell>
                        </TableRow>
                      ) : (
                        data?.lines?.map((line: any, idx: number) => (
                          <TableRow key={`${line.type}-${line.id}-${idx}`}>
                            <TableCell>{format(new Date(line.date), 'dd MMM yyyy')}</TableCell>
                            <TableCell>{line.description}</TableCell>
                            <TableCell className="font-medium">{line.reference || '-'}</TableCell>
                            <TableCell className="text-right">{line.debit > 0 ? formatMoney(line.debit) : '-'}</TableCell>
                            <TableCell className="text-right text-green-600">{line.credit > 0 ? formatMoney(line.credit) : '-'}</TableCell>
                            <TableCell className="text-right text-red-600 font-medium">{formatMoney(line.balance)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="text-center text-xs text-gray-500 mt-12 pt-8 border-t">
              This is a computer generated statement and does not require a signature.
            </div>

          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

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
import { useAssignmentReport } from '../../hooks/useVans'
import { format } from 'date-fns'
import html2pdf from 'html2pdf.js'
import logo from '../../assets/logo_color.png'

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignmentId: number | null;
}

export function VanAssignmentReportDialog({ open, onOpenChange, assignmentId }: Props) {
  const { data: reportData, isLoading, isError, error } = useAssignmentReport(assignmentId || 0)

  const handleDownloadPDF = () => {
    const element = document.getElementById('van-report-content');
    if (!element) return;
    
    const opt: any = {
      margin:       0.5,
      filename:     `Van_Report_${assignmentId}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2 },
      jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save();
  }

  const handlePrint = () => {
    const printContent = document.getElementById('van-report-content');
    const originalContents = document.body.innerHTML;
    if (printContent) {
      document.body.innerHTML = printContent.innerHTML;
      window.print();
      document.body.innerHTML = originalContents;
      window.location.reload(); 
    }
  }

  const formatMoney = (paisa: number) => `Rs ${(paisa / 100).toLocaleString('en-PK', { maximumFractionDigits: 0 })}`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-background">
        <DialogHeader className="flex flex-row items-center justify-between p-6 pb-4 border-b pr-10">
          <DialogTitle className="text-xl">Van Session Report</DialogTitle>
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
          <div id="van-report-content" className="bg-white p-8 rounded-xl shadow-sm border max-w-3xl mx-auto text-black">
            
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
                <h3 className="text-xl font-bold text-primary">VAN SALES REPORT</h3>
                {reportData && (
                  <div className="mt-2 space-y-1 text-sm text-gray-600">
                    <p><span className="font-semibold w-24 inline-block">Session ID:</span> #{assignmentId}</p>
                    <p><span className="font-semibold w-24 inline-block">Salesman:</span> {reportData.assignment.salesman_name}</p>
                    <p><span className="font-semibold w-24 inline-block">Date:</span> {format(new Date(reportData.assignment.date), 'dd MMM yyyy')}</p>
                    <p><span className="font-semibold w-24 inline-block">Generated:</span> {format(new Date(), 'dd MMM yyyy HH:mm')}</p>
                  </div>
                )}
              </div>
            </div>

            {isLoading ? (
              <div className="py-20 text-center text-gray-500">Generating report...</div>
            ) : isError ? (
              <div className="py-20 text-center text-red-500">Error loading report details: {(error as any)?.message}</div>
            ) : !reportData ? null : (
              <div className="space-y-8">
                
                {/* Items Summary */}
                <div>
                  <h4 className="font-bold text-gray-900 mb-3 border-b pb-2">Stock Summary</h4>
                  <Table className="border rounded-md">
                    <TableHeader className="bg-gray-50">
                      <TableRow>
                        <TableHead className="text-gray-900 font-semibold">Item</TableHead>
                        <TableHead className="text-gray-900 font-semibold text-right">Loaded</TableHead>
                        <TableHead className="text-gray-900 font-semibold text-right">Sold</TableHead>
                        <TableHead className="text-gray-900 font-semibold text-right">Expected Return</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.items.map((item: any, i: number) => (
                        <TableRow key={i} className="hover:bg-gray-50/50">
                          <TableCell className="font-medium">{item.item_name}</TableCell>
                          <TableCell className="text-right">{item.qty_loaded}</TableCell>
                          <TableCell className="text-right font-medium text-success">{item.qty_sold}</TableCell>
                          <TableCell className="text-right font-bold">{item.expected_return}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Sales Transactions */}
                <div>
                  <h4 className="font-bold text-gray-900 mb-3 border-b pb-2">Sales Transactions</h4>
                  <Table className="border rounded-md">
                    <TableHeader className="bg-gray-50">
                      <TableRow>
                        <TableHead className="text-gray-900 font-semibold">Invoice</TableHead>
                        <TableHead className="text-gray-900 font-semibold">Status</TableHead>
                        <TableHead className="text-gray-900 font-semibold text-right">Net Total</TableHead>
                        <TableHead className="text-gray-900 font-semibold text-right">Cash Collected</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.sales.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-gray-500 py-4">No sales recorded.</TableCell>
                        </TableRow>
                      ) : reportData.sales.map((sale: any, i: number) => (
                        <TableRow key={i} className="hover:bg-gray-50/50">
                          <TableCell className="font-medium font-mono">{sale.invoice_no}</TableCell>
                          <TableCell>{sale.status.toUpperCase()}</TableCell>
                          <TableCell className="text-right">{formatMoney(sale.net_total)}</TableCell>
                          <TableCell className="text-right text-success">{formatMoney(sale.paid_amount)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Financial Summary */}
                <div className="flex justify-end pt-6">
                  <div className="w-72 bg-gray-50 p-4 rounded-lg border">
                    <h4 className="font-bold text-gray-900 mb-3 border-b pb-2">Financial Settlement</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Sales Value:</span>
                        <span className="font-medium">{formatMoney(reportData.summary.totalSales)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Cash Collected:</span>
                        <span className="font-medium">{formatMoney(reportData.summary.totalCashCollected)}</span>
                      </div>
                      {reportData.summary.totalExpenses > 0 && (
                        <div className="flex justify-between text-red-600">
                          <span>Less Van Expenses:</span>
                          <span>- {formatMoney(reportData.summary.totalExpenses)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-lg pt-3 border-t mt-3 text-gray-900">
                        <span>Net Cash Expected:</span>
                        <span>{formatMoney(reportData.summary.expectedCashToDeposit - reportData.summary.totalExpenses)}</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            )}
            
            <div className="mt-16 pt-8 border-t text-sm text-gray-500 text-center flex justify-between px-10">
              <div className="border-t border-gray-400 w-40 pt-2">Salesman Signature</div>
              <div className="border-t border-gray-400 w-40 pt-2">Manager Signature</div>
            </div>

          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

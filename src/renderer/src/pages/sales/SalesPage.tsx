import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, FileText, Printer, Trash2, Download } from 'lucide-react'
import html2pdf from 'html2pdf.js'
import logo from '../../assets/logo_color.png'
import { useSales, useSaleDetails, usePrintReceipt, useVoidSale, useSaleReturns } from '../../hooks/useSales'
import { useCustomers } from '../../hooks/useParties'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import { numberToWords } from '../../lib/numberToWords'
import Barcode from 'react-barcode'
import { SaleReturnDialog } from './SaleReturnDialog'
import { RefreshCcw } from 'lucide-react'

export default function SalesPage() {
  const navigate = useNavigate()
  const { data: sales = [], isLoading } = useSales()
  const { data: customers = [] } = useCustomers()
  const printReceipt = usePrintReceipt()
  const voidSale = useVoidSale()
  
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSaleId, setSelectedSaleId] = useState<number | null>(null)
  const [returnDialogOpen, setReturnDialogOpen] = useState(false)

  const { data: saleDetails, isLoading: isLoadingDetails } = useSaleDetails(selectedSaleId)
  const { data: returns = [] } = useSaleReturns(selectedSaleId || 0)

  const filteredSales = sales.filter((s: any) => 
    s.invoice_no.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatMoney = (paisa: number) => `Rs ${(paisa / 100).toFixed(0)}`

  const handlePrint = (sale: any, items: any[]) => {
    const customer = customers.find((c: any) => c.id === sale.customer_id)
    printReceipt.mutate({
      invoiceNo: sale.invoice_no,
      customerName: customer?.name,
      items: items.map(i => ({ name: `Item #${i.item_id}`, qty: i.qty, price: i.unit_price, lineTotal: i.line_total })), // In a real app, we'd join items table to get real names in getSaleDetails
      subtotal: sale.subtotal,
      discount: sale.discount,
      netTotal: sale.net_total,
      paidAmount: sale.paid_amount,
      date: sale.date
    })
  }

  const handleDownloadPDF = () => {
    const element = document.getElementById('sale-invoice-content');
    if (!element) return;
    
    const opt = {
      margin:       0.5,
      filename:     `Sale_Invoice_${saleDetails?.sale?.invoice_no}.pdf`,
      image:        { type: 'jpeg' as const, quality: 0.98 },
      html2canvas:  { scale: 2 },
      jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' as const }
    };

    html2pdf().set(opt).from(element).save();
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] w-full overflow-hidden bg-background">
      
      {/* Main Sales List */}
      <div className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Sales History</h1>
            <p className="text-muted-foreground mt-1">View past transactions and print receipts.</p>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-surface p-4 rounded-xl border shadow-sm mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search by Invoice No..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-background/50 border-0 shadow-none ring-1 ring-inset ring-border/50 focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>
        </div>

        <div className="rounded-xl border bg-surface shadow-sm overflow-hidden flex-1 flex flex-col">
          <div className="overflow-auto flex-1">
            <Table>
              <TableHeader className="bg-muted/50 sticky top-0 z-10 backdrop-blur-sm">
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Invoice No</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Net Total</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                      Loading sales...
                    </TableCell>
                  </TableRow>
                ) : filteredSales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-48 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <FileText className="w-12 h-12 mb-4 opacity-20" />
                        <p>No sales found.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSales.map((sale: any) => {
                    const customer = customers.find((c: any) => c.id === sale.customer_id)
                    return (
                      <TableRow 
                        key={sale.id} 
                        className={`cursor-pointer transition-colors ${selectedSaleId === sale.id ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-muted/30'}`}
                        onClick={() => setSelectedSaleId(sale.id)}
                      >
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(sale.date).toLocaleString()}
                        </TableCell>
                        <TableCell className="font-mono font-medium">
                          {sale.invoice_no}
                        </TableCell>
                        <TableCell>
                          {customer ? customer.name : 'Walk-in'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={sale.status === 'paid' ? 'success' : sale.status === 'partial' ? 'warning' : 'destructive'}>
                            {sale.status.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-bold">
                          {formatMoney(sale.net_total)}
                        </TableCell>
                        <TableCell className="text-right flex justify-end gap-2">
                          <Button variant="outline" size="sm" className="gap-2 text-xs h-8" onClick={(e) => { e.stopPropagation(); setSelectedSaleId(sale.id); }}>
                            <FileText className="w-3.5 h-3.5" />
                            View
                          </Button>
                          <Button variant="outline" size="sm" className="gap-2 text-xs h-8 text-primary border-primary/20 hover:bg-primary/10" onClick={(e) => { e.stopPropagation(); navigate(`/pos?editSaleId=${sale.id}`); }}>
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Invoice Modal */}
      <Dialog open={!!selectedSaleId} onOpenChange={(open) => !open && setSelectedSaleId(null)}>
        <DialogContent hideClose className="max-w-[850px] w-[95vw] p-0 overflow-hidden bg-background border-none shadow-2xl">
          {isLoadingDetails || !saleDetails ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              Loading details...
            </div>
          ) : (
            <div className="flex flex-col max-h-[90vh]">
              {/* Action Bar */}
              <div className="p-4 bg-muted/30 border-b flex justify-between items-center">
                <h2 className="font-semibold">Sale Details</h2>
                <div className="flex gap-2">
                  <Button variant="outline" className="text-amber-600 hover:bg-amber-600/10 hover:text-amber-700 border-amber-600/20" onClick={() => setReturnDialogOpen(true)}>
                    <RefreshCcw className="w-4 h-4 mr-2" />
                    Process Return
                  </Button>
                  <Button variant="outline" className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20" onClick={() => {
                    if (confirm('Are you sure you want to void this sale? This will revert stock and financial records. This action cannot be undone.')) {
                      voidSale.mutate(saleDetails.sale.id, {
                        onSuccess: () => setSelectedSaleId(null)
                      })
                    }
                  }} disabled={voidSale.isPending}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    {voidSale.isPending ? 'Voiding...' : 'Void Sale'}
                  </Button>
                  <Button variant="outline" onClick={() => setSelectedSaleId(null)}>Close</Button>
                  <Button variant="outline" onClick={handleDownloadPDF} className="gap-2">
                    <Download className="w-4 h-4" /> Download PDF
                  </Button>
                  <Button onClick={() => handlePrint(saleDetails.sale, saleDetails.items)} className="gap-2">
                    <Printer className="w-4 h-4" /> Print Receipt
                  </Button>
                </div>
              </div>
              
              {/* Printable Invoice Area */}
              <div id="sale-invoice-content" className="flex-1 overflow-y-auto p-6 md:p-10 bg-white text-black font-sans relative">
                <div className="flex justify-between items-start border-b-2 border-primary pb-4 mb-8">
                  <div className="flex items-center gap-4">
                    <img src={logo} alt="Khan Traders Logo" className="h-24 w-auto object-contain" />
                    <div>
                      <h1 className="font-black text-3xl tracking-wider text-primary">KHAN TRADERS</h1>
                      <h2 className="font-bold text-lg text-gray-700">Whole Sale</h2>
                      <p className="text-sm font-semibold text-gray-600">Soft Drinks Wholesale Distributors</p>
                      <p className="text-sm text-gray-500 whitespace-pre-line mt-1">
                        Main Kohat Road Darwazgai, Near Rahim Abad{'\n'}
                        03139924928 | 03469118339 | 03489854823 | 03132626869
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <h1 className="text-4xl font-black text-gray-200 tracking-wider mb-2 uppercase text-right">Sale Invoice</h1>
                    <div className="bg-white p-1 rounded border border-gray-200">
                      <Barcode value={saleDetails.sale.invoice_no} width={1.2} height={40} fontSize={10} displayValue={false} margin={0} background="#ffffff" lineColor="#000000" />
                    </div>
                  </div>
                </div>
                
                {(() => {
                  const activeCustomer = customers.find((c: any) => c.id === saleDetails.sale.customer_id);
                  return (
                    <div className="flex justify-between mb-8">
                      <div>
                        <h3 className="font-bold text-sm mb-1 text-gray-800">Bill To</h3>
                        <p className="font-bold text-lg text-gray-900">{activeCustomer ? activeCustomer.name : 'Walk-in Customer'}</p>
                        {activeCustomer?.phone && <p className="text-sm text-gray-700">Contact No.: {activeCustomer.phone}</p>}
                      </div>
                      <div className="text-right">
                        <h3 className="font-bold text-sm mb-1 text-gray-800">Invoice Details</h3>
                        <p className="text-sm text-gray-700">Invoice No.: {saleDetails.sale.invoice_no}</p>
                        <p className="text-sm text-gray-700">Date: {new Date(saleDetails.sale.date).toLocaleDateString('en-GB').replace(/\//g, '-')}</p>
                      </div>
                    </div>
                  );
                })()}

                <table className="w-full text-sm mb-8 border-collapse">
                  <thead>
                    <tr className="bg-primary text-primary-foreground">
                      <th className="py-2 px-3 text-left w-12 border-r border-primary-foreground/20">#</th>
                      <th className="py-2 px-3 text-left border-r border-primary-foreground/20">Item Name</th>
                      <th className="py-2 px-3 text-center border-r border-primary-foreground/20">Quantity</th>
                      <th className="py-2 px-3 text-center border-r border-primary-foreground/20">Unit</th>
                      <th className="py-2 px-3 text-right border-r border-primary-foreground/20">Price/Unit</th>
                      <th className="py-2 px-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {saleDetails.items.map((item: any, idx: number) => {
                       const itemName = item.item_name || `Item #${item.item_id}`;
                       const variant = item.item_variant ? ` - ${item.item_variant}` : '';
                       const packing = item.units_per_ctn ? ` (${item.units_per_ctn})` : '';
                       const fullName = `${itemName}${variant}${packing}`;
                       const unit = item.units_per_ctn && item.units_per_ctn > 1 ? 'Ctn' : 'Pcs';

                       return (
                        <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50/50">
                          <td className="py-2 px-3 text-gray-600">{idx + 1}</td>
                          <td className="py-2 px-3 font-bold text-gray-800 uppercase">{fullName}</td>
                          <td className="py-2 px-3 text-center font-medium text-gray-700">{item.qty}</td>
                          <td className="py-2 px-3 text-center text-gray-600">{unit}</td>
                          <td className="py-2 px-3 text-right text-gray-700">{formatMoney(item.unit_price)}</td>
                          <td className="py-2 px-3 text-right font-medium text-gray-800">{formatMoney(item.line_total)}</td>
                        </tr>
                       )
                    })}
                    <tr className="font-bold border-b-[3px] border-gray-800">
                      <td colSpan={2} className="py-2 px-3 text-center text-gray-800">Total</td>
                      <td className="py-2 px-3 text-center text-gray-900">{saleDetails.items.reduce((acc: number, curr: any) => acc + curr.qty, 0)}</td>
                      <td colSpan={2}></td>
                      <td className="py-2 px-3 text-right text-gray-900">{formatMoney(saleDetails.sale.subtotal)}</td>
                    </tr>
                  </tbody>
                </table>

                <div className="flex justify-between items-start gap-8">
                  <div className="flex-1 mt-2">
                    <h4 className="font-bold text-sm mb-1 text-gray-800">Invoice Amount In Words</h4>
                    <p className="text-sm capitalize mb-6 text-gray-700">
                      {numberToWords(saleDetails.sale.net_total / 100)} Rupees only
                    </p>
                    
                    <h4 className="font-bold text-sm mb-1 text-gray-800">Terms And Conditions</h4>
                    <p className="text-sm text-gray-700">JAZAKALLAH o KHAIRAN</p>
                  </div>

                  <div className="w-[320px]">
                    <div className="flex justify-between py-1.5 text-sm text-gray-700">
                      <span>Sub Total</span>
                      <span>{formatMoney(saleDetails.sale.subtotal)}</span>
                    </div>
                    {saleDetails.sale.discount > 0 && (
                      <div className="flex justify-between py-1.5 text-sm text-red-600 font-medium">
                        <span>Discount</span>
                        <span>-{formatMoney(saleDetails.sale.discount)}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between py-2 text-sm font-bold bg-primary text-primary-foreground px-3 mt-1">
                      <span>Total</span>
                      <span>{formatMoney(saleDetails.sale.net_total)}</span>
                    </div>

                    <div className="flex justify-between py-1.5 text-sm mt-2 text-gray-700">
                      <span>Received</span>
                      <span>{formatMoney(saleDetails.sale.paid_amount)}</span>
                    </div>
                    <div className="flex justify-between py-1.5 text-sm font-medium text-gray-800 border-b border-gray-400">
                      <span>Balance</span>
                      <span>{formatMoney(Math.max(0, saleDetails.sale.net_total - saleDetails.sale.paid_amount))}</span>
                    </div>

                    {saleDetails.overheads && saleDetails.overheads.length > 0 && (
                       <div className="mt-6 border-t-2 border-dashed border-gray-300 pt-3">
                         <h4 className="text-[11px] font-bold text-gray-500 uppercase mb-2">Internal Overhead Expenses</h4>
                         {saleDetails.overheads.map((oh: any, i: number) => (
                           <div key={i} className="flex justify-between text-xs text-gray-600 mb-1">
                             <span>{oh.category_name}</span>
                             <span>{formatMoney(oh.amount)}</span>
                           </div>
                         ))}
                       </div>
                    )}
                  </div>
                </div>

                {/* Linked Returns Section */}
                {returns && returns.length > 0 && (
                  <div className="mt-12 pt-8 border-t-2 border-gray-200">
                    <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <RefreshCcw className="w-5 h-5 text-amber-600" />
                      Linked Credit Notes / Returns
                    </h3>
                    <div className="space-y-6">
                      {returns.map((ret: any) => (
                        <div key={ret.id} className="border rounded-lg p-4 bg-gray-50/50">
                          <div className="flex justify-between items-center mb-3 pb-3 border-b">
                            <div>
                              <span className="font-bold text-gray-800">{ret.return_no}</span>
                              <span className="text-xs text-gray-500 ml-3">{new Date(ret.date).toLocaleString()}</span>
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-lg text-gray-900">{formatMoney(ret.total_amount)}</span>
                            </div>
                          </div>
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-gray-500 border-b">
                                <th className="text-left pb-2 font-medium">Item</th>
                                <th className="text-center pb-2 font-medium">Qty</th>
                                <th className="text-right pb-2 font-medium">Unit Price</th>
                                <th className="text-right pb-2 font-medium">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {ret.items.map((item: any) => (
                                <tr key={item.id} className="border-b border-gray-100 last:border-0">
                                  <td className="py-2 text-gray-700">{item.item_name}</td>
                                  <td className="py-2 text-center text-gray-700">{item.qty}</td>
                                  <td className="py-2 text-right text-gray-700">{formatMoney(item.unit_price)}</td>
                                  <td className="py-2 text-right font-medium text-gray-800">{formatMoney(item.line_total)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          <div className="mt-3 pt-3 border-t flex justify-end gap-6 text-sm">
                            <span className="text-gray-600">Refund: <strong className="text-gray-900">{formatMoney(ret.refund_amount)}</strong></span>
                            <span className="text-gray-600">Credit: <strong className="text-gray-900">{formatMoney(ret.credit_amount)}</strong></span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <SaleReturnDialog 
        open={returnDialogOpen} 
        onOpenChange={setReturnDialogOpen}
        sale={saleDetails?.sale}
        items={saleDetails?.items || []}
      />
    </div>
  )
}

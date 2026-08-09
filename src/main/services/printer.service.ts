const ThermalPrinter = require('node-thermal-printer').printer
const PrinterTypes = require('node-thermal-printer').types
const path = require('path')

// In a real application, you'd store printer interface & port in the database/settings
// For now, we simulate the structure based on the spec
const defaultPrinterConfig = {
  type: PrinterTypes.EPSON,
  interface: 'tcp://127.0.0.1:9100', // Mock TCP to avoid missing native driver crashes on dev machines
}

export interface PrintReceiptInput {
  invoiceNo: string;
  customerName?: string;
  items: Array<{name: string, qty: number, price: number, lineTotal: number}>;
  subtotal: number;
  discount: number;
  netTotal: number;
  paidAmount: number;
  date: string;
  width?: 58 | 80;
}

export async function printReceipt(input: PrintReceiptInput): Promise<void> {
  try {
    const is58mm = input.width === 58
    const widthChars = is58mm ? 32 : 48
    
    const printer = new ThermalPrinter({
      type: PrinterTypes.EPSON,
      interface: defaultPrinterConfig.interface,
      width: widthChars,
      removeSpecialCharacters: false,
      lineCharacter: "="
    })

    // Logo
    printer.alignCenter()
    try {
      // Trying to load the logo if available
      const logoPath = process.env.NODE_ENV === 'development' 
        ? path.join(process.cwd(), 'resources', 'logo.png')
        : path.join(process.resourcesPath, 'logo.png')
      await printer.printImage(logoPath)
    } catch (e) {
      console.warn('Logo not found or could not be printed')
    }

    // Format Receipt Header
    printer.alignCenter()
    printer.setTextDoubleHeight(true)
    printer.setTextDoubleWidth(true)
    printer.bold(true)
    printer.println('KHAN TRADERS')
    
    printer.setTextDoubleHeight(false)
    printer.setTextDoubleWidth(false)
    printer.bold(false)
    printer.println('Whole Sale')
    printer.newLine()
    
    printer.bold(true)
    printer.println('Soft Drinks Wholesale Distributors')
    printer.bold(false)
    printer.drawLine()

    printer.alignLeft()
    printer.println('Address : Main Kohat Road Darwazgai Near Rahim Abad')
    printer.println('03139924928 tayeb whtsapp')
    printer.println('03469118339 tayeb whtsapp')
    printer.println('03489854823 tayeb 2 whtsapp')
    printer.println('03132626869 tayeb 2')
    printer.drawLine()

    printer.alignLeft()
    printer.println(`Invoice: ${input.invoiceNo}`)
    printer.println(`Date: ${new Date(input.date).toLocaleString()}`)
    if (input.customerName) {
      printer.println(`Party: ${input.customerName}`)
    }
    printer.drawLine()

    // Items
    printer.tableCustom([
      { text: 'Item', align: 'LEFT', width: is58mm ? 0.4 : 0.5 },
      { text: 'Qty', align: 'CENTER', width: is58mm ? 0.2 : 0.15 },
      { text: 'Price', align: 'RIGHT', width: is58mm ? 0.2 : 0.15 },
      { text: 'Total', align: 'RIGHT', width: is58mm ? 0.2 : 0.2 }
    ])
    
    printer.drawLine()

    for (const item of input.items) {
      printer.tableCustom([
        { text: item.name.substring(0, is58mm ? 12 : 20), align: 'LEFT', width: is58mm ? 0.4 : 0.5 },
        { text: item.qty.toString(), align: 'CENTER', width: is58mm ? 0.2 : 0.15 },
        { text: (item.price / 100).toFixed(0), align: 'RIGHT', width: is58mm ? 0.2 : 0.15 },
        { text: (item.lineTotal / 100).toFixed(0), align: 'RIGHT', width: is58mm ? 0.2 : 0.2 }
      ])
    }

    printer.drawLine()
    
    // Totals
    printer.alignRight()
    printer.println(`Subtotal: Rs ${(input.subtotal / 100).toFixed(0)}`)
    if (input.discount > 0) {
      printer.println(`Discount: Rs ${(input.discount / 100).toFixed(0)}`)
    }
    
    printer.bold(true)
    printer.println(`NET TOTAL: Rs ${(input.netTotal / 100).toFixed(0)}`)
    printer.bold(false)
    
    printer.println(`Paid: Rs ${(input.paidAmount / 100).toFixed(0)}`)
    
    const balance = input.netTotal - input.paidAmount
    if (balance > 0) {
      printer.println(`Remaining Balance: Rs ${(balance / 100).toFixed(0)}`)
    }

    printer.drawLine()
    
    // Custom Greeting & Barcode
    printer.alignCenter()
    printer.println('Thank you for your business!')
    printer.println('JAZAKALLAH o KHAIRAN')
    printer.newLine()
    
    // Print Barcode of Invoice No
    // 73 is CODE128 in ESC/POS
    // hriPos: 2 means print text below barcode
    printer.printBarcode(input.invoiceNo, 73, { width: 2, height: 60, hriPos: 2, hriFont: 0 })
    
    printer.cut()

    await printer.execute()
  } catch (error) {
    console.warn('Physical printer not configured or offline. Skipping print.', error)
  }
}

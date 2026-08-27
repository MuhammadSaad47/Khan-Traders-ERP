const ThermalPrinter = require('node-thermal-printer').printer
const PrinterTypes = require('node-thermal-printer').types
const path = require('path')
import { db } from '../db/connection'

export interface PrinterConfig {
  interface: string     // e.g. "printer:EPSON TM-T88V" on Windows USB, "tcp://192.168.1.100:9100" for network
  type: string          // EPSON | STAR
  width: 58 | 80        // paper width in mm
}

/**
 * Loads the printer configuration from the database.
 * Falls back to null if not configured, which causes printing to be skipped gracefully.
 */
export async function getPrinterConfig(): Promise<PrinterConfig | null> {
  try {
    const settings = await db
      .selectFrom('business_settings')
      .select('printer_interface')
      .select('printer_type')
      .select('printer_width')
      .executeTakeFirst()

    if (!settings?.printer_interface) {
      return null // Not configured yet
    }

    return {
      interface: settings.printer_interface,
      type: settings.printer_type || 'EPSON',
      width: (settings.printer_width === 58 ? 58 : 80) as 58 | 80,
    }
  } catch {
    return null
  }
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

/**
 * Builds and executes a ThermalPrinter instance from the given config.
 * Throws on connection/print error so callers can decide how to handle it.
 */
async function buildAndExecute(config: PrinterConfig, buildFn: (p: any, is58mm: boolean, widthChars: number) => void): Promise<void> {
  const printerType = config.type === 'STAR' ? PrinterTypes.STAR : PrinterTypes.EPSON
  const is58mm = config.width === 58
  const widthChars = is58mm ? 32 : 48

  const printer = new ThermalPrinter({
    type: printerType,
    interface: config.interface,
    width: widthChars,
    removeSpecialCharacters: false,
    lineCharacter: '='
  })

  buildFn(printer, is58mm, widthChars)
  await printer.execute()
}

export async function testPrint(): Promise<{ success: boolean; error?: string }> {
  try {
    const config = await getPrinterConfig()
    if (!config) {
      return { success: false, error: 'Printer not configured. Please set the printer interface in Settings → Printer.' }
    }

    await buildAndExecute(config, (printer, is58mm, _widthChars) => {
      printer.alignCenter()
      printer.setTextDoubleHeight(true)
      printer.bold(true)
      printer.println('PRINTER TEST')
      printer.setTextDoubleHeight(false)
      printer.bold(false)
      printer.newLine()
      printer.drawLine()
      printer.alignLeft()
      printer.println('Khan Traders POS System')
      printer.println(`Interface: ${config.interface}`)
      printer.println(`Paper: ${config.width}mm`)
      printer.println(`Date: ${new Date().toLocaleString()}`)
      printer.drawLine()
      printer.alignCenter()
      printer.println('** Test Successful! **')
      printer.println('Printer is working correctly.')
      if (!is58mm) printer.newLine()
      printer.cut()
    })

    return { success: true }
  } catch (error: any) {
    console.error('Test print failed:', error)
    return { success: false, error: error?.message || 'Unknown printer error' }
  }
}

export async function printReceipt(input: PrintReceiptInput): Promise<void> {
  try {
    const config = await getPrinterConfig()
    if (!config) {
      console.warn('Printer not configured — skipping print. Go to Settings → Printer to configure.')
      return
    }

    // Allow per-print override of paper width (from the 58mm/80mm buttons in POS)
    const effectiveConfig: PrinterConfig = {
      ...config,
      width: input.width ?? config.width
    }

    await buildAndExecute(effectiveConfig, (printer, is58mm, _widthChars) => {
      // ── Logo ──────────────────────────────────────────────────────────────
      printer.alignCenter()
      try {
        const logoPath = process.env.NODE_ENV === 'development'
          ? path.join(process.cwd(), 'resources', 'logo.png')
          : path.join(process.resourcesPath, 'logo.png')
        printer.printImage(logoPath)
      } catch (e) {
        console.warn('Logo not found or could not be printed')
      }

      // ── Header ────────────────────────────────────────────────────────────
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

      // ── Contact ───────────────────────────────────────────────────────────
      printer.alignLeft()
      printer.println('Address : Main Kohat Road Darwazgai Near Rahim Abad')
      printer.println('03139924928 tayeb whtsapp')
      printer.println('03469118339 tayeb whtsapp')
      printer.println('03489854823 tayeb 2 whtsapp')
      printer.println('03132626869 tayeb 2')
      printer.drawLine()

      // ── Invoice Info ──────────────────────────────────────────────────────
      printer.alignLeft()
      printer.println(`Invoice: ${input.invoiceNo}`)
      printer.println(`Date: ${new Date(input.date).toLocaleString()}`)
      if (input.customerName) {
        printer.println(`Party: ${input.customerName}`)
      }
      printer.drawLine()

      // ── Items Header ──────────────────────────────────────────────────────
      printer.tableCustom([
        { text: 'Item',  align: 'LEFT',   width: is58mm ? 0.4 : 0.5 },
        { text: 'Qty',   align: 'CENTER', width: is58mm ? 0.2 : 0.15 },
        { text: 'Price', align: 'RIGHT',  width: is58mm ? 0.2 : 0.15 },
        { text: 'Total', align: 'RIGHT',  width: is58mm ? 0.2 : 0.2  }
      ])
      printer.drawLine()

      // ── Items ─────────────────────────────────────────────────────────────
      for (const item of input.items) {
        printer.tableCustom([
          { text: item.name.substring(0, is58mm ? 12 : 20), align: 'LEFT',   width: is58mm ? 0.4 : 0.5 },
          { text: item.qty.toString(),                       align: 'CENTER', width: is58mm ? 0.2 : 0.15 },
          { text: (item.price / 100).toFixed(0),             align: 'RIGHT',  width: is58mm ? 0.2 : 0.15 },
          { text: (item.lineTotal / 100).toFixed(0),         align: 'RIGHT',  width: is58mm ? 0.2 : 0.2  }
        ])
      }
      printer.drawLine()

      // ── Totals ────────────────────────────────────────────────────────────
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

      // ── Footer ────────────────────────────────────────────────────────────
      printer.alignCenter()
      printer.println('Thank you for your business!')
      printer.println('JAZAKALLAH o KHAIRAN')
      printer.newLine()

      // Barcode of Invoice No (CODE128)
      printer.printBarcode(input.invoiceNo, 73, { width: 2, height: 60, hriPos: 2, hriFont: 0 })
      printer.cut()
    })
  } catch (error) {
    console.warn('Physical printer error. Skipping print.', error)
  }
}

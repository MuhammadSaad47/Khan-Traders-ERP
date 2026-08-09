import Barcode from 'react-barcode';
import logo from '../assets/receipt_logo.png';

interface ThermalReceiptProps {
  data: {
    invoiceNo: string;
    customerName?: string;
    items: Array<{name: string, qty: number, price: number, lineTotal: number}>;
    subtotal: number;
    discount: number;
    netTotal: number;
    paidAmount: number;
    date: string;
    width?: 58 | 80;
  };
}

export function ThermalReceipt({ data }: ThermalReceiptProps) {
  const is58 = data.width === 58;
  const maxWidth = is58 ? 'w-[58mm]' : 'w-[80mm]';
  const fontSize = is58 ? 'text-[10px]' : 'text-xs';
  const padding = is58 ? 'p-2' : 'p-4';

  const formatMoney = (paisa: number) => (paisa / 100).toFixed(0);

  return (
    <div className={`bg-white text-black font-sans mx-auto shadow-md border border-gray-200 ${maxWidth} ${padding} flex flex-col items-center tracking-tight`}>
      {/* Header */}
      <div className="text-center w-full mb-1 flex flex-col items-center">
        <img src={logo} alt="Khan Traders Logo" className="h-[4.5rem] w-auto object-contain mix-blend-multiply" />
        <h1 className="font-black text-2xl leading-none tracking-tight -mt-2">KHAN TRADERS</h1>
        <h2 className="font-bold text-lg leading-tight mt-1">Whole Sale</h2>
        <p className={`${fontSize} font-bold leading-tight mt-0.5`}>Soft Drinks Wholesale Distributors</p>
      </div>

      {/* Address */}
      <div className={`text-center w-full ${fontSize} mb-2 leading-tight`}>
        <div className="w-full border-t-2 border-black border-dashed my-1"></div>
        <p className="whitespace-pre-line text-center py-0.5">
          Address : Main Kohat Road Darwazgai{'\n'}
          Near Rahim Abad{'\n'}
          03139924928 tayeb whtsapp
        </p>
        <div className="w-full border-t-2 border-black border-dashed my-1"></div>
      </div>

      {/* Details */}
      <div className={`w-full ${fontSize} font-bold mb-2 text-left leading-tight`}>
        <p>Invoice: {data.invoiceNo}</p>
        <p>Date: {new Date(data.date).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}</p>
        {data.customerName && <p>Party: {data.customerName}</p>}
      </div>

      {/* Items Table */}
      <table className={`w-full ${fontSize} text-left mb-2 border-collapse`}>
        <thead>
          <tr className="border-t-2 border-b-2 border-black border-dashed">
            <th className="py-1 font-bold">Item</th>
            <th className="py-1 font-bold text-center">Qty</th>
            <th className="py-1 font-bold text-right">Price</th>
            <th className="py-1 font-bold text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((item, idx) => (
            <tr key={idx} className="align-top">
              <td className="py-1 pr-1 truncate max-w-[120px]">{item.name}</td>
              <td className="py-1 text-center">{item.qty}</td>
              <td className="py-1 text-right">{formatMoney(item.price)}</td>
              <td className="py-1 text-right">{formatMoney(item.lineTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className={`w-full ${fontSize} text-right mb-2 leading-tight flex flex-col items-end`}>
        <div className="w-full border-t-2 border-black border-dashed my-1"></div>
        <p className="mt-0.5">Subtotal: Rs {formatMoney(data.subtotal)}</p>
        {data.discount > 0 && <p>Discount: Rs {formatMoney(data.discount)}</p>}
        <p className="font-black text-base mt-1.5 mb-1.5 tracking-tight">NET TOTAL: Rs {formatMoney(data.netTotal)}</p>
        <p>Paid: Rs {formatMoney(data.paidAmount)}</p>
        {(data.netTotal - data.paidAmount > 0) && (
          <p>Remaining Balance: Rs {formatMoney(data.netTotal - data.paidAmount)}</p>
        )}
        <div className="w-full border-t-2 border-black border-dashed mt-1.5 mb-1"></div>
      </div>

      <div className={`w-full flex justify-between font-bold ${fontSize} mb-2 leading-tight`}>
        <span>Total Items: {data.items.length}</span>
        <span>Total Qty: {data.items.reduce((acc, i) => acc + i.qty, 0)}</span>
      </div>

      {/* Footer */}
      <div className={`w-full text-center ${fontSize} mb-4 leading-tight`}>
        <p>Thank you for your business!</p>
        <p>JAZAKALLAH o KHAIRAN</p>
      </div>

      {/* Barcode */}
      <div className="w-full flex justify-center mt-2 mb-1 overflow-hidden">
        <Barcode 
          value={data.invoiceNo} 
          width={is58 ? 1.2 : 1.5} 
          height={is58 ? 30 : 40} 
          fontSize={10} 
          displayValue={true} 
          margin={0} 
          background="transparent" 
          lineColor="#000000" 
        />
      </div>
      <div className="w-full border-t-2 border-black border-dashed mt-2"></div>
    </div>
  );
}

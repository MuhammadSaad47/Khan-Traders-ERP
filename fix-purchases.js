const fs = require('fs');
const path = './src/renderer/src/pages/purchases/PurchasesPage.tsx';
let code = fs.readFileSync(path, 'utf8');

// Add global supplierFilter state
code = code.replace(
  /const \[dateFilter, setDateFilter\] = useState<any>\('all'\)/,
  "const [dateFilter, setDateFilter] = useState<any>('all')\n  const [supplierFilter, setSupplierFilter] = useState<any>('all')"
);

// Add supplier filtering logic to filteredPurchases
code = code.replace(
  /return matchesSearch && matchesDate;/,
  "const matchesSupplier = supplierFilter === 'all' || p.supplier_id?.toString() === supplierFilter;\n    return matchesSearch && matchesDate && matchesSupplier;"
);

// Add Supplier Filter Dropdown in history view
code = code.replace(
  /<Select value=\{dateFilter\} onValueChange=\{setDateFilter\}>([\s\S]*?)<\/Select>/,
  `<Select value={dateFilter} onValueChange={setDateFilter}>
            $1
          </Select>
          <Select value={supplierFilter} onValueChange={setSupplierFilter}>
            <SelectTrigger className="w-[180px] bg-background border-primary/20 hover:border-primary/50 transition-colors h-11">
              <SelectValue placeholder="Filter by Supplier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Suppliers</SelectItem>
              {suppliers.map((s: any) => (
                <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>`
);

// Filter purchase items dropdown based on selected supplier in the Add Purchase modal
code = code.replace(
  /const itemOptions = items\.map\(\(i: any\) => \(\{ value: i\.id\.toString\(\), label: i\.name \}\)\)/,
  `const filteredDropdownItems = supplierId ? items.filter((i: any) => i.supplier_id?.toString() === supplierId || (supplierId && isNaN(Number(supplierId)))) : items;
  const itemOptions = filteredDropdownItems.map((i: any) => ({ value: i.id.toString(), label: i.name }))`
);

fs.writeFileSync(path, code);

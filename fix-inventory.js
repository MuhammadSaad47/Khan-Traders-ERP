const fs = require('fs');
const path = './src/renderer/src/pages/inventory/InventoryPage.tsx';
let code = fs.readFileSync(path, 'utf8');

// Add supplierFilter state
code = code.replace(
  /const \[stockFilter, setStockFilter\] = useState\('all'\)/,
  "const [stockFilter, setStockFilter] = useState('all')\n  const [supplierFilter, setSupplierFilter] = useState('all')"
);

// Add supplier filtering logic to filteredItems
code = code.replace(
  /return matchesSearch && matchesStock;/,
  "const matchesSupplier = supplierFilter === 'all' || item.supplier_id?.toString() === supplierFilter;\n    return matchesSearch && matchesStock && matchesSupplier;"
);

// Get unique supplier options for filtering
code = code.replace(
  /const supplierOptions = suppliers\.map\(\(s: any\) => \(\{ value: s\.id\.toString\(\), label: s\.name \}\)\)/,
  `const supplierOptions = suppliers.map((s: any) => ({ value: s.id.toString(), label: s.name }))
  const inventorySupplierIds = new Set(items.filter((i: any) => i.supplier_id).map((i: any) => i.supplier_id))
  const inventorySupplierOptions = suppliers.filter((s: any) => inventorySupplierIds.has(s.id)).map((s: any) => ({ value: s.id.toString(), label: s.name }))`
);

// Add Supplier Filter Dropdown and Total Items Indicator
code = code.replace(
  /<Select value=\{stockFilter\} onValueChange=\{setStockFilter\}>([\s\S]*?)<\/Select>/,
  `<Select value={stockFilter} onValueChange={setStockFilter}>
            $1
          </Select>
          <Select value={supplierFilter} onValueChange={setSupplierFilter}>
            <SelectTrigger className="w-[180px] bg-background border-primary/20 hover:border-primary/50 transition-colors h-11">
              <SelectValue placeholder="Filter by Supplier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Suppliers</SelectItem>
              {inventorySupplierOptions.map((s: any) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>`
);

// Add Total Items Indicator above table
code = code.replace(
  /<div className="border rounded-xl shadow-sm bg-card overflow-hidden border-primary\/10">/,
  `<div className="mb-4 text-sm font-semibold text-primary">
            Total Items: {filteredItems.length}
          </div>
          <div className="border rounded-xl shadow-sm bg-card overflow-hidden border-primary/10">`
);

// Remove 'variant' from form submit
code = code.replace(
  /const variant = \(form\.elements\.namedItem\('variant'\) as HTMLInputElement\)\.value/,
  "const variant = ''"
);

// Remove 'variant' input from Modal UI
code = code.replace(
  /<div className="space-y-2">\s*<label className="text-sm font-medium">Flavor \/ Variant<\/label>\s*<Input name="variant" defaultValue=\{editingItem\?.variant\} \/>\s*<\/div>/,
  ""
);

fs.writeFileSync(path, code);

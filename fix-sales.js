const fs = require('fs');
const path = './src/renderer/src/pages/sales/SalesPage.tsx';
let code = fs.readFileSync(path, 'utf8');

// Add global customerFilter state
code = code.replace(
  /const \[dateFilter, setDateFilter\] = useState<any>\('all'\)/,
  "const [dateFilter, setDateFilter] = useState<any>('all')\n  const [customerFilter, setCustomerFilter] = useState<any>('all')"
);

// Add customer filtering logic to filteredSales
code = code.replace(
  /return matchesSearch && matchesDate;/,
  "const matchesCustomer = customerFilter === 'all' || sale.customer_id?.toString() === customerFilter;\n    return matchesSearch && matchesDate && matchesCustomer;"
);

// Add Customer Filter Dropdown in history view
code = code.replace(
  /<Select value=\{dateFilter\} onValueChange=\{setDateFilter\}>([\s\S]*?)<\/Select>/,
  `<Select value={dateFilter} onValueChange={setDateFilter}>
            $1
          </Select>
          <Select value={customerFilter} onValueChange={setCustomerFilter}>
            <SelectTrigger className="w-[180px] bg-background border-primary/20 hover:border-primary/50 transition-colors h-11">
              <SelectValue placeholder="Filter by Customer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Customers</SelectItem>
              {customers.map((c: any) => (
                <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>`
);

fs.writeFileSync(path, code);

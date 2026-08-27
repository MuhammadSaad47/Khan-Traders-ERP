const fs = require('fs');
const path = './src/main/services/parties.service.ts';
let code = fs.readFileSync(path, 'utf8');

const uniqueFunc = `
async function enforceUniqueParty(name, address, type, excludeId) {
  if (!name) return;
  const addressQuery = address ? address.trim().toLowerCase() : '';
  let query = db.selectFrom(type === 'customer' ? 'customers' : 'suppliers')
    .selectAll()
    .where(db.fn('lower', 'name'), '=', name.trim().toLowerCase())
    .where('is_deleted', '=', 0);
    
  if (excludeId) {
    query = query.where('id', '!=', excludeId);
  }
  
  const existing = await query.execute();
  const duplicate = existing.find(p => (p.address ? p.address.trim().toLowerCase() : '') === addressQuery);
  
  if (duplicate) {
    throw new Error(\`A \${type} with the same name and address already exists.\`);
  }
}
`;

if (!code.includes('enforceUniqueParty')) {
  code = code.replace(/export async function getCustomers\(\) \{/, uniqueFunc + '\nexport async function getCustomers() {');
}

code = code.replace(/await enforceUniquePhone\(input\.phone, 'customer'\)/g, 
  "await enforceUniquePhone(input.phone, 'customer')\n  await enforceUniqueParty(input.name, input.address, 'customer')");
code = code.replace(/await enforceUniquePhone\(input\.phone, 'customer', id\)/g, 
  "await enforceUniquePhone(input.phone, 'customer', id)\n  await enforceUniqueParty(input.name, input.address, 'customer', id)");

code = code.replace(/await enforceUniquePhone\(input\.phone, 'supplier'\)/g, 
  "await enforceUniquePhone(input.phone, 'supplier')\n  await enforceUniqueParty(input.name, input.address, 'supplier')");
code = code.replace(/await enforceUniquePhone\(input\.phone, 'supplier', id\)/g, 
  "await enforceUniquePhone(input.phone, 'supplier', id)\n  await enforceUniqueParty(input.name, input.address, 'supplier', id)");

fs.writeFileSync(path, code);

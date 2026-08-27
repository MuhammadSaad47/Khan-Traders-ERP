const fs = require('fs');
const path = './src/main/services/catalog.service.ts';
let code = fs.readFileSync(path, 'utf8');

const uniqueFunc = `
async function enforceUniqueItem(input, excludeId) {
  let query = db.selectFrom('items')
    .selectAll()
    .where(db.fn('lower', 'name'), '=', (input.name || '').trim().toLowerCase())
    .where('supplier_id', '=', input.supplier_id || null)
    .where('is_deleted', '=', 0);

  if (excludeId) {
    query = query.where('id', '!=', excludeId);
  }

  const existingItems = await query.execute();
  const duplicate = existingItems.find(item => {
    const sizeMatch = (item.size || '').trim().toLowerCase() === (input.size || '').trim().toLowerCase();
    const pkgMatch = (item.packaging || '').trim().toLowerCase() === (input.packaging || '').trim().toLowerCase();
    return sizeMatch && pkgMatch;
  });

  if (duplicate) {
    throw new Error('An identical item (same name, size, and packaging) already exists for this supplier.');
  }
}
`;

if (!code.includes('enforceUniqueItem')) {
  code = code.replace(/export async function getItems\(\) \{/, uniqueFunc + '\nexport async function getItems() {');
}

code = code.replace(/export async function createItem\(input: ItemInput, userId: number\) \{/g, 
  "export async function createItem(input: ItemInput, userId: number) {\n  await enforceUniqueItem(input);");
code = code.replace(/export async function updateItem\(id: number, input: ItemInput, userId: number\) \{/g, 
  "export async function updateItem(id: number, input: ItemInput, userId: number) {\n  await enforceUniqueItem(input, id);");

fs.writeFileSync(path, code);

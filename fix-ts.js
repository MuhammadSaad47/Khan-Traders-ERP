const fs = require('fs');

let catCode = fs.readFileSync('./src/main/services/catalog.service.ts', 'utf8');
catCode = catCode.replace(/db\.fn\('lower', 'name'\)/g, "sql<string>\\`lower(name)\\`");
catCode = catCode.replace(/async function enforceUniqueItem\(input, excludeId\) {/g, "import { sql } from 'kysely'\nasync function enforceUniqueItem(input: any, excludeId?: number) {");
fs.writeFileSync('./src/main/services/catalog.service.ts', catCode);

let partyCode = fs.readFileSync('./src/main/services/parties.service.ts', 'utf8');
partyCode = partyCode.replace(/db\.fn\('lower', 'name'\)/g, "sql<string>\\`lower(name)\\`");
partyCode = partyCode.replace(/async function enforceUniqueParty\(name, address, type, excludeId\) {/g, "import { sql } from 'kysely'\nasync function enforceUniqueParty(name: string, address: string | undefined, type: string, excludeId?: number) {");
fs.writeFileSync('./src/main/services/parties.service.ts', partyCode);

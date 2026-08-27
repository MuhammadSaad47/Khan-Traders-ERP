const mockApp = { getPath: () => '/home/saad-afridi/.config/khan-trader/' }
require('module').Module._cache[require.resolve('electron')] = {
  id: 'electron',
  exports: { app: mockApp },
  loaded: true
}

import { getCustomerStatement } from './src/main/services/parties.service'
async function run() {
  try {
    const data = await getCustomerStatement(1, '2026-08-01T00:00:00.000Z', '2026-08-30T23:59:59.999Z')
    console.log("SUCCESS:", JSON.stringify(data, null, 2))
  } catch(e) {
    console.error("ERROR:", e)
  }
}
run()

const { initDB } = require('./out/main/db/connection.js');
const { getVanAssignmentReport } = require('./out/main/services/van_sales.service.js');

async function run() {
  try {
    const report = await getVanAssignmentReport(1);
    console.log("Success", Object.keys(report));
  } catch (err) {
    console.error("IPC Error:", err);
  }
}
run();

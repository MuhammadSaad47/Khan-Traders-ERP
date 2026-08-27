import { getVanAssignmentReport } from './src/main/services/van_sales.service';

async function test() {
  try {
    const report = await getVanAssignmentReport(1);
    console.log("Success");
  } catch (err: any) {
    console.log("Error:", err.message);
  }
}
test();

import { getCustomerStatement } from './src/main/services/parties.service';

async function test() {
  try {
    const res = await getCustomerStatement(1, '2026-07-01', '2026-08-30');
    console.log("Success:", res);
  } catch (err: any) {
    console.log("Error:", err.message, err.stack);
  }
}
test();

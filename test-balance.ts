import { validateAccountBalance } from './src/main/services/base.service';

async function test() {
  try {
    await validateAccountBalance(1, 100, undefined, 'Test Error');
    console.log("Did not throw!");
  } catch (err: any) {
    console.log("Caught:", err.message);
  }
}
test();

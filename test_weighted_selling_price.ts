// Test weighted selling price calculation with REAL data

const items = [
  { 
    id: 12, 
    name: 'zor', 
    cost_price: 100000,  // Rs 1000
    selling_price: 106000, // Rs 1060
    current_stock: 100 
  },
  { 
    id: 14, 
    name: 'zor', 
    cost_price: 98000,   // Rs 980
    selling_price: 104000, // Rs 1040
    current_stock: 130 
  }
]

let groupedMap = new Map()

for (const item of items) {
  const key = item.name
  
  if (!groupedMap.has(key)) {
    groupedMap.set(key, {
      ...item,
      grouped_ids: [item.id],
      grouped_costs: [item.cost_price],
      grouped_selling_prices: [item.selling_price],
      combined_stock: item.current_stock,
      weighted_cost: item.cost_price,
      total_cost_value: item.current_stock * item.cost_price,
      total_selling_value: item.current_stock * item.selling_price
    })
  } else {
    const existing = groupedMap.get(key)!
    
    const totalStock = existing.combined_stock + item.current_stock
    const totalValue = existing.total_cost_value + (item.current_stock * item.cost_price)
    const totalSellingValue = existing.total_selling_value + (item.current_stock * item.selling_price)
    
    const allCosts = [...existing.grouped_costs, item.cost_price]
    const allSellingPrices = [...existing.grouped_selling_prices, item.selling_price]
    
    let weightedCost, weightedSellingPrice
    
    if (totalStock > 0) {
      weightedCost = Math.round(totalValue / totalStock)
      weightedSellingPrice = Math.round(totalSellingValue / totalStock)
    } else {
      weightedCost = Math.round(allCosts.reduce((sum, c) => sum + c, 0) / allCosts.length)
      weightedSellingPrice = Math.round(allSellingPrices.reduce((sum, p) => sum + p, 0) / allSellingPrices.length)
    }
    
    groupedMap.set(key, {
      ...existing,
      grouped_ids: [...existing.grouped_ids, item.id],
      grouped_costs: allCosts,
      grouped_selling_prices: allSellingPrices,
      combined_stock: totalStock,
      weighted_cost: weightedCost,
      selling_price: weightedSellingPrice,
      total_cost_value: totalValue,
      total_selling_value: totalSellingValue,
    })
  }
}

const result = Array.from(groupedMap.values())[0]

console.log('\n=== WEIGHTED CALCULATION TEST (Real Data) ===')
console.log('\nItem 1 (ismail-pepsi): 100 ctns')
console.log('  Cost: Rs 1000, Sell: Rs 1060')
console.log('  Total Cost Value: Rs 100,000, Total Sell Value: Rs 106,000')

console.log('\nItem 2 (Sufi Group): 130 ctns')
console.log('  Cost: Rs 980, Sell: Rs 1040')
console.log('  Total Cost Value: Rs 127,400, Total Sell Value: Rs 135,200')

console.log('\n--- TOTALS ---')
console.log(`Total Stock: ${result.combined_stock} ctns`)
console.log(`Total Cost Value: Rs ${result.total_cost_value / 100}`)
console.log(`Total Selling Value: Rs ${result.total_selling_value / 100}`)

console.log('\n--- WEIGHTED AVERAGES ---')
console.log(`Weighted Cost: Rs ${result.weighted_cost / 100} (${result.weighted_cost})`)
console.log(`Weighted Selling Price: Rs ${result.selling_price / 100} (${result.selling_price})`)

console.log('\n--- EXPECTED VALUES ---')
const expectedCost = Math.round((100 * 100000 + 130 * 98000) / 230)
const expectedSell = Math.round((100 * 106000 + 130 * 104000) / 230)
console.log(`Expected Weighted Cost: Rs ${expectedCost / 100} (${expectedCost})`)
console.log(`Expected Weighted Selling: Rs ${expectedSell / 100} (${expectedSell})`)

console.log('\n--- VALIDATION ---')
console.log(`Cost Match: ${result.weighted_cost === expectedCost ? '✅ PASS' : '❌ FAIL'}`)
console.log(`Selling Match: ${result.selling_price === expectedSell ? '✅ PASS' : '❌ FAIL'}`)

console.log('\n--- PROFIT ANALYSIS ---')
const profit = result.selling_price - result.weighted_cost
const profitPercent = ((profit / result.weighted_cost) * 100).toFixed(2)
console.log(`Profit per ctn: Rs ${profit / 100} (${profitPercent}%)`)

// Test weighted cost calculation

// Scenario: 2 items with 0 stock
const items = [
  { id: 14, name: 'zor', cost_price: 98000, current_stock: 0 }, // Rs 980
  { id: 12, name: 'zor', cost_price: 100000, current_stock: 0 }, // Rs 1000
]

let groupedMap = new Map()

for (const item of items) {
  const key = item.name
  
  if (!groupedMap.has(key)) {
    groupedMap.set(key, {
      ...item,
      grouped_ids: [item.id],
      grouped_costs: [item.cost_price],
      combined_stock: item.current_stock,
      weighted_cost: item.cost_price,
      total_cost_value: item.current_stock * item.cost_price
    })
  } else {
    const existing = groupedMap.get(key)!
    
    const totalStock = existing.combined_stock + item.current_stock
    const totalValue = existing.total_cost_value + (item.current_stock * item.cost_price)
    
    const allCosts = [...existing.grouped_costs, item.cost_price]
    
    let weightedCost
    if (totalStock > 0) {
      weightedCost = Math.round(totalValue / totalStock)
    } else {
      // Simple average when no stock
      weightedCost = Math.round(allCosts.reduce((sum, c) => sum + c, 0) / allCosts.length)
    }
    
    groupedMap.set(key, {
      ...existing,
      grouped_ids: [...existing.grouped_ids, item.id],
      grouped_costs: allCosts,
      combined_stock: totalStock,
      weighted_cost: weightedCost,
      total_cost_value: totalValue,
    })
  }
}

const result = Array.from(groupedMap.values())[0]

console.log('\n=== Test: Weighted Cost with 0 Stock ===')
console.log('Item 1: Rs 980 (cost_price: 98000), stock: 0')
console.log('Item 2: Rs 1000 (cost_price: 100000), stock: 0')
console.log('\nExpected weighted cost: Rs 990 (average of 980 and 1000)')
console.log(`Actual weighted cost: Rs ${result.weighted_cost / 100} (cost_price: ${result.weighted_cost})`)
console.log(`Combined stock: ${result.combined_stock}`)
console.log('\n✅ Result:', result.weighted_cost === 99000 ? 'PASS' : 'FAIL')

// Scenario 2: With stock
console.log('\n\n=== Test: Weighted Cost WITH Stock ===')
const items2 = [
  { id: 14, name: 'zor', cost_price: 104000, current_stock: 10 }, // Rs 1040
  { id: 12, name: 'zor', cost_price: 106000, current_stock: 10 }, // Rs 1060
]

groupedMap = new Map()

for (const item of items2) {
  const key = item.name
  
  if (!groupedMap.has(key)) {
    groupedMap.set(key, {
      ...item,
      grouped_ids: [item.id],
      grouped_costs: [item.cost_price],
      combined_stock: item.current_stock,
      weighted_cost: item.cost_price,
      total_cost_value: item.current_stock * item.cost_price
    })
  } else {
    const existing = groupedMap.get(key)!
    
    const totalStock = existing.combined_stock + item.current_stock
    const totalValue = existing.total_cost_value + (item.current_stock * item.cost_price)
    
    const allCosts = [...existing.grouped_costs, item.cost_price]
    
    let weightedCost
    if (totalStock > 0) {
      weightedCost = Math.round(totalValue / totalStock)
    } else {
      weightedCost = Math.round(allCosts.reduce((sum, c) => sum + c, 0) / allCosts.length)
    }
    
    groupedMap.set(key, {
      ...existing,
      grouped_ids: [...existing.grouped_ids, item.id],
      grouped_costs: allCosts,
      combined_stock: totalStock,
      weighted_cost: weightedCost,
      total_cost_value: totalValue,
    })
  }
}

const result2 = Array.from(groupedMap.values())[0]

console.log('Item 1: Rs 1040 (cost_price: 104000), stock: 10')
console.log('Item 2: Rs 1060 (cost_price: 106000), stock: 10')
console.log('\nExpected weighted cost: Rs 1050 ((10×1040 + 10×1060) / 20)')
console.log(`Actual weighted cost: Rs ${result2.weighted_cost / 100} (cost_price: ${result2.weighted_cost})`)
console.log(`Combined stock: ${result2.combined_stock}`)
console.log('\n✅ Result:', result2.weighted_cost === 105000 ? 'PASS' : 'FAIL')

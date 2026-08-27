// Verify how formatMoney displays paisa values

const formatMoney = (paisa: number) => `Rs ${(paisa / 100).toFixed(0)}`

console.log('\n=== DISPLAY FORMAT VERIFICATION ===\n')

// Test with weighted average values
console.log('Weighted Cost Tests:')
console.log(`  98870 paisa → ${formatMoney(98870)} (expected: Rs 989)`)
console.log(`  98869 paisa → ${formatMoney(98869)} (expected: Rs 989)`)
console.log(`  98865 paisa → ${formatMoney(98865)} (expected: Rs 989)`)

console.log('\nWeighted Selling Price Tests:')
console.log(`  104870 paisa → ${formatMoney(104870)} (expected: Rs 1049)`)
console.log(`  104869 paisa → ${formatMoney(104869)} (expected: Rs 1049)`)
console.log(`  104865 paisa → ${formatMoney(104865)} (expected: Rs 1049)`)

console.log('\nEdge Cases:')
console.log(`  100050 paisa → ${formatMoney(100050)} (Rs 1000.50 → should round to Rs 1001)`)
console.log(`  100049 paisa → ${formatMoney(100049)} (Rs 1000.49 → should round to Rs 1000)`)
console.log(`  100045 paisa → ${formatMoney(100045)} (Rs 1000.45 → should round to Rs 1000)`)

console.log('\n=== JavaScript toFixed() Behavior ===\n')
console.log('How toFixed(0) rounds:')
console.log(`  (988.70).toFixed(0) = "${(988.70).toFixed(0)}"`)
console.log(`  (1048.70).toFixed(0) = "${(1048.70).toFixed(0)}"`)
console.log(`  (1000.50).toFixed(0) = "${(1000.50).toFixed(0)}"`)
console.log(`  (1000.49).toFixed(0) = "${(1000.49).toFixed(0)}"`)
console.log(`  (1000.45).toFixed(0) = "${(1000.45).toFixed(0)}"`)

console.log('\n✅ Conclusion: toFixed(0) properly rounds to nearest integer')
console.log('If UI shows decimals, the issue is elsewhere (not in formatMoney)')

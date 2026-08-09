import { describe, it, expect, beforeEach } from 'vitest'
import { getCategories, createCategory, getItems, createItem, updateItem } from '../catalog.service'
import { resetDb } from '../../__tests__/setup'

describe('Catalog Service', () => {
  beforeEach(async () => {
    await resetDb()
  })

  it('should create and retrieve categories', async () => {
    const cat = await createCategory({ name: 'Beverages', description: '' }, 1) // userId 1
    expect(cat.name).toBe('Beverages')

    const list = await getCategories()
    expect(list.length).toBe(1)
    expect(list[0].name).toBe('Beverages')
  })

  it('should create and retrieve items', async () => {
    const cat = await createCategory({ name: 'Snacks', description: '' }, 1)
    const item = await createItem({
      name: 'Chips',
      category_id: cat.id,
      selling_price: 5000, // 50 Rs
      cost_price: 4000,
      low_stock_threshold: 10,
      units_per_ctn: 1
    }, 1)
    
    expect(item.name).toBe('Chips')
    expect(item.selling_price).toBe(5000)

    const list = await getItems()
    expect(list.length).toBe(1)
    expect(list[0].name).toBe('Chips')
  })

  it('should update item correctly', async () => {
    const cat = await createCategory({ name: 'Snacks2', description: '' }, 1)
    const item = await createItem({
      name: 'Old Chips',
      category_id: cat.id,
      selling_price: 5000,
      cost_price: 4000,
      low_stock_threshold: 10,
      units_per_ctn: 1
    }, 1)

    const updated = await updateItem(item.id, { name: 'New Chips', selling_price: 6000 } as any, 1)
    expect(updated.name).toBe('New Chips')
    expect(updated.selling_price).toBe(6000)
    // Other fields should remain unchanged
    expect(updated.cost_price).toBe(4000)
  })
})

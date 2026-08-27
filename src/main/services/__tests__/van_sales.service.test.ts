import { describe, it, expect, beforeEach } from 'vitest'
import { createVanAssignment, reconcileVanAssignment } from '../van_sales.service'
import { db } from '../../db/connection'
import { resetDb } from '../../__tests__/setup'

describe('Van Sales Service', () => {
  beforeEach(async () => {
    await resetDb()
    await db.insertInto('accounts').values({
      id: 1,
      name: 'Cash in Hand Test',
      type: 'cash',
      opening_balance: 0,
      current_balance: 0
    }).execute()
  })

  it('should open van session', async () => {
    const salesman = { id: 1 }

    const assignment = await createVanAssignment({
      van_salesman_id: salesman.id,
      notes: 'Test trip'
    }, 1)

    expect(assignment.status).toBe('loaded')
    expect(assignment.notes).toBe('Test trip')
  })

  it('should reconcile van session and collect cash', async () => {
    const salesman = { id: 1 }

    const assignment = await createVanAssignment({
      van_salesman_id: salesman.id,
    }, 1)

    // Reconcile and collect cash
    const result = await reconcileVanAssignment(assignment.id, {
      returns: [{ item_id: 1, qty_returned: 10 }]
    }, 1)

    expect(result.status).toBe('reconciled')
  })
})

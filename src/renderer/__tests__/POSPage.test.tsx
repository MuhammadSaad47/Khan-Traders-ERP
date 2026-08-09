// @vitest-environment jsdom
import React from 'react'
import './setup'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import POSPage from '../src/pages/pos/POSPage'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Hooks
vi.mock('../src/hooks/useParties', () => ({
  useCustomers: vi.fn(() => ({
    data: [
      { id: 1, name: 'John Doe', balance: 500 }
    ]
  })),
  useCreateCustomer: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue({ id: 2, name: 'New Cust' }),
    isPending: false
  }))
}))

vi.mock('../src/hooks/useAccounts', () => ({
  useAccounts: vi.fn(() => ({
    data: [{ id: 1, name: 'Cash', type: 'cash' }]
  }))
}))

vi.mock('../src/hooks/useCatalog', () => ({
  useExpenseCategories: vi.fn(() => ({
    data: [{ id: 1, name: 'General' }]
  })),
  useItems: vi.fn(() => ({
    data: [
      { id: 1, name: 'Apple', selling_price: 15000, current_stock: 50 },
      { id: 2, name: 'Banana', selling_price: 5000, current_stock: 0 },
    ]
  }))
}))

vi.mock('../src/hooks/useSales', () => ({
  useCreateSale: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue({ invoice_no: 'INV-001', date: '2023-01-01' }),
    isPending: false
  })),
  useUpdateSale: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue({ invoice_no: 'INV-001', date: '2023-01-01' }),
    isPending: false
  })),
  useSaleDetails: vi.fn(() => ({
    data: null,
    isLoading: false
  })),
  usePrintReceipt: vi.fn(() => ({
    mutate: vi.fn()
  }))
}))

import { useCartStore } from '../src/stores/cart.store'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
})

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <MemoryRouter>
      {children}
    </MemoryRouter>
  </QueryClientProvider>
)

describe('POSPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useCartStore.setState({ items: [], discount: 0, paid_amount: 0 })
    queryClient.clear()
  })

  it('renders the catalog items and search bar', () => {
    render(<POSPage />, { wrapper: Wrapper })
    
    expect(screen.getByPlaceholderText(/Scan barcode or search item/i)).toBeInTheDocument()
    expect(screen.getByText('Apple')).toBeInTheDocument()
    expect(screen.getByText('Rs 150')).toBeInTheDocument()
    expect(screen.getByText('Banana')).toBeInTheDocument()
  })

  it('adds an item to cart and calculates totals', async () => {
    const user = userEvent.setup()
    render(<POSPage />, { wrapper: Wrapper })
    
    const appleButton = screen.getByText('Apple')
    await user.click(appleButton)

    // Wait for state to update
    await waitFor(() => {
      expect(screen.getByText('Subtotal')).toBeInTheDocument()
    })
    
    // Subtotal should be 150 (formatted as Rs 150)
    // There are multiple Rs 150 (one in catalog, one in cart line, one in subtotal, one in net total)
    const rs150Elements = screen.getAllByText('Rs 150')
    expect(rs150Elements.length).toBeGreaterThanOrEqual(2)
  })

  it('filters items using the search bar', async () => {
    const user = userEvent.setup()
    render(<POSPage />, { wrapper: Wrapper })
    
    const searchInput = screen.getByPlaceholderText(/Scan barcode or search item/i)
    await user.type(searchInput, 'App')
    
    expect(screen.getByText('Apple')).toBeInTheDocument()
    expect(screen.queryByText('Banana')).not.toBeInTheDocument()
  })
})

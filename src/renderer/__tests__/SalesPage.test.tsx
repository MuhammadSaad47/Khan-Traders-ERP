// @vitest-environment jsdom
import React from 'react'
import './setup'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import SalesPage from '../src/pages/sales/SalesPage'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Hooks
vi.mock('../src/hooks/useSales', () => ({
  useSales: vi.fn(() => ({
    data: [
      { id: 1, invoice_no: 'INV-1001', net_total: 5000, date: '2023-01-01', status: 'paid', is_deleted: 0 }
    ],
    isLoading: false
  })),
  useSaleDetails: vi.fn(() => ({
    data: { sale: {}, items: [], overheads: [] },
    isLoading: false
  })),
  usePrintReceipt: vi.fn(() => ({ mutate: vi.fn() })),
  useVoidSale: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useSaleReturns: vi.fn(() => ({ data: [] })),
  useCreateSaleReturn: vi.fn(() => ({ mutateAsync: vi.fn() }))
}))

vi.mock('../src/hooks/useParties', () => ({
  useCustomers: vi.fn(() => ({
    data: [{ id: 1, name: 'Test Customer' }]
  }))
}))

vi.mock('../src/hooks/useAccounts', () => ({
  useAccounts: vi.fn(() => ({
    data: [{ id: 1, name: 'Cash', type: 'cash' }]
  }))
}))

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

describe('SalesPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queryClient.clear()
  })

  it('renders sales history table correctly', () => {
    render(<SalesPage />, { wrapper: Wrapper })
    expect(screen.getByText('Sales History')).toBeInTheDocument()
    expect(screen.getByText('INV-1001')).toBeInTheDocument()
    expect(screen.getByText('Rs 50')).toBeInTheDocument() // 5000 paisa = Rs 50
  })

  it('filters sales using the search bar', () => {
    render(<SalesPage />, { wrapper: Wrapper })
    const searchInput = screen.getByPlaceholderText(/Search by Invoice No/i)
    fireEvent.change(searchInput, { target: { value: '9999' } })
    expect(screen.queryByText('INV-1001')).not.toBeInTheDocument()
  })

  it('opens details dialog when viewing a sale', () => {
    render(<SalesPage />, { wrapper: Wrapper })
    const viewButton = screen.getByText('View')
    fireEvent.click(viewButton)
    expect(screen.getByText('Sale Details')).toBeInTheDocument()
    expect(screen.getByText('Process Return')).toBeInTheDocument()
  })
})

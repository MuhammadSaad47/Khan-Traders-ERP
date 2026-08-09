import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface CartItem {
  item_id: number;
  name: string;
  qty: number;
  unit_price: number;
  line_total: number;
}

export interface CartState {
  items: CartItem[];
  customer_id: number | string | undefined;
  discount: number;
  paid_amount: number;
  payment_method: 'cash' | 'easypaisa' | 'bank' | 'other' | undefined;
  sale_type: 'counter' | 'wholesale' | 'van';
  addItem: (item: any, ctns?: number) => void;
  updateCtns: (item_id: number, ctns: number) => void;
  removeItem: (item_id: number) => void;
  setCustomer: (id: number | string | undefined) => void;
  setDiscount: (amount: number) => void;
  setPaidAmount: (amount: number) => void;
  setPaymentMethod: (method: 'cash' | 'easypaisa' | 'bank' | 'other' | undefined) => void;
  setSaleType: (type: 'counter' | 'wholesale' | 'van') => void;
  setCartItems: (items: CartItem[]) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartState>()(persist((set) => ({
  items: [],
  customer_id: undefined,
  discount: 0,
  paid_amount: 0,
  payment_method: undefined,
  sale_type: 'counter',

  addItem: (item, ctns = 1) => set((state) => {
    const qty = ctns;
    const existing = state.items.find(i => i.item_id === item.id)
    if (existing) {
      return {
        items: state.items.map(i => 
          i.item_id === item.id 
            ? { ...i, qty: i.qty + qty, line_total: (i.qty + qty) * i.unit_price }
            : i
        )
      }
    }
    
    // Determine price based on sale type (simplified to just selling_price)
    const price = item.selling_price
    
    return {
      items: [...state.items, {
        item_id: item.id,
        name: item.name,
        qty: qty,
        unit_price: price,
        line_total: qty * price
      }]
    }
  }),

  updateCtns: (item_id, ctns) => set((state) => ({
    items: state.items.map(i => {
      if (i.item_id === item_id) {
        return { ...i, qty: ctns, line_total: ctns * i.unit_price };
      }
      return i;
    })
  })),

  removeItem: (item_id) => set((state) => ({
    items: state.items.filter(i => i.item_id !== item_id)
  })),

  setCustomer: (id) => set({ customer_id: id }),
  setDiscount: (amount) => set({ discount: amount }),
  setPaidAmount: (amount) => set({ paid_amount: amount }),
  setPaymentMethod: (method) => set({ payment_method: method }),
  setSaleType: (type) => set(() => {
    return { sale_type: type }
  }),

  setCartItems: (items) => set({ items }),

  clearCart: () => set({
    items: [],
    customer_id: undefined,
    discount: 0,
    paid_amount: 0,
    payment_method: undefined,
    sale_type: 'counter'
  })
}),
{
  name: 'khan-trader-cart',
  storage: createJSONStorage(() => sessionStorage)
}
))

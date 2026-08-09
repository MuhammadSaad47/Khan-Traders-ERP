import './assets/index.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider, MutationCache } from '@tanstack/react-query'
import App from './App'
import { toast } from './hooks/use-toast'

const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Operation completed successfully.',
        variant: 'default'
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error?.message || 'An unexpected error occurred.',
        variant: 'destructive'
      })
    }
  })
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
)

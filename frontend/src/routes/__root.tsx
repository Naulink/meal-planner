import { createRootRoute, Outlet } from '@tanstack/react-router'
import { AppLayout } from '@/components/layout/AppLayout'
import { Toaster } from '@/components/ui/sonner'
import { PersonsProvider } from '@/providers/PersonsProvider'

export const Route = createRootRoute({
  component: () => (
    <PersonsProvider>
      <AppLayout>
        <Outlet />
        <Toaster />
      </AppLayout>
    </PersonsProvider>
  ),
})

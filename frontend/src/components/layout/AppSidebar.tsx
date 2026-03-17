import { Link, useRouterState } from '@tanstack/react-router'
import { Carrot, ChefHat, Calendar, Settings2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/ingredients', label: 'Ingredients', icon: Carrot },
  { to: '/recipes', label: 'Recipes', icon: ChefHat },
  { to: '/meal-planner', label: 'Meal Planner', icon: Calendar },
  { to: '/settings', label: 'Settings', icon: Settings2 },
] as const

export function AppSidebar() {
  const routerState = useRouterState()
  const currentPath = routerState.location.pathname

  return (
    <>
      <aside className="hidden md:flex w-56 min-h-screen border-r bg-card flex-col">
        <div className="p-4 border-b flex items-center gap-2">
          <img src="/logo.png" alt="Logo" className="h-8 w-8 object-contain" />
          <h1 className="font-bold text-lg">Meal Planner</h1>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => {
            const isActive = currentPath.startsWith(to)
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <Icon size={18} />
                {label}
              </Link>
            )
          })}
        </nav>
      </aside>
      <nav className="flex md:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-background pb-[env(safe-area-inset-bottom)]">
        {navItems.map(({ to, label, icon: Icon }) => {
          const isActive = currentPath.startsWith(to)
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                'flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          )
        })}
      </nav>
    </>
  )
}

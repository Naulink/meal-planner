import { type ReactNode, useEffect } from 'react'
import { PersonsContext, usePersons } from '@/hooks/usePersons'

export function PersonsProvider({ children }: { children: ReactNode }) {
  const hook = usePersons()

  useEffect(() => {
    void hook.fetchPersons()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <PersonsContext.Provider value={hook}>
      {children}
    </PersonsContext.Provider>
  )
}

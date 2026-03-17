import { cn } from '@/lib/utils'
import type { Macros } from '@/lib/nutrition'
import type { PersonSettings } from '@/types'

interface MacroProgressProps {
  totals: Macros
  targets: PersonSettings
}

interface BarProps {
  label: string
  current: number
  target: number
  unit: string
}

function MacroBar({ label, current, target, unit }: BarProps) {
  const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0
  const over = current > target
  const close = !over && current / target >= 0.75

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className={cn('text-muted-foreground', over && 'text-destructive font-medium')}>
          {+current.toFixed(1)} / {target} {unit}
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted-foreground/25 overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            over ? 'bg-destructive' : close ? 'bg-amber-500' : 'bg-primary'
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export function MacroProgress({ totals, targets }: MacroProgressProps) {
  return (
    <div className="space-y-3 p-4 border rounded-lg bg-muted/70">
      <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Daily Progress</h3>
      <MacroBar label="Calories" current={totals.kcal} target={targets.target_kcal} unit="kcal" />
      <MacroBar label="Protein" current={totals.protein} target={targets.target_protein} unit="g" />
      <MacroBar label="Carbs" current={totals.carbs} target={targets.target_carbs} unit="g" />
      <p className="text-xs text-muted-foreground pl-1">↳ sugar {+totals.sugar.toFixed(1)}g</p>
      <MacroBar label="Fat" current={totals.fat} target={targets.target_fat} unit="g" />
      <p className="text-xs text-muted-foreground pl-1">↳ unsat {+totals.unsaturated_fat.toFixed(1)}g</p>
    </div>
  )
}

export type MacroLabel =
  | 'calorie-free'
  | 'sugar-free'
  | 'fat-free'
  | 'low-fat'
  | 'low-carb'
  | 'high-protein'

export interface MacroValues {
  kcal: number
  protein: number
  carbs: number
  fat: number
  sugar: number
}

export const MACRO_LABEL_DISPLAY: Record<MacroLabel, string> = {
  'calorie-free': 'Calorie-free',
  'sugar-free': 'Sugar-free',
  'fat-free': 'Fat-free',
  'low-fat': 'Low fat',
  'low-carb': 'Low carb',
  'high-protein': 'High protein',
}

export const MACRO_LABEL_CHECKS: Record<MacroLabel, (m: MacroValues) => boolean> = {
  'calorie-free': m => m.kcal < 5,
  'sugar-free': m => m.sugar <= 0.5,
  'fat-free': m => m.fat <= 0.5,
  'low-fat': m => m.fat <= 3,
  'low-carb': m => m.carbs <= 10,
  'high-protein': m => m.protein >= 15 && m.kcal > 0 && m.protein * 4 >= m.kcal * 0.2,
}

export function matchesMacroLabels(macros: MacroValues, labels: MacroLabel[]): boolean {
  return labels.every(label => MACRO_LABEL_CHECKS[label](macros))
}

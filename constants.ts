const TAV_KEY = import.meta.env.VITE_TAVILY_API_KEY;
if (!TAV_KEY) {
  throw new Error("VITE_TAVILY_API_KEY is not defined in environment variables");
}
export const TAVILY_API_KEY = TAV_KEY;

export enum SofloStatus {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
  SATURATED = 'Saturated',
  GROWING = 'Growing Demand'
}

export enum BudgetStatus {
  LOW = 'Low (< $1k)',
  MEDIUM = 'Medium ($1k - $10k)',
  HIGH = 'High (> $10k)'
}

export const COLORS = {
  PRIMARY: '#2563eb', // Blue 600
  SECONDARY: '#475569', // Slate 600
  SUCCESS: '#16a34a', // Green 600
  BACKGROUND: '#f8fafc' // Slate 50
};
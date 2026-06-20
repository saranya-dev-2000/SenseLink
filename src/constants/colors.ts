export const colors = {
  primary: '#007AFF',
  background: '#0D1117',
  card: '#161B22',
  success: '#00C853',
  error: '#FF3B30',
  text: '#FFFFFF',
  textGrey: '#8B949E',
} as const;

export type ColorName = keyof typeof colors;

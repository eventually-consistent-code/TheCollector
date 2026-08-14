/**
 * Estate & Ember is dark-only, so web always reports dark — including
 * pre-hydration during static rendering, which is what killed the old
 * light flash on first paint.
 */
export function useColorScheme() {
  return 'dark' as const;
}

export const resolveCssVar = (
  element: HTMLElement | null,
  name: string,
  fallback: string,
): string => {
  if (!element || typeof window === 'undefined') {
    return fallback;
  }
  const value = window.getComputedStyle(element).getPropertyValue(name).trim();
  return value || fallback;
};

export const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

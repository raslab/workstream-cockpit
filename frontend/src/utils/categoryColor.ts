export const CATEGORY_ICON_BAND_ALPHA_HEX = '1A';

export const DEFAULT_CATEGORY_COLOR = '#5b8ca0';
export const DEFAULT_CATEGORY_EMOJI = '🏷️';

export function getCategoryIconBandBackground(color?: string | null, fallbackColor = DEFAULT_CATEGORY_COLOR) {
  const baseColor = color && /^#[0-9A-Fa-f]{6}$/.test(color) ? color : fallbackColor;

  return `${baseColor}${CATEGORY_ICON_BAND_ALPHA_HEX}`;
}

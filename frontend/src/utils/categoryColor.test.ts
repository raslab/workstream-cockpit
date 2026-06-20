import { describe, expect, it } from 'vitest';

import { CATEGORY_ICON_BAND_ALPHA_HEX, getCategoryIconBandBackground } from './categoryColor';

describe('category color helpers', () => {
  it('uses a shared category icon band alpha that is more transparent than the previous detail alpha', () => {
    expect(Number.parseInt(CATEGORY_ICON_BAND_ALPHA_HEX, 16)).toBeLessThan(0x22);
    expect(getCategoryIconBandBackground('#0f9f8f')).toBe(`#0f9f8f${CATEGORY_ICON_BAND_ALPHA_HEX}`);
  });
});

/**
 * WCAG 2.1 Contrast Ratio Calculator
 * Used to ensure readability in user-created chat themes
 */

// Parse hex color (#fff, #ffffff, #ffffff80) or rgb/rgba to [r, g, b]
export const parseColor = (colorStr) => {
  if (!colorStr || typeof colorStr !== 'string') return [255, 255, 255];
  const str = colorStr.trim();

  // Hex format
  if (str.startsWith('#')) {
    let hex = str.slice(1);
    if (hex.length === 3) {
      hex = hex.split('').map((c) => c + c).join('');
    }
    if (hex.length >= 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return [isNaN(r) ? 255 : r, isNaN(g) ? 255 : g, isNaN(b) ? 255 : b];
    }
  }

  // rgb / rgba format
  const rgbMatch = str.match(/rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (rgbMatch) {
    return [
      parseInt(rgbMatch[1], 10),
      parseInt(rgbMatch[2], 10),
      parseInt(rgbMatch[3], 10),
    ];
  }

  return [255, 255, 255];
};

// Calculate relative luminance based on WCAG standard
export const getRelativeLuminance = (r, g, b) => {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
};

// Calculate contrast ratio between two colors (e.g. text against bubble)
export const getContrastRatio = (color1, color2) => {
  const [r1, g1, b1] = parseColor(color1);
  const [r2, g2, b2] = parseColor(color2);

  const l1 = getRelativeLuminance(r1, g1, b1);
  const l2 = getRelativeLuminance(r2, g2, b2);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
};

// Check if contrast meets minimum WCAG AA standard (4.5:1 for normal text)
export const isContrastAdequate = (textColor, bgColor) => {
  return getContrastRatio(textColor, bgColor) >= 4.5;
};

// Auto-improve contrast: returns optimal black or white text for maximum readability
export const getOptimalTextColor = (bgColor) => {
  const [r, g, b] = parseColor(bgColor);
  const lum = getRelativeLuminance(r, g, b);
  return lum > 0.4 ? '#0f172a' : '#ffffff';
};

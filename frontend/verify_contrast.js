/**
 * Color Contrast Verification Script
 * Verifies WCAG AA/AAA compliance for color combinations
 * Based on WCAG 2.1 guidelines: https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html
 */

/**
 * Calculate relative luminance of a color
 * Formula from WCAG 2.1: https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html
 * @param {string} hex - Hex color code (e.g., '#ffffff' or 'ffffff')
 * @returns {number} Relative luminance (0-1)
 */
function getLuminance(hex) {
  // Normalize hex color
  hex = hex.replace('#', '').toLowerCase();
  
  // Handle 3-digit hex
  if (hex.length === 3) {
    hex = hex.split('').map(char => char + char).join('');
  }
  
  // Convert hex to RGB
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  
  // Apply gamma correction
  const luminanceComponent = (value) => {
    if (value <= 0.03928) {
      return value / 12.92;
    }
    return Math.pow((value + 0.055) / 1.055, 2.4);
  };
  
  const rLinear = luminanceComponent(r);
  const gLinear = luminanceComponent(g);
  const bLinear = luminanceComponent(b);
  
  // Calculate relative luminance
  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

/**
 * Calculate contrast ratio between two colors
 * Formula from WCAG 2.1
 * @param {string} color1 - First hex color
 * @param {string} color2 - Second hex color
 * @returns {number} Contrast ratio (1-21)
 */
function getContrastRatio(color1, color2) {
  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  
  // Lighter color goes in numerator
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if contrast ratio meets WCAG standards
 * @param {number} ratio - Contrast ratio
 * @param {string} level - 'AA' or 'AAA'
 * @param {string} size - 'normal' or 'large' (large = 18pt+ or 14pt+ bold)
 * @returns {boolean} True if meets standard
 */
function meetsWCAGAA(ratio, level = 'AA', size = 'normal') {
  if (level === 'AAA') {
    return size === 'large' ? ratio >= 4.5 : ratio >= 7;
  }
  // AA level
  return size === 'large' ? ratio >= 3 : ratio >= 4.5;
}

/**
 * Verify all color combinations in a palette
 * @param {Object} colors - Object with color names as keys and hex values
 * @param {string} bgColor - Background color hex
 * @param {string} level - 'AA' or 'AAA'
 * @returns {Array} Array of verification results
 */
function verifyColorPalette(colors, bgColor, level = 'AA') {
  const results = [];
  
  for (const [name, hex] of Object.entries(colors)) {
    const ratio = getContrastRatio(hex, bgColor);
    const passes = meetsWCAGAA(ratio, level);
    
    results.push({
      color: name,
      hex: hex,
      ratio: ratio.toFixed(2),
      passes: passes,
      level: level
    });
  }
  
  return results;
}

/**
 * Format contrast ratio for display
 * @param {number} ratio - Contrast ratio
 * @returns {string} Formatted ratio string
 */
function formatRatio(ratio) {
  return ratio.toFixed(2) + ':1';
}

/**
 * Get WCAG compliance status badge
 * @param {number} ratio - Contrast ratio
 * @param {string} size - 'normal' or 'large'
 * @returns {Object} Status object with level and icon
 */
function getComplianceStatus(ratio, size = 'normal') {
  const aaLarge = 3;
  const aaNormal = 4.5;
  const aaaLarge = 4.5;
  const aaaNormal = 7;
  
  if (size === 'large') {
    if (ratio >= aaaNormal) {
      return { level: 'AAA', icon: '✅', color: '#34d399' };
    }
    if (ratio >= aaLarge) {
      return { level: 'AA', icon: '✅', color: '#34d399' };
    }
  } else {
    if (ratio >= aaaNormal) {
      return { level: 'AAA', icon: '✅', color: '#34d399' };
    }
    if (ratio >= aaNormal) {
      return { level: 'AA', icon: '✅', color: '#34d399' };
    }
  }
  
  return { level: 'Fail', icon: '❌', color: '#f87171' };
}

/**
 * Generate HTML table for contrast verification
 * @param {Array} results - Results from verifyColorPalette
 * @returns {string} HTML table string
 */
function generateContrastTable(results) {
  let html = '<table class="contrast-table">\n';
  html += '<thead><tr><th>Color</th><th>Hex</th><th>Ratio</th><th>AA (Normal)</th><th>AA (Large)</th><th>AAA (Normal)</th><th>AAA (Large)</th></tr></thead>\n';
  html += '<tbody>\n';
  
  for (const result of results) {
    const ratio = parseFloat(result.ratio);
    const aaLarge = ratio >= 3 ? '✅' : '❌';
    const aaNormal = ratio >= 4.5 ? '✅' : '❌';
    const aaaLarge = ratio >= 4.5 ? '✅' : '❌';
    const aaaNormal = ratio >= 7 ? '✅' : '❌';
    
    html += `<tr>
      <td>${result.color}</td>
      <td><code>${result.hex}</code></td>
      <td><strong>${result.ratio}:1</strong></td>
      <td>${aaNormal}</td>
      <td>${aaLarge}</td>
      <td>${aaaNormal}</td>
      <td>${aaaLarge}</td>
    </tr>\n`;
  }
  
  html += '</tbody>\n</table>';
  return html;
}

/**
 * Validate a single color pair
 * @param {string} foreground - Foreground color hex
 * @param {string} background - Background color hex
 * @returns {Object} Validation result
 */
function validateColorPair(foreground, background) {
  const ratio = getContrastRatio(foreground, background);
  const status = getComplianceStatus(ratio);
  
  return {
    foreground: foreground,
    background: background,
    ratio: ratio.toFixed(2),
    status: status,
    meetsAA: ratio >= 4.5,
    meetsAAA: ratio >= 7
  };
}

// Export for use in Node.js/testing environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getLuminance,
    getContrastRatio,
    meetsWCAGAA,
    verifyColorPalette,
    formatRatio,
    getComplianceStatus,
    generateContrastTable,
    validateColorPair
  };
}

/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const colors = {
  light: {
    // Legacy aliases (kept for backward compatibility)
    text: '#132238',
    tint: '#1457FF',

    // Core surfaces
    background: '#F7F9FC',
    foreground: '#132238',

    // Cards / elevated surfaces
    card: '#FFFFFF',
    cardForeground: '#132238',

    // Primary action color (buttons, links, active states)
    primary: '#1457FF',
    primaryForeground: '#ffffff',

    // Secondary / less-emphasis interactive surfaces
    secondary: '#EAF0FF',
    secondaryForeground: '#173776',

    // Muted / subdued elements (dividers, timestamps, placeholders)
    muted: '#EEF2F7',
    mutedForeground: '#6C7B91',

    // Accent highlights (badges, selected items, focus rings)
    accent: '#FFF0E8',
    accentForeground: '#A8471F',

    // Destructive actions (delete, error states)
    destructive: '#E5484D',
    destructiveForeground: '#ffffff',

    // Borders and input outlines
    border: '#DDE5F0',
    input: '#DDE5F0',
  },

  // Border radius (in px). Sync from the sibling web artifact's --radius
  // CSS variable. This value applies to cards, buttons, inputs, and modals.
  radius: 18,
};

export default colors;

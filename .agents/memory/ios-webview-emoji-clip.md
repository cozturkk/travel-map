---
name: iOS WKWebView canvas emoji clipping
description: Emoji drawn inside a canvas clip() region get visually cut off on iOS WKWebView even though the same code renders fine in desktop browsers.
---

## Rule
Never draw emoji (or any text containing emoji) while a `ctx.clip()` is active in a canvas rendered inside a react-native-webview on iOS.

**Why:** iOS WKWebView renders emoji glyphs with a larger actual ascent than the nominal font size (can exceed 1.1–1.2× the font-size px value). Desktop Chrome/Firefox don't exhibit this discrepancy, so `toDataURL()` in the Replit web preview looks correct while the same HTML/canvas in Expo Go on a real device clips the top of the emoji glyph.

**How to apply:** In `drawStatBox` (ShareCard.tsx) and any similar pattern:
1. Do all `ctx.clip()` work for background + text inside `ctx.save()` / `ctx.restore()`.
2. Draw emoji **after** `ctx.restore()` (clip is gone), at the same absolute position.
3. Also use a slightly larger baseline multiplier (0.88 vs 0.82) to push the glyph lower and give extra headroom above the box top.

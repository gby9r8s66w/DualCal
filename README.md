
# Dual Calendar Sky Widget · v1.0

Offline-first PWA + embeddable web component: dual Gregorian/Hijri dates, independent
calendar languages, sunset-based lunar rollover, NOAA solar time (progress dial,
altitude, shadow multiplier), Meeus moon phase + topocentric lunar roll, offline
holidays for 9 countries, full LTR/RTL, and a solar-driven animated sky.

## Run

The service worker requires HTTP(S) (any static server works):

    python3 -m http.server 8080
    # or: npx serve .

Open http://localhost:8080 — after the first load, disable the network and reload:
everything (calendars, solar, moon, holidays, themes, settings) keeps working.
Use the header **Install** button (or the browser menu) to install as an app.

## Files

| File | Purpose |
|---|---|
| index.html / styles.css / js/app.js | Full app: Today, Calendar, Solar, Moon, Holidays, searchable Settings |
| js/engines.js | Gregorian JDN, tabular Hijri, Umm al-Qura (bundled browser ICU), astronomical Hijri, NOAA sun, Meeus moon, lunar roll, holiday expansion |
| js/i18n.js | 7 locales (en, ar, fr, tr, ur, id, ms), digit systems, bidi-safe date/clock formatting |
| js/data.js | Timezone→coordinate table, offline city list, holiday dataset `2026.1` (2025–2027), defaults + strict sanitisation |
| js/theme.js | Layered sky engine (zenith/horizon/sun/moon glow, stars, sunrise “breath”), 30 fps rAF, pauses when hidden, honors reduced motion |
| js/widget.js + embed.html | `<dual-calendar-sky-widget>` compact embed with attributes + events |
| sw.js / manifest.webmanifest / icons | Precached app shell, installable PWA, offline navigations |
| updates/manifest.json | Optional, non-blocking holiday update feed |

## Notes

- **Umm al-Qura** uses the browser’s bundled ICU tables (offline, reliable 1400–1500 AH);
  if unavailable the app falls back to the deterministic civil calendar and warns.
- **Astronomical** Hijri is computed (conjunction + visibility criterion) and labelled approximate.
- Lunar days in the month grid anchor to the Gregorian date of their daylight (noon rule);
  the evening badge marks the post-sunset advance. Polar locations fall back to hour-angle
  progress and midnight rollover with visible notices.
- Holiday data is community-maintained; officially announced Eid dates are included for
  SA/AE/TR (2025–2026), everything lunar else is badged **Estimated**.
- Privacy: no accounts, no analytics, no network calls required; location stays on-device.
- Lunar roll convention: 0° = illuminated side up, positive = clockwise on screen.

# ARCA-74 — Dark/light theme toggle in settings

**Status:** Todo · **Area:** settings · **Depends on:** —

## Why this matters (for the founder)
A Bloomberg-style terminal is used for long sessions — letting people pick dark or light mode is a basic comfort expectation and costs little to add.

## Context
This is a display preference only; it does not touch pricing, catalog, or portfolio logic.

## Scope
- Add a light/dark toggle in Settings
- Applied instantly across the app when changed
- Preference is saved per user account and persists across sessions/devices

## Out of scope
- Custom themes or color customization beyond light/dark
- Auto-switching based on system/OS theme (unless trivial to include — if not trivial, leave for a future ticket)
- Any change to layout, panels, or page content

## Acceptance criteria
- [ ] Toggling in Settings switches the whole app between light and dark instantly
- [ ] Choice persists after logout/login and on other devices for the same account
- [ ] Default for new users is dark (matches current app look)
- [ ] No other settings or pages are affected

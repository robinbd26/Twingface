# Bangladesh Registration Form Design

## Goal

Provide one self-contained HTML file that renders a responsive account-registration form and can be opened directly in a browser.

## Implementation

The document imports Tailwind from its CDN and uses vanilla JavaScript. It contains a semantic form with the requested identity, gender, date-of-birth, Bangladesh division/district, and password fields. JavaScript generates the date values, contains the supplied division-to-district mapping, repopulates and disables the district selection until a division is selected, toggles password visibility, and performs client-side required-field/password-match validation.

## UX and accessibility

Controls have labels, required states, focus rings, descriptive validation messages, responsive grid behavior, and an accessible live error region. District selection resets whenever the division changes. Password visibility controls have accessible labels.

## Constraints

This is a standalone prototype only: it does not contact an API, persist credentials, or replace the existing Twingface registration flow. It does not claim client validation is security enforcement.

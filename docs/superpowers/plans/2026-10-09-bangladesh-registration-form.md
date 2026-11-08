# Bangladesh Registration Form Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Supply a browser-ready standalone Bangladesh registration form in one HTML file.

**Architecture:** Tailwind CDN handles styling while an embedded script owns static location data, dependent selects, password visibility, and client-only validation. It remains separate from the Twingface application.

**Tech Stack:** HTML, Tailwind CSS CDN, Vanilla JavaScript.

**Spec:** `docs/superpowers/specs/2026-10-09-bangladesh-registration-form-design.md`

## Global Constraints

- Deliver one self-contained HTML file that opens without a build step.
- Use exactly the supplied Bangladesh division/district mapping.
- Do not persist credentials or imply client-side validation is server security.

## Review Focus

- Changing division clears an old district selection and supplies only matching districts.
- Password mismatch prevents submission and announces an accessible error.
- Small screens preserve readable grouped date/location controls.

---

### Task 1: Standalone form markup and responsive presentation

**Files:**
- Create: `bangladesh-registration-form.html`

**Interfaces:**
- Produces semantic labeled input/select controls and client script hooks.

- [ ] **Step 1: Write the form HTML** with every specified control, validation message region, and Tailwind responsive grid classes.
- [ ] **Step 2: Add the dark/light-neutral modern card presentation** with focus rings, clear required markers, and accessible password toggle buttons.
- [ ] **Step 3: Open the file locally** and confirm all controls are visible at mobile and desktop widths.

### Task 2: Dynamic form behavior and validation

**Files:**
- Modify: `bangladesh-registration-form.html`

**Interfaces:**
- Consumes a `districtsByDivision` map and form DOM controls.
- Produces date choices, dependent districts, password visibility toggles, password-match feedback, and client validation.

- [ ] **Step 1: Add the supplied division-to-district map and populate the division/district controls.**
- [ ] **Step 2: Generate day, month, and 1950-to-current-year options.**
- [ ] **Step 3: Implement division-change reset/population and password toggle/match behavior.**
- [ ] **Step 4: Implement submit validation** that prevents invalid submission and shows a non-sensitive success message for valid client input.
- [ ] **Step 5: Manually verify** each division, password mismatch, required field, and successful client validation path.

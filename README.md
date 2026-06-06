# Azar Datepicker

> **Persian (Jalali) & Gregorian Date/Time Picker** — pure JavaScript, zero dependencies, accessible, responsive.

[![Version](https://img.shields.io/badge/version-1.2.0-blue.svg)](https://github.com/saeedvir/azar-datepicker)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Size](https://img.shields.io/badge/size-~18KB%20minified-brightgreen.svg)]()

A lightweight, dependency-free date and time picker supporting both **Persian (Jalali/شمسی)** and **Gregorian** calendars. Built with vanilla JS and CSS — no jQuery, no frameworks, no icon libraries required.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 📅 **Dual Calendar** | Jalali (شمسی) & Gregorian — switch on the fly |
| 🕒 **Three Modes** | `date` · `time` · `datetime` |
| 📱 **Responsive** | Desktop → dropdown / Mobile → modal overlay with backdrop blur |
| 🌓 **Dark Mode** | Auto-detects OS preference, `data-theme="dark"`, or `data-bs-theme="dark"` |
| ♿ **Accessible** | Full keyboard navigation, ARIA roles, focus trap, screen-reader friendly |
| 🎨 **Customizable** | 20+ format tokens, custom localization, CSS variables |
| 🚧 **Date Bounds** | `minDate` / `maxDate` validation with disabled dates |
| 🔁 **Auto-init** | Initialize via HTML `data-*` attributes — zero JS needed |
| ⚡ **Zero Dependencies** | Pure JS + CSS, ~18 KB minified |

---

## 🚀 Quick Start

### 1. Include Files

```html
<link rel="stylesheet" href="datepicker.css">
<script src="datepicker.js"></script>
```

### 2. Add an Input

```html
<input type="text" id="myDate" placeholder="Select date">
```

### 3. Initialize

```javascript
const dp = new AzarDatepicker({
    selector: '#myDate',
    calendar: 'jalali',   // 'jalali' | 'gregorian'
    mode: 'date',          // 'date' | 'time' | 'datetime'
    onSelect: function(data) {
        console.log(data.formatted);   // "1403/03/15"
        console.log(data.nativeDate);  // JS Date object
    }
});
```

---

## 📦 Installation

### CDN (jsDelivr)

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/saeedvir/azar-datepicker@latest/datepicker.min.css">
<script src="https://cdn.jsdelivr.net/gh/saeedvir/azar-datepicker@latest/datepicker.min.js"></script>
```

### npm (coming soon)


### Download

Grab `datepicker.css` and `datepicker.js` from the [releases page](https://github.com/saeedvir/azar-datepicker/releases).

---

## ⚙️ Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `selector` | `string` \| `Element` | **required** | Target input element |
| `mode` | `string` | `'date'` | `'date'` \| `'time'` \| `'datetime'` |
| `calendar` | `string` | `'jalali'` | `'jalali'` \| `'gregorian'` |
| `inputFormat` | `string` | *auto* | Display format (see [Format Tokens](#format-tokens)) |
| `outputFormat` | `string` | same as `inputFormat` | Format returned by callbacks |
| `autoLoad` | `boolean` | `false` | Auto-fill input with today's date on init |
| `placeholder` | `string` | `null` | Input placeholder text |
| `darkMode` | `string` | `'auto'` | `'auto'` \| `'light'` \| `'dark'` |
| `rtl` | `boolean` | `null` | Force text direction (`null` = auto based on calendar) |
| `closeOnSelect` | `boolean` | `true` | Close picker after date selection (not time) |
| `showCalendarToggle` | `boolean` | `true` | Show button to switch Jalali ↔ Gregorian |
| `showClearButton` | `boolean` | `true` | Show ✕ clear button inside input |
| `minDate` | `object` | `null` | Minimum selectable date `{year, month, day}` |
| `maxDate` | `object` | `null` | Maximum selectable date `{year, month, day}` |
| `jalaliMonths` | `string[]` | built-in | Override Jalali month names |
| `jalaliMonthsShort` | `string[]` | built-in | Override Jalali short month names |
| `jalaliWeekDaysShort` | `string[]` | built-in | Override Jalali weekday abbreviations |

### Callbacks

| Callback | Arguments | Fires When |
|----------|-----------|------------|
| `onLoad` | `(instance)` | After initialization completes |
| `onSelect` | `(data)` | User selects a date/time |
| `onChange` | `(data)` | Value changes (selection or time adjust) |
| `onClear` | `()` | User clicks the clear button |

**Callback `data` object:**

```javascript
{
    year: 1403,           // number (in current calendar)
    month: 3,
    day: 15,
    hour: 14,
    minute: 30,
    calendar: 'jalali',   // 'jalali' | 'gregorian'
    formatted: '1403/03/15 14:30',
    nativeDate: Date,     // JavaScript Date object
    iso: '2024-06-04T10:00:00.000Z'
}
```

---

## 🎨 Format Tokens

| Token | Output | Example |
|-------|--------|---------|
| `YYYY` | Full year | `1403` |
| `YY` | Short year | `03` |
| `MMMM` | Full month name | `خرداد` / `June` |
| `MMM` | Short month name | `خرد` / `Jun` |
| `MM` | Zero-padded month | `03` |
| `M` | Month (no pad) | `3` |
| `DD` | Zero-padded day | `05` |
| `D` | Day (no pad) | `5` |
| `HH` | 24-hour (pad) | `09` |
| `H` | 24-hour (no pad) | `9` |
| `hh` | 12-hour (pad) | `09` |
| `h` | 12-hour (no pad) | `9` |
| `mm` | Minutes (pad) | `05` |
| `m` | Minutes (no pad) | `5` |
| `A` | AM/PM uppercase | `PM` |
| `a` | am/pm lowercase | `pm` |

### Format Examples

```javascript
// Jalali default
'YYYY/MM/DD'              // → 1403/03/15

// Gregorian default  
'YYYY-MM-DD'              // → 2024-06-04

// Custom
'DD MMMM YYYY'            // → 15 خرداد 1403
'YYYY/MM/DD HH:mm'        // → 1403/03/15 14:30
'MM/DD/YYYY hh:mm A'      // → 06/04/2024 02:30 PM
```

---

## 🧩 Public API Methods

```javascript
const dp = new AzarDatepicker({ selector: '#myDate' });

// Open / close / toggle
dp.open();
dp.close();
dp.toggle();

// Get current value
dp.getValue();   // → { year, month, day, hour, minute, calendar, formatted, nativeDate, iso }

// Set value programmatically
dp.setValue({ year: 1403, month: 3, day: 15, hour: 14, minute: 30 });

// Set from string (respects inputFormat)
dp.setValueFromString('1403/03/15 14:30');
dp.setValueFromString('2024-06-04');        // Gregorian

// Switch calendar
dp.setCalendar('gregorian');   // or 'jalali'
dp.getCalendar();            // → 'jalali' | 'gregorian'

// Refresh UI (dark mode, mobile detection)
dp.refresh();

// Destroy and clean up
dp.destroy();
```

---

## 🤖 Auto-Init via Data Attributes

No JavaScript required — just add `data-azar-datepicker` to any input:

```html
<input type="text"
       data-azar-datepicker
       data-azar-calendar="jalali"
       data-azar-mode="datetime"
       data-azar-input-format="YYYY/MM/DD HH:mm"
       data-azar-output-format="YYYY-MM-DD HH:mm"
       data-azar-placeholder="Pick date & time…"
       data-azar-dark="auto"
       data-azar-close-on-select="true">
```

**Available `data-azar-*` attributes:**

| Attribute | Maps To |
|-----------|---------|
| `data-azar-datepicker` | Initialize this element |
| `data-azar-mode` | `mode` |
| `data-azar-calendar` | `calendar` |
| `data-azar-input-format` | `inputFormat` |
| `data-azar-output-format` | `outputFormat` |
| `data-azar-placeholder` | `placeholder` |
| `data-azar-dark` | `darkMode` |
| `data-azar-close-on-select` | `closeOnSelect` |

---

## 🌓 Dark Mode

Dark mode activates automatically when **any** of the following is true:

1. `darkMode: 'dark'` is set in options
2. `<html data-theme="dark">` or `<html data-bs-theme="dark">` is present
3. OS prefers dark scheme AND `darkMode: 'auto'` (default)

```html
<!-- Force dark -->
<html data-theme="dark">

<!-- Bootstrap 5 compatible -->
<html data-bs-theme="dark">

<!-- Or via JS -->
document.documentElement.setAttribute('data-theme', 'dark');
```

The picker watches for `data-theme` / `data-bs-theme` changes dynamically via `MutationObserver`.

---

## ♿ Accessibility

Azar Datepicker v1.2.0 includes full accessibility support:

- **Keyboard Navigation**
  - `←` `→` `↑` `↓` — Navigate days
  - `PageUp` / `PageDown` — Previous / next month
  - `Home` / `End` — First / last day of week
  - `Enter` — Select focused date
  - `Escape` — Close picker
  - `Tab` — Focus trap inside modal (mobile)

- **ARIA**
  - `role="dialog"` on picker container
  - `aria-expanded`, `aria-controls`, `aria-haspopup` on input
  - `aria-selected`, `aria-disabled`, `role="gridcell"` on day cells
  - `aria-live="polite"` on time values
  - `aria-label` on all interactive buttons

- **Reduced Motion**
  - Respects `prefers-reduced-motion: reduce` — disables all animations

---

## 📱 Responsive Behavior

| Viewport | Behavior |
|----------|----------|
| **Desktop** (`≥768px`) | Dropdown positioned below/above input. Flips up if space is limited. Horizontal overflow protection ensures picker stays in viewport. |
| **Mobile** (`<768px`) | Centered modal with backdrop blur and overlay. Focus trap active. |

---

## 🛠 Advanced Examples

### Jalali with Custom Format & Bounds

```javascript
const dp = new AzarDatepicker({
    selector: '#birthdate',
    calendar: 'jalali',
    mode: 'date',
    inputFormat: 'DD MMMM YYYY',
    outputFormat: 'YYYY/MM/DD',
    placeholder: 'تاریخ تولد…',
    minDate: { year: 1300, month: 1, day: 1 },
    maxDate: { year: 1403, month: 6, day: 31 },
    autoLoad: false,
    onSelect: function(data) {
        console.log('Selected:', data.formatted);
    }
});
```

### Gregorian DateTime with 12-Hour Format

```javascript
const dp = new AzarDatepicker({
    selector: '#appointment',
    calendar: 'gregorian',
    mode: 'datetime',
    inputFormat: 'MM/DD/YYYY hh:mm A',
    outputFormat: 'YYYY-MM-DD HH:mm',
    placeholder: 'MM/DD/YYYY hh:mm AM/PM'
});
```

### Time Only

```javascript
const dp = new AzarDatepicker({
    selector: '#alarm',
    mode: 'time',
    inputFormat: 'HH:mm',
    placeholder: 'HH:mm'
});
```

### RTL Override

```javascript
const dp = new AzarDatepicker({
    selector: '#gregorian-rtl',
    calendar: 'gregorian',
    rtl: true   // Force RTL even for Gregorian
});
```

### Custom Localization

```javascript
const dp = new AzarDatepicker({
    selector: '#custom',
    calendar: 'jalali',
    jalaliMonths: ['Farvardin', 'Ordibehesht', 'Khordad', 'Tir', 'Mordad', 'Shahrivar',
                   'Mehr', 'Aban', 'Azar', 'Dey', 'Bahman', 'Esfand'],
    jalaliMonthsShort: ['Far', 'Ord', 'Kho', 'Tir', 'Mor', 'Sha', 'Meh', 'Aba', 'Aza', 'Dey', 'Bah', 'Esf'],
    jalaliWeekDaysShort: ['Sa', 'Ye', 'Do', 'Se', 'Ch', 'Pa', 'Jo']
});
```

---

## 🎨 CSS Customization

All visual properties are CSS custom properties. Override in your stylesheet:

```css
:root {
    --azar-primary: #2563eb;
    --azar-primary-hover: #1d4ed8;
    --azar-bg: #ffffff;
    --azar-surface: #f8fafc;
    --azar-border: #e2e8f0;
    --azar-text: #0f172a;
    --azar-radius: 16px;
    --azar-weekend-color: #dc2626;
}
```

**Full list of CSS variables:**

| Variable | Default | Description |
|----------|---------|-------------|
| `--azar-primary` | `#4f46e5` | Brand color |
| `--azar-primary-hover` | `#4338ca` | Hover state |
| `--azar-primary-light` | `#eef2ff` | Light tint (today button bg) |
| `--azar-bg` | `#ffffff` | Picker background |
| `--azar-surface` | `#f9fafb` | Subtle background (time values) |
| `--azar-border` | `#e5e7eb` | Borders |
| `--azar-text` | `#1f2937` | Primary text |
| `--azar-text-secondary` | `#6b7280` | Secondary text |
| `--azar-text-muted` | `#9ca3af` | Muted / placeholder |
| `--azar-shadow` | `0 10px 25px...` | Dropdown shadow |
| `--azar-shadow-lg` | `0 20px 40px...` | Modal shadow |
| `--azar-radius` | `14px` | Main border radius |
| `--azar-radius-sm` | `10px` | Small radius |
| `--azar-radius-xs` | `7px` | Extra small radius |
| `--azar-today-bg` | `#eef2ff` | Today highlight bg |
| `--azar-selected-bg` | `#4f46e5` | Selected day bg |
| `--azar-selected-text` | `#ffffff` | Selected day text |
| `--azar-hover-bg` | `#f3f4f6` | Hover bg |
| `--azar-weekday-text` | `#6b7280` | Weekday labels |
| `--azar-outside-text` | `#d1d5db` | Outside-month days |
| `--azar-weekend-color` | `#e53e3e` | Weekend day text |
| `--azar-modal-z` | `10550` | Z-index for modal |

---

## 🧪 Browser Support

| Browser | Support |
|---------|---------|
| Chrome / Edge | ✅ Last 2 versions |
| Firefox | ✅ Last 2 versions |
| Safari | ✅ Last 2 versions |
| Opera | ✅ Last 2 versions |
| IE11 | ⚠️ Not supported (uses modern JS APIs) |

---

## 🔄 Changelog

### v1.2.0 (Latest)
- **Fixed** Calendar toggle losing days 29–31
- **Fixed** Memory leaks in `destroy()` — all listeners properly removed
- **Fixed** Close/open race condition
- **Fixed** RTL clear-button positioning via wrapper class
- **Fixed** `minDate`/`maxDate` not converting when switching calendars
- **Fixed** `_goToToday()` bypassing bounds
- **Fixed** `setValueFromString()` now respects `inputFormat`
- **Fixed** `dateToTotalDays()` uses consistent Unix timestamps
- **Fixed** Today-on-weekend color override
- **Fixed** Negative years in year grid
- **Fixed** `_navigate()` min/max guard for year view
- **Added** Full keyboard navigation (arrows, Page, Home, End, Enter, Escape)
- **Added** ARIA roles, labels, live regions for screen readers
- **Added** Focus trap for modal mode
- **Added** Horizontal viewport overflow protection
- **Added** `MutationObserver` for dynamic `data-theme` changes
- **Added** `prefers-reduced-motion` support
- **Added** Callback deduplication (`onChange`/`onSelect` only fire on actual change)

### v1.1.6
- Initial stable release
- Jalali & Gregorian calendars
- Date, time, datetime modes
- Dark mode, RTL, responsive modal

---

## 📄 License

[MIT](LICENSE) © [saeedvir](https://github.com/saeedvir)

---

## 🙏 Credits

- Jalali conversion algorithms based on standard astronomical calculations
- Inspired by the need for a lightweight, accessible Persian date picker

---

<div align="center">

**[⬆ Back to Top](#azar-datepicker)**

⭐ Star this repo if you find it useful!

</div>

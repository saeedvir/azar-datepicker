# Azar Datepicker 📅

A lightweight, dependency‑free Persian (Jalali) and Gregorian date & time picker written in pure JavaScript and CSS.

- ✅ Jalali (شمسی) & Gregorian calendars
- 🕒 Date only, Time only, or Date & Time
- 📱 **Desktop** → inline dropdown | **Mobile** → modal overlay
- 🌓 Automatic dark mode (system preference or `data-theme="dark"`)
- 🎨 Smooth animations, touch‑friendly, fully responsive
- 🧩 Configurable input / output formats
- 🔁 Switch calendars on the fly
- 📦 Zero dependencies (no icon libraries, no frameworks)

---

## Quick Start

### Installation

Just include the files:

```html
<link rel="stylesheet" href="datepicker.css">
<script src="datepicker.js"></script>
```

### Usage
Attach the picker to any <input> element:

```html
<input type="text" id="myDate" placeholder="Select date">
```

```javascript
new AzarDatepicker({
    selector: '#myDate',
    mode: 'date',          // 'date' | 'time' | 'datetime'
    calendar: 'jalali',    // 'jalali' | 'gregorian'
    inputFormat: 'YYYY/MM/DD',   // custom format
    outputFormat: 'YYYY-MM-DD',
    autoload:true,
    minDate: { year: 1402, month: 1, day: 1 },
    maxDate: { year: 1404, month: 12, day: 29 },
    onSelect: function(data) {
        console.log(data.formatted); // formatted string
        console.log(data.nativeDate); // JS Date object
    }
});
```
or using html attributes

```html
<input type="text" data-azar-datepicker
       data-azar-auto-load="true"
       data-azar-calendar="jalali"
       data-azar-mode="datetime"
       data-azar-input-format="YYYY/MM/DD HH:mm">
```

or import:

```javascript
import AzarDatepicker from './datepicker.js';
const dp = new AzarDatepicker({ selector: '#myDate' });
```

```javascript
const AzarDatepicker = require('./datepicker.js');
```

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| selector | string / element | required | Target input element |
| mode | 'date' 'time' 'datetime' | 'date' | Picker mode |
| calendar | 'jalali' 'gregorian' | 'jalali' | Starting calendar |
| inputFormat | string | auto | Display format (e.g. 'YYYY/MM/DD HH:mm') |
| outputFormat | string | same as input | Format returned by getValue() and callbacks |
| autoload | boolean | true | auto load output format to input selector |
| placeholder | string | null | Placeholder for the input |
| darkMode | 'auto' 'light' 'dark' | 'auto' | Dark mode behaviour |
| rtl | boolean | auto (true for Jalali) | Force RTL/LTR direction |
| closeOnSelect | boolean | true | Close picker after date selection (not time) |
| showCalendarToggle | boolean | true | Show button to switch calendars |
| onSelect | function | null | Called when a date/time is selected |
| onChange | function | null | Called whenever the selection changes |
| onClear | function | null | Called when clicked on clear button |

> **Note:** `onSelect` and `onChange` receive an object as their argument.


```javascript
{
    year, month, day, hour, minute,  // numeric values (in current calendar)
    calendar: 'jalali'|'gregorian',
    formatted: '...',                // string formatted with outputFormat
    nativeDate: Date,                // JavaScript Date object
    iso: '...'                       // ISO 8601 string
}
```

#### Public Methods

```javascript
const dp = new AzarDatepicker({ selector: '#myDate' });

dp.open();
dp.close();
dp.toggle();
dp.getValue();          // returns current selection data object
dp.setValue({ year:1414, month:1, day:1, hour:12, minute:0 });
dp.setCalendar('gregorian');  // switch to Gregorian
dp.getCalendar();       // returns 'jalali' or 'gregorian'
dp.refresh();           // re‑detect dark mode / mobile
dp.destroy();           // completely remove the picker
```

Auto‑init via data attributes
You can also initialise pickers without writing JavaScript:

```html
<input type="text"
       data-azar-datepicker
       data-azar-mode="datetime"
       data-azar-calendar="gregorian"
       data-azar-input-format="MM/DD/YYYY HH:mm">
```

### Dark Mode
Dark mode is applied automatically when:

The user’s OS preference is dark and darkMode option is 'auto' (default)

An ancestor element has data-theme="dark" or data-bs-theme="dark"

You set darkMode: 'dark' explicitly

### Persian (Jalali) Calendar
All month and weekday names are in Persian script by default:

Months: فروردین, اردیبهشت, …

Weekdays: ش, ی, د, س, چ, پ, ج

The today button displays «امروز» in Jalali mode.

### Browser Support
All modern browsers (Chrome, Firefox, Safari, Edge).
Works on IE11 with minor polyfills (not guaranteed).

### Demo
Open index.html in your browser or visit the GitHub Pages demo after enabling it.

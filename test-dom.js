/* DOM smoke test for azar-datepicker using jsdom. Run: node test-dom.js (requires: npm i -D jsdom) */
'use strict';
var assert = require('assert');
var JSDOM;
try { JSDOM = require('jsdom').JSDOM; }
catch (e) { console.log('jsdom not installed - skipping DOM smoke test (npm i -D jsdom)'); process.exit(0); }

var dom = new JSDOM('<!doctype html><html><body><input id="dp"></body></html>', { pretendToBeVisual: true });
global.window = dom.window;
global.document = dom.window.document;
global.MutationObserver = dom.window.MutationObserver;
window.matchMedia = window.matchMedia || function () {
    return { matches: false, addEventListener: function () {}, removeEventListener: function () {} };
};
window.innerWidth = 1280;
window.innerHeight = 800;

require('./datepicker.js');
var AzarDatepicker = window.AzarDatepicker;
assert.ok(AzarDatepicker, 'AzarDatepicker attached to window');

var changes = [];
var dp = new AzarDatepicker({
    selector: '#dp',
    calendar: 'jalali',
    onChange: function (d) { changes.push(d.formatted); }
});

// DOM built
var container = document.querySelector('.azar-datepicker-container');
assert.ok(container, 'container in body');
assert.ok(document.querySelector('.azar-overlay'), 'overlay in body');
assert.ok(document.querySelector('.azar-datepicker-wrapper.azar-has-clear'), 'wrapper has azar-has-clear');
assert.strictEqual(container.getAttribute('dir'), 'rtl', 'jalali defaults to rtl');

// Theme classes applied (light OS default -> azar-light)
assert.ok(container.classList.contains('azar-light'), 'container gets azar-light in auto/light');

// open -> renders days grid with a roving tabindex cell
dp.open();
assert.strictEqual(dp._isOpen, true, 'open sets _isOpen');
var cells = container.querySelectorAll('.azar-day-cell:not(.azar-outside)');
assert.ok(cells.length >= 29, 'days rendered');
assert.strictEqual(container.querySelectorAll('.azar-day-cell[tabindex="0"]').length, 1, 'exactly one roving tabindex cell');

// select a day via public path
dp.setValue({ year: 1403, month: 1, day: 1 });
assert.strictEqual(dp.getValue().formatted, '1403/01/01', 'setValue + format');
assert.strictEqual(dp.getValue().nativeDate.getFullYear(), 2024, 'native year');

// close then immediately reopen (regression: was blocked for 200ms)
dp.close();
assert.strictEqual(dp._isOpen, false, 'close is synchronous');
dp.open();
assert.strictEqual(dp._isOpen, true, 'immediate reopen works');

// calendar toggle: converts selection and flips rtl (auto)
dp._toggleCalendar();
assert.strictEqual(dp.getCalendar(), 'gregorian');
var v = dp.getValue();
assert.deepStrictEqual({ y: v.year, m: v.month, d: v.day }, { y: 2024, m: 3, d: 20 }, 'selection converted on toggle');
assert.strictEqual(dp._containerEl.getAttribute('dir'), null, 'rtl removed for gregorian (auto rtl)');
assert.strictEqual(dp._containerEl.getAttribute('aria-label'), 'Choose date', 'aria-label follows calendar');
dp._toggleCalendar();
assert.strictEqual(dp.getValue().formatted, '1403/01/01', 'round-trip toggle restores date');

// onChange dedup resets after clear
dp._onDaySelect({ year: 1403, month: 1, day: 5 });
var n1 = changes.length;
assert.ok(n1 >= 1, 'onChange fired');
dp._clear();
dp._onDaySelect({ year: 1403, month: 1, day: 5 });
assert.strictEqual(changes.length, n1 + 1, 'onChange fires again for same date after clear');

// min/max respected by setValue
var dp2 = new AzarDatepicker({
    selector: (function () { var i = document.createElement('input'); i.id = 'dp2'; document.body.appendChild(i); return i; })(),
    calendar: 'jalali',
    minDate: { year: 1403, month: 1, day: 10 }
});
dp2.setValue({ year: 1403, month: 1, day: 1 });
assert.strictEqual(dp2.getValue().day, 10, 'setValue clamped to minDate');

// setValueFromString respects inputFormat
dp2.setValueFromString('1403/02/15');
assert.strictEqual(dp2.getValue().month, 2, 'setValueFromString parses');

// destroy: removes DOM, second destroy/open are no-ops
dp.destroy();
assert.strictEqual(document.querySelectorAll('.azar-datepicker-container').length, 1, 'destroyed container removed (dp2 remains)');
assert.strictEqual(dp._containerEl, null, 'container ref nulled');
dp.open(); // must not throw
dp.destroy(); // must not throw
dp2.destroy();
assert.strictEqual(document.querySelectorAll('.azar-datepicker-container').length, 0, 'all containers removed');
assert.strictEqual(document.getElementById('dp').hasAttribute('readonly'), false, 'input restored');

console.log('DOM smoke test passed.');

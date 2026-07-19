/* Assert-based self-check for the pure date logic. Run: node test.js */
'use strict';
var assert = require('assert');
require('./datepicker.js');
var AzarDatepicker = global.AzarDatepicker;
var I = AzarDatepicker._internals;

// --- isJalaliLeap must agree with the converters' 33-year cycle ---
function yearLengthViaConverter(jy) {
    function toDays(y) {
        var g = I.jalaliToGregorian(y, 1, 1);
        return Date.UTC(g.gy, g.gm - 1, g.gd) / 86400000;
    }
    return toDays(jy + 1) - toDays(jy);
}
for (var y = 1200; y <= 1500; y++) {
    var convLeap = yearLengthViaConverter(y) === 366;
    assert.strictEqual(I.isJalaliLeap(y), convLeap, 'leap mismatch for jalali year ' + y);
    assert.strictEqual(I.jalaliDaysInMonth(y, 12), convLeap ? 30 : 29, 'esfand length wrong for ' + y);
}

// --- round-trip jalali <-> gregorian for every day of several years ---
[1402, 1403, 1404, 1408, 1375].forEach(function (jy) {
    for (var jm = 1; jm <= 12; jm++) {
        var dim = I.jalaliDaysInMonth(jy, jm);
        for (var jd = 1; jd <= dim; jd++) {
            var g = I.jalaliToGregorian(jy, jm, jd);
            var j = I.gregorianToJalali(g.gy, g.gm, g.gd);
            assert.deepStrictEqual(j, { jy: jy, jm: jm, jd: jd },
                'round-trip failed for ' + jy + '/' + jm + '/' + jd + ' -> ' + JSON.stringify(g) + ' -> ' + JSON.stringify(j));
        }
    }
});
[2023, 2024, 2025].forEach(function (gy) {
    for (var gm = 1; gm <= 12; gm++) {
        var dim = I.gregorianDaysInMonth(gy, gm);
        for (var gd = 1; gd <= dim; gd++) {
            var j = I.gregorianToJalali(gy, gm, gd);
            var g = I.jalaliToGregorian(j.jy, j.jm, j.jd);
            assert.deepStrictEqual(g, { gy: gy, gm: gm, gd: gd },
                'round-trip failed for gregorian ' + gy + '/' + gm + '/' + gd);
        }
    }
});
// Known anchor: 2024-03-20 is Farvardin 1, 1403
assert.deepStrictEqual(I.gregorianToJalali(2024, 3, 20), { jy: 1403, jm: 1, jd: 1 });

// Historical anchors — guard against the jalaliToGregorian era-shift regression
// (the pre-fix code returned dates a full year off for e.g. all of 1280-1378)
assert.deepStrictEqual(I.jalaliToGregorian(1357, 11, 22), { gy: 1979, gm: 2, gd: 11 });
assert.deepStrictEqual(I.jalaliToGregorian(1342, 1, 1), { gy: 1963, gm: 3, gd: 21 });
assert.deepStrictEqual(I.jalaliToGregorian(1300, 1, 1), { gy: 1921, gm: 3, gd: 21 });
assert.deepStrictEqual(I.jalaliToGregorian(1403, 1, 1), { gy: 2024, gm: 3, gd: 20 });

// Converters must be exact inverses across the full supported range
for (var jy2 = 1; jy2 <= 3000; jy2++) {
    var gg = I.jalaliToGregorian(jy2, 1, 1);
    var jj = I.gregorianToJalali(gg.gy, gg.gm, gg.gd);
    assert.deepStrictEqual(jj, { jy: jy2, jm: 1, jd: 1 }, 'converter inverse failed for year ' + jy2);
}

// --- _formatDate: token substitution must not corrupt month names ---
var GM = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
var GMS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function fmt(format, dateObj) {
    return AzarDatepicker.prototype._formatDate.call({ _calendar: 'gregorian' }, dateObj, format);
}
assert.strictEqual(fmt('MMMM D, YYYY', { year: 2024, month: 5, day: 5 }), 'May 5, 2024');
assert.strictEqual(fmt('D MMMM YYYY', { year: 2024, month: 12, day: 5 }), '5 December 2024');
assert.strictEqual(fmt('MMM D', { year: 2024, month: 3, day: 9 }), 'Mar 9');
assert.strictEqual(fmt('YYYY-MM-DD HH:mm', { year: 2024, month: 1, day: 2, hour: 3, minute: 4 }), '2024-01-02 03:04');
assert.strictEqual(fmt('h:mm A', { year: 2024, month: 1, day: 1, hour: 13, minute: 5 }), '1:05 PM');
assert.strictEqual(fmt('hh:mm a', { year: 2024, month: 1, day: 1, hour: 0, minute: 0 }), '12:00 am');

// --- parseDateString round-trips through _formatDate ---
var p = I.parseDateString('2024-05-05 13:45', 'YYYY-MM-DD HH:mm', GM, GMS, false);
assert.deepStrictEqual(p, { year: 2024, month: 5, day: 5, hour: 13, minute: 45 });
p = I.parseDateString('May 5, 2024', 'MMMM D, YYYY', GM, GMS, false);
assert.deepStrictEqual(p, { year: 2024, month: 5, day: 5, hour: 0, minute: 0 });
p = I.parseDateString('1403/01/01', 'YYYY/MM/DD', GM, GMS, true);
assert.deepStrictEqual(p, { year: 1403, month: 1, day: 1, hour: 0, minute: 0 });
// YY pivots per calendar era
assert.strictEqual(I.parseDateString('03/01/01', 'YY/MM/DD', GM, GMS, true).year, 1403);
assert.strictEqual(I.parseDateString('03-01-01', 'YY-MM-DD', GM, GMS, false).year, 2003);
assert.strictEqual(I.parseDateString('not a date', 'YYYY/MM/DD', GM, GMS, false), null);

console.log('All checks passed.');

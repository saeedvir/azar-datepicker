/*! Azar Datepicker v1.2.0 – Persian & Gregorian date picker (pure JS) */
/*
* https://github.com/saeedvir/azar-datepicker
*
* Changelog (unreleased):
* - Fixed jalaliToGregorian century correction (whole eras, e.g. 1280-1378, were +1 year off)
* - Fixed isJalaliLeap to derive from the converters (Esfand length was wrong in ~38 of 150 years)
* - Fixed calendar toggle overwriting the converted day with the source day number
* - Fixed _formatDate corrupting output when substituted values contain token letters
* - Fixed PageUp/PageDown producing month 0/13
* - Fixed dropdown position on scrolled pages (container is position:fixed + scroll tracking)
* - Fixed dark mode: azar-dark/azar-light classes; forced modes now fully themed
* - Fixed prefers-reduced-motion breaking modal/clear-button/RTL-arrow layout
* - Fixed reopen being blocked for 200ms after close
* - Fixed onChange/onSelect not firing when reselecting the same date after clear
* - Fixed locale options mutating shared globals across instances
* - Fixed RTL/labels not following calendar toggle when rtl was auto
* - setValue now clamps to minDate/maxDate; destroy cancels pending timeouts
*
* Changelog v1.2.0:
* - Fixed calendar toggle losing days 29-31
* - Fixed memory leaks in destroy()
* - Fixed close/open race condition
* - Fixed RTL clear-button positioning
* - Fixed minDate/maxDate not converting on calendar toggle
* - Fixed _goToToday() bypassing bounds
* - Fixed setValueFromString() respecting inputFormat
* - Fixed dateToTotalDays() using consistent timestamps
* - Fixed today-on-weekend color override
* - Fixed negative years in year grid
* - Fixed _navigate() min/max guard for year view
* - Added deduplication for onChange/onSelect
* - Added keyboard navigation (arrows, page, home, end, enter, escape)
* - Added ARIA roles, labels, and live regions
* - Added focus trap for modal mode
* - Added horizontal viewport overflow protection
* - Added MutationObserver for data-theme changes
* - Added prefers-reduced-motion support
*/
(function (global) {
    'use strict';

    // ========== JALALI CALENDAR CONVERSION (SAFE) ==========
    function gregorianToJalali(gy, gm, gd) {
        if (gy < 1 || gm < 1 || gm > 12 || gd < 1) return null;
        var g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
        var gy2 = (gm > 2) ? (gy + 1) : gy;
        var days = 355666 + (365 * gy) + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) +
            Math.floor((gy2 + 399) / 400) + gd + g_d_m[gm - 1];
        var jy = -1595 + (33 * Math.floor(days / 12053));
        days %= 12053;
        jy += 4 * Math.floor(days / 1461);
        days %= 1461;
        if (days > 365) {
            jy += Math.floor((days - 1) / 365);
            days = (days - 1) % 365;
        }
        if (jy < 1 || jy > 4000) return null;
        var jm, jd;
        if (days < 186) {
            jm = 1 + Math.floor(days / 31);
            jd = 1 + (days % 31);
        } else {
            jm = 7 + Math.floor((days - 186) / 30);
            jd = 1 + ((days - 186) % 30);
        }
        if (jm < 1 || jm > 12 || jd < 1 || jd > 31) return null;
        return { jy: jy, jm: jm, jd: jd };
    }

    function jalaliToGregorian(jy, jm, jd) {
        if (jy < 1 || jm < 1 || jm > 12 || jd < 1) return null;
        var jy1 = jy + 1595;
        var days = -355668 + 365 * jy1 + Math.floor(jy1 / 33) * 8 + Math.floor(((jy1 % 33) + 3) / 4) + jd;
        if (jm < 7) {
            days += (jm - 1) * 31;
        } else {
            days += (jm - 7) * 30 + 186;
        }
        var gy = 400 * Math.floor(days / 146097);
        days %= 146097;
        if (days > 36524) {
            gy += 100 * Math.floor((days - 1) / 36524);
            days = (days - 1) % 36524;
            // Standard JDF algorithm: the century correction restores a DAY
            // to the counter (days++), it does not bump the year. The old
            // gy++ here shifted whole eras (e.g. all of 1280-1378) by +1 year.
            if (days >= 365) days++;
        }
        gy += 4 * Math.floor(days / 1461);
        days %= 1461;
        if (days > 365) {
            gy += Math.floor((days - 1) / 365);
            days = (days - 1) % 365;
        }
        var gdml = [0, 31, isGregorianLeap(gy) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        var gm;
        for (gm = 1; gm < 13; gm++) {
            if (days < gdml[gm]) break;
            days -= gdml[gm];
        }
        var gd = days + 1;
        return { gy: gy, gm: gm, gd: gd };
    }

    function isGregorianLeap(year) { return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0); }
    // Leap status must agree with jalaliToGregorian's 33-year cycle: a year is
    // leap iff Esfand 30 round-trips through the converters unchanged.
    function isJalaliLeap(year) {
        var g = jalaliToGregorian(year, 12, 30);
        if (!g) return false;
        var j = gregorianToJalali(g.gy, g.gm, g.gd);
        return !!j && j.jm === 12 && j.jd === 30;
    }
    function jalaliDaysInMonth(year, month) {
        if (month <= 6) return 31;
        if (month <= 11) return 30;
        return isJalaliLeap(year) ? 30 : 29;
    }
    function gregorianDaysInMonth(year, month) {
        if (month === 2) return isGregorianLeap(year) ? 29 : 28;
        return [1, 3, 5, 7, 8, 10, 12].indexOf(month) !== -1 ? 31 : 30;
    }

    // FIXED: Convert both calendars to Unix timestamps for consistent comparison
    function dateToTotalDays(dateObj, calendar) {
        if (!dateObj) return NaN;
        var y = dateObj.year, m = dateObj.month, d = dateObj.day;
        var h = dateObj.hour || 0, min = dateObj.minute || 0;
        if (calendar === 'jalali') {
            var g = jalaliToGregorian(y, m, d);
            if (!g) return NaN;
            return new Date(g.gy, g.gm - 1, g.gd, h, min).getTime();
        } else {
            return new Date(y, m - 1, d, h, min).getTime();
        }
    }

    // Helper: convert a date object between calendars
    function convertDateObj(dateObj, fromCal, toCal) {
        if (!dateObj) return null;
        if (fromCal === toCal) {
            return { year: dateObj.year, month: dateObj.month, day: dateObj.day, hour: dateObj.hour || 0, minute: dateObj.minute || 0 };
        }
        if (toCal === 'jalali') {
            var j = gregorianToJalali(dateObj.year, dateObj.month, dateObj.day);
            if (!j) return null;
            return { year: j.jy, month: j.jm, day: j.jd, hour: dateObj.hour || 0, minute: dateObj.minute || 0 };
        } else {
            var g = jalaliToGregorian(dateObj.year, dateObj.month, dateObj.day);
            if (!g) return null;
            return { year: g.gy, month: g.gm, day: g.gd, hour: dateObj.hour || 0, minute: dateObj.minute || 0 };
        }
    }

    // Helper: parse a date string according to inputFormat.
    // months/monthsShort are passed in so per-instance locales work.
    function parseDateString(str, format, months, monthsShort, isJalali) {
        // Build regex by replacing tokens
        var regex = format
            .replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
            .replace(/\bYYYY\b/g, '(\\d{4})')
            .replace(/\bYY\b/g, '(\\d{2})')
            .replace(/\bMMMM\b/g, '([^\\s\\d]+)')
            .replace(/\bMMM\b/g, '([^\\s\\d]+)')
            .replace(/\bMM\b/g, '(\\d{1,2})')
            .replace(/\bM\b/g, '(\\d{1,2})')
            .replace(/\bDD\b/g, '(\\d{1,2})')
            .replace(/\bD\b/g, '(\\d{1,2})')
            .replace(/\bHH\b/g, '(\\d{1,2})')
            .replace(/\bH\b/g, '(\\d{1,2})')
            .replace(/\bhh\b/g, '(\\d{1,2})')
            .replace(/\bh\b/g, '(\\d{1,2})')
            .replace(/\bmm\b/g, '(\\d{2})')
            .replace(/\bm\b/g, '(\\d{1,2})')
            .replace(/\bA\b/g, '(AM|PM)')
            .replace(/\ba\b/g, '(am|pm)');

        var match = str.match(new RegExp('^' + regex + '$'));
        if (!match) return null;

        var tokenRegex = /\b(YYYY|YY|MMMM|MMM|MM|M|DD|D|HH|H|hh|h|mm|m|A|a)\b/g;
        var tokens = [];
        var m;
        while ((m = tokenRegex.exec(format)) !== null) {
            tokens.push(m[1]);
        }

        var result = { year: 0, month: 0, day: 0, hour: 0, minute: 0 };
        for (var i = 0; i < tokens.length; i++) {
            var val = match[i + 1];
            if (!val) continue;
            switch (tokens[i]) {
                case 'YYYY': result.year = parseInt(val, 10); break;
                case 'YY':
                    // Two-digit years pivot within the current era of each calendar
                    result.year = parseInt(val, 10) + (isJalali
                        ? (parseInt(val, 10) < 50 ? 1400 : 1300)
                        : (parseInt(val, 10) < 50 ? 2000 : 1900));
                    break;
                case 'MM':
                case 'M': result.month = parseInt(val, 10); break;
                case 'DD':
                case 'D': result.day = parseInt(val, 10); break;
                case 'HH':
                case 'H': result.hour = parseInt(val, 10); break;
                case 'hh':
                case 'h': result.hour = parseInt(val, 10); break;
                case 'mm':
                case 'm': result.minute = parseInt(val, 10); break;
                case 'A':
                case 'a':
                    if (/PM|pm/.test(val) && result.hour < 12) result.hour += 12;
                    if (/AM|am/.test(val) && result.hour === 12) result.hour = 0;
                    break;
                case 'MMMM':
                    var idx = months.indexOf(val);
                    if (idx !== -1) result.month = idx + 1;
                    break;
                case 'MMM':
                    var idx2 = monthsShort.indexOf(val);
                    if (idx2 !== -1) result.month = idx2 + 1;
                    break;
            }
        }
        return result;
    }

    // ========== PERSIAN LOCALISATION (defaults, overridable) ==========
    var JALALI_MONTHS = [
        'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
        'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
    ];
    var JALALI_MONTHS_SHORT = [
        'فرو', 'ارد', 'خرد', 'تیر', 'مرد', 'شهر', 'مهر', 'آبا', 'آذر', 'دی', 'بهم', 'اسف'
    ];
    var GREGORIAN_MONTHS = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    var GREGORIAN_MONTHS_SHORT = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    var JALALI_WEEKDAYS = [
        'شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'
    ];
    var JALALI_WEEKDAYS_SHORT = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];
    var GREGORIAN_WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    var GREGORIAN_WEEKDAYS_SHORT = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

    // ========== AzarDatepicker CLASS ==========
    var AzarDatepicker = function (options) {
        this._defaults = {
            selector: null,
            mode: 'date',
            calendar: 'jalali',
            autoLoad: false,
            inputFormat: null,
            outputFormat: null,
            placeholder: null,
            onLoad: null,
            onSelect: null,
            onChange: null,
            onClear: null,
            minDate: null,
            maxDate: null,
            darkMode: 'auto',
            rtl: null,
            closeOnSelect: true,
            showCalendarToggle: true,
            showClearButton: true,
            jalaliMonths: null,
            jalaliMonthsShort: null,
            jalaliWeekDaysShort: null
        };

        this.options = {};
        for (var key in this._defaults) {
            if (this._defaults.hasOwnProperty(key)) {
                this.options[key] = (options && options[key] !== undefined) ? options[key] : this._defaults[key];
            }
        }

        this.inputEl = null;
        if (typeof this.options.selector === 'string') {
            this.inputEl = document.querySelector(this.options.selector);
        } else if (this.options.selector && this.options.selector.nodeType) {
            this.inputEl = this.options.selector;
        }
        if (!this.inputEl) {
            console.error('AzarDatepicker: selector not found.');
            return;
        }

        // Remember whether rtl was auto-derived so _toggleCalendar can re-derive it
        this._rtlAuto = (this.options.rtl === null);
        if (this._rtlAuto) {
            this.options.rtl = (this.options.calendar === 'jalali');
        }

        // Per-instance locale: never mutate the shared defaults
        this._jalaliMonths = this.options.jalaliMonths || JALALI_MONTHS;
        this._jalaliMonthsShort = this.options.jalaliMonthsShort || JALALI_MONTHS_SHORT;
        this._jalaliWeekdaysShort = this.options.jalaliWeekDaysShort || JALALI_WEEKDAYS_SHORT;

        if (!this.options.inputFormat) {
            if (this.options.mode === 'time') {
                this.options.inputFormat = 'HH:mm';
            } else if (this.options.mode === 'datetime') {
                this.options.inputFormat = (this.options.calendar === 'jalali') ? 'YYYY/MM/DD HH:mm' : 'YYYY-MM-DD HH:mm';
            } else {
                this.options.inputFormat = (this.options.calendar === 'jalali') ? 'YYYY/MM/DD' : 'YYYY-MM-DD';
            }
        }
        if (!this.options.outputFormat) {
            this.options.outputFormat = this.options.inputFormat;
        }

        this._calendar = this.options.calendar;
        this._view = 'days';
        this._selectedDate = null;
        this._cursorDate = null;
        this._isOpen = false;
        this._isMobile = false;
        this._isDark = false;
        this._wrapperEl = null;
        this._containerEl = null;
        this._overlayEl = null;
        this._closingTimeout = null;
        this._handlers = {};
        this._prefersDarkMql = null;
        this._themeObserver = null;
        this._lastChangeKey = null;
        this._lastSelectKey = null;
        this._id = 'azar-' + Math.random().toString(36).slice(2, 11);

        this._init();
    };

    AzarDatepicker.prototype._init = function () {
        this._detectDarkMode();
        this._detectMobile();
        this._buildDOM();
        this._setInitialDate();
        this._bindEvents();
        this._updateInputDisplay();
        this._applyDarkMode();
        if (this.options.autoLoad) {
            this._setTodaySilently();
        }
        if (typeof this.options.onLoad === 'function') {
            this.options.onLoad(this);
        }
    };

    AzarDatepicker.prototype._getWeekdayIndex = function (year, month, day) {
        var cal = this._calendar;
        var date;
        if (cal === 'jalali') {
            var g = jalaliToGregorian(year, month, day);
            if (!g) return 0;
            date = new Date(g.gy, g.gm - 1, g.gd);
        } else {
            date = new Date(year, month - 1, day);
        }
        return date.getDay();
    };

    AzarDatepicker.prototype._isWeekend = function (weekdayIndex) {
        var cal = this._calendar;
        if (cal === 'jalali') {
            return weekdayIndex === 5;
        } else {
            return weekdayIndex === 0 || weekdayIndex === 6;
        }
    };

    AzarDatepicker.prototype._setTodaySilently = function () {
        var now = new Date();
        var gy = now.getFullYear(), gm = now.getMonth() + 1, gd = now.getDate();
        var hour = now.getHours(), minute = now.getMinutes();

        if (this._calendar === 'jalali') {
            var j = gregorianToJalali(gy, gm, gd);
            if (!j) j = gregorianToJalali(2024, 1, 1);
            this._selectedDate = { year: j.jy, month: j.jm, day: j.jd, hour: hour, minute: minute };
            this._cursorDate = { year: j.jy, month: j.jm, day: j.jd, hour: hour, minute: minute };
        } else {
            this._selectedDate = { year: gy, month: gm, day: gd, hour: hour, minute: minute };
            this._cursorDate = { year: gy, month: gm, day: gd, hour: hour, minute: minute };
        }

        this._selectedDate = this._clampToBounds(this._selectedDate);
        this._cursorDate = this._clampToBounds(this._cursorDate);

        this._view = 'days';
        this._updateInputDisplay();
        this._renderView();
    };

    AzarDatepicker.prototype._detectDarkMode = function () {
        var dm = this.options.darkMode;
        if (dm === 'dark') { this._isDark = true; return; }
        if (dm === 'light') { this._isDark = false; return; }
        var htmlEl = document.documentElement;
        var bsTheme = htmlEl.getAttribute('data-bs-theme');
        var dataTheme = htmlEl.getAttribute('data-theme');
        if (bsTheme === 'dark' || dataTheme === 'dark') {
            this._isDark = true;
        } else if (bsTheme === 'light' || dataTheme === 'light') {
            this._isDark = false;
        } else {
            this._isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
    };

    AzarDatepicker.prototype._detectMobile = function () {
        this._isMobile = window.innerWidth < 768;
    };

    AzarDatepicker.prototype._buildDOM = function () {
        var wrapper = document.createElement('div');
        wrapper.className = 'azar-datepicker-wrapper';
        if (this.options.rtl) wrapper.classList.add('azar-rtl');
        this.inputEl.parentNode.insertBefore(wrapper, this.inputEl);
        wrapper.appendChild(this.inputEl);
        this.inputEl.classList.add('azar-datepicker-input');
        if (this.options.placeholder) {
            this.inputEl.setAttribute('placeholder', this.options.placeholder);
        }
        this.inputEl.setAttribute('readonly', 'readonly');
        this.inputEl.setAttribute('autocomplete', 'off');
        this.inputEl.setAttribute('aria-haspopup', 'dialog');
        this.inputEl.setAttribute('aria-expanded', 'false');
        this.inputEl.setAttribute('aria-controls', this._id);
        this._wrapperEl = wrapper;

        if (this.options.showClearButton) {
            var clearBtn = document.createElement('button');
            clearBtn.className = 'azar-clear-btn';
            clearBtn.setAttribute('type', 'button');
            clearBtn.innerHTML = '✕';
            clearBtn.setAttribute('aria-label', 'Clear date');
            clearBtn.style.display = 'none';
            wrapper.appendChild(clearBtn);
            wrapper.classList.add('azar-has-clear');
            this._clearBtn = clearBtn;
        }

        var container = document.createElement('div');
        container.className = 'azar-datepicker-container';
        container.setAttribute('id', this._id);
        container.setAttribute('role', 'dialog');
        container.setAttribute('aria-label', this._calendar === 'jalali' ? 'انتخاب تاریخ' : 'Choose date');
        container.setAttribute('aria-modal', 'false');
        if (this.options.rtl) container.setAttribute('dir', 'rtl');
        container.setAttribute('data-calendar', this._calendar);
        container.innerHTML = this._renderFullHTML();
        document.body.appendChild(container);
        this._containerEl = container;

        var overlay = document.createElement('div');
        overlay.className = 'azar-overlay';
        document.body.appendChild(overlay);
        this._overlayEl = overlay;

        this._containerInBody = true;
    };

    AzarDatepicker.prototype._renderFullHTML = function () {
        var cal = this._calendar;
        var mode = this.options.mode;
        var showToggle = this.options.showCalendarToggle;
        var wkds = cal === 'jalali' ? this._jalaliWeekdaysShort : GREGORIAN_WEEKDAYS_SHORT;
        var wkdsHTML = '';
        for (var i = 0; i < 7; i++) wkdsHTML += '<span>' + wkds[i] + '</span>';

        var hourLabel = cal === 'jalali' ? 'ساعت' : 'Hour';
        var minuteLabel = cal === 'jalali' ? 'دقیقه' : 'Min';
        var prevBtn = cal === 'jalali' ? '›' : '‹';
        var nextBtn = cal === 'jalali' ? '‹' : '›';

        var html = '';
        html += '<div class="azar-datepicker-header">';
        html += '<button class="azar-btn-nav azar-btn-prev" type="button" data-action="prev" aria-label="Previous">' + prevBtn + '</button>';
        html += '<div class="azar-header-display" data-action="switch-view" role="button" tabindex="0"><span class="azar-month-name"></span>&nbsp;<span class="azar-year"></span></div>';
        html += '<button class="azar-btn-nav azar-btn-next" type="button" data-action="next" aria-label="Next">' + nextBtn + '</button>';
        html += '</div>';

        html += '<div class="azar-datepicker-body">';
        html += '<div class="azar-view-days" data-view="days" role="grid">';
        html += '<div class="azar-weekdays" role="row">' + wkdsHTML + '</div>';
        html += '<div class="azar-days-grid"></div>';
        html += '</div>';
        html += '<div class="azar-view-months" data-view="months" style="display:none;" role="grid"></div>';
        html += '<div class="azar-view-years" data-view="years" style="display:none;" role="grid"></div>';
        html += '</div>';

        html += '<div class="azar-datepicker-footer">';
        var todayText = cal === 'jalali' ? 'امروز' : 'Today';
        html += '<button class="azar-btn-today" type="button" data-action="today">' + todayText + '</button>';
        if (showToggle) {
            var toggleLabel = cal === 'jalali' ? 'میلادی' : 'شمسی';
            html += '<button class="azar-calendar-toggle" type="button" data-action="toggle-calendar">' + toggleLabel + '</button>';
        }
        if (mode === 'time' || mode === 'datetime') {
            html += '<div class="azar-time-picker">';
            html += '<div class="azar-time-col"><button class="azar-time-btn" type="button" data-action="inc-hour" aria-label="Increase hour">▲</button><span class="azar-time-value azar-hour-val" aria-live="polite">00</span><button class="azar-time-btn" type="button" data-action="dec-hour" aria-label="Decrease hour">▼</button><label>' + hourLabel + '</label></div>';
            html += '<span class="azar-time-sep">:</span>';
            html += '<div class="azar-time-col"><button class="azar-time-btn" type="button" data-action="inc-min" aria-label="Increase minute">▲</button><span class="azar-time-value azar-min-val" aria-live="polite">00</span><button class="azar-time-btn" type="button" data-action="dec-min" aria-label="Decrease minute">▼</button><label>' + minuteLabel + '</label></div>';
            html += '</div>';
        }
        html += '</div>';

        return html;
    };

    AzarDatepicker.prototype._setInitialDate = function () {
        var now = new Date();
        var gy = now.getFullYear();
        var gm = now.getMonth() + 1;
        var gd = now.getDate();
        var hour = now.getHours();
        var minute = now.getMinutes();

        if (this._calendar === 'jalali') {
            var j = gregorianToJalali(gy, gm, gd);
            if (!j) j = gregorianToJalali(2024, 1, 1);
            this._cursorDate = { year: j.jy, month: j.jm, day: j.jd, hour: hour, minute: minute };
            this._selectedDate = null;
        } else {
            this._cursorDate = { year: gy, month: gm, day: gd, hour: hour, minute: minute };
            this._selectedDate = null;
        }
    };

    AzarDatepicker.prototype._bindEvents = function () {
        var self = this;

        this._handlers.clearClick = function (e) { e.stopPropagation(); self._clear(); };
        this._handlers.inputClick = function (e) {
            e.stopPropagation();
            if (!self._containerEl) return;
            self._isOpen ? self.close() : self.open();
        };
        this._handlers.containerClick = function (e) {
            e.preventDefault();
            var target = e.target;
            var action = target.getAttribute('data-action') || (target.closest('[data-action]') ? target.closest('[data-action]').getAttribute('data-action') : null);

            if (!action) {
                if (target.classList.contains('azar-day-cell') && !target.classList.contains('azar-outside') && !target.classList.contains('azar-disabled')) {
                    action = 'select-day';
                    target._dayData = {
                        year: parseInt(target.getAttribute('data-year')),
                        month: parseInt(target.getAttribute('data-month')),
                        day: parseInt(target.getAttribute('data-day'))
                    };
                }
                if (target.classList.contains('azar-month-cell')) { action = 'select-month'; target._monthData = parseInt(target.getAttribute('data-month')); }
                if (target.classList.contains('azar-year-cell')) { action = 'select-year'; target._yearData = parseInt(target.getAttribute('data-year')); }
            }

            if (!action) return;
            switch (action) {
                case 'prev': self._navigate(-1); break;
                case 'next': self._navigate(1); break;
                case 'switch-view': self._cycleView(); break;
                case 'today': self._goToToday(); break;
                case 'toggle-calendar': self._toggleCalendar(); break;
                case 'select-day': self._onDaySelect(target._dayData); break;
                case 'select-month': self._onMonthSelect(target._monthData); break;
                case 'select-year': self._onYearSelect(target._yearData); break;
                case 'inc-hour': self._adjustTime(1, 0); break;
                case 'dec-hour': self._adjustTime(-1, 0); break;
                case 'inc-min': self._adjustTime(0, 1); break;
                case 'dec-min': self._adjustTime(0, -1); break;
            }
        };
        this._handlers.overlayClick = function () { self.close(); };
        this._handlers.docClick = function (e) {
            if (self._isOpen && !self._wrapperEl.contains(e.target) && !self._containerEl.contains(e.target) && e.target !== self._overlayEl) {
                self.close();
            }
        };
        this._handlers.docKey = function (e) { self._handleDocKey(e); };
        this._handlers.resize = function () {
            var wasMobile = self._isMobile;
            self._detectMobile();
            if (wasMobile !== self._isMobile && self._isOpen) {
                self.close();
                self._reopenTimeout = setTimeout(function () { self.open(); }, 150);
            } else if (self._isOpen && !self._isMobile) {
                self._positionContainer();
            }
        };
        // Container is position:fixed, so it must track the input on scroll
        // (capture phase catches scrolling inside nested containers too).
        this._handlers.scroll = function () {
            if (self._isOpen && !self._isMobile) self._positionContainer();
        };

        if (this._clearBtn) {
            this._clearBtn.addEventListener('click', this._handlers.clearClick);
        }
        this.inputEl.addEventListener('click', this._handlers.inputClick);
        this._containerEl.addEventListener('click', this._handlers.containerClick);
        this._overlayEl.addEventListener('click', this._handlers.overlayClick);
        document.addEventListener('click', this._handlers.docClick);
        document.addEventListener('keydown', this._handlers.docKey);
        window.addEventListener('resize', this._handlers.resize);
        window.addEventListener('scroll', this._handlers.scroll, true);

        if (window.matchMedia) {
            var mql = window.matchMedia('(prefers-color-scheme: dark)');
            this._handlers.prefersDark = function (e) {
                if (self.options.darkMode === 'auto') {
                    self._isDark = e.matches;
                    self._applyDarkMode();
                }
            };
            mql.addEventListener('change', this._handlers.prefersDark);
            this._prefersDarkMql = mql;
        }

        // ADDED: Watch for data-theme / data-bs-theme changes
        this._themeObserver = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {
                if (mutation.attributeName === 'data-theme' || mutation.attributeName === 'data-bs-theme') {
                    if (self.options.darkMode === 'auto') {
                        self._detectDarkMode();
                        self._applyDarkMode();
                    }
                }
            });
        });
        this._themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-bs-theme'] });
    };

    // ADDED: Keyboard navigation & focus trap
    AzarDatepicker.prototype._handleDocKey = function (e) {
        if (!this._isOpen) return;

        // Focus trap for modal
        if (this._isMobile && e.key === 'Tab') {
            var focusables = this._containerEl.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            if (focusables.length === 0) return;
            var first = focusables[0];
            var last = focusables[focusables.length - 1];
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
            return;
        }

        if (e.key === 'Escape') {
            this.close();
            this.inputEl.focus();
            return;
        }

        if (this._view !== 'days') return;

        var handled = true;
        var c = this._cursorDate;
        var newYear = c.year, newMonth = c.month, newDay = c.day || 1;

        switch (e.key) {
            case 'ArrowLeft':
                if (this.options.rtl) { newDay++; } else { newDay--; }
                break;
            case 'ArrowRight':
                if (this.options.rtl) { newDay--; } else { newDay++; }
                break;
            case 'ArrowUp': newDay -= 7; break;
            case 'ArrowDown': newDay += 7; break;
            case 'PageUp': newMonth--; break;
            case 'PageDown': newMonth++; break;
            case 'Home': newDay = 1; break;
            case 'End': newDay = this._getDaysInMonth(newYear, newMonth); break;
            case 'Enter':
                e.preventDefault();
                if (this._selectedDate && this._selectedDate.year === c.year && this._selectedDate.month === c.month && this._selectedDate.day === c.day) {
                    this.close();
                } else {
                    this._onDaySelect({ year: c.year, month: c.month, day: c.day || 1 });
                }
                return;
            default: handled = false;
        }

        if (!handled) return;
        e.preventDefault();

        // PageUp/PageDown change the month directly: normalize it before the
        // day-overflow loops (which only run when newDay is out of range),
        // and clamp the day so Jan 31 -> Feb 28 instead of spilling into March.
        if (newMonth < 1) { newMonth = 12; newYear--; }
        else if (newMonth > 12) { newMonth = 1; newYear++; }
        if (newYear < 1) newYear = 1;
        if (newDay > this._getDaysInMonth(newYear, newMonth) && (e.key === 'PageUp' || e.key === 'PageDown')) {
            newDay = this._getDaysInMonth(newYear, newMonth);
        }

        while (newDay < 1) {
            newMonth--;
            if (newMonth < 1) { newMonth = 12; newYear--; }
            if (newYear < 1) { newYear = 1; newMonth = 1; newDay = 1; break; }
            newDay += this._getDaysInMonth(newYear, newMonth);
        }
        while (newDay > this._getDaysInMonth(newYear, newMonth)) {
            newDay -= this._getDaysInMonth(newYear, newMonth);
            newMonth++;
            if (newMonth > 12) { newMonth = 1; newYear++; }
        }
        if (newYear < 1) newYear = 1;

        if (this._isOutOfBounds({ year: newYear, month: newMonth, day: newDay, hour: 0, minute: 0 })) return;

        this._cursorDate = { year: newYear, month: newMonth, day: newDay, hour: c.hour || 0, minute: c.minute || 0 };
        this._renderView();

        var cell = this._containerEl.querySelector('.azar-day-cell[data-year="' + newYear + '"][data-month="' + newMonth + '"][data-day="' + newDay + '"]:not(.azar-outside):not(.azar-disabled)');
        if (cell) cell.focus();
    };

    AzarDatepicker.prototype._navigate = function (delta) {
        var oldCursor = {
            year: this._cursorDate.year,
            month: this._cursorDate.month,
            day: this._cursorDate.day || 1
        };

        if (this._view === 'days') {
            this._cursorDate.month += delta;
            if (this._cursorDate.month > 12) { this._cursorDate.month = 1; this._cursorDate.year++; }
            else if (this._cursorDate.month < 1) { this._cursorDate.month = 12; this._cursorDate.year--; }
        } else if (this._view === 'months') {
            this._cursorDate.year += delta;
        } else if (this._view === 'years') {
            this._cursorDate.year += delta * 12;
        }
        if (this._cursorDate.year < 1) this._cursorDate.year = 1;

        // FIXED: Min/max navigation guard with year-view awareness
        if (this.options.minDate) {
            var minD = dateToTotalDays(this.options.minDate, this._calendar);
            var checkDate;
            if (this._view === 'years') {
                if (this._cursorDate.year < this.options.minDate.year) {
                    this._cursorDate = oldCursor;
                    return;
                }
                checkDate = { year: this._cursorDate.year, month: this._cursorDate.month, day: 1 };
            } else {
                var lastDay = this._getDaysInMonth(this._cursorDate.year, this._cursorDate.month);
                checkDate = { year: this._cursorDate.year, month: this._cursorDate.month, day: lastDay };
            }
            var curLast = dateToTotalDays(checkDate, this._calendar);
            if (!isNaN(minD) && !isNaN(curLast) && curLast < minD) {
                this._cursorDate = oldCursor;
                return;
            }
        }
        if (this.options.maxDate) {
            var maxD = dateToTotalDays(this.options.maxDate, this._calendar);
            var checkDate2;
            if (this._view === 'years') {
                if (this._cursorDate.year > this.options.maxDate.year) {
                    this._cursorDate = oldCursor;
                    return;
                }
                checkDate2 = { year: this._cursorDate.year, month: this._cursorDate.month, day: 1 };
            } else {
                checkDate2 = { year: this._cursorDate.year, month: this._cursorDate.month, day: 1 };
            }
            var curFirst = dateToTotalDays(checkDate2, this._calendar);
            if (!isNaN(maxD) && !isNaN(curFirst) && curFirst > maxD) {
                this._cursorDate = oldCursor;
                return;
            }
        }

        this._renderView();
    };

    AzarDatepicker.prototype._cycleView = function () {
        if (this._view === 'days') this._view = 'months';
        else if (this._view === 'months') this._view = 'years';
        else this._view = 'days';
        this._renderView();
    };

    AzarDatepicker.prototype._goToToday = function () {
        var now = new Date();
        var gy = now.getFullYear(), gm = now.getMonth() + 1, gd = now.getDate();
        var hour = now.getHours(), minute = now.getMinutes();

        var newDate;
        if (this._calendar === 'jalali') {
            var j = gregorianToJalali(gy, gm, gd);
            if (!j) j = gregorianToJalali(2024, 1, 1);
            newDate = { year: j.jy, month: j.jm, day: j.jd, hour: hour, minute: minute };
        } else {
            newDate = { year: gy, month: gm, day: gd, hour: hour, minute: minute };
        }

        newDate = this._clampToBounds(newDate);

        this._selectedDate = newDate;
        this._cursorDate = { year: newDate.year, month: newDate.month, day: newDate.day, hour: newDate.hour, minute: newDate.minute };
        this._view = 'days';
        this._renderView();
        this._updateInputDisplay();
        this._fireChange();
        if (this.options.closeOnSelect && this.options.mode !== 'time') {
            this.close();
        }
    };

    AzarDatepicker.prototype._toggleCalendar = function () {
        var newCal = (this._calendar === 'jalali') ? 'gregorian' : 'jalali';
        var cur = this._cursorDate;
        var sel = this._selectedDate;

        // Convert cursor and selection with the converters as-is: the result's
        // day IS the converted day. (The old code kept the source day number in
        // the converted month, so 1403/01/01 toggled to 2024-03-01, not 03-20.)
        var newCursor = convertDateObj({
            year: cur.year, month: cur.month, day: Math.max(1, cur.day || 1),
            hour: cur.hour || 0, minute: cur.minute || 0
        }, this._calendar, newCal);
        if (!newCursor) {
            var now = new Date();
            newCursor = convertDateObj({
                year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate(),
                hour: cur.hour || 0, minute: cur.minute || 0
            }, 'gregorian', newCal) || { year: 1403, month: 1, day: 1, hour: 0, minute: 0 };
        }

        var newSelected = sel ? convertDateObj(sel, this._calendar, newCal) : null;

        // FIXED: Convert minDate / maxDate bounds to new calendar
        if (this.options.minDate) {
            this.options.minDate = convertDateObj(this.options.minDate, this._calendar, newCal);
        }
        if (this.options.maxDate) {
            this.options.maxDate = convertDateObj(this.options.maxDate, this._calendar, newCal);
        }

        this._calendar = newCal;
        this._containerEl.setAttribute('data-calendar', newCal);
        this._containerEl.setAttribute('aria-label', newCal === 'jalali' ? 'انتخاب تاریخ' : 'Choose date');
        if (this._rtlAuto) {
            this.options.rtl = (newCal === 'jalali');
        }
        if (this.options.rtl) {
            this._containerEl.setAttribute('dir', 'rtl');
            this._wrapperEl.classList.add('azar-rtl');
        } else {
            this._containerEl.removeAttribute('dir');
            this._wrapperEl.classList.remove('azar-rtl');
        }

        this._cursorDate = newCursor;
        this._selectedDate = newSelected;
        this._view = 'days';
        this._renderView();
        this._updateInputDisplay();

        // Update buttons text
        var toggleBtn = this._containerEl.querySelector('.azar-calendar-toggle');
        if (toggleBtn) toggleBtn.textContent = newCal === 'jalali' ? 'میلادی' : 'شمسی';
        var todayBtn = this._containerEl.querySelector('.azar-btn-today');
        if (todayBtn) todayBtn.textContent = newCal === 'jalali' ? 'امروز' : 'Today';

        // Update weekdays
        var wkds = newCal === 'jalali' ? this._jalaliWeekdaysShort : GREGORIAN_WEEKDAYS_SHORT;
        var wkdSpans = this._containerEl.querySelectorAll('.azar-weekdays span');
        for (var i = 0; i < wkdSpans.length; i++) wkdSpans[i].textContent = wkds[i];

        // Update time labels
        var hourLabel = newCal === 'jalali' ? 'ساعت' : 'Hour';
        var minuteLabel = newCal === 'jalali' ? 'دقیقه' : 'Min';
        var labels = this._containerEl.querySelectorAll('.azar-time-col label');
        if (labels[0]) labels[0].textContent = hourLabel;
        if (labels[1]) labels[1].textContent = minuteLabel;

        // Update nav buttons
        var prevBtn = this._containerEl.querySelector('.azar-btn-prev');
        var nextBtn = this._containerEl.querySelector('.azar-btn-next');
        if (prevBtn) prevBtn.textContent = newCal === 'jalali' ? '›' : '‹';
        if (nextBtn) nextBtn.textContent = newCal === 'jalali' ? '‹' : '›';
    };

    AzarDatepicker.prototype._onDaySelect = function (dayData) {
        var newDate = {
            year: dayData.year,
            month: dayData.month,
            day: dayData.day,
            hour: this._selectedDate ? this._selectedDate.hour : (this._cursorDate.hour || 0),
            minute: this._selectedDate ? this._selectedDate.minute : (this._cursorDate.minute || 0)
        };

        if (this._isOutOfBounds(newDate)) return;

        this._selectedDate = newDate;
        this._cursorDate.year = dayData.year;
        this._cursorDate.month = dayData.month;
        this._cursorDate.day = dayData.day;
        this._updateInputDisplay();
        this._renderView();
        this._fireChange();
        this._fireSelect();
        if (this.options.closeOnSelect && this.options.mode === 'date') {
            this.close();
        }
    };

    AzarDatepicker.prototype._onMonthSelect = function (month) {
        this._cursorDate.month = month;
        this._cursorDate.day = Math.min(this._cursorDate.day || 1, this._getDaysInMonth(this._cursorDate.year, month));
        this._view = 'days';
        this._renderView();
    };

    AzarDatepicker.prototype._onYearSelect = function (year) {
        this._cursorDate.year = year;
        this._cursorDate.day = Math.min(this._cursorDate.day || 1, this._getDaysInMonth(year, this._cursorDate.month));
        this._view = 'months';
        this._renderView();
    };

    AzarDatepicker.prototype._adjustTime = function (dh, dm) {
        if (!this._selectedDate) {
            this._selectedDate = { year: this._cursorDate.year, month: this._cursorDate.month, day: this._cursorDate.day, hour: 0, minute: 0 };
        }
        var h = (this._selectedDate.hour || 0) + dh;
        var m = (this._selectedDate.minute || 0) + dm;

        h = ((h % 24) + 24) % 24;
        m = ((m % 60) + 60) % 60;

        this._selectedDate.hour = h;
        this._selectedDate.minute = m;
        this._cursorDate.hour = h;
        this._cursorDate.minute = m;

        this._updateTimeDisplay();
        this._updateInputDisplay();
        this._fireChange();
        this._fireSelect();
    };

    AzarDatepicker.prototype._getDaysInMonth = function (year, month) {
        if (this._calendar === 'jalali') return jalaliDaysInMonth(year, month);
        return gregorianDaysInMonth(year, month);
    };

    // Shared minDate/maxDate checks (bounds are kept in the current calendar)
    AzarDatepicker.prototype._isOutOfBounds = function (dateObj) {
        var t = dateToTotalDays(dateObj, this._calendar);
        if (isNaN(t)) return false;
        if (this.options.minDate) {
            var minD = dateToTotalDays(this.options.minDate, this._calendar);
            if (!isNaN(minD) && t < minD) return true;
        }
        if (this.options.maxDate) {
            var maxD = dateToTotalDays(this.options.maxDate, this._calendar);
            if (!isNaN(maxD) && t > maxD) return true;
        }
        return false;
    };

    AzarDatepicker.prototype._clampToBounds = function (dateObj) {
        var t = dateToTotalDays(dateObj, this._calendar);
        if (isNaN(t)) return dateObj;
        if (this.options.minDate) {
            var minD = dateToTotalDays(this.options.minDate, this._calendar);
            if (!isNaN(minD) && t < minD) return convertDateObj(this.options.minDate, this._calendar, this._calendar);
        }
        if (this.options.maxDate) {
            var maxD = dateToTotalDays(this.options.maxDate, this._calendar);
            if (!isNaN(maxD) && t > maxD) return convertDateObj(this.options.maxDate, this._calendar, this._calendar);
        }
        return dateObj;
    };

    AzarDatepicker.prototype._renderView = function () {
        var container = this._containerEl;
        var monthNameEl = container.querySelector('.azar-month-name');
        var yearEl = container.querySelector('.azar-year');

        monthNameEl.textContent = this._calendar === 'jalali' ? this._jalaliMonths[this._cursorDate.month - 1] : GREGORIAN_MONTHS[this._cursorDate.month - 1];
        yearEl.textContent = this._cursorDate.year;

        var daysView = container.querySelector('.azar-view-days');
        var monthsView = container.querySelector('.azar-view-months');
        var yearsView = container.querySelector('.azar-view-years');
        daysView.style.display = 'none'; monthsView.style.display = 'none'; yearsView.style.display = 'none';

        if (this._view === 'days') { daysView.style.display = ''; this._renderDaysGrid(); }
        else if (this._view === 'months') { monthsView.style.display = ''; this._renderMonthsGrid(); }
        else { yearsView.style.display = ''; this._renderYearsGrid(); }

        var body = container.querySelector('.azar-datepicker-body');
        body.classList.remove('azar-view-enter');
        void body.offsetWidth;
        body.classList.add('azar-view-enter');
        this._updateTimeDisplay();
    };

    AzarDatepicker.prototype._renderDaysGrid = function () {
        var self = this;
        var grid = this._containerEl.querySelector('.azar-days-grid');
        var year = this._cursorDate.year,
            month = this._cursorDate.month;
        var daysInMonth = this._getDaysInMonth(year, month);
        var cal = this._calendar;

        var firstDayDate;
        if (cal === 'jalali') {
            var g = jalaliToGregorian(year, month, 1);
            if (!g) {
                var now = new Date();
                g = jalaliToGregorian(now.getFullYear(), now.getMonth() + 1, now.getDate());
                if (!g) g = { gy: 2024, gm: 1, gd: 1 };
            }
            firstDayDate = new Date(g.gy, g.gm - 1, g.gd);
        } else {
            firstDayDate = new Date(year, month - 1, 1);
        }

        var startDayOfWeek = firstDayDate.getDay();
        var weekStart = (cal === 'jalali') ? 6 : 0;
        var leadingBlanks = (startDayOfWeek - weekStart + 7) % 7;

        var now = new Date();
        var todayJ = gregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());

        var html = '';
        var prevMonth = month - 1,
            prevYear = year;
        if (prevMonth < 1) { prevMonth = 12; prevYear--; }
        var prevDays = this._getDaysInMonth(prevYear, prevMonth);
        for (var i = leadingBlanks - 1; i >= 0; i--) {
            var pd = prevDays - i;
            html += '<span class="azar-day-cell azar-outside" role="gridcell" aria-disabled="true" tabindex="-1" data-year="' + prevYear + '" data-month="' + prevMonth +
                '" data-day="' + pd + '">' + pd + '</span>';
        }

        for (var d = 1; d <= daysInMonth; d++) {
            var classes = 'azar-day-cell';
            var isDisabled = self._isOutOfBounds({ year: year, month: month, day: d, hour: 0, minute: 0 });
            var ariaSel = 'false';
            var ariaDis = 'false';

            if (isDisabled) {
                classes += ' azar-disabled';
                ariaDis = 'true';
            } else {
                var weekday = this._getWeekdayIndex(year, month, d);
                if (this._isWeekend(weekday)) {
                    classes += ' azar-weekend';
                }

                if (cal === 'jalali') {
                    if (todayJ && year === todayJ.jy && month === todayJ.jm && d === todayJ.jd) classes += ' azar-today';
                } else {
                    if (year === now.getFullYear() && month === now.getMonth() + 1 && d === now.getDate())
                        classes += ' azar-today';
                }
                if (self._selectedDate && self._selectedDate.year === year && self._selectedDate.month === month &&
                    self._selectedDate.day === d) {
                    classes += ' azar-selected';
                    ariaSel = 'true';
                }
            }
            var isCursor = !isDisabled && d === Math.min(this._cursorDate.day || 1, daysInMonth);
            html += '<span class="' + classes + '" role="gridcell" aria-selected="' + ariaSel + '" aria-disabled="' + ariaDis + '" tabindex="' + (isCursor ? '0' : '-1') + '" data-year="' + year + '" data-month="' + month + '" data-day="' + d +
                '">' + d + '</span>';
        }

        var totalCells = leadingBlanks + daysInMonth;
        var trailingBlanks = (7 - totalCells % 7) % 7;
        var nextMonth = month + 1,
            nextYear = year;
        if (nextMonth > 12) { nextMonth = 1; nextYear++; }
        for (var nd = 1; nd <= trailingBlanks; nd++) {
            html += '<span class="azar-day-cell azar-outside" role="gridcell" aria-disabled="true" tabindex="-1" data-year="' + nextYear + '" data-month="' + nextMonth +
                '" data-day="' + nd + '">' + nd + '</span>';
        }
        grid.innerHTML = html;
    };

    AzarDatepicker.prototype._renderMonthsGrid = function () {
        var grid = this._containerEl.querySelector('.azar-view-months');
        var months = (this._calendar === 'jalali') ? this._jalaliMonthsShort : GREGORIAN_MONTHS_SHORT;
        var html = '';
        for (var i = 0; i < 12; i++) {
            var classes = 'azar-month-cell';
            var sel = this._cursorDate.month === i + 1;
            if (sel) classes += ' azar-selected';
            html += '<span class="' + classes + '" role="gridcell" aria-selected="' + (sel ? 'true' : 'false') + '" tabindex="-1" data-month="' + (i + 1) + '">' + months[i] + '</span>';
        }
        grid.innerHTML = html;
    };

    AzarDatepicker.prototype._renderYearsGrid = function () {
        var grid = this._containerEl.querySelector('.azar-view-years');
        var baseYear = Math.floor(this._cursorDate.year / 12) * 12 - 2;
        if (baseYear < 1) baseYear = 1;
        var html = '';
        for (var i = 0; i < 16; i++) {
            var y = baseYear + i;
            if (y < 1) continue;
            var classes = 'azar-year-cell';
            var sel = this._cursorDate.year === y;
            if (sel) classes += ' azar-selected';
            html += '<span class="' + classes + '" role="gridcell" aria-selected="' + (sel ? 'true' : 'false') + '" tabindex="-1" data-year="' + y + '">' + y + '</span>';
        }
        grid.innerHTML = html;
    };

    AzarDatepicker.prototype._updateTimeDisplay = function () {
        var hourEl = this._containerEl.querySelector('.azar-hour-val');
        var minEl = this._containerEl.querySelector('.azar-min-val');
        if (!hourEl || !minEl) return;
        var h = this._selectedDate ? (this._selectedDate.hour || 0) : (this._cursorDate.hour || 0);
        var m = this._selectedDate ? (this._selectedDate.minute || 0) : (this._cursorDate.minute || 0);
        hourEl.textContent = String(h).padStart(2, '0');
        minEl.textContent = String(m).padStart(2, '0');
    };

    AzarDatepicker.prototype._updateInputDisplay = function () {
        if (!this._selectedDate && this.options.mode === 'time') {
            this.inputEl.value = String(this._cursorDate.hour || 0).padStart(2, '0') + ':' + String(this._cursorDate.minute || 0).padStart(2, '0');
            this.inputEl.classList.remove('azar-has-value');
            if (this._clearBtn) this._clearBtn.style.display = 'none';
            return;
        }
        if (!this._selectedDate) {
            this.inputEl.value = '';
            this.inputEl.setAttribute('value', this.inputEl.value);
            this.inputEl.classList.remove('azar-has-value');
            if (this._clearBtn) this._clearBtn.style.display = 'none';
            return;
        }

        this.inputEl.value = this._formatDate(this._selectedDate, this.options.inputFormat);
        this.inputEl.setAttribute('value', this.inputEl.value);

        this.inputEl.classList.add('azar-has-value');
        if (this._clearBtn) {
            this._clearBtn.style.display = '';
        }
    };

    AzarDatepicker.prototype._clear = function () {
        if (!this._selectedDate) return;
        this._selectedDate = null;
        // Reset dedup keys so reselecting the same date fires callbacks again
        this._lastChangeKey = null;
        this._lastSelectKey = null;
        this._updateInputDisplay();
        this._renderView();
        this._fireClear();
        if (this._isOpen) {
            this.close();
        }
    };

    AzarDatepicker.prototype._formatDate = function (dateObj, format) {
        var y = dateObj.year, m = dateObj.month, d = dateObj.day, h = dateObj.hour || 0, min = dateObj.minute || 0;
        var cal = this._calendar;
        var months = cal === 'jalali' ? this._jalaliMonths : GREGORIAN_MONTHS;
        var monthsShort = cal === 'jalali' ? this._jalaliMonthsShort : GREGORIAN_MONTHS_SHORT;
        var h12 = h % 12 === 0 ? 12 : h % 12;

        // Single pass: chained .replace() would re-match token letters inside
        // substituted values ("May" -> "5ay" via the later 'M' replacement).
        return format.replace(/YYYY|YY|MMMM|MMM|MM|M|DD|D|HH|hh|H|h|mm|m|A|a/g, function (t) {
            switch (t) {
                case 'YYYY': return String(y);
                case 'YY': return String(y).slice(-2);
                case 'MMMM': return months[m - 1];
                case 'MMM': return monthsShort[m - 1];
                case 'MM': return String(m).padStart(2, '0');
                case 'M': return String(m);
                case 'DD': return String(d).padStart(2, '0');
                case 'D': return String(d);
                case 'HH': return String(h).padStart(2, '0');
                case 'H': return String(h);
                case 'hh': return String(h12).padStart(2, '0');
                case 'h': return String(h12);
                case 'mm': return String(min).padStart(2, '0');
                case 'm': return String(min);
                case 'A': return h >= 12 ? 'PM' : 'AM';
                case 'a': return h >= 12 ? 'pm' : 'am';
            }
            return t;
        });
    };

    // FIXED: deduplicate callbacks
    AzarDatepicker.prototype._fireChange = function () {
        if (!this._selectedDate || typeof this.options.onChange !== 'function') return;
        var data = this._getOutputData();
        var key = data.calendar + '|' + data.formatted;
        if (this._lastChangeKey === key) return;
        this._lastChangeKey = key;
        this.options.onChange(data);
    };

    AzarDatepicker.prototype._fireSelect = function () {
        if (!this._selectedDate || typeof this.options.onSelect !== 'function') return;
        var data = this._getOutputData();
        var key = data.calendar + '|' + data.formatted;
        if (this._lastSelectKey === key) return;
        this._lastSelectKey = key;
        this.options.onSelect(data);
    };

    AzarDatepicker.prototype._fireClear = function () {
        if (typeof this.options.onClear === 'function') {
            this.options.onClear();
        }
    };

    AzarDatepicker.prototype._getOutputData = function () {
        if (!this._selectedDate) return null;
        var sd = this._selectedDate;
        var formatted = this._formatDate(sd, this.options.outputFormat);
        var nativeDate;
        if (this._calendar === 'jalali') {
            var g = jalaliToGregorian(sd.year, sd.month, sd.day);
            nativeDate = g ? new Date(g.gy, g.gm - 1, g.gd, sd.hour || 0, sd.minute || 0) : new Date();
        } else {
            nativeDate = new Date(sd.year, sd.month - 1, sd.day, sd.hour || 0, sd.minute || 0);
        }
        return {
            year: sd.year, month: sd.month, day: sd.day,
            hour: sd.hour || 0, minute: sd.minute || 0,
            calendar: this._calendar, formatted: formatted,
            nativeDate: nativeDate, iso: nativeDate.toISOString()
        };
    };

    // Theme is applied by toggling azar-dark/azar-light classes; the CSS
    // variable blocks in datepicker.css do the rest. Element-level classes
    // beat inherited :root variables, so forced modes win over page theme.
    AzarDatepicker.prototype._applyDarkMode = function () {
        var dark = this._isDark;
        var els = [this._wrapperEl, this._containerEl, this._overlayEl];
        for (var i = 0; i < els.length; i++) {
            if (!els[i]) continue;
            els[i].classList.toggle('azar-dark', dark);
            els[i].classList.toggle('azar-light', !dark);
        }
    };

    // ========== PUBLIC API ==========
    AzarDatepicker.prototype.open = function () {
        if (!this._containerEl || this._isOpen) return;

        // FIXED: cancel pending close timeout to prevent race
        if (this._closingTimeout) {
            clearTimeout(this._closingTimeout);
            this._closingTimeout = null;
        }

        this._detectMobile();
        this._detectDarkMode();
        this._applyDarkMode();
        this._view = 'days';
        this._renderView();
        this._updateTimeDisplay();

        var container = this._containerEl;
        container.classList.remove('azar-closing');

        if (this._isMobile) {
            container.classList.add('azar-modal');
            this._overlayEl.classList.add('azar-open');
            container.style.top = '';
            container.style.bottom = '';
            container.style.left = '';
            container.style.right = '';
            container.style.marginTop = '';
            container.style.marginBottom = '';
        } else {
            container.classList.remove('azar-modal');
            this._overlayEl.classList.remove('azar-open');
            this._positionContainer();
        }

        void container.offsetWidth;
        container.classList.add('azar-open');
        this._isOpen = true;
        this.inputEl.setAttribute('aria-expanded', 'true');
        container.setAttribute('aria-modal', this._isMobile ? 'true' : 'false');

        // Focus first focusable for accessibility
        if (this._isMobile) {
            var firstBtn = container.querySelector('button');
            if (firstBtn) firstBtn.focus();
        }
    };

    // Positions the container with viewport coordinates; the container is
    // position:fixed, so no scroll offsets are needed, but it must be
    // re-positioned on scroll (see the scroll handler in _bindEvents).
    AzarDatepicker.prototype._positionContainer = function () {
        var container = this._containerEl;
        if (!container || this._isMobile) return;

        var input = this.inputEl;
        var inputRect = input.getBoundingClientRect();
        var containerWidth = container.offsetWidth || 310;
        var containerHeight = container.offsetHeight || 310;
        var spaceBelow = window.innerHeight - inputRect.bottom;
        var spaceAbove = inputRect.top;
        var isRtl = this.options.rtl;

        var flip = (spaceBelow < containerHeight + 10) && (spaceAbove > spaceBelow);
        container.classList.remove('azar-drop-up', 'azar-drop-down');

        if (flip) {
            container.classList.add('azar-drop-up');
            container.style.top = 'auto';
            container.style.bottom = (window.innerHeight - inputRect.top) + 'px';
            container.style.marginBottom = '6px';
        } else {
            container.classList.add('azar-drop-down');
            container.style.top = inputRect.bottom + 'px';
            container.style.bottom = 'auto';
            container.style.marginTop = '6px';
        }

        var left = isRtl ? (window.innerWidth - inputRect.right) : inputRect.left;
        if (!isRtl) {
            if (left + containerWidth > window.innerWidth - 10) {
                left = Math.max(10, window.innerWidth - containerWidth - 10);
            }
            container.style.left = left + 'px';
            container.style.right = 'auto';
        } else {
            var right = window.innerWidth - inputRect.right;
            if (right + containerWidth > window.innerWidth - 10) {
                right = Math.max(10, window.innerWidth - containerWidth - 10);
            }
            container.style.right = right + 'px';
            container.style.left = 'auto';
        }
    };

    AzarDatepicker.prototype.close = function () {
        if (!this._isOpen) return;
        var self = this;
        var container = this._containerEl;
        // State flips synchronously so open() can be called again immediately;
        // the timeout only cleans up the exit-animation classes.
        this._isOpen = false;
        this.inputEl.setAttribute('aria-expanded', 'false');
        container.classList.add('azar-closing');
        container.classList.remove('azar-open');
        this._overlayEl.classList.remove('azar-open');
        if (this._closingTimeout) clearTimeout(this._closingTimeout);
        this._closingTimeout = setTimeout(function () {
            container.classList.remove('azar-closing', 'azar-modal');
            self._closingTimeout = null;
        }, 200);
    };

    AzarDatepicker.prototype.toggle = function () { this._isOpen ? this.close() : this.open(); };
    AzarDatepicker.prototype.getValue = function () { return this._getOutputData(); };
    AzarDatepicker.prototype.setValue = function (dateObj) {
        this._lastChangeKey = null;
        this._lastSelectKey = null;
        if (!dateObj) {
            this._selectedDate = null;
            this._updateInputDisplay();
            this._renderView();
            return;
        }
        var y = dateObj.year, m = dateObj.month, d = dateObj.day;
        if (typeof y !== 'number' || typeof m !== 'number' || typeof d !== 'number' ||
            m < 1 || m > 12 || d < 1 || d > this._getDaysInMonth(y, m) || y < 1) {
            console.warn('AzarDatepicker.setValue: invalid date object', dateObj);
            return;
        }
        var clamped = this._clampToBounds({
            year: y, month: m, day: d,
            hour: dateObj.hour || 0, minute: dateObj.minute || 0
        });
        this._selectedDate = clamped;
        this._cursorDate = {
            year: clamped.year, month: clamped.month, day: clamped.day,
            hour: clamped.hour, minute: clamped.minute
        };
        this._updateInputDisplay();
        this._renderView();
    };

    // FIXED: respect inputFormat when parsing
    AzarDatepicker.prototype.setValueFromString = function (dateString) {
        if (!dateString || typeof dateString !== 'string' || dateString.trim() === '') {
            this.setValue(null);
            return this;
        }

        var format = this.options.inputFormat || 'YYYY/MM/DD';
        var isJalali = this._calendar === 'jalali';
        var parsed = parseDateString(dateString.trim(), format,
            isJalali ? this._jalaliMonths : GREGORIAN_MONTHS,
            isJalali ? this._jalaliMonthsShort : GREGORIAN_MONTHS_SHORT,
            isJalali);
        if (!parsed) {
            console.warn('AzarDatepicker.setValueFromString: format mismatch. Expected ' + format);
            return this;
        }

        if (!parsed.year || !parsed.month || !parsed.day) {
            console.warn('AzarDatepicker.setValueFromString: incomplete date');
            return this;
        }

        if (parsed.month < 1 || parsed.month > 12 || parsed.day < 1 || parsed.day > 31 || parsed.hour < 0 || parsed.hour > 23 || parsed.minute < 0 || parsed.minute > 59) {
            console.warn('AzarDatepicker.setValueFromString: value out of range');
            return this;
        }

        this.setValue({ year: parsed.year, month: parsed.month, day: parsed.day, hour: parsed.hour, minute: parsed.minute });
        return this;
    };

    AzarDatepicker.prototype.setCalendar = function (cal) { if (cal !== this._calendar) this._toggleCalendar(); };
    AzarDatepicker.prototype.getCalendar = function () { return this._calendar; };

    // FIXED: proper cleanup of all listeners and observers
    AzarDatepicker.prototype.destroy = function () {
        this.close();

        if (this._closingTimeout) { clearTimeout(this._closingTimeout); this._closingTimeout = null; }
        if (this._reopenTimeout) { clearTimeout(this._reopenTimeout); this._reopenTimeout = null; }
        if (this._themeObserver) this._themeObserver.disconnect();
        if (this._prefersDarkMql && this._handlers.prefersDark) {
            this._prefersDarkMql.removeEventListener('change', this._handlers.prefersDark);
        }

        if (this._overlayEl && this._overlayEl.parentNode) {
            this._overlayEl.parentNode.removeChild(this._overlayEl);
        }
        if (this._containerEl && this._containerEl.parentNode) {
            this._containerEl.parentNode.removeChild(this._containerEl);
        }

        if (this._clearBtn && this._handlers.clearClick) {
            this._clearBtn.removeEventListener('click', this._handlers.clearClick);
        }
        if (this._handlers.inputClick) {
            this.inputEl.removeEventListener('click', this._handlers.inputClick);
        }
        if (this._handlers.containerClick && this._containerEl) {
            this._containerEl.removeEventListener('click', this._handlers.containerClick);
        }
        if (this._handlers.overlayClick && this._overlayEl) {
            this._overlayEl.removeEventListener('click', this._handlers.overlayClick);
        }
        if (this._handlers.docClick) {
            document.removeEventListener('click', this._handlers.docClick);
        }
        if (this._handlers.docKey) {
            document.removeEventListener('keydown', this._handlers.docKey);
        }
        if (this._handlers.resize) {
            window.removeEventListener('resize', this._handlers.resize);
        }
        if (this._handlers.scroll) {
            window.removeEventListener('scroll', this._handlers.scroll, true);
        }

        // Null DOM refs so open()/close() on a destroyed instance are no-ops
        this._containerEl = null;
        this._overlayEl = null;

        try {
            if (this._wrapperEl && this.inputEl && this._wrapperEl.parentNode) {
                this._wrapperEl.parentNode.insertBefore(this.inputEl, this._wrapperEl);
                this._wrapperEl.parentNode.removeChild(this._wrapperEl);
            }
        } catch (e) {
            if (this.inputEl) {
                this.inputEl.classList.remove('azar-datepicker-input');
                this.inputEl.removeAttribute('readonly');
                this.inputEl.removeAttribute('autocomplete');
                this.inputEl.removeAttribute('aria-haspopup');
                this.inputEl.removeAttribute('aria-expanded');
                this.inputEl.removeAttribute('aria-controls');
            }
            return;
        }

        if (this.inputEl) {
            this.inputEl.classList.remove('azar-datepicker-input');
            this.inputEl.removeAttribute('readonly');
            this.inputEl.removeAttribute('autocomplete');
            this.inputEl.removeAttribute('aria-haspopup');
            this.inputEl.removeAttribute('aria-expanded');
            this.inputEl.removeAttribute('aria-controls');
        }
    };

    AzarDatepicker.prototype.refresh = function () {
        this._detectDarkMode();
        this._applyDarkMode();
        this._detectMobile();
        this._renderView();
        this._updateInputDisplay();
        if (this._isOpen && !this._isMobile) {
            this._positionContainer();
        }
    };

    // ========== STATIC INIT ==========
    AzarDatepicker.init = function (opts) { return new AzarDatepicker(opts); };
    // Internal functions exposed for test.js only — not public API
    AzarDatepicker._internals = {
        gregorianToJalali: gregorianToJalali,
        jalaliToGregorian: jalaliToGregorian,
        isJalaliLeap: isJalaliLeap,
        isGregorianLeap: isGregorianLeap,
        jalaliDaysInMonth: jalaliDaysInMonth,
        gregorianDaysInMonth: gregorianDaysInMonth,
        parseDateString: parseDateString,
        dateToTotalDays: dateToTotalDays,
        convertDateObj: convertDateObj
    };
    global.AzarDatepicker = AzarDatepicker;

    // Auto‑init data attributes (also works when the script loads after DOMContentLoaded)
    if (typeof document !== 'undefined') {
        var azarAutoInit = function () {
            var elements = document.querySelectorAll('[data-azar-datepicker]');
            for (var i = 0; i < elements.length; i++) {
                var el = elements[i];
                if (el._azarDatepicker) continue;
                var opts = {};
                var mode = el.getAttribute('data-azar-mode');
                var calendar = el.getAttribute('data-azar-calendar');
                var inputFormat = el.getAttribute('data-azar-input-format');
                var outputFormat = el.getAttribute('data-azar-output-format');
                var placeholder = el.getAttribute('data-azar-placeholder');
                var darkMode = el.getAttribute('data-azar-dark');
                var closeOnSelect = el.getAttribute('data-azar-close-on-select');
                if (mode) opts.mode = mode;
                if (calendar) opts.calendar = calendar;
                if (inputFormat) opts.inputFormat = inputFormat;
                if (outputFormat) opts.outputFormat = outputFormat;
                if (placeholder) opts.placeholder = placeholder;
                if (darkMode) opts.darkMode = darkMode;
                if (closeOnSelect !== null) opts.closeOnSelect = closeOnSelect !== 'false';
                opts.selector = el;
                el._azarDatepicker = new AzarDatepicker(opts);
            }
        };
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', azarAutoInit);
        } else {
            azarAutoInit();
        }
    }

})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);

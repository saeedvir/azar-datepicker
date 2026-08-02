/*! Azar Datepicker v1.2.1 – Persian & Gregorian date picker (pure JS) */
/*
* https://github.com/saeedvir/azar-datepicker
*
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
            if (days >= 365) gy++;
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
    function isJalaliLeap(year) { return ((year + 2346) * 31 + 17) % 128 < 31; }
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

    // Helper: parse a date string according to inputFormat
    function parseDateString(str, format, calendar) {
        var months = calendar === 'jalali' ? JALALI_MONTHS : GREGORIAN_MONTHS;
        var monthsShort = calendar === 'jalali' ? JALALI_MONTHS_SHORT : GREGORIAN_MONTHS_SHORT;

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
                case 'YY': result.year = parseInt(val, 10) + (parseInt(val, 10) < 50 ? 2000 : 1900); break;
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

        if (this.options.rtl === null) {
            this.options.rtl = (this.options.calendar === 'jalali');
        }

        if (this.options.jalaliMonths) JALALI_MONTHS = this.options.jalaliMonths;
        if (this.options.jalaliMonthsShort) JALALI_MONTHS_SHORT = this.options.jalaliMonthsShort;
        if (this.options.jalaliWeekDaysShort) JALALI_WEEKDAYS_SHORT = this.options.jalaliWeekDaysShort;

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
        this._id = 'azar-' + Math.random().toString(36).substr(2, 9);

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

        // FIXED: respect both minDate and maxDate
        if (this.options.minDate) {
            var minD = dateToTotalDays(this.options.minDate, this._calendar);
            var selD = dateToTotalDays(this._selectedDate, this._calendar);
            if (!isNaN(minD) && !isNaN(selD) && selD < minD) {
                this._selectedDate = {
                    year: this.options.minDate.year,
                    month: this.options.minDate.month,
                    day: this.options.minDate.day,
                    hour: this.options.minDate.hour || 0,
                    minute: this.options.minDate.minute || 0
                };
                this._cursorDate = {
                    year: this.options.minDate.year,
                    month: this.options.minDate.month,
                    day: this.options.minDate.day,
                    hour: this.options.minDate.hour || 0,
                    minute: this.options.minDate.minute || 0
                };
            }
        }
        if (this.options.maxDate) {
            var maxD = dateToTotalDays(this.options.maxDate, this._calendar);
            var selD2 = dateToTotalDays(this._selectedDate, this._calendar);
            if (!isNaN(maxD) && !isNaN(selD2) && selD2 > maxD) {
                this._selectedDate = {
                    year: this.options.maxDate.year,
                    month: this.options.maxDate.month,
                    day: this.options.maxDate.day,
                    hour: this.options.maxDate.hour || 0,
                    minute: this.options.maxDate.minute || 0
                };
                this._cursorDate = {
                    year: this.options.maxDate.year,
                    month: this.options.maxDate.month,
                    day: this.options.maxDate.day,
                    hour: this.options.maxDate.hour || 0,
                    minute: this.options.maxDate.minute || 0
                };
            }
        }

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
        var self = this;
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
        var wkds = cal === 'jalali' ? JALALI_WEEKDAYS_SHORT : GREGORIAN_WEEKDAYS_SHORT;
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
                setTimeout(function () { self.open(); }, 150);
            } else if (self._isOpen && !self._isMobile) {
                self._positionContainer();
            }
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
            this.inputEl.blur();
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

        var testDate = { year: newYear, month: newMonth, day: newDay, hour: 0, minute: 0 };
        if (this.options.minDate) {
            var minD = dateToTotalDays(this.options.minDate, this._calendar);
            var testD = dateToTotalDays(testDate, this._calendar);
            if (!isNaN(minD) && !isNaN(testD) && testD < minD) return;
        }
        if (this.options.maxDate) {
            var maxD = dateToTotalDays(this.options.maxDate, this._calendar);
            var testD2 = dateToTotalDays(testDate, this._calendar);
            if (!isNaN(maxD) && !isNaN(testD2) && testD2 > maxD) return;
        }

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

        // FIXED: Min/Max validation (same as _setTodaySilently)
        if (this.options.minDate) {
            var minD = dateToTotalDays(this.options.minDate, this._calendar);
            var selD = dateToTotalDays(newDate, this._calendar);
            if (!isNaN(minD) && !isNaN(selD) && selD < minD) {
                newDate = {
                    year: this.options.minDate.year,
                    month: this.options.minDate.month,
                    day: this.options.minDate.day,
                    hour: this.options.minDate.hour || 0,
                    minute: this.options.minDate.minute || 0
                };
            }
        }
        if (this.options.maxDate) {
            var maxD = dateToTotalDays(this.options.maxDate, this._calendar);
            var selD2 = dateToTotalDays(newDate, this._calendar);
            if (!isNaN(maxD) && !isNaN(selD2) && selD2 > maxD) {
                newDate = {
                    year: this.options.maxDate.year,
                    month: this.options.maxDate.month,
                    day: this.options.maxDate.day,
                    hour: this.options.maxDate.hour || 0,
                    minute: this.options.maxDate.minute || 0
                };
            }
        }

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
        var self = this;
        var newCal = (this._calendar === 'jalali') ? 'gregorian' : 'jalali';
        var cur = this._cursorDate;
        var sel = this._selectedDate;

        // FIXED: Convert cursor — preserve real day, clamp AFTER conversion
        var sourceDay = Math.max(1, cur.day || 1);
        var newCursor = null;
        if (newCal === 'jalali') {
            var j = gregorianToJalali(cur.year, cur.month, sourceDay);
            if (!j) {
                var now = new Date();
                j = gregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
                if (!j) j = { jy: 1403, jm: 1, jd: 1 };
            }
            newCursor = {
                year: j.jy, month: j.jm,
                day: Math.min(sourceDay, jalaliDaysInMonth(j.jy, j.jm)),
                hour: cur.hour || 0, minute: cur.minute || 0
            };
        } else {
            var g = jalaliToGregorian(cur.year, cur.month, sourceDay);
            if (!g) {
                var now = new Date();
                g = { gy: now.getFullYear(), gm: now.getMonth() + 1, gd: now.getDate() };
            }
            newCursor = {
                year: g.gy, month: g.gm,
                day: Math.min(sourceDay, gregorianDaysInMonth(g.gy, g.gm)),
                hour: cur.hour || 0, minute: cur.minute || 0
            };
        }
        if (newCursor.year < 1) newCursor.year = 1;
        newCursor.day = Math.min(newCursor.day, self._getDaysInMonth(newCursor.year, newCursor.month));

        // FIXED: Convert selected date with real day preservation
        var newSelected = null;
        if (sel) {
            var sourceSelDay = Math.max(1, sel.day || 1);
            if (newCal === 'jalali') {
                var js = gregorianToJalali(sel.year, sel.month, sourceSelDay);
                if (js) newSelected = {
                    year: js.jy, month: js.jm,
                    day: Math.min(sourceSelDay, jalaliDaysInMonth(js.jy, js.jm)),
                    hour: sel.hour || 0, minute: sel.minute || 0
                };
            } else {
                var gs = jalaliToGregorian(sel.year, sel.month, sourceSelDay);
                if (gs) newSelected = {
                    year: gs.gy, month: gs.gm,
                    day: Math.min(sourceSelDay, gregorianDaysInMonth(gs.gy, gs.gm)),
                    hour: sel.hour || 0, minute: sel.minute || 0
                };
            }
        }

        // FIXED: Convert minDate / maxDate bounds to new calendar
        if (this.options.minDate) {
            this.options.minDate = convertDateObj(this.options.minDate, this._calendar, newCal);
        }
        if (this.options.maxDate) {
            this.options.maxDate = convertDateObj(this.options.maxDate, this._calendar, newCal);
        }

        this._calendar = newCal;
        this._containerEl.setAttribute('data-calendar', newCal);
        if (this.options.rtl === null) {
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
        var wkds = newCal === 'jalali' ? JALALI_WEEKDAYS_SHORT : GREGORIAN_WEEKDAYS_SHORT;
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

        // Min/Max validation
        if (this.options.minDate) {
            var minDays = dateToTotalDays(this.options.minDate, this._calendar);
            var selDays = dateToTotalDays(newDate, this._calendar);
            if (!isNaN(minDays) && !isNaN(selDays) && selDays < minDays) {
                return;
            }
        }
        if (this.options.maxDate) {
            var maxDays = dateToTotalDays(this.options.maxDate, this._calendar);
            var selDays2 = dateToTotalDays(newDate, this._calendar);
            if (!isNaN(maxDays) && !isNaN(selDays2) && selDays2 > maxDays) {
                return;
            }
        }

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

    AzarDatepicker.prototype._renderView = function () {
        var container = this._containerEl;
        var monthNameEl = container.querySelector('.azar-month-name');
        var yearEl = container.querySelector('.azar-year');

        monthNameEl.textContent = this._calendar === 'jalali' ? JALALI_MONTHS[this._cursorDate.month - 1] : GREGORIAN_MONTHS[this._cursorDate.month - 1];
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
            var cellDate = { year: year, month: month, day: d, hour: 0, minute: 0 };
            var isDisabled = false;
            var ariaSel = 'false';
            var ariaDis = 'false';

            if (self.options.minDate) {
                var minD = dateToTotalDays(self.options.minDate, cal);
                var curD = dateToTotalDays(cellDate, cal);
                if (!isNaN(minD) && !isNaN(curD) && curD < minD) isDisabled = true;
            }
            if (self.options.maxDate && !isDisabled) {
                var maxD = dateToTotalDays(self.options.maxDate, cal);
                var curD2 = dateToTotalDays(cellDate, cal);
                if (!isNaN(maxD) && !isNaN(curD2) && curD2 > maxD) isDisabled = true;
            }

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
            html += '<span class="' + classes + '" role="gridcell" aria-selected="' + ariaSel + '" aria-disabled="' + ariaDis + '" tabindex="' + (isDisabled ? '-1' : '-1') + '" data-year="' + year + '" data-month="' + month + '" data-day="' + d +
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
        var months = (this._calendar === 'jalali') ? JALALI_MONTHS_SHORT : GREGORIAN_MONTHS_SHORT;
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
        var months = cal === 'jalali' ? JALALI_MONTHS : GREGORIAN_MONTHS;
        var monthsShort = cal === 'jalali' ? JALALI_MONTHS_SHORT : GREGORIAN_MONTHS_SHORT;

        return format
            .replace('YYYY', String(y))
            .replace('YY', String(y).slice(-2))
            .replace('MMMM', months[m - 1])
            .replace('MMM', monthsShort[m - 1])
            .replace('MM', String(m).padStart(2, '0'))
            .replace('M', String(m))
            .replace('DD', String(d).padStart(2, '0'))
            .replace('D', String(d))
            .replace('HH', String(h).padStart(2, '0'))
            .replace('H', String(h))
            .replace('hh', String(h % 12 === 0 ? 12 : h % 12).padStart(2, '0'))
            .replace('h', String(h % 12 === 0 ? 12 : h % 12))
            .replace('mm', String(min).padStart(2, '0'))
            .replace('m', String(min))
            .replace('A', h >= 12 ? 'PM' : 'AM')
            .replace('a', h >= 12 ? 'pm' : 'am');
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

    AzarDatepicker.prototype._applyDarkMode = function () {
        if (this.options.darkMode === 'dark') {
            this._containerEl.style.setProperty('--azar-bg', '#1e1f2b');
            this._containerEl.style.setProperty('--azar-surface', '#272833');
            this._containerEl.style.setProperty('--azar-border', '#35374b');
            this._containerEl.style.setProperty('--azar-text', '#e5e7eb');
        } else if (this.options.darkMode === 'light') {
            this._containerEl.style.setProperty('--azar-bg', '#ffffff');
            this._containerEl.style.setProperty('--azar-surface', '#f9fafb');
            this._containerEl.style.setProperty('--azar-border', '#e5e7eb');
            this._containerEl.style.setProperty('--azar-text', '#1f2937');
        } else {
            ['--azar-bg', '--azar-surface', '--azar-border', '--azar-text'].forEach(function (v) {
                this._containerEl.style.removeProperty(v);
            }, this);
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
            container.style.zIndex = '10550';
            this._overlayEl.style.zIndex = '10549';
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

    // FIXED: horizontal overflow protection
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

        container.style.zIndex = '10550';
    };

    AzarDatepicker.prototype.close = function () {
        if (!this._isOpen) return;
        var self = this;
        var container = this._containerEl;
        container.classList.add('azar-closing');
        container.classList.remove('azar-open');
        this._overlayEl.classList.remove('azar-open');
        if (this._closingTimeout) clearTimeout(this._closingTimeout);
        this._closingTimeout = setTimeout(function () {
            container.classList.remove('azar-closing', 'azar-modal');
            self._isOpen = false;
            self.inputEl.setAttribute('aria-expanded', 'false');
        }, 200);
    };

    AzarDatepicker.prototype.toggle = function () { this._isOpen ? this.close() : this.open(); };
    AzarDatepicker.prototype.getValue = function () { return this._getOutputData(); };
    AzarDatepicker.prototype.setValue = function (dateObj) {
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
        this._selectedDate = {
            year: y, month: m, day: d,
            hour: dateObj.hour || 0, minute: dateObj.minute || 0
        };
        this._cursorDate = {
            year: y, month: m, day: d,
            hour: dateObj.hour || 0, minute: dateObj.minute || 0
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
        var parsed = parseDateString(dateString.trim(), format, this._calendar);
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
    global.AzarDatepicker = AzarDatepicker;

    // Auto‑init data attributes
    if (typeof document !== 'undefined') {
        document.addEventListener('DOMContentLoaded', function () {
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
        });
    }

})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);

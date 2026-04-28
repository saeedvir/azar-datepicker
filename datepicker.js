        /*! Azar Datepicker v1.0 – Persian & Gregorian date picker (pure JS) */
        (function (global) {
            'use strict';

            // ========== JALALI CALENDAR CONVERSION (SAFE) ==========

            /**
             * Gregorian to Jalali conversion.
             * Returns { jy, jm, jd } or null if invalid.
             */
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
                if (jy < 1 || jy > 4000) return null; // Jalali safe range
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

            /**
             * Jalali to Gregorian conversion.
             * Returns { gy, gm, gd } or null if invalid.
             */
            function jalaliToGregorian(jy, jm, jd) {
                if (jy < 1 || jm < 1 || jm > 12 || jd < 1) return null;
                var jy1 = jy - 979;
                var jm1 = jm - 1;
                var jdays = 365 * jy1 + Math.floor(jy1 / 33) * 8 + Math.floor(((jy1 % 33) + 3) / 4);
                jdays += (jm < 7) ? (jm1 * 31) : ((jm1 * 30) + 6);
                jdays += jd - 1;
                var gdays = jdays + 226899;
                if (gdays < 0) return null;
                var gy = Math.floor((gdays - 1) / 365.2425) + 1;
                if (gy < 1) return null;
                var g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334, 365];
                var gm = 1;
                while (gm <= 12) {
                    var daysInMonth = g_d_m[gm] - g_d_m[gm - 1];
                    if (gm === 2 && isGregorianLeap(gy)) daysInMonth = 29;
                    if (gm === 2 && !isGregorianLeap(gy)) daysInMonth = 28;
                    if (gdays <= g_d_m[gm - 1] + daysInMonth) break;
                    gm++;
                }
                var gd = gdays - g_d_m[gm - 1];
                if (gm === 2 && isGregorianLeap(gy) && gd > 29) gd = 29;
                if (gm === 2 && !isGregorianLeap(gy) && gd > 28) gd = 28;
                if (gd < 1) gd = 1;
                return { gy: gy, gm: gm, gd: Math.min(gd, 31) };
            }

            function isGregorianLeap(year) {
                return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
            }

            function isJalaliLeap(year) {
                return ((year + 2346) * 31 + 17) % 128 < 31;
            }

            function jalaliDaysInMonth(year, month) {
                if (month <= 6) return 31;
                if (month <= 11) return 30;
                return isJalaliLeap(year) ? 30 : 29;
            }

            function gregorianDaysInMonth(year, month) {
                if (month === 2) return isGregorianLeap(year) ? 29 : 28;
                var d31 = [1, 3, 5, 7, 8, 10, 12];
                return d31.indexOf(month) !== -1 ? 31 : 30;
            }

            // ========== PERSIAN MONTH & WEEKDAY NAMES ==========
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
                    mode: 'date',          // 'date' | 'time' | 'datetime'
                    calendar: 'jalali',    // 'jalali' | 'gregorian'
                    inputFormat: null,
                    outputFormat: null,
                    placeholder: null,
                    onSelect: null,
                    onChange: null,
                    minDate: null,
                    maxDate: null,
                    darkMode: 'auto',
                    rtl: null,            // null = auto based on calendar
                    closeOnSelect: true,
                    showCalendarToggle: true,
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

                // State
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
                this.inputEl.parentNode.insertBefore(wrapper, this.inputEl);
                wrapper.appendChild(this.inputEl);
                this.inputEl.classList.add('azar-datepicker-input');
                if (this.options.placeholder) {
                    this.inputEl.setAttribute('placeholder', this.options.placeholder);
                }
                this.inputEl.setAttribute('readonly', 'readonly');
                this.inputEl.setAttribute('autocomplete', 'off');
                this._wrapperEl = wrapper;

                var container = document.createElement('div');
                container.className = 'azar-datepicker-container';
                if (this.options.rtl) container.setAttribute('dir', 'rtl');
                container.setAttribute('data-calendar', this._calendar);
                container.innerHTML = this._renderFullHTML();
                wrapper.appendChild(container);
                this._containerEl = container;

                var overlay = document.createElement('div');
                overlay.className = 'azar-overlay';
                document.body.appendChild(overlay);
                this._overlayEl = overlay;
            };

            AzarDatepicker.prototype._renderFullHTML = function () {
                var cal = this._calendar;
                var mode = this.options.mode;
                var showToggle = this.options.showCalendarToggle;
                var wkds = cal === 'jalali' ? JALALI_WEEKDAYS_SHORT : GREGORIAN_WEEKDAYS_SHORT;
                var wkdsHTML = '';
                for (var i = 0; i < 7; i++) {
                    wkdsHTML += '<span>' + wkds[i] + '</span>';
                }

                var html = '';
                html += '<div class="azar-datepicker-header">';
                html += '<button class="azar-btn-nav azar-btn-prev" type="button" data-action="prev">‹</button>';
                html += '<div class="azar-header-display" data-action="switch-view"><span class="azar-month-name"></span>&nbsp;<span class="azar-year"></span></div>';
                html += '<button class="azar-btn-nav azar-btn-next" type="button" data-action="next">›</button>';
                html += '</div>';

                html += '<div class="azar-datepicker-body">';
                html += '<div class="azar-view-days" data-view="days">';
                html += '<div class="azar-weekdays">' + wkdsHTML + '</div>';
                html += '<div class="azar-days-grid"></div>';
                html += '</div>';
                html += '<div class="azar-view-months" data-view="months" style="display:none;"></div>';
                html += '<div class="azar-view-years" data-view="years" style="display:none;"></div>';
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
                    html += '<div class="azar-time-col"><button class="azar-time-btn" data-action="inc-hour">▲</button><span class="azar-time-value azar-hour-val">00</span><button class="azar-time-btn" data-action="dec-hour">▼</button><label>ساعت</label></div>';
                    html += '<span class="azar-time-sep">:</span>';
                    html += '<div class="azar-time-col"><button class="azar-time-btn" data-action="inc-min">▲</button><span class="azar-time-value azar-min-val">00</span><button class="azar-time-btn" data-action="dec-min">▼</button><label>دقیقه</label></div>';
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
                    if (!j) j = gregorianToJalali(2024, 1, 1); // fallback
                    this._cursorDate = { year: j.jy, month: j.jm, day: j.jd, hour: hour, minute: minute };
                    this._selectedDate = null;
                } else {
                    this._cursorDate = { year: gy, month: gm, day: gd, hour: hour, minute: minute };
                    this._selectedDate = null;
                }
            };

            AzarDatepicker.prototype._bindEvents = function () {
                var self = this;

                this.inputEl.addEventListener('click', function (e) {
                    e.stopPropagation();
                    if (self._isOpen) {
                        self.close();
                    } else {
                        self._detectMobile();
                        self.open();
                    }
                });

                this._containerEl.addEventListener('click', function (e) {
                    var target = e.target;
                    var action = target.getAttribute('data-action') || (target.closest('[data-action]') ? target.closest('[data-action]').getAttribute('data-action') : null);

                    if (!action) {
                        if (target.classList.contains('azar-day-cell') && !target.classList.contains('azar-outside') && !target.classList.contains('azar-disabled')) {
                            action = 'select-day';
                            target._dayData = {
                                year: parseInt(target.getAttribute('data-year')),
                                month: parseInt(target.getAttribute('data-month')),
                                day: parseInt(target.getAttribute('data-day')),
                            };
                        }
                        if (target.classList.contains('azar-month-cell')) {
                            action = 'select-month';
                            target._monthData = parseInt(target.getAttribute('data-month'));
                        }
                        if (target.classList.contains('azar-year-cell')) {
                            action = 'select-year';
                            target._yearData = parseInt(target.getAttribute('data-year'));
                        }
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
                });

                this._overlayEl.addEventListener('click', function () { self.close(); });

                document.addEventListener('click', function (e) {
                    if (self._isOpen && !self._wrapperEl.contains(e.target) && e.target !== self._overlayEl) {
                        self.close();
                    }
                });

                document.addEventListener('keydown', function (e) {
                    if (self._isOpen && e.key === 'Escape') {
                        self.close();
                        self.inputEl.blur();
                    }
                });

                window.addEventListener('resize', function () {
                    var wasMobile = self._isMobile;
                    self._detectMobile();
                    if (wasMobile !== self._isMobile && self._isOpen) {
                        self.close();
                        setTimeout(function () { self.open(); }, 150);
                    }
                });

                if (window.matchMedia) {
                    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () {
                        if (self.options.darkMode === 'auto') {
                            self._detectDarkMode();
                            self._applyDarkMode();
                        }
                    });
                }
            };

            AzarDatepicker.prototype._navigate = function (delta) {
                if (this._view === 'days') {
                    this._cursorDate.month += delta;
                    if (this._cursorDate.month > 12) {
                        this._cursorDate.month = 1;
                        this._cursorDate.year++;
                    } else if (this._cursorDate.month < 1) {
                        this._cursorDate.month = 12;
                        this._cursorDate.year--;
                    }
                } else if (this._view === 'months') {
                    this._cursorDate.year += delta;
                } else if (this._view === 'years') {
                    this._cursorDate.year += delta * 12;
                }
                // Prevent negative/zero year
                if (this._cursorDate.year < 1) this._cursorDate.year = 1;
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
                var gy = now.getFullYear();
                var gm = now.getMonth() + 1;
                var gd = now.getDate();
                var hour = now.getHours();
                var minute = now.getMinutes();

                if (this._calendar === 'jalali') {
                    var j = gregorianToJalali(gy, gm, gd);
                    if (!j) j = gregorianToJalali(2024, 1, 1);
                    this._selectedDate = { year: j.jy, month: j.jm, day: j.jd, hour: hour, minute: minute };
                    this._cursorDate = { year: j.jy, month: j.jm, day: j.jd, hour: hour, minute: minute };
                } else {
                    this._selectedDate = { year: gy, month: gm, day: gd, hour: hour, minute: minute };
                    this._cursorDate = { year: gy, month: gm, day: gd, hour: hour, minute: minute };
                }
                this._view = 'days';
                this._renderView();
                this._updateInputDisplay();
                this._fireEvents();
                if (this.options.closeOnSelect && this.options.mode !== 'time') {
                    this.close();
                }
            };

            /** SAFE CALENDAR TOGGLE – fixes NaN bug */
            AzarDatepicker.prototype._toggleCalendar = function () {
                var self = this;
                var newCal = (this._calendar === 'jalali') ? 'gregorian' : 'jalali';
                var cur = this._cursorDate;
                var sel = this._selectedDate;

                // Convert cursor date safely
                var newCursor = null;
                if (newCal === 'jalali') {
                    var j = gregorianToJalali(cur.year, cur.month, Math.max(1, Math.min(28, cur.day || 1)));
                    if (!j) {
                        // fallback to current Jalali date
                        var now = new Date();
                        j = gregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
                        if (!j) j = { jy: 1403, jm: 1, jd: 1 };
                    }
                    newCursor = {
                        year: j.jy, month: j.jm, day: Math.min(j.jd, jalaliDaysInMonth(j.jy, j.jm)),
                        hour: cur.hour || 0, minute: cur.minute || 0
                    };
                } else {
                    var g = jalaliToGregorian(cur.year, cur.month, Math.max(1, Math.min(28, cur.day || 1)));
                    if (!g) {
                        var now = new Date();
                        g = { gy: now.getFullYear(), gm: now.getMonth() + 1, gd: now.getDate() };
                    }
                    newCursor = {
                        year: g.gy, month: g.gm, day: Math.min(g.gd, gregorianDaysInMonth(g.gy, g.gm)),
                        hour: cur.hour || 0, minute: cur.minute || 0
                    };
                }

                // Convert selected date if exists
                var newSelected = null;
                if (sel) {
                    if (newCal === 'jalali') {
                        var js = gregorianToJalali(sel.year, sel.month, sel.day);
                        if (js) newSelected = { year: js.jy, month: js.jm, day: js.jd, hour: sel.hour || 0, minute: sel.minute || 0 };
                    } else {
                        var gs = jalaliToGregorian(sel.year, sel.month, sel.day);
                        if (gs) newSelected = { year: gs.gy, month: gs.gm, day: gs.gd, hour: sel.hour || 0, minute: sel.minute || 0 };
                    }
                }

                this._calendar = newCal;
                this._containerEl.setAttribute('data-calendar', newCal);
                if (this.options.rtl === null) {
                    this.options.rtl = (newCal === 'jalali');
                    if (this.options.rtl) this._containerEl.setAttribute('dir', 'rtl');
                    else this._containerEl.removeAttribute('dir');
                }

                this._cursorDate = newCursor;
                this._selectedDate = newSelected;
                this._view = 'days';
                this._renderView();
                this._updateInputDisplay();

                // Update toggle button text
                var toggleBtn = this._containerEl.querySelector('.azar-calendar-toggle');
                if (toggleBtn) toggleBtn.textContent = newCal === 'jalali' ? 'میلادی' : 'شمسی';

                // Update today button
                var todayBtn = this._containerEl.querySelector('.azar-btn-today');
                if (todayBtn) todayBtn.textContent = newCal === 'jalali' ? 'امروز' : 'Today';

                // Update weekday headers
                var wkds = newCal === 'jalali' ? JALALI_WEEKDAYS_SHORT : GREGORIAN_WEEKDAYS_SHORT;
                var wkdSpans = this._containerEl.querySelectorAll('.azar-weekdays span');
                for (var i = 0; i < wkdSpans.length; i++) {
                    wkdSpans[i].textContent = wkds[i];
                }
            };

            AzarDatepicker.prototype._onDaySelect = function (dayData) {
                this._selectedDate = {
                    year: dayData.year,
                    month: dayData.month,
                    day: dayData.day,
                    hour: this._selectedDate ? this._selectedDate.hour : (this._cursorDate.hour || 0),
                    minute: this._selectedDate ? this._selectedDate.minute : (this._cursorDate.minute || 0),
                };
                this._cursorDate.year = dayData.year;
                this._cursorDate.month = dayData.month;
                this._cursorDate.day = dayData.day;
                this._updateInputDisplay();
                this._renderView();
                this._fireEvents();
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
                    this._selectedDate = {
                        year: this._cursorDate.year,
                        month: this._cursorDate.month,
                        day: this._cursorDate.day,
                        hour: this._cursorDate.hour || 0,
                        minute: this._cursorDate.minute || 0,
                    };
                }
                var h = (this._selectedDate.hour || 0) + dh;
                var m = (this._selectedDate.minute || 0) + dm;
                if (m >= 60) { m -= 60; h++; }
                if (m < 0) { m += 60; h--; }
                if (h >= 24) h -= 24;
                if (h < 0) h += 24;
                this._selectedDate.hour = h;
                this._selectedDate.minute = m;
                this._cursorDate.hour = h;
                this._cursorDate.minute = m;
                this._updateTimeDisplay();
                this._updateInputDisplay();
                this._fireEvents();
            };

            AzarDatepicker.prototype._getDaysInMonth = function (year, month) {
                if (this._calendar === 'jalali') return jalaliDaysInMonth(year, month);
                return gregorianDaysInMonth(year, month);
            };

            AzarDatepicker.prototype._renderView = function () {
                var container = this._containerEl;
                var monthNameEl = container.querySelector('.azar-month-name');
                var yearEl = container.querySelector('.azar-year');

                if (this._calendar === 'jalali') {
                    monthNameEl.textContent = JALALI_MONTHS[this._cursorDate.month - 1];
                } else {
                    monthNameEl.textContent = GREGORIAN_MONTHS[this._cursorDate.month - 1];
                }
                yearEl.textContent = this._cursorDate.year;

                var daysView = container.querySelector('.azar-view-days');
                var monthsView = container.querySelector('.azar-view-months');
                var yearsView = container.querySelector('.azar-view-years');
                daysView.style.display = 'none';
                monthsView.style.display = 'none';
                yearsView.style.display = 'none';

                if (this._view === 'days') {
                    daysView.style.display = '';
                    this._renderDaysGrid();
                } else if (this._view === 'months') {
                    monthsView.style.display = '';
                    this._renderMonthsGrid();
                } else {
                    yearsView.style.display = '';
                    this._renderYearsGrid();
                }

                var body = container.querySelector('.azar-datepicker-body');
                body.classList.remove('azar-view-enter');
                void body.offsetWidth;
                body.classList.add('azar-view-enter');

                this._updateTimeDisplay();
            };

            AzarDatepicker.prototype._renderDaysGrid = function () {
                var grid = this._containerEl.querySelector('.azar-days-grid');
                var year = this._cursorDate.year;
                var month = this._cursorDate.month;
                var daysInMonth = this._getDaysInMonth(year, month);
                var cal = this._calendar;

                var firstDayDate;
                if (cal === 'jalali') {
                    var g = jalaliToGregorian(year, month, 1);
                    firstDayDate = new Date(g.gy, g.gm - 1, g.gd);
                } else {
                    firstDayDate = new Date(year, month - 1, 1);
                }
                var startDayOfWeek = firstDayDate.getDay();
                var weekStart = (cal === 'jalali') ? 6 : 0;
                var leadingBlanks = (startDayOfWeek - weekStart + 7) % 7;

                var now = new Date();
                var todayGy = now.getFullYear();
                var todayGm = now.getMonth() + 1;
                var todayGd = now.getDate();
                var todayJ = gregorianToJalali(todayGy, todayGm, todayGd);

                var html = '';
                var prevMonth = month - 1;
                var prevYear = year;
                if (prevMonth < 1) { prevMonth = 12; prevYear--; }
                var prevDays = this._getDaysInMonth(prevYear, prevMonth);
                for (var i = leadingBlanks - 1; i >= 0; i--) {
                    var pd = prevDays - i;
                    html += '<span class="azar-day-cell azar-outside" data-year="' + prevYear + '" data-month="' + prevMonth + '" data-day="' + pd + '">' + pd + '</span>';
                }

                for (var d = 1; d <= daysInMonth; d++) {
                    var classes = 'azar-day-cell';
                    var isToday = false;
                    if (cal === 'jalali') {
                        isToday = (todayJ && year === todayJ.jy && month === todayJ.jm && d === todayJ.jd);
                    } else {
                        isToday = (year === todayGy && month === todayGm && d === todayGd);
                    }
                    if (isToday) classes += ' azar-today';
                    if (this._selectedDate && this._selectedDate.year === year && this._selectedDate.month === month && this._selectedDate.day === d) {
                        classes += ' azar-selected';
                    }
                    html += '<span class="' + classes + '" data-year="' + year + '" data-month="' + month + '" data-day="' + d + '">' + d + '</span>';
                }

                var totalCells = leadingBlanks + daysInMonth;
                var remaining = totalCells % 7;
                var trailingBlanks = remaining === 0 ? 0 : 7 - remaining;
                var nextMonth = month + 1;
                var nextYear = year;
                if (nextMonth > 12) { nextMonth = 1; nextYear++; }
                for (var nd = 1; nd <= trailingBlanks; nd++) {
                    html += '<span class="azar-day-cell azar-outside" data-year="' + nextYear + '" data-month="' + nextMonth + '" data-day="' + nd + '">' + nd + '</span>';
                }

                grid.innerHTML = html;
            };

            AzarDatepicker.prototype._renderMonthsGrid = function () {
                var grid = this._containerEl.querySelector('.azar-view-months');
                var months = (this._calendar === 'jalali') ? JALALI_MONTHS_SHORT : GREGORIAN_MONTHS_SHORT;
                var html = '';
                for (var i = 0; i < 12; i++) {
                    var classes = 'azar-month-cell';
                    if (this._cursorDate.month === i + 1) classes += ' azar-selected';
                    html += '<span class="' + classes + '" data-month="' + (i + 1) + '">' + months[i] + '</span>';
                }
                grid.innerHTML = html;
            };

            AzarDatepicker.prototype._renderYearsGrid = function () {
                var grid = this._containerEl.querySelector('.azar-view-years');
                var baseYear = Math.floor(this._cursorDate.year / 12) * 12 - 2;
                var html = '';
                for (var i = 0; i < 16; i++) {
                    var y = baseYear + i;
                    var classes = 'azar-year-cell';
                    if (this._cursorDate.year === y) classes += ' azar-selected';
                    html += '<span class="' + classes + '" data-year="' + y + '">' + y + '</span>';
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
                    var h = String(this._cursorDate.hour || 0).padStart(2, '0');
                    var m = String(this._cursorDate.minute || 0).padStart(2, '0');
                    this.inputEl.value = h + ':' + m;
                    this.inputEl.classList.remove('azar-has-value');
                    return;
                }
                if (!this._selectedDate) {
                    this.inputEl.value = '';
                    this.inputEl.classList.remove('azar-has-value');
                    return;
                }
                var formatted = this._formatDate(this._selectedDate, this.options.inputFormat);
                this.inputEl.value = formatted;
                this.inputEl.classList.add('azar-has-value');
            };

            AzarDatepicker.prototype._formatDate = function (dateObj, format) {
                var y = dateObj.year;
                var m = dateObj.month;
                var d = dateObj.day;
                var h = dateObj.hour || 0;
                var min = dateObj.minute || 0;
                var cal = this._calendar;

                var monthNames = cal === 'jalali' ? JALALI_MONTHS : GREGORIAN_MONTHS;
                var monthNamesShort = cal === 'jalali' ? JALALI_MONTHS_SHORT : GREGORIAN_MONTHS_SHORT;

                var result = format;
                result = result.replace('YYYY', String(y));
                result = result.replace('YY', String(y).slice(-2));
                result = result.replace('MMMM', monthNames[m - 1]);
                result = result.replace('MMM', monthNamesShort[m - 1]);
                result = result.replace('MM', String(m).padStart(2, '0'));
                result = result.replace('M', String(m));
                result = result.replace('DD', String(d).padStart(2, '0'));
                result = result.replace('D', String(d));
                result = result.replace('HH', String(h).padStart(2, '0'));
                result = result.replace('H', String(h));
                var ampm = h >= 12 ? 'PM' : 'AM';
                var h12 = h % 12;
                if (h12 === 0) h12 = 12;
                result = result.replace('hh', String(h12).padStart(2, '0'));
                result = result.replace('h', String(h12));
                result = result.replace('mm', String(min).padStart(2, '0'));
                result = result.replace('m', String(min));
                result = result.replace('A', ampm);
                result = result.replace('a', ampm.toLowerCase());
                return result;
            };

            AzarDatepicker.prototype._fireEvents = function () {
                if (!this._selectedDate) return;
                var data = this._getOutputData();
                if (this.options.onSelect && typeof this.options.onSelect === 'function') {
                    this.options.onSelect(data);
                }
                if (this.options.onChange && typeof this.options.onChange === 'function') {
                    this.options.onChange(data);
                }
            };

            AzarDatepicker.prototype._getOutputData = function () {
                if (!this._selectedDate) return null;
                var sd = this._selectedDate;
                var formatted = this._formatDate(sd, this.options.outputFormat);
                var nativeDate;
                if (this._calendar === 'jalali') {
                    var g = jalaliToGregorian(sd.year, sd.month, sd.day);
                    if (g) nativeDate = new Date(g.gy, g.gm - 1, g.gd, sd.hour || 0, sd.minute || 0, 0);
                    else nativeDate = new Date(); // fallback
                } else {
                    nativeDate = new Date(sd.year, sd.month - 1, sd.day, sd.hour || 0, sd.minute || 0, 0);
                }
                return {
                    year: sd.year,
                    month: sd.month,
                    day: sd.day,
                    hour: sd.hour || 0,
                    minute: sd.minute || 0,
                    calendar: this._calendar,
                    formatted: formatted,
                    nativeDate: nativeDate,
                    iso: nativeDate.toISOString(),
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
                    this._containerEl.style.removeProperty('--azar-bg');
                    this._containerEl.style.removeProperty('--azar-surface');
                    this._containerEl.style.removeProperty('--azar-border');
                    this._containerEl.style.removeProperty('--azar-text');
                }
            };

            // ========== PUBLIC API ==========
            AzarDatepicker.prototype.open = function () {
                if (this._isOpen) return;
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
                } else {
                    container.classList.remove('azar-modal');
                    this._overlayEl.classList.remove('azar-open');
                }
                void container.offsetWidth;
                container.classList.add('azar-open');
                this._isOpen = true;
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
                }, 200);
            };

            AzarDatepicker.prototype.toggle = function () {
                if (this._isOpen) this.close();
                else this.open();
            };

            AzarDatepicker.prototype.getValue = function () {
                return this._getOutputData();
            };

            AzarDatepicker.prototype.setValue = function (dateObj) {
                if (!dateObj) { this._selectedDate = null; this._updateInputDisplay(); this._renderView(); return; }
                this._selectedDate = {
                    year: dateObj.year,
                    month: dateObj.month,
                    day: dateObj.day,
                    hour: dateObj.hour || 0,
                    minute: dateObj.minute || 0,
                };
                this._cursorDate = {
                    year: dateObj.year,
                    month: dateObj.month,
                    day: dateObj.day,
                    hour: dateObj.hour || 0,
                    minute: dateObj.minute || 0,
                };
                this._updateInputDisplay();
                this._renderView();
            };

            AzarDatepicker.prototype.setCalendar = function (calendar) {
                if (calendar === this._calendar) return;
                this._toggleCalendar();
            };

            AzarDatepicker.prototype.getCalendar = function () {
                return this._calendar;
            };

            AzarDatepicker.prototype.destroy = function () {
                this.close();
                if (this._overlayEl && this._overlayEl.parentNode) {
                    this._overlayEl.parentNode.removeChild(this._overlayEl);
                }
                if (this._containerEl && this._containerEl.parentNode) {
                    this._containerEl.parentNode.removeChild(this._containerEl);
                }
                if (this._wrapperEl && this.inputEl) {
                    this._wrapperEl.parentNode.insertBefore(this.inputEl, this._wrapperEl);
                    this._wrapperEl.parentNode.removeChild(this._wrapperEl);
                }
                this.inputEl.classList.remove('azar-datepicker-input');
                this.inputEl.removeAttribute('readonly');
                this.inputEl.removeAttribute('autocomplete');
            };

            AzarDatepicker.prototype.refresh = function () {
                this._detectDarkMode();
                this._applyDarkMode();
                this._detectMobile();
                this._renderView();
                this._updateInputDisplay();
            };

            // ========== STATIC INIT ==========
            AzarDatepicker.init = function (options) {
                return new AzarDatepicker(options);
            };

            global.AzarDatepicker = AzarDatepicker;

            // Auto‑init via data attributes
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

        })(typeof window !== 'undefined' ? window : this);

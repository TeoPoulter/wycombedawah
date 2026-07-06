const ADMIN_PIN = '0016';

const AIRTABLE_TOKEN = 'patE4dIBHx8hr6Xx6.011cb03a262fbe6df0117b1865991354642d2090a3b0cdcb48fafd6e4288f023';
const AIRTABLE_BASE_ID = 'app5EyWzEJ3Xcyy1x';
const AIRTABLE_STATUS_TABLE_NAME = 'Current Office Status';
const AIRTABLE_STATUS_RECORD_ID = 'recFRGfcwsEIzstux';
const AIRTABLE_BOOKINGS_TABLE_NAME = 'Office Bookings';
const AIRTABLE_STATUS_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_STATUS_TABLE_NAME)}/${AIRTABLE_STATUS_RECORD_ID}`;
const AIRTABLE_BOOKINGS_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_BOOKINGS_TABLE_NAME)}`;
const AIRTABLE_CONNECTED = AIRTABLE_TOKEN && AIRTABLE_TOKEN !== 'PASTE_YOUR_AIRTABLE_TOKEN_HERE';

const statuses = {
  open: {
    bodyClass: 'status-open',
    label: 'Open Workspace',
    title: 'Anyone can come and use the office.',
    text: 'Please come with purpose: work, planning, meetings, calls, projects, da’wah/admin, study or agreed tasks.'
  },
  knock: {
    bodyClass: 'status-knock',
    label: 'Knock First',
    title: 'Come in, but knock first.',
    text: 'Someone may be working, on a call, in a meeting, recording or using the space privately. Please knock or message before entering.'
  },
  closed: {
    bodyClass: 'status-closed',
    label: 'Out of Bounds',
    title: 'Do not enter unless invited.',
    text: 'An in-person meeting, private discussion, recording, sensitive work or closed access is currently taking place.'
  }
};

const bookingContacts = [
  { aliases: ['teo'], phone: '447474089238' },
  { aliases: ['kewin'], phone: '447565729147' },
  { aliases: ['shoaib', 'tsg', 'the sunnah guy', 'criterion', 'wmc', 'growrizq', 'buildu'], phone: '447930973845' },
  { aliases: ['faizal'], phone: '447903775562' },
  { aliases: ['yaks', 'mohammed', 'mohammed yakub', 'muhammad yaqoob', 'muhammad yakub', 'abu adam'], phone: '447479374527' },
  { aliases: ['adam'], phone: '447542553588' },
  { aliases: ['umayr'], phone: '447861514718' },
  { aliases: ['imran'], phone: '447810734763' },
  { aliases: ["mu'izz", 'muizz'], phone: '447806795247' },
  { aliases: ['mohsin'], phone: '447826097650' },
  { aliases: ['jameel'], phone: '447740171101' },
  { aliases: ['jibreel'], phone: '447845089055' },
  { aliases: ['amaan'], phone: '447732053701' }
];

const els = {
  body: document.body,
  tvModeBtn: document.getElementById('tvModeBtn'),
  openAvailabilityBtn: document.getElementById('openAvailabilityBtn'),
  availabilityModal: document.getElementById('availabilityModal'),
  closeAvailabilityBtn: document.getElementById('closeAvailabilityBtn'),
  showBookingFormBtn: document.getElementById('showBookingFormBtn'),
  bookingFormWrap: document.getElementById('bookingFormWrap'),
  bookingForm: document.getElementById('bookingForm'),
  bookingTitle: document.getElementById('bookingTitle'),
  bookingName: document.getElementById('bookingName'),
  bookingDate: document.getElementById('bookingDate'),
  bookingStart: document.getElementById('bookingStart'),
  bookingEnd: document.getElementById('bookingEnd'),
  bookingStatus: document.getElementById('bookingStatus'),
  bookingStatusChoices: [...document.querySelectorAll('[data-booking-status]')],
  saveBookingBtn: document.getElementById('saveBookingBtn'),
  cancelBookingBtn: document.getElementById('cancelBookingBtn'),
  bookingNote: document.getElementById('bookingNote'),
  bookingsList: document.getElementById('bookingsList'),
  bookingsSummary: document.getElementById('bookingsSummary'),
  liveBookingPill: document.getElementById('liveBookingPill'),
  customDateTrigger: document.getElementById('customDateTrigger'),
  selectedDateLabel: document.getElementById('selectedDateLabel'),
  selectedDateSubLabel: document.getElementById('selectedDateSubLabel'),
  miniCalendar: document.getElementById('miniCalendar'),
  calendarDays: document.getElementById('calendarDays'),
  calendarMonthLabel: document.getElementById('calendarMonthLabel'),
  prevMonthBtn: document.getElementById('prevMonthBtn'),
  nextMonthBtn: document.getElementById('nextMonthBtn'),
  datePresetButtons: [...document.querySelectorAll('[data-date-preset]')],
  openAdminBtn: document.getElementById('openAdminBtn'),
  adminModal: document.getElementById('adminModal'),
  closeAdminBtn: document.getElementById('closeAdminBtn'),
  adminForm: document.getElementById('adminForm'),
  statusSelect: document.getElementById('statusSelect'),
  statusChoices: [...document.querySelectorAll('[data-status-choice]')],
  pinDots: [...document.querySelectorAll('#pinDots span')],
  pinKeypad: document.getElementById('pinKeypad'),
  nameInput: document.getElementById('nameInput'),
  statusLabel: document.getElementById('statusLabel'),
  statusTitle: document.getElementById('statusTitle'),
  statusText: document.getElementById('statusText'),
  lastUpdated: document.getElementById('lastUpdated'),
  updatedBy: document.getElementById('updatedBy'),
  toast: document.getElementById('toast'),
  adminNote: document.getElementById('adminNote'),
  saveStatusBtn: document.getElementById('saveStatusBtn'),
  rangeTabs: [...document.querySelectorAll('[data-range]')]
};

let pinBuffer = '';
let bookings = [];
let currentRange = 'today';
let calendarCursor = new Date();

const store = {
  get(key, fallback = '') {
    try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, value); } catch {}
  }
};

function normaliseName(name) {
  return String(name || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[char]));
}

function getBookingContactLink(name) {
  const cleanName = normaliseName(name);
  const match = bookingContacts.find(contact =>
    contact.aliases.some(alias => cleanName === normaliseName(alias))
  );
  return match ? `https://wa.me/${match.phone}?text=Salaam` : null;
}

function renderName(name) {
  const link = getBookingContactLink(name);
  const safe = escapeHtml(name || 'WMC Team');
  return link ? `<a href="${link}" target="_blank" rel="noopener">${safe}</a>` : safe;
}

function statusKeyToAirtable(statusKey) {
  if (statusKey === 'open') return 'Open Workspace';
  if (statusKey === 'knock') return 'Knock First';
  if (statusKey === 'closed') return 'Out Of Bounds';
  return 'Open Workspace';
}

function airtableStatusToKey(value) {
  const clean = String(value || '').toLowerCase().replace(/[^a-z]/g, '');
  if (clean.includes('knock')) return 'knock';
  if (clean.includes('bound') || clean.includes('closed')) return 'closed';
  return 'open';
}

function formatTime(date = new Date()) {
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function formatAirtableTime(value) {
  if (!value) return formatTime();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? formatTime() : formatTime(date);
}

function dateToISO(date) {
  const tzOffset = date.getTimezoneOffset();
  return new Date(date.getTime() - tzOffset * 60000).toISOString().slice(0, 10);
}

function todayISO(offset = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return dateToISO(date);
}

function prettyDate(iso) {
  const date = new Date(`${iso}T12:00:00`);
  return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function longDate(iso) {
  const date = new Date(`${iso}T12:00:00`);
  return date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

function prettyTime(time) {
  if (!time) return '';
  const [hours, minutes] = String(time).split(':');
  const date = new Date();
  date.setHours(Number(hours || 0), Number(minutes || 0), 0, 0);
  return date.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' }).replace(' ', '').toLowerCase();
}

function bookingStartDate(booking) {
  return new Date(`${booking.date}T${booking.start || '00:00'}:00`);
}

function bookingEndDate(booking) {
  return new Date(`${booking.date}T${booking.end || '23:59'}:00`);
}

function isCurrentBooking(booking) {
  const now = new Date();
  return bookingStartDate(booking) <= now && bookingEndDate(booking) > now;
}

async function airtableRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${AIRTABLE_TOKEN}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Airtable failed: ${response.status} ${errorText}`);
  }
  return response.json();
}

async function getAirtableStatus() {
  if (!AIRTABLE_CONNECTED) return null;
  const data = await airtableRequest(AIRTABLE_STATUS_URL, { method: 'GET' });
  return data.fields || {};
}

async function updateAirtableStatus(statusKey, updatedBy) {
  if (!AIRTABLE_CONNECTED) return null;
  const data = await airtableRequest(AIRTABLE_STATUS_URL, {
    method: 'PATCH',
    body: JSON.stringify({
      fields: {
        Name: 'Office',
        'Current Status': statusKeyToAirtable(statusKey),
        Source: 'Website',
        'Updated By': updatedBy || 'WMC Team'
      }
    })
  });
  return data.fields || {};
}

async function fetchBookingsFromAirtable() {
  if (!AIRTABLE_CONNECTED) return loadLocalBookings();
  try {
    const url = `${AIRTABLE_BOOKINGS_URL}?pageSize=100`;
    const data = await airtableRequest(url, { method: 'GET' });
    bookings = (data.records || []).map(record => normaliseBookingRecord(record)).filter(Boolean);
    saveLocalBookings(bookings);
  } catch (error) {
    console.warn('Bookings table unavailable, using local bookings fallback.', error);
    bookings = loadLocalBookings();
  }
  renderBookings();
}

function normaliseBookingRecord(record) {
  const fields = record.fields || record;
  const date = fields.Date || fields.date;
  const start = fields['Start Time'] || fields.start;
  const end = fields['End Time'] || fields.end;
  if (!date || !start || !end) return null;
  return {
    id: record.id || (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random())),
    title: fields.Title || fields.title || 'Office booking',
    bookedBy: fields['Booked By'] || fields.bookedBy || 'WMC Team',
    date,
    start,
    end,
    status: airtableStatusToKey(fields.Status || fields.status),
    createdAt: fields['Created At'] || fields.createdAt || ''
  };
}

function loadLocalBookings() {
  try { return JSON.parse(localStorage.getItem('wmcOfficeBookings') || '[]'); } catch { return []; }
}

function saveLocalBookings(value) {
  try { localStorage.setItem('wmcOfficeBookings', JSON.stringify(value)); } catch {}
}

async function createBooking(payload) {
  const localBooking = {
    ...payload,
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
    createdAt: new Date().toISOString()
  };

  if (AIRTABLE_CONNECTED) {
    try {
      const data = await airtableRequest(AIRTABLE_BOOKINGS_URL, {
        method: 'POST',
        body: JSON.stringify({
          fields: {
            Title: payload.title,
            'Booked By': payload.bookedBy,
            Date: payload.date,
            'Start Time': payload.start,
            'End Time': payload.end,
            Status: statusKeyToAirtable(payload.status),
            'Created At': localBooking.createdAt
          }
        })
      });
      bookings.push(normaliseBookingRecord(data));
      saveLocalBookings(bookings);
      return;
    } catch (error) {
      console.warn('Booking saved locally because Airtable bookings table failed.', error);
      throw error;
    }
  }

  bookings.push(localBooking);
  saveLocalBookings(bookings);
}

async function refreshFromAirtable({ silent = true } = {}) {
  if (!AIRTABLE_CONNECTED) return;
  try {
    const fields = await getAirtableStatus();
    const statusKey = airtableStatusToKey(fields['Current Status']);
    const updatedBy = fields['Updated By'] || fields.Source || 'WMC Team';
    const updatedAt = formatAirtableTime(fields['Last Updated']);
    store.set('wmcOfficeStatus', statusKey);
    store.set('wmcUpdatedBy', updatedBy);
    store.set('wmcUpdatedAt', updatedAt);
    applyStatus(statusKey, updatedBy, updatedAt);
  } catch (error) {
    console.error(error);
    if (!silent) showToast('Could not load live status');
  }
}

function setBodyStatus(statusKey) {
  Object.values(statuses).forEach(status => els.body.classList.remove(status.bodyClass));
  els.body.classList.add((statuses[statusKey] || statuses.open).bodyClass);
}

function applyStatus(statusKey, updatedBy, updatedAt) {
  const status = statuses[statusKey] || statuses.open;
  els.body.classList.add('status-changing');
  window.setTimeout(() => els.body.classList.remove('status-changing'), 260);
  setBodyStatus(statusKey);
  if (els.statusLabel) els.statusLabel.textContent = status.label;
  if (els.statusTitle) els.statusTitle.textContent = status.title;
  if (els.statusText) els.statusText.textContent = status.text;
  if (els.updatedBy) els.updatedBy.textContent = updatedBy || 'WMC Team';
  if (els.lastUpdated) els.lastUpdated.textContent = updatedAt || formatTime();
  if (els.statusSelect) els.statusSelect.value = statusKey;
  els.statusChoices.forEach(button => {
    const active = button.dataset.statusChoice === statusKey;
    button.classList.toggle('active', active);
    button.setAttribute('aria-checked', active ? 'true' : 'false');
  });
}

function renderLiveBookingPill() {
  const current = bookings.find(isCurrentBooking);
  if (!els.liveBookingPill) return;
  if (!current) {
    els.liveBookingPill.hidden = true;
    return;
  }
  els.liveBookingPill.hidden = false;
  els.liveBookingPill.innerHTML = `<strong>${escapeHtml(current.title)}</strong> is booked until ${prettyTime(current.end)} · ${statusKeyToAirtable(current.status)}`;
}

function renderBookings() {
  if (!els.bookingsList) return;
  const startDate = todayISO(currentRange === 'tomorrow' ? 1 : 0);
  const endDate = currentRange === 'week' ? todayISO(6) : startDate;
  const filtered = bookings
    .filter(booking => booking.date >= startDate && booking.date <= endDate)
    .sort((a, b) => `${a.date} ${a.start}`.localeCompare(`${b.date} ${b.start}`));
  const label = currentRange === 'today' ? 'today' : currentRange === 'tomorrow' ? 'tomorrow' : 'this week';

  if (els.bookingsSummary) {
    els.bookingsSummary.textContent = filtered.length ? `${filtered.length} booking${filtered.length === 1 ? '' : 's'} ${label}` : `No bookings ${label}`;
  }

  if (!filtered.length) {
    els.bookingsList.innerHTML = `<div class="empty-state">The office has no bookings ${label}.</div>`;
    renderLiveBookingPill();
    return;
  }

  els.bookingsList.innerHTML = filtered.map(booking => {
    const now = isCurrentBooking(booking) ? ' · Now' : '';
    return `<article class="booking-card">
      <div class="booking-time">${prettyDate(booking.date)}<br>${prettyTime(booking.start)} – ${prettyTime(booking.end)}</div>
      <div>
        <div class="booking-title">${escapeHtml(booking.title)}${now}</div>
        <div class="booking-meta">Booked by ${renderName(booking.bookedBy)}</div>
      </div>
      <div class="booking-badge badge-${booking.status}">${statusKeyToAirtable(booking.status)}</div>
    </article>`;
  }).join('');
  renderLiveBookingPill();
}

function loadInitialState() {
  const savedStatus = store.get('wmcOfficeStatus', 'open');
  const savedName = store.get('wmcUpdatedBy', 'WMC Team');
  const savedTime = store.get('wmcUpdatedAt', '--:--');
  const savedAuth = store.get('wmcAdminApproved', 'false') === 'true';
  const savedPin = store.get('wmcAdminPin', '');

  if (els.nameInput) {
    els.nameInput.value = store.get('wmcAdminName', savedName === 'WMC Team' ? '' : savedName);
  }

  if (savedAuth && savedPin === ADMIN_PIN) {
    pinBuffer = ADMIN_PIN;
    updatePinDots();
  }

  bookings = loadLocalBookings();
  applyStatus(savedStatus, savedName, savedTime);
  initialiseBookingDate();
  renderCalendar();
  refreshFromAirtable({ silent: true });
  fetchBookingsFromAirtable();

  window.setTimeout(() => els.body.classList.remove('preloading'), 80);
}

function updatePinDots() {
  els.pinDots.forEach((dot, index) => dot.classList.toggle('filled', index < pinBuffer.length));
}

function getPin() { return pinBuffer; }
function clearPin() { pinBuffer = ''; updatePinDots(); }

function showToast(message = 'Status updated') {
  if (!els.toast) return;
  els.toast.textContent = message;
  els.toast.classList.add('show');
  setTimeout(() => els.toast.classList.remove('show'), 1800);
}

function openDialog(dialog) {
  if (!dialog) return;
  dialog.classList.remove('is-closing');
  typeof dialog.showModal === 'function' ? dialog.showModal() : dialog.setAttribute('open', '');
}

function closeDialog(dialog) {
  if (!dialog || !dialog.open) return;
  dialog.classList.add('is-closing');
  setTimeout(() => {
    typeof dialog.close === 'function' ? dialog.close() : dialog.removeAttribute('open');
    dialog.classList.remove('is-closing');
  }, 240);
}

function openAdmin() {
  if (els.adminNote) els.adminNote.textContent = '';
  openDialog(els.adminModal);
  setTimeout(() => {
    const authed = store.get('wmcAdminApproved', 'false') === 'true';
    if (authed && els.statusSelect) els.statusSelect.focus();
    else els.pinKeypad?.querySelector('button[data-pin]')?.focus();
  }, 50);
}

async function saveStatus(event) {
  event.preventDefault();

  if (getPin() !== ADMIN_PIN) {
    if (els.adminNote) {
      els.adminNote.textContent = 'Incorrect PIN.';
      els.adminNote.style.color = '#ffb3ac';
    }
    store.set('wmcAdminApproved', 'false');
    clearPin();
    return;
  }

  const activeChoice = document.querySelector('[data-status-choice].active');
  const statusKey = activeChoice?.dataset.statusChoice || els.statusSelect?.value || 'open';
  const updatedBy = (els.nameInput?.value || 'WMC Team').trim();
  const updatedAt = formatTime();

  store.set('wmcOfficeStatus', statusKey);
  store.set('wmcUpdatedBy', updatedBy);
  store.set('wmcAdminName', updatedBy);
  store.set('wmcUpdatedAt', updatedAt);
  store.set('wmcAdminApproved', 'true');
  store.set('wmcAdminPin', getPin());

  if (els.saveStatusBtn) {
    els.saveStatusBtn.disabled = true;
    els.saveStatusBtn.textContent = 'Saving...';
  }

  try {
    let finalUpdatedAt = updatedAt;
    if (AIRTABLE_CONNECTED) {
      const fields = await updateAirtableStatus(statusKey, updatedBy);
      finalUpdatedAt = formatAirtableTime(fields['Last Updated']);
    }
    applyStatus(statusKey, updatedBy, finalUpdatedAt);
    store.set('wmcUpdatedAt', finalUpdatedAt);
    closeDialog(els.adminModal);
    showToast(AIRTABLE_CONNECTED ? 'Live status updated' : 'Status updated locally');
  } catch (error) {
    console.error(error);
    if (els.adminNote) {
      els.adminNote.textContent = 'Could not update live status. Check Airtable settings.';
      els.adminNote.style.color = '#ffb3ac';
    }
  } finally {
    if (els.saveStatusBtn) {
      els.saveStatusBtn.disabled = false;
      els.saveStatusBtn.textContent = 'Save Status';
    }
  }
}

function openAvailability() {
  setBookingDateFromRange(true);
  renderBookings();
  openDialog(els.availabilityModal);
}

function initialiseBookingDate() {
  setBookingDate(todayISO(0));
  const now = new Date();
  now.setDate(1);
  calendarCursor = now;
}

function setBookingDateFromRange(force = false) {
  if (!els.bookingDate) return;
  const target = todayISO(currentRange === 'tomorrow' ? 1 : 0);
  if (force || currentRange === 'today' || currentRange === 'tomorrow') {
    setBookingDate(target);
  }
}

function setBookingDate(iso) {
  if (!els.bookingDate || !iso) return;
  els.bookingDate.value = iso;
  if (els.selectedDateLabel) els.selectedDateLabel.textContent = longDate(iso);
  if (els.selectedDateSubLabel) {
    const today = todayISO(0);
    const tomorrow = todayISO(1);
    els.selectedDateSubLabel.textContent = iso === today ? 'Today' : iso === tomorrow ? 'Tomorrow' : 'Custom date';
  }
  const date = new Date(`${iso}T12:00:00`);
  calendarCursor = new Date(date.getFullYear(), date.getMonth(), 1);
  els.datePresetButtons.forEach(button => {
    const presetDate = button.dataset.datePreset === 'tomorrow' ? todayISO(1) : todayISO(0);
    button.classList.toggle('active', presetDate === iso);
  });
  renderCalendar();
}

function renderCalendar() {
  if (!els.calendarDays || !els.calendarMonthLabel) return;
  const year = calendarCursor.getFullYear();
  const month = calendarCursor.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const selected = els.bookingDate?.value;
  const today = todayISO(0);

  els.calendarMonthLabel.textContent = firstDay.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  const days = [];
  for (let i = 0; i < startOffset; i++) {
    const date = new Date(year, month, 1 - startOffset + i);
    days.push({ date, outside: true });
  }
  for (let day = 1; day <= lastDay.getDate(); day++) {
    days.push({ date: new Date(year, month, day), outside: false });
  }
  while (days.length % 7 !== 0) {
    const last = days[days.length - 1].date;
    days.push({ date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1), outside: true });
  }

  els.calendarDays.innerHTML = days.map(({ date, outside }) => {
    const iso = dateToISO(date);
    const classes = ['calendar-day'];
    if (outside) classes.push('outside');
    if (iso === today) classes.push('today');
    if (iso === selected) classes.push('selected');
    return `<button type="button" class="${classes.join(' ')}" data-calendar-date="${iso}">${date.getDate()}</button>`;
  }).join('');
}

function setBookingStatus(statusKey) {
  if (els.bookingStatus) els.bookingStatus.value = statusKey;
  els.bookingStatusChoices.forEach(button => {
    const active = button.dataset.bookingStatus === statusKey;
    button.classList.toggle('active', active);
    button.setAttribute('aria-checked', active ? 'true' : 'false');
  });
}

async function saveBooking(event) {
  event.preventDefault();
  const payload = {
    title: els.bookingTitle.value.trim(),
    bookedBy: els.bookingName.value.trim(),
    date: els.bookingDate.value,
    start: els.bookingStart.value,
    end: els.bookingEnd.value,
    status: els.bookingStatus.value || 'knock'
  };

  if (!payload.title || !payload.bookedBy || !payload.date || !payload.start || !payload.end) return;

  if (payload.end <= payload.start) {
    els.bookingNote.textContent = 'End time must be after start time.';
    els.bookingNote.style.color = '#ffb3ac';
    return;
  }

  if (els.saveBookingBtn) {
    els.saveBookingBtn.disabled = true;
    els.saveBookingBtn.textContent = 'Saving...';
  }

  try {
    await createBooking(payload);
    els.bookingForm.reset();
    setBookingStatus('knock');
    setBookingDateFromRange(true);
    els.bookingFormWrap.hidden = true;
    els.bookingNote.textContent = '';
    await fetchBookingsFromAirtable();
    renderBookings();
    showToast('Booking saved');
  } catch (error) {
    console.error(error);
    els.bookingNote.textContent = 'Could not save booking. Check Airtable bookings table.';
    els.bookingNote.style.color = '#ffb3ac';
  } finally {
    if (els.saveBookingBtn) {
      els.saveBookingBtn.disabled = false;
      els.saveBookingBtn.textContent = 'Save Booking';
    }
  }
}

let tvHintTimer = null;
let tvSwitching = false;
function setTvMode(enabled) {
  if (tvSwitching) return;
  tvSwitching = true;
  els.body.classList.add('tv-switching');
  setTimeout(() => {
    els.body.classList.toggle('tv-mode', enabled);
    if (tvHintTimer) clearTimeout(tvHintTimer);
    els.body.classList.remove('show-tv-hint');
    if (enabled) {
      setTimeout(() => els.body.classList.add('show-tv-hint'), 120);
      tvHintTimer = setTimeout(() => els.body.classList.remove('show-tv-hint'), 5000);
    }
    setTimeout(() => {
      els.body.classList.remove('tv-switching');
      tvSwitching = false;
    }, 620);
  }, 120);
}

function toggleTvMode() {
  setTvMode(!els.body.classList.contains('tv-mode'));
}

els.openAdminBtn?.addEventListener('click', openAdmin);
els.closeAdminBtn?.addEventListener('click', () => closeDialog(els.adminModal));
els.adminForm?.addEventListener('submit', saveStatus);
els.tvModeBtn?.addEventListener('click', toggleTvMode);
els.openAvailabilityBtn?.addEventListener('click', openAvailability);
els.closeAvailabilityBtn?.addEventListener('click', () => closeDialog(els.availabilityModal));
els.showBookingFormBtn?.addEventListener('click', () => {
  els.bookingFormWrap.hidden = !els.bookingFormWrap.hidden;
  setBookingDateFromRange(false);
});
els.cancelBookingBtn?.addEventListener('click', () => {
  els.bookingFormWrap.hidden = true;
  els.bookingNote.textContent = '';
});
els.bookingForm?.addEventListener('submit', saveBooking);
els.rangeTabs.forEach(tab => tab.addEventListener('click', () => {
  currentRange = tab.dataset.range;
  els.rangeTabs.forEach(button => button.classList.toggle('active', button === tab));
  setBookingDateFromRange(true);
  renderBookings();
}));
els.datePresetButtons.forEach(button => button.addEventListener('click', () => {
  const offset = button.dataset.datePreset === 'tomorrow' ? 1 : 0;
  setBookingDate(todayISO(offset));
  els.miniCalendar.hidden = true;
  els.customDateTrigger.classList.remove('active');
}));
els.customDateTrigger?.addEventListener('click', () => {
  els.miniCalendar.hidden = !els.miniCalendar.hidden;
  els.customDateTrigger.classList.toggle('active', !els.miniCalendar.hidden);
  renderCalendar();
});
els.prevMonthBtn?.addEventListener('click', () => {
  calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() - 1, 1);
  renderCalendar();
});
els.nextMonthBtn?.addEventListener('click', () => {
  calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() + 1, 1);
  renderCalendar();
});
els.calendarDays?.addEventListener('click', event => {
  const button = event.target.closest('[data-calendar-date]');
  if (!button) return;
  setBookingDate(button.dataset.calendarDate);
  els.miniCalendar.hidden = true;
  els.customDateTrigger.classList.remove('active');
});
els.bookingStatusChoices.forEach(button => button.addEventListener('click', () => setBookingStatus(button.dataset.bookingStatus)));
els.statusChoices.forEach(button => button.addEventListener('click', () => {
  if (els.statusSelect) els.statusSelect.value = button.dataset.statusChoice;
  els.statusChoices.forEach(choice => {
    const active = choice === button;
    choice.classList.toggle('active', active);
    choice.setAttribute('aria-checked', active ? 'true' : 'false');
  });
}));
document.addEventListener('click', event => {
  if (!els.miniCalendar || els.miniCalendar.hidden) return;
  if (els.miniCalendar.contains(event.target) || els.customDateTrigger.contains(event.target)) return;
  els.miniCalendar.hidden = true;
  els.customDateTrigger.classList.remove('active');
});
document.addEventListener('dblclick', () => {
  if (els.body.classList.contains('tv-mode')) toggleTvMode();
});
els.adminModal?.addEventListener('click', event => {
  const rect = els.adminModal.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeDialog(els.adminModal);
});
els.availabilityModal?.addEventListener('click', event => {
  const rect = els.availabilityModal.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeDialog(els.availabilityModal);
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && els.body.classList.contains('tv-mode')) {
    toggleTvMode();
    return;
  }

  if (event.key === 'Escape' && els.miniCalendar && !els.miniCalendar.hidden) {
    els.miniCalendar.hidden = true;
    els.customDateTrigger.classList.remove('active');
    return;
  }

  if (els.adminModal?.open) {
    const isTypingName = event.target === els.nameInput;
    if (!isTypingName && /^[0-9]$/.test(event.key) && pinBuffer.length < 4) {
      event.preventDefault();
      pinBuffer += event.key;
      updatePinDots();
    }
    if (!isTypingName && event.key === 'Backspace') {
      event.preventDefault();
      pinBuffer = pinBuffer.slice(0, -1);
      updatePinDots();
    }
    if (!isTypingName && (event.key === 'Delete' || event.key.toLowerCase() === 'c')) {
      event.preventDefault();
      clearPin();
    }
  }
});
els.pinKeypad?.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  const digit = button.dataset.pin;
  const action = button.dataset.action;
  if (digit && pinBuffer.length < 4) pinBuffer += digit;
  if (action === 'backspace') pinBuffer = pinBuffer.slice(0, -1);
  if (action === 'clear') pinBuffer = '';
  updatePinDots();
});

loadInitialState();
setInterval(() => refreshFromAirtable({ silent: true }), 3000);
setInterval(fetchBookingsFromAirtable, 30000);
setInterval(renderLiveBookingPill, 15000);

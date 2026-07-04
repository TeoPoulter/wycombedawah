const ADMIN_PIN = '0016';

// Airtable live backend config
// Paste your NEW Airtable token below. Keep the quotes.
const AIRTABLE_TOKEN = 'patE4dIBHx8hr6Xx6.011cb03a262fbe6df0117b1865991354642d2090a3b0cdcb48fafd6e4288f023';
const AIRTABLE_BASE_ID = 'app5EyWzEJ3Xcyy1x';
const AIRTABLE_TABLE_NAME = 'Current Office Status';
// This is the single Office record. If this ever changes, update it from Airtable API docs.
const AIRTABLE_RECORD_ID = 'recFRGfcwsEIzstux';
const AIRTABLE_API_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_NAME)}/${AIRTABLE_RECORD_ID}`;
const AIRTABLE_CONNECTED = AIRTABLE_TOKEN && AIRTABLE_TOKEN !== 'PASTE_YOUR_AIRTABLE_TOKEN_HERE';

const statuses = {
  open: {
    bodyClass: 'status-open',
    label: 'Open Workspace',
    title: 'Anyone can come and use the office.',
    text: 'Please come with purpose: work, planning, meetings, calls, projects, da’wah/admin, study or agreed tasks.',
    announcement: 'WMC office is now open.'
  },
  knock: {
    bodyClass: 'status-knock',
    label: 'Knock First',
    title: 'Come in, but knock first.',
    text: 'Someone may be working, on a call, in a meeting, recording or using the space privately. Please knock or message before entering.',
    announcement: 'WMC office is now in knock first mode.'
  },
  closed: {
    bodyClass: 'status-closed',
    label: 'Out of Bounds',
    title: 'Do not enter unless invited.',
    text: 'An in-person meeting, private discussion, recording, sensitive work or closed access is currently taking place.',
    announcement: 'WMC office is currently out of bounds.'
  }
};

const els = {
  body: document.body,
  tvModeBtn: document.getElementById('tvModeBtn'),
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
  adminNote: document.getElementById('adminNote')
};

let pinBuffer = '';

const store = {
  get(key, fallback = '') {
    try { return localStorage.getItem(key) ?? fallback; }
    catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, value); } catch {}
  }
};


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

function formatAirtableTime(value) {
  if (!value) return formatTime();
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return formatTime();
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

async function getAirtableStatus() {
  if (!AIRTABLE_CONNECTED) return null;
  const response = await fetch(AIRTABLE_API_URL, {
    method: 'GET',
    headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` }
  });
  if (!response.ok) throw new Error(`Airtable read failed: ${response.status}`);
  const data = await response.json();
  return data.fields || {};
}

async function updateAirtableStatus(statusKey, updatedBy) {
  if (!AIRTABLE_CONNECTED) return null;
  const response = await fetch(AIRTABLE_API_URL, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${AIRTABLE_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      fields: {
        'Name': 'Office',
        'Current Status': statusKeyToAirtable(statusKey),
        'Source': 'Website',
        'Updated By': updatedBy || 'WMC Team'
      }
    })
  });
  if (!response.ok) throw new Error(`Airtable update failed: ${response.status}`);
  const data = await response.json();
  return data.fields || {};
}

async function refreshFromAirtable({ silent = true } = {}) {
  if (!AIRTABLE_CONNECTED) return;
  try {
    const fields = await getAirtableStatus();
    const statusKey = airtableStatusToKey(fields['Current Status']);
    const updatedBy = fields['Updated By'] || fields['Source'] || 'WMC Team';
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

function formatTime(date = new Date()) {
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function setBodyStatus(statusKey) {
  Object.values(statuses).forEach(s => els.body.classList.remove(s.bodyClass));
  els.body.classList.add(statuses[statusKey].bodyClass);
}

function applyStatus(statusKey, updatedBy, updatedAt) {
  const status = statuses[statusKey] || statuses.open;
  setBodyStatus(statusKey);
  els.statusLabel.textContent = status.label;
  els.statusTitle.textContent = status.title;
  els.statusText.textContent = status.text;
  els.updatedBy.textContent = updatedBy || 'WMC Team';
  els.lastUpdated.textContent = updatedAt || formatTime();
  els.statusSelect.value = statusKey;
  els.statusChoices.forEach(button => {
    const active = button.dataset.statusChoice === statusKey;
    button.classList.toggle('active', active);
    button.setAttribute('aria-checked', active ? 'true' : 'false');
  });
}

function loadInitialState() {
  const savedStatus = store.get('wmcOfficeStatus', 'open');
  const savedName = store.get('wmcUpdatedBy', 'WMC Team');
  const savedTime = store.get('wmcUpdatedAt', '--:--');
  const savedAuth = store.get('wmcAdminApproved', 'false') === 'true';
  const savedPin = store.get('wmcAdminPin', '');

  els.nameInput.value = store.get('wmcAdminName', savedName === 'WMC Team' ? '' : savedName);
  if (savedAuth && savedPin === ADMIN_PIN) {
    pinBuffer = ADMIN_PIN;
    updatePinDots();
  }
  applyStatus(savedStatus, savedName, savedTime);
  refreshFromAirtable({ silent: true });
}


function updatePinDots() {
  els.pinDots.forEach((dot, index) => {
    dot.classList.toggle('filled', index < pinBuffer.length);
  });
}

function getPin() {
  return pinBuffer;
}

function clearPin() {
  pinBuffer = '';
  updatePinDots();
}

function showToast(message = 'Status updated') {
  els.toast.textContent = message;
  els.toast.classList.add('show');
  setTimeout(() => els.toast.classList.remove('show'), 1800);
}

function openAdmin() {
  els.adminNote.textContent = '';
  els.adminModal.classList.remove('is-closing');
  if (typeof els.adminModal.showModal === 'function') {
    els.adminModal.showModal();
  } else {
    els.adminModal.setAttribute('open', '');
  }
  setTimeout(() => {
    const authed = store.get('wmcAdminApproved', 'false') === 'true';
    if (authed) els.statusSelect.focus();
    else els.pinKeypad?.querySelector('button[data-pin]')?.focus();
  }, 50);
}

function closeAdmin() {
  els.adminNote.textContent = '';
  if (!els.adminModal.open) return;
  els.adminModal.classList.add('is-closing');
  window.setTimeout(() => {
    if (typeof els.adminModal.close === 'function') els.adminModal.close();
    else els.adminModal.removeAttribute('open');
    els.adminModal.classList.remove('is-closing');
  }, 240);
}

async function saveStatus(event) {
  event.preventDefault();

  const pin = getPin();
  if (pin !== ADMIN_PIN) {
    els.adminNote.textContent = 'Incorrect PIN.';
    els.adminNote.style.color = '#ffb3ac';
    store.set('wmcAdminApproved', 'false');
    clearPin();
    return;
  }

  const statusKey = els.statusSelect.value;
  const updatedBy = (els.nameInput.value || 'WMC Team').trim();
  const updatedAt = formatTime();

  store.set('wmcOfficeStatus', statusKey);
  store.set('wmcUpdatedBy', updatedBy);
  store.set('wmcAdminName', updatedBy);
  store.set('wmcUpdatedAt', updatedAt);
  store.set('wmcAdminApproved', 'true');
  store.set('wmcAdminPin', pin);

  els.saveStatusBtn.disabled = true;
  els.saveStatusBtn.textContent = 'Saving...';

  try {
    let finalUpdatedAt = updatedAt;
    if (AIRTABLE_CONNECTED) {
      const fields = await updateAirtableStatus(statusKey, updatedBy);
      finalUpdatedAt = formatAirtableTime(fields['Last Updated']);
    }

    applyStatus(statusKey, updatedBy, finalUpdatedAt);
    store.set('wmcUpdatedAt', finalUpdatedAt);
    closeAdmin();
    showToast(AIRTABLE_CONNECTED ? 'Live status updated' : 'Status updated locally');
  } catch (error) {
    console.error(error);
    els.adminNote.textContent = 'Could not update live status. Check Airtable settings.';
    els.adminNote.style.color = '#ffb3ac';
  } finally {
    els.saveStatusBtn.disabled = false;
    els.saveStatusBtn.textContent = 'Save Status';
  }
}

let tvHintTimer = null;
let tvSwitching = false;

function setTvMode(enabled) {
  if (tvSwitching) return;
  tvSwitching = true;
  els.body.classList.add('tv-switching');

  window.setTimeout(() => {
    els.body.classList.toggle('tv-mode', enabled);
    els.tvModeBtn.textContent = enabled ? 'Exit TV Mode' : 'TV Mode';

    if (tvHintTimer) window.clearTimeout(tvHintTimer);
    els.body.classList.remove('show-tv-hint');

    if (enabled) {
      window.setTimeout(() => els.body.classList.add('show-tv-hint'), 120);
      tvHintTimer = window.setTimeout(() => els.body.classList.remove('show-tv-hint'), 5000);
    }

    window.setTimeout(() => {
      els.body.classList.remove('tv-switching');
      tvSwitching = false;
    }, 620);
  }, 120);
}

function toggleTvMode() {
  setTvMode(!els.body.classList.contains('tv-mode'));
}

els.openAdminBtn.addEventListener('click', openAdmin);
els.closeAdminBtn.addEventListener('click', closeAdmin);
els.adminForm.addEventListener('submit', saveStatus);
els.tvModeBtn.addEventListener('click', toggleTvMode);

els.statusChoices.forEach(button => {
  button.addEventListener('click', () => {
    els.statusSelect.value = button.dataset.statusChoice;
    els.statusChoices.forEach(choice => {
      const active = choice === button;
      choice.classList.toggle('active', active);
      choice.setAttribute('aria-checked', active ? 'true' : 'false');
    });
  });
});

document.addEventListener('dblclick', event => {
  if (els.body.classList.contains('tv-mode')) toggleTvMode();
});

els.adminModal.addEventListener('click', event => {
  const rect = els.adminModal.getBoundingClientRect();
  const clickedOutside = event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
  if (clickedOutside) closeAdmin();
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && els.body.classList.contains('tv-mode')) {
    toggleTvMode();
    return;
  }

  // Allow admins to enter the PIN using the physical keyboard as well as the on-screen keypad.
  if (els.adminModal.open) {
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
      pinBuffer = '';
      updatePinDots();
    }
  }
});

els.pinKeypad?.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;

  const digit = button.dataset.pin;
  const action = button.dataset.action;

  if (digit && pinBuffer.length < 4) {
    pinBuffer += digit;
  }
  if (action === 'backspace') {
    pinBuffer = pinBuffer.slice(0, -1);
  }
  if (action === 'clear') {
    pinBuffer = '';
  }
  updatePinDots();
});

loadInitialState();
setInterval(() => refreshFromAirtable({ silent: true }), 10000);

const ADMIN_PASSWORD = '0016';

const statuses = {
  open: {
    bodyClass: 'status-open',
    label: 'Open Workspace',
    title: 'Anyone can come and use the office.',
    text: 'Please come with purpose: work, planning, meetings, calls, projects, da’wah/admin, study or agreed tasks.',
    toast: 'Office set to Open Workspace'
  },
  knock: {
    bodyClass: 'status-knock',
    label: 'Knock First',
    title: 'Come in, but knock first.',
    text: 'Someone may be working, recording, on a call or using the space privately. Please knock or message before entering.',
    toast: 'Office set to Knock First'
  },
  closed: {
    bodyClass: 'status-closed',
    label: 'Out of Bounds',
    title: 'Do not enter unless invited.',
    text: 'There may be an in-person meeting, private discussion, sensitive work, recording or closed access taking place.',
    toast: 'Office set to Out of Bounds'
  }
};

const els = {
  label: document.getElementById('statusLabel'),
  title: document.getElementById('statusTitle'),
  text: document.getElementById('statusText'),
  lastUpdated: document.getElementById('lastUpdated'),
  updatedBy: document.getElementById('updatedBy'),
  nameInput: document.getElementById('nameInput'),
  statusSelect: document.getElementById('statusSelect'),
  toast: document.getElementById('toast'),
  modal: document.getElementById('adminModal'),
  adminNote: document.getElementById('adminNote'),
  tvModeBtn: document.getElementById('tvModeBtn'),
  pinBoxes: Array.from(document.querySelectorAll('.pin-box')),
  patternStack: document.getElementById('patternStack')
};

function buildRailPattern() {
  if (!els.patternStack) return;
  els.patternStack.innerHTML = '';
  for (let i = 0; i < 18; i++) {
    const mark = document.createElement('div');
    mark.className = 'rail-mark';
    mark.innerHTML = '<span></span><span></span><span></span><span></span><span></span>';
    els.patternStack.appendChild(mark);
  }
}

function formatTime(date = new Date()) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getPinValue() {
  return els.pinBoxes.map(box => box.value).join('');
}

function setPinValue(value = '') {
  const digits = value.split('').slice(0, 4);
  els.pinBoxes.forEach((box, index) => box.value = digits[index] || '');
}

function setStatus(key, updatedBy = 'Criterion Team', updatedAt = formatTime(), silent = false) {
  const status = statuses[key] || statuses.open;
  document.body.classList.remove('status-open', 'status-knock', 'status-closed');
  document.body.classList.add(status.bodyClass);

  els.label.textContent = status.label;
  els.title.textContent = status.title;
  els.text.textContent = status.text;
  els.lastUpdated.textContent = updatedAt;
  els.updatedBy.textContent = updatedBy || 'Criterion Team';
  els.statusSelect.value = key;

  localStorage.setItem('desboxStatus', key);
  localStorage.setItem('desboxUpdatedBy', updatedBy || 'Criterion Team');
  localStorage.setItem('desboxUpdatedAt', updatedAt);

  if (!silent) showToast(status.toast);
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add('show');
  setTimeout(() => els.toast.classList.remove('show'), 2200);
}

function openAdmin() {
  els.adminNote.textContent = '';
  els.adminNote.classList.remove('error');
  els.nameInput.value = localStorage.getItem('desboxAdminName') || '';
  setPinValue(localStorage.getItem('desboxAdminPin') || '');
  els.modal.showModal();
  const firstEmpty = els.pinBoxes.find(box => !box.value);
  setTimeout(() => (firstEmpty || els.nameInput).focus(), 50);
}

function closeAdmin() {
  els.modal.close();
}

document.getElementById('openAdminBtn').addEventListener('click', openAdmin);
document.getElementById('closeAdminBtn').addEventListener('click', closeAdmin);

els.modal.addEventListener('click', (event) => {
  const rect = event.target.getBoundingClientRect();
  if (event.target === els.modal && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) {
    closeAdmin();
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && els.modal.open) closeAdmin();
});

els.pinBoxes.forEach((box, index) => {
  box.addEventListener('input', () => {
    box.value = box.value.replace(/\D/g, '').slice(0, 1);
    if (box.value && index < els.pinBoxes.length - 1) els.pinBoxes[index + 1].focus();
  });

  box.addEventListener('keydown', (event) => {
    if (event.key === 'Backspace' && !box.value && index > 0) els.pinBoxes[index - 1].focus();
  });

  box.addEventListener('paste', (event) => {
    event.preventDefault();
    const pasted = (event.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '').slice(0, 4);
    setPinValue(pasted);
    const next = els.pinBoxes[Math.min(pasted.length, 3)];
    if (next) next.focus();
  });
});

document.getElementById('adminForm').addEventListener('submit', (event) => {
  event.preventDefault();

  const pin = getPinValue();
  if (pin !== ADMIN_PASSWORD) {
    els.adminNote.textContent = 'Incorrect PIN.';
    els.adminNote.classList.add('error');
    setPinValue('');
    els.pinBoxes[0].focus();
    return;
  }

  const name = els.nameInput.value.trim() || 'Criterion Team';
  localStorage.setItem('desboxAdminName', name);
  localStorage.setItem('desboxAdminPin', pin);
  setStatus(els.statusSelect.value, name, formatTime());
  closeAdmin();
});

els.tvModeBtn.addEventListener('click', async () => {
  document.body.classList.toggle('tv-mode');
  els.tvModeBtn.textContent = document.body.classList.contains('tv-mode') ? 'Exit TV Mode' : 'TV Mode';

  if (document.body.classList.contains('tv-mode') && !document.fullscreenElement) {
    try { await document.documentElement.requestFullscreen(); } catch (err) {}
  } else if (!document.body.classList.contains('tv-mode') && document.fullscreenElement) {
    try { await document.exitFullscreen(); } catch (err) {}
  }
});

document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement && document.body.classList.contains('tv-mode')) {
    document.body.classList.remove('tv-mode');
    els.tvModeBtn.textContent = 'TV Mode';
  }
});

buildRailPattern();

const savedStatus = localStorage.getItem('desboxStatus') || 'open';
const savedBy = localStorage.getItem('desboxUpdatedBy') || 'Criterion Team';
const savedAt = localStorage.getItem('desboxUpdatedAt') || formatTime();
setStatus(savedStatus, savedBy, savedAt, true);

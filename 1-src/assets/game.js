import { hasSupabase, supabase } from './supabase.js';
import QRCode from 'qrcode';

const HOST = 'wmc-host-v2';
const PLAYER = 'wmc-player-v2';
const LEVELS = [90, 80, 70, 60, 50, 45, 40, 35, 30, 25, 20, 15, 10, 5, 1];
const joinBase = import.meta.env.DEV && import.meta.env.VITE_LAN_URL
  ? import.meta.env.VITE_LAN_URL
  : location.origin;
const brandLogo = new URL('./wmc-brand-logo.png', import.meta.url).href;
const gameLogo = new URL('./wmc-one-percent-logo.png', import.meta.url).href;

const uuid = () => crypto.randomUUID?.() || ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (character) => (
  character ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> character / 4
).toString(16));

const esc = (value = '') => String(value).replace(/[&<>'"]/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
}[character]));

const load = (key) => {
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
};
const save = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const loadSession = (key) => {
  try { return JSON.parse(sessionStorage.getItem(key)); } catch { return null; }
};
const saveSession = (key, value) => sessionStorage.setItem(key, JSON.stringify(value));

const icons = {
  arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>',
  copy: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></svg>',
  expand: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5"/></svg>',
  eye: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="2.5"/></svg>',
  film: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 5v14M17 5v14M3 9h4M17 9h4M3 15h4M17 15h4"/></svg>',
  link: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1-1"/></svg>',
  lock: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>',
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7z"/></svg>',
  power: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2v10M6.3 5.7a8 8 0 1 0 11.4 0"/></svg>',
  sparkle: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 1.4 5.1L18 10l-4.6 2.9L12 18l-1.4-5.1L6 10l4.6-2.9z"/><path d="m19 16 .7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7z"/></svg>',
  upload: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/></svg>',
  users: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/></svg>',
  wifi: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0"/><circle cx="12" cy="20" r="1"/></svg>',
  x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>'
};

const icon = (name) => `<span class="icon">${icons[name] || ''}</span>`;
const err = (error) => esc(error?.message || error || 'Something went wrong.');
const friendlyJoinError = (error) => {
  const message = String(error?.message || error || '');
  if (/not found|already started/i.test(message)) return 'We could not find an open room with that PIN. Check the four digits and make sure the host is still in the lobby.';
  if (/already in this game/i.test(message)) return 'That name is already being used in this room. Please choose a different name.';
  if (/fetch|network|offline/i.test(message)) return 'The live game could not be reached. Check your connection and try again.';
  return message || 'The room could not be joined. Please try again.';
};

const normalisePin = (raw = '') => {
  const value = String(raw).trim();
  try {
    const url = new URL(value);
    const fromUrl = url.searchParams.get('pin');
    if (fromUrl) return fromUrl.replace(/\D/g, '').slice(0, 4);
  } catch { /* A plain PIN is expected most of the time. */ }
  const exact = value.match(/(?:^|\D)(\d{4})(?:\D|$)/);
  return (exact?.[1] || value.replace(/\D/g, '')).slice(0, 4);
};

async function copyText(value) {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    const field = document.createElement('textarea');
    field.value = value;
    field.setAttribute('readonly', '');
    field.style.position = 'fixed';
    field.style.opacity = '0';
    document.body.append(field);
    field.select();
    const copied = document.execCommand('copy');
    field.remove();
    return copied;
  }
}

const brand = (variant = '') => `
  <a class="brand ${variant}" href="/1/" aria-label="WMC The 1% Club home">
    <img class="brand-logo" src="${brandLogo}" alt="Wycombe Muslim Collective">
    <span class="brand-rule" aria-hidden="true"></span>
    <span class="brand-title"><small>WMC presents</small><strong>The 1% Club</strong></span>
  </a>`;

const connectionPill = (label = 'Live cloud game') => `
  <span class="connection-pill"><i aria-hidden="true"></i>${icon('wifi')}<span>${esc(label)}</span></span>`;

const atmosphere = () => `
  <div class="studio-atmosphere" aria-hidden="true">
    <div class="beam beam-one"></div><div class="beam beam-two"></div>
    <div class="orbit orbit-one"></div><div class="orbit orbit-two"></div>
    <div class="spark-field"></div><div class="stage-floor"></div>
  </div>`;

const levelRail = (activePercentage = null) => `
  <div class="level-rail" aria-label="Question levels">
    ${LEVELS.map((level) => `<span class="${level === Number(activePercentage) ? 'active' : ''} ${activePercentage && level > Number(activePercentage) ? 'complete' : ''}">${level}%</span>`).join('')}
  </div>`;

async function rpc(name, params = {}) {
  const { data, error } = await supabase.rpc(name, params);
  if (error) throw error;
  return data;
}

function watch(gameId, refresh) {
  if (!gameId || !supabase) return () => {};
  const channel = supabase.channel(`game:${gameId}:${uuid()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'games', filter: `id=eq.${gameId}` }, refresh)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `game_id=eq.${gameId}` }, refresh)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'game_rounds', filter: `game_id=eq.${gameId}` }, refresh)
    .subscribe();
  return () => supabase.removeChannel(channel);
}

function hostPage() {
  const app = document.querySelector('#app');
  let creds = load(HOST);
  let snapshot = null;
  let error = '';
  let notice = '';
  let busy = false;
  let stop = () => {};
  let ticker;
  let noticeTimer;

  const flash = (message) => {
    notice = message;
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => { notice = ''; render(); }, 2800);
    render();
  };

  async function refresh() {
    if (!creds || !hasSupabase) return;
    try {
      const next = await rpc('host_game_snapshot', { p_game_id: creds.id, p_host_token: creds.token });
      const changed = JSON.stringify(next) !== JSON.stringify(snapshot);
      snapshot = next;
      if (!snapshot?.game) {
        localStorage.removeItem(HOST);
        creds = null;
        snapshot = null;
      }
      error = '';
      if (changed) render();
    } catch (caught) {
      if (error !== caught.message) {
        error = caught.message;
        render();
      }
    }
  }

  async function create(form) {
    const timerSeconds = Number(new FormData(form).get('timer')) || 30;
    busy = true;
    error = '';
    render();
    try {
      const result = (await rpc('create_game', { p_timer_seconds: timerSeconds }))[0];
      creds = { id: result.game_id, pin: result.game_pin, token: result.host_token };
      save(HOST, creds);
      stop();
      stop = watch(creds.id, refresh);
      await refresh();
    } catch (caught) {
      error = caught.message;
    }
    busy = false;
    render();
  }

  async function act(action) {
    busy = true;
    error = '';
    render();
    try {
      const names = {
        start: 'host_start_game', timer: 'host_start_timer', lock: 'host_lock_answers',
        reveal: 'host_reveal_answer', next: 'host_next_round'
      };
      await rpc(names[action], { p_game_id: creds.id, p_host_token: creds.token });
      await refresh();
    } catch (caught) {
      error = caught.message;
    }
    busy = false;
    render();
  }

  async function leave() {
    const ending = creds;
    busy = true;
    render();
    try {
      if (ending?.id && hasSupabase) await rpc('host_end_game', { p_game_id: ending.id, p_host_token: ending.token });
    } catch (caught) {
      error = caught.message;
    } finally {
      stop();
      localStorage.removeItem(HOST);
      creds = null;
      snapshot = null;
      busy = false;
      render();
    }
  }

  const playerList = (players) => {
    if (!players.length) return `
      <div class="empty-state">
        <span class="empty-orbit"><i></i></span>
        <strong>Waiting for players</strong>
        <small>Names will appear here as people join.</small>
      </div>`;
    return players.map((player, index) => `
      <div class="player-chip ${player.has_locked_answer ? 'submitted' : ''} ${player.is_alive ? '' : 'out'}" style="--delay:${index * 45}ms">
        <span class="player-avatar">${esc(player.name.slice(0, 1).toUpperCase())}</span>
        <span class="player-name">${esc(player.name)}</span>
        <span class="player-state">${player.is_alive ? (player.has_locked_answer ? `${icon('check')} Locked` : 'Ready') : 'Spectating'}</span>
      </div>`).join('');
  };

  const lobbyStage = (game, players) => {
    const joinUrl = `${joinBase}/1/join/?pin=${encodeURIComponent(game.pin)}`;
    return `
      <div class="lobby-stage view-enter">
        <div class="lobby-intro">
          <span class="broadcast-kicker"><i></i> Room is open</span>
          <h1>Bring everyone<br><em>into the game.</em></h1>
          <p>Scan the QR code, open the player link, or enter the four-digit PIN. The game will wait here until you start it.</p>
        </div>
        <div class="join-command-centre">
          <button class="pin-command" type="button" data-copy-pin="${game.pin}" aria-label="Copy game PIN ${game.pin}">
            <span>Game PIN</span>
            <strong>${game.pin}</strong>
            <small>${icon('copy')} Click to copy PIN</small>
          </button>
          <div class="qr-command">
            <div class="qr-halo"><canvas data-qr data-qr-url="${esc(joinUrl)}" aria-label="QR code for the player join page"></canvas></div>
            <div><strong>Scan to join</strong><small>Camera opens the player screen</small></div>
          </div>
          <button class="link-command" type="button" data-copy-link="${esc(joinUrl)}">
            ${icon('link')}<span><strong>Copy player link</strong><small>${esc(joinUrl)}</small></span><span class="copy-label">Copy</span>
          </button>
          <a class="text-link" href="${esc(joinUrl)}" target="_blank" rel="noopener">Open a player join screen ${icon('arrow')}</a>
        </div>
        <div class="control-dock lobby-controls">
          <button class="btn ghost" type="button" data-how>${icon('film')} How it works</button>
          <button class="btn primary wide" data-action="start" ${players.length && !busy ? '' : 'disabled'}>Show first question ${icon('arrow')}</button>
          <button class="btn danger icon-only" type="button" data-leave aria-label="End session">${icon('power')}</button>
        </div>
      </div>`;
  };

  const questionStage = (game, question, players) => {
    const alive = players.filter((player) => player.is_alive);
    const submitted = alive.filter((player) => player.has_locked_answer).length;
    const timerRunning = game.phase === 'question' && Boolean(game.ends_at);
    const seconds = timerRunning ? Math.max(0, Math.ceil((new Date(game.ends_at) - Date.now()) / 1000)) : game.timer_seconds;
    const displayImage = game.phase === 'revealed'
      ? (question?.answer_image_path || question?.question_image_path)
      : question?.question_image_path;
    const phaseName = game.phase === 'revealed' ? 'Answer reveal' : game.phase === 'locked' ? 'Answers locked' : timerRunning ? 'Timer live' : 'Question ready';
    const primaryAction = game.phase === 'question' && !timerRunning
      ? `<button class="btn primary wide" data-action="timer">${icon('play')} Start ${game.timer_seconds}-second timer</button>`
      : game.phase === 'locked'
        ? `<button class="btn primary wide" data-action="reveal">${icon('sparkle')} Reveal answer</button>`
        : game.phase === 'revealed'
          ? `<button class="btn primary wide" data-action="next">Next question ${icon('arrow')}</button>`
          : '';
    return `
      <div class="question-stage view-enter ${game.phase === 'revealed' ? 'is-reveal' : ''}">
        <div class="question-meta">
          <div class="round-ident">
            <span class="percentage-medallion">${question?.percentage || '–'}<small>%</small></span>
            <div><span class="broadcast-kicker"><i></i>${phaseName}</span><h1>The ${question?.percentage || '–'}% question</h1></div>
          </div>
          <div class="locked-stat">${icon('users')}<strong>${submitted}/${alive.length}</strong><span>locked in</span></div>
          <div class="timer-ring ${seconds <= 5 && timerRunning ? 'low' : ''} ${timerRunning ? 'running' : ''}" data-timer style="--timer-progress:${timerRunning ? (seconds / game.timer_seconds) * 360 : 360}deg">
            <span>${timerRunning ? seconds : game.phase === 'question' ? 'Ready' : icon('lock')}</span>
            <small>${timerRunning ? 'seconds' : game.phase === 'revealed' ? 'revealed' : ''}</small>
          </div>
        </div>
        <div class="question-frame ${game.phase === 'revealed' ? 'answer-frame' : ''}">
          <div class="frame-glow"></div>
          ${displayImage ? `<img src="${esc(displayImage)}" alt="${game.phase === 'revealed' ? 'Answer' : 'Question'} slide">` : `<div class="question-copy">${esc(question?.question_text || 'Question image')}</div>`}
          ${game.phase === 'revealed' ? '<span class="reveal-ribbon">Answer</span>' : ''}
        </div>
        ${game.phase === 'revealed' && !question?.answer_image_path ? `<div class="answer-reveal"><span>Correct answer</span><strong>${esc(question?.answer_text)}</strong></div>` : ''}
        <div class="control-dock question-controls">
          <div class="phase-caption"><span>Round ${Number(game.current_round) + 1} of ${LEVELS.length}</span><small>${timerRunning ? 'Submissions are open' : game.phase === 'question' ? 'Players can see answer controls after the timer starts' : 'Host controls the pace'}</small></div>
          <div class="dock-actions">
            ${primaryAction}
            ${game.phase === 'question' ? `<button class="btn ghost" data-action="lock">${icon('lock')} Lock answers</button>` : ''}
            <button class="btn danger icon-only" type="button" data-leave aria-label="End session">${icon('power')}</button>
          </div>
        </div>
      </div>`;
  };

  function render() {
    clearInterval(ticker);
    const game = snapshot?.game;
    const question = snapshot?.question;
    const players = snapshot?.players || [];
    const alive = players.filter((player) => player.is_alive);
    document.body.dataset.state = game?.phase || (creds ? 'connecting' : 'home');

    let stage;
    if (!creds) {
      stage = `
        <div class="launch-stage view-enter">
          <section class="launch-art">
            <div class="poster-halo"></div>
            <img src="${gameLogo}" alt="WMC The 1% Club">
            <div class="launch-art-copy"><span>A live gameshow experience</span><strong>One question. One percent.<br>One community.</strong></div>
          </section>
          <section class="launch-console">
            <span class="broadcast-kicker"><i></i> Host control</span>
            <h1>Your stage is ready.</h1>
            <p>Create a live room, invite players by QR or PIN, and control every question, timer and reveal from here.</p>
            ${!hasSupabase ? '<div class="notice bad">The live database is not configured on this build.</div>' : ''}
            <form class="launch-form" id="create-game">
              <label class="timer-control"><span>Question timer</span><div><input name="timer" type="number" min="5" max="300" value="30" required><small>seconds</small></div></label>
              <button class="btn primary launch-button" ${busy || !hasSupabase ? 'disabled' : ''}>${busy ? '<span class="button-spinner"></span> Creating room…' : `Launch live game ${icon('arrow')}`}</button>
            </form>
            <div class="launch-features"><span>${icon('users')} No player accounts</span><span>${icon('wifi')} Realtime reconnect</span><span>${icon('lock')} Host controlled</span></div>
          </section>
        </div>`;
    } else if (!snapshot) {
      stage = `<div class="connecting-stage view-enter"><span class="signal-loader"><i></i><i></i><i></i></span><p class="broadcast-kicker">Reconnecting securely</p><h1>Opening room ${esc(creds.pin)}…</h1><p>Your host controls are being restored.</p></div>`;
    } else if (game.phase === 'lobby') {
      stage = lobbyStage(game, players);
    } else if (game.phase === 'finished') {
      stage = `
        <div class="finale-stage view-enter">
          <div class="finale-burst" aria-hidden="true"></div>${icon('sparkle')}
          <span class="broadcast-kicker"><i></i> Game complete</span>
          <h1>${alive.length ? 'Still standing' : 'That was The 1% Club'}</h1>
          <p class="finalists">${alive.length ? alive.map((player) => esc(player.name)).join(' · ') : 'Thanks for playing'}</p>
          <p>One question. One percent. One community.</p>
          <button class="btn primary" data-leave>Start another game ${icon('arrow')}</button>
        </div>`;
    } else {
      stage = questionStage(game, question, players);
    }

    const currentPercentage = question?.percentage || null;
    app.innerHTML = `
      ${atmosphere()}
      <div class="host-shell">
        <header class="host-topbar">
          ${brand('host-brand')}
          ${levelRail(currentPercentage)}
          <div class="header-actions">${connectionPill()}<button class="round-icon-button" type="button" data-fullscreen aria-label="Enter fullscreen">${icon('expand')}</button></div>
        </header>
        ${error ? `<div class="notice bad global-notice">${err(error)}</div>` : ''}
        ${notice ? `<div class="toast" role="status">${icon('check')} ${esc(notice)}</div>` : ''}
        <main class="host-grid ${!creds ? 'home-grid' : ''}">
          <section class="studio-panel stage-panel">${stage}</section>
          ${creds ? `<aside class="studio-panel players-panel">
            <div class="players-head"><div><span class="section-label">Live room</span><h2>Players</h2></div><span class="player-count">${players.length}</span></div>
            ${game ? `<button class="sidebar-pin" type="button" data-copy-pin="${game.pin}"><span>PIN</span><strong>${game.pin}</strong>${icon('copy')}</button>` : ''}
            <div class="player-list">${playerList(players)}</div>
            <div class="players-foot"><span><i class="online-dot"></i>${alive.length} still playing</span><small>${players.length - alive.length ? `${players.length - alive.length} spectating` : 'Nobody eliminated'}</small></div>
          </aside>` : ''}
        </main>
      </div>`;

    app.querySelector('#create-game')?.addEventListener('submit', (event) => { event.preventDefault(); create(event.currentTarget); });
    app.querySelector('[data-fullscreen]')?.addEventListener('click', () => document.documentElement.requestFullscreen?.());
    app.querySelector('[data-leave]')?.addEventListener('click', leave);
    app.querySelectorAll('[data-action]').forEach((button) => button.addEventListener('click', () => act(button.dataset.action)));
    app.querySelector('[data-how]')?.addEventListener('click', () => document.querySelector('#how-dialog')?.showModal());
    app.querySelectorAll('[data-copy-pin]').forEach((button) => button.addEventListener('click', async () => {
      const copied = await copyText(button.dataset.copyPin);
      flash(copied ? `PIN ${button.dataset.copyPin} copied` : `PIN: ${button.dataset.copyPin}`);
    }));
    app.querySelector('[data-copy-link]')?.addEventListener('click', async (event) => {
      const copied = await copyText(event.currentTarget.dataset.copyLink);
      flash(copied ? 'Player join link copied' : 'Select the player link and copy it manually');
    });

    const qr = app.querySelector('[data-qr]');
    if (qr) QRCode.toCanvas(qr, qr.dataset.qrUrl, {
      width: 220, margin: 1, color: { dark: '#071719', light: '#fffaf0' }
    }).catch(() => qr.closest('.qr-command')?.remove());

    if (game?.phase === 'question' && game.ends_at) {
      const tick = () => {
        const timer = app.querySelector('[data-timer]');
        if (!timer) return;
        const left = Math.max(0, Math.ceil((new Date(game.ends_at) - Date.now()) / 1000));
        timer.style.setProperty('--timer-progress', `${(left / game.timer_seconds) * 360}deg`);
        timer.classList.toggle('low', left <= 5);
        const value = timer.querySelector('span');
        if (value) value.textContent = left;
      };
      tick();
      ticker = setInterval(tick, 250);
    }
  }

  if (creds) {
    stop = watch(creds.id, refresh);
    refresh();
  } else render();
  setInterval(() => { if (creds) refresh(); }, 1500);
}

function playerPage() {
  const app = document.querySelector('#app');
  let creds = loadSession(PLAYER);
  let snapshot = null;
  let error = '';
  let busy = false;
  let selected = '';
  let stop = () => {};
  let ticker;
  const suppliedPin = normalisePin(new URLSearchParams(location.search).get('pin') || '');
  let joinDraft = { pin: suppliedPin, name: '' };

  async function refresh() {
    if (!creds || !hasSupabase) return;
    try {
      const next = await rpc('player_snapshot', { p_player_id: creds.id, p_player_token: creds.token });
      const changed = JSON.stringify(next) !== JSON.stringify(snapshot);
      if (next?.round?.id !== snapshot?.round?.id) selected = '';
      snapshot = next;
      if (!snapshot?.player) {
        sessionStorage.removeItem(PLAYER);
        creds = null;
        snapshot = null;
      }
      error = '';
      if (changed) render();
    } catch (caught) {
      if (error !== caught.message) {
        error = caught.message;
        render();
      }
    }
  }

  async function join(form) {
    const data = new FormData(form);
    joinDraft = { pin: normalisePin(data.get('pin')), name: String(data.get('name') || '').trim() };
    if (joinDraft.pin.length !== 4) {
      error = 'Enter the four-digit PIN shown on the host screen, or paste the full player link.';
      render();
      return;
    }
    busy = true;
    error = '';
    render();
    try {
      const result = (await rpc('join_game', { p_pin: joinDraft.pin, p_name: joinDraft.name }))[0];
      creds = { id: result.player_id, token: result.player_token, gameId: result.game_id };
      saveSession(PLAYER, creds);
      stop();
      stop = watch(creds.gameId, refresh);
      await refresh();
    } catch (caught) {
      error = friendlyJoinError(caught);
    }
    busy = false;
    render();
  }

  async function submit(answer, usePass = false) {
    busy = true;
    error = '';
    render();
    try {
      await rpc('submit_answer', {
        p_player_id: creds.id, p_player_token: creds.token, p_round_id: snapshot.round.id,
        p_answer: usePass ? null : answer, p_use_pass: usePass
      });
      await refresh();
    } catch (caught) {
      error = caught.message;
    }
    busy = false;
    render();
  }

  function leave() {
    stop();
    sessionStorage.removeItem(PLAYER);
    creds = null;
    snapshot = null;
    selected = '';
    error = '';
    busy = false;
    render();
  }

  const mobileHeader = (game, player) => `
    <header class="player-topbar">
      ${brand('player-brand')}
      ${game ? `<span class="room-badge"><small>Room</small><strong>${esc(game.pin)}</strong></span>` : connectionPill('Secure join')}
      ${player ? `<button class="round-icon-button" data-player-leave aria-label="Leave game">${icon('power')}</button>` : ''}
    </header>`;

  function render() {
    clearInterval(ticker);
    const player = snapshot?.player;
    const game = snapshot?.game;
    const question = snapshot?.question;
    const submission = snapshot?.submission;
    document.body.dataset.state = player && !player.is_alive ? 'spectator' : game?.phase || (creds ? 'connecting' : 'join');
    let body;

    if (!creds) {
      body = `
        <div class="join-layout view-enter">
          <section class="join-showcase">
            <img src="${gameLogo}" alt="WMC The 1% Club">
            <div><span class="broadcast-kicker"><i></i> Live gameshow</span><h1>Think differently.<br><em>Stay in the game.</em></h1><p>Your question appears on the host screen. Your answer belongs here.</p></div>
          </section>
          <section class="join-card">
            <div class="join-step"><span>01</span><small>Enter room</small></div>
            <h1>Join the game</h1>
            <p>Use the four-digit PIN on the main screen. You can also paste the full player link.</p>
            ${error ? `<div class="notice bad">${err(error)}</div>` : ''}
            <form class="stack join-form" id="join-form">
              <label class="field-label pin-label">Game PIN or link<input class="field pin-field" name="pin" inputmode="text" autocomplete="one-time-code" value="${esc(joinDraft.pin)}" placeholder="0000" required></label>
              <label class="field-label">Your display name<input class="field" name="name" maxlength="24" autocomplete="name" value="${esc(joinDraft.name)}" placeholder="How should we show your name?" required autofocus></label>
              <button class="btn primary full join-button" ${busy || !hasSupabase ? 'disabled' : ''}>${busy ? '<span class="button-spinner"></span> Joining room…' : `Join live game ${icon('arrow')}`}</button>
            </form>
            <div class="join-assurance"><span>${icon('check')} No account needed</span><span>${icon('lock')} One final answer</span></div>
          </section>
        </div>`;
    } else if (!snapshot) {
      body = `<div class="player-state-card view-enter"><span class="signal-loader"><i></i><i></i><i></i></span><span class="broadcast-kicker">Connecting live</span><h1>Opening your game…</h1><p>Restoring your place in the room.</p></div>`;
    } else if (!player.is_alive) {
      body = `
        <div class="player-state-card spectator-card view-enter">
          <div class="state-emblem out-emblem">${icon('x')}</div>
          <span class="broadcast-kicker"><i></i> Spectator mode</span>
          <h1>Still part of the show.</h1>
          <p>Thanks for playing, ${esc(player.name)}. You have been eliminated, but you remain connected for every reveal.</p>
          <div class="spectator-live"><i></i><span>Live connection active</span><strong>${question?.percentage || '–'}% round</strong></div>
        </div>`;
    } else if (game.phase === 'lobby') {
      body = `
        <div class="player-state-card welcome-card view-enter">
          <div class="waiting-orbit"><span>${esc(player.name.slice(0, 1).toUpperCase())}</span><i></i><i></i></div>
          <span class="broadcast-kicker"><i></i> You are in</span>
          <h1>Welcome, ${esc(player.name)}.</h1>
          <p>Your name is now on the host screen. Keep this page open and wait for the first question.</p>
          <div class="lobby-confirmation">${icon('check')} Connected to room ${esc(game.pin)}</div>
        </div>`;
    } else if (game.phase === 'question' && !game.ends_at && !player.has_locked_answer) {
      body = `
        <div class="player-state-card ready-card view-enter">
          <span class="percentage-orb">${question.percentage}<small>%</small></span>
          <span class="broadcast-kicker"><i></i> Question on the main screen</span>
          <h1>Read it first.</h1>
          <p>Your answer controls will open when the host starts the timer.</p>
          <div class="waiting-bar"><i></i><span>Waiting for host</span></div>
        </div>`;
    } else if (game.phase === 'question' && !player.has_locked_answer) {
      const seconds = Math.max(0, Math.ceil((new Date(game.ends_at) - Date.now()) / 1000));
      body = `
        <div class="answer-card view-enter">
          <div class="answer-heading"><div><span class="broadcast-kicker"><i></i> ${question.percentage}% question</span><h1>Lock in your answer</h1></div><span class="mini-timer ${seconds <= 5 ? 'low' : ''}" data-player-timer>${seconds}</span></div>
          ${error ? `<div class="notice bad">${err(error)}</div>` : ''}
          <p class="answer-rule">Submission is final. There is no spelling tolerance beyond the accepted answers set by the host.</p>
          <form class="stack" id="answer-form">
            ${question.answer_kind === 'choice' ? `
              <div class="choice-grid">${(question.choices || []).map((choice, index) => {
                const value = choice.match(/^([A-D])\b/)?.[1] || String.fromCharCode(65 + index);
                const label = choice.replace(/^([A-D])\s*[—:-]\s*/, '');
                const displayLabel = label === value ? `Option ${value}` : (label || choice);
                return `<button type="button" class="choice ${selected === value ? 'selected' : ''}" data-choice="${esc(value)}"><span>${esc(value)}</span><strong>${esc(displayLabel)}</strong>${selected === value ? icon('check') : ''}</button>`;
              }).join('')}</div><input type="hidden" name="answer" value="${esc(selected)}" required>`
              : '<label class="field-label answer-input-label">Your answer<input class="field answer-input" name="answer" autocomplete="off" spellcheck="false" placeholder="Type exactly what you mean" required></label>'}
            <button class="btn primary full answer-submit" ${busy ? 'disabled' : ''}>${busy ? '<span class="button-spinner"></span> Locking in…' : `Submit final answer ${icon('arrow')}`}</button>
            <button class="btn pass-button full" type="button" data-pass ${player.pass_available && question.percentage !== 1 && !busy ? '' : 'disabled'}><span class="pass-token">P</span><span><strong>${player.pass_available ? 'Use my pass' : 'Pass already used'}</strong><small>${question.percentage === 1 ? 'Passes are not available at 1%' : 'Stay in without answering this round'}</small></span></button>
          </form>
        </div>`;
      ticker = setInterval(() => {
        const timer = app.querySelector('[data-player-timer]');
        if (!timer) return;
        const left = Math.max(0, Math.ceil((new Date(game.ends_at) - Date.now()) / 1000));
        timer.textContent = left;
        timer.classList.toggle('low', left <= 5);
      }, 250);
    } else if (game.phase === 'question') {
      body = `
        <div class="player-state-card locked-card view-enter">
          <div class="state-emblem success-emblem">${icon('check')}</div>
          <span class="broadcast-kicker"><i></i> Answer secured</span>
          <h1>${submission?.used_pass ? 'Pass used.' : 'You are locked in.'}</h1>
          <p>Your submission is final. Watch the host screen for the reveal.</p>
          <div class="lock-seal">${icon('lock')} Encrypted live submission</div>
        </div>`;
    } else if (game.phase === 'locked') {
      body = `<div class="player-state-card locked-card view-enter"><div class="state-emblem lock-emblem">${icon('lock')}</div><span class="broadcast-kicker"><i></i> Answers closed</span><h1>Eyes on the host.</h1><p>The answer is about to be revealed.</p></div>`;
    } else if (game.phase === 'revealed') {
      const correct = submission?.used_pass || submission?.is_correct;
      body = `
        <div class="player-state-card reveal-result ${correct ? 'correct' : 'incorrect'} view-enter">
          <div class="result-rays" aria-hidden="true"></div>
          <div class="state-emblem">${correct ? icon('check') : icon('x')}</div>
          <span class="broadcast-kicker"><i></i>${submission?.used_pass ? 'Pass successful' : correct ? 'Correct answer' : 'Incorrect answer'}</span>
          <h1>${correct ? 'Still in the game!' : 'You are out.'}</h1>
          <p>Correct answer: <strong>${esc(question.answer_text)}</strong></p>
          <div class="result-status">${correct ? `${icon('sparkle')} Get ready for the next question` : 'You will stay connected in spectator mode'}</div>
        </div>`;
    } else {
      body = `<div class="player-state-card finale-mobile view-enter">${icon('sparkle')}<span class="broadcast-kicker"><i></i> Game complete</span><h1>That was The 1% Club.</h1><p>Thanks for playing, ${esc(player.name)}.</p></div>`;
    }

    app.innerHTML = `
      ${atmosphere()}
      <div class="player-shell">
        ${mobileHeader(game, player)}
        ${game && question ? levelRail(question.percentage) : ''}
        <main class="player-main">${body}</main>
        <footer class="player-footer"><span>WMC · Wycombe Muslim Collective</span><span>${creds ? '<i class="online-dot"></i> Live' : 'One question. One percent. One community.'}</span></footer>
      </div>`;

    app.querySelector('[data-player-leave]')?.addEventListener('click', leave);
    app.querySelector('#join-form')?.addEventListener('submit', (event) => { event.preventDefault(); join(event.currentTarget); });
    app.querySelector('[name="pin"]')?.addEventListener('input', (event) => {
      const parsed = normalisePin(event.target.value);
      if (parsed.length === 4 && event.target.value.length > 4) event.target.value = parsed;
    });
    app.querySelectorAll('[data-choice]').forEach((button) => button.addEventListener('click', () => {
      selected = button.dataset.choice;
      render();
    }));
    app.querySelector('#answer-form')?.addEventListener('submit', (event) => {
      event.preventDefault();
      const answer = String(new FormData(event.currentTarget).get('answer') || '').trim();
      if (answer) submit(answer);
    });
    app.querySelector('[data-pass]')?.addEventListener('click', () => submit(null, true));
  }

  if (creds) {
    stop = watch(creds.gameId, refresh);
    refresh();
  } else render();
  setInterval(() => { if (creds) refresh(); }, 1500);
}

function adminPage() {
  const app = document.querySelector('#app');
  let session = null;
  let isAdmin = false;
  let questions = [];
  let error = '';
  let notice = '';
  let busy = false;
  let search = '';
  let levelFilter = 'all';

  async function initialise() {
    if (!hasSupabase) return render();
    const result = await supabase.auth.getSession();
    session = result.data.session;
    if (session) await loadAdmin();
    render();
  }

  async function loadAdmin() {
    isAdmin = Boolean(await rpc('is_current_admin'));
    if (isAdmin) {
      const result = await supabase.from('questions').select('*').order('percentage', { ascending: false }).order('created_at', { ascending: false });
      if (result.error) error = result.error.message;
      else questions = result.data || [];
    }
  }

  async function signIn(form) {
    const data = new FormData(form);
    const username = String(data.get('username')).trim().toLowerCase();
    const email = username.includes('@') ? username : `${username}@wmc.local`;
    const password = String(data.get('password'));
    busy = true;
    error = '';
    render();
    try {
      const result = await supabase.auth.signInWithPassword({ email, password });
      if (result.error) throw result.error;
      session = result.data.session;
      if (session) {
        const claimed = await rpc('claim_first_admin');
        await loadAdmin();
        if (!claimed && !isAdmin) throw new Error('This account has not been assigned administrator access.');
        notice = 'Signed in securely.';
      }
    } catch (caught) {
      error = caught.message;
    }
    busy = false;
    render();
  }

  async function signOut() {
    await supabase.auth.signOut();
    session = null;
    isAdmin = false;
    questions = [];
    render();
  }

  async function upload(file, kind) {
    if (!file?.size) return null;
    const extension = (file.name.split('.').pop() || 'png').toLowerCase();
    const path = `${session.user.id}/${uuid()}-${kind}.${extension}`;
    const result = await supabase.storage.from('question-media').upload(path, file, { contentType: file.type, upsert: false });
    if (result.error) throw result.error;
    return supabase.storage.from('question-media').getPublicUrl(path).data.publicUrl;
  }

  async function saveQuestion(form) {
    const data = new FormData(form);
    busy = true;
    error = '';
    notice = 'Uploading and validating media…';
    render();
    try {
      const kind = String(data.get('kind'));
      const questionImage = await upload(data.get('question_image'), 'question');
      const answerImage = await upload(data.get('answer_image'), 'answer');
      const accepted = String(data.get('accepted')).split(',').map((value) => value.trim()).filter(Boolean);
      const choices = kind === 'choice' ? ['A', 'B', 'C', 'D'].map((letter) => String(data.get(`choice_${letter}`) || '').trim()).filter(Boolean).map((value, index) => `${String.fromCharCode(65 + index)} — ${value}`) : [];
      const payload = {
        percentage: Number(data.get('percentage')),
        question_text: String(data.get('question_text')).trim() || null,
        question_image_path: questionImage,
        answer_text: String(data.get('answer_text')).trim(),
        answer_image_path: answerImage,
        answer_kind: kind,
        choices,
        accepted_answers: accepted,
        enabled: true,
        created_by: session.user.id
      };
      const result = await supabase.from('questions').insert(payload);
      if (result.error) throw result.error;
      notice = 'Question saved to the live bank.';
      await loadAdmin();
    } catch (caught) {
      error = caught.message;
      notice = '';
    }
    busy = false;
    render();
  }

  async function importBundledBank() {
    busy = true;
    error = '';
    notice = 'Checking all reviewed PNG pairs…';
    render();
    try {
      const response = await fetch('/1/question-bank/manifest.json', { cache: 'no-store' });
      if (!response.ok) throw new Error('The bundled question manifest could not be loaded.');
      const manifest = await response.json();
      const existing = new Set(questions.map((question) => question.question_image_path));
      const rows = manifest.questions.filter((question) => question.enabled && question.metadataStatus === 'reviewed' && !existing.has(question.questionImage)).map((question) => ({
        percentage: question.percentage,
        question_text: null,
        question_image_path: question.questionImage,
        answer_text: question.answerText,
        answer_image_path: question.answerImage,
        answer_kind: question.answerKind,
        choices: question.choices,
        accepted_answers: question.acceptedAnswers,
        enabled: true,
        created_by: session.user.id
      }));
      for (let index = 0; index < rows.length; index += 20) {
        const result = await supabase.from('questions').insert(rows.slice(index, index + 20));
        if (result.error) throw result.error;
      }
      notice = rows.length ? `${rows.length} reviewed questions imported.` : 'The 57-question bundled bank is already fully up to date.';
      await loadAdmin();
    } catch (caught) {
      error = caught.message;
      notice = '';
    }
    busy = false;
    render();
  }

  async function toggle(id, enabled) {
    const result = await supabase.from('questions').update({ enabled: !enabled }).eq('id', id);
    if (result.error) error = result.error.message;
    else {
      notice = !enabled ? 'Question enabled.' : 'Question disabled.';
      await loadAdmin();
    }
    render();
  }

  function render() {
    document.body.dataset.state = session ? 'admin' : 'admin-login';
    if (!session) {
      app.innerHTML = `
        ${atmosphere()}
        <div class="admin-login-shell">
          ${brand('admin-login-brand')}
          <main class="admin-login-layout view-enter">
            <section class="admin-login-showcase">
              <span class="admin-shield">${icon('lock')}</span>
              <span class="broadcast-kicker"><i></i> Private control room</span>
              <h1>Build the<br><em>question bank.</em></h1>
              <p>Upload question and answer slides, define exact accepted answers, and keep every live game ready.</p>
              <div class="admin-login-features"><span>57 reviewed pairs</span><span>15 difficulty levels</span><span>Secure cloud storage</span></div>
            </section>
            <section class="admin-login-card">
              <span class="join-step"><span>A</span><small>Administrator</small></span>
              <h1>Sign in</h1><p>Use the WMC administrator account. Access is protected by Supabase Auth and never stored in the public website.</p>
              ${error ? `<div class="notice bad">${err(error)}</div>` : ''}${notice ? `<div class="notice good">${esc(notice)}</div>` : ''}
              <form class="stack" id="login-form">
                <input name="username" type="hidden" value="admin">
                <div class="admin-account"><span>${icon('lock')}</span><span><small>Signed in as</small><strong>WMC Administrator</strong></span><em>admin</em></div>
                <label class="field-label">Password<span class="password-field"><input class="field" name="password" type="password" minlength="6" autocomplete="current-password" placeholder="Your admin password" required><button type="button" data-toggle-password aria-label="Show password">${icon('eye')}</button></span></label>
                <button class="btn primary full" ${busy ? 'disabled' : ''}>${busy ? '<span class="button-spinner"></span> Signing in…' : `Enter control room ${icon('arrow')}`}</button>
              </form>
              <small class="security-note">${icon('lock')} Your password is sent only to the secure authentication service.</small>
            </section>
          </main>
        </div>`;
      const form = app.querySelector('#login-form');
      form.addEventListener('submit', (event) => { event.preventDefault(); signIn(form); });
      app.querySelector('[data-toggle-password]').addEventListener('click', (event) => {
        const password = form.querySelector('[name="password"]');
        const showing = password.type === 'text';
        password.type = showing ? 'password' : 'text';
        event.currentTarget.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
      });
      return;
    }

    if (!isAdmin) {
      app.innerHTML = `${atmosphere()}<div class="admin-login-shell">${brand('admin-login-brand')}<main class="admin-login-layout"><section class="admin-login-card"><span class="broadcast-kicker">Access pending</span><h1>Not an administrator</h1><p>This signed-in account has not been approved for question management.</p><button class="btn full" data-signout>Sign out</button></section></main></div>`;
      app.querySelector('[data-signout]').addEventListener('click', signOut);
      return;
    }

    const enabled = questions.filter((question) => question.enabled).length;
    const paired = questions.filter((question) => question.question_image_path && question.answer_image_path).length;
    const visibleQuestions = questions.filter((question) => {
      const matchesLevel = levelFilter === 'all' || String(question.percentage) === levelFilter;
      const haystack = `${question.question_text || ''} ${question.answer_text || ''} ${question.percentage}`.toLowerCase();
      return matchesLevel && haystack.includes(search.toLowerCase());
    });
    const rows = visibleQuestions.map((question) => `
      <article class="question-admin-row ${question.enabled ? '' : 'disabled-question'}">
        <div class="question-thumb">${question.question_image_path ? `<img src="${esc(question.question_image_path)}" alt="">` : '<span>Text</span>'}</div>
        <span class="level-badge">${question.percentage}<small>%</small></span>
        <div class="question-admin-main"><strong>${esc(question.question_text || `${question.percentage}% image question`)}</strong><p>${esc(question.answer_kind)} answer · <span>${esc(question.answer_text)}</span></p></div>
        <span class="content-status ${question.enabled ? 'enabled' : ''}"><i></i>${question.enabled ? 'Live' : 'Off'}</span>
        <div class="question-admin-actions">${question.question_image_path ? `<a class="round-icon-button" href="${esc(question.question_image_path)}" target="_blank" aria-label="Preview question">${icon('expand')}</a>` : ''}<button class="btn compact" data-toggle="${question.id}" data-enabled="${question.enabled}">${question.enabled ? 'Disable' : 'Enable'}</button></div>
      </article>`).join('');

    app.innerHTML = `
      ${atmosphere()}
      <div class="admin-shell">
        <aside class="admin-sidebar">
          ${brand('admin-brand')}
          <nav><span class="active">${icon('sparkle')} Question bank</span><a href="/1/">${icon('play')} Host screen</a><a href="/1/join/">${icon('users')} Player join</a></nav>
          <div class="admin-sidebar-foot">${connectionPill('Cloud synced')}<button class="btn ghost full" data-signout>${icon('power')} Sign out</button></div>
        </aside>
        <main class="admin-main view-enter">
          <header class="admin-header"><div><span class="broadcast-kicker"><i></i> Content control</span><h1>Question bank</h1><p>Manage every level of the live WMC gameshow.</p></div><button class="btn primary" type="button" data-open-upload>${icon('upload')} Add question</button></header>
          ${error ? `<div class="notice bad">${err(error)}</div>` : ''}${notice ? `<div class="notice good">${esc(notice)}</div>` : ''}
          <section class="admin-metrics">
            <article><span>Questions</span><strong>${questions.length}</strong><small>across ${LEVELS.length} levels</small></article>
            <article><span>Live now</span><strong>${enabled}</strong><small>${questions.length - enabled} disabled</small></article>
            <article><span>Complete pairs</span><strong>${paired}</strong><small>question + answer art</small></article>
            <article class="bank-health"><span>Bank health</span><strong>${questions.length >= 57 ? 'Ready' : 'Check'}</strong><small>${questions.length >= 57 ? 'All reviewed content present' : 'Content is missing'}</small></article>
          </section>
          <section class="import-banner"><div>${icon('sparkle')}<span><strong>Reviewed WMC PNG collection</strong><small>Reconcile the bundled 57-pair bank without creating duplicates.</small></span></div><button class="btn ghost" data-import-bank ${busy ? 'disabled' : ''}>${busy ? 'Checking…' : 'Check & import bank'}</button></section>
          <section class="bank-toolbar"><label class="search-box"><span>Search</span><input class="field" data-search value="${esc(search)}" placeholder="Question, answer or level"></label><label><span>Difficulty</span><select class="field" data-level-filter><option value="all">All levels</option>${LEVELS.map((level) => `<option value="${level}" ${levelFilter === String(level) ? 'selected' : ''}>${level}%</option>`).join('')}</select></label><span class="result-count">${visibleQuestions.length} shown</span></section>
          <section class="question-admin-list">${rows || '<div class="empty-state"><strong>No matching questions</strong><small>Adjust the search or difficulty filter.</small></div>'}</section>
        </main>
        <dialog class="upload-dialog" id="upload-dialog">
          <form method="dialog" class="dialog-title"><div><span class="broadcast-kicker">Content studio</span><h2>Add a question</h2></div><button class="round-icon-button" value="cancel" aria-label="Close">${icon('x')}</button></form>
          <form id="question-form" class="question-form-grid">
            <label class="field-label">Difficulty<select class="field" name="percentage">${LEVELS.map((level) => `<option value="${level}">${level}%</option>`).join('')}</select></label>
            <label class="field-label span-two">Question text <small>Optional when the PNG contains the full question</small><textarea class="field" name="question_text" rows="3"></textarea></label>
            <label class="file-drop">${icon('upload')}<span><strong>Question PNG</strong><small>PNG, JPG or WebP</small></span><input name="question_image" type="file" accept="image/png,image/jpeg,image/webp"></label>
            <label class="file-drop">${icon('upload')}<span><strong>Answer PNG</strong><small>Optional reveal slide</small></span><input name="answer_image" type="file" accept="image/png,image/jpeg,image/webp"></label>
            <label class="field-label">Answer type<select class="field" name="kind" id="answer-kind"><option value="text">Typed answer</option><option value="choice">Multiple choice</option></select></label>
            <label class="field-label">Correct answer<input class="field" name="answer_text" required placeholder="e.g. Tuesday or B"></label>
            <div id="choices" class="choice-fields span-two hidden">${['A', 'B', 'C', 'D'].map((letter) => `<label class="field-label">Choice ${letter}<input class="field" name="choice_${letter}"></label>`).join('')}</div>
            <label class="field-label span-two">Accepted typed answers <small>Comma-separated and exact; no fuzzy spelling</small><input class="field" name="accepted" placeholder="Tuesday, tuesday"></label>
            <button class="btn primary span-two" ${busy ? 'disabled' : ''}>${busy ? 'Saving…' : `Save to live bank ${icon('arrow')}`}</button>
          </form>
        </dialog>
      </div>`;

    app.querySelector('[data-signout]').addEventListener('click', signOut);
    app.querySelector('[data-import-bank]').addEventListener('click', importBundledBank);
    app.querySelector('[data-open-upload]').addEventListener('click', () => app.querySelector('#upload-dialog').showModal());
    const form = app.querySelector('#question-form');
    form.addEventListener('submit', (event) => { event.preventDefault(); saveQuestion(form); });
    const kind = app.querySelector('#answer-kind');
    const choices = app.querySelector('#choices');
    kind.addEventListener('change', () => choices.classList.toggle('hidden', kind.value !== 'choice'));
    app.querySelector('[data-search]').addEventListener('change', (event) => { search = event.target.value; render(); });
    app.querySelector('[data-level-filter]').addEventListener('change', (event) => { levelFilter = event.target.value; render(); });
    app.querySelectorAll('[data-toggle]').forEach((button) => button.addEventListener('click', () => toggle(button.dataset.toggle, button.dataset.enabled === 'true')));
  }

  initialise();
}

const page = document.body.dataset.page;
if (page === 'host') hostPage();
if (page === 'player') playerPage();
if (page === 'admin') adminPage();

if (page === 'host') {
  const loader = document.querySelector('#host-loader');
  const howDialog = document.querySelector('#how-dialog');
  howDialog?.querySelector('[data-close-how]')?.addEventListener('click', () => howDialog.close());
  howDialog?.addEventListener('close', () => {
    const video = howDialog.querySelector('video');
    video.pause();
    video.currentTime = 0;
  });
  const started = performance.now();
  window.addEventListener('load', () => setTimeout(() => loader?.classList.add('loaded'), Math.max(0, 1700 - (performance.now() - started))), { once: true });
}

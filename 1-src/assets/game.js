import { hasSupabase, supabase } from './supabase.js';
import QRCode from 'qrcode';

const HOST = 'wmc-host-v2';
const PLAYER = 'wmc-player-v2';
const MUSIC = 'wmc-music-v1';
const LEVELS = [90, 80, 70, 60, 50, 45, 40, 35, 30, 25, 20, 15, 10, 5, 1];
const joinBase = import.meta.env.DEV && import.meta.env.VITE_LAN_URL
  ? import.meta.env.VITE_LAN_URL
  : location.origin;
const brandLogo = new URL('./wmc-brand-logo.png', import.meta.url).href;
const gameLogo = new URL('./wmc-one-percent-logo.webp', import.meta.url).href;
const gameShowLogo = new URL('./wmc-game-show-logo.png', import.meta.url).href;
const howVideoUrl = '/1/media/how-it-works-v2.mp4';
const passVideoUrl = '/1/media/pass-intro.mp4';
const musicLibraryUrl = '/1/media/nasheeds/library.json';
const decodedMedia = new Map();
const mediaLoads = new Map();
const videoBlobUrls = new Map();
const videoLoads = new Map();
const videoProgress = new Map();
const videoProgressListeners = new Map();

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
  music: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/></svg>',
  next: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 5 9 7-9 7zM18 5v14"/></svg>',
  pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14"/></svg>',
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7z"/></svg>',
  previous: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m17 5-9 7 9 7zM6 5v14"/></svg>',
  power: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2v10M6.3 5.7a8 8 0 1 0 11.4 0"/></svg>',
  sparkle: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 1.4 5.1L18 10l-4.6 2.9L12 18l-1.4-5.1L6 10l4.6-2.9z"/><path d="m19 16 .7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7z"/></svg>',
  shuffle: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h3c5 0 7 10 12 10h3M18 14l3 3-3 3M3 17h3c2 0 3.5-1.6 5-3.7M14 7.8C15.2 6.8 16.4 7 18 7h3M18 4l3 3-3 3"/></svg>',
  upload: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/></svg>',
  users: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/></svg>',
  volume: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4zM15 9a4 4 0 0 1 0 6M18 6a8 8 0 0 1 0 12"/></svg>',
  wifi: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0"/><circle cx="12" cy="20" r="1"/></svg>',
  x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>'
};

const icon = (name) => `<span class="icon">${icons[name] || ''}</span>`;
const err = (error) => esc(error?.message || error || 'Something went wrong.');
const friendlyJoinError = (error) => {
  const message = String(error?.message || error || '');
  if (/finishing/i.test(message)) return 'That game is on its final reveal and is no longer accepting new players.';
  if (/not found|already started/i.test(message)) return 'We could not find an active game with that PIN. Check the four digits and try again.';
  if (/already in this game/i.test(message)) return 'That name is already being used in this room. Please choose a different name.';
  if (/fetch|network|offline/i.test(message)) return 'The live game could not be reached. Check your connection and try again.';
  return message || 'The room could not be joined. Please try again.';
};

const friendlySubmitError = (error) => {
  const message = String(error?.message || error || '');
  if (/time.*up|expired/i.test(message)) return "Time's up!";
  return message || 'Your answer could not be submitted.';
};

const friendlyConnectionError = (error) => {
  const message = String(error?.message || error || '');
  if (/fetch|network|offline|load failed/i.test(message)) return 'Connection interrupted. Reconnecting…';
  return message || 'The live game connection was interrupted. Reconnecting…';
};

const hostViewportSupported = () => window.innerWidth >= 900 && window.innerWidth > window.innerHeight;

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

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const webMediaPath = (path = '') => path.startsWith('/1/question-bank/') && /\.png(?:\?.*)?$/i.test(path)
  ? path.replace(/\.png(?=\?|$)/i, '.webp')
  : path;

async function decodeImage(path, priority = 'high') {
  if (!path) return '';
  if (decodedMedia.has(path)) return decodedMedia.get(path);
  if (mediaLoads.has(path)) return mediaLoads.get(path);
  const load = (async () => {
    const candidates = [...new Set([webMediaPath(path), path])];
    for (const candidate of candidates) {
      try {
        const image = new Image();
        image.decoding = 'async';
        image.fetchPriority = priority;
        image.src = candidate;
        if (!image.complete) await new Promise((resolve, reject) => {
          image.addEventListener('load', resolve, { once: true });
          image.addEventListener('error', reject, { once: true });
        });
        await image.decode?.().catch(() => {});
        decodedMedia.set(path, candidate);
        return candidate;
      } catch { /* Try the original PNG when an optimized copy is unavailable. */ }
    }
    throw new Error('Question artwork could not be prepared. Check the connection and try again.');
  })();
  mediaLoads.set(path, load);
  try { return await load; } finally { mediaLoads.delete(path); }
}

async function prepareQuestionMedia(question, { waitForAnswer = false } = {}) {
  if (!question) return;
  await decodeImage(question.question_image_path);
  const answerLoad = decodeImage(question.answer_image_path, 'low').catch(() => '');
  if (waitForAnswer) await answerLoad;
}

function updateVideoProgress(url, progress) {
  videoProgress.set(url, progress);
  (videoProgressListeners.get(url) || new Set()).forEach((listener) => listener(progress));
}

async function bufferVideo(url) {
  if (videoBlobUrls.has(url)) return videoBlobUrls.get(url);
  if (videoLoads.has(url)) return videoLoads.get(url);
  const load = (async () => {
    const response = await fetch(url, { cache: 'force-cache' });
    if (!response.ok) throw new Error('The studio video could not be loaded.');
    const total = Number(response.headers.get('content-length')) || 0;
    if (!response.body?.getReader) {
      const blob = await response.blob();
      updateVideoProgress(url, 1);
      const objectUrl = URL.createObjectURL(blob);
      videoBlobUrls.set(url, objectUrl);
      return objectUrl;
    }
    const reader = response.body.getReader();
    const chunks = [];
    let received = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.byteLength;
      updateVideoProgress(url, total ? Math.min(1, received / total) : 0.5);
    }
    const objectUrl = URL.createObjectURL(new Blob(chunks, { type: 'video/mp4' }));
    videoBlobUrls.set(url, objectUrl);
    updateVideoProgress(url, 1);
    return objectUrl;
  })();
  videoLoads.set(url, load);
  try { return await load; } catch (error) { videoLoads.delete(url); throw error; }
}

async function playStudioVideo(url, options = {}) {
  const overlay = document.querySelector('#how-overlay');
  const video = overlay?.querySelector('video');
  if (!overlay || !video) return;
  const progress = overlay.querySelector('[data-video-progress]');
  const progressLabel = overlay.querySelector('[data-video-progress-label]');
  const syncProgress = (value) => {
    if (progress) progress.style.setProperty('--progress', `${Math.round(value * 100)}%`);
    if (progressLabel) progressLabel.textContent = value >= 1 ? 'Ready' : `Loading ${Math.round(value * 100)}%`;
  };
  syncProgress(videoProgress.get(url) || 0);
  if (!videoProgressListeners.has(url)) videoProgressListeners.set(url, new Set());
  videoProgressListeners.get(url).add(syncProgress);
  const message = overlay.querySelector('[data-video-message]');
  const kicker = overlay.querySelector('[data-video-kicker]');
  const videoName = options.kicker || 'Studio video';
  if (kicker) kicker.innerHTML = `<i></i> ${esc(videoName)}`;
  overlay.setAttribute('aria-label', `${videoName} video`);
  if (message) message.textContent = options.message || 'Preparing the complete video';
  let cancelled = false;
  let enteredFullscreen = false;
  let requestClose;
  const closePromise = new Promise((resolve) => { requestClose = resolve; });
  const closeButton = overlay.querySelector('[data-close-how]');
  closeButton?.setAttribute('aria-label', `Close ${videoName} video`);
  const close = () => { cancelled = true; requestClose(); };
  const handleVideoKeys = (event) => {
    if (overlay.hidden || !overlay.classList.contains('open')) return;
    if (event.code === 'Space') {
      event.preventDefault();
      event.stopPropagation();
      if (video.paused) video.play().catch(() => {});
      else video.pause();
    } else if (event.code === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close();
    } else if (event.code === 'ArrowRight') {
      event.preventDefault();
      event.stopPropagation();
      video.currentTime = Math.min(Number(video.duration) || Infinity, video.currentTime + 10);
    } else if (event.code === 'ArrowLeft') {
      event.preventDefault();
      event.stopPropagation();
      video.currentTime = Math.max(0, video.currentTime - 10);
    }
  };
  const blockVideoKeyUp = (event) => {
    if (overlay.hidden || !overlay.classList.contains('open')) return;
    if (['Space', 'Escape', 'ArrowRight', 'ArrowLeft'].includes(event.code)) {
      event.preventDefault();
      event.stopPropagation();
    }
  };
  const handleFullscreenChange = () => {
    if (document.fullscreenElement === overlay) enteredFullscreen = true;
    else if (enteredFullscreen && overlay.classList.contains('open')) close();
  };
  closeButton?.addEventListener('click', close);
  document.addEventListener('keydown', handleVideoKeys, true);
  document.addEventListener('keyup', blockVideoKeyUp, true);
  document.addEventListener('fullscreenchange', handleFullscreenChange);
  overlay.hidden = false;
  overlay.setAttribute('aria-hidden', 'false');
  const beforeOpen = Promise.resolve(options.beforeOpen?.());
  requestAnimationFrame(() => overlay.classList.add('open'));
  overlay.requestFullscreen?.().catch(() => {});
  try {
    const source = await Promise.race([bufferVideo(url), closePromise.then(() => '')]);
    if (!source || cancelled) return;
    await Promise.race([beforeOpen, closePromise]);
    if (cancelled) return;
    if (video.src !== source) {
      video.src = source;
      video.load();
    }
    if (video.readyState < 3) await Promise.race([
      new Promise((resolve) => video.addEventListener('canplay', resolve, { once: true })),
      closePromise
    ]);
    if (cancelled) return;
    overlay.classList.add('ready');
    video.controls = true;
    video.currentTime = 0;
    try {
      await video.play();
    } catch {
      video.controls = true;
      if (message) message.textContent = 'Video ready — press play';
    }
    await Promise.race([
      new Promise((resolve) => video.addEventListener('ended', resolve, { once: true })),
      closePromise
    ]);
  } catch (error) {
    if (message) message.textContent = error.message;
    await sleep(1800);
  } finally {
    video.pause();
    video.controls = false;
    overlay.classList.remove('open', 'ready');
    overlay.setAttribute('aria-hidden', 'true');
    await sleep(320);
    overlay.hidden = true;
    if (document.fullscreenElement === overlay) document.exitFullscreen?.().catch(() => {});
    videoProgressListeners.get(url)?.delete(syncProgress);
    closeButton?.removeEventListener('click', close);
    document.removeEventListener('keydown', handleVideoKeys, true);
    document.removeEventListener('keyup', blockVideoKeyUp, true);
    document.removeEventListener('fullscreenchange', handleFullscreenChange);
    options.afterClose?.();
  }
}

const playHowVideo = (options = {}) => playStudioVideo(howVideoUrl, {
  kicker: 'How it works', message: 'Preparing the complete video', ...options
});

let slideFocusOverlay = null;
let slideFocusNative = false;

const fullscreenElement = () => document.fullscreenElement || document.webkitFullscreenElement || null;

function removeSlideFocus() {
  if (!slideFocusOverlay) return;
  slideFocusOverlay.remove();
  slideFocusOverlay = null;
  slideFocusNative = false;
  document.removeEventListener('fullscreenchange', handleSlideFullscreenChange);
  document.removeEventListener('webkitfullscreenchange', handleSlideFullscreenChange);
}

function handleSlideFullscreenChange() {
  if (slideFocusOverlay && slideFocusNative && fullscreenElement() !== slideFocusOverlay) removeSlideFocus();
}

async function closeSlideFocus() {
  const overlay = slideFocusOverlay;
  if (!overlay) return;
  const exitFullscreen = document.exitFullscreen || document.webkitExitFullscreen;
  if (fullscreenElement() === overlay && exitFullscreen) {
    try { await exitFullscreen.call(document); } catch { /* The fixed overlay still closes safely. */ }
  }
  if (slideFocusOverlay !== overlay) return;
  overlay.classList.remove('open');
  await sleep(180);
  if (slideFocusOverlay === overlay) removeSlideFocus();
}

async function openSlideFocus(image) {
  if (!image?.src) return;
  if (slideFocusOverlay) await closeSlideFocus();
  const overlay = document.createElement('div');
  overlay.className = 'slide-focus-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', `${image.alt || 'Question'} fullscreen view`);
  overlay.innerHTML = `<img src="${esc(image.currentSrc || image.src)}" alt="${esc(image.alt || 'Question slide')}">`;
  slideFocusOverlay = overlay;
  document.body.append(overlay);
  overlay.addEventListener('dblclick', (event) => { event.preventDefault(); closeSlideFocus(); });
  overlay.addEventListener('dragstart', (event) => event.preventDefault());
  overlay.addEventListener('keydown', (event) => {
    if (event.code === 'Escape') { event.preventDefault(); closeSlideFocus(); }
  });
  document.addEventListener('fullscreenchange', handleSlideFullscreenChange);
  document.addEventListener('webkitfullscreenchange', handleSlideFullscreenChange);
  requestAnimationFrame(() => overlay.classList.add('open'));
  if (!fullscreenElement()) {
    const requestFullscreen = overlay.requestFullscreen || overlay.webkitRequestFullscreen;
    if (requestFullscreen) {
      try {
        await requestFullscreen.call(overlay);
        slideFocusNative = fullscreenElement() === overlay;
      } catch { /* The image-only fixed overlay is the reliable fallback. */ }
    }
  }
}

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

const levelRail = (activePercentage = null, history = [], interactive = false, reviewPosition = null) => `
  <div class="level-rail" aria-label="Question levels">
    ${LEVELS.map((level) => {
      const item = history.find((entry) => Number(entry.percentage) === level);
      const complete = item ? Boolean(item.revealed) : Boolean(activePercentage && level > Number(activePercentage));
      const active = level === Number(activePercentage);
      const reviewing = Number(item?.position) === Number(reviewPosition);
      if (interactive && complete && !active) return `<button type="button" class="complete ${reviewing ? 'reviewing' : ''}" data-review-position="${item.position}" aria-label="Review the ${level}% question">${level}%</button>`;
      return `<span class="${active ? 'active' : ''} ${complete ? 'complete' : ''}">${level}%</span>`;
    }).join('')}
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
  let roundTransition = null;
  let deadlineRefreshRound = '';
  let knownPlayerIds = null;
  let reviewPosition = null;
  let reviewShowAnswer = false;
  let musicLibrary = null;
  let musicOpen = false;
  let resumeMusicAfterVideo = false;
  let musicFadeToken = 0;
  let launchTransition = false;
  let lastHostViewKey = '';
  let operationEpoch = 0;
  let refreshRequest = 0;
  let appliedRefresh = 0;
  let reviewRemainingMs = 0;
  let reviewResumeAt = 0;
  const animatedQuestionFrames = new Set();
  const animatedAnswerFrames = new Set();
  const arrivalUntil = new Map();
  const mediaReadyQuestions = new Set();
  const watchedAnswerMedia = new Set();
  const musicAudio = new Audio();
  const savedMusic = load(MUSIC) || {};
  const musicState = {
    playlistId: savedMusic.playlistId || 'ambience',
    trackIndex: Number(savedMusic.trackIndex) || 0,
    shuffle: Boolean(savedMusic.shuffle),
    volume: Number.isFinite(Number(savedMusic.volume)) ? Number(savedMusic.volume) : 0.68
  };
  musicAudio.preload = 'metadata';
  musicAudio.volume = Math.max(0, Math.min(1, musicState.volume));

  const saveMusic = () => save(MUSIC, musicState);
  const currentPlaylist = () => musicLibrary?.playlists?.find((playlist) => playlist.id === musicState.playlistId) || musicLibrary?.playlists?.[0];
  const currentTrack = () => currentPlaylist()?.tracks?.[musicState.trackIndex] || currentPlaylist()?.tracks?.[0];
  const formatTime = (seconds = 0) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

  async function loadMusicLibrary() {
    try {
      const response = await fetch(musicLibraryUrl, { cache: 'force-cache' });
      if (!response.ok) throw new Error('The nasheed library is unavailable.');
      musicLibrary = await response.json();
      if (!currentPlaylist()) musicState.playlistId = musicLibrary.playlists?.[0]?.id || 'ambience';
      musicState.trackIndex = Math.min(musicState.trackIndex, Math.max(0, (currentPlaylist()?.tracks?.length || 1) - 1));
      syncMusicLauncher();
      replaceMusicPanel();
    } catch (caught) {
      console.warn(caught.message);
    }
  }

  function syncMusicProgress() {
    const duration = Number(musicAudio.duration) || Number(currentTrack()?.duration) || 0;
    const current = Number(musicAudio.currentTime) || 0;
    app.querySelectorAll('[data-music-progress]').forEach((element) => {
      element.style.setProperty('--music-progress', `${duration ? Math.min(100, (current / duration) * 100) : 0}%`);
      if (element.matches('input')) element.value = duration ? String((current / duration) * 100) : '0';
    });
    const elapsed = app.querySelector('[data-music-elapsed]');
    if (elapsed) elapsed.textContent = `${formatTime(current)} / ${formatTime(duration)}`;
  }

  async function playMusicTrack(index = musicState.trackIndex) {
    const playlist = currentPlaylist();
    if (!playlist?.tracks?.length) return;
    musicState.trackIndex = Math.max(0, Math.min(index, playlist.tracks.length - 1));
    const track = currentTrack();
    if (musicAudio.dataset.trackId !== track.id) {
      musicAudio.src = track.src;
      musicAudio.dataset.trackId = track.id;
      musicAudio.load();
    }
    saveMusic();
    try {
      await musicAudio.play();
      error = '';
    } catch {
      error = 'Press play again to start the selected nasheed.';
    }
    syncMusicLauncher();
    replaceMusicPanel();
  }

  function moveMusic(direction = 1) {
    const playlist = currentPlaylist();
    if (!playlist?.tracks?.length) return;
    const next = musicState.shuffle
      ? Math.floor(Math.random() * playlist.tracks.length)
      : (musicState.trackIndex + direction + playlist.tracks.length) % playlist.tracks.length;
    playMusicTrack(next);
  }

  const fadeMusicTo = (target, duration = 700) => {
    const token = ++musicFadeToken;
    const start = musicAudio.volume;
    const destination = Math.max(0, Math.min(1, target));
    const startedAt = performance.now();
    return new Promise((resolve) => {
      const step = (now) => {
        if (token !== musicFadeToken) return resolve(false);
        const progress = Math.min(1, (now - startedAt) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        musicAudio.volume = start + (destination - start) * eased;
        if (progress < 1) requestAnimationFrame(step);
        else resolve(true);
      };
      requestAnimationFrame(step);
    });
  };
  const pauseMusicForVideo = async () => {
    resumeMusicAfterVideo = !musicAudio.paused;
    if (!resumeMusicAfterVideo) return;
    const faded = await fadeMusicTo(0, 650);
    if (faded && resumeMusicAfterVideo) musicAudio.pause();
  };
  const restoreMusicAfterVideo = () => {
    const shouldResume = resumeMusicAfterVideo;
    resumeMusicAfterVideo = false;
    if (shouldResume) {
      musicAudio.volume = 0;
      musicAudio.play().then(() => fadeMusicTo(musicState.volume, 900)).catch(() => {});
    }
    syncMusicLauncher();
  };

  musicAudio.addEventListener('timeupdate', syncMusicProgress);
  musicAudio.addEventListener('loadedmetadata', syncMusicProgress);
  musicAudio.addEventListener('ended', () => moveMusic(1));
  musicAudio.addEventListener('play', () => { syncMusicLauncher(); if (musicOpen) replaceMusicPanel(); });
  musicAudio.addEventListener('pause', () => { syncMusicLauncher(); if (musicOpen) replaceMusicPanel(); });

  const flash = (message) => {
    notice = message;
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => { notice = ''; render(); }, 2800);
    render();
  };

  async function refresh() {
    if (!creds || !hasSupabase) return;
    const active = creds;
    const epoch = operationEpoch;
    const request = ++refreshRequest;
    const previousPhase = snapshot?.game?.phase;
    const previousRoundId = snapshot?.round?.id;
    try {
      const next = await rpc('host_game_snapshot', { p_game_id: active.id, p_host_token: active.token });
      if (epoch !== operationEpoch || creds?.id !== active.id) return;
      if (request < appliedRefresh) return;
      appliedRefresh = request;
      const hadError = Boolean(error);
      const changed = JSON.stringify(next) !== JSON.stringify(snapshot);
      const nextPlayerIds = new Set((next?.players || []).map((player) => player.id));
      if (knownPlayerIds) {
        (next?.players || []).forEach((player) => {
          if (!knownPlayerIds.has(player.id)) {
            arrivalUntil.set(player.id, Date.now() + 3000);
            setTimeout(() => { arrivalUntil.delete(player.id); render(); }, 3050);
          }
        });
      }
      knownPlayerIds = nextPlayerIds;
      snapshot = next;
      if (snapshot?.round?.id !== previousRoundId || snapshot?.game?.phase !== 'revealed') {
        reviewRemainingMs = 0;
        reviewResumeAt = 0;
      }
      if (snapshot?.game?.phase === 'locked' && previousPhase !== 'locked') musicOpen = false;
      if (!snapshot?.game) {
        localStorage.removeItem(HOST);
        creds = null;
        snapshot = null;
      }
      error = '';
      if (changed || hadError) render();
      if (snapshot?.question && !mediaReadyQuestions.has(snapshot.question.id)) {
        prepareQuestionMedia(snapshot.question).then(() => {
          mediaReadyQuestions.add(snapshot.question.id);
          render();
        }).catch((caught) => {
          error = caught.message;
          render();
        });
      }
      if (snapshot?.question?.answer_image_path && !decodedMedia.has(snapshot.question.answer_image_path) && !watchedAnswerMedia.has(snapshot.question.id)) {
        watchedAnswerMedia.add(snapshot.question.id);
        decodeImage(snapshot.question.answer_image_path, 'low').then(() => render()).catch(() => {});
      }
      if (next?.next_question && !mediaReadyQuestions.has(next.next_question.id)) {
        prepareQuestionMedia(next.next_question).then(() => {
          mediaReadyQuestions.add(next.next_question.id);
        }).catch(() => {});
      }
      if (snapshot?.game?.phase === 'lobby') {
        bufferVideo(howVideoUrl).catch(() => {});
        bufferVideo(passVideoUrl).catch(() => {});
      }
    } catch (caught) {
      if (epoch !== operationEpoch || request < appliedRefresh) return;
      const message = friendlyConnectionError(caught);
      if (error !== message) {
        error = message;
        render();
      }
    }
  }

  async function create(form) {
    const timerSeconds = Number(new FormData(form).get('timer')) || 30;
    const epoch = ++operationEpoch;
    busy = true;
    launchTransition = true;
    error = '';
    render();
    try {
      const result = (await rpc('create_game', { p_timer_seconds: timerSeconds }))[0];
      if (epoch !== operationEpoch) return;
      creds = { id: result.game_id, pin: result.game_pin, token: result.host_token };
      save(HOST, creds);
      stop();
      stop = watch(creds.id, refresh);
      await refresh();
      await sleep(520);
    } catch (caught) {
      error = caught.message;
    }
    launchTransition = false;
    busy = false;
    render();
  }

  async function act(action) {
    const active = creds;
    const epoch = operationEpoch;
    if (!active) return;
    busy = true;
    error = '';
    render();
    try {
      const names = {
        start: 'host_start_game', timer: 'host_start_timer', lock: 'host_lock_answers',
        reveal: 'host_reveal_answer', next: 'host_next_round'
      };
      await rpc(names[action], { p_game_id: active.id, p_host_token: active.token });
      if (epoch !== operationEpoch || creds?.id !== active.id) return;
      await refresh();
    } catch (caught) {
      if (epoch !== operationEpoch) return;
      error = caught.message;
    }
    if (epoch !== operationEpoch) return;
    busy = false;
    render();
  }

  async function stageAndStartRound(action = null) {
    if (busy) return;
    const active = creds;
    const epoch = operationEpoch;
    if (!active) return;
    busy = true;
    error = '';
    roundTransition = { mode: 'loading', count: null };
    render();
    try {
      if (action === 'start' || action === 'next') {
        const rpcName = action === 'start' ? 'host_start_game' : 'host_next_round';
        await rpc(rpcName, { p_game_id: active.id, p_host_token: active.token });
        if (epoch !== operationEpoch || creds?.id !== active.id) return;
        await refresh();
      }
      if (epoch !== operationEpoch || creds?.id !== active.id) return;
      if (!snapshot?.game || snapshot.game.phase === 'finished') {
        roundTransition = null;
        return;
      }
      const question = snapshot.question;
      if (!question?.id) throw new Error('The next question could not be prepared. Please try again.');
      const mediaPromise = prepareQuestionMedia(question).then(() => mediaReadyQuestions.add(question.id));
      const passIntroKey = `wmc-pass-intro:${active.id}`;
      let countdownLength = 5;
      if (question?.percentage === 60 && !sessionStorage.getItem(passIntroKey)) {
        sessionStorage.setItem(passIntroKey, 'shown');
        roundTransition = { mode: 'pass', count: null };
        render();
        await Promise.all([mediaPromise, sleep(900)]);
        await playStudioVideo(passVideoUrl, {
          kicker: 'The pass',
          message: 'Preparing the pass introduction',
          beforeOpen: pauseMusicForVideo,
          afterClose: restoreMusicAfterVideo
        });
        countdownLength = 15;
      } else {
        await mediaPromise;
      }
      if (epoch !== operationEpoch || creds?.id !== active.id) return;
      for (let count = countdownLength; count >= 1; count -= 1) {
        roundTransition = { mode: 'countdown', count, extended: countdownLength === 15 };
        render();
        await sleep(1000);
        if (epoch !== operationEpoch || creds?.id !== active.id) return;
      }
      await rpc('host_start_timer', { p_game_id: active.id, p_host_token: active.token });
      if (epoch !== operationEpoch || creds?.id !== active.id) return;
      roundTransition = null;
      deadlineRefreshRound = '';
      await refresh();
    } catch (caught) {
      if (epoch !== operationEpoch) return;
      error = caught.message;
      roundTransition = null;
    } finally {
      if (epoch !== operationEpoch) return;
      busy = false;
      render();
    }
  }

  async function leave() {
    const ending = creds;
    operationEpoch += 1;
    stop();
    localStorage.removeItem(HOST);
    creds = null;
    snapshot = null;
    reviewPosition = null;
    reviewShowAnswer = false;
    reviewRemainingMs = 0;
    reviewResumeAt = 0;
    roundTransition = null;
    launchTransition = false;
    deadlineRefreshRound = '';
    knownPlayerIds = null;
    busy = false;
    error = '';
    render();
    try {
      if (ending?.id && hasSupabase) await Promise.race([
        rpc('host_end_game', { p_game_id: ending.id, p_host_token: ending.token }),
        sleep(2200)
      ]);
    } catch {}
  }

  function startFreshGame() {
    const ending = creds;
    operationEpoch += 1;
    stop();
    localStorage.removeItem(HOST);
    creds = null;
    snapshot = null;
    reviewPosition = null;
    reviewShowAnswer = false;
    reviewRemainingMs = 0;
    reviewResumeAt = 0;
    roundTransition = null;
    launchTransition = false;
    deadlineRefreshRound = '';
    knownPlayerIds = null;
    busy = false;
    error = '';
    render();
    if (ending?.id && hasSupabase) rpc('host_end_game', {
      p_game_id: ending.id,
      p_host_token: ending.token
    }).catch(() => {});
  }

  const playerList = (players, currentRound = 0) => {
    if (!players.length) return `
      <div class="empty-state">
        <span class="empty-orbit"><i></i></span>
        <strong>Waiting for players</strong>
        <small>Names will appear here as people join.</small>
      </div>`;
    return players.map((player, index) => {
      const waiting = Number(player.eligible_from_round || 0) > Number(currentRound);
      const arriving = Number(arrivalUntil.get(player.id) || 0) > Date.now();
      return `
      <div class="player-chip ${player.used_pass ? 'passed' : player.has_locked_answer ? 'submitted' : ''} ${player.is_alive ? '' : 'out'} ${arriving ? 'arriving' : ''}" style="--delay:${index * 45}ms">
        <span class="player-avatar">${esc(player.name.slice(0, 1).toUpperCase())}</span>
        <span class="player-name">${esc(player.name)}</span>
        <span class="player-state">${waiting ? 'Next round' : player.is_alive ? (player.used_pass ? '<span class="pass-mini">P</span> Pass used' : player.has_locked_answer ? `${icon('check')} Locked` : 'Ready') : 'Spectating'}</span>
      </div>`;
    }).join('');
  };

  const musicButton = () => {
    const track = currentTrack();
    return `<button class="music-launch ${!musicAudio.paused ? 'playing' : ''}" type="button" data-music-toggle aria-label="Open nasheed player">
      <span class="music-launch-icon">${icon(musicAudio.paused ? 'music' : 'pause')}<i></i></span>
      <span><small>Nasheed player</small><strong>${esc(track?.title || (musicLibrary ? 'Choose a track' : 'Loading library…'))}</strong></span>
    </button>`;
  };

  const musicPanel = () => {
    const openClass = musicOpen ? 'open' : '';
    const hidden = musicOpen ? 'false' : 'true';
    if (!musicLibrary) return `<div class="music-scrim ${openClass}" aria-hidden="${hidden}" data-music-close><section class="music-panel loading" role="dialog" aria-label="Nasheed player" onclick="event.stopPropagation()"><button class="round-icon-button music-close" data-music-close type="button" aria-label="Close">${icon('x')}</button><span class="media-spinner"><i></i></span><strong>Preparing your nasheed archive</strong><small>Loading all three WMC playlists…</small></section></div>`;
    const playlist = currentPlaylist();
    const track = currentTrack();
    const duration = Number(musicAudio.duration) || Number(track?.duration) || 0;
    return `<div class="music-scrim ${openClass}" aria-hidden="${hidden}" data-music-close>
      <section class="music-panel" role="dialog" aria-label="Nasheed player" onclick="event.stopPropagation()">
        <header class="music-panel-head">
          <div><span class="broadcast-kicker"><i></i> WMC sound</span><h2>Nasheed archive</h2></div>
          <button class="round-icon-button music-close" data-music-close type="button" aria-label="Close nasheed player">${icon('x')}</button>
        </header>
        <div class="playlist-switcher">
          ${musicLibrary.playlists.map((item) => `<button type="button" class="playlist-card ${item.id === playlist?.id ? 'active' : ''}" data-playlist="${esc(item.id)}"><img src="${esc(item.cover)}" alt=""><span><strong>${esc(item.title)}</strong><small>${item.tracks.length} tracks</small></span></button>`).join('')}
        </div>
        <div class="now-playing">
          <img src="${esc(playlist?.cover || '')}" alt="${esc(playlist?.title || '')} cover">
          <div class="now-playing-copy"><small>${musicAudio.paused ? 'Ready to play' : 'Now playing'} · ${esc(playlist?.title || '')}</small><strong>${esc(track?.title || 'Choose a track')}</strong><span>${esc(playlist?.description || '')}</span></div>
          <div class="transport-controls">
            <button type="button" data-music-shuffle class="${musicState.shuffle ? 'active' : ''}" aria-label="Shuffle">${icon('shuffle')}</button>
            <button type="button" data-music-prev aria-label="Previous track">${icon('previous')}</button>
            <button type="button" class="transport-play" data-music-play aria-label="${musicAudio.paused ? 'Play' : 'Pause'}">${icon(musicAudio.paused ? 'play' : 'pause')}</button>
            <button type="button" data-music-next aria-label="Next track">${icon('next')}</button>
          </div>
        </div>
        <div class="music-timeline">
          <input type="range" min="0" max="100" value="${duration ? (musicAudio.currentTime / duration) * 100 : 0}" data-music-progress aria-label="Track position">
          <small data-music-elapsed>${formatTime(musicAudio.currentTime)} / ${formatTime(duration)}</small>
          <label>${icon('volume')}<input type="range" min="0" max="1" step="0.01" value="${musicState.volume}" data-music-volume aria-label="Volume"></label>
        </div>
        <div class="track-list" aria-label="${esc(playlist?.title || '')} tracks">
          ${playlist?.tracks?.map((item, index) => `<button type="button" class="track-row ${index === musicState.trackIndex ? 'active' : ''}" data-track="${index}"><span class="track-number">${index === musicState.trackIndex && !musicAudio.paused ? icon('music') : String(index + 1).padStart(2, '0')}</span><span><strong>${esc(item.title)}</strong><small>${formatTime(item.duration)}</small></span>${index === musicState.trackIndex ? '<i>Selected</i>' : ''}</button>`).join('') || ''}
        </div>
      </section>
    </div>`;
  };

  function syncMusicLauncher() {
    const launcher = app.querySelector('[data-music-toggle]');
    if (!launcher) return;
    launcher.classList.toggle('playing', !musicAudio.paused);
    const launcherIcon = launcher.querySelector('.music-launch-icon');
    if (launcherIcon) launcherIcon.innerHTML = `${icon(musicAudio.paused ? 'music' : 'pause')}<i></i>`;
    const title = launcher.querySelector('strong');
    if (title) title.textContent = currentTrack()?.title || (musicLibrary ? 'Choose a track' : 'Loading library…');
  }

  function setMusicOpen(open) {
    musicOpen = Boolean(open);
    const scrim = app.querySelector('.music-scrim');
    if (!scrim) return;
    scrim.classList.toggle('open', musicOpen);
    scrim.setAttribute('aria-hidden', musicOpen ? 'false' : 'true');
  }

  function replaceMusicPanel() {
    const current = app.querySelector('.music-scrim');
    if (!current) return;
    const template = document.createElement('template');
    template.innerHTML = musicPanel().trim();
    current.replaceWith(template.content.firstElementChild);
    bindMusicPanelControls();
    syncMusicProgress();
  }

  function bindMusicPanelControls() {
    app.querySelectorAll('[data-music-close]').forEach((element) => element.addEventListener('click', (event) => {
      if (event.currentTarget.classList.contains('music-scrim') && event.target !== event.currentTarget) return;
      setMusicOpen(false);
    }));
    app.querySelectorAll('[data-playlist]').forEach((button) => button.addEventListener('click', () => {
      musicState.playlistId = button.dataset.playlist;
      musicState.trackIndex = 0;
      saveMusic();
      playMusicTrack(0);
    }));
    app.querySelectorAll('[data-track]').forEach((button) => button.addEventListener('click', () => playMusicTrack(Number(button.dataset.track))));
    app.querySelector('[data-music-play]')?.addEventListener('click', () => musicAudio.paused ? playMusicTrack() : musicAudio.pause());
    app.querySelector('[data-music-prev]')?.addEventListener('click', () => moveMusic(-1));
    app.querySelector('[data-music-next]')?.addEventListener('click', () => moveMusic(1));
    app.querySelector('[data-music-shuffle]')?.addEventListener('click', (event) => {
      musicState.shuffle = !musicState.shuffle;
      saveMusic();
      event.currentTarget.classList.toggle('active', musicState.shuffle);
    });
    app.querySelector('[data-music-volume]')?.addEventListener('input', (event) => {
      musicState.volume = Number(event.target.value);
      musicAudio.volume = musicState.volume;
      saveMusic();
    });
    app.querySelector('[data-music-progress]')?.addEventListener('input', (event) => {
      if (Number.isFinite(musicAudio.duration)) musicAudio.currentTime = Number(event.target.value) / 100 * musicAudio.duration;
      syncMusicProgress();
    });
  }

  async function openHistory(position) {
    const item = snapshot?.history?.find((entry) => Number(entry.position) === Number(position));
    if (!item?.revealed) return;
    if (reviewPosition === null && snapshot?.game?.phase === 'revealed' && snapshot.game.advance_at) {
      const activeDeadline = reviewResumeAt || new Date(snapshot.game.advance_at).getTime();
      reviewRemainingMs = Math.max(1000, activeDeadline - Date.now());
      reviewResumeAt = 0;
    }
    reviewPosition = Number(position);
    reviewShowAnswer = false;
    render();
    try {
      await prepareQuestionMedia(item, { waitForAnswer: true });
      render();
    } catch (caught) {
      error = caught.message;
      render();
    }
  }

  const roundStats = (item) => {
    if (!item || !Number.isFinite(Number(item.eligible_count))) return '';
    const passInPlay = Number(item.percentage) <= 60;
    return `<div class="round-results ${passInPlay ? 'has-pass' : ''}" aria-label="Question results">
      <span class="correct"><small>Correct</small><strong>${Number(item.correct_count) || 0}</strong></span>
      <span class="incorrect"><small>Incorrect</small><strong>${Number(item.incorrect_count) || 0}</strong></span>
      <span><small>No answer</small><strong>${Number(item.no_answer_count) || 0}</strong></span>
      ${passInPlay ? `<span class="passed"><small>Passes</small><strong>${Number(item.pass_count) || 0}</strong></span>` : ''}
    </div>`;
  };

  const historyReviewStage = (item) => {
    const originalImage = reviewShowAnswer ? (item.answer_image_path || item.question_image_path) : item.question_image_path;
    const displayImage = decodedMedia.get(originalImage) || '';
    return `<div class="question-stage history-stage">
      <div class="question-meta">
        <div class="round-ident"><span class="percentage-medallion"><span><strong>${item.percentage}</strong><small>%</small></span></span><div><span class="broadcast-kicker"><i></i> Question history</span><h1>${item.percentage}% ${reviewShowAnswer ? 'answer' : 'question'}</h1></div></div>
        <div class="history-badge">Reviewing completed question</div>
      </div>
      <div class="question-frame ${reviewShowAnswer ? 'answer-frame' : ''}"><div class="frame-glow"></div>${displayImage ? `<img src="${esc(displayImage)}" alt="${reviewShowAnswer ? 'Answer' : 'Question'} slide" data-question-image title="Double-click to toggle image fullscreen">` : '<div class="question-ready-card"><span class="media-spinner"><i></i></span><strong>Preparing this slide</strong><small>One moment</small></div>'}${reviewShowAnswer ? '<span class="reveal-ribbon">Answer</span>' : ''}</div>
      <div class="history-summary">${roundStats(item)}</div>
      <div class="control-dock question-controls"><div class="phase-caption"><span>Completed question</span><small>The live countdown resumes when you return.</small></div><div class="dock-actions"><button class="btn ghost" type="button" data-history-answer>${icon('eye')} ${reviewShowAnswer ? 'Show question' : 'Show answer'}</button><button class="btn primary" type="button" data-history-close>Return to live game ${icon('arrow')}</button></div></div>
    </div>`;
  };

  const lobbyStage = (game, players, enterClass = '') => {
    const joinUrl = `${joinBase}/1/join/?pin=${encodeURIComponent(game.pin)}`;
    return `
      <div class="lobby-stage ${enterClass}">
        <div class="lobby-intro">
          <span class="broadcast-kicker"><i></i> Room is open</span>
          <h1>Your room<br><em>is live.</em></h1>
          <p>Players can join by QR code, link or PIN.<br><span>Starts when you're ready.</span></p>
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
            ${icon('link')}<strong>Copy player link</strong><span class="copy-label">Copy</span>
          </button>
          <a class="text-link" href="${esc(joinUrl)}" target="_blank" rel="noopener">Open a player join screen ${icon('arrow')}</a>
        </div>
        <div class="control-dock lobby-controls">
          <button class="btn ghost" type="button" data-how>${icon('film')} How it works</button>
          <button class="btn primary wide" data-start-round="start" ${players.length && !busy ? '' : 'disabled'}>Start Game ${icon('arrow')}</button>
          <button class="btn danger icon-only" type="button" data-leave aria-label="End session">${icon('power')}</button>
        </div>
      </div>`;
  };

  const questionStage = (game, question, players, history = [], round = null) => {
    const alive = players.filter((player) => player.is_alive && Number(player.eligible_from_round || 0) <= Number(game.current_round));
    const submitted = alive.filter((player) => player.has_locked_answer).length;
    const timerRunning = game.phase === 'question' && Boolean(game.ends_at);
    const reading = game.phase === 'question' && !game.ends_at && Boolean(game.read_ends_at);
    const timerDeadline = timerRunning ? game.ends_at : reading ? game.read_ends_at : null;
    const seconds = timerDeadline ? Math.max(0, Math.ceil((new Date(timerDeadline) - Date.now()) / 1000)) : game.timer_seconds;
    const revealSeconds = game.phase === 'locked' && game.reveal_at
      ? Math.max(0, Math.ceil((new Date(game.reveal_at) - Date.now()) / 1000))
      : 0;
    const advanceDeadline = reviewResumeAt || (game.advance_at ? new Date(game.advance_at).getTime() : 0);
    const advanceSeconds = game.phase === 'revealed' && advanceDeadline
      ? Math.max(0, Math.ceil((advanceDeadline - Date.now()) / 1000))
      : 20;
    const originalImage = game.phase === 'revealed'
      ? (question?.answer_image_path || question?.question_image_path)
      : question?.question_image_path;
    const displayImage = decodedMedia.get(originalImage) || '';
    const historyItem = history.find((item) => Number(item.position) === Number(round?.position ?? game.current_round));
    const stats = roundStats(historyItem);
    const animateQuestion = Boolean((timerRunning || reading) && displayImage && question?.id && !animatedQuestionFrames.has(question.id));
    const animateAnswer = Boolean(game.phase === 'revealed' && displayImage && question?.id && !animatedAnswerFrames.has(question.id));
    if (animateQuestion) animatedQuestionFrames.add(question.id);
    if (animateAnswer) animatedAnswerFrames.add(question.id);
    const phaseName = game.phase === 'revealed' ? 'Answer reveal' : game.phase === 'locked' ? 'Answers locked' : reading ? 'Reading time' : timerRunning ? 'Answers open' : 'Question ready';
    const primaryAction = game.phase === 'question' && !timerRunning && !reading
      ? `<button class="btn primary wide" data-start-round="resume" ${mediaReadyQuestions.has(question?.id) && !busy ? '' : 'disabled'}>${icon('play')} ${mediaReadyQuestions.has(question?.id) ? 'Start question' : 'Preparing question…'}</button>`
      : timerRunning
        ? `<button class="btn primary wide advance-action" data-action="lock" ${busy ? 'disabled' : ''}>Advance ${icon('arrow')}</button>`
      : game.phase === 'revealed'
          ? `<button class="btn primary wide" data-start-round="next">Next question now ${icon('arrow')}</button>`
          : '';
    return `
      <div class="question-stage ${game.phase === 'revealed' ? 'is-reveal' : ''}">
        <div class="question-meta">
          <div class="round-ident">
            <span class="percentage-medallion"><span><strong>${question?.percentage || '–'}</strong><small>%</small></span></span>
            <div><span class="broadcast-kicker"><i></i>${phaseName}</span><h1>The ${question?.percentage || '–'}% question</h1></div>
          </div>
          <div class="locked-stat">${icon('users')}<strong>${submitted}/${alive.length}</strong><span>locked in</span></div>
          <div class="timer-ring ${seconds <= 5 && timerRunning ? 'low' : ''} ${timerRunning || reading ? 'running' : ''} ${reading ? 'reading' : ''}" data-timer style="--timer-progress:${timerDeadline ? (seconds / (reading ? 15 : game.timer_seconds)) * 360 : 360}deg">
            <span>${timerRunning || reading ? seconds : game.phase === 'locked' ? revealSeconds : game.phase === 'question' ? 'Ready' : icon('lock')}</span>
            <small>${reading ? 'read' : timerRunning ? 'seconds' : game.phase === 'locked' ? 'to reveal' : game.phase === 'revealed' ? 'revealed' : ''}</small>
          </div>
        </div>
        <div class="question-frame ${game.phase === 'revealed' ? `answer-frame ${animateAnswer ? 'animate-answer' : ''}` : ''} ${displayImage ? 'has-slide' : ''}">
          <div class="frame-glow"></div>
          ${game.phase === 'locked' ? '<div class="question-ready-card"><strong>Answers are locked</strong></div>'
            : game.phase === 'question' && !timerRunning && !reading ? `
              <div class="question-ready-card"><span class="media-spinner"><i></i></span><strong>${mediaReadyQuestions.has(question?.id) ? 'Question ready' : 'Preparing question'}</strong><small>${mediaReadyQuestions.has(question?.id) ? 'Start when everyone is focused.' : 'One moment.'}</small></div>`
            : game.phase === 'revealed' && question?.answer_image_path && !displayImage ? '<div class="question-ready-card"><span class="media-spinner"><i></i></span><strong>Preparing the answer reveal</strong><small>The complete answer slide will appear together.</small></div>'
            : displayImage ? `${animateQuestion ? '<div class="question-unveil" aria-hidden="true"><i></i><i></i></div>' : ''}<img src="${esc(displayImage)}" alt="${game.phase === 'revealed' ? 'Answer' : 'Question'} slide" data-question-image title="Double-click for image fullscreen">`
            : `<div class="question-copy">${esc(question?.question_text || 'Preparing question artwork…')}</div>`}
          ${game.phase === 'revealed' ? '<span class="reveal-ribbon">Answer</span>' : ''}
        </div>
        ${game.phase === 'revealed' && !question?.answer_image_path ? `<div class="answer-reveal"><span>Correct answer</span><strong>${esc(question?.answer_text)}</strong></div>` : ''}
        ${game.phase === 'revealed' ? `<div class="answer-summary ${stats ? '' : 'countdown-only'}">${stats}<div class="auto-advance-card"><div><span>Next question</span><strong>In <b data-auto-countdown>${advanceSeconds}</b> seconds</strong></div><div class="auto-advance-track"><i data-auto-progress style="--auto-progress:${Math.max(0, Math.min(100, advanceSeconds / 20 * 100))}%"></i></div></div></div>` : ''}
        <div class="control-dock question-controls">
          <div class="phase-caption"><span>${reading ? 'Reading time' : timerRunning ? (submitted === alive.length && alive.length ? 'Everyone has answered' : 'Answers are open') : game.phase === 'question' ? 'Room ready' : game.phase === 'revealed' ? 'Answer revealed' : 'Answers are closed'}</span><small>${reading ? 'Answer controls open automatically after fifteen seconds.' : timerRunning ? 'Advance whenever everyone has answered.' : game.phase === 'question' ? 'Start when everyone is focused.' : game.phase === 'revealed' ? 'Continue now or allow the countdown.' : 'The answer follows automatically.'}</small></div>
          <div class="dock-actions">
            ${primaryAction}
            <button class="btn danger icon-only" type="button" data-leave aria-label="End session">${icon('power')}</button>
          </div>
        </div>
      </div>`;
  };

  const timeUpScreen = (game) => {
    if (game?.phase !== 'locked') return '';
    const revealSeconds = game.reveal_at ? Math.max(0, Math.ceil((new Date(game.reveal_at) - Date.now()) / 1000)) : 0;
    return `<div class="time-up-screen" role="status"><div class="time-up-rays" aria-hidden="true"></div><div class="time-up-lockup"><div class="time-up-emblem" aria-hidden="true"><i></i>${icon('lock')}</div><span class="broadcast-kicker"><i></i> Answers locked</span><strong>Time's up!</strong><small>All answers are now final</small><div class="reveal-countdown-line"><span>Answer reveal in</span><b data-reveal-countdown>${revealSeconds}</b></div></div></div>`;
  };

  const launchTransitionScreen = () => launchTransition ? `
    <div class="launch-transition" role="status">
      <div class="launch-sweep" aria-hidden="true"></div>
      <div class="launch-logo-crop"><img src="${gameShowLogo}" alt="WMC Game Show"></div>
      <span class="broadcast-kicker"><i></i> Opening your room</span>
      <strong>Going live.</strong>
    </div>` : '';

  const roundTransitionScreen = (question) => {
    if (!roundTransition) return '';
    if (roundTransition.mode === 'pass') return `
      <div class="round-transition pass-intro" role="status">
        <div class="transition-rings" aria-hidden="true"><i></i><i></i><i></i></div>
        <span class="broadcast-kicker"><i></i> New from the 60% question</span>
        <strong>The pass is now in play.</strong>
        <small>The pass introduction is ready.</small>
      </div>`;
    if (roundTransition.mode === 'countdown') return `
      <div class="round-transition countdown-intro ${roundTransition.extended ? 'extended-countdown' : ''}" role="status">
        <div class="countdown-stage">
          <div class="transition-logo-crop"><img class="transition-show-logo" src="${gameShowLogo}" alt="WMC Game Show"></div>
          <div class="countdown-heading">
            <span class="broadcast-kicker"><i></i> ${roundTransition.extended ? 'The pass is now in play' : 'Next question'}</span>
            <span class="transition-percentage"><strong>${question?.percentage || '–'}</strong><small>%</small></span>
          </div>
          <div class="countdown-focus"><i></i><i></i><strong class="countdown-number">${roundTransition.count}</strong></div>
          <small class="countdown-foot">${roundTransition.extended ? 'The pass is available from this question' : 'Eyes on the screen'}</small>
        </div>
      </div>`;
    return `
      <div class="round-transition media-preflight" role="status">
        <img class="transition-show-logo compact" src="${gameShowLogo}" alt="WMC Game Show">
        <span class="media-spinner large"><i></i></span>
        <span class="broadcast-kicker"><i></i> Next question</span>
        <strong>Preparing the screen.</strong>
        <small>One moment</small>
      </div>`;
  };

  function render() {
    clearInterval(ticker);
    if (!hostViewportSupported()) {
      document.body.dataset.state = 'host-device-gate';
      app.innerHTML = `
        ${atmosphere()}
        <main class="host-device-gate">
          ${brand('device-gate-brand')}
          <section class="device-gate-card">
            <img src="${gameShowLogo}" alt="WMC Game Show">
            <span class="broadcast-kicker"><i></i> Host display</span>
            <h1>Open the host on a larger landscape screen.</h1>
            <p>The live control room is designed for a computer, Mac or large tablet in landscape. Players can still join from this device.</p>
            <a class="btn primary" href="/1/join/">Open the player screen ${icon('arrow')}</a>
          </section>
        </main>`;
      return;
    }
    const game = snapshot?.game;
    const question = snapshot?.question;
    const players = snapshot?.players || [];
    const alive = players.filter((player) => player.is_alive);
    document.body.dataset.state = game?.phase || (creds ? 'connecting' : 'home');
    const hostViewKey = !creds ? 'home'
      : !snapshot ? 'connecting'
        : reviewPosition !== null ? `history:${reviewPosition}:${reviewShowAnswer}`
          : game?.phase === 'lobby' ? 'lobby'
            : game?.phase === 'finished' ? 'finished'
              : `round:${snapshot?.round?.id || 'none'}:${game?.phase || 'unknown'}`;
    const enterClass = hostViewKey !== lastHostViewKey ? 'view-enter' : '';
    lastHostViewKey = hostViewKey;

    let stage;
    if (!creds) {
      stage = `
        <div class="launch-stage ${enterClass}">
          <section class="launch-art">
            <div class="poster-halo"></div>
            <img src="${gameLogo}" alt="WMC The 1% Club">
            <div class="launch-art-copy"><span>A live gameshow experience</span></div>
          </section>
          <section class="launch-console">
            <span class="broadcast-kicker"><i></i> WMC live gameshow</span>
            <h1>Set up<br>your game.</h1>
            <p>Choose the question time, open the room and invite everyone by PIN or QR.</p>
            ${!hasSupabase ? '<div class="notice bad">The live database is not configured on this build.</div>' : ''}
            <form class="launch-form" id="create-game">
              <label class="timer-control"><span>Question timer</span><div><input name="timer" type="number" min="5" max="300" value="30" required><small>seconds</small></div></label>
              <button class="btn primary launch-button" ${busy || !hasSupabase ? 'disabled' : ''}>${busy ? '<span class="button-spinner"></span> Opening room…' : `Open game room ${icon('arrow')}`}</button>
            </form>
            <div class="launch-note">${icon('arrow')} Your PIN and QR code appear on the next screen.</div>
          </section>
        </div>`;
    } else if (!snapshot) {
      stage = `<div class="connecting-stage ${enterClass}"><span class="signal-loader"><i></i><i></i><i></i></span><p class="broadcast-kicker">Connecting live</p><h1>Opening room ${esc(creds.pin)}…</h1></div>`;
    } else if (reviewPosition !== null) {
      const historyItem = snapshot.history?.find((item) => Number(item.position) === Number(reviewPosition));
      stage = historyItem ? historyReviewStage(historyItem) : questionStage(game, question, players, snapshot.history || [], snapshot.round);
    } else if (game.phase === 'lobby') {
      stage = lobbyStage(game, players, enterClass);
    } else if (game.phase === 'finished') {
      stage = `
        <div class="finale-stage ${enterClass}">
          <div class="finale-burst" aria-hidden="true"></div>${icon('sparkle')}
          <span class="broadcast-kicker"><i></i> Game complete</span>
          <h1>${alive.length ? 'Still standing' : 'That was The 1% Club'}</h1>
          <p class="finalists">${alive.length ? alive.map((player) => esc(player.name)).join(' · ') : 'Thanks for playing'}</p>
          <button class="btn primary" data-new-game>Start another game ${icon('arrow')}</button>
        </div>`;
    } else {
      stage = questionStage(game, question, players, snapshot.history || [], snapshot.round);
    }

    const currentPercentage = question?.percentage || null;
    app.innerHTML = `
      ${atmosphere()}
      <div class="host-shell">
        <header class="host-topbar">
          ${brand('host-brand')}
          ${levelRail(currentPercentage, snapshot?.history || [], Boolean(creds && game && (game.phase === 'revealed' || (game.phase === 'question' && !game.ends_at))), reviewPosition)}
          <div class="header-actions">${musicButton()}${connectionPill()}<button class="round-icon-button" type="button" data-fullscreen aria-label="Enter fullscreen">${icon('expand')}</button></div>
        </header>
        ${error ? `<div class="notice bad global-notice">${err(error)}</div>` : ''}
        ${notice ? `<div class="toast" role="status">${icon('check')} ${esc(notice)}</div>` : ''}
        <main class="host-grid ${!creds ? 'home-grid' : ''}">
          <section class="studio-panel stage-panel">${stage}</section>
          ${creds ? `<aside class="studio-panel players-panel">
            <div class="players-head"><div><span class="section-label">Live room</span><h2>Players</h2></div><span class="player-count">${players.length}</span></div>
            ${game ? `<button class="sidebar-pin" type="button" data-copy-pin="${game.pin}"><span>PIN</span><strong>${game.pin}</strong>${icon('copy')}</button>` : ''}
            <div class="player-list">${playerList(players, game?.current_round || 0)}</div>
            <div class="players-foot"><span><i class="online-dot"></i>${alive.length} still playing</span><small>${players.length - alive.length ? `${players.length - alive.length} spectating` : 'Nobody eliminated'}</small></div>
          </aside>` : ''}
        </main>
        ${launchTransitionScreen()}
        ${roundTransitionScreen(question)}
        ${timeUpScreen(game)}
        ${musicPanel()}
      </div>`;

    app.querySelector('#create-game')?.addEventListener('submit', (event) => { event.preventDefault(); create(event.currentTarget); });
    app.querySelector('[data-fullscreen]')?.addEventListener('click', () => document.documentElement.requestFullscreen?.());
    app.querySelector('[data-leave]')?.addEventListener('click', leave);
    app.querySelector('[data-new-game]')?.addEventListener('click', startFreshGame);
    app.querySelectorAll('[data-action]').forEach((button) => button.addEventListener('click', () => act(button.dataset.action)));
    app.querySelectorAll('[data-start-round]').forEach((button) => button.addEventListener('click', () => stageAndStartRound(button.dataset.startRound)));
    app.querySelector('[data-how]')?.addEventListener('click', () => playHowVideo({ beforeOpen: pauseMusicForVideo, afterClose: restoreMusicAfterVideo }));
    app.querySelectorAll('[data-question-image]').forEach((image) => image.addEventListener('dblclick', (event) => {
      event.preventDefault();
      event.stopPropagation();
      openSlideFocus(event.currentTarget);
    }));
    app.querySelectorAll('[data-review-position]').forEach((button) => button.addEventListener('click', () => openHistory(button.dataset.reviewPosition)));
    app.querySelector('[data-history-close]')?.addEventListener('click', () => {
      if (snapshot?.game?.phase === 'revealed' && reviewRemainingMs > 0) reviewResumeAt = Date.now() + reviewRemainingMs;
      reviewRemainingMs = 0;
      reviewPosition = null;
      reviewShowAnswer = false;
      render();
    });
    app.querySelector('[data-history-answer]')?.addEventListener('click', () => { reviewShowAnswer = !reviewShowAnswer; render(); });
    app.querySelector('[data-music-toggle]')?.addEventListener('click', () => setMusicOpen(!musicOpen));
    bindMusicPanelControls();
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

    if (game?.phase === 'question' && (game.ends_at || game.read_ends_at)) {
      const reading = !game.ends_at && Boolean(game.read_ends_at);
      const deadline = new Date(reading ? game.read_ends_at : game.ends_at).getTime();
      const duration = reading ? 10 : game.timer_seconds;
      const deadlineKey = `${snapshot?.round?.id || ''}:${reading ? 'read' : 'answer'}`;
      const tick = () => {
        const timer = app.querySelector('[data-timer]');
        if (!timer) return;
        const remainingMs = Math.max(0, deadline - Date.now());
        const left = Math.ceil(remainingMs / 1000);
        timer.style.setProperty('--timer-progress', `${(remainingMs / (duration * 1000)) * 360}deg`);
        timer.classList.toggle('low', !reading && left <= 5);
        const value = timer.querySelector('span');
        if (value) value.textContent = left;
        if (left === 0 && deadlineRefreshRound !== deadlineKey) {
          deadlineRefreshRound = deadlineKey;
          refresh();
        }
      };
      tick();
      ticker = setInterval(tick, 100);
    } else if (game?.phase === 'locked' && game.reveal_at) {
      const tickReveal = () => {
        const left = Math.max(0, Math.ceil((new Date(game.reveal_at) - Date.now()) / 1000));
        const timer = app.querySelector('[data-timer] > span');
        const caption = app.querySelector('[data-reveal-countdown]');
        if (timer) timer.textContent = left;
        if (caption) caption.textContent = left;
        if (left === 0 && deadlineRefreshRound !== `reveal:${snapshot?.round?.id}`) {
          deadlineRefreshRound = `reveal:${snapshot?.round?.id || ''}`;
          refresh();
        }
      };
      tickReveal();
      ticker = setInterval(tickReveal, 250);
    } else if (game?.phase === 'revealed' && game.advance_at && reviewPosition === null) {
      const tickAdvance = () => {
        const deadline = reviewResumeAt || new Date(game.advance_at).getTime();
        const remainingMs = Math.max(0, deadline - Date.now());
        const left = Math.ceil(remainingMs / 1000);
        const caption = app.querySelector('[data-auto-countdown]');
        const progress = app.querySelector('[data-auto-progress]');
        if (caption) caption.textContent = left;
        if (progress) progress.style.setProperty('--auto-progress', `${Math.max(0, Math.min(100, remainingMs / 20000 * 100))}%`);
        if (left === 0 && deadlineRefreshRound !== `advance:${snapshot?.round?.id}`) {
          deadlineRefreshRound = `advance:${snapshot?.round?.id || ''}`;
          stageAndStartRound('next');
        }
      };
      tickAdvance();
      ticker = setInterval(tickAdvance, 50);
    }
    syncMusicProgress();
  }

  loadMusicLibrary();
  window.addEventListener('resize', render, { passive: true });
  window.addEventListener('orientationchange', render, { passive: true });
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
  let digitSelection = [0, 0, 0];
  let stop = () => {};
  let ticker;
  let localTimeUpRound = '';
  let lastPlayerViewKey = '';
  let operationEpoch = 0;
  let refreshRequest = 0;
  let appliedRefresh = 0;
  const spectatorMediaRequested = new Set();
  const suppliedPin = normalisePin(new URLSearchParams(location.search).get('pin') || '');
  let joinDraft = { pin: suppliedPin, name: '' };

  async function refresh() {
    if (!creds || !hasSupabase) return;
    const active = creds;
    const epoch = operationEpoch;
    const request = ++refreshRequest;
    try {
      const next = await rpc('player_snapshot', { p_player_id: active.id, p_player_token: active.token });
      if (epoch !== operationEpoch || creds?.id !== active.id) return;
      if (request < appliedRefresh) return;
      appliedRefresh = request;
      if (suppliedPin && next?.game?.pin && normalisePin(next.game.pin) !== suppliedPin) {
        operationEpoch += 1;
        stop();
        sessionStorage.removeItem(PLAYER);
        creds = null;
        snapshot = null;
        selected = '';
        digitSelection = [0, 0, 0];
        localTimeUpRound = '';
        joinDraft = { pin: suppliedPin, name: String(next?.player?.name || '').trim() };
        error = '';
        render();
        rpc('player_leave_game', { p_player_id: active.id, p_player_token: active.token }).catch(() => {});
        return;
      }
      const hadError = Boolean(error);
      const changed = JSON.stringify(next) !== JSON.stringify(snapshot);
      if (next?.round?.id !== snapshot?.round?.id) {
        selected = '';
        digitSelection = [0, 0, 0];
        localTimeUpRound = '';
      }
      snapshot = next;
      if (!snapshot?.player) {
        sessionStorage.removeItem(PLAYER);
        creds = null;
        snapshot = null;
      }
      error = '';
      if (changed || hadError) render();
      if (snapshot?.player && !snapshot.player.is_alive && snapshot?.question) {
        const spectatorPath = snapshot.game?.phase === 'revealed'
          ? (snapshot.question.answer_image_path || snapshot.question.question_image_path)
          : snapshot.question.question_image_path;
        if (spectatorPath && !decodedMedia.has(spectatorPath) && !spectatorMediaRequested.has(spectatorPath)) {
          spectatorMediaRequested.add(spectatorPath);
          decodeImage(spectatorPath).then(() => render()).catch(() => {});
        }
      }
    } catch (caught) {
      if (epoch !== operationEpoch || request < appliedRefresh) return;
      const message = friendlyConnectionError(caught);
      if (error !== message) {
        error = message;
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
    const epoch = ++operationEpoch;
    busy = true;
    error = '';
    render();
    try {
      const result = (await rpc('join_game', { p_pin: joinDraft.pin, p_name: joinDraft.name }))[0];
      if (epoch !== operationEpoch) return;
      creds = { id: result.player_id, token: result.player_token, gameId: result.game_id };
      saveSession(PLAYER, creds);
      stop();
      stop = watch(creds.gameId, refresh);
      await refresh();
    } catch (caught) {
      if (epoch !== operationEpoch) return;
      error = friendlyJoinError(caught);
    }
    if (epoch !== operationEpoch) return;
    busy = false;
    render();
  }

  async function submit(answer, usePass = false) {
    const active = creds;
    const activeRound = snapshot?.round;
    const epoch = operationEpoch;
    if (!active || !activeRound) return;
    busy = true;
    error = '';
    render();
    try {
      await rpc('submit_answer', {
        p_player_id: active.id, p_player_token: active.token, p_round_id: activeRound.id,
        p_answer: usePass ? null : answer, p_use_pass: usePass
      });
      if (epoch !== operationEpoch || creds?.id !== active.id) return;
      await refresh();
    } catch (caught) {
      if (epoch !== operationEpoch) return;
      error = friendlySubmitError(caught);
    }
    if (epoch !== operationEpoch) return;
    busy = false;
    render();
  }

  async function leave() {
    if (!creds) return;
    const leaving = creds;
    operationEpoch += 1;
    stop();
    sessionStorage.removeItem(PLAYER);
    creds = null;
    snapshot = null;
    selected = '';
    digitSelection = [0, 0, 0];
    localTimeUpRound = '';
    busy = false;
    error = '';
    render();
    try {
      await rpc('player_leave_game', { p_player_id: leaving.id, p_player_token: leaving.token });
    } catch {}
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
    const waitingForRound = player && game && Number(player.eligible_from_round || 0) > Number(game.current_round || 0);
    const eliminatedThisRound = player && game && snapshot?.round
      && !player.is_alive
      && game.phase === 'revealed'
      && Number(player.eliminated_at_round) === Number(snapshot.round.position);
    const locallyExpired = localTimeUpRound && localTimeUpRound === snapshot?.round?.id;
    document.body.dataset.state = player && !player.is_alive ? 'spectator' : game?.phase || (creds ? 'connecting' : 'join');
    const playerViewKey = !creds ? 'join'
      : !snapshot ? 'connecting'
        : eliminatedThisRound ? `eliminated:${snapshot?.round?.id || 'none'}`
          : !player?.is_alive ? `spectator:${snapshot?.round?.id || 'none'}:${game?.phase || 'unknown'}`
          : waitingForRound ? `waiting:${game?.current_round}`
            : `${snapshot?.round?.id || 'lobby'}:${game?.phase || 'unknown'}:${player?.has_locked_answer ? 'locked' : 'open'}`;
    const enterClass = playerViewKey !== lastPlayerViewKey ? 'view-enter' : '';
    lastPlayerViewKey = playerViewKey;
    let body;

    if (!creds) {
      body = `
        <div class="join-layout ${enterClass}">
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
            <div class="join-assurance"><span>${icon('check')} No account needed</span></div>
          </section>
        </div>`;
    } else if (!snapshot) {
      body = `<div class="player-state-card ${enterClass}"><span class="signal-loader"><i></i><i></i><i></i></span><span class="broadcast-kicker">Connecting live</span><h1>Opening your game…</h1><p>Restoring your place in the room.</p></div>`;
    } else if (game.phase === 'finished') {
      body = `
        <div class="player-state-card finale-mobile ${enterClass}">
          <img class="finale-mobile-logo" src="${gameShowLogo}" alt="WMC Game Show">
          <span class="broadcast-kicker"><i></i> Game complete</span>
          <h1>${player.is_alive ? 'You made it!' : 'That was The 1% Club.'}</h1>
          <p class="finale-message"><span>${player.is_alive ? `Congratulations, ${esc(player.name)} — you are still standing.` : `Thanks for playing, ${esc(player.name)}.`}</span><span>May Allah bless your affairs.</span></p>
          <div class="result-status">${player.is_alive ? `${icon('sparkle')} Finalist` : 'Thanks for being part of the show'}</div>
        </div>`;
    } else if (eliminatedThisRound) {
      body = `
        <div class="player-state-card reveal-result incorrect ${enterClass}">
          <div class="result-rays" aria-hidden="true"></div>
          <div class="state-emblem">${icon('x')}</div>
          <span class="broadcast-kicker"><i></i>${submission ? 'Incorrect answer' : 'No answer submitted'}</span>
          <h1>You are out.</h1>
          <p>Correct answer: <strong>${esc(question?.answer_text || 'shown on the main screen')}</strong></p>
          <div class="result-status">Stay connected — spectator mode begins with the next question</div>
        </div>`;
    } else if (!player.is_alive) {
      const spectatorImagePath = game.phase === 'revealed'
        ? (question?.answer_image_path || question?.question_image_path)
        : question?.question_image_path;
      const spectatorImage = spectatorImagePath ? (decodedMedia.get(spectatorImagePath) || '') : '';
      const spectatorSeconds = game.ends_at ? Math.max(0, Math.ceil((new Date(game.ends_at) - Date.now()) / 1000)) : null;
      body = `
        <div class="spectator-experience ${enterClass}">
          <div class="spectator-banner"><span><i></i> Spectator mode</span><strong>${question?.percentage || '–'}% ${game.phase === 'revealed' ? 'answer' : 'question'}</strong></div>
          <div class="spectator-slide ${game.phase === 'revealed' ? 'answer' : ''}">
            ${spectatorImage ? `<img src="${esc(spectatorImage)}" alt="${game.phase === 'revealed' ? 'Answer' : 'Question'} slide">` : `<div class="spectator-wait"><span class="media-spinner"><i></i></span><strong>${game.phase === 'locked' ? "Time's up!" : 'Follow the main screen'}</strong></div>`}
            <div class="spectator-shade"></div>
            <span class="spectator-watermark">Spectator</span>
          </div>
          <div class="spectator-status">
            <div><span class="broadcast-kicker"><i></i> Still part of the show</span><strong>${game.phase === 'revealed' ? `Correct answer: ${esc(question?.answer_text || 'shown above')}` : game.phase === 'locked' ? "Time's up — answer coming next" : spectatorSeconds !== null ? `<span data-spectator-timer>${spectatorSeconds}</span> seconds remaining` : 'Waiting for the next question'}</strong></div>
            <span class="spectator-live"><i></i><span>Connected live</span></span>
          </div>
        </div>`;
    } else if (game.phase === 'lobby') {
      body = `
        <div class="player-state-card welcome-card ${enterClass}">
          <div class="waiting-orbit"><span>${esc(player.name.slice(0, 1).toUpperCase())}</span><i></i><i></i></div>
          <span class="broadcast-kicker"><i></i> You are in</span>
          <h1>Welcome, ${esc(player.name)}.</h1>
          <p>Your name is now on the host screen. Keep this page open and wait for the first question.</p>
          <div class="lobby-confirmation">${icon('check')} Connected to Room ${esc(game.pin)}</div>
        </div>`;
    } else if (waitingForRound) {
      body = `
        <div class="player-state-card welcome-card midgame-wait ${enterClass}">
          <div class="waiting-orbit"><span>${esc(player.name.slice(0, 1).toUpperCase())}</span><i></i><i></i></div>
          <span class="broadcast-kicker"><i></i> Joined live</span>
          <h1>You are in.</h1>
          <p>This question was already underway, so you will enter safely at the start of the next round.</p>
          <div class="lobby-confirmation">${icon('check')} Connected · next round</div>
        </div>`;
    } else if (game.phase === 'question' && !game.ends_at && !player.has_locked_answer) {
      const reading = Boolean(game.read_ends_at);
      const readSeconds = reading ? Math.max(0, Math.ceil((new Date(game.read_ends_at) - Date.now()) / 1000)) : null;
      body = `
        <div class="player-state-card ready-card ${enterClass}">
          <span class="percentage-orb"><span><strong>${question.percentage}</strong><small>%</small></span></span>
          <span class="broadcast-kicker"><i></i> ${reading ? 'Reading time' : 'Question on the main screen'}</span>
          <h1>Read it first.</h1>
          <p>${reading ? 'Take in the whole question. Your answer controls open automatically next.' : 'Your answer controls will open when the host starts the question.'}</p>
          ${question.percentage === 60 ? '<div class="pass-unlocked"><span class="pass-token">P</span><strong>Your pass is now available</strong></div>' : ''}
          ${reading ? `<div class="reading-countdown"><span class="mini-timer reading" data-player-read-timer>${readSeconds}</span><div><strong>Time to read</strong><small>Answers open next</small></div></div>` : '<div class="waiting-bar"><i></i><span>Waiting for host</span></div>'}
        </div>`;
    } else if (game.phase === 'question' && !player.has_locked_answer && !locallyExpired) {
      const seconds = Math.max(0, Math.ceil((new Date(game.ends_at) - Date.now()) / 1000));
      const digitDial = question.input_mode === 'digits-3';
      const choices = Array.isArray(question.choices) ? question.choices : [];
      body = `
        <div class="answer-card">
          <div class="answer-heading"><div><span class="broadcast-kicker"><i></i> ${question.percentage}% question</span><h1>Lock in your answer</h1></div><span class="mini-timer ${seconds <= 5 ? 'low' : ''}" data-player-timer>${seconds}</span></div>
          ${error ? `<div class="notice bad">${err(error)}</div>` : ''}
          <p class="answer-rule">Submission is final! Answer wisely.</p>
          <form class="stack" id="answer-form">
            ${question.answer_kind === 'choice' ? `
              <div class="choice-grid choices-${Math.max(1, choices.length)}" style="--choice-count:${Math.max(1, choices.length)}">${choices.map((choice, index) => {
                const value = choice.match(/^([A-Z])\b/)?.[1] || String.fromCharCode(65 + index);
                return `<button type="button" class="choice ${selected === value ? 'selected' : ''}" data-choice="${esc(value)}" aria-label="Answer ${esc(value)}"><span class="choice-letter">${esc(value)}</span>${selected === value ? icon('check') : ''}</button>`;
              }).join('')}</div><input type="hidden" name="answer" value="${esc(selected)}" required>`
              : digitDial ? `
                <div class="digit-answer" aria-label="Choose a three digit answer">
                  ${digitSelection.map((digit, index) => `<div class="digit-dial" data-digit-index="${index}"><button type="button" data-digit-step="1" aria-label="Increase digit ${index + 1}">⌃</button><span class="digit-previous">${(digit + 9) % 10}</span><strong>${digit}</strong><span class="digit-next">${(digit + 1) % 10}</span><button type="button" data-digit-step="-1" aria-label="Decrease digit ${index + 1}">⌄</button></div>`).join('')}
                  <input type="hidden" name="answer" value="${digitSelection.join('')}">
                </div>`
              : '<label class="field-label answer-input-label">Your answer<input class="field answer-input" name="answer" autocomplete="off" spellcheck="false" placeholder="Type exactly what you mean" required></label>'}
            <button class="btn primary full answer-submit" ${busy ? 'disabled' : ''}>${busy ? '<span class="button-spinner"></span> Submitting…' : `Submit ${icon('arrow')}`}</button>
            ${question.percentage <= 60 ? `<button class="btn pass-button full" type="button" data-pass ${player.pass_available && question.percentage !== 1 && !busy ? '' : 'disabled'}><span class="pass-token">P</span><span><strong>${question.percentage === 1 ? 'Pass unavailable' : player.pass_available ? 'Use my pass' : 'Pass already used'}</strong><small>${question.percentage === 1 ? 'Passes are not available at 1%' : 'Stay in without answering this round'}</small></span></button>` : ''}
          </form>
        </div>`;
      ticker = setInterval(() => {
        const timer = app.querySelector('[data-player-timer]');
        if (!timer) return;
        const left = Math.max(0, Math.ceil((new Date(game.ends_at) - Date.now()) / 1000));
        timer.textContent = left;
        timer.classList.toggle('low', left <= 5);
        if (left === 0) {
          localTimeUpRound = snapshot?.round?.id || '';
          refresh();
          render();
        }
      }, 250);
    } else if (game.phase === 'question' && player.has_locked_answer) {
      body = `
        <div class="player-state-card locked-card ${enterClass}">
          <div class="state-emblem success-emblem">${icon('check')}</div>
          <span class="broadcast-kicker"><i></i> Answer secured</span>
          <h1>${submission?.used_pass ? 'Pass used.' : 'You are locked in.'}</h1>
          <p>Your submission is final. Watch the host screen for the reveal.</p>
          <div class="lock-seal">${icon('lock')} Final answer submitted</div>
        </div>`;
    } else if (game.phase === 'locked' || locallyExpired) {
      body = `<div class="player-state-card locked-card time-up-player ${enterClass}"><div class="state-emblem lock-emblem">${icon('lock')}</div><span class="broadcast-kicker"><i></i> Answers closed</span><h1>Time's up!</h1><p>Eyes on the host screen. The answer is about to be revealed.</p></div>`;
    } else if (game.phase === 'revealed') {
      const correct = submission?.used_pass || submission?.is_correct;
      body = `
        <div class="player-state-card reveal-result ${correct ? 'correct' : 'incorrect'} ${enterClass}">
          <div class="result-rays" aria-hidden="true"></div>
          <div class="state-emblem">${correct ? icon('check') : icon('x')}</div>
          <span class="broadcast-kicker"><i></i>${submission?.used_pass ? 'Pass successful' : correct ? 'Correct answer' : 'Incorrect answer'}</span>
          <h1>${correct ? 'Still in the game!' : 'You are out.'}</h1>
          <p>Correct answer: <strong>${esc(question.answer_text)}</strong></p>
          <div class="result-status">${correct ? `${icon('sparkle')} Get ready for the next question` : 'You will stay connected in spectator mode'}</div>
        </div>`;
    } else {
      body = `<div class="player-state-card ${enterClass}"><span class="signal-loader"><i></i><i></i><i></i></span><span class="broadcast-kicker"><i></i> Live update</span><h1>Stay with us…</h1><p>The next game state is arriving now.</p></div>`;
    }

    app.innerHTML = `
      ${atmosphere()}
      <div class="player-shell">
        ${mobileHeader(game, player)}
        ${error && creds ? `<div class="notice bad player-global-notice">${err(error)}</div>` : ''}
        ${game && question ? levelRail(question.percentage) : ''}
        <main class="player-main">${body}</main>
        <footer class="player-footer"><span>WMC · Wycombe Muslim Collective</span><span>${creds ? '<i class="online-dot"></i> Live' : 'Live gameshow experience'}</span></footer>
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
    const changeDigit = (index, direction) => {
      digitSelection[index] = (digitSelection[index] + direction + 10) % 10;
      render();
    };
    app.querySelectorAll('.digit-dial').forEach((dial) => {
      const index = Number(dial.dataset.digitIndex);
      dial.querySelectorAll('[data-digit-step]').forEach((button) => button.addEventListener('click', () => changeDigit(index, Number(button.dataset.digitStep))));
      dial.addEventListener('wheel', (event) => {
        event.preventDefault();
        changeDigit(index, event.deltaY < 0 ? 1 : -1);
      }, { passive: false });
      let startY = null;
      dial.addEventListener('pointerdown', (event) => { startY = event.clientY; });
      dial.addEventListener('pointerup', (event) => {
        if (startY === null || Math.abs(startY - event.clientY) < 22) return;
        changeDigit(index, startY > event.clientY ? 1 : -1);
      });
    });
    app.querySelector('#answer-form')?.addEventListener('submit', (event) => {
      event.preventDefault();
      const answer = String(new FormData(event.currentTarget).get('answer') || '').trim();
      if (answer) submit(answer);
    });
    app.querySelector('[data-pass]')?.addEventListener('click', () => submit(null, true));
    if (player?.is_alive && game?.phase === 'question' && game.read_ends_at && !game.ends_at) {
      const tickRead = () => {
        const timer = app.querySelector('[data-player-read-timer]');
        if (!timer) return;
        const left = Math.max(0, Math.ceil((new Date(game.read_ends_at) - Date.now()) / 1000));
        timer.textContent = left;
        if (left === 0) refresh();
      };
      tickRead();
      ticker = setInterval(tickRead, 100);
    } else if (player && !player.is_alive && game?.ends_at) {
      ticker = setInterval(() => {
        const timer = app.querySelector('[data-spectator-timer]');
        if (!timer) return;
        timer.textContent = Math.max(0, Math.ceil((new Date(game.ends_at) - Date.now()) / 1000));
      }, 250);
    }
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
  const started = performance.now();
  const finishLoader = async () => {
    try {
      const artwork = loader?.querySelector('.host-loader-mark img');
      if (artwork) {
        try {
          if (!artwork.complete) await Promise.race([
            new Promise((resolve, reject) => {
              artwork.addEventListener('load', resolve, { once: true });
              artwork.addEventListener('error', reject, { once: true });
            }),
            sleep(1500)
          ]);
          await artwork.decode?.().catch(() => {});
          if (artwork.naturalWidth) loader?.classList.add('art-ready');
        } catch { /* The CSS fallback remains visible. */ }
      }
      loader?.classList.add('mark-ready');
      await sleep(Math.max(360, 1250 - (performance.now() - started)));
    } finally {
      loader?.classList.add('loaded');
    }
  };
  finishLoader();
}

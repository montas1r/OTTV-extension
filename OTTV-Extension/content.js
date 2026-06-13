// ============================================================
//   Onetouch Enhancer — content.js  v2.3
//   Fixes: shortcuts, cross-origin iframes, simpler panel UI, 
//          Ready toast, slider↔keyboard sync, strict 0.1x steps,
//          Full-Screen Panel visibility layer, Auto-Close timer
// ============================================================
(function () {
  'use strict';

  // ── Guard: run only in the frame that owns the <video> ────
  if (window !== window.top && !document.querySelector('video')) return;

  function fmtTime(sec) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    return h > 0
      ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      : `${m}:${String(s).padStart(2, '0')}`;
  }

  // ── Toast ─────────────────────────────────────────────────
  let toastTimer = null;
  let toastEl    = null;

  function getToastParent() {
    return document.fullscreenElement || document.webkitFullscreenElement || document.body;
  }

  function showToast(msg) {
    const parent = getToastParent();
    if (!toastEl || toastEl.parentNode !== parent) {
      if (toastEl) toastEl.remove();
      toastEl = document.createElement('div');
      toastEl.id = 'bce-toast';
      toastEl.style.cssText = [
        'position:fixed;top:16px;right:16px;z-index:2147483647;pointer-events:none',
        'display:flex;align-items:center;gap:8px',
        'background:rgba(44,94,173,0.95)', 
        'border:1px solid rgba(75,184,250,0.3);border-left:3px solid #1591DC', 
        'border-radius:4px',
        'box-shadow:0 4px 18px rgba(21,145,220,0.3)', 
        'padding:7px 12px 7px 10px;min-width:80px',
        'opacity:0;transform:translateX(14px)',
        'transition:opacity 0.18s ease,transform 0.18s ease',
        'font-family:-apple-system,sans-serif'
      ].join(';');
      parent.appendChild(toastEl);
    }

    toastEl.innerHTML = `
      <div>
        <span style="display:block;font-size:12px;font-weight:600;color:#c4e2f5;white-space:nowrap;">${msg}</span>
        <span style="display:flex;align-items:center;gap:4px;font-size:9px;color:#ffffff;letter-spacing:.04em;margin-top:2px;opacity:0.9;">
          <svg viewBox="0 0 24 24" style="width:10px;height:10px;fill:#ffffff;"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
          @monumeeent
        </span>
      </div>`;

    toastEl.style.opacity  = '1';
    toastEl.style.transform = 'translateX(0)';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.style.opacity   = '0';
      toastEl.style.transform = 'translateX(14px)';
    }, 2200);
  }

  // ── Speed ─────────────────────────────────────────────────
  function getSavedSpeed() {
    return parseFloat(parseFloat(localStorage.getItem('cpe_speed') || '1').toFixed(1));
  }

  function applySpeed(video, speed) {
    const targetSpeed = parseFloat(speed.toFixed(1));
    video.playbackRate = targetSpeed;
    localStorage.setItem('cpe_speed', String(targetSpeed));
  }

  // ── Fullscreen Panel Management ───────────────────────────
  function getPanelParent() {
    return document.fullscreenElement || document.webkitFullscreenElement || document.body;
  }

  function syncPanelParent() {
    if (!panelEl) return;
    const targetParent = getPanelParent();
    if (panelEl.parentNode !== targetParent) {
      targetParent.appendChild(panelEl);
    }
  }

  function changeSpeed(video, delta) {
    const currentSaved = getSavedSpeed();
    const newSpeed = Math.min(6, Math.max(0.8, +(currentSaved + delta).toFixed(1)));
     
    applySpeed(video, newSpeed);
    showToast(`Speed  ${newSpeed.toFixed(1)}x`);
    updatePanelSpeed(newSpeed);
    resetAutoCloseTimer(); // Reset countdown when keyboard shortcuts alter state
  }

  // ── Floating Panel & Auto-Close Engine ───────────────────
  let panelEl   = null;
  let panelOpen = false;
  let autoCloseTimeout = null;
  const INACTIVITY_LIMIT = 5000; // 5 seconds in milliseconds

  function startAutoCloseTimer() {
    stopAutoCloseTimer();
    if (panelOpen) {
      autoCloseTimeout = setTimeout(() => {
        if (panelOpen) togglePanel();
      }, INACTIVITY_LIMIT);
    }
  }

  function stopAutoCloseTimer() {
    if (autoCloseTimeout) {
      clearTimeout(autoCloseTimeout);
      autoCloseTimeout = null;
    }
  }

  function resetAutoCloseTimer() {
    startAutoCloseTimer();
  }

  function buildPanel() {
    if (panelEl) return;
    panelEl = document.createElement('div');
    panelEl.id = 'bce-panel';
    panelEl.innerHTML = `
      <div class="bce-panel-header">
        <span class="bce-panel-title">Onetouch Enhancer</span>
        <button class="bce-panel-close" id="bce-close">✕</button>
      </div>
      <div class="bce-panel-body">

        <div class="bce-ctrl-row">
          <div class="bce-ctrl-top">
            <span class="bce-ctrl-label">Speed</span>
            <span class="bce-ctrl-val" id="bce-speed-val">1.0x</span>
          </div>
          <input class="bce-slider" type="range" id="bce-speed-slider" min="0.8" max="6" step="0.1" value="1" />
        </div>

        <div class="bce-divider"></div>

        <div class="bce-shortcuts">
          <div class="bce-shortcut-row">
            <span class="bce-shortcut-desc">Speed −/+ (0.1x)</span>
            <span><kbd class="bce-kbd">[</kbd> <kbd class="bce-kbd">]</kbd></span>
          </div>
          <div class="bce-shortcut-row">
            <span class="bce-shortcut-desc">Toggle panel</span>
            <kbd class="bce-kbd">Ctrl+\\</kbd>
          </div>
        </div>

        <div class="bce-panel-wm">
          <svg class="bce-icon-ig" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
          @monumeeent
        </div>
      </div>`;

    getPanelParent().appendChild(panelEl);

    document.getElementById('bce-close').addEventListener('click', togglePanel);

    // Keep panel alive when active mouse metrics hover inside it
    panelEl.addEventListener('mousemove', resetAutoCloseTimer);
    panelEl.addEventListener('mousedown', resetAutoCloseTimer);

    // Speed slider — sync with actual video
    const speedSlider = document.getElementById('bce-speed-slider');
    const speedVal    = document.getElementById('bce-speed-val');
    speedSlider.addEventListener('input', () => {
      const v = parseFloat(parseFloat(speedSlider.value).toFixed(1));
      speedVal.textContent = v.toFixed(1) + 'x';
      const video = findVideo();
      if (video) applySpeed(video, v);
      showToast(`Speed  ${v.toFixed(1)}x`);
      resetAutoCloseTimer(); // Reset timer on active slider dragging
    });

    // Load saved prefs
    const savedSpd = getSavedSpeed();
    speedSlider.value = savedSpd;
    speedVal.textContent = savedSpd.toFixed(1) + 'x';
  }

  function togglePanel() {
    if (!panelEl) buildPanel();
    syncPanelParent(); 
    panelOpen = !panelOpen;
    panelEl.classList.toggle('bce-panel-open', panelOpen);
    
    if (panelOpen) {
      const video = findVideo();
      if (video) updatePanelSpeed(video.playbackRate);
      startAutoCloseTimer(); // Trigger countdown sequence when opened
    } else {
      stopAutoCloseTimer(); // Kill execution timeline if closed manually
    }
  }

  function updatePanelSpeed(speed) {
    const sl = document.getElementById('bce-speed-slider');
    const vl = document.getElementById('bce-speed-val');
    if (sl) { 
      const exactSpeed = parseFloat(speed).toFixed(1);
      sl.value = exactSpeed; 
      vl.textContent = exactSpeed + 'x'; 
    }
  }

  // ── Find the best video element ───────────────────────────
  function findVideo() {
    const videos = Array.from(document.querySelectorAll('video'));
    return videos.sort((a, b) => (b.videoWidth * b.videoHeight) - (a.videoWidth * a.videoHeight))[0] || null;
  }

  // ── Toolbar button ────────────────────────────────────────
  function injectToolbarButton() {
    if (document.getElementById('bce-toolbar-btn')) return;
    const selectors = ['.plyr__controls','[class*="player-controls"]','[class*="control-bar"]','[class*="controls"]'];
    let toolbar = null;
    for (const sel of selectors) { toolbar = document.querySelector(sel); if (toolbar) break; }
    if (!toolbar) return;
    const btn = document.createElement('button');
    btn.id = 'bce-toolbar-btn';
    btn.title = 'Onetouch Enhancer (Ctrl+\\)';
    btn.textContent = '⚙';
    btn.addEventListener('click', (e) => { e.stopPropagation(); togglePanel(); });
    toolbar.appendChild(btn);
  }

  // ── Attach to video ───────────────────────────────────────
  function attachToVideo(video) {
    if (video._bceAttached) return;
    video._bceAttached = true;

    const savedSpeed = getSavedSpeed();
    applySpeed(video, savedSpeed);

    video.addEventListener('canplay', () => {
      const speed = getSavedSpeed();
      applySpeed(video, speed);
      showToast(`Ready  ${speed.toFixed(1)}x`);
    }, { once: true });

    video.addEventListener('ratechange', () => {
      const saved = getSavedSpeed();
      if (Math.abs(video.playbackRate - saved) > 0.01) {
        video.playbackRate = saved;
      }
    });

    setTimeout(injectToolbarButton, 1500);
    setTimeout(injectToolbarButton, 3500);
  }

  // ── Keyboard ──────────────────────────────────────────────
  function handleKey(e) {
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable) return;

    if (e.ctrlKey && (e.key === '\\' || e.code === 'Backslash')) {
      e.preventDefault();
      e.stopPropagation();
      togglePanel();
      return;
    }

    const video = findVideo();
    if (!video) return;

    switch (e.key) {
      case '[':
        e.preventDefault();
        changeSpeed(video, -0.1);
        break;
      case ']':
        e.preventDefault();
        changeSpeed(video, +0.1);
        break;
    }
  }

  // ── MutationObserver for dynamic video elements ───────────
  function watchForVideo() {
    const tryAttach = () => {
      const video = findVideo();
      if (video) attachToVideo(video);
    };
    tryAttach();
    new MutationObserver(tryAttach).observe(document.documentElement, { childList: true, subtree: true });
  }

  // ── Init ──────────────────────────────────────────────────
  function init() {
	watchForVideo();
  
	// Removed the duplicate document listener to prevent the 0.2x double-trigger
	window.addEventListener('keydown', handleKey, true);

	document.addEventListener('fullscreenchange', syncPanelParent);
	document.addEventListener('webkitfullscreenchange', syncPanelParent);
}

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

})();
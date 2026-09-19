(function () {
  const TRACKS = [
    "assets/music/cold_fire-abstract-mysterious-ambient-248631.mp3",
    "assets/music/deuslower-fantasy-medieval-ambient-237371.mp3",
    "assets/music/deuslower-mountain-knight-castle-medieval-fantasy-orchestral-music-264986.mp3",
    "assets/music/deuslower-warmbright-fantasy-ambient-236244.mp3",
    "assets/music/geoffharvey-heavenly-waters-ambient-peaceful-relaxing-ambient-382494.mp3",
    "assets/music/hitslab-fantasy-fantasy-disney-music-454916.mp3",
    "assets/music/menieldm-shadows-beneath-the-keep-495833 (1).mp3",
    "assets/music/onetent-samurai-flutes-ethereal-fantasy-flute-relaxing-meditation-music-248255.mp3",
    "assets/music/romansenykmusic-cinematic-fantasy-dark-160932.mp3",
    "assets/music/sergequadrado-fantasy-14018.mp3",
    "assets/music/sonican-dream-stream-ambient-loop-280973.mp3",
    "assets/music/theojt-peaceful-fantasy-music-160729.mp3",
    "assets/music/tunetank-cinematic-ambient-349101.mp3",
    "assets/music/tunetank-cinematic-ambient-background-348979.mp3",
    "assets/music/tunetank-dreamy-ambient-music-348223.mp3",
  ];

  const GAP_MIN = 15;
  const GAP_MAX = 30;
  const VOLUME = 0.22;

  const audio = new Audio();
  audio.preload = 'metadata';
  audio.volume = VOLUME;

  let lastIndex = -1;
  let started = false;
  let muted = false;      // user mute
  let ducked = false;     // silenced because trailer is playing
  let timer = null;
  let unlockBound = false;

  const btn = document.getElementById('musicToggle');

  function setLabel() {
    if (!btn) return;
    if (!started) {
      btn.textContent = 'Enable music';
      btn.setAttribute('aria-pressed', 'false');
      return;
    }
    btn.textContent = muted ? 'Unmute music' : 'Mute music';
    btn.setAttribute('aria-pressed', muted ? 'false' : 'true');
  }

  function pickIndex() {
    if (TRACKS.length === 0) return -1;
    if (TRACKS.length === 1) return 0;
    let i;
    do { i = Math.floor(Math.random() * TRACKS.length); } while (i === lastIndex);
    return i;
  }

  function gapMs() {
    return (GAP_MIN + Math.random() * (GAP_MAX - GAP_MIN)) * 1000;
  }

  function clearTimer() {
    if (timer) { clearTimeout(timer); timer = null; }
  }

  function scheduleNext(afterMs) {
    clearTimer();
    timer = setTimeout(playNext, afterMs);
  }

  function playNext() {
    if (!started || muted || ducked) return;
    const i = pickIndex();
    if (i < 0) return;
    lastIndex = i;
    audio.src = TRACKS[i];
    audio.volume = VOLUME;
    const p = audio.play();
    if (p && p.catch) p.catch(function () { scheduleNext(gapMs()); });
  }

  audio.addEventListener('ended', function () {
    scheduleNext(gapMs());
  });

  function startPlaylist() {
    if (started) return;
    started = true;
    muted = false;
    setLabel();
    // Same as menu: silence gap before first track.
    scheduleNext(gapMs());
  }

  function unlockOnce() {
    if (unlockBound) return;
    unlockBound = true;
    startPlaylist();
  }

  /** Pause site music while the trailer plays (does not change user mute). */
  function duckForTrailer() {
    if (ducked) return;
    ducked = true;
    clearTimer();
    try { audio.pause(); } catch (e) {}
  }

  /** Resume site music after trailer stops/pauses, unless user muted. */
  function unduckFromTrailer() {
    if (!ducked) return;
    ducked = false;
    if (!started || muted) return;
    // Brief beat, then continue playlist
    scheduleNext(600);
  }

  window.ManafallMusic = {
    duckForTrailer: duckForTrailer,
    unduckFromTrailer: unduckFromTrailer,
    isDucked: function () { return ducked; },
    isStarted: function () { return started; }
  };

  if (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      if (!started) { startPlaylist(); return; }
      muted = !muted;
      if (muted) { audio.pause(); clearTimer(); }
      else if (!ducked) { scheduleNext(800); }
      setLabel();
    });
  }

  ['pointerdown', 'keydown', 'touchstart'].forEach(function (evt) {
    window.addEventListener(evt, unlockOnce, { once: true, passive: true });
  });

  setLabel();
})();

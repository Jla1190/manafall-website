(function () {
  const cfg = window.MANAFALL_SITE || {};

  function youtubeId(url) {
    if (!url) return "";
    const s = String(url).trim();
    if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
    const m = s.match(/(?:youtu\.be\/|youtube\.com\/(?:shorts\/|embed\/|watch\?v=|live\/))([A-Za-z0-9_-]{11})/);
    return m ? m[1] : "";
  }

  const trailerId = youtubeId(cfg.trailerUrl) || "TudrqM7-3_A";
  const embed = document.getElementById("trailerEmbed");
  const watch = document.getElementById("trailerWatchLink");
  if (embed) embed.src = "https://www.youtube.com/embed/" + trailerId;
  if (watch) watch.href = "https://youtube.com/shorts/" + trailerId;
  const year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());

  const dlNote = document.getElementById('downloadNote');
  const kofiNote = document.getElementById('kofiNote');
  const downloadBtn = document.getElementById('downloadBtn');
  const downloadTop = document.getElementById('downloadBtnTop');
  const kofiBtn = document.getElementById('kofiBtn');
  const kofiTop = document.getElementById('kofiBtnTop');
  const downloadLabel = document.getElementById('downloadLabel');

  if (cfg.downloadUrl) {
    [downloadBtn, downloadTop].forEach((btn) => {
      if (!btn) return;
      btn.href = cfg.downloadUrl;
      btn.removeAttribute('aria-disabled');
    });
    if (downloadLabel && cfg.downloadLabel) downloadLabel.textContent = cfg.downloadLabel;
    if (dlNote) {
      dlNote.textContent = 'Windows build · large download. Thanks for playing Manafall.';
      dlNote.classList.add('ready');
    }
  }

  if (cfg.kofiUrl) {
    [kofiBtn, kofiTop].forEach((btn) => {
      if (!btn) return;
      btn.href = cfg.kofiUrl;
      btn.target = '_blank';
      btn.rel = 'noopener noreferrer';
      btn.removeAttribute('aria-disabled');
    });
    if (kofiNote) {
      kofiNote.textContent = 'Opens Ko-fi in a new tab — payment handled by Ko-fi, not this page.';
      kofiNote.classList.add('ready');
    }
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) e.target.classList.add('visible');
    });
  }, { threshold: 0.14 });
  document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

  const glow = document.getElementById('cursorGlow');
  window.addEventListener('pointermove', (e) => {
    if (!glow) return;
    glow.style.left = e.clientX + 'px';
    glow.style.top = e.clientY + 'px';
  }, { passive: true });

  const frame = document.getElementById('heroFrame');
  if (frame) {
    const wrap = frame.parentElement;
    wrap.addEventListener('pointermove', (e) => {
      const r = wrap.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      frame.style.transform = 'rotateY(' + (x * 12) + 'deg) rotateX(' + (-y * 9) + 'deg)';
    });
    wrap.addEventListener('pointerleave', () => {
      frame.style.transform = 'rotateY(0) rotateX(0)';
    });
  }

  document.querySelectorAll('.btn.primary, .btn.kofi').forEach((btn) => {
    btn.addEventListener('pointermove', (e) => {
      const r = btn.getBoundingClientRect();
      const x = e.clientX - r.left - r.width / 2;
      const y = e.clientY - r.top - r.height / 2;
      btn.style.transform = 'translate(' + (x * 0.08) + 'px,' + (y * 0.08 - 2) + 'px)';
    });
    btn.addEventListener('pointerleave', () => { btn.style.transform = ''; });
  });
})();

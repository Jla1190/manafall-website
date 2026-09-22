(function () {
  const cfg = window.MANAFALL_SITE || {};
  const namespace = cfg.counterNamespace || "manafall";
  const base = (cfg.counterApiBase || "https://abacus.jasoncameron.dev").replace(/\/$/, "");

  const KEY_VISITS = "visits";
  const KEY_DOWNLOADS = "downloads";
  const LS_VISIT = "manafall_visit_counted";
  const LS_VISIT_DAY = "manafall_visit_day";
  const LS_DOWNLOAD_SESSION = "manafall_download_counted_session";

  function todayKey() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return "visits-" + y + "-" + m + "-" + day;
  }

  function formatCount(n) {
    if (n == null || Number.isNaN(n)) return "—";
    try {
      return Number(n).toLocaleString();
    } catch (_) {
      return String(n);
    }
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = formatCount(value);
  }

  async function apiGet(key) {
    const res = await fetch(base + "/get/" + encodeURIComponent(namespace) + "/" + encodeURIComponent(key), {
      method: "GET",
      mode: "cors",
      cache: "no-store",
    });
    if (res.status === 404) return 0;
    if (!res.ok) throw new Error("counter get " + res.status);
    const data = await res.json();
    const v = data && (data.value != null ? data.value : data.count);
    return typeof v === "number" ? v : Number(v) || 0;
  }

  async function apiHit(key) {
    const res = await fetch(base + "/hit/" + encodeURIComponent(namespace) + "/" + encodeURIComponent(key), {
      method: "GET",
      mode: "cors",
      cache: "no-store",
    });
    if (!res.ok) throw new Error("counter hit " + res.status);
    const data = await res.json();
    const v = data && (data.value != null ? data.value : data.count);
    return typeof v === "number" ? v : Number(v) || 0;
  }

  async function refreshDisplay() {
    const day = todayKey();
    const [total, today, downloads] = await Promise.all([
      apiGet(KEY_VISITS).catch(() => null),
      apiGet(day).catch(() => null),
      apiGet(KEY_DOWNLOADS).catch(() => null),
    ]);
    setText("statVisitsTotal", total);
    setText("statVisitsToday", today);
    setText("statDownloads", downloads);
    setText("statDownloadsInline", downloads);
  }

  async function countVisitOnce() {
    const day = todayKey();
    let total = null;
    let today = null;

    try {
      if (!localStorage.getItem(LS_VISIT)) {
        total = await apiHit(KEY_VISITS);
        localStorage.setItem(LS_VISIT, "1");
      } else {
        total = await apiGet(KEY_VISITS);
      }
    } catch (_) {
      total = null;
    }

    try {
      if (localStorage.getItem(LS_VISIT_DAY) !== day) {
        today = await apiHit(day);
        localStorage.setItem(LS_VISIT_DAY, day);
      } else {
        today = await apiGet(day);
      }
    } catch (_) {
      today = null;
    }

    setText("statVisitsTotal", total);
    setText("statVisitsToday", today);
  }

  async function countDownload() {
    try {
      // One count per tab session avoids double-fire from two Download buttons.
      if (sessionStorage.getItem(LS_DOWNLOAD_SESSION)) {
        await refreshDisplay();
        return;
      }
      const n = await apiHit(KEY_DOWNLOADS);
      sessionStorage.setItem(LS_DOWNLOAD_SESSION, "1");
      setText("statDownloads", n);
      setText("statDownloadsInline", n);
    } catch (_) {
      /* leave display as-is */
    }
  }

  function wireDownloadButtons() {
    const ids = ["downloadBtn", "downloadBtnTop"];
    ids.forEach((id) => {
      const btn = document.getElementById(id);
      if (!btn) return;
      btn.addEventListener("click", () => {
        countDownload();
      }, { passive: true });
    });
  }

  function boot() {
    wireDownloadButtons();
    countVisitOnce()
      .then(() => apiGet(KEY_DOWNLOADS).then((n) => {
        setText("statDownloads", n);
        setText("statDownloadsInline", n);
      }).catch(() => {}))
      .catch(() => refreshDisplay());
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  window.ManafallCounters = { refresh: refreshDisplay, countDownload };
})();

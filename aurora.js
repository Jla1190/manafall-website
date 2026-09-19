(function () {
  const canvas = document.getElementById('aurora');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: true });
  let w = 0, h = 0, t = 0, mx = 0.5, my = 0.3;
  const ribbons = [];
  const particles = [];

  function resize() {
    w = canvas.width = window.innerWidth * devicePixelRatio;
    h = canvas.height = window.innerHeight * devicePixelRatio;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  }

  for (let i = 0; i < 5; i++) {
    ribbons.push({
      y: 0.15 + i * 0.08,
      amp: 40 + i * 18,
      speed: 0.15 + i * 0.03,
      hue: 190 + i * 18,
      alpha: 0.08 + i * 0.02
    });
  }
  for (let i = 0; i < 60; i++) {
    particles.push({
      x: Math.random(), y: Math.random(),
      z: Math.random(),
      s: 0.4 + Math.random() * 1.6
    });
  }

  window.addEventListener('resize', resize);
  window.addEventListener('pointermove', (e) => {
    mx = e.clientX / window.innerWidth;
    my = e.clientY / window.innerHeight;
  }, { passive: true });

  function draw() {
    t += 0.008;
    const W = window.innerWidth, H = window.innerHeight;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#05080f';
    ctx.fillRect(0, 0, W, H);

    // soft mouse light
    const g = ctx.createRadialGradient(mx * W, my * H, 0, mx * W, my * H, 380);
    g.addColorStop(0, 'rgba(125,211,255,0.10)');
    g.addColorStop(1, 'transparent');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    ribbons.forEach((r, idx) => {
      ctx.beginPath();
      for (let x = 0; x <= W; x += 8) {
        const n = Math.sin(x * 0.004 + t * r.speed + idx) *
                  Math.cos(x * 0.0015 - t * 0.2);
        const y = H * r.y + n * r.amp + (my - 0.5) * 30;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = `hsla(${r.hue}, 90%, 70%, ${r.alpha})`;
      ctx.lineWidth = 28 - idx * 3;
      ctx.shadowColor = `hsla(${r.hue}, 100%, 70%, 0.35)`;
      ctx.shadowBlur = 30;
      ctx.stroke();
    });
    ctx.shadowBlur = 0;

    particles.forEach((p) => {
      p.y -= 0.00035 + p.z * 0.0005;
      if (p.y < 0) { p.y = 1; p.x = Math.random(); }
      const px = p.x * W + (mx - 0.5) * 20 * p.z;
      const py = p.y * H;
      ctx.fillStyle = `rgba(200,230,255,${0.15 + p.z * 0.45})`;
      ctx.beginPath();
      ctx.arc(px, py, p.s, 0, Math.PI * 2);
      ctx.fill();
    });

    requestAnimationFrame(draw);
  }

  resize();
  draw();
})();

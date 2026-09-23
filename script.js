(() => {
  const root = document.documentElement;

  window.addEventListener('pointermove', (event) => {
    root.style.setProperty('--mx', event.clientX + 'px');
    root.style.setProperty('--my', event.clientY + 'px');
  }, { passive: true });

  const title = document.querySelector('.hero-title');
  const text = document.querySelector('.hero-title-text');
  const canvas = document.getElementById('hero-particles');

  if (!title || !text || !canvas) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (reducedMotion.matches) {
    title.classList.add('is-settled');
    return;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    title.classList.add('is-settled');
    return;
  }

  let particles = [];
  let animationFrame = 0;
  let animationStart = 0;
  let resizeTimer = 0;
  let dpr = Math.min(window.devicePixelRatio || 1, 2);

  const PARTICLE_GAP = 5;
  const ASSEMBLE_MS = 760;
  const HOLD_MS = 110;
  const FADE_MS = 230;

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function resizeCanvas() {
    const titleRect = title.getBoundingClientRect();
    const width = Math.max(1, Math.ceil(titleRect.width * 1.28));
    const height = Math.max(1, Math.ceil(titleRect.height * 2.2));

    canvas.width = Math.ceil(width * dpr);
    canvas.height = Math.ceil(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { width, height };
  }

  function makeTargetMap(width, height) {
    const off = document.createElement('canvas');
    off.width = Math.ceil(width * dpr);
    off.height = Math.ceil(height * dpr);
    const offCtx = off.getContext('2d');

    if (!offCtx) return [];

    offCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const style = getComputedStyle(title);
    const fontSize = parseFloat(style.fontSize);
    const fontWeight = style.fontWeight;
    const fontFamily = style.fontFamily;
    const letterSpacing = parseFloat(style.letterSpacing) || 0;

    const label = 'DSK / MIRA';
    offCtx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    offCtx.textBaseline = 'middle';
    offCtx.fillStyle = '#ffffff';

    const measured = offCtx.measureText(label).width + letterSpacing * (label.length - 1);
    const startX = Math.max(0, (width - measured) / 2);
    const y = height / 2;

    let x = startX;
    for (const char of label) {
      offCtx.fillText(char, x, y);
      x += offCtx.measureText(char).width + letterSpacing;
    }

    const pixels = offCtx.getImageData(0, 0, off.width, off.height).data;
    const points = [];
    const gap = window.innerWidth < 650 ? 6 : PARTICLE_GAP;

    for (let py = 0; py < height; py += gap) {
      for (let px = 0; px < width; px += gap) {
        const ix = Math.min(off.width - 1, Math.floor(px * dpr));
        const iy = Math.min(off.height - 1, Math.floor(py * dpr));
        const alpha = pixels[(iy * off.width + ix) * 4 + 3];

        if (alpha > 90) points.push({ x: px, y: py });
      }
    }

    return points;
  }

  function randomStart(width, height) {
    const side = Math.floor(Math.random() * 4);
    const spread = 100 + Math.random() * 180;

    if (side === 0) return { x: -spread, y: Math.random() * height };
    if (side === 1) return { x: width + spread, y: Math.random() * height };
    if (side === 2) return { x: Math.random() * width, y: -spread };
    return { x: Math.random() * width, y: height + spread };
  }

  function buildParticles() {
    const { width, height } = resizeCanvas();
    const targets = makeTargetMap(width, height);

    particles = targets.map((target, index) => {
      const start = randomStart(width, height);
      return {
        sx: start.x,
        sy: start.y,
        tx: target.x,
        ty: target.y,
        radius: 0.6 + Math.random() * 1.15,
        alpha: 0.35 + Math.random() * 0.65,
        delay: Math.min(150, (index % 31) * 3 + Math.random() * 45)
      };
    });

    return { width, height };
  }

  function draw(now, size) {
    if (!animationStart) animationStart = now;

    const elapsed = now - animationStart;
    ctx.clearRect(0, 0, size.width, size.height);

    const fadeStart = ASSEMBLE_MS + HOLD_MS;
    const fadeProgress = Math.min(1, Math.max(0, (elapsed - fadeStart) / FADE_MS));

    for (const p of particles) {
      const local = Math.min(1, Math.max(0, (elapsed - p.delay) / ASSEMBLE_MS));
      const eased = easeOutCubic(local);
      const x = p.sx + (p.tx - p.sx) * eased;
      const y = p.sy + (p.ty - p.sy) * eased;

      ctx.globalAlpha = p.alpha * (1 - fadeProgress);
      ctx.beginPath();
      ctx.arc(x, y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = '#f3f1ec';
      ctx.fill();
    }

    ctx.globalAlpha = 1;

    if (elapsed >= ASSEMBLE_MS - 30) {
      title.classList.add('is-settled');
    }

    if (fadeProgress < 1) {
      animationFrame = requestAnimationFrame((time) => draw(time, size));
    } else {
      ctx.clearRect(0, 0, size.width, size.height);
      title.classList.remove('is-animating');
    }
  }

  function start() {
    cancelAnimationFrame(animationFrame);
    animationStart = 0;

    title.classList.remove('is-settled');
    title.classList.add('is-animating');

    const size = buildParticles();

    if (particles.length === 0) {
      title.classList.remove('is-animating');
      title.classList.add('is-settled');
      return;
    }

    animationFrame = requestAnimationFrame((time) => draw(time, size));
  }

  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(start, 180);
  });

  window.addEventListener('load', () => {
    window.setTimeout(start, 120);
  }, { once: true });
})();

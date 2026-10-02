(() => {
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.nav-links');
  const navAnchors = [...document.querySelectorAll('.nav-links a')];
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
      nav.classList.toggle('open', open);
    });
    navAnchors.forEach(anchor => anchor.addEventListener('click', () => {
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Open navigation');
      nav.classList.remove('open');
    }));
  }

  const canvas = document.getElementById('data-sphere');
  const visual = document.querySelector('.hero-visual');
  if (!canvas || !visual) return;
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const lowPower = window.matchMedia('(max-width: 760px)').matches || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);
  const count = lowPower ? 52 : 104;
  const points = [];
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const radius = Math.sqrt(1 - y * y);
    const theta = goldenAngle * i;
    points.push({ x: Math.cos(theta) * radius, y, z: Math.sin(theta) * radius, phase: i * .17 });
  }
  let width = 0, height = 0, ratio = 1, pointerX = 0, pointerY = 0, currentX = 0, currentY = 0, frame = 0;
  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    ratio = Math.min(window.devicePixelRatio || 1, lowPower ? 1.35 : 1.8);
    width = rect.width; height = rect.height;
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  };
  const setPointer = event => {
    const rect = visual.getBoundingClientRect();
    pointerX = ((event.clientX - rect.left) / rect.width - .5) * .38;
    pointerY = ((event.clientY - rect.top) / rect.height - .5) * .32;
  };
  visual.addEventListener('pointermove', setPointer, { passive: true });
  visual.addEventListener('pointerleave', () => { pointerX = 0; pointerY = 0; }, { passive: true });
  window.addEventListener('resize', resize, { passive: true });
  resize();
  const render = time => {
    frame = requestAnimationFrame(render);
    if (!width || !height) return;
    if (reducedMotion && time > 30) cancelAnimationFrame(frame);
    const tick = reducedMotion ? 0 : time * .00016;
    currentX += (pointerX - currentX) * .035;
    currentY += (pointerY - currentY) * .035;
    const rotationY = tick + currentX;
    const rotationX = Math.sin(tick * .8) * .16 + currentY;
    const cx = width * .5, cy = height * .5, radius = Math.min(width, height) * .31;
    ctx.clearRect(0, 0, width, height);
    const projected = points.map(point => {
      const x1 = point.x * Math.cos(rotationY) - point.z * Math.sin(rotationY);
      const z1 = point.x * Math.sin(rotationY) + point.z * Math.cos(rotationY);
      const y1 = point.y * Math.cos(rotationX) - z1 * Math.sin(rotationX);
      const z2 = point.y * Math.sin(rotationX) + z1 * Math.cos(rotationX);
      const perspective = 1 / (1.6 - z2 * .44);
      return { x: cx + x1 * radius * perspective, y: cy + y1 * radius * perspective, z: z2, depth: perspective, phase: point.phase };
    });
    for (let i = 0; i < projected.length; i++) {
      const p = projected[i];
      for (let j = i + 1; j < projected.length; j++) {
        const q = projected[j];
        const dx = p.x - q.x, dy = p.y - q.y;
        const distance = dx * dx + dy * dy;
        if (distance < (radius * .31) ** 2 && Math.abs(p.z - q.z) < .36) {
          const opacity = Math.max(0, (1 - Math.sqrt(distance) / (radius * .31)) * (.11 + (p.z + q.z + 2) * .045));
          ctx.strokeStyle = `rgba(116,224,200,${opacity})`;
          ctx.lineWidth = .65;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
        }
      }
    }
    for (const point of projected) {
      const front = (point.z + 1) / 2;
      const pulse = reducedMotion ? 0 : Math.sin(time * .001 + point.phase) * .35;
      const size = Math.max(.7, (1 + front * 1.55) * (lowPower ? .85 : 1) + pulse * .35);
      ctx.beginPath(); ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
      ctx.fillStyle = front > .66 ? `rgba(179,255,230,${.55 + front * .4})` : `rgba(116,224,200,${.24 + front * .52})`;
      ctx.shadowBlur = front > .7 ? 10 : 0; ctx.shadowColor = '#74e0c8'; ctx.fill();
    }
    ctx.shadowBlur = 0;
    const glow = ctx.createRadialGradient(cx, cy, radius * .48, cx, cy, radius * 1.2);
    glow.addColorStop(0, 'rgba(35,126,115,0)'); glow.addColorStop(.72, 'rgba(70,179,158,.035)'); glow.addColorStop(1, 'rgba(70,179,158,0)');
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(cx, cy, radius * 1.2, 0, Math.PI * 2); ctx.fill();
  };
  requestAnimationFrame(render);
})();

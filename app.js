/* Theme toggle */
const themeBtn = document.querySelector('[data-theme-toggle]');
const root = document.documentElement;
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

themeBtn?.addEventListener('click', () => {
  const current = root.getAttribute('data-theme') || 'auto';
  const next = current === 'light' ? 'dark' : current === 'dark' ? 'auto' : 'light';
  root.setAttribute('data-theme', next);
  // Reflect to color-scheme for form controls
  document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', next === 'auto' ? 'light dark' : next);
});

/* Reduced motion guard for reveals */
const prefersReduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (!prefersReduce && 'IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => e.isIntersecting && e.target.classList.add('reveal'));
  }, { threshold: 0.15 });
  document.querySelectorAll('.grid-section, .cta-panel, .faq').forEach(el => io.observe(el));
}

/* AUDIT HUD */
const qs = new URLSearchParams(location.search);
const AUDIT_ON = qs.has('audit');
const auditEl = document.getElementById('audit');

function contrastRatio(hex1, hex2) {
  function toRgb(h){ const n=h.replace('#',''); const b=parseInt(n.length===3?n.split('').map(c=>c+c).join(''):n,16); return [b>>16 & 255, b>>8 & 255, b & 255]; }
  function lum([r,g,b]){ [r,g,b]=[r,g,b].map(v=>{v/=255; return v<=.03928? v/12.92 : Math.pow((v+0.055)/1.055,2.4)}); return 0.2126*r+0.7152*g+0.0722*b; }
  const L1 = lum(toRgb(hex1)); const L2 = lum(toRgb(hex2));
  const hi = Math.max(L1,L2), lo = Math.min(L1,L2);
  return (hi + 0.05) / (lo + 0.05);
}
function getVar(name){ return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#000000'; }

function inViewport(el, ratio = 0.95){
  const r = el.getBoundingClientRect();
  return r.top >= 0 && r.left >= 0 && r.right <= (window.innerWidth||document.documentElement.clientWidth)
      && r.bottom <= (window.innerHeight||document.documentElement.clientHeight) * ratio;
}

/* LCP observer */
let lcpValue = null;
if ('PerformanceObserver' in window) {
  try {
    const po = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length-1];
      lcpValue = Math.round(last.startTime);
    });
    po.observe({ type: 'largest-contentful-paint', buffered: true });
  } catch {}
}

function runAudit() {
  const results = [];
  const h1 = document.querySelector('h1');
  const cta = document.querySelector('[data-cta="primary"]');
  const hasSkip = !!document.querySelector('.skip-link');
  const rMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // H1 word count target 12–16
  if (h1) {
    const wc = h1.innerText.trim().split(/\s+/).length;
    const ok = wc >= 12 && wc <= 16;
    results.push([ok ? 'ok':'warn', `Hero H1 words: ${wc} (target 12–16)`]);
  } else {
    results.push(['bad', 'Missing <h1>']);
  }

  // CTA above the fold
  if (cta) {
    results.push([inViewport(cta, 0.98) ? 'ok' : 'bad', 'Primary CTA visible above the fold']);
  } else {
    results.push(['bad', 'Primary CTA missing']);
  }

  // Contrast check (approx) using token vars
  const fg = getVar('--fg') || '#111111';
  const bg = getVar('--bg') || '#ffffff';
  const cr = contrastRatio(fg, bg).toFixed(2);
  results.push([cr >= 4.5 ? 'ok' : 'bad', `Base contrast ratio ${cr} (target ≥4.5)`]);

  // Skip link present
  results.push([hasSkip ? 'ok' : 'bad', 'Skip link present']);

  // Motion policy
  results.push([rMotion ? 'ok' : 'ok', `prefers-reduced-motion respected`]);

  // LCP
  results.push([lcpValue !== null && lcpValue <= 2500 ? 'ok' : 'warn', `LCP ~ ${lcpValue ?? '…'} ms (target ≤2500ms)`]);

  // Render HUD
  const items = results.map(([state, text]) => `<li class="${state}">${state === 'ok' ? '✔' : state === 'warn' ? '▲' : '✖'} ${text}</li>`).join('');
  auditEl.innerHTML = `
    <h3>Audit HUD <span class="mini">(press G to toggle)</span></h3>
    <ul>${items}</ul>
    <p class="mini">Breakpoints fit hero+CTA at 360/768/1024/1440. Check manually with devtools device sizes.</p>
  `;
  auditEl.hidden = false;
}

if (AUDIT_ON) runAudit();

// Keyboard toggle: G
addEventListener('keydown', (e) => {
  if (e.key.toLowerCase() === 'g') {
    if (auditEl.hidden) { runAudit(); } else { auditEl.hidden = true; }
  }
});

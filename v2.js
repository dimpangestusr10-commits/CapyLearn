/* CapyLearn V2 Experience Layer — vanilla JS, non-destructive */
(() => {
  'use strict';

  const body = document.body;
  if (!body) return;

  const page = (location.pathname.split('/').pop() || 'index.html').replace('.html','') || 'home';
  body.dataset.v2Page = page === 'index' ? 'home' : page;
  body.classList.add('v2-enter');

  // Page veil
  const veil = document.createElement('div');
  veil.className = 'v2-page-veil';
  veil.setAttribute('aria-hidden','true');
  body.appendChild(veil);
  setTimeout(() => body.classList.remove('v2-enter'), 850);

  // Scroll state
  const syncScroll = () => body.classList.toggle('v2-scrolled', window.scrollY > 24);
  syncScroll();
  window.addEventListener('scroll', syncScroll, {passive:true});

  // Ambient cursor light on precise pointers only
  if (matchMedia('(pointer:fine)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    body.classList.add('v2-pointer');
    const spot = document.createElement('div');
    spot.className = 'v2-spotlight';
    body.appendChild(spot);
    let tx = innerWidth/2, ty = innerHeight/3, x = tx, y = ty;
    addEventListener('pointermove', e => { tx=e.clientX; ty=e.clientY; }, {passive:true});
    const loop = () => {
      x += (tx-x)*.09; y += (ty-y)*.09;
      spot.style.left = x+'px'; spot.style.top = y+'px';
      requestAnimationFrame(loop);
    };
    loop();
  }

  // Reveal system
  const revealSelectors = [
    'section > .container > *', '.world-card', '.category-card', '.game-card',
    '.badge-card', '.stat-card', '.progress-card', '.story-card', '.identity-card',
    '.principles-card', '.vision-grid > *', '.project-stats > *', '.contact-card',
    '.lesson-card', '.word-card', '.practice-card'
  ];
  const revealNodes = [...document.querySelectorAll(revealSelectors.join(','))]
    .filter((el, i, arr) =>
      arr.indexOf(el) === i &&
      !el.closest('.nav-menu') &&
      !el.closest('#about')
    );
  revealNodes.forEach((el, i) => {
    el.classList.add('v2-reveal');
    el.style.setProperty('--v2-delay', `${Math.min((i%5)*55,220)}ms`);
  });

  if ('IntersectionObserver' in window) {
    const ro = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('v2-visible');
          ro.unobserve(entry.target);
        }
      });
    }, {threshold:.08, rootMargin:'0px 0px -4% 0px'});
    revealNodes.forEach(el => ro.observe(el));
  } else {
    revealNodes.forEach(el => el.classList.add('v2-visible'));
  }

  // Premium card spotlight + gentle tilt
  const cardSelectors = [
    '.world-card','.category-card','.game-card','.badge-card','.stat-card',
    '.progress-card','.story-card','.lesson-card','.word-card','.practice-card',
    '.creator-portrait-card','.identity-card','.contact-card'
  ];
  const cards = [...document.querySelectorAll(cardSelectors.join(','))]
    .filter((el,i,a)=>a.indexOf(el)===i);
  cards.forEach(el => el.classList.add('v2-card'));

  if (matchMedia('(pointer:fine)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    cards.forEach(card => {
      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX-r.left)/r.width;
        const py = (e.clientY-r.top)/r.height;
        card.style.setProperty('--v2-x', `${px*100}%`);
        card.style.setProperty('--v2-y', `${py*100}%`);
        const rx = (0.5-py)*3.2;
        const ry = (px-0.5)*4.2;
        card.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-4px)`;
      });
      card.addEventListener('pointerleave', () => { card.style.transform=''; });
    });
  }

  // Hero floating elements / mascot visual life
  const floatNodes = document.querySelectorAll(
    '.mascot, .hero img, .learn-hero img, .animal-hero img, .fruit-hero img, .plant-hero img, .color-hero img, .number-hero img, .floating-chip'
  );
  floatNodes.forEach((el,i) => {
    if (!el.closest('.brand')) {
      el.classList.add('v2-float');
      el.style.setProperty('--v2-float-delay', `${-(i%4)*.8}s`);
    }
  });

  // Particle field only in first hero-like section
  const hero = document.querySelector(
    '.hero,.learn-hero,.practice-hero,.games-hero,.progress-hero,.creator-hero,.animal-hero,.fruit-hero,.plant-hero,.color-hero,.number-hero'
  );
  if (hero && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const field = document.createElement('div');
    field.className='v2-particle-field';
    const palette = ['rgba(123,110,246,.75)','rgba(103,200,255,.72)','rgba(255,215,106,.72)','rgba(120,225,176,.65)','rgba(255,154,132,.62)'];
    for (let i=0;i<12;i++) {
      const p=document.createElement('i'); p.className='v2-particle';
      p.style.setProperty('--x', `${4 + ((i*23)%92)}%`);
      p.style.setProperty('--y', `${8 + ((i*37)%78)}%`);
      p.style.setProperty('--s', `${3 + (i%4)}px`);
      p.style.setProperty('--c', palette[i%palette.length]);
      p.style.setProperty('--d', `${4.6 + (i%5)*.7}s`);
      p.style.setProperty('--delay', `${-(i%6)*.55}s`);
      p.style.setProperty('--dx', `${-12 + (i%5)*6}px`);
      field.appendChild(p);
    }
    hero.prepend(field);
  }

  // Magnetic buttons
  if (matchMedia('(pointer:fine)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.querySelectorAll('.primary-button,.nav-button,.instagram-button').forEach(btn => {
      btn.classList.add('v2-magnetic');
      btn.addEventListener('pointermove', e => {
        const r=btn.getBoundingClientRect();
        const x=(e.clientX-r.left-r.width/2)*.10;
        const y=(e.clientY-r.top-r.height/2)*.12;
        btn.style.transform=`translate(${x}px,${y}px)`;
      });
      btn.addEventListener('pointerleave', ()=> btn.style.transform='');
    });
  }

  // Animate obvious numeric stat elements when first visible, without touching live score counters.
  const statCandidates = [...document.querySelectorAll('.project-stats strong, .creator-mini-stats strong')];
  const numericStats = statCandidates.filter(el => /^\d+$/.test(el.textContent.trim()));
  const animateNumber = el => {
    const end = Number(el.textContent.trim());
    if (!Number.isFinite(end) || end < 2 || el.dataset.v2Counted) return;
    el.dataset.v2Counted='1';
    const start=performance.now(), dur=900;
    const tick = now => {
      const t=Math.min(1,(now-start)/dur);
      const eased=1-Math.pow(1-t,3);
      el.textContent=Math.round(end*eased);
      if (t<1) requestAnimationFrame(tick); else el.textContent=end;
    };
    requestAnimationFrame(tick);
  };
  if ('IntersectionObserver' in window) {
    const no = new IntersectionObserver(entries => entries.forEach(e => {
      if (e.isIntersecting) { animateNumber(e.target); no.unobserve(e.target); }
    }), {threshold:.5});
    numericStats.forEach(el=>no.observe(el));
  }

  // Soft page transition for internal HTML navigation, preserve hashes/new tabs/downloads.
  document.addEventListener('click', e => {
    const a=e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (a.target === '_blank' || a.hasAttribute('download')) return;
    const href=a.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
    if (!href.includes('.html')) return;
    e.preventDefault();
    body.classList.add('v2-leave');
    setTimeout(()=>location.href=href, 360);
  });



  // Robust hash navigation (notably index.html#about)
  // Ensures reveal layers cannot leave the target section visually blank.
  const revealHashTarget = () => {
    const hash = location.hash;
    if (!hash || hash.length < 2) return;

    let target;
    try {
      target = document.querySelector(hash);
    } catch (_) {
      return;
    }
    if (!target) return;

    // HARD FIX for About:
    // The About CTA must never remain hidden by either the original reveal
    // animation or the V2 IntersectionObserver layer.
    if (target.id === 'about') {
      const aboutNodes = [
        target,
        ...target.querySelectorAll('*')
      ];

      aboutNodes.forEach(el => {
        if (el.classList) {
          el.classList.add('visible', 'v2-visible');
          el.classList.remove('v2-reveal');
        }

        if (el instanceof HTMLElement) {
          el.style.removeProperty('opacity');
          el.style.removeProperty('visibility');
          el.style.removeProperty('filter');
        }
      });

      const card = target.querySelector('.cta-card');
      if (card) {
        card.style.setProperty('display', 'grid', 'important');
        card.style.setProperty('opacity', '1', 'important');
        card.style.setProperty('visibility', 'visible', 'important');
        card.style.setProperty('transform', 'none', 'important');
        card.style.setProperty('filter', 'none', 'important');
      }
    }

    // Force both the original page reveal system and V2 reveal system visible
    // for the target and anything hidden inside it.
    const candidates = [target, ...target.querySelectorAll('.reveal, .v2-reveal')];
    candidates.forEach(el => {
      el.classList.add('visible', 'v2-visible');
      el.style.removeProperty('opacity');
      el.style.removeProperty('filter');
    });

    // Let the page entrance veil finish, then align the requested section.
    requestAnimationFrame(() => {
      setTimeout(() => {
        target.scrollIntoView({
          behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
          block: 'start'
        });
      }, body.classList.contains('v2-enter') ? 760 : 40);
    });
  };

  window.addEventListener('DOMContentLoaded', revealHashTarget);
  window.addEventListener('pageshow', revealHashTarget);
  window.addEventListener('hashchange', revealHashTarget);

  // Same-document links such as index.html#about should not reload the page.
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href]');
    if (!a || e.defaultPrevented) return;
    const raw = a.getAttribute('href');
    if (!raw || !raw.includes('#')) return;

    let url;
    try { url = new URL(raw, location.href); } catch (_) { return; }
    if (url.origin !== location.origin || url.pathname !== location.pathname || !url.hash) return;

    const target = document.querySelector(url.hash);
    if (!target) return;

    e.preventDefault();
    history.pushState(null, '', url.hash);
    revealHashTarget();
  });

  // Tiny reusable toast API
  window.CapyV2Toast = msg => {
    let t=document.querySelector('.v2-toast');
    if (!t) { t=document.createElement('div'); t.className='v2-toast'; body.appendChild(t); }
    t.textContent=msg; t.classList.add('show');
    clearTimeout(t._timer); t._timer=setTimeout(()=>t.classList.remove('show'),2100);
  };
})();

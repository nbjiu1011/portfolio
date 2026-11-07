/* =========================================================
   motion.js — GSAP + ScrollTrigger (+ Lenis, 데스크톱만)
   하나의 모션 시스템: ease = expo.out 계열, 0.6~1.2초, 스크롤은 scrub
   ========================================================= */
(function () {
  'use strict';
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var C = window.Chrome || null;
  var curtain = document.querySelector('.curtain');

  function finishStatic() {
    root.classList.remove('intro-pending');
    root.classList.add('motion-off');
    if (curtain) curtain.remove();
    if (C) { C.state.intro = 1; C.wake(); }
  }
  if (!window.gsap || !window.ScrollTrigger || reduce) { finishStatic(); return; }

  gsap.registerPlugin(ScrollTrigger);
  root.classList.add('js-motion');
  var EASE = 'expo.out';
  var wake = function () { if (C) C.wake(); };

  /* ---------- Lenis: 데스크톱에서만, ScrollTrigger와 같은 ticker로 동기화 ---------- */
  if (window.Lenis && fine) {
    var lenis = new window.Lenis({ lerp: 0.1, smoothWheel: true, wheelMultiplier: 1 });
    window.lenis = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  /* ---------- 1. Intro (약 1.9초): 검은 화면 → 로고 → 3D → 타이포 → 내비 ---------- */
  var heroLines = gsap.utils.toArray('.hero .ln > span');
  gsap.set(heroLines, { yPercent: 115 });
  gsap.set(['.nav', '.hero-intro', '.hero-corner', '.scroll-cue', '.drag-hint'], { autoAlpha: 0 });
  root.classList.remove('intro-pending');

  var intro = gsap.timeline({ defaults: { ease: EASE } });
  intro.to('.curtain-logo', { opacity: 1, duration: 0.45, ease: 'power2.out' }, 0.05)
       .to('.curtain-logo', { opacity: 0, duration: 0.35, ease: 'power2.in' }, 0.6)
       .to('.curtain', { opacity: 0, duration: 0.6, ease: 'power2.inOut', onComplete: function () { if (curtain) curtain.remove(); } }, 0.75);
  if (C) intro.to(C.state, { intro: 1, duration: 1.3, ease: 'expo.out', onUpdate: wake }, 0.7);
  intro.to(heroLines, { yPercent: 0, duration: 1.0, stagger: 0.08 }, 0.95)
       .to(['.hero-intro', '.hero-corner'], { autoAlpha: 1, y: 0, duration: 0.8 }, 1.15)
       .fromTo('.nav', { autoAlpha: 0, y: -12 }, { autoAlpha: 1, y: 0, duration: 0.8 }, 1.2)
       .to(['.scroll-cue', '.drag-hint'], { autoAlpha: 1, duration: 0.6 }, 1.35);

  var mm = gsap.matchMedia();

  /* ---------- 2. 3D 오브젝트: 스크롤에 따라 위치·크기·회전·투명도 ---------- */
  if (C) {
    mm.add({ desk: '(min-width: 901px)', mob: '(max-width: 900px)' }, function (ctx) {
      var d = ctx.conditions.desk;
      // Hero → About: 왼쪽으로 비켜서며 커지고 돌아감
      // 본문 가독성을 위해 About에서는 반투명한 배경 조형으로 물러남
      gsap.fromTo(C.state, { x: 0, y: 0, scale: 1, rot: 0, tilt: 0, opacity: 1, spread: 0 }, {
        spread: 1, x: d ? -1.7 : 0, y: d ? -0.05 : 0.2, scale: d ? 1.22 : 1.08, rot: 1.3, tilt: 0.18, opacity: d ? 0.24 : 0.2, ease: 'none', immediateRender: false,
        scrollTrigger: { trigger: '#home', start: 'top top', end: 'bottom top', scrub: 1, onUpdate: wake }
      });
      // About → Work: 커지며 사라짐 (사라진 뒤 렌더링 중지)
      gsap.fromTo(C.state, { opacity: d ? 0.24 : 0.2 }, {
        opacity: 0, scale: d ? 1.45 : 1.25, ease: 'none', immediateRender: false,
        scrollTrigger: { trigger: '#work', start: 'top 95%', end: 'top 25%', scrub: 1, onUpdate: wake }
      });
      // Contact: 다시 등장
      gsap.fromTo(C.state, { opacity: 0, spread: 1, x: d ? 1.6 : 0, y: d ? -0.2 : 0.6, scale: d ? 0.72 : 0.8, rot: 0.6, tilt: 0 }, {
        spread: 0, opacity: d ? 0.95 : 0.35, x: d ? 0.75 : 0, y: d ? 0.45 : 0.9, scale: d ? 0.86 : 0.9, rot: 0, tilt: 0.05, ease: 'none', immediateRender: false,
        scrollTrigger: { trigger: '#contact', start: 'top bottom', end: 'top top', scrub: 1, onUpdate: wake }
      });
    });
  }

  /* Hero 타이포가 스크롤에 따라 위로 빠짐 */
  gsap.to('.hero-title', { yPercent: -28, opacity: 0.1, ease: 'none', scrollTrigger: { trigger: '#home', start: 'top top', end: 'bottom top', scrub: 0.8 } });
  gsap.to(['.hero-intro', '.hero-corner', '.scroll-cue', '.drag-hint'], { y: -60, opacity: 0, ease: 'none', scrollTrigger: { trigger: '#home', start: '20% top', end: '70% top', scrub: 0.8 } });

  /* ---------- 3. 섹션 제목: 줄 단위 split reveal ---------- */
  gsap.utils.toArray('.section .big, .contact .big').forEach(function (h) {
    gsap.from(h.querySelectorAll('.ln > span'), { yPercent: 115, duration: 1.1, stagger: 0.09, ease: EASE, scrollTrigger: { trigger: h, start: 'top 85%', once: true } });
  });
  gsap.utils.toArray('.sec-label').forEach(function (el) {
    gsap.from(el, { opacity: 0, duration: 0.9, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
  });

  /* ---------- 4. About: 단어를 감싸고, 스크롤에 따라 한 줄씩 밝아짐 ---------- */
  var copy = document.querySelector('.about-copy');
  if (copy) {
    var words = [];
    (function wrap(node, hl) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            var s = document.createElement('span'); s.className = 'w' + (hl ? ' hl' : ''); s.textContent = part;
            frag.appendChild(s); words.push(s);
          });
          n.parentNode.replaceChild(frag, n);
        } else if (n.nodeType === 1) {
          wrap(n, hl || n.classList.contains('hl'));
        }
      });
    })(copy, false);
    var lines = [];
    var group = function () {
      lines = []; var top = null, cur = null;
      words.forEach(function (w) {
        var t = w.offsetTop + w.parentNode.offsetTop;
        if (top === null || Math.abs(t - top) > 6) { cur = []; lines.push(cur); top = t; }
        cur.push(w);
      });
    };
    group();
    ScrollTrigger.addEventListener('refreshInit', group);
    ScrollTrigger.create({
      trigger: copy, start: 'top 78%', end: 'bottom 52%', scrub: true,
      onUpdate: function (self) {
        var n = Math.round(self.progress * lines.length);
        lines.forEach(function (l, i) { var on = i < n; l.forEach(function (w) { w.classList.toggle('on', on); }); });
      }
    });
  }
  gsap.from('.bring li', { opacity: 0, y: 30, duration: 1, stagger: 0.1, ease: EASE, scrollTrigger: { trigger: '.bring', start: 'top 85%', once: true } });

  /* ---------- 5. Work ---------- */
  gsap.from('.windex li', { opacity: 0, y: 24, duration: 0.9, stagger: 0.07, ease: EASE, scrollTrigger: { trigger: '.windex', start: 'top 85%', once: true } });
  gsap.from('.work-note', { opacity: 0, y: 20, duration: 0.9, ease: EASE, scrollTrigger: { trigger: '.work-note', start: 'top 90%', once: true } });

  gsap.utils.toArray('.show').forEach(function (s) {
    var box = s.querySelector('.stagebox');
    var tilt = s.querySelector('.tilt');
    var title = s.querySelectorAll('.show-title .ln > span');
    var meta = s.querySelectorAll('.show-num, .show-cat, .show-lede, .show-links, .show-title small');
    var tl = gsap.timeline({ scrollTrigger: { trigger: s, start: 'top 72%', once: true } });
    if (box) {
      tl.fromTo(box, { clipPath: 'inset(100% 0% 0% 0% round 6px)' }, { clipPath: 'inset(0% 0% 0% 0% round 6px)', duration: 1.3, ease: 'expo.inOut' }, 0);
      if (tilt) tl.from(tilt, { scale: 1.18, duration: 1.6, ease: EASE }, 0.1);
    }
    if (title.length) tl.from(title, { yPercent: 115, duration: 1.1, stagger: 0.08, ease: EASE }, 0.25);
    if (meta.length) tl.from(meta, { opacity: 0, y: 18, duration: 0.9, stagger: 0.06, ease: EASE }, 0.45);
    var foot = s.querySelectorAll('.show-summary, .show-core li, .show-stack');
    if (foot.length) gsap.from(foot, { opacity: 0, y: 20, duration: 0.9, stagger: 0.05, ease: EASE, scrollTrigger: { trigger: s.querySelector('.show-foot'), start: 'top 88%', once: true } });
    var steps = s.querySelectorAll('.steps li');
    if (steps.length) gsap.from(steps, { opacity: 0, y: 16, duration: 0.8, stagger: 0.07, ease: EASE, scrollTrigger: { trigger: s.querySelector('.steps'), start: 'top 88%', once: true } });
  });

  mm.add('(min-width: 901px)', function () {
    // 스크롤 패럴랙스 + 들어오며 커지는 이미지 (데스크톱만)
    gsap.utils.toArray('.show').forEach(function (s) {
      var box = s.querySelector('.stagebox');
      if (!box) return;
      gsap.fromTo(box, { scale: 0.94 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: box, start: 'top bottom', end: 'center center', scrub: 1 } });
      s.querySelectorAll('.px').forEach(function (el, i) {
        var amt = (i % 2 ? -1 : 1) * (5 + i * 2);
        gsap.fromTo(el, { yPercent: amt }, { yPercent: -amt, ease: 'none', scrollTrigger: { trigger: box, start: 'top bottom', end: 'bottom top', scrub: 1 } });
      });
    });
  });

  /* ---------- 6. Skills ---------- */
  gsap.from('.trow', { opacity: 0, y: 28, duration: 0.9, stagger: 0.07, ease: EASE, scrollTrigger: { trigger: '.tlist', start: 'top 85%', once: true } });

  /* ---------- 7. AI Workflow: 단계마다 왼쪽 터미널이 그 단계의 작업을 타이핑 ---------- */
  var pk = document.querySelector('.pv-k');
  var pname = document.querySelector('.pv-name');
  var pbars = gsap.utils.toArray('.pv-track i');
  var psteps = gsap.utils.toArray('.pstep');
  var termBody = document.getElementById('termBody');
  var logs = gsap.utils.toArray('.tlog');
  var current = -1, playId = 0;
  function playTerm(i) {
    if (!termBody || !logs[i]) return;
    var id = ++playId;
    var lines = Array.prototype.slice.call(logs[i].querySelectorAll('.tl'));
    termBody.innerHTML = '';
    var caret = document.createElement('span'); caret.className = 'caret';
    var li = 0;
    function nextLine() {
      if (id !== playId) return;
      if (li >= lines.length) { termBody.appendChild(caret); return; }
      var src = lines[li++];
      var el = src.cloneNode(true);
      if (src.classList.contains('cmd')) {
        // 명령어는 한 글자씩 타이핑
        var text = src.textContent; el.textContent = '';
        termBody.appendChild(el); el.appendChild(caret);
        var c = 0;
        (function typeChar() {
          if (id !== playId) return;
          if (c < text.length) { caret.insertAdjacentText('beforebegin', text[c++]); setTimeout(typeChar, 26); }
          else { el.removeChild(caret); setTimeout(nextLine, 260); }
        })();
      } else {
        termBody.appendChild(el);
        gsap.from(el, { opacity: 0, y: 6, duration: 0.35, ease: 'power2.out' });
        setTimeout(nextLine, src.classList.contains('agent') ? 420 : 300);
      }
    }
    nextLine();
  }
  function setStep(i) {
    if (i === current) return;
    pbars.forEach(function (b, k) { b.classList.toggle('on', k <= i); });
    psteps.forEach(function (p, k) { p.classList.toggle('on', k === i); });
    if (pk) pk.textContent = '0' + (i + 1) + ' / 0' + psteps.length;
    if (pname && psteps[i]) {
      var label = psteps[i].dataset.name;
      gsap.to(pname, { opacity: 0, y: -8, duration: 0.2, ease: 'power2.in', onComplete: function () {
        pname.textContent = label;
        gsap.fromTo(pname, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.5, ease: EASE });
      } });
    }
    current = i;
    playTerm(i);
  }
  psteps.forEach(function (p, i) {
    ScrollTrigger.create({ trigger: p, start: 'top 60%', end: 'bottom 60%', onToggle: function (self) { if (self.isActive) setStep(i); } });
  });
  // 섹션에 처음 들어올 때 첫 단계부터 타이핑
  ScrollTrigger.create({ trigger: '.proc', start: 'top 75%', once: true, onEnter: function () { if (current < 0) setStep(0); } });
  gsap.from('.hx-col', { opacity: 0, y: 26, duration: 0.9, stagger: 0.1, ease: EASE, scrollTrigger: { trigger: '.hx', start: 'top 85%', once: true } });
  gsap.from('.roster li', { opacity: 0, y: 12, duration: 0.6, stagger: 0.04, ease: EASE, scrollTrigger: { trigger: '.roster', start: 'top 90%', once: true } });
  gsap.from('.proc-lede', { opacity: 0, y: 18, duration: 0.9, ease: EASE, scrollTrigger: { trigger: '.proc-lede', start: 'top 90%', once: true } });

  /* ---------- 8. Contact ---------- */
  gsap.from('.contact-sub', { opacity: 0, y: 20, duration: 1, ease: EASE, scrollTrigger: { trigger: '.contact-sub', start: 'top 90%', once: true } });
  gsap.from('.crow', { opacity: 0, y: 24, duration: 0.9, stagger: 0.08, ease: EASE, scrollTrigger: { trigger: '.clist', start: 'top 90%', once: true } });

  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
})();

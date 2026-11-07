/* =========================================================
   animations.js — GSAP + ScrollTrigger
   원칙: 0.4~0.9초, 자연스러운 ease, 고정(pin)·스냅 없음,
   reduced-motion과 라이브러리 로드 실패 시에도 콘텐츠는 그대로 보임
   ========================================================= */
(function () {
  'use strict';
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function reveal() { root.classList.remove('gsap-pending'); }
  function finishHero3D() {
    var H = window.Hero3D;
    if (H) { H.slabs.forEach(function (s) { s.userData.drop = 0; }); H.state.orbIn = 1; H.state.intro = 1; }
  }

  if (!window.gsap || !window.ScrollTrigger || reduce) {
    finishHero3D();
    reveal();
    // 모션 없이도 소개 단계는 모두 켠 상태
    document.querySelectorAll('.process li').forEach(function (li) { li.classList.add('is-on'); });
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  root.classList.add('js-motion');
  var E = 'power3.out';
  var H3 = window.Hero3D && window.Hero3D.gsap ? window.Hero3D : null;

  /* ---------- Hero: 줄 단위 텍스트 → 서브 → CTA, 같은 타임라인에서 3D 등장 ---------- */
  var heroLines = gsap.utils.toArray('.hero .rl > span');
  gsap.set(heroLines, { yPercent: 110 });
  gsap.set(['.hero-sub', '.hero-actions'], { autoAlpha: 0, y: 16 });
  if (H3) gsap.set(['.stage-info', '.stage-hint'], { autoAlpha: 0 });
  reveal();

  var intro = gsap.timeline({ defaults: { ease: E }, delay: 0.1 });
  intro.to(heroLines, { yPercent: 0, duration: 0.9, stagger: 0.08 })
       .to('.hero-sub', { autoAlpha: 1, y: 0, duration: 0.7 }, '-=0.5')
       .to('.hero-actions', { autoAlpha: 1, y: 0, duration: 0.6 }, '-=0.45');
  if (H3) {
    H3.slabs.forEach(function (s, i) {
      intro.to(s.userData, { drop: 0, duration: 0.85, ease: 'power3.out' }, 0.25 + i * 0.1);
    });
    intro.to(H3.state, { intro: 1, duration: 0.6, ease: 'power2.out' }, 0.25 + H3.slabs.length * 0.1)
         .to(H3.state, { orbIn: 1, duration: 0.6, ease: 'power3.out' }, '<0.1')
         .to(['.stage-info', '.stage-hint'], { autoAlpha: 1, duration: 0.5 }, '<');
  }

  var mm = gsap.matchMedia();

  /* 히어로를 지나가며 레이어 간격이 살짝 벌어짐 (데스크톱만) */
  if (H3) {
    mm.add('(min-width: 901px)', function () {
      gsap.to(H3.state, { spread: 1, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 0.6 } });
    });
  }

  /* ---------- 섹션 제목: 줄 단위로 올라옴 ---------- */
  gsap.utils.toArray('.section .sec-title .rl > span, .contact .rl > span').forEach(function (el) {
    gsap.from(el, { yPercent: 110, duration: 0.85, ease: E, scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
  });
  gsap.utils.toArray('.sec-lede, .sec-meta, .contact-lede').forEach(function (el) {
    gsap.from(el, { autoAlpha: 0, y: 16, duration: 0.7, ease: E, scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
  });

  /* ---------- Skills: stagger reveal ---------- */
  gsap.from('.skill', {
    autoAlpha: 0, y: 24, duration: 0.6, ease: E, stagger: { each: 0.04, grid: 'auto', from: 'start' },
    scrollTrigger: { trigger: '.skills', start: 'top 85%', once: true }
  });

  /* ---------- About: 개발 단계가 순서대로 켜짐 (고정 없음) ---------- */
  var steps = gsap.utils.toArray('.process li');
  var rail = document.querySelector('.process .rail i');
  if (rail) {
    gsap.fromTo(rail, { scaleY: 0 }, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: '.process ol', start: 'top 62%', end: 'bottom 62%', scrub: 0.4 } });
  }
  steps.forEach(function (li) {
    ScrollTrigger.create({
      trigger: li, start: 'top 62%',
      onEnter: function () { li.classList.add('is-on'); },
      onLeaveBack: function () { li.classList.remove('is-on'); }
    });
  });
  gsap.from('.intro p', { autoAlpha: 0, y: 20, duration: 0.7, ease: E, stagger: 0.08, scrollTrigger: { trigger: '.intro', start: 'top 80%', once: true } });

  /* ---------- Projects: 목차 ---------- */
  gsap.from('.side-note', { autoAlpha: 0, y: 16, duration: 0.6, ease: E, scrollTrigger: { trigger: '.side-note', start: 'top 90%', once: true } });
  gsap.from('.plist li', { autoAlpha: 0, y: 18, duration: 0.55, ease: E, stagger: 0.06, scrollTrigger: { trigger: '.plist', start: 'top 85%', once: true } });

  /* ---------- Projects: 케이스 스터디 ---------- */
  gsap.utils.toArray('.case').forEach(function (c) {
    var media = c.querySelector('.media');
    var inner = c.querySelector('.media-inner');
    var num = c.querySelector('.case-num');
    var body = c.querySelectorAll('.case-title, .case-meta, .case-lede, .case-summary, .case-h, .core li, .chips, .links');

    var tl = gsap.timeline({ scrollTrigger: { trigger: c, start: 'top 75%', once: true } });
    if (media) {
      tl.fromTo(media, { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.9, ease: 'power4.inOut' });
      if (inner) tl.from(inner.children, { y: 40, autoAlpha: 0, duration: 0.8, stagger: 0.07, ease: E }, '<0.25');
    }
    if (num) tl.from(num, { yPercent: 100, duration: 0.8, ease: E }, media ? '<0.1' : 0);
    if (body.length) tl.from(body, { autoAlpha: 0, y: 22, duration: 0.6, stagger: 0.05, ease: E }, '<0.15');

    var flow = c.querySelectorAll('.steps li');
    if (flow.length) {
      gsap.from(flow, { autoAlpha: 0, y: 14, duration: 0.5, stagger: 0.07, ease: E, scrollTrigger: { trigger: c.querySelector('.steps'), start: 'top 88%', once: true } });
    }
  });
  // 이미지의 미세한 패럴랙스 (데스크톱만)
  mm.add('(min-width: 961px)', function () {
    gsap.utils.toArray('.case .media-inner').forEach(function (inner) {
      gsap.fromTo(inner, { yPercent: -4 }, { yPercent: 4, ease: 'none', scrollTrigger: { trigger: inner.parentNode, start: 'top bottom', end: 'bottom top', scrub: 0.5 } });
    });
  });

  /* ---------- Strengths: 카드가 하나씩 강조됨 ---------- */
  var cards = gsap.utils.toArray('.fit li');
  function setActive(i) { cards.forEach(function (c, k) { c.classList.toggle('is-on', k === i); }); }
  if (cards.length) {
    gsap.from(cards, { autoAlpha: 0, y: 26, duration: 0.6, stagger: 0.08, ease: E, scrollTrigger: { trigger: '.fit', start: 'top 85%', once: true } });
    mm.add('(min-width: 601px)', function () {
      // 같은 줄의 카드가 한꺼번에 바뀌지 않도록, 섹션 스크롤 진행도로 하나씩
      ScrollTrigger.create({
        trigger: '.fit', start: 'top 70%', end: 'bottom 35%',
        onUpdate: function (self) { setActive(Math.min(cards.length - 1, Math.floor(self.progress * cards.length))); },
        onLeaveBack: function () { setActive(0); }
      });
    });
    mm.add('(max-width: 600px)', function () {
      cards.forEach(function (c, k) {
        ScrollTrigger.create({ trigger: c, start: 'top 60%', end: 'bottom 40%', onToggle: function (self) { if (self.isActive) setActive(k); } });
      });
    });
  }

  /* ---------- Contact ---------- */
  gsap.from('.crow', { autoAlpha: 0, y: 18, duration: 0.6, stagger: 0.08, ease: E, scrollTrigger: { trigger: '.clist', start: 'top 88%', once: true } });

  // 이미지·갤러리 정리 후 위치 다시 계산
  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
})();

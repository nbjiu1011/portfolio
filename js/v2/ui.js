/* =========================================================
   ui.js — 내비게이션, 모바일 메뉴, 커스텀 커서, 3D 틸트,
   갤러리·라이트박스, 이메일 복사
   ========================================================= */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- 내비게이션 ---------- */
  var nav = $('.nav');
  function onScroll() {
    nav.classList.toggle('is-scrolled', window.scrollY > window.innerHeight * 0.6);
    var cue = $('.scroll-cue');
    if (cue) cue.style.setProperty('--p', Math.min(1, window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)).toFixed(3));
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  var links = $$('[data-nav]');
  var ids = ['home', 'about', 'work', 'process', 'contact'];
  var secs = ids.map(function (id) { return document.getElementById(id); }).filter(Boolean);
  var band = {};
  function mark() {
    var cur = null;
    secs.forEach(function (s) { if (band[s.id]) cur = s.id; });
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) cur = 'contact';
    links.forEach(function (a) {
      if (a.getAttribute('href') === '#' + cur) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
  }
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { band[e.target.id] = e.isIntersecting; }); mark(); }, { rootMargin: '-45% 0px -50% 0px' });
    secs.forEach(function (s) { io.observe(s); });
    window.addEventListener('scroll', mark, { passive: true });
  }

  // 앵커 이동: Lenis가 있으면 Lenis로, 없으면 기본 스크롤
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href');
      if (id.length < 2) return;
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      if (window.lenis) window.lenis.scrollTo(target, { offset: 0, duration: 1.4 });
      else target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
      history.replaceState(null, '', id);
      if (target.tabIndex < 0) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    });
  });

  /* ---------- 모바일 메뉴 ---------- */
  var btn = $('.menu-btn'), menu = $('#mmenu'), lastFocus = null;
  function focusables(r) { return $$('a[href], button:not([disabled])', r); }
  function openMenu() {
    lastFocus = document.activeElement;
    menu.classList.add('is-open'); menu.removeAttribute('inert'); menu.setAttribute('aria-hidden', 'false');
    btn.setAttribute('aria-expanded', 'true'); btn.textContent = 'CLOSE';
    document.body.classList.add('menu-open');
    if (window.lenis) window.lenis.stop();
    var f = focusables(menu)[0]; if (f) setTimeout(function () { f.focus({ preventScroll: true }); }, 80);
  }
  function closeMenu(restore) {
    menu.classList.remove('is-open'); menu.setAttribute('inert', ''); menu.setAttribute('aria-hidden', 'true');
    btn.setAttribute('aria-expanded', 'false'); btn.textContent = 'MENU';
    document.body.classList.remove('menu-open');
    if (window.lenis) window.lenis.start();
    if (restore !== false && lastFocus) lastFocus.focus();
  }
  if (btn && menu) {
    btn.addEventListener('click', function () { if (btn.getAttribute('aria-expanded') === 'true') closeMenu(); else openMenu(); });
    $$('a', menu).forEach(function (a) { a.addEventListener('click', function () { closeMenu(false); }); });
    document.addEventListener('keydown', function (e) {
      if (!menu.classList.contains('is-open')) return;
      if (e.key === 'Escape') { closeMenu(); return; }
      if (e.key === 'Tab') {
        var list = [btn].concat(focusables(menu)), i = list.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0) { list[list.length - 1].focus(); e.preventDefault(); }
        else if (!e.shiftKey && i === list.length - 1) { list[0].focus(); e.preventDefault(); }
      }
    });
    window.matchMedia('(min-width: 901px)').addEventListener('change', function (m) { if (m.matches) closeMenu(false); });
  }

  /* ---------- 커스텀 커서 (데스크톱만) ---------- */
  var cursor = $('.cursor');
  if (cursor && fine && !reduce) {
    root.classList.add('has-cursor');
    var label = $('span', cursor);
    var cx = -100, cy = -100, tx = -100, ty = -100;
    window.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      tx = e.clientX; ty = e.clientY;
      cursor.classList.add('is-on');
      var el = e.target, mode = '', text = '';
      if (el.closest && el.closest('[data-cursor="view"]')) { mode = 'is-label'; text = 'VIEW'; }
      else if (el.closest && el.closest('a, button, summary')) { mode = 'is-link'; }
      else if (el.closest && el.closest('#dragZone') && window.Chrome && window.Chrome.hit(tx, ty)) { mode = 'is-label'; text = 'DRAG'; }
      cursor.className = 'cursor is-on' + (mode ? ' ' + mode : '');
      label.textContent = text;
    }, { passive: true });
    document.addEventListener('pointerleave', function () { cursor.classList.remove('is-on'); });
    (function tick() {
      cx += (tx - cx) * 0.22; cy += (ty - cy) * 0.22;
      cursor.style.transform = 'translate3d(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0)';
      requestAnimationFrame(tick);
    })();
  }

  /* ---------- 프로젝트 이미지: 은은한 3D 틸트 ---------- */
  if (fine && !reduce) {
    $$('.stagebox').forEach(function (box) {
      var tilt = $('.tilt', box);
      if (!tilt) return;
      var rx = 0, ry = 0, trx = 0, try_ = 0, raf = 0;
      function loop() {
        rx += (trx - rx) * 0.12; ry += (try_ - ry) * 0.12;
        tilt.style.transform = 'rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg)';
        raf = (Math.abs(trx - rx) > 0.01 || Math.abs(try_ - ry) > 0.01) ? requestAnimationFrame(loop) : 0;
      }
      box.addEventListener('pointermove', function (e) {
        var r = box.getBoundingClientRect();
        try_ = ((e.clientX - r.left) / r.width - 0.5) * 7;
        trx = -((e.clientY - r.top) / r.height - 0.5) * 5;
        if (!raf) raf = requestAnimationFrame(loop);
      });
      box.addEventListener('pointerleave', function () { trx = 0; try_ = 0; if (!raf) raf = requestAnimationFrame(loop); });
    });
  }

  /* ---------- 갤러리: 없는 이미지 정리 ---------- */
  $$('.thumbs').forEach(function (row) {
    var count = $('.count', row);
    function update() {
      var shown = $$('.thumb:not(.missing)', row).length;
      if (count) count.textContent = shown + ' SCREENS';
      row.hidden = shown < (parseInt(row.dataset.min, 10) || 2);
    }
    $$('.thumb', row).forEach(function (t) {
      var img = $('img', t);
      function miss() { t.classList.add('missing'); update(); }
      if (img.complete && img.naturalWidth === 0) miss();
      img.addEventListener('error', miss);
      img.addEventListener('load', update);
    });
    update();
  });

  /* ---------- 라이트박스 ---------- */
  var lb = $('#lightbox');
  if (lb) {
    var lbImg = $('.lb-stage img', lb), lbCap = $('.lb-cap', lb), lbCount = $('.lb-count', lb), lbTitle = $('.lb-title', lb);
    var items = [], index = 0, opener = null;
    var show = function (i) {
      index = (i + items.length) % items.length;
      var it = items[index];
      lbImg.src = it.src; lbImg.alt = it.alt; lbCap.textContent = it.cap;
      lbCount.textContent = (index + 1) + ' / ' + items.length;
      $('.lb-prev', lb).hidden = $('.lb-next', lb).hidden = items.length < 2;
    };
    var open = function (sec, startSrc, from) {
      items = $$('.thumb:not(.missing)', sec).map(function (t) { var img = $('img', t); return { src: t.dataset.full, alt: img.alt, cap: t.dataset.cap }; });
      if (!items.length) return;
      var start = 0;
      items.forEach(function (it, k) { if (startSrc && it.src === startSrc) start = k; });
      opener = from; lbTitle.textContent = sec.dataset.name || '';
      show(start);
      lb.classList.add('is-open'); lb.removeAttribute('inert'); lb.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      if (window.lenis) window.lenis.stop();
      setTimeout(function () { $('.lb-close', lb).focus(); }, 40);
    };
    var close = function () {
      lb.classList.remove('is-open'); lb.setAttribute('inert', ''); lb.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      if (window.lenis) window.lenis.start();
      if (opener) opener.focus({ preventScroll: true });
    };
    $$('.show').forEach(function (sec) {
      $$('.thumb', sec).forEach(function (t) { t.addEventListener('click', function () { open(sec, t.dataset.full, t); }); });
      var box = $('button.stagebox', sec);
      if (box) box.addEventListener('click', function () { open(sec, box.dataset.start, box); });
    });
    $('.lb-close', lb).addEventListener('click', close);
    $('.lb-prev', lb).addEventListener('click', function () { show(index - 1); });
    $('.lb-next', lb).addEventListener('click', function () { show(index + 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb || e.target.classList.contains('lb-stage')) close(); });
    document.addEventListener('keydown', function (e) {
      if (!lb.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') show(index - 1);
      else if (e.key === 'ArrowRight') show(index + 1);
      else if (e.key === 'Tab') {
        var f = $$('button:not([hidden])', lb), i = f.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0) { f[f.length - 1].focus(); e.preventDefault(); }
        else if (!e.shiftKey && i === f.length - 1) { f[0].focus(); e.preventDefault(); }
      }
    });
    var sx = null;
    lb.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', function (e) {
      if (sx === null) return;
      var dx = e.changedTouches[0].clientX - sx; sx = null;
      if (Math.abs(dx) > 50) show(index + (dx < 0 ? 1 : -1));
    });
  }

  /* ---------- 이메일·전화 복사 ---------- */
  $$('.copy').forEach(function (b) {
    b.addEventListener('click', function () {
      var text = b.dataset.copy;
      function done() { b.classList.add('done'); setTimeout(function () { b.classList.remove('done'); }, 1800); }
      function fallback() {
        var ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); done(); } catch (err) { /* 복사 불가 */ }
        document.body.removeChild(ta);
      }
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, fallback); else fallback();
    });
  });
})();

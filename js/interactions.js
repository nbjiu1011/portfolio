/* =========================================================
   interactions.js — 내비게이션, 모바일 메뉴, 기술 선택,
   연락처 복사, 프로젝트 갤러리(라이트박스)
   ========================================================= */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- 1. 내비게이션: 스크롤 시 블러, 현재 섹션 강조 ---------- */
  var nav = $('.nav');
  function onScroll() { nav.classList.toggle('is-scrolled', window.scrollY > 8); }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  var navLinks = $$('.nav-links a, .mmenu a[data-sec]');
  var sections = ['about', 'skills', 'projects', 'contact'].map(function (id) { return document.getElementById(id); }).filter(Boolean);
  var current = null;
  function markNav() {
    // 페이지 끝에 닿으면 마지막 섹션(Contact)을 강조
    var atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
    var id = atBottom ? 'contact' : current;
    navLinks.forEach(function (a) {
      if (a.getAttribute('href') === '#' + id) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
  }
  if ('IntersectionObserver' in window) {
    var inBand = {};
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { inBand[e.target.id] = e.isIntersecting; });
      // 화면 가운데 띠에 걸친 섹션 중 문서 순서상 마지막 것, 없으면(히어로 등) 강조 없음
      current = null;
      sections.forEach(function (s) { if (inBand[s.id]) current = s.id; });
      markNav();
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(function (s) { io.observe(s); });
    window.addEventListener('scroll', markNav, { passive: true });
  }

  /* ---------- 2. 모바일 메뉴 ---------- */
  var menuBtn = $('.menu-btn');
  var menu = $('#mmenu');
  var lastFocus = null;
  function focusables(root) { return $$('a[href], button:not([disabled])', root); }
  function openMenu() {
    lastFocus = document.activeElement;
    menu.classList.add('is-open');
    menu.removeAttribute('inert');
    menu.setAttribute('aria-hidden', 'false');
    menuBtn.setAttribute('aria-expanded', 'true');
    menuBtn.setAttribute('aria-label', '메뉴 닫기');
    document.body.classList.add('menu-open');
    var f = focusables(menu)[0];
    if (f) { f.focus({ preventScroll: true }); setTimeout(function () { if (document.activeElement !== f) f.focus({ preventScroll: true }); }, 120); }
  }
  function closeMenu(restore) {
    menu.classList.remove('is-open');
    menu.setAttribute('inert', '');
    menu.setAttribute('aria-hidden', 'true');
    menuBtn.setAttribute('aria-expanded', 'false');
    menuBtn.setAttribute('aria-label', '메뉴 열기');
    document.body.classList.remove('menu-open');
    if (restore !== false && lastFocus) lastFocus.focus();
  }
  if (menuBtn && menu) {
    menuBtn.addEventListener('click', function () {
      if (menuBtn.getAttribute('aria-expanded') === 'true') closeMenu(); else openMenu();
    });
    $$('a', menu).forEach(function (a) { a.addEventListener('click', function () { closeMenu(false); }); });
    document.addEventListener('keydown', function (ev) {
      if (!menu.classList.contains('is-open')) return;
      if (ev.key === 'Escape') { closeMenu(); return; }
      if (ev.key === 'Tab') {
        // 메뉴 버튼 + 메뉴 안에서만 포커스 순환
        var list = [menuBtn].concat(focusables(menu));
        var i = list.indexOf(document.activeElement);
        if (ev.shiftKey && i <= 0) { list[list.length - 1].focus(); ev.preventDefault(); }
        else if (!ev.shiftKey && i === list.length - 1) { list[0].focus(); ev.preventDefault(); }
      }
    });
    window.matchMedia('(min-width: 861px)').addEventListener('change', function (m) { if (m.matches) closeMenu(false); });
  }

  /* ---------- 3. 기술 카드 선택 ---------- */
  var detail = $('#skillDetail');
  var skills = $$('.skill');
  function selectSkill(btn) {
    skills.forEach(function (b) { b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'); });
    if (detail) {
      detail.innerHTML = '';
      var b = document.createElement('b'); b.textContent = btn.dataset.name;
      var s = document.createElement('span'); s.textContent = btn.dataset.use;
      detail.appendChild(b); detail.appendChild(s);
    }
  }
  skills.forEach(function (btn) { btn.addEventListener('click', function () { selectSkill(btn); }); });

  /* ---------- 4. 연락처 복사 ---------- */
  $$('.copy').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var text = btn.dataset.copy;
      var label = btn.textContent;
      function done() {
        btn.textContent = '복사됨'; btn.classList.add('done');
        setTimeout(function () { btn.textContent = label; btn.classList.remove('done'); }, 1600);
      }
      function fallback() {
        var t = document.createElement('textarea');
        t.value = text; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0';
        document.body.appendChild(t); t.select();
        try { document.execCommand('copy'); done(); } catch (e) { /* 복사 불가 환경 */ }
        document.body.removeChild(t);
      }
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, fallback);
      else fallback();
    });
  });

  /* ---------- 5. 갤러리: 없는 이미지 정리 ---------- */
  $$('.thumbs').forEach(function (row) {
    var thumbs = $$('.thumb', row);
    var count = $('.count', row);
    function update() {
      var shown = $$('.thumb:not(.missing)', row).length;
      if (count) count.textContent = '화면 ' + shown + '장';
      row.hidden = shown < (parseInt(row.dataset.min, 10) || 2);
    }
    thumbs.forEach(function (t) {
      var img = $('img', t);
      function miss() { t.classList.add('missing'); update(); }
      if (img.complete && img.naturalWidth === 0) miss();
      img.addEventListener('error', miss);
      img.addEventListener('load', update);
    });
    update();
  });

  /* ---------- 6. 라이트박스 ---------- */
  var lb = $('#lightbox');
  if (!lb) return;
  var lbImg = $('.lb-stage img', lb), lbCap = $('.lb-cap', lb), lbCount = $('.lb-count', lb), lbTitle = $('.lb-title', lb);
  var items = [], index = 0, opener = null;

  function show(i) {
    index = (i + items.length) % items.length;
    var it = items[index];
    lbImg.src = it.src; lbImg.alt = it.alt;
    lbCap.textContent = it.cap;
    lbCount.textContent = (index + 1) + ' / ' + items.length;
    $('.lb-prev', lb).hidden = $('.lb-next', lb).hidden = items.length < 2;
  }
  function open(caseEl, startSrc, from) {
    items = $$('.thumb:not(.missing)', caseEl).map(function (t) {
      var img = $('img', t);
      return { src: t.dataset.full || img.src, alt: img.alt, cap: t.dataset.cap || img.alt };
    });
    if (!items.length) return;
    var start = 0;
    items.forEach(function (it, k) { if (startSrc && it.src.indexOf(startSrc) !== -1) start = k; });
    opener = from;
    lbTitle.textContent = caseEl.dataset.name || '';
    show(start);
    lb.classList.add('is-open');
    lb.removeAttribute('inert');
    lb.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    setTimeout(function () { $('.lb-close', lb).focus(); }, 30);
  }
  function close() {
    lb.classList.remove('is-open');
    lb.setAttribute('inert', '');
    lb.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (opener) opener.focus();
  }
  $$('.case').forEach(function (c) {
    $$('.thumb', c).forEach(function (t) { t.addEventListener('click', function () { open(c, t.dataset.full, t); }); });
    var media = $('.media', c);
    if (media) media.addEventListener('click', function () { open(c, media.dataset.start, media); });
  });
  $('.lb-close', lb).addEventListener('click', close);
  $('.lb-prev', lb).addEventListener('click', function () { show(index - 1); });
  $('.lb-next', lb).addEventListener('click', function () { show(index + 1); });
  lb.addEventListener('click', function (ev) { if (ev.target === lb || ev.target.classList.contains('lb-stage')) close(); });
  document.addEventListener('keydown', function (ev) {
    if (!lb.classList.contains('is-open')) return;
    if (ev.key === 'Escape') close();
    else if (ev.key === 'ArrowLeft') show(index - 1);
    else if (ev.key === 'ArrowRight') show(index + 1);
    else if (ev.key === 'Tab') {
      var f = $$('button:not([hidden])', lb), i = f.indexOf(document.activeElement);
      if (ev.shiftKey && i <= 0) { f[f.length - 1].focus(); ev.preventDefault(); }
      else if (!ev.shiftKey && i === f.length - 1) { f[0].focus(); ev.preventDefault(); }
    }
  });
  // 모바일 스와이프
  var sx = null;
  lb.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', function (e) {
    if (sx === null) return;
    var dx = e.changedTouches[0].clientX - sx; sx = null;
    if (Math.abs(dx) > 50) show(index + (dx < 0 ? 1 : -1));
  });
})();

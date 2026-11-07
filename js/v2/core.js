/* =========================================================
   core.js — </> : 크롬 코드 태그 (Three.js r150)
   크롬으로 만든 '<'  '/'  '>' 사이에, 신경망 격자를 품은 유리 구체.
   개발자(코드)가 AI(신경망)를 감싸 서비스로 만든다는 의미.
   ========================================================= */
(function () {
  'use strict';
  var root = document.documentElement;
  var host = document.getElementById('gl');
  var dragZone = document.getElementById('dragZone');
  if (!host) return;
  function fail() { root.classList.add('no-webgl'); }
  if (!window.THREE) { fail(); return; }
  var T = window.THREE;

  var renderer;
  try { renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' }); }
  catch (e) { fail(); return; }
  if (!renderer.getContext()) { fail(); return; }

  var mobile = window.matchMedia('(max-width: 900px)').matches || window.matchMedia('(pointer: coarse)').matches;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.75));
  renderer.setClearColor(0x000000, 0);
  renderer.outputEncoding = T.sRGBEncoding;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  host.appendChild(renderer.domElement);
  root.classList.add('has-gl');

  var scene = new T.Scene();
  var camera = new T.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 0, 9);

  /* ---------- 1. 밝은 스튜디오 환경: 흰 배경 + 검은 반사판(크롬 윤곽) ---------- */
  var envScene = new T.Scene();
  (function () {
    var g = new T.SphereGeometry(20, 48, 24), col = [], p = g.attributes.position;
    for (var i = 0; i < p.count; i++) {
      var y = p.getY(i) / 20;
      var v = y < 0 ? 0.08 + 0.42 * Math.pow(1 + y, 4) : 0.5 - 0.38 * Math.pow(y, 0.7);
      col.push(v, v, v * 0.99);
    }
    g.setAttribute('color', new T.Float32BufferAttribute(col, 3));
    envScene.add(new T.Mesh(g, new T.MeshBasicMaterial({ vertexColors: true, side: T.BackSide })));
  })();
  function panel(w, h, pos, color, power) {
    var m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: new T.Color(color).multiplyScalar(power), side: T.DoubleSide }));
    m.position.set(pos[0], pos[1], pos[2]); m.lookAt(0, 0, 0); envScene.add(m);
  }
  panel(3.2, 10, [-6, 0.5, 2.5], 0x000000, 1);  // 왼쪽 검은 반사판
  panel(2.4, 10, [6, 0, -1.5], 0x000000, 1);    // 오른쪽 검은 반사판
  panel(10, 2.2, [0, 6, -2], 0x000000, 1);      // 위쪽 검은 띠
  panel(0.5, 8, [-3.2, 0, 6], 0xffffff, 4.5);   // 앞쪽 가는 하이라이트 스트립
  panel(0.35, 8, [5, 0.5, 3], 0xffffff, 3.5);   // 오른쪽 가는 하이라이트
  panel(10, 0.5, [0, -2.2, 6], 0x111111, 1);    // 앞쪽 바닥선
  panel(4, 1.6, [1.5, 5.5, 4], 0xffffff, 3.2);  // 위 소프트박스
  panel(1.8, 3, [-4.5, 1.5, 4.5], 0xffffff, 2.6); // 앞 왼쪽 소프트박스
  panel(1.2, 1.2, [3.5, -2.5, 4], 0xCFE6FF, 1.6); // 차가운 반사 (무지갯빛 힌트)
  panel(1.2, 1.2, [-3.5, -3, 3], 0xFFD3EE, 1.4);  // 분홍 반사
  var pmrem = new T.PMREMGenerator(renderer);
  var envRT = pmrem.fromScene(envScene, 0.025);
  scene.environment = envRT.texture;
  envScene.traverse(function (o) { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
  pmrem.dispose();
  var key = new T.DirectionalLight(0xffffff, 0.9); key.position.set(3, 5, 6); scene.add(key);

  /* ---------- 2. 재질 ---------- */
  var chrome = new T.MeshPhysicalMaterial({ color: 0xffffff, metalness: 1, roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.08, iridescence: 0.45, iridescenceIOR: 1.5, iridescenceThicknessRange: [150, 450], envMapIntensity: 1.1 });
  var glass = mobile
    ? new T.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: 0.05, transparent: true, opacity: 0.32, depthWrite: false, clearcoat: 1, iridescence: 0.9, iridescenceIOR: 1.3, envMapIntensity: 1.3 })
    : new T.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: 0.03, transmission: 1, thickness: 1.1, ior: 1.32, clearcoat: 1, clearcoatRoughness: 0.03,
        iridescence: 0.9, iridescenceIOR: 1.3, iridescenceThicknessRange: [200, 520], envMapIntensity: 1.25, attenuationColor: new T.Color(0xEEF2FF), attenuationDistance: 3 });

  /* ---------- 3. 코드 태그: '<'  '/'  '>' ---------- */
  var EX = { depth: 0.34, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.055, bevelSegments: mobile ? 4 : 8, curveSegments: 8 };
  function chevronGeo() {
    var L = 1.38, a = T.MathUtils.degToRad(38), t = 0.3;
    var c = Math.cos(a) * L, s = Math.sin(a) * L;
    var sh = new T.Shape();
    sh.moveTo(0, 0); sh.lineTo(c, s); sh.lineTo(c + t * Math.sin(a), s - t * Math.cos(a));
    sh.lineTo(t / Math.sin(a), 0);
    sh.lineTo(c + t * Math.sin(a), -s + t * Math.cos(a)); sh.lineTo(c, -s); sh.lineTo(0, 0);
    var g = new T.ExtrudeGeometry(sh, EX); g.center(); return g;
  }
  function slashGeo() {
    var h = 2.1, w = 0.3, k = 0.62;
    var sh = new T.Shape();
    sh.moveTo(-k / 2 - w / 2, -h / 2); sh.lineTo(-k / 2 + w / 2, -h / 2); sh.lineTo(k / 2 + w / 2, h / 2); sh.lineTo(k / 2 - w / 2, h / 2); sh.lineTo(-k / 2 - w / 2, -h / 2);
    var g = new T.ExtrudeGeometry(sh, EX); g.center(); return g;
  }
  var art = new T.Group();       // 전체 조형
  scene.add(art);
  var tag = new T.Group();       // 코드 태그
  art.add(tag);
  var lt = new T.Mesh(chevronGeo(), chrome);
  var gt = new T.Mesh(lt.geometry, chrome); gt.rotation.z = Math.PI;
  var sl = new T.Mesh(slashGeo(), chrome);
  // '<' '/' '>' 를 붙여 하나의 </> 태그로
  lt.userData.base = new T.Vector3(-1.32, 0, 0);
  sl.userData.base = new T.Vector3(0, 0, 0);
  gt.userData.base = new T.Vector3(1.32, 0, 0);
  [lt, sl, gt].forEach(function (m, i) { m.position.copy(m.userData.base); m.userData.phase = i * 1.3; tag.add(m); });

  // 바닥 그림자
  var shCanvas = document.createElement('canvas'); shCanvas.width = shCanvas.height = 256;
  (function (g) { var gr = g.createRadialGradient(128, 128, 6, 128, 128, 128); gr.addColorStop(0, 'rgba(0,0,0,0.14)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); })(shCanvas.getContext('2d'));
  var shTex = new T.CanvasTexture(shCanvas);
  var shadow = new T.Mesh(new T.PlaneGeometry(5.2, 1.0), new T.MeshBasicMaterial({ map: shTex, transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.set(0, -1.6, 0);
  art.add(shadow);

  /* ---------- 5. 상태 (GSAP이 조절) ---------- */
  var state = { x: 0, y: 0, scale: 1, rot: 0, tilt: 0, opacity: 1, spread: 0, intro: reduce || !window.gsap ? 1 : 0 };
  var baseX = 0, baseY = 0, baseScale = 1;
  var WIDTH = 4.1, CENTER_X = 0;   // 태그 전체 폭과 중심 보정
  function layout() {
    var w = host.clientWidth || window.innerWidth, h = host.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    var visH = 2 * camera.position.z * Math.tan(T.MathUtils.degToRad(camera.fov / 2)), visW = visH * camera.aspect;
    if (camera.aspect >= 1) { baseScale = Math.min((visW * 0.44) / WIDTH, (visH * 0.62) / 2.6); baseX = visW * 0.22; baseY = visH * 0.05; }
    else { baseScale = (visW * 0.86) / WIDTH; baseX = 0; baseY = visH * 0.04; }
  }
  layout();
  window.addEventListener('resize', layout);

  /* ---------- 6. 상호작용 ---------- */
  var mouse = { x: 0, y: 0 }, mouseS = { x: 0, y: 0 }, drag = { x: 0, y: 0 }, vel = { x: 0, y: 0 };
  var dragging = false, lx = 0, ly = 0, activity = 0, activityT = 0;
  if (!mobile) {
    window.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      mouse.x = e.clientX / window.innerWidth * 2 - 1; mouse.y = e.clientY / window.innerHeight * 2 - 1;
      activityT = hitCore(e.clientX, e.clientY) ? 1 : 0;
    }, { passive: true });
  }
  if (dragZone) {
    dragZone.addEventListener('pointerdown', function (e) { dragging = true; lx = e.clientX; ly = e.clientY; activityT = 1; if (dragZone.setPointerCapture) dragZone.setPointerCapture(e.pointerId); });
    dragZone.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY;
      vel.y = dx * 0.0035; vel.x = dy * 0.0025;
      drag.y += vel.y; drag.x = Math.max(-0.6, Math.min(0.6, drag.x + vel.x));
    });
    var end = function () { dragging = false; if (mobile) activityT = 0; };
    dragZone.addEventListener('pointerup', end); dragZone.addEventListener('pointercancel', end);
    dragZone.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { vel.y = -0.04; e.preventDefault(); }
      if (e.key === 'ArrowRight') { vel.y = 0.04; e.preventDefault(); }
    });
  }

  /* ---------- 7. 렌더 루프 ---------- */
  var raf = 0, last = performance.now(), t = 0, running = false, va = new T.Vector3(), vb = new T.Vector3();
  function frame(now) {
    raf = 0;
    var dt = Math.min((now - last) / 1000, 0.05); last = now;
    if (!reduce) t += dt;
    activity += (activityT - activity) * Math.min(dt * 3, 1);

    if (!dragging) { drag.y += vel.y; drag.x += vel.x; vel.y *= 0.95; vel.x *= 0.92; drag.x *= 0.985; }
    mouseS.x += (mouse.x - mouseS.x) * Math.min(dt * 2.2, 1);
    mouseS.y += (mouse.y - mouseS.y) * Math.min(dt * 2.2, 1);

    var sc = baseScale * state.scale * (0.88 + 0.12 * state.intro);
    art.scale.setScalar(sc);
    art.position.set(baseX + state.x - CENTER_X * sc, baseY + state.y - (1 - state.intro) * 0.3, 0);
    art.rotation.y = drag.y + mouseS.x * 0.26 + state.rot + (reduce ? -0.25 : Math.sin(t * 0.25) * 0.18 - 0.22);
    art.rotation.x = drag.x + mouseS.y * 0.14 + state.tilt;

    // 태그가 천천히 떠 있고, 스크롤하면 열림(spread)
    var open = state.spread * 0.9 + (1 - state.intro) * 0.8 + activity * 0.18;
    [lt, sl, gt].forEach(function (m, i) {
      var b = m.userData.base, dir = i === 0 ? -1 : 1;
      m.position.set(b.x + dir * open, b.y + Math.sin(t * 0.8 + m.userData.phase) * 0.06, b.z + Math.cos(t * 0.6 + m.userData.phase) * 0.05);
      m.rotation.y = Math.sin(t * 0.4 + m.userData.phase) * 0.12;
      m.rotation.x = Math.sin(t * 0.3 + m.userData.phase) * 0.06;
    });

    host.style.opacity = (state.opacity * state.intro).toFixed(3);
    renderer.render(scene, camera);
    schedule();
  }
  var heroOn = true, heroEl = document.getElementById('home');
  if (heroEl && 'IntersectionObserver' in window) new IntersectionObserver(function (es) { heroOn = es[0].isIntersecting; schedule(); }, { threshold: 0 }).observe(heroEl);
  function visible() {
    if (document.hidden || state.opacity <= 0.01) return false;
    if (root.classList.contains('motion-off') && !heroOn) return false;
    return true;
  }
  function schedule() {
    if (!visible()) { host.style.opacity = '0'; return; }
    if (running && !raf) raf = requestAnimationFrame(frame);
  }
  function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }
  document.addEventListener('visibilitychange', function () { if (document.hidden) { if (raf) cancelAnimationFrame(raf); raf = 0; } else schedule(); });

  /* ---------- 8. 정리 ---------- */
  window.addEventListener('pagehide', function (e) {
    if (e.persisted) return;
    stop();
    scene.traverse(function (o) { if (o.geometry) o.geometry.dispose(); });
    [chrome, glass, shadow.material].forEach(function (m) { m.dispose(); });
    shTex.dispose(); envRT.dispose(); renderer.dispose();
    if (renderer.forceContextLoss) renderer.forceContextLoss();
  });
  renderer.domElement.addEventListener('webglcontextlost', function (e) { e.preventDefault(); stop(); root.classList.remove('has-gl'); fail(); });

  // 커서: 조형 전체 / AI 코어 위치 판정
  var v = new T.Vector3();
  function project(obj) {
    obj.getWorldPosition(v); v.project(camera);
    return { x: (v.x + 1) / 2 * window.innerWidth, y: (1 - v.y) / 2 * window.innerHeight };
  }
  function pxPerUnit() {
    var visH = 2 * camera.position.z * Math.tan(T.MathUtils.degToRad(camera.fov / 2));
    return window.innerHeight / visH * art.scale.x;
  }
  function hitCore(px, py) { if (state.opacity < 0.3) return false; var c = project(tag), k = pxPerUnit(); return Math.abs(px - c.x) < 2.0 * k && Math.abs(py - c.y) < 1.3 * k; }
  function hit(px, py) { return hitCore(px, py); }

  renderer.compile(scene, camera);
  running = true; last = performance.now(); schedule();
  window.Chrome = { state: state, hit: hit, wake: schedule, ready: true };
})();

/* =========================================================
   hero3d.js — Full-stack 서비스 구조 3D
   Infrastructure · Database · Backend · Frontend · Mobile 레이어와
   레이어를 오가는 AI 노드, 레이어를 잇는 데이터 흐름
   ========================================================= */
(function () {
  'use strict';
  var stage = document.getElementById('stage');
  var host = document.getElementById('stageCanvas');
  if (!stage || !host || !window.THREE) return;

  var T = window.THREE;
  var renderer;
  try {
    renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  } catch (err) { return; }
  var gl = renderer.getContext();
  if (!gl) return;

  var isMobile = window.matchMedia('(max-width: 900px)').matches;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var useGsap = !!window.gsap && !reduce;
  var state = { spread: 0, orbIn: useGsap ? 0 : 1, intro: useGsap ? 0 : 1 };

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 1.75));
  renderer.setClearColor(0x000000, 0);
  host.appendChild(renderer.domElement);

  var scene = new T.Scene();
  var camera = new T.PerspectiveCamera(28, 1, 0.1, 100);
  var CAM = new T.Vector3(4.6, 7.4, 12.8);
  var LOOK = new T.Vector3(0, 2.1, 0);
  var root = new T.Group();
  scene.add(root);

  // 아래에서 위로: 인프라 → 데이터 → 백엔드 → 프론트엔드 → 모바일
  var LAYERS = [
    { key: 'Infrastructure', sub: 'Docker · GitLab CI', role: 'Docker와 GitLab CI로 자동 배포하고, 헬스 체크 실패 시 이전 이미지로 복구합니다. 파일은 Cloudflare R2에 저장합니다.' },
    { key: 'Database',       sub: 'MySQL · MariaDB',    role: '스키마를 설계하고 Flyway로 마이그레이션을 관리합니다. 인덱스와 조회 쿼리를 최적화합니다.' },
    { key: 'Backend',        sub: 'Java · Spring Boot', role: 'REST API, 인증·권한(JWT·OAuth2), 상태 전이, 스케줄러와 감사 로그를 구현합니다.' },
    { key: 'Frontend',       sub: 'Next.js · TypeScript', role: '사용자 웹과 관리자 시스템을 만듭니다. 몽골어·한국어 다국어와 PWA를 지원합니다.' },
    { key: 'Mobile',         sub: 'Expo · React Native', role: 'iOS·Android 앱을 출시하고, 푸시 알림과 OTA 업데이트로 운영합니다.' }
  ];
  var AI = { key: 'AI', sub: 'Claude Code · Cursor', role: '기획·설계·구현·검증의 모든 레이어에서 AI 에이전트와 함께 작업하고, 최종 판단과 검증은 직접 합니다.' };

  var W = 3.7, D = 2.35, H = 0.24, GAP = 0.95;

  function fitFont(g, text, weight, maxSize, maxW) {
    var size = maxSize;
    do { g.font = weight + ' ' + size + 'px Sora, "Pretendard Variable", sans-serif'; size -= 4; }
    while (g.measureText(text).width > maxW && size > 40);
  }
  function topTexture(layer, inverted) {
    var cw = 1024, ch = Math.round(1024 * D / W);
    var c = document.createElement('canvas'); c.width = cw; c.height = ch;
    var g = c.getContext('2d');
    g.fillStyle = inverted ? '#000' : '#fff'; g.fillRect(0, 0, cw, ch);
    g.strokeStyle = inverted ? '#fff' : '#000'; g.lineWidth = 10; g.strokeRect(5, 5, cw - 10, ch - 10);
    g.fillStyle = inverted ? '#fff' : '#000';
    g.textBaseline = 'alphabetic';
    fitFont(g, layer.key, '700', 170, cw - 140);
    g.fillText(layer.key, 70, ch * 0.70);
    g.font = '500 56px Sora, "Pretendard Variable", sans-serif';
    g.fillStyle = inverted ? '#A3A3A3' : '#737373';
    g.fillText(layer.sub, 74, ch * 0.88);
    var t = new T.CanvasTexture(c);
    t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    return t;
  }
  function mats(inverted, top) {
    return [
      new T.MeshBasicMaterial({ color: inverted ? 0x262626 : 0xE5E5E5 }), // +x
      new T.MeshBasicMaterial({ color: inverted ? 0x111111 : 0xD4D4D4 }), // -x
      top,                                                               // +y
      new T.MeshBasicMaterial({ color: inverted ? 0x111111 : 0xD4D4D4 }), // -y
      new T.MeshBasicMaterial({ color: inverted ? 0x404040 : 0xF5F5F5 }), // +z
      new T.MeshBasicMaterial({ color: inverted ? 0x111111 : 0xD4D4D4 })  // -z
    ];
  }

  var geo = new T.BoxGeometry(W, H, D);
  var edgeGeo = new T.EdgesGeometry(geo);
  var slabs = [];
  var disposables = [geo, edgeGeo];

  LAYERS.forEach(function (layer, i) {
    var topN = new T.MeshBasicMaterial({ map: topTexture(layer, false) });
    var topI = new T.MeshBasicMaterial({ map: topTexture(layer, true) });
    var mN = mats(false, topN), mI = mats(true, topI);
    var mesh = new T.Mesh(geo, mN);
    var edges = new T.LineSegments(edgeGeo, new T.LineBasicMaterial({ color: 0x000000 }));
    mesh.add(edges);
    mesh.userData = { i: i, baseY: i * GAP, lift: 0, drop: useGsap ? 6 : 0, matsN: mN, matsI: mI, edges: edges };
    mesh.position.y = mesh.userData.baseY + mesh.userData.drop;
    root.add(mesh);
    slabs.push(mesh);
    disposables.push(topN, topI, topN.map, topI.map);
  });

  // 레이어를 잇는 네 모서리 기둥 (하나의 서비스 구조)
  var postMat = new T.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35 });
  var postGeo = new T.BufferGeometry();
  var cx = W / 2 - 0.22, cz = D / 2 - 0.22;
  var corners = [[cx, cz], [-cx, cz], [cx, -cz], [-cx, -cz]];
  var postPos = new Float32Array(corners.length * 6);
  postGeo.setAttribute('position', new T.BufferAttribute(postPos, 3));
  var posts = new T.LineSegments(postGeo, postMat);
  root.add(posts);
  disposables.push(postGeo, postMat);

  // 데이터 흐름: 앞쪽 기둥을 따라 오르내리는 작은 패킷
  var packetGeo = new T.BoxGeometry(0.11, 0.11, 0.11);
  var packetMat = new T.MeshBasicMaterial({ color: 0x000000 });
  var packets = [];
  for (var p = 0; p < 4; p++) {
    var m = new T.Mesh(packetGeo, packetMat);
    m.userData = { corner: p % 2 === 0 ? 0 : 1, phase: p / 4, dir: p % 2 === 0 ? 1 : -1 };
    root.add(m); packets.push(m);
  }
  disposables.push(packetGeo, packetMat);

  // 바닥 그림자
  var shadowCanvas = document.createElement('canvas'); shadowCanvas.width = shadowCanvas.height = 256;
  (function (g) {
    var grad = g.createRadialGradient(128, 128, 8, 128, 128, 128);
    grad.addColorStop(0, 'rgba(0,0,0,0.18)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad; g.fillRect(0, 0, 256, 256);
  })(shadowCanvas.getContext('2d'));
  var shadowTex = new T.CanvasTexture(shadowCanvas);
  var shadowMat = new T.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false });
  var shadowGeo = new T.PlaneGeometry(8.6, 6.6);
  var shadow = new T.Mesh(shadowGeo, shadowMat);
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = -H / 2 - 0.02;
  root.add(shadow);
  disposables.push(shadowTex, shadowMat, shadowGeo);

  // AI 노드
  function orbTexture(inverted) {
    var c = document.createElement('canvas'); c.width = c.height = 256;
    var g = c.getContext('2d');
    g.fillStyle = inverted ? '#fff' : '#000'; g.beginPath(); g.arc(128, 128, 120, 0, Math.PI * 2); g.fill();
    g.strokeStyle = inverted ? '#000' : '#fff'; g.lineWidth = 6; g.beginPath(); g.arc(128, 128, 102, 0, Math.PI * 2); g.stroke();
    g.fillStyle = inverted ? '#000' : '#fff'; g.font = '700 100px Sora, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('AI', 128, 134);
    return new T.CanvasTexture(c);
  }
  var orbTexN = orbTexture(false), orbTexI = orbTexture(true);
  var orbMat = new T.SpriteMaterial({ map: orbTexN, depthTest: false });
  var orb = new T.Sprite(orbMat);
  orb.renderOrder = 10;
  root.add(orb);
  disposables.push(orbTexN, orbTexI, orbMat);

  var TRAIL_N = 56, trailPts = [];
  for (var k = 0; k < TRAIL_N; k++) trailPts.push(new T.Vector3());
  var trailGeo = new T.BufferGeometry().setFromPoints(trailPts);
  var trailMat = new T.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25 });
  var trail = new T.Line(trailGeo, trailMat);
  root.add(trail);
  var linkGeo = new T.BufferGeometry().setFromPoints([new T.Vector3(), new T.Vector3()]);
  var linkMat = new T.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32 });
  var link = new T.Line(linkGeo, linkMat);
  root.add(link);
  disposables.push(trailGeo, trailMat, linkGeo, linkMat);

  // ---------- 정보 패널 ----------
  var infoIdx = document.getElementById('stageIdx');
  var infoName = document.getElementById('stageName');
  var infoRole = document.getElementById('stageRole');
  var DEFAULT = { idx: '—', name: 'Full-stack', role: '레이어를 가리키거나 드래그해 서비스 구조를 살펴보세요.' };
  function showInfo(item, idx) {
    if (!infoName) return;
    infoIdx.textContent = idx;
    infoName.textContent = item.name || item.key;
    infoRole.textContent = item.role;
  }
  showInfo(DEFAULT, DEFAULT.idx);

  // ---------- 상호작용 ----------
  var el = renderer.domElement;
  var pointer = new T.Vector2(-9, -9), ray = new T.Raycaster();
  var hovered = null, hoverOrb = false, pinned = null;
  var par = { x: 0, y: 0 }, parT = { x: 0, y: 0 };
  var yaw = 0, yawT = 0, pitch = 0, pitchT = 0;
  var dragging = false, dragX = 0, dragY = 0, moved = 0;

  function setHover(mesh, isOrb) {
    if (mesh === hovered && isOrb === hoverOrb) return;
    if (hovered) { hovered.material = hovered.userData.matsN; hovered.userData.edges.material.color.set(0x000000); }
    hovered = mesh; hoverOrb = isOrb;
    if (hovered) { hovered.material = hovered.userData.matsI; hovered.userData.edges.material.color.set(0xffffff); }
    orbMat.map = isOrb ? orbTexI : orbTexN;
    if (hovered) { var L = LAYERS[hovered.userData.i]; showInfo(L, '0' + (hovered.userData.i + 1)); }
    else if (hoverOrb) showInfo(AI, '06');
    else showInfo(DEFAULT, DEFAULT.idx);
  }
  function pick() {
    ray.setFromCamera(pointer, camera);
    if (ray.intersectObject(orb).length) { setHover(null, true); return; }
    var hits = ray.intersectObjects(slabs, false);
    setHover(hits.length ? hits[0].object : null, false);
  }
  function toLocal(ev) {
    var r = el.getBoundingClientRect();
    pointer.x = ((ev.clientX - r.left) / r.width) * 2 - 1;
    pointer.y = -((ev.clientY - r.top) / r.height) * 2 + 1;
  }

  // 히어로 전체에서 마우스 위치에 따라 부드럽게 기울어짐
  var hero = document.querySelector('.hero');
  if (hero && !isMobile) {
    hero.addEventListener('pointermove', function (ev) {
      if (ev.pointerType !== 'mouse') return;
      parT.x = (ev.clientX / window.innerWidth) * 2 - 1;
      parT.y = (ev.clientY / window.innerHeight) * 2 - 1;
    });
    hero.addEventListener('pointerleave', function () { parT.x = 0; parT.y = 0; });
  }

  el.addEventListener('pointermove', function (ev) {
    toLocal(ev);
    if (dragging) {
      var dx = ev.clientX - dragX, dy = ev.clientY - dragY;
      dragX = ev.clientX; dragY = ev.clientY; moved += Math.abs(dx) + Math.abs(dy);
      yawT += dx * 0.008;
      pitchT = Math.max(-0.28, Math.min(0.22, pitchT + dy * 0.004));
    }
    if (ev.pointerType === 'mouse') pick();
  });
  el.addEventListener('pointerdown', function (ev) {
    dragging = true; moved = 0; dragX = ev.clientX; dragY = ev.clientY; toLocal(ev);
    if (el.setPointerCapture) el.setPointerCapture(ev.pointerId);
  });
  function endDrag(ev) {
    if (!dragging) return;
    dragging = false;
    // 터치: 드래그가 아니라 탭이면 레이어 선택
    if (ev && ev.pointerType !== 'mouse' && moved < 8) { toLocal(ev); pick(); pinned = hovered || (hoverOrb ? 'orb' : null); }
  }
  el.addEventListener('pointerup', endDrag);
  el.addEventListener('pointercancel', function () { dragging = false; });
  el.addEventListener('pointerleave', function (ev) { if (!dragging && ev.pointerType === 'mouse') { pointer.set(-9, -9); setHover(null, false); } });

  // 키보드: 좌우 회전, 위아래로 레이어 이동
  var kbIndex = -1;
  host.addEventListener('keydown', function (ev) {
    if (ev.key === 'ArrowLeft') { yawT -= 0.3; ev.preventDefault(); }
    else if (ev.key === 'ArrowRight') { yawT += 0.3; ev.preventDefault(); }
    else if (ev.key === 'ArrowUp' || ev.key === 'ArrowDown') {
      kbIndex = Math.max(0, Math.min(LAYERS.length, kbIndex + (ev.key === 'ArrowUp' ? 1 : -1)));
      if (kbIndex === LAYERS.length) setHover(null, true); else setHover(slabs[kbIndex], false);
      ev.preventDefault();
    } else if (ev.key === 'Escape') { kbIndex = -1; setHover(null, false); }
  });
  host.addEventListener('blur', function () { kbIndex = -1; setHover(null, false); });

  // ---------- 크기 ----------
  function resize() {
    var w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    var k = camera.aspect < 0.95 ? 0.95 / camera.aspect : 1;
    camera.position.copy(CAM).sub(LOOK).multiplyScalar(k).add(LOOK);
    camera.lookAt(LOOK);
    camera.updateProjectionMatrix();
  }
  var ro = 'ResizeObserver' in window ? new ResizeObserver(resize) : null;
  if (ro) ro.observe(host); else window.addEventListener('resize', resize);

  // ---------- 렌더 루프 (화면에 보일 때만) ----------
  var visible = true, raf = 0, last = performance.now(), t = 0;
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
    visible = es[0].isIntersecting;
    if (visible) start(); else stop();
  }, { threshold: 0 }) : null;
  if (io) io.observe(host);
  document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else if (visible) start(); });

  function frame(now) {
    var dt = Math.min((now - last) / 1000, 0.05); last = now;
    if (!reduce) t += dt;

    var span = (LAYERS.length - 1) * GAP;
    var kSpread = 1 + state.spread * 0.7;

    // AI 노드 궤도
    var ang = t * 0.8 + 0.7;
    var oyBase = reduce ? span * 0.62 : (Math.sin(t * 0.5) * 0.5 + 0.5) * span + H * 0.5 + 0.22;
    var oy = oyBase * kSpread;
    var R = 3.0;
    orb.position.set(Math.cos(ang) * R, oy, Math.sin(ang) * R * 0.85);
    var os = 0.64 * state.orbIn * (hoverOrb ? 1.15 : 1);
    orb.scale.set(os, os, 1);
    trailMat.opacity = 0.25 * state.orbIn;
    linkMat.opacity = 0.32 * state.orbIn;

    var near = Math.max(0, Math.min(LAYERS.length - 1, Math.round((oyBase - 0.22) / GAP)));
    slabs.forEach(function (s, i) {
      var u = s.userData;
      var target = (s === hovered ? 0.32 : 0) + (i === near && !reduce && state.orbIn > 0.5 ? 0.08 : 0);
      u.lift += (target - u.lift) * Math.min(dt * 9, 1);
      s.position.y = u.baseY * kSpread + u.drop + u.lift;
    });

    // 기둥
    var bottom = slabs[0].position.y, top = slabs[slabs.length - 1].position.y;
    for (var c = 0; c < corners.length; c++) {
      postPos[c * 6] = corners[c][0]; postPos[c * 6 + 1] = bottom; postPos[c * 6 + 2] = corners[c][1];
      postPos[c * 6 + 3] = corners[c][0]; postPos[c * 6 + 4] = top; postPos[c * 6 + 5] = corners[c][1];
    }
    postGeo.attributes.position.needsUpdate = true;
    postMat.opacity = 0.35 * state.intro;

    // 데이터 패킷
    packets.forEach(function (m) {
      var u = m.userData;
      var f = ((t * 0.22 + u.phase) % 1);
      if (u.dir < 0) f = 1 - f;
      var cc = corners[u.corner];
      m.position.set(cc[0], bottom + (top - bottom) * f, cc[1]);
      m.visible = state.intro > 0.5 && !reduce;
    });

    // AI → 가장 가까운 레이어 연결선
    var tg = slabs[near];
    var lp = linkGeo.attributes.position;
    lp.setXYZ(0, orb.position.x, orb.position.y, orb.position.z);
    lp.setXYZ(1, 0, tg.position.y + H / 2, 0);
    lp.needsUpdate = true;
    var tp = trailGeo.attributes.position;
    for (var j = TRAIL_N - 1; j > 0; j--) tp.setXYZ(j, tp.getX(j - 1), tp.getY(j - 1), tp.getZ(j - 1));
    tp.setXYZ(0, orb.position.x, orb.position.y, orb.position.z);
    tp.needsUpdate = true;

    // 회전: 드래그 + 마우스 기울기 + 가만히 있을 때 좌우 흔들림, 놓으면 정면으로 복귀
    var idle = !reduce && !dragging && !hovered && !hoverOrb;
    if (!dragging) {
      yawT += (Math.round(yawT / (Math.PI * 2)) * Math.PI * 2 - yawT) * Math.min(dt * 0.8, 1);
      pitchT += (0 - pitchT) * Math.min(dt * 1.2, 1);
    }
    var sway = idle ? Math.sin(t * 0.4) * 0.28 : 0;
    yaw += (yawT + sway - yaw) * Math.min(dt * (idle ? 1.5 : 6), 1);
    pitch += (pitchT - pitch) * Math.min(dt * 6, 1);
    par.x += (parT.x - par.x) * Math.min(dt * 3, 1);
    par.y += (parT.y - par.y) * Math.min(dt * 3, 1);
    root.rotation.y = yaw + par.x * 0.24 + state.spread * 0.5;
    root.rotation.x = pitch + par.y * 0.06;
    root.scale.setScalar(1 - state.spread * 0.22);
    root.position.y = -state.spread * 0.9;

    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }
  function start() { if (raf) return; last = performance.now(); raf = requestAnimationFrame(frame); }
  function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; }

  // ---------- 정리 ----------
  function cleanup() {
    stop();
    if (io) io.disconnect();
    if (ro) ro.disconnect();
    disposables.forEach(function (d) { if (d && d.dispose) d.dispose(); });
    slabs.forEach(function (s) { s.userData.matsN.concat(s.userData.matsI).forEach(function (mm) { mm.dispose(); }); s.userData.edges.material.dispose(); });
    renderer.dispose();
    if (renderer.forceContextLoss) renderer.forceContextLoss();
  }
  window.addEventListener('pagehide', function (e) { if (!e.persisted) cleanup(); });
  el.addEventListener('webglcontextlost', function (e) { e.preventDefault(); stop(); stage.classList.remove('is-3d'); });

  // ---------- 시작 ----------
  resize();
  stage.classList.add('is-3d');
  host.tabIndex = 0;
  host.setAttribute('role', 'img');
  host.setAttribute('aria-label', 'Full-stack 서비스 구조 3D 모형. Infrastructure, Database, Backend, Frontend, Mobile 레이어와 AI. 좌우 화살표로 회전, 위아래 화살표로 레이어 선택');
  resize();
  start();

  // 글꼴이 준비되면 라벨 다시 그림
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
      slabs.forEach(function (s) {
        var L = LAYERS[s.userData.i];
        var oldN = s.userData.matsN[2].map, oldI = s.userData.matsI[2].map;
        s.userData.matsN[2].map = topTexture(L, false); s.userData.matsN[2].needsUpdate = true;
        s.userData.matsI[2].map = topTexture(L, true); s.userData.matsI[2].needsUpdate = true;
        oldN.dispose(); oldI.dispose();
        disposables.push(s.userData.matsN[2].map, s.userData.matsI[2].map);
      });
    });
  }

  window.Hero3D = { slabs: slabs, state: state, gsap: useGsap };
})();

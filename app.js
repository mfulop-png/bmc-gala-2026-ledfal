/* BMC Gála 2026 — LED fal kiosk */
(function () {
  'use strict';
  const D = window.BMC;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const IDLE_MS = 60000;

  /* ---------- stage fit ---------- */
  const stage = $('#stage');
  function fit() {
    const s = Math.min(window.innerWidth / 3840, window.innerHeight / 2160);
    stage.style.transform = 'translate(' + ((window.innerWidth - 3840 * s) / 2) + 'px,' +
      ((window.innerHeight - 2160 * s) / 2) + 'px) scale(' + s + ')';
  }
  window.addEventListener('resize', fit); fit();

  /* ---------- clock ---------- */
  function tick() {
    const d = new Date();
    $('#clock').textContent = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }
  tick(); setInterval(tick, 10000);

  /* ---------- screens + idle ---------- */
  let idleT = null, current = null;
  function go(name) {
    current = name;
    $$('.screen').forEach(s => s.classList.toggle('active', s.dataset.screen === name));
    $$('.tab').forEach(t => t.classList.toggle('active', t.dataset.go === name));
    $('#attract').classList.add('hidden');
    if (name !== 'map') setWorld(false);
    if (name === 'dash') runDash();
    if (name === 'timeline') selectYear(tlYear, true);
    resetIdle();
  }
  function toAttract() {
    current = null;
    $$('.screen').forEach(s => s.classList.remove('active'));
    $$('.tab').forEach(t => t.classList.remove('active'));
    $('#attract').classList.remove('hidden');
    clearDetail(); setWorld(false); setZoom('hu', true);
    clearTimeout(idleT);
  }
  function resetIdle() {
    clearTimeout(idleT);
    if (current) idleT = setTimeout(toAttract, IDLE_MS);
  }
  ['pointerdown', 'keydown', 'wheel'].forEach(e => document.addEventListener(e, resetIdle, { passive: true }));
  $$('.tab').forEach(t => t.addEventListener('click', () => go(t.dataset.go)));
  $('#attract').addEventListener('pointerdown', () => go('map'));

  /* ---------- attract particles ---------- */
  (function particles() {
    const cv = $('#particles'), ctx = cv.getContext('2d');
    cv.width = 3840; cv.height = 2160;
    const pts = Array.from({ length: 90 }, () => ({
      x: Math.random() * 3840, y: Math.random() * 2160,
      vx: (Math.random() - .5) * .35, vy: (Math.random() - .5) * .35,
      r: 2 + Math.random() * 4
    }));
    function frame() {
      ctx.clearRect(0, 0, 3840, 2160);
      for (const p of pts) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > 3840) p.vx *= -1;
        if (p.y < 0 || p.y > 2160) p.vy *= -1;
      }
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y, d2 = dx * dx + dy * dy;
          if (d2 < 360000) {
            ctx.strokeStyle = 'rgba(134,188,37,' + (.16 * (1 - d2 / 360000)) + ')';
            ctx.lineWidth = 1.4;
            ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y); ctx.stroke();
          }
        }
      }
      for (const p of pts) {
        ctx.fillStyle = 'rgba(134,188,37,.55)';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.2832); ctx.fill();
      }
      requestAnimationFrame(frame);
    }
    frame();
  })();

  /* ---------- filters ---------- */
  const filters = { year: null, region: null };
  function mk(tag, cls, txt) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  }
  function buildChips(el, items, key) {
    el.innerHTML = '';
    const all = mk('div', 'chip on', 'Mind');
    all.addEventListener('click', () => { filters[key] = null; syncChips(el, null); applyFilters(); });
    el.appendChild(all);
    items.forEach(v => {
      const c = mk('div', 'chip', String(v));
      c.dataset.v = String(v);
      c.addEventListener('click', () => {
        filters[key] = filters[key] === String(v) ? null : String(v);   // újra koppintva kikapcsol
        syncChips(el, filters[key]); applyFilters();
      });
      el.appendChild(c);
    });
  }
  function syncChips(el, v) {
    $$('.chip', el).forEach(c => c.classList.toggle('on', (c.dataset.v || null) === v));
  }
  const regions = Array.from(new Set(D.companies.map(c => c.region))).sort((a, b) => a.localeCompare(b, 'hu'));
  buildChips($('#f-year'), D.years, 'year');
  buildChips($('#f-region'), regions, 'region');

  function match(c) {
    if (filters.year && c.years.indexOf(+filters.year) < 0) return false;
    if (filters.region && c.region !== filters.region) return false;
    return true;
  }
  function applyFilters() {
    let n = 0;
    $$('#hu-map .hu-dot').forEach(g => {
      const c = byId[g.dataset.id], ok = match(c);
      if (ok) n++;
      g.classList.toggle('dimmed', !ok);
    });
    $('#fcount').textContent = n;
    if (selected && !match(selected)) clearDetail();
    if (!selected) {
      $('#detail').innerHTML = n ? 'Koppints egy pontra a térképen<br>a vállalat adataiért'
        : 'Nincs a szűrésnek megfelelő vállalat.<br>Próbálj más kombinációt.';
    }
  }
  const byId = {};
  D.companies.forEach(c => { byId[c.id] = c; });

  /* ---------- detail ---------- */
  let selected = null;
  function clearDetail() {
    selected = null;
    const d = $('#detail');
    d.className = 'panel detail empty';
    d.innerHTML = 'Koppints egy pontra a térképen<br>a vállalat adataiért';
    $$('#hu-map .hu-dot').forEach(g => g.classList.remove('sel'));
  }
  function showCompany(c) {
    selected = c;
    $$('#hu-map .hu-dot').forEach(g => g.classList.toggle('sel', g.dataset.id === c.id));
    const d = $('#detail');
    d.className = 'panel detail';
    const ord = ['', 'első', 'második', 'harmadik', 'negyedik', 'ötödik'][c.wins] || c.wins + '.';
    const where = c.district ? 'Budapest ' + c.district + '. kerület' : c.place;
    const stats = [
      c.employees && stat(fmt(c.employees), 'munkavállaló')
    ].filter(Boolean);
    const photos = c.photos.slice(0, 3);
    d.innerHTML =
      '<div class="dh">' + logoBox(c, 'dlogo') +
      '<div><div class="dname">' + esc(c.name) + '</div>' +
      '<div class="dsub">' + esc(where) + '</div></div></div>' +
      (stats.length ? '<div class="dstats" style="grid-template-columns:repeat(' + stats.length + ',1fr)">' + stats.join('') + '</div>' : '') +
      '<div class="dtext">' + esc(c.desc) + '</div>' +
      '<div class="dyears">' + D.years.map(y => '<div class="yrbox' + (c.years.indexOf(y) >= 0 ? ' on' : '') + '">' + y + '</div>').join('') + '</div>' +
      '<div class="dsub" style="margin-top:22px">Első elismerés: <b style="color:#fff">' + c.first + '</b> · ' +
      ord + ' alkalommal Best Managed (' + c.wins + '×)</div>' +
      (photos.length
        ? '<div class="dphotos" style="grid-template-columns:repeat(' + photos.length + ',1fr)">' +
          photos.map(p => '<div class="dph"><img src="' + p + '" alt="" loading="lazy"></div>').join('') + '</div>'
        : c.years.length === 1 && c.first === 2026
          ? '<div class="dphotos"><div class="badge pending" style="grid-column:span 2">Új nyertes — gálafotók a mai este után</div></div>'
          : '');
  }
  function logoBox(c, cls) {
    return '<div class="' + cls + (c.logoDark ? ' dark' : '') + '">' +
      (c.logo ? '<img src="' + c.logo + '" alt="' + esc(c.name) + '">' : '<span>' + esc(c.name) + '</span>') + '</div>';
  }
  function stat(v, l) { return '<div class="dstat"><div class="v">' + v + '</div><div class="l">' + l + '</div></div>'; }
  function fmt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }
  function esc(s) { return String(s).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m])); }

  /* ---------- maps ---------- */
  const R = window.__resources || {};
  const ATLAS = [
    R.atlas50 || 'https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-50m.json',
    R.atlas110 || 'https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json'
  ];
  function loadAtlas() {
    return fetch(ATLAS[0]).then(r => { if (!r.ok) throw 0; return r.json(); })
      .catch(() => fetch(ATLAS[1]).then(r => r.json()));
  }
  loadAtlas().then(topo => {
    const feats = topojson.feature(topo, topo.objects.countries).features;
    drawHungary(feats);
    drawWorld(feats);
  }).catch(e => console.error('atlas', e));

  // Nominatim-poligonok: d3 óramutató szerinti külső gyűrűt vár
  function rewind(f) {
    if (d3.geoArea(f) > 2 * Math.PI) {
      const g = f.geometry;
      if (g.type === 'Polygon') g.coordinates.forEach(r => r.reverse());
      else if (g.type === 'MultiPolygon') g.coordinates.forEach(p => p.forEach(r => r.reverse()));
    }
    return f;
  }

  /* HU / Budapest zoom */
  const Z = { W: 2400, H: 1180, side: [330, 880], view: { k: 1, x: 0, y: 0 }, bp: 0, mode: 'hu', bpView: null, gBase: null, dots: null, labels: null, proj: null };
  function renderZoom() {
    const v = Z.view;
    Z.gBase.attr('transform', 'translate(' + v.x + ',' + v.y + ') scale(' + v.k + ')');
    Z.dots.attr('transform', d => {
      const x = v.x + v.k * d.real[0], y = v.y + v.k * d.real[1];
      if (d.keep) {   // kerület nélküli budapesti cégek: nagyítva a bal alsó sarokba úsznak
        return 'translate(' + (x + (Z.side[0] - x) * Z.bp + d.off[0]) + ',' + (y + (Z.side[1] - y) * Z.bp + d.off[1]) + ')';
      }
      return 'translate(' + (x + d.off[0] * (1 - Z.bp)) + ',' + (y + d.off[1] * (1 - Z.bp)) + ')';
    });
    Z.labels.attr('transform', d => d.fixed ? 'translate(' + Z.side[0] + ',' + Z.side[1] + ')'
      : 'translate(' + (v.x + v.k * d.p[0]) + ',' + (v.y + v.k * d.p[1]) + ')');
  }
  function setZoom(mode, instant) {
    if (!Z.gBase || (mode === Z.mode && !instant)) return;
    Z.mode = mode;
    $$('#zoomseg div').forEach(e => e.classList.toggle('on', e.dataset.z === mode));
    $('#mapwrap').classList.toggle('mode-bp', mode === 'bp');
    $('#maphint').textContent = mode === 'bp' ? 'Budapesti díjazottak kerületenként' : 'Koppints Budapestre a nagyításhoz';
    const to = mode === 'bp' ? Z.bpView : { k: 1, x: 0, y: 0 }, bpTo = mode === 'bp' ? 1 : 0;
    const d3sel = d3.select('#hu-map');
    d3sel.interrupt();
    if (instant) { Z.view = to; Z.bp = bpTo; renderZoom(); return; }
    const iv = d3.interpolate(Z.view, to), ib = d3.interpolate(Z.bp, bpTo);
    d3sel.transition().duration(1300).ease(d3.easeCubicInOut)
      .tween('zoom', () => t => { Z.view = iv(t); Z.bp = ib(t); renderZoom(); });
  }
  $$('#zoomseg div').forEach(e => e.addEventListener('click', () => setZoom(e.dataset.z)));

  function drawHungary(feats) {
    const svg = d3.select('#hu-map');
    const W = Z.W, H = Z.H;
    svg.attr('viewBox', '0 0 ' + W + ' ' + H).attr('preserveAspectRatio', 'xMidYMid meet');
    const hu = feats.find(f => f.properties.name === 'Hungary');
    if (!hu) return;
    const proj = Z.proj = d3.geoMercator().fitExtent([[300, 120], [W - 300, H - 120]], hu);
    const path = d3.geoPath(proj);
    svg.append('defs').html(
      '<linearGradient id="huGrad" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="rgba(134,188,37,.18)"/>' +
      '<stop offset="100%" stop-color="rgba(134,188,37,.05)"/></linearGradient>');
    const g = Z.gBase = svg.append('g');
    g.append('g').selectAll('path').data(feats.filter(f => f.properties.name !== 'Hungary'))
      .join('path').attr('class', 'hu-country').attr('d', path);
    g.append('path').datum(hu).attr('class', 'hu-main').attr('d', path);
    const G = window.BP_GEO;
    let bpCentroid = proj([19.04, 47.4979]);
    if (G) {
      g.append('path').datum(G.huRivers).attr('class', 'hu-river hu-only').attr('d', path);
      const bp = rewind(G.budapest);
      g.append('path').datum(bp).attr('class', 'bp-outline').attr('d', path)
        .on('click', () => setZoom('bp'));
      G.districts.forEach(rewind);
      g.append('path').datum(G.duna).attr('class', 'bp-duna bp-only').attr('d', path);
      g.append('g').selectAll('path').data(G.districts).join('path').attr('class', 'bp-district bp-only').attr('d', path);
      const b = path.bounds(bp), dx = b[1][0] - b[0][0], dy = b[1][1] - b[0][1];
      const k = Math.min(W * .9 / dx, H * .9 / dy);
      const cx = (b[0][0] + b[1][0]) / 2, cy = (b[0][1] + b[1][1]) / 2;
      Z.bpView = { k: k, x: W / 2 - k * cx, y: H / 2 - k * cy };
      bpCentroid = [cx, cy];
    }

    // budapesti cégek: az irányítószámból ismert kerület közepe (azonos kerületen belül kicsit széthúzva)
    const distPos = {}, distSeen = {};
    if (G && Z.bpView) {
      G.districts.forEach(f => { distPos[f.properties.n] = path.centroid(f); });
    }
    function districtPoint(c) {
      const p = distPos[c.district];
      if (!p) return null;
      const n = D.companies.filter(o => o.district === c.district).length;
      const i = distSeen[c.district] = (distSeen[c.district] || 0) + 1;
      return [p[0] + (i - 1 - (n - 1) / 2) * 70 / Z.bpView.k, p[1]];
    }

    // pontok: valós hely + klaszter-eltolás (a kerület nélküli budapesti cégek nagyítva is körben maradnak)
    const byPlace = {};
    D.companies.forEach(c => { (byPlace[c.place] = byPlace[c.place] || []).push(c); });
    const dotData = [], labData = [];
    Object.keys(byPlace).forEach(place => {
      const list = byPlace[place];
      const base = proj([list[0].lon, list[0].lat]);
      const r = list.length > 1 ? 16 + list.length * 5 : 0;
      const ring = list.filter(c => !(c.district && distPos[c.district]));
      const rr = ring.length > 1 ? 16 + ring.length * 5 : 0;
      list.forEach((c, i) => {
        const a = (i / list.length) * Math.PI * 2 - Math.PI / 2;
        const real = (c.district && districtPoint(c)) || base;
        const keep = real === base;
        const ang = keep ? (ring.indexOf(c) / ring.length) * Math.PI * 2 - Math.PI / 2 : a;
        const rad = keep && place === 'Budapest' ? rr : r;
        dotData.push({ c: c, real: real, keep: keep && place === 'Budapest',
          off: [base[0] + Math.cos(ang) * rad - real[0], base[1] + Math.sin(ang) * rad - real[1]] });
        if (!keep) labData.push({ p: real, t: c.name, cls: 'bp-name bp-only', dy: -44 });
      });
      if (place === 'Budapest' && ring.length && ring.length < list.length) {
        labData.push({ p: base, t: 'Budapest · pontos cím nélkül', cls: 'bp-name bp-only', dy: rr + 56, fixed: true });
      }
      labData.push({ p: base, t: place, cls: 'hu-city hu-only', dy: list.length > 1 ? r + 40 : 40 });
    });
    if (G) G.districts.forEach(d => {
      const p = path.centroid(d);
      if (isFinite(p[0])) labData.push({ p: p, t: d.properties.n, cls: 'bp-dlabel bp-only', dy: 0, sub: true });
    });
    // budapesti névcímkék: ütközéskerülés a nagyított nézet koordinátáiban
    if (Z.bpView) {
      const V = Z.bpView, boxes = [];
      dotData.forEach(d => boxes.push([V.x + V.k * d.real[0] - 36, V.y + V.k * d.real[1] - 36, 72, 72]));
      const hit = b => boxes.some(o => b[0] < o[0] + o[2] && b[0] + b[2] > o[0] && b[1] < o[1] + o[3] && b[1] + b[3] > o[1]);
      labData.filter(d => d.cls.indexOf('bp-name') === 0 && !d.fixed).sort((p, q) => p.p[1] - q.p[1]).forEach(d => {
        const sx = V.x + V.k * d.p[0], sy = V.y + V.k * d.p[1], w = d.t.length * 14 + 10, h = 34;
        const cand = [[44, 0, 'start'], [-44, 0, 'end'], [44, -46, 'start'], [-44, -46, 'end'], [44, 46, 'start'], [-44, 46, 'end'],
          [44, -92, 'start'], [-44, 92, 'end']];
        let pick = cand[0];
        for (const c of cand) {
          const bx = c[2] === 'start' ? sx + c[0] : sx + c[0] - w;
          const b = [bx, sy + c[1] - h / 2, w, h];
          if (!hit(b)) { pick = c; boxes.push(b); break; }
        }
        d.dx = pick[0]; d.dy = pick[1]; d.anchor = pick[2]; d.baseline = 'middle';
      });
    }
    Z.labels = svg.append('g').selectAll('g').data(labData).join('g');
    Z.labels.append('text').attr('class', d => d.cls).attr('x', d => d.dx || 0).attr('y', d => d.dy)
      .attr('text-anchor', d => d.anchor || 'middle').attr('dominant-baseline', d => d.baseline || null).text(d => d.t);
    // kerületi címkék a pontok alá kerüljenek
    Z.labels.filter(d => d.sub).lower();
    Z.dots = svg.append('g').selectAll('g').data(dotData).join('g').attr('class', 'hu-dot')
      .attr('data-id', d => d.c.id);
    Z.dots.append('circle').attr('class', 'halo').attr('r', d => 12 + d.c.wins * 5);
    Z.dots.append('circle').attr('class', 'core').attr('r', d => 8 + d.c.wins * 2.4);
    Z.dots.append('circle').attr('r', 40).attr('fill', 'transparent');
    Z.dots.on('click', (ev, d) => {
      if (Z.mode === 'hu' && d.c.city === 'Budapest' && Z.bpView) { setZoom('bp'); return; }   // első koppintás: nagyítás
      showCompany(d.c);
    });
    renderZoom();
    applyFilters();
  }

  /* Global Journey */
  function setWorld(on) {
    $('#mapscreen').classList.toggle('worldmode', !!on);
    $('#datanote').style.opacity = on ? '0' : '';
  }
  $('#globebtn').addEventListener('click', () => setWorld(true));
  $('#backbtn').addEventListener('click', () => setWorld(false));
  (function strips() {
    const tile = p => '<div class="ph">' + (p.src ? '<img src="' + p.src + '" alt="">' : '<div class="pe">Fotó érkezik</div>') +
      '<div class="pc">' + esc(p.country) + '</div></div>';
    const A = D.globalPhotos, half = Math.ceil(A.length / 2);
    const s1 = A.slice(0, half), s2 = A.slice(half).concat(A.slice(0, Math.max(0, half - (A.length - half))));
    const fill = arr => { let o = arr.slice(); while (o.length < 9) o = o.concat(arr); return o; };
    const t1 = fill(s1).map(tile).join(''), t2 = fill(s2).map(tile).join('');
    $('#strip1').innerHTML = t1 + t1;
    $('#strip2').innerHTML = t2 + t2;
  })();
  function drawWorld(feats) {
    const svg = d3.select('#world-map');
    const W = 2400, H = 1100;
    svg.attr('viewBox', '0 0 ' + W + ' ' + H).attr('preserveAspectRatio', 'xMidYMid meet');
    const proj = d3.geoNaturalEarth1().fitExtent([[20, 10], [W - 20, H - 10]], { type: 'Sphere' });
    const path = d3.geoPath(proj);
    svg.append('path').datum(d3.geoGraticule10()).attr('class', 'w-graticule').attr('d', path);
    const map = {};
    D.world.forEach(w => { map[w.key] = w; });
    const norm = n => D.worldAliases[n] || n;
    svg.append('g').selectAll('path').data(feats).join('path').attr('d', path)
      .attr('class', f => {
        const k = norm(f.properties.name);
        return k === 'Hungary' ? 'w-hu' : map[k] ? 'w-bmc' : 'w-land';
      });
    const hp = proj([19.5, 47.2]);
    for (let i = 0; i < 2; i++) svg.append('circle').attr('class', 'w-ping').attr('cx', hp[0]).attr('cy', hp[1]).attr('r', 30)
      .style('animation-delay', (i * 1.2) + 's');
  }

  /* ---------- timeline ---------- */
  let tlYear = 2026;
  (function buildTimeline() {
    const rail = $('#tlrail');
    const fill = mk('div', 'fill'); fill.style.width = '0'; rail.appendChild(fill);
    D.timeline.forEach(t => {
      const n = mk('div', 'tnode');
      n.dataset.y = t.year;
      n.innerHTML = '<div class="ring">' + t.count + '</div><div class="y">' + t.year + '</div>';
      n.addEventListener('click', () => selectYear(t.year));
      rail.appendChild(n);
    });
    $('#sumbar').innerHTML = D.summary.map(s =>
      '<div><div class="v">' + s.value + '</div><div class="u">' + s.unit + '</div><div class="l">' + s.label + '</div></div>').join('');
  })();
  function selectYear(year, force) {
    if (!force && year === tlYear) return;
    tlYear = year;
    const t = D.timeline.find(x => x.year === year);
    const idx = D.timeline.indexOf(t);
    $$('#tlrail .tnode').forEach(n => n.classList.toggle('on', +n.dataset.y === year));
    $('#tlrail .fill').style.width = (idx / (D.timeline.length - 1)) * 88 + '%';
    $('#tl-pg').textContent = t.program;
    $('#tl-title').textContent = t.title;
    $('#tl-text').textContent = t.text;
    animateNum($('#tl-count'), t.count, 900);
    const winners = D.companies.filter(c => c.years.indexOf(year) >= 0);
    $('#w-label').textContent = year + ' — ' + winners.length + ' elismert vállalat';
    $('#wgrid').innerHTML = winners.map(c =>
      '<div class="wg' + (c.wins === 5 ? ' five' : '') + '">' + esc(c.short) + (c.wins === 5 ? ' ★' : '') + '</div>').join('');
  }
  function animateNum(el, to, dur) {
    const t0 = performance.now();
    (function step(t) {
      const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      el.textContent = fmt(Math.round(to * e));
      if (k < 1) requestAnimationFrame(step);
    })(t0);
    setTimeout(() => { el.textContent = fmt(to); }, dur + 150);
  }
  selectYear(2026, true);

  /* ---------- dashboard ---------- */
  (function buildDash() {
    const counts = {};
    D.companies.forEach(c => { counts[c.region] = (counts[c.region] || 0) + 1; });
    const arr = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const max = arr[0][1];
    $('#cols').innerHTML = arr.map(([k, v]) =>
      '<div class="col"><div class="area"><div class="c">' + v + '</div><div class="fl" data-h="' + (v / max * 88) + '%"></div></div>' +
      '<div class="lb">' + esc(k) + '</div></div>').join('');
    $('#allco').innerHTML = D.companies.slice()
      .sort((a, b) => (b.wins === 5) - (a.wins === 5) || a.name.localeCompare(b.name, 'hu'))
      .map(c => '<div class="' + (c.wins === 5 ? 'five' : '') + '">' + esc(c.short) + '</div>').join('');
    // korábbi gálák csoportképei, lassan váltakozva
    const G = D.groupPhotos, box = $('#groupph');
    if (!G.length) return;
    box.innerHTML = G.map((p, i) => '<img src="' + p + '" alt=""' + (i ? '' : ' class="on"') + '>').join('');
    if (G.length > 1) {
      let i = 0;
      setInterval(() => {
        const imgs = $$('img', box);
        imgs[i].classList.remove('on'); i = (i + 1) % imgs.length; imgs[i].classList.add('on');
      }, 7000);
    }
  })();
  function runDash() {
    $('#kpi-all').dataset.count = D.companies.length;
    const withEmp = D.companies.filter(c => c.employees);
    $('#kpi-emp').dataset.count = withEmp.reduce((s, c) => s + c.employees, 0);
    $('#kpi-emp-l').innerHTML = withEmp.length < D.companies.length
      ? 'munkavállaló<br>' + withEmp.length + ' cég adatai alapján' : 'munkavállaló<br>összesen';
    $('#kpi-county').dataset.count = new Set(D.companies.map(c => c.county)).size;
    $('#kpi-rec').dataset.count = D.companies.reduce((s, c) => s + c.wins, 0);
    $$('.kpi .v').forEach(el => animateNum(el, +el.dataset.count, 1100));
    const fl = $$('#cols .fl'), co = $$('#allco div');
    fl.forEach(b => { b.style.transition = 'none'; b.style.height = '0'; });
    co.forEach(e => e.classList.remove('in'));
    requestAnimationFrame(() => requestAnimationFrame(() => {
      fl.forEach((b, i) => { b.style.transition = ''; b.style.transitionDelay = (i * 60) + 'ms'; b.style.height = b.dataset.h; });
      co.forEach((e, i) => { e.style.transitionDelay = (300 + i * 25) + 'ms'; e.classList.add('in'); });
    }));
  }

  /* ---------- tonight ---------- */
  (function tonight() {
    $('#t-stats').innerHTML = D.tonight.stats.map(s =>
      '<div><div class="v"' + (s.value ? '' : ' style="color:#d8a13a;font-size:44px"') + '>' +
      (s.value || 'adat érkezik') + '</div><div class="l">' + s.label + '</div></div>').join('');
    $('#gtk').textContent = D.tonight.goodToKnow;
    $('#agenda').innerHTML = D.tonight.agenda.map(a =>
      '<div class="ag"><div class="tm' + (a.time ? '' : ' tbd') + '">' + (a.time || 'időpont<br>érkezik') + '</div>' +
      '<div><div class="tt">' + esc(a.title) + '</div><div class="pl">' + esc(a.place) + '</div></div></div>').join('');
    $('#vlist').innerHTML = D.tonight.venue.map(v =>
      '<div class="vl' + (v.name === 'Ledfal' ? ' here' : '') + '"><span class="n">' + esc(v.name) + '</span>' +
      '<span class="s">' + esc(v.note) + '</span></div>').join('');
  })();

  /* ---------- admin / welcome ---------- */
  const admin = $('#admin');
  let pressT = null;
  $('#adminbtn').addEventListener('pointerdown', () => { pressT = setTimeout(openAdmin, 2000); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(e =>
    $('#adminbtn').addEventListener(e, () => clearTimeout(pressT)));
  document.addEventListener('keydown', e => { if (e.key.toLowerCase() === 'a' && e.ctrlKey) openAdmin(); });
  if (location.search.indexOf('admin') >= 0) openAdmin();
  function openAdmin() { admin.classList.add('show'); clearTimeout(idleT); }
  $('#admin-close').addEventListener('click', () => { admin.classList.remove('show'); resetIdle(); });
  $('#admin-go').addEventListener('click', () => {
    const v = $('#admin-input').value.trim();
    if (v) welcome({ name: v });
  });
  $('#admin-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') $('#admin-go').click();
  });
  (function fillAdminList() {
    const list = $('#alist');
    D.companies.slice().sort((a, b) => a.name.localeCompare(b.name, 'hu')).forEach(c => {
      const e = mk('div', 'ai', c.name);
      e.addEventListener('click', () => welcome(c));
      list.appendChild(e);
    });
  })();

  let welT = null;
  const welCv = $('#welfx'); welCv.width = 3840; welCv.height = 2160;
  const welCtx = welCv.getContext('2d');
  let confetti = [], welRaf = null;
  function burst() {
    const COL = ['#86BC25', '#a6dc45', '#0097A9', '#ffffff', '#d6f09a'];
    confetti = [];
    for (let i = 0; i < 260; i++) {
      const a = Math.random() * Math.PI * 2, sp = 6 + Math.random() * 26;
      confetti.push({
        x: 1920, y: 1080, vx: Math.cos(a) * sp * 1.7, vy: Math.sin(a) * sp - 6,
        w: 8 + Math.random() * 12, h: 18 + Math.random() * 26,
        rot: Math.random() * 6.28, vr: (Math.random() - .5) * .22,
        c: COL[(Math.random() * COL.length) | 0], life: 1
      });
    }
    cancelAnimationFrame(welRaf);
    let last = performance.now();
    (function frame(t) {
      const dt = Math.min(2.5, (t - last) / 16.67); last = t;
      welCtx.clearRect(0, 0, 3840, 2160);
      let alive = 0;
      for (const p of confetti) {
        p.vy += .42 * dt; p.vx *= .992;
        p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
        p.life -= .0042 * dt;
        if (p.life <= 0 || p.y > 2300) continue;
        alive++;
        welCtx.save();
        welCtx.globalAlpha = Math.max(0, Math.min(1, p.life));
        welCtx.translate(p.x, p.y); welCtx.rotate(p.rot);
        welCtx.fillStyle = p.c;
        welCtx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * (.4 + .6 * Math.abs(Math.cos(p.rot))));
        welCtx.restore();
      }
      if (alive) welRaf = requestAnimationFrame(frame);
      else welCtx.clearRect(0, 0, 3840, 2160);
    })(last);
  }
  function welcome(c) {
    admin.classList.remove('show');
    $('#wel-name').textContent = c.name;
    const lg = $('#guest-logo');
    lg.className = 'logo' + (c.logoDark ? ' dark' : '');
    lg.innerHTML = c.logo ? '<img src="' + c.logo + '" alt="">' : '';
    $('.wel').classList.toggle('nologo', !c.logo);
    $('#wel-meta').innerHTML = c.place
      ? '<span>' + esc(c.place) + '</span><span>' + c.wins + '× Best Managed</span>'
      : '';
    const w = $('#welcome');
    w.classList.remove('play'); void w.offsetWidth; w.classList.add('play');
    w.classList.add('show');
    setTimeout(burst, 420);
    setTimeout(burst, 1400);
    clearTimeout(welT);
    welT = setTimeout(closeWelcome, 15000);
  }
  function closeWelcome() {
    $('#welcome').classList.remove('show');
    setTimeout(() => {
      $('#welcome').classList.remove('play');
      cancelAnimationFrame(welRaf);
      welCtx.clearRect(0, 0, 3840, 2160);
    }, 550);
  }
  $('#welcome').addEventListener('pointerdown', () => { clearTimeout(welT); closeWelcome(); });

  toAttract();
})();

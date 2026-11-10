/* Авалон · Помощник пациента — версия для телевизора (сайт tv.html и приложение webOS из папки tvapp/).
 * Пишется на старом JavaScript (ES5): браузер телевизоров LG webOS 3.x — это Chromium 38 (2014 год).
 * НЕЛЬЗЯ: стрелочные функции, let/const, шаблонные строки `...`, fetch, Array.find/includes, Object.assign,
 * CSS-переменные, grid, gap. Картинки — только PNG/JPEG/GIF из папки tv/ (WebP телевизор не показывает).
 * Управление: стрелки пульта, OK, «Назад» (в приложении); в браузере ТВ стрелки двигают курсор — работает и он. */
(function () {
  'use strict';

  var D = null;
  var app = document.getElementById('app');
  var idleBox = document.getElementById('idle');
  var timers = [];
  var memo = {};           // адрес экрана -> номер выбранного элемента (чтобы «Назад» возвращал на то же место)
  var pendingFocus = null; // какой элемент выбрать после перерисовки
  var lastInput = new Date().getTime();
  var HT = { auto: false };
  var SPR = window.SPR || {};
  var SITE = 'https://varta2005.github.io/';
  // Приложение для webOS: пульт отдаёт стрелки странице, можно показывать QR-коды. В браузере ТВ стрелки двигают курсор.
  var APP = !!window.PalmSystem || location.protocol === 'file:';
  var QR = APP && !!window.qrcode; // QR — только в приложении (на сайте QR не нужен — решение владельца)
  var HOW = APP ? 'выберите стрелками пульта и нажмите OK' : 'наведите курсор стрелками пульта и нажмите OK';

  // ———————————— Настройки (хранятся в телевизоре) ————————————
  var S = { size: 1, anim: APP ? 'all' : 'focus', clinic: true, idleMin: 3, slideSec: 12, music: true, vol: 0.3, track: null, checked: {}, quizBest: 0, prep: {} };
  try { var saved = JSON.parse(localStorage.getItem('avalon-tv') || '{}'); for (var sk in saved) if (saved.hasOwnProperty(sk)) S[sk] = saved[sk]; } catch (e) {}
  function save() { try { localStorage.setItem('avalon-tv', JSON.stringify(S)); } catch (e) {} }
  function resetPatient() { S.track = null; S.checked = {}; S.prep = {}; Q = { i: 0, score: 0, answered: null }; SEL = { op: null, back: 0 }; save(); }

  // ———————————— Масштаб: интерфейс рассчитан на 1280×720 и растягивается под экран ————————————
  function fit() {
    var w = window.innerWidth || 1280, h = window.innerHeight || 720;
    var fs = Math.min(w / 1280, h / 720) * 16 * (S.size || 1);
    if (fs < 10) fs = 10; if (fs > 40) fs = 40;
    document.documentElement.style.fontSize = fs + 'px';
    document.body.className = 'anim-' + S.anim + (APP ? ' app' : ' web');
  }
  fit();
  window.addEventListener('resize', fit);

  // ———————————— Помощники ————————————
  var ENT = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  function esc(s) {
    // символы, которых может не быть в шрифте телевизора, заменяем на простые
    return String(s == null ? '' : s).replace(/₽/g, 'руб.').replace(/≈/g, '~').replace(/−/g, '-').replace(/•/g, '·').replace(/★/g, '')
      .replace(/[&<>"']/g, function (c) { return ENT[c]; });
  }
  function map(a, f) { var r = []; for (var i = 0; i < (a ? a.length : 0); i++) r.push(f(a[i], i)); return r.join(''); }
  function filter(a, f) { var r = []; for (var i = 0; i < (a ? a.length : 0); i++) if (f(a[i], i)) r.push(a[i]); return r; }
  function find(a, f) { for (var i = 0; i < (a ? a.length : 0); i++) if (f(a[i], i)) return a[i]; return null; }
  function byId(a, id) { return find(a, function (x) { return x.id === id; }); }
  function has(a, v) { return !!a && a.indexOf(v) >= 0; }
  function q(sel, root) { return (root || document).querySelector(sel); }
  function qa(sel, root) { return (root || document).querySelectorAll(sel); }
  function matches(el, sel) { var m = el.matches || el.webkitMatchesSelector; return m ? m.call(el, sel) : false; }
  function closest(el, sel) { while (el && el.nodeType === 1) { if (matches(el, sel)) return el; el = el.parentNode; } return null; }
  function plural(n, a, b, c) { n = Math.abs(n) % 100; var n1 = n % 10; if (n > 10 && n < 20) return c; if (n1 > 1 && n1 < 5) return b; if (n1 === 1) return a; return c; }
  function now() { return new Date().getTime(); }
  function later(f, ms) { var t = setTimeout(f, ms); timers.push(t); return t; }
  function every(f, ms) { var t = setInterval(f, ms); timers.push(t); return t; }
  function clearTimers() { while (timers.length) { var t = timers.pop(); clearTimeout(t); clearInterval(t); } }
  function attr(s) { return esc(s); }

  var IC = {
    back: 'M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z',
    next: 'M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z',
    home: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z',
    book: 'M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z',
    heart: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z',
    doc: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z',
    clinic: 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 11h-4v4h-4v-4H6v-4h4V6h4v4h4v4z',
    gear: 'M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.49.49 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.48.48 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.48.48 0 00-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1112 8.4a3.6 3.6 0 010 7.2z',
    play: 'M8 5v14l11-7z',
    pause: 'M6 19h4V5H6v14zm8-14v14h4V5h-4z',
    replay: 'M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z',
    check: 'M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z',
    cross: 'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
    phone: 'M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z',
    alert: 'M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z',
    clock: 'M12 2a10 10 0 100 20 10 10 0 000-20zm1 11h-5v-2h3V6h2v7z',
    bulb: 'M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z',
    star: 'M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z',
    qr: 'M3 11h8V3H3v8zm2-6h4v4H5V5zm8-2v8h8V3h-8zm6 6h-4V5h4v4zM3 21h8v-8H3v8zm2-6h4v4H5v-4zm13 4h3v2h-3zm-5-6h2v2h-2zm2 2h2v2h-2zm-2 2h2v2h-2zm2 2h2v2h-2zm2-4h2v2h-2zm0 4h2v2h-2zm2-2h3v2h-3z',
    note: 'M12 3v10.55A4 4 0 1014 17V7h4V3h-6z',
    vol: 'M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0014 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02z',
    up: 'M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z',
    down: 'M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z',
    dpad: 'M12 1l4 5H8zM12 23l-4-5h8zM1 12l5-4v8zM23 12l-5 4V8z',
    left: 'M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z',
    right: 'M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z'
  };
  function ic(k, cls) { return '<svg class="ic ' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true"><path d="' + IC[k] + '"/></svg>'; }

  function rgba(hex, a) {
    var h = String(hex || '#579CAB').replace('#', '');
    return 'rgba(' + parseInt(h.substr(0, 2), 16) + ',' + parseInt(h.substr(2, 2), 16) + ',' + parseInt(h.substr(4, 2), 16) + ',' + a + ')';
  }
  // Картинки: значки — «плёнка» кадров (tv/s/*.png, анимация CSS) или неподвижный PNG; сцены — JPEG, анимация — GIF.
  function still(name) { return 'tv/a/' + name + (D.arts && D.arts[name] ? '.png' : '.jpg'); }
  function art(name, cls) {
    var tint = (D.arts && D.arts[name]) || '#579CAB';
    var white = cls && cls.indexOf('white') >= 0;
    var bg = white ? 'rgba(255,255,255,.16)' : cls && cls.indexOf('nohalo') >= 0 ? 'transparent' : rgba(tint, 0.13);
    var sp = SPR[name], inner;
    if (sp && sp[0] > 1 && S.anim !== 'off') {
      var st = 'background-image:url(tv/s/' + name + '.png);background-size:' + (sp[0] * 100) + '% 100%;-webkit-animation-duration:' + sp[1] + 'ms;animation-duration:' + sp[1] +
        'ms;-webkit-animation-timing-function:steps(' + (sp[0] - 1) + ');animation-timing-function:steps(' + (sp[0] - 1) + ')';
      inner = '<i class="spr" style="' + st + '"></i>';
    } else if (D.arts && D.arts[name]) inner = '<img src="' + still(name) + '" alt="">';
    else inner = '<img class="cover" src="' + still(name) + '" alt="">';
    return '<span class="art ' + (cls || '') + '" style="background:' + bg + '">' + inner + '</span>';
  }
  // live = анимация сразу (плеер, заставка); иначе — неподвижный кадр, оживает при выборе (data-g)
  function scene(name, live) {
    if (S.anim === 'off') return '<img class="scene" src="' + still(name) + '" alt="">';
    return live ? '<img class="scene" src="tv/g/' + name + '.gif" alt="">' : '<img class="scene" src="' + still(name) + '" data-g="' + name + '" alt="">';
  }
  function list(items, kind) {
    return '<ul class="list ' + (kind || '') + '">' + map(items, function (x) {
      var k = kind === 'bad' ? 'cross' : kind === 'warn' ? 'alert' : 'check';
      return '<li>' + ic(k) + '<span>' + esc(x) + '</span></li>';
    }) + '</ul>';
  }
  function box(title, inner, cls, attrs) { return '<div class="f box ' + (cls || '') + '" tabindex="0"' + (attrs || '') + '>' + (title ? '<h3>' + title + '</h3>' : '') + inner + '</div>'; }
  function chips(items) { return '<div class="chips">' + map(items, function (x) { return '<span class="chip">' + esc(x) + '</span>'; }) + '</div>'; }
  function head(kick, title, sub, right, cls) {
    return '<section class="head ' + (cls || '') + '"><div class="htxt">' + (kick ? '<div class="kick">' + kick + '</div>' : '') + '<h1>' + title + '</h1>' + (sub || '') + '</div>' + (right || '') + '</section>';
  }
  // текст, который сам сменяется (как на карточках в приложении)
  function rot(items, cls) {
    items = filter(items, function (x) { return !!x; });
    if (!items.length) return '';
    return '<span class="rot ' + (cls || '') + '"' + (items.length > 1 ? ' data-items="' + attr(JSON.stringify(items)) + '"' : '') + '><span>' + esc(items[0]) + '</span></span>';
  }
  function btn(href, label, cls, extra) { return '<a class="f btn ' + (cls || 'teal') + '" href="' + href + '"' + (extra || '') + '>' + label + '</a>'; }
  function actBtn(act, label, cls, extra) { return '<a class="f btn ' + (cls || 'teal') + '" href="#" data-act="' + act + '"' + (extra || '') + '>' + label + '</a>'; }
  var DISCLAIMER = '<p class="disc">Информация носит справочный характер. Всегда следуйте рекомендациям вашего лечащего врача.</p>';

  // ———————————— Данные ————————————
  function opsIn(sec) { return filter(D.operations, function (o) { return (o.section || 'Surgery') === sec; }); }
  function secOf(id) { return byId(D.sections || [], id); }
  function periodOf(o) { return o.period || 'Восстановление ≈ ' + o.recoveryDays + ' дней'; }
  function today() { var d = new Date(); d.setHours(0, 0, 0, 0); return d; }
  function parseDate(s) { var p = String(s).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function ymd(d) { var m = d.getMonth() + 1, dd = d.getDate(); return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (dd < 10 ? '0' : '') + dd; }
  function dayIndex() { return S.track ? Math.max(0, Math.round((today() - parseDate(S.track.date)) / 864e5)) : 0; }
  function stageOf(o, day) { var r = o.stages[0]; for (var i = 0; i < o.stages.length; i++) if (day >= o.stages[i].dayFrom) r = o.stages[i]; return r; }
  var MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  function human(d) { return d.getDate() + ' ' + MONTHS[d.getMonth()]; }
  var PREP_FOR = { extraction: 'prep-extraction', wisdom: 'prep-extraction', resection: 'prep-extraction', cyst: 'prep-extraction', gum: 'prep-extraction', implant: 'prep-implant', bonegraft: 'prep-implant', sinus: 'prep-sinus' };
  var STYLE = { Teal: 'g-teal', Night: 'g-night', Sun: 'g-sun', Lilac: 'g-lilac', Coral: 'g-coral', Mint: 'g-mint' };
  var HEADSTYLE = { Teal: 'teal', Night: 'night', Sun: 'sun', Lilac: 'lilac', Coral: 'coral', Mint: 'mint' };
  var TIP_HOWTO = [['Тампон', 'gauze'], ['Холод', 'ice'], ['Ванночки', 'bath'], ['Заживляющая паста', 'paste'], ['Чистить зубы', 'brush'], ['Гимнастика', 'jaw'], ['Чихать', 'sneeze'],
    ['Нить', 'floss'], ['Ирригатор', 'irrigator'], ['Мягкая щётка', 'brushing'], ['Осмотр', 'prevention'], ['Профгигиена', 'prevention'], ['Поддержка', 'prevention'], ['Контроль', 'prevention'],
    ['«Белая диета»', 'whitediet'], ['Меньше красящего', 'whitediet'], ['Ортодонтическая щётка', 'bracescare'], ['Воск', 'bracescare'], ['20–22 часа', 'aligners'], ['Почистить — и надеть', 'aligners'],
    ['Капа — от 12', 'aligners'], ['Футляр', 'aligners'], ['Чистить после еды', 'denturecare'], ['Крем для фиксации', 'denturefix'], ['Домашние капы', 'homewhite']];
  function howToForTip(title) { var m = find(TIP_HOWTO, function (p) { return title.indexOf(p[0]) === 0; }); return m && byId(D.howtos || [], m[1]) ? m[1] : null; }

  // ———————————— Чтение вслух (если телевизор умеет) ————————————
  var TTS = window.speechSynthesis && window.SpeechSynthesisUtterance ? window.speechSynthesis : null;
  var SAY = { id: null };
  function listen(id, label) { return TTS ? '<a class="f btn ghost listen' + (SAY.id === id ? ' on' : '') + '" href="#" data-say="' + attr(id) + '">' + ic(SAY.id === id ? 'pause' : 'vol') + (SAY.id === id ? 'Стоп' : (label || 'Слушать')) + '</a>' : ''; }
  function sayList(a) { return map(a, function (x) { return String(x).replace(/[.\s]+$/, '') + '. '; }); }
  function speechFor(id) {
    var p = id.split(':'), o;
    if (p[0] === 'guide' && (o = byId(D.operations, p[1]))) {
      var t = +p[2];
      if (t === 0) return o.title + '. ' + o.about + ' ' + map(o.stages, function (s) { return s.period + ': ' + s.title + '. ' + s.whatHappens + ' ' + sayList(s.tasks); });
      if (t === 1) return 'Что можно и нужно. ' + map(o.dos, function (x) { return x.title + '. ' + x.details + ' '; });
      if (t === 2) return 'Чего делать нельзя. ' + map(o.donts, function (x) { return x.title + '. ' + x.details + ' '; });
      if (t === 3) return 'Можно есть: ' + sayList(o.foodYes) + 'Лучше исключить: ' + sayList(o.foodNo);
      return 'Это нормально: ' + sayList(o.normal) + 'Срочно позвоните врачу, если: ' + sayList(o.redFlags);
    }
    if (p[0] === 'howto' && (o = byId(D.howtos || [], p[1]))) return o.title + '. ' + map(o.steps, function (s, i) { return 'Шаг ' + (i + 1) + '. ' + s.title + '. ' + s.text + ' '; });
    if (p[0] === 'step' && (o = byId(D.howtos || [], p[1]))) { var st = o.steps[+p[2]]; return st.title + '. ' + st.text; }
    if (p[0] === 'article' && (o = byId(D.articles, p[1]))) return o.title + '. ' + map(o.sections, function (s) { return s.h + '. ' + s.b + ' '; });
    if (p[0] === 'prep' && (o = byId(D.prep || [], p[1]))) return o.title + '. ' + o.intro + ' ' + map(o.steps, function (s) { return s.period + '. ' + s.title + '. ' + sayList(s.items); });
    return '';
  }
  function speak(id) {
    if (!TTS) return;
    TTS.cancel();
    if (SAY.id === id) { SAY.id = null; refreshSay(); return; }
    var u = new window.SpeechSynthesisUtterance(speechFor(id) + ' Следуйте рекомендациям вашего лечащего врача.');
    u.lang = 'ru-RU'; var vs = TTS.getVoices ? TTS.getVoices() : [];
    var v = find(vs, function (x) { return /^ru/i.test(x.lang); }); if (v) u.voice = v;
    u.onend = function () { SAY.id = null; refreshSay(); if (S.music) musicFade(musicTarget()); };
    SAY.id = id; TTS.speak(u); refreshSay(); if (S.music) musicFade(musicTarget());
  }
  function stopSpeech() { if (TTS && SAY.id) { TTS.cancel(); SAY.id = null; } }
  function refreshSay() {
    var bs = qa('[data-say]');
    for (var i = 0; i < bs.length; i++) { var on = bs[i].getAttribute('data-say') === SAY.id; bs[i].className = bs[i].className.replace(/ on\b/, '') + (on ? ' on' : ''); bs[i].innerHTML = ic(on ? 'pause' : 'vol') + (on ? 'Стоп' : 'Слушать'); }
  }

  // ———————————— Фоновая музыка (спокойные мелодии сочинены программой web/tools/make_music.py) ————————————
  var MUSIC = [['tv/music/calm-1.mp3', 'Утро'], ['tv/music/calm-2.mp3', 'Тишина'], ['tv/music/calm-3.mp3', 'Море']];
  var MU = { el: null, i: 0, fade: null };
  function musicTarget() { return S.vol * (TTS && SAY.id ? 0.25 : 1); } // во время чтения вслух музыка тише
  function musicFade(to, done) {
    if (!MU.el) return; clearInterval(MU.fade);
    MU.fade = setInterval(function () {
      var v = MU.el.volume, d = to - v, st = 0.03;
      if (Math.abs(d) <= st) { MU.el.volume = Math.max(0, Math.min(1, to)); clearInterval(MU.fade); if (done) done(); }
      else MU.el.volume = Math.max(0, Math.min(1, v + (d > 0 ? st : -st)));
    }, 80);
  }
  function musicPlay() {
    if (!MU.el) {
      try { MU.el = new Audio(); } catch (e) { return; }
      MU.el.preload = 'auto'; MU.el.volume = 0;
      MU.el.addEventListener('ended', function () { MU.i = (MU.i + 1) % MUSIC.length; MU.el.src = MUSIC[MU.i][0]; tryPlay(); });
      MU.i = new Date().getHours() % MUSIC.length; MU.el.src = MUSIC[MU.i][0];
    }
    if (MU.el.paused) tryPlay();
    musicFade(musicTarget());
  }
  function tryPlay() { try { var pr = MU.el.play(); if (pr && pr['catch']) pr['catch'](function () {}); } catch (e) {} }
  function musicApply() { if (S.music) musicPlay(); else if (MU.el && !MU.el.paused) musicFade(0, function () { MU.el.pause(); }); }
  function musicNext() { if (!MU.el) return musicPlay(); MU.i = (MU.i + 1) % MUSIC.length; MU.el.src = MUSIC[MU.i][0]; MU.el.volume = 0; tryPlay(); musicFade(musicTarget()); }

  // ———————————— QR-код (только в приложении) ————————————
  function qrSvg(url) {
    try { var c = window.qrcode(0, 'M'); c.addData(url); c.make(); return c.createSvgTag({ cellSize: 4, margin: 3, scalable: true }); } catch (e) { return ''; }
  }
  function shareSheet(path, title, sub) {
    openSheet('<div class="qrwrap"><div class="qrbox">' + qrSvg(SITE + path) + '<span class="qrlogo"><img src="img/mark-white.svg" alt=""></span></div><div class="qrtxt">' +
      '<div class="kick">С собой на телефон</div><h2>' + esc(title) + '</h2><p>' + esc(sub || 'Наведите камеру телефона на код и откройте ссылку — памятка откроется на вашем телефоне. Работает на iPhone и Android, без установки.') + '</p>' +
      '<ol class="olist"><li>Откройте камеру на телефоне</li><li>Наведите на код</li><li>Нажмите на появившуюся ссылку</li></ol>' + actBtn('close', ic('check') + 'Готово', 'teal', ' data-main="1"') + '</div></div>');
  }

  // ———————————— Всплывающее окно (подробности, QR) ————————————
  var sheetOpener = null;
  function openSheet(html) {
    closeSheet(true);
    sheetOpener = document.activeElement;
    var bg = document.createElement('div'); bg.id = 'sheet'; bg.innerHTML = '<div class="sheetbox">' + html + '</div>';
    document.body.appendChild(bg);
    var t = q('#sheet [data-main]') || q('#sheet .f'); if (t) focusEl(t);
  }
  function closeSheet(silent) {
    var s = document.getElementById('sheet'); if (!s) return false;
    s.parentNode.removeChild(s);
    if (!silent && sheetOpener && sheetOpener.parentNode) focusEl(sheetOpener);
    sheetOpener = null; return true;
  }

  // ———————————— Экраны ————————————
  function tile(href, pic, title, sub, extra, cls) {
    return '<a class="f card tile ' + (cls || '') + '" href="' + href + '">' + pic + '<b>' + title + '</b>' + (sub ? '<span class="muted">' + sub + '</span>' : '') + (extra || '') + '</a>';
  }
  function more(href, title, n) { return '<a class="f card tile moretile" href="' + href + '"><span class="mic">' + ic('next') + '</span><b>' + title + '</b>' + (n ? '<span class="muted">' + n + '</span>' : '') + '</a>'; }

  // главная: баннер-карусель + ряды карточек (как на главной в приложении)
  var HERO = { i: 0, n: 0 };
  function heroSlides() {
    var sl = [], op = S.track && byId(D.operations, S.track.op), day = dayIndex();
    if (op) { var st = stageOf(op, day); sl.push({ tag: 'МОЙ ПУТЬ', title: 'День ' + day + ' восстановления', sub: op.title + ' · ' + st.title.toLowerCase(), facts: st.tasks.slice(0, 3), cta: 'Чек-лист', g: 'g-teal', art: op.art, href: '#/tracker' }); }
    else sl.push({ tag: 'МОЙ ПУТЬ', title: 'План восстановления по дням', sub: 'Укажите операцию и дату — подскажу, что делать каждый день', facts: ['Чек-лист на каждый день', 'Самопроверка симптомов'], cta: 'Начать', g: 'g-teal', art: 'Calendar', href: '#/tracker' });
    if (QR) sl.push({ tag: 'С СОБОЙ', title: 'Заберите памятку на телефон', sub: 'Откройте свою памятку и нажмите «На телефон» — появится QR-код', facts: ['Наведите камеру — памятка откроется', 'iPhone и Android, без установки'], cta: 'К памяткам', g: 'g-night', art: 'Phone', href: '#/guides' });
    var hts = D.howtos || [];
    if (hts.length) sl.push({ tag: 'КАК ПРАВИЛЬНО', title: 'Покажем по шагам', sub: hts.length + ' анимированных инструкций: тампон, холод, ванночки, чистка зубов, капы, протез', facts: map(hts.slice(0, 6), function (h) { return h.title + '|'; }).split('|'), cta: 'Смотреть', g: 'g-mint', scene: hts[0].cover, href: '#/howto' });
    sl.push({ tag: 'ПАМЯТКА', title: 'После удаления зуба', sub: 'Что можно и нельзя — по дням, с картинками', facts: ['Тампон 15–20 минут', 'Холод — первые сутки', 'Не полоскать в 1-й день'], cta: 'Открыть', g: 'g-lilac', art: 'Tooth', href: '#/guide/extraction/0' });
    sl.push({ tag: 'ПАМЯТКА', title: 'После имплантации', sub: 'Как помочь имплантату прижиться', facts: ['Не курить', 'Мягкая пища на другой стороне', 'Лекарства — по схеме врача'], cta: 'Открыть', g: 'g-mint', art: 'Implant', href: '#/guide/implant/0' });
    sl.push({ tag: 'ВАЖНО', title: 'Норма или тревога?', sub: 'Когда всё идёт по плану, а когда срочно звонить врачу', facts: ['Отёк до 3 дней — норма', 'Кровь дольше 40 минут — звоните'], cta: 'Узнать', g: 'g-coral', art: 'Phone', href: '#/emergency' });
    sl.push({ tag: 'ОТЗЫВ', title: 'Оцените клинику «Авалон»', sub: 'Отзыв на Яндексе, 2ГИС или ПроДокторов — за 1 минуту', facts: map(D.reviews, function (r) { return r.name + ' — ' + r.rating + '|'; }).split('|'), cta: 'Оставить отзыв', g: 'g-sun', art: 'Heart', href: '#/reviews' });
    var os = byId(D.promos, 'osstem');
    if (os) sl.push({ tag: 'АКЦИЯ', title: 'Имплантация Osstem', sub: os.price + ' под ключ', facts: os.facts, cta: 'Подробнее', g: 'g-night', art: 'Implant', href: '#/promo/osstem' });
    return sl;
  }
  function viewHome() {
    var secs = D.sections || [], hts = D.howtos || [], sl = heroSlides(), op = S.track && byId(D.operations, S.track.op);
    HERO.n = sl.length; if (HERO.i >= sl.length) HERO.i = 0;
    var start = new Date().getDate() % D.tips.length, tips = D.tips.slice(start).concat(D.tips.slice(0, start));
    var hero = '<a class="f hero" href="' + sl[HERO.i].href + '" data-hero="1" data-main="1" id="hero">' + map(sl, function (s, i) {
      return '<span class="slide ' + s.g + (i === HERO.i ? ' on' : '') + '" data-href="' + s.href + '"><span class="stxt2"><span class="pill glass">' + s.tag + '</span><b class="st">' + esc(s.title) + '</b>' +
        '<span class="ss">' + esc(s.sub) + '</span><span class="sf">' + ic('star') + rot(s.facts) + '</span><span class="cta">' + ic('play') + s.cta + '</span></span>' +
        (s.scene ? '<span class="hscene">' + scene(s.scene, i === HERO.i) + '</span>' : art(s.art, 'hx white live')) + '</span>';
    }) + '<span class="dots">' + map(sl, function (s, i) { return '<i class="' + (i === HERO.i ? 'on' : '') + '"></i>'; }) + '</span>' +
      '<span class="harr l">' + ic('left') + '</span><span class="harr r">' + ic('right') + '</span></a>';
    var html = hero +
      '<h2 class="h">Памятки после лечения</h2><div class="grid g6 hm">' + map(secs, function (s) {
        var ops = opsIn(s.id), n = ops.length;
        return tile('#/guides/' + s.id, art(s.art, 'm'), esc(s.title), rot([s.short].concat(map(ops, function (o) { return o.title + '|'; }).split('|'))), '<span class="pill">' + n + ' ' + plural(n, 'памятка', 'памятки', 'памяток') + '</span>');
      }) + '</div>' +
      '<h2 class="h">Как правильно <span class="hsub">— анимированные пошаговые инструкции</span></h2><div class="grid g5">' + map(hts.slice(0, 4), htCard) + more('#/howto', 'Все инструкции', hts.length + ' ' + plural(hts.length, 'инструкция', 'инструкции', 'инструкций')) + '</div>' +
      '<h2 class="h">Проверьте себя</h2><div class="grid g4">' +
      tile('#/tracker', art(op ? op.art : 'Calendar', 'm white'), 'Мой путь', op ? rot(['День ' + dayIndex() + ' · ' + op.title, stageOf(op, dayIndex()).tasks[0]]) : rot(['План восстановления по дням', 'Чек-лист и самопроверка']), '', 'g-teal') +
      tile('#/emergency', art('Phone', 'm white'), 'Норма или тревога?', rot(['Когда звонить врачу', 'Что нормально после операции']), '', 'g-coral') +
      tile('#/quiz', art('Calendar', 'm white'), 'Викторина', rot([S.quizBest ? 'Рекорд: ' + S.quizBest + ' из ' + D.quiz.length : D.quiz.length + ' вопросов', 'Проверьте себя за 2 минуты']), '', 'g-sun') +
      tile('#/myths', art('Heart', 'm white'), 'Мифы и факты', rot(['Грелка снимет отёк?', 'Сода ускоряет заживление?', D.myths.length + ' мифов']), '', 'g-lilac') + '</div>' +
      '<div class="f box sun tipbox" tabindex="0"><span class="tipic">' + ic('bulb') + '</span><div><b>Совет дня</b><div class="tiptext">' + rot(tips, 'slow') + '</div></div></div>' +
      '<h2 class="h">Перед операцией</h2>' + prepRow() +
      '<h2 class="h">Акции клиники</h2><div class="grid g4">' + map(D.promos.slice(0, 3), promoCard) + more('#/promos', 'Все акции', D.promos.length + ' предложений') + '</div>' +
      '<h2 class="h">Наши врачи</h2><div class="grid g6">' + map(D.doctors.slice(0, 5), docCard) + more('#/doctors', 'Все врачи', D.doctors.length + ' специалистов') + '</div>' +
      '<h2 class="h">Полезно знать</h2><div class="grid g4">' + map(D.articles.slice(0, 3), articleCard) + more('#/articles', 'Все статьи', D.articles.length + ' статей') + '</div>' +
      '<h2 class="h">Клиника «Авалон»</h2><div class="grid g4">' +
      tile('#/clinic', '<span class="logoart"><img src="img/mark-white.svg" alt=""></span>', 'О клинике', rot([D.clinic.address.replace('Санкт-Петербург, ', ''), 'Метро ' + D.clinic.metro, D.clinic.hours, D.clinic.phone]), '', 'g-night') +
      tile('#/booking', art('Calendar', 'm white'), 'Записаться на приём', rot([QR ? 'Заявка с телефона по QR-коду' : 'По телефону ' + D.clinic.phone, D.clinic.hours]), '', 'g-teal') +
      tile('#/reviews', art('Heart', 'm white'), 'Оставить отзыв', rot(map(D.reviews, function (r) { return r.name + ' — ' + r.rating + '|'; }).split('|')), '', 'g-sun') +
      tile('#/settings', '<span class="mic big">' + ic('gear') + '</span>', 'Настройки', rot(['Размер текста', 'Анимации', 'Режим клиники']), '', 'g-lilac') + '</div>';
    return { title: '', html: html };
  }
  function heroGo(d) {
    var h = document.getElementById('hero'); if (!h) return;
    var ss = qa('.slide', h), ds = qa('.dots i', h); if (!ss.length) return;
    var old = HERO.i; HERO.i = (HERO.i + d + ss.length) % ss.length;
    ss[old].className = ss[old].className.replace(' on', ''); ss[HERO.i].className += ' on';
    ds[old].className = ''; ds[HERO.i].className = 'on';
    var im = q('.hscene img', ss[old]); if (im && S.anim !== 'off') im.src = 'tv/a/' + (im.getAttribute('src').split('/').pop().split('.')[0]) + '.jpg';
    im = q('.hscene img', ss[HERO.i]); if (im && S.anim !== 'off') im.src = 'tv/g/' + (im.getAttribute('src').split('/').pop().split('.')[0]) + '.gif';
    h.setAttribute('href', ss[HERO.i].getAttribute('data-href'));
  }

  function prepRow() {
    return '<div class="grid g4">' + map(D.prep || [], function (p) {
      return tile('#/prep/' + p.id, art(p.art, 'm white'), esc(p.title), esc(p.subtitle), '', p.id === 'prep-sedation' ? 'g-lilac' : 'g-night');
    }) + tile('#/anesthesia', art('Drip', 'm white'), 'Лечение во сне', rot(['Седация и наркоз', 'Как подготовиться: голод 6 часов', 'Анестезиолог рядом всё время']), '', 'g-lilac') + '</div>';
  }

  var SEC = 'Surgery';
  function secTabs(sec, base) {
    return '<div class="tabs">' + map(D.sections || [], function (x) {
      return '<a class="f tab' + (x.id === sec ? ' on' : '') + '" href="' + base + x.id + '" data-rep="1" data-pf="[data-sec=' + x.id + ']" data-sec="' + x.id + '"' + (x.id === sec ? ' data-main="1"' : '') + '>' + esc(x.title) + ' <i>' + opsIn(x.id).length + '</i></a>';
    }) + '</div>';
  }
  function viewGuides(sec) {
    if (!secOf(sec)) sec = (D.sections || [{ id: 'Surgery' }])[0].id;
    SEC = sec;
    var s = secOf(sec) || {};
    var html = secTabs(sec, '#/guides/') + '<p class="lead">' + esc(s.short || '') + ' — ' + HOW + '</p>' +
      '<div class="grid g4">' + map(opsIn(sec), function (o) {
        var per = o.period && o.section !== 'Surgery' ? o.period : '≈ ' + o.recoveryDays + ' дней';
        return tile('#/guide/' + o.id + '/0', art(o.art, 'm'), esc(o.title), rot([o.subtitle, o.dos.length + ' советов «можно»', o.donts.length + ' запретов', o.stages.length + ' ' + plural(o.stages.length, 'этап', 'этапа', 'этапов') + ' по дням']), '<span class="pill">' + esc(per) + '</span>');
      }) + '</div>';
    if (sec === 'Surgery') html += '<h2 class="h">Перед операцией</h2>' + prepRow();
    return { title: 'Памятки', html: html + DISCLAIMER };
  }

  var TABS = ['Этапы', 'Можно', 'Нельзя', 'Питание', 'Когда звонить врачу'];
  function viewGuide(id, tab) {
    var o = byId(D.operations, id); if (!o) return viewGuides(SEC);
    tab = Math.max(0, Math.min(4, +tab || 0));
    var s = o.section && o.section !== 'Surgery' ? 'Памятка · ' + esc((secOf(o.section) || {}).title || '') : 'Памятка после операции';
    var btns = '<div class="hbtns">' + (QR ? actBtn('share', ic('qr') + 'На телефон', 'white', ' data-share="#/guide/' + o.id + '" data-title="Памятка: ' + attr(o.title) + '"') : '') +
      actBtn('start', ic('heart') + (o.section && o.section !== 'Surgery' ? 'Мне сегодня это сделали' : 'Мне сегодня сделали эту операцию'), 'white', ' data-op="' + o.id + '"') +
      listen('guide:' + o.id + ':' + tab, 'Слушать «' + TABS[tab] + '»') + '</div>';
    var html = head(s, esc(o.title), '<span class="pill glass">' + esc(periodOf(o)) + '</span><p>' + esc(o.about) + '</p>' + btns, art(o.art, 'xl white live')) +
      '<div class="tabs">' + map(TABS, function (t, i) {
        return '<a class="f tab' + (i === tab ? ' on' : '') + '" href="#/guide/' + o.id + '/' + i + '" data-rep="1" data-pf="[data-tab=\'' + i + '\']" data-tab="' + i + '"' + (i === tab ? ' data-main="1"' : '') + '>' + t + '</a>';
      }) + '</div>';
    var body = '';
    if (tab === 0) {
      body = '<div class="grid g2">' + map(o.stages, function (st, i) {
        return '<div class="f card stage" tabindex="0"><span class="num">' + (i + 1) + '</span><div><div class="period">' + esc(st.period) + '</div><b>' + esc(st.title) + '</b>' +
          '<p class="muted">' + esc(st.whatHappens) + '</p>' + list(st.tasks) + '</div></div>';
      }) + '</div>';
      if ((o.care || []).length) body += box('Уход и лекарства', '<p class="muted small">По памятке клиники «Авалон». Препараты — только те, что назначил ваш врач.</p>' + list(o.care), 'pale');
      if ((o.dates || []).length) body += box('Важные сроки', list(o.dates, 'sun'), 'sun');
      if ((o.prevention || []).length) body += box('Профилактика', list(o.prevention), 'mint');
      var hs = filter(D.howtos || [], function (h) { return has(h.ops, o.id); });
      if (hs.length) body += '<h2 class="h">Как правильно — покажем по шагам</h2><div class="grid g4">' + map(hs, htCard) + '</div>';
    } else if (tab === 1 || tab === 2) {
      var good = tab === 1;
      body = '<p class="lead">Нажмите OK на карточке — расскажу подробнее' + (good ? ' и покажу, как правильно' : '') + '</p><div class="grid g4">' + map(good ? o.dos : o.donts, function (t, i) {
        return '<a class="f card tip" href="#" data-tip="' + (good ? 'dos' : 'donts') + ':' + i + '" data-gid="' + o.id + '"><span class="tiptop">' + art(t.art, 's') + '<span class="mark ' + (good ? 'ok' : 'no') + '">' + ic(good ? 'check' : 'cross') + '</span></span>' +
          '<b>' + esc(t.title) + '</b><span class="short ' + (good ? 'ok' : 'no') + '">' + esc(t.short) + '</span></a>';
      }) + '</div>';
    } else if (tab === 3) {
      body = '<div class="grid g2">' + box('Можно есть', chips(o.foodYes), 'mint') + box('Лучше исключить', chips(o.foodNo), 'coral') + '</div>' +
        box('', '<div class="rowc">' + art('SoftFood', 's') + '<span>Еда — тёплая, не горячая. Жуйте на здоровой стороне. После еды аккуратно обходите рану при чистке зубов.</span></div>', 'sun');
    } else body = alarmBlock(o.normal, o.redFlags);
    var extra = '<div class="grid g2">';
    if (PREP_FOR[o.id]) extra += tile('#/prep/' + PREP_FOR[o.id], art('Calendar', 's white'), 'Как подготовиться к операции', 'Что взять с собой и что сказать врачу', '', 'g-night wide');
    extra += tile('#/booking', art('Doctor', 's white'), 'Записаться на контрольный осмотр', QR ? 'Заявка с телефона по QR-коду' : D.clinic.phone, '', 'g-teal wide') + '</div>';
    return { title: o.title, html: html + body + extra + DISCLAIMER };
  }
  function alarmBlock(normal, red) {
    return '<div class="grid g2">' + box('Это нормально', list(normal), 'mint') + box('Срочно позвоните врачу, если:', list(red, 'warn'), 'coral') + '</div>' +
      box('', '<div class="rowc">' + ic('phone', 'big') + '<div><b class="phone">' + esc(D.clinic.phone) + '</b><div class="muted">Клиника «Авалон» · ' + esc(D.clinic.hours) + '</div></div></div>', 'pale');
  }
  function openTip(gid, key) {
    var o = byId(D.operations, gid); if (!o) return;
    var p = key.split(':'), t = o[p[0]][+p[1]], good = p[0] === 'dos', ht = howToForTip(t.title);
    openSheet('<div class="tipsheet">' + art(t.art, 'xxl live') + '<div class="tstxt"><span class="pill ' + (good ? 'mint' : 'coral') + '">' + ic(good ? 'check' : 'cross') + (good ? 'РЕКОМЕНДУЕТСЯ' : 'НЕЛЬЗЯ') + '</span>' +
      '<h2>' + esc(t.title) + '</h2><b class="short ' + (good ? 'ok' : 'no') + '">' + esc(t.short) + '</b><div class="box pale why"><b>Почему это важно</b><p>' + esc(t.details) + '</p></div>' +
      '<div class="btns">' + (ht ? btn('#/howto/' + ht + '/0', ic('play') + 'Показать, как правильно', 'teal', ' data-main="1"') : '') + actBtn('close', ic('check') + 'Понятно', ht ? 'ghost' : 'teal', ht ? '' : ' data-main="1"') + '</div></div></div>');
  }

  function htCard(h) {
    return '<a class="f card ht" href="#/howto/' + h.id + '/0"><span class="scenebox">' + scene(h.cover) + '<span class="pill dark">' + h.steps.length + ' ' + plural(h.steps.length, 'шаг', 'шага', 'шагов') + '</span></span>' +
      '<b>' + esc(h.title) + '</b><span class="muted">' + esc(h.subtitle) + '</span></a>';
  }
  function viewHowTos() {
    var hts = D.howtos || [];
    return { title: 'Как правильно', html: head('Анимированные инструкции', 'Как правильно', '<p>Покажем по шагам: тампон, холод, ванночки, паста на швы, чистка зубов, нить, ирригатор, брекеты, капы, протез, отбеливание и профилактика</p>', '', 'slim') +
      '<div class="grid g4">' + map(hts, function (h, i) { return htCard(h).replace('class="f card ht"', 'class="f card ht"' + (i === 0 ? ' data-main="1"' : '')); }) + '</div>' + DISCLAIMER };
  }
  function fmt(s) { var m = Math.floor(s / 60), x = s % 60; return m + ':' + (x < 10 ? '0' : '') + x; }
  function viewHowTo(id, stepArg) {
    var h = byId(D.howtos || [], id); if (!h) return viewHowTos();
    var step = Math.max(0, Math.min(h.steps.length - 1, +stepArg || 0)); var st = h.steps[step]; var last = step === h.steps.length - 1;
    var base = '#/howto/' + h.id + '/';
    var timer = st.timer ? '<div class="timer" id="timer" data-total="' + st.timer + '" data-left="' + st.timer + '"><span class="tring"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" class="tbg"/><circle cx="50" cy="50" r="44" class="tfg" id="tfg"/></svg><b id="ttime">' + fmt(st.timer) + '</b></span>' +
      '<span class="ttxt"><b>' + esc(st.timerLabel || 'Таймер') + '</b><span class="muted small">' + (st.timer >= 60 ? 'Таймер на ' + Math.round(st.timer / 60) + ' мин — не нужно смотреть на часы' : 'Таймер на ' + st.timer + ' секунд') + '</span>' +
      '<span class="tbtns">' + actBtn('timer', ic('play') + 'Запустить', 'sunb', ' id="tbtn"') + actBtn('treset', ic('replay') + 'Сначала', 'ghost') + '</span></span></div>' : '';
    var btns = '<div class="btns">' +
      (step ? '<a class="f btn ghost" href="' + base + (step - 1) + '" data-rep="1" data-pf="[data-nav=prev]" data-nav="prev">' + ic('back') + 'Назад</a>' : '') +
      (last ? '<a class="f btn mint" href="#/howto" data-nav="done"' + (HT.auto ? '' : ' data-main="1"') + '>' + ic('check') + 'Готово</a>'
        : '<a class="f btn teal" href="' + base + (step + 1) + '" data-rep="1" data-pf="[data-nav=next]" data-nav="next"' + (HT.auto ? '' : ' data-main="1"') + '>Дальше' + ic('next') + '</a>') +
      (h.steps.length > 1 ? actBtn('auto', ic(HT.auto ? 'pause' : 'play') + (HT.auto ? 'Пауза' : 'Показать подряд'), 'ghost', HT.auto ? ' data-main="1"' : '') : '') +
      listen('howto:' + h.id, 'Слушать всё') + (QR ? actBtn('share', ic('qr') + 'На телефон', 'ghost', ' data-share="#/howto/' + h.id + '" data-title="Как правильно: ' + attr(h.title) + '"') : '') + '</div>';
    var dots = '<div class="steps">' + map(h.steps, function (x, i) {
      return '<a class="f stepbtn' + (i === step ? ' on' : '') + '" href="' + base + i + '" data-rep="1" data-pf="[data-step=\'' + i + '\']" data-step="' + i + '"><span class="n">' + (i + 1) + '</span><span>' + esc(x.title) + '</span></a>';
    }) + '</div>';
    var html = '<section class="player"><div class="stagebox">' + scene(st.scene, true) + '<span class="pill dark">Шаг ' + (step + 1) + ' из ' + h.steps.length + '</span>' +
      (HT.auto ? '<span class="autobar"><i style="-webkit-animation-duration:8s;animation-duration:8s"></i></span>' : '') + '</div>' +
      '<div class="ptxt"><div class="kick">Как правильно · ' + esc(h.title) + '</div><div class="stepline">' + map(h.steps, function (x, i) { return '<i class="' + (i <= step ? 'on' : '') + '"></i>'; }) + '</div>' +
      '<h1>' + esc(st.title) + '</h1><p class="big">' + esc(st.text) + '</p>' + timer + btns + '</div></section>' +
      '<h2 class="h">Все шаги</h2>' + dots + DISCLAIMER +
      '<h2 class="h">Ещё инструкции</h2><div class="grid g4">' + map(filter(D.howtos, function (x) { return x.id !== h.id; }), htCard) + '</div>';
    if (HT.auto) later(function () {
      if (!last) { pendingFocus = '[data-act=auto]'; location.replace('#' + base.substr(1) + (step + 1)); }
      else { HT.auto = false; pendingFocus = '[data-nav=done]'; render(); }
    }, 8000);
    return { title: h.title, html: html };
  }
  var TIMER = null;
  function tickTimer(run) {
    var el = document.getElementById('timer'); if (!el) return;
    if (TIMER) { clearInterval(TIMER); TIMER = null; }
    var b = document.getElementById('tbtn');
    function draw() {
      var left = +el.getAttribute('data-left'), total = +el.getAttribute('data-total');
      document.getElementById('ttime').innerHTML = left ? fmt(left) : ic('check', 'tdone');
      var c = document.getElementById('tfg'); c.style.strokeDashoffset = String(276.5 * (1 - left / total));
      el.className = 'timer' + (left ? '' : ' done');
    }
    if (run) {
      if (+el.getAttribute('data-left') === 0) el.setAttribute('data-left', el.getAttribute('data-total'));
      TIMER = setInterval(function () {
        var l = Math.max(0, +el.getAttribute('data-left') - 1); el.setAttribute('data-left', l); draw(); lastInput = now();
        if (!l) { clearInterval(TIMER); TIMER = null; b.innerHTML = ic('replay') + 'Ещё раз'; }
      }, 1000);
      timers.push(TIMER); b.innerHTML = ic('pause') + 'Пауза';
    } else b.innerHTML = ic('play') + (+el.getAttribute('data-left') < +el.getAttribute('data-total') ? 'Продолжить' : 'Запустить');
    draw();
  }

  function viewPrepList() {
    return { title: 'Перед операцией', html: head('Подготовка', 'Перед операцией', '<p>Как подготовиться, что взять с собой и что важно сказать врачу</p>', art('Calendar', 'xl white live'), 'night') +
      prepRow().replace('class="f card tile', 'data-main="1" class="f card tile') };
  }
  function viewPrep(id) {
    var p = byId(D.prep || [], id); if (!p) return viewPrepList();
    var ch = S.prep[id] || {}, total = 0, done = 0, i;
    for (i = 0; i < p.steps.length; i++) total += p.steps[i].items.length; total += p.bring.length;
    for (var k in ch) if (ch.hasOwnProperty(k)) done++;
    function row(k, t) { return '<a class="f taskrow' + (ch[k] ? ' on' : '') + '" href="#" data-prep="' + attr(id + '|' + k) + '"><span class="cb">' + ic('check') + '</span><span>' + esc(t) + '</span></a>'; }
    var after = p.afterGuide && byId(D.operations, p.afterGuide);
    var html = head('Как подготовиться', esc(p.title), '<span class="pill glass">Готово: ' + done + ' из ' + total + '</span><p>' + esc(p.intro) + '</p><div class="hbtns">' + listen('prep:' + p.id) + '</div>', art(p.art, 'xl white live'), p.id === 'prep-sedation' ? 'lilac' : 'night') +
      '<p class="lead">Отмечайте выполненное кнопкой OK — так ничего не забудете</p>' +
      '<div class="grid g2">' + map(p.steps, function (st, si) {
        return '<div class="card stage"><span class="num">' + (si + 1) + '</span><div><div class="period">' + esc(st.period) + '</div><b>' + esc(st.title) + '</b>' + map(st.items, function (it) { return row('s' + si + ':' + it, it); }) + '</div></div>';
      }) + '</div>' +
      '<div class="grid g2"><div class="card box pale"><h3>Взять с собой</h3>' + map(p.bring, function (it) { return row('b:' + it, it); }) + '</div>' + box('Купить заранее', chips(p.buy), 'sun') + '</div>' +
      '<div class="grid g2">' + box('Обязательно сообщите врачу', list(p.tell)) + box('Позвоните и обсудите перенос, если:', list(p.postpone, 'warn'), 'coral') + '</div>' +
      '<div class="grid g2">' + tile('#/anesthesia', art('Monitor', 's white'), 'Лечение во сне: седация и наркоз', 'Виды, как проходит, что будет после', '', 'g-lilac wide') +
      (after ? tile('#/guide/' + after.id + '/0', art(after.art, 's white'), 'Что делать после операции', 'Памятка: ' + esc(after.title), '', 'g-teal wide') : '') + '</div>' +
      '<p class="disc">Информация носит справочный характер. Точный план подготовки даст ваш врач и анестезиолог клиники.</p>';
    return { title: p.title, html: html };
  }

  function viewAnesthesia() {
    var A = D.anesthesia;
    var html = head('Без боли и страха', esc(A.title), '<p>' + esc(A.intro) + '</p>', art('Drip', 'xl white live'), 'lilac') +
      '<h2 class="h">Виды обезболивания</h2><div class="grid g3">' + map(A.types, function (t, i) {
        return '<div class="f card atype" tabindex="0"' + (i === 0 ? ' data-main="1"' : '') + '><span class="tiptop">' + art(t.art, 's') + '<span class="depth">' + map([1, 2, 3], function (d) { return '<i class="' + (d <= t.depth ? 'on' : '') + '"></i>'; }) + '</span></span><b>' + esc(t.name) + '</b><span class="short">' + esc(t.short) + '</span>' +
          '<p class="small">' + esc(t.how) + '</p><p class="small muted"><b>Дыхание:</b> ' + esc(t.breathing) + '</p><p class="small muted"><b>Когда:</b> ' + esc(t.usedFor) + '</p><p class="small muted"><b>После:</b> ' + esc(t.wakeUp) + '</p></div>';
      }) + '</div>' +
      '<div class="grid g2">' + box('Кому подходит', list(A.indications), 'mint') + box('Когда нельзя или нужно отложить', list(A.contraindications, 'bad'), 'coral') + '</div>' +
      box('Как проходит', '<ol class="olist">' + map(A.process, function (x) { return '<li>' + esc(x) + '</li>'; }) + '</ol>', 'pale') +
      '<div class="grid g2">' + box('После процедуры', list(A.after)) + box('Сразу позвоните врачу, если:', list(A.alarms, 'warn'), 'coral') + '</div>' +
      '<h2 class="h">Частые вопросы</h2><div class="grid g2">' + map(A.faq, function (f) { return box(esc(f.q), '<p>' + esc(f.a) + '</p>'); }) + '</div>' +
      box('Услуги и цены', '<div class="prices">' + map(A.services, function (s) { return '<div><span>' + esc(s.name) + '</span><b>' + esc(s.price) + '</b></div>'; }) + '</div><p class="muted small">Точную стоимость уточняйте у администратора.</p>', 'sun') +
      DISCLAIMER;
    return { title: 'Седация и наркоз', html: html };
  }

  // ———— Мой путь ————
  var SEL = { op: null, back: 0 };
  function viewTracker() {
    var o = S.track && byId(D.operations, S.track.op);
    if (!o) {
      var d = today(); d.setDate(d.getDate() - SEL.back);
      var quick = [[0, 'Сегодня'], [1, 'Вчера'], [2, '2 дня назад'], [3, '3 дня назад'], [7, 'Неделю назад'], [14, '2 недели назад']];
      var html = head('Мой путь', 'План восстановления по дням', '<p>Чек-лист на каждый день, этапы заживления и самопроверка самочувствия</p>', art('Calendar', 'xl white live'), 'night') +
        '<h2 class="h">1. Что вам сделали?</h2>' + secTabs(SEC, '#/tracker/') +
        '<div class="grid g4">' + map(opsIn(SEC), function (x) {
          return '<a class="f card pick' + (SEL.op === x.id ? ' on' : '') + '" href="#" data-pick="' + x.id + '">' + art(x.art, 's') + '<span><b>' + esc(x.title) + '</b><span class="muted small">' + esc(x.subtitle) + '</span></span>' + (SEL.op === x.id ? '<span class="pickmark">' + ic('check') + '</span>' : '') + '</a>';
        }) + '</div>' +
        '<h2 class="h">2. Когда это было? <span class="hsub">— ' + human(d) + '</span></h2><div class="chiprow">' + map(quick, function (x) {
          return '<a class="f chipbtn' + (SEL.back === x[0] ? ' on' : '') + '" href="#" data-back="' + x[0] + '">' + x[1] + '</a>';
        }) + '<a class="f chipbtn" href="#" data-back="' + (SEL.back + 1) + '">' + ic('left') + 'на день раньше</a>' + (SEL.back > 0 ? '<a class="f chipbtn" href="#" data-back="' + (SEL.back - 1) + '">на день позже' + ic('right') + '</a>' : '') + '</div>' +
        '<h2 class="h">3. Начнём</h2>' + (SEL.op ? actBtn('begin', ic('play') + 'Начать мой путь восстановления', 'teal big') : '<p class="lead">Сначала выберите операцию или процедуру выше</p>');
      return { title: 'Мой путь', html: html };
    }
    var day = dayIndex(), st = stageOf(o, day), si = o.stages.indexOf(st), prog = Math.min(1, day / o.recoveryDays);
    var dn = 0; for (var i = 0; i < st.tasks.length; i++) if (S.checked[day + ':' + st.tasks[i]]) dn++;
    var ring = '<span class="bigring"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="52" class="rbg"/><circle cx="60" cy="60" r="52" class="rfg" style="stroke-dashoffset:' + (326.7 * (1 - prog)) + '"/></svg>' +
      '<span class="rtx"><small>день</small><b>' + day + '</b><small>из ' + o.recoveryDays + '</small></span></span>';
    var html = head('Мой путь', esc(o.title), '<span class="pill glass">' + (day >= o.recoveryDays ? 'Основной этап позади!' : 'Вы прошли ' + Math.round(prog * 100) + '% пути') + '</span><p>Сейчас: ' + esc(st.title.toLowerCase()) + '. ' + esc(st.whatHappens) + '</p>' +
      '<div class="hbtns">' + btn('#/guide/' + o.id + '/0', ic('book') + 'Открыть памятку', 'white') + actBtn('resettrack', ic('replay') + 'Сменить операцию', 'white') + '</div>', ring, 'night') +
      '<div class="stagesrow">' + map(o.stages, function (s, k) {
        return '<div class="f card srow' + (k === si ? ' now' : k < si ? ' past' : '') + '" tabindex="0"><span class="period">' + esc(s.period) + '</span><b>' + esc(s.title) + '</b><span class="small">' + (k < si ? 'пройдено' : k === si ? 'сейчас' : '') + '</span></div>';
      }) + '</div>' +
      '<div class="grid g2"><div class="card box"><h3>Чек-лист на сегодня ' + dn + ' из ' + st.tasks.length + '</h3>' + map(st.tasks, function (t, k) {
        var key = day + ':' + t;
        return '<a class="f taskrow' + (S.checked[key] ? ' on' : '') + '" href="#" data-task="' + attr(key) + '"' + (k === 0 ? ' data-main="1"' : '') + '><span class="cb">' + ic('check') + '</span><span>' + esc(t) + '</span></a>';
      }) + (dn === st.tasks.length ? '<p class="okmsg">Отлично! Все задачи на сегодня выполнены</p>' : '') + '</div>' +
      '<div class="card box"><h3>Как вы себя чувствуете?</h3>' + symRow('pain', 'Боль', ['нет', 'слабая', 'терпимая', 'сильная', 'очень сильная']) +
      symRow('sw', 'Отёк', ['нет', 'небольшой', 'заметный', 'сильный', 'нарастает']) + symRow('bl', 'Кровоточивость', ['нет', 'розовая слюна', 'кровит', 'не останавливается']) + '<div id="verdict">' + verdict() + '</div></div></div>' + DISCLAIMER;
    return { title: 'Мой путь', html: html };
  }
  var SYM = { pain: 1, sw: 1, bl: 0 };
  function symRow(id, label, levels) {
    return '<div class="sym"><b>' + label + '</b><div class="chiprow">' + map(levels, function (l, k) {
      var c = k <= 1 ? 'ok' : k === 2 ? 'mid' : 'bad';
      return '<a class="f chipbtn ' + c + (SYM[id] === k ? ' on' : '') + '" href="#" data-sym="' + id + ':' + k + '">' + l + '</a>';
    }) + '</div></div>';
  }
  function verdict() {
    var day = dayIndex(), pain = SYM.pain, sw = SYM.sw, bl = SYM.bl;
    var alarm = bl >= 3 || pain >= 4 || sw >= 4 || (day >= 3 && (pain >= 3 || sw >= 3));
    var caution = !alarm && (bl >= 2 || pain >= 3 || sw >= 3);
    var v = alarm ? ['coral', 'Нужно связаться с врачом', 'Такие симптомы требуют осмотра. Позвоните в клинику — врач подскажет, что делать: ' + D.clinic.phone]
      : caution ? ['sun', 'Понаблюдайте', bl >= 2 ? 'Прикусите стерильный марлевый тампон на 15–20 минут. Если кровь не остановится — звоните врачу.' : 'В первые дни это бывает. Холод, покой и лекарства по схеме. Если станет хуже — звоните.']
        : ['mint', 'Всё идёт по плану', 'Ваше самочувствие соответствует нормальному заживлению. Продолжайте следовать памятке!'];
    return '<div class="verdict ' + v[0] + '"><b>' + v[1] + '</b><p>' + esc(v[2]) + '</p></div>';
  }

  // ———— Врачи ————
  var GROUPS = [['All', 'Все'], ['Surgeon', 'Хирурги'], ['Ortho', 'Ортопеды'], ['Therapy', 'Терапевты'], ['Orthodont', 'Ортодонты']];
  function photo(d, cls) { return '<span class="photo ' + (cls || '') + '"><img src="tv/p/' + d.photo + '.jpg" alt=""></span>'; }
  function docCard(d) {
    return '<a class="f card doc" href="#/doctor/' + d.id + '">' + photo(d) + '<b>' + esc(d.name) + '</b><span class="muted small">' + rot([d.roles.slice(0, 2).join(' · '), 'Стаж ' + d.experienceLabel]) + '</span></a>';
  }
  function viewDoctors(g) {
    g = g || 'All';
    var ls = filter(D.doctors, function (d) { return g === 'All' || has(d.groups, g); });
    return { title: 'Врачи', html: '<div class="tabs">' + map(GROUPS, function (x) {
      return '<a class="f tab' + (x[0] === g ? ' on' : '') + '" href="#/doctors/' + x[0] + '" data-rep="1" data-pf="[data-grp=' + x[0] + ']" data-grp="' + x[0] + '"' + (x[0] === g ? ' data-main="1"' : '') + '>' + x[1] + '</a>';
    }) + '</div><div class="grid g5">' + map(ls, docCard) + '</div>' };
  }
  function viewDoctor(id) {
    var d = byId(D.doctors, id); if (!d) return viewDoctors();
    var html = '<section class="head docHead">' + photo(d, 'xl') + '<div class="htxt"><div class="kick">' + esc(d.roles.join(' · ')) + '</div><h1>' + esc(d.name) + '</h1>' +
      '<span class="pill glass">Стаж ' + esc(d.experienceLabel) + '</span> <span class="pill glass">Консультация ' + d.consultMinutes + ' мин</span><p>' + esc(d.about) + '</p>' +
      '<div class="hbtns">' + btn('#/booking/doctor/' + d.id, ic('book') + 'Записаться к врачу', 'white', ' data-main="1"') + '</div></div></section>' +
      '<div class="grid g2">' + box('Направления работы', list(d.skills), 'pale') + (d.highlights.length ? box('Достижения', list(d.highlights), 'sun') : '') + '</div>' +
      box('Образование и повышение квалификации', list(d.education));
    return { title: 'Врач', html: html };
  }

  // ———— Клиника, запись, отзывы ————
  function viewClinic() {
    var c = D.clinic;
    var html = head(esc(c.tagline), 'Стоматология «' + esc(c.name) + '»', '<p>' + esc(c.slogan) + ' · с ' + c.founded + ' года</p><div class="hbtns">' + btn('#/booking', ic('book') + 'Записаться на приём', 'white', ' data-main="1"') + btn('#/reviews', ic('star') + 'Оставить отзыв', 'white') + '</div>', '<span class="logoart xl"><img src="img/mark-white.svg" alt=""></span>') +
      '<div class="grid g3">' +
      box('Телефон', '<b class="phone">' + esc(c.phone) + '</b><p class="muted">Запись, вопросы, срочная помощь</p>', 'pale') +
      box('Адрес', '<p>' + esc(c.address) + '</p><p class="muted">Метро ' + esc(c.metro) + '</p>') +
      box('Время работы', '<p>' + esc(c.hours) + '</p><p class="muted">' + esc(c.site.replace('https://', '')) + ' · ' + esc(c.email) + '</p>') + '</div>' +
      box('Хирургия в «Авалоне»', chips(c.services)) + box('Все направления', chips(c.directions), 'mint') + box('Системы имплантатов', chips(c.implants), 'sun') +
      '<p class="disc">' + esc(c.license) + ', бессрочная</p>';
    return { title: 'О клинике', html: html };
  }
  function viewBooking(kind, val) {
    var c = D.clinic, who = '', path = '#/booking';
    if (kind === 'doctor') { var d = byId(D.doctors, val); if (d) { who = 'К врачу: ' + d.name; path = '#/booking/doctor/' + d.id; } }
    if (kind === 'service') { who = decodeURIComponent(val || ''); path = '#/booking/service/' + encodeURIComponent(who); }
    var qrb = QR ? '<div class="qrwrap inline"><div class="qrbox">' + qrSvg(SITE + path) + '<span class="qrlogo"><img src="img/mark-white.svg" alt=""></span></div><div class="qrtxt"><div class="kick">Онлайн-запись с телефона</div><h2>Наведите камеру телефона на код</h2>' +
      '<p>Откроется форма записи: выберите врача или услугу, удобное время — заявка уйдёт в клинику на ' + esc(c.email) + '. Администратор перезвонит.</p></div></div>' : '';
    var html = head('Запись на приём', who ? esc(who) : 'Записаться в «Авалон»', '<p>Администратор подберёт удобное время и ответит на вопросы</p>', art('Calendar', 'xl white live'), 'teal') +
      (qrb ? box('', qrb, '', ' data-main="1"') : '') +
      '<div class="grid g2">' + box('Позвонить', '<b class="phone">' + esc(c.phone) + '</b><p class="muted">' + esc(c.hours) + '</p>', 'pale', qrb ? '' : ' data-main="1"') +
      box('Написать', '<b class="phone sm">' + esc(c.email) + '</b><p class="muted">Или на сайте ' + esc(c.site.replace('https://', '')) + '</p>') + '</div>' +
      '<p class="disc">Заявка не является подтверждением записи — администратор свяжется с вами для подтверждения.</p>';
    return { title: 'Запись', html: html };
  }
  function stars(r) { var n = Math.round(+r); return '<span class="stars">' + map([1, 2, 3, 4, 5], function (k) { return ic('star', k <= n ? 'on' : ''); }) + '</span>'; }
  function viewReviews() {
    var html = head('Ваше мнение важно', 'Оцените клинику «Авалон»', '<p>' + (QR ? 'Выберите площадку и нажмите OK — появится QR-код: наведите камеру телефона и оставьте отзыв за минуту' : 'Оставьте отзыв на любой площадке — это займёт минуту') + '</p>', art('Heart', 'xl white live'), 'sun') +
      '<div class="grid g4">' + map(D.reviews, function (r, i) {
        return '<a class="f card review" href="#"' + (QR ? ' data-act="share" data-url="' + attr(r.url) + '" data-title="Отзыв: ' + attr(r.name) + '"' : '') + (i === 0 ? ' data-main="1"' : '') + '><span class="rl" style="background:' + r.color + '">' + esc(r.letter) + '</span><b>' + esc(r.name) + '</b>' + stars(r.rating) + '<span class="rr">' + esc(r.rating) + '</span>' + (QR ? '<span class="pill">' + ic('qr') + 'QR-код</span>' : '') + '</a>';
      }) + '</div><p class="disc">Спасибо, что выбираете «Авалон»!</p>';
    return { title: 'Отзывы', html: html };
  }

  // ———— Акции и статьи ————
  function promoCard(p) {
    return '<a class="f card promo ' + (STYLE[p.style] || 'g-teal') + '" href="#/promo/' + p.id + '"><span class="pill glass">' + esc(p.badge) + '</span>' +
      '<span class="ptop"><b>' + esc(p.title) + '</b>' + art(p.art, 's white') + '</span><span class="tease">' + rot([p.teaser].concat(p.facts)) + '</span>' + (p.price ? '<span class="price">' + esc(p.price) + '</span>' : '') + '</a>';
  }
  function viewPromos() {
    return { title: 'Акции', html: '<div class="grid g3">' + map(D.promos, function (p, i) { return promoCard(p).replace('class="f card promo', (i === 0 ? 'data-main="1" ' : '') + 'class="f card promo'); }) + '</div><p class="disc">Цены и условия уточняйте у администратора: ' + esc(D.clinic.phone) + '</p>' };
  }
  function viewPromo(id) {
    var p = byId(D.promos, id); if (!p) return viewPromos();
    var html = head(esc(p.badge), esc(p.title), '<p>' + esc(p.teaser) + '</p>' + (p.price ? '<div class="bigprice">' + esc(p.price) + (p.oldPrice ? ' <s>' + esc(p.oldPrice) + '</s>' : '') + '</div>' : '') +
      '<div class="hbtns">' + btn('#/booking/service/' + encodeURIComponent('Акция: ' + p.title), ic('book') + 'Записаться по акции', 'white', ' data-main="1"') + '</div>', art(p.art, 'xl white live'), HEADSTYLE[p.style] || 'teal') +
      '<div class="grid g2">' + box('Что входит', list(p.includes), 'pale') + box('Почему это выгодно', list(p.facts), 'mint') + '</div>' +
      '<p class="disc">Итоговая стоимость определяется после консультации и диагностики. Условия и сроки акции уточняйте у администратора.</p>';
    return { title: 'Акция', html: html };
  }
  function articleCard(a) {
    return '<a class="f card article" href="#/article/' + a.id + '"><span class="pill">' + esc(a.category) + '</span><span class="arow"><span class="atx"><b>' + esc(a.title) + '</b><span class="muted small">' + rot([a.teaser, a.readMin + ' мин чтения']) + '</span></span>' + art(a.art, 's nohalo') + '</span></a>';
  }
  function viewArticles(cat) {
    cat = cat ? decodeURIComponent(cat) : 'Все';
    var cats = ['Все'];
    for (var i = 0; i < D.articles.length; i++) if (!has(cats, D.articles[i].category)) cats.push(D.articles[i].category);
    var ls = filter(D.articles, function (a) { return cat === 'Все' || a.category === cat; });
    return { title: 'Полезно знать', html: '<div class="tabs">' + map(cats, function (c, k) {
      return '<a class="f tab' + (c === cat ? ' on' : '') + '" href="#/articles/' + encodeURIComponent(c) + '" data-rep="1" data-pf="[data-cat=\'' + k + '\']" data-cat="' + k + '"' + (c === cat ? ' data-main="1"' : '') + '>' + esc(c) + '</a>';
    }) + '</div><div class="grid g3">' + map(ls, articleCard) + '</div>' };
  }
  function viewArticle(id) {
    var a = byId(D.articles, id); if (!a) return viewArticles();
    var g = a.relatedGuide && byId(D.operations, a.relatedGuide);
    var html = head(esc(a.category) + ' · ' + a.readMin + ' мин', esc(a.title), '<p>' + esc(a.teaser) + '</p><div class="hbtns">' + listen('article:' + a.id, 'Слушать статью') + '</div>', art(a.art, 'xl white live'), 'night') +
      map(a.sections, function (s, i) { return box('<span class="pill">' + (i + 1) + '</span> ' + esc(s.h), '<p class="pre">' + esc(s.b) + '</p>', '', i === 0 ? ' data-main="1"' : ''); }) +
      (g ? '<div class="grid g2">' + tile('#/guide/' + g.id + '/0', art(g.art, 's white'), 'Памятка: ' + esc(g.title), 'Что делать после операции — по дням', '', 'g-teal wide') + '</div>' : '') +
      '<p class="disc">По материалам блога клиники «Авалон». Эксперт: Рыбальченко Д.С., к.м.н., челюстно-лицевой хирург.</p>';
    return { title: 'Статья', html: html };
  }

  // ———— Викторина, мифы, тревога ————
  var Q = { i: 0, score: 0, answered: null };
  function viewQuiz() {
    var n = D.quiz.length, fin = Q.i >= n, body;
    if (fin) {
      var r = Q.score >= 9 ? ['Вы эксперт!', 'Вы отлично знаете, как ухаживать за собой после операции. Скорейшего восстановления!', 'Heart']
        : Q.score >= 6 ? ['Хороший результат!', 'Вы знаете основные правила. Загляните в памятки, чтобы освежить детали.', 'Tooth']
          : ['Стоит повторить', 'Обязательно прочитайте памятку по вашей операции — это поможет избежать осложнений.', 'Calendar'];
      body = '<div class="quizfin">' + art(r[2], 'xxl live') + '<div><div class="score">' + Q.score + ' из ' + n + '</div><h2>' + r[0] + '</h2><p class="big">' + r[1] + '</p><p class="muted">Лучший результат: ' + Math.max(S.quizBest, Q.score) + '</p>' +
        '<div class="btns">' + actBtn('qrestart', ic('replay') + 'Пройти ещё раз', 'teal', ' data-main="1"') + btn('#/guides', ic('book') + 'К памяткам', 'ghost') + '</div></div></div>';
    } else {
      var qq = D.quiz[Q.i], a = Q.answered;
      body = '<div class="quiz">' + art(qq.art, 'xxl live') + '<div class="qbody"><h2>' + esc(qq.q) + '</h2>' + map(qq.options, function (o, k) {
        var cls = a != null && k === qq.correct ? ' ok' : a === k && k !== qq.correct ? ' bad' : '';
        return '<a class="f opt' + cls + '" href="#" data-ans="' + k + '"' + (a == null && k === 0 ? ' data-main="1"' : '') + '><span class="l">' + 'АБВГ'.charAt(k) + '</span><span class="ot">' + esc(o) + '</span>' + (a != null && k === qq.correct ? ic('check') : a === k ? ic('cross') : '') + '</a>';
      }) + (a != null ? '<div class="box sun"><b>' + (a === qq.correct ? 'Верно!' : 'Не совсем.') + '</b> ' + esc(qq.explain) + '</div>' + actBtn('qnext', (Q.i === n - 1 ? 'Узнать результат' : 'Следующий вопрос') + ic('next'), 'teal', ' data-main="1"') : '') + '</div></div>';
    }
    var html = head('Вопрос ' + Math.min(Q.i + 1, n) + ' из ' + n + ' · баллы: ' + Q.score, 'Викторина', '<div class="progress"><i style="width:' + (Math.min(Q.i, n) / n * 100) + '%"></i></div>', '', 'sun slim') + body;
    return { title: 'Викторина', html: html };
  }
  function viewMyths() {
    return { title: 'Мифы и факты', html: head('Нажмите OK на карточке, чтобы узнать правду', 'Мифы и факты', '', '', 'lilac slim') + '<div class="grid g3">' + map(D.myths, function (m, i) {
      return '<a class="f card myth" href="#" data-flip="1"' + (i === 0 ? ' data-main="1"' : '') + '><span class="front"><span class="lab">МИФ</span><b>' + esc(m.myth) + '</b><span class="muted small">Нажмите OK — правда или нет?</span><span class="qm">?</span></span>' +
        '<span class="back">' + art(m.art, 's white') + '<span><span class="lab">ФАКТ</span><span class="ft">' + esc(m.fact) + '</span></span></span></a>';
    }) + '</div>' };
  }
  function viewEmergency() {
    var o = D.operations[0];
    return { title: 'Норма или тревога?', html: head('Важно', 'Норма или тревога?', '<p>Как понять, что заживление идёт правильно, и когда нужна помощь врача</p>', art('Phone', 'xl white live'), 'coral') +
      alarmBlock(o.normal, o.redFlags).replace('class="f box mint"', 'data-main="1" class="f box mint"') +
      '<p class="alert103">' + ic('alert') + 'При угрожающих жизни состояниях (затруднённое дыхание, сильный отёк шеи, потеря сознания) звоните 103 или 112.</p>' };
  }

  // ———— Настройки ————
  function viewSettings() {
    function opt(key, val, label) { return '<a class="f chipbtn' + (S[key] === val ? ' on' : '') + '" href="#" data-set="' + key + ':' + val + '">' + label + '</a>'; }
    var html = head('Настройки', 'Настройки экрана', '<p>Всё сохраняется в телевизоре</p>', '<span class="mic xl">' + ic('gear') + '</span>', 'lilac slim') +
      box('Размер текста', '<div class="chiprow">' + opt('size', 1, 'Обычный') + opt('size', 1.12, 'Крупный') + opt('size', 1.25, 'Очень крупный') + '</div>', '', ' data-main="1"') +
      box('Музыка на фоне', '<p class="muted">Спокойная расслабляющая музыка без слов играет всё время' + (MU.el && !MU.el.paused ? ' · сейчас: «' + MUSIC[MU.i][1] + '»' : '') + '</p><div class="chiprow">' + opt('music', true, 'Включена') + opt('music', false, 'Выключена') + '</div>' +
        '<p class="muted">Громкость:</p><div class="chiprow">' + opt('vol', 0.15, 'Очень тихо') + opt('vol', 0.3, 'Тихо') + opt('vol', 0.5, 'Средне') + opt('vol', 0.8, 'Громко') + actBtn('mnext', ic('next') + 'Другая мелодия', 'ghost') + '</div>') +
      box('Анимации', '<p class="muted">Если телевизор работает медленно — выберите «Только выбранное» или «Выключить»</p><div class="chiprow">' + opt('anim', 'all', 'Все') + opt('anim', 'focus', 'Только выбранное') + opt('anim', 'off', 'Выключить') + '</div>') +
      box('Режим «Телевизор в клинике»', '<p class="muted">Если пультом не пользуются, через несколько минут на весь экран по кругу показываются все памятки и рекомендации по хирургии, подготовке к операции и наркозу. В режиме клиники данные пациента («Мой путь», отметки, викторина) при этом стираются, и следующий пациент начинает с главной.</p>' +
        '<div class="chiprow">' + opt('clinic', true, 'Включён') + opt('clinic', false, 'Выключен') + '</div><p class="muted">Показ инструкций через:</p><div class="chiprow">' + opt('idleMin', 2, '2 мин') + opt('idleMin', 3, '3 мин') + opt('idleMin', 5, '5 мин') + opt('idleMin', 10, '10 мин') + opt('idleMin', 0, 'Никогда') + '</div>' +
        '<p class="muted">Смена кадров заставки (все памятки по хирургии, подготовке и наркозу) — каждые:</p><div class="chiprow">' + opt('slideSec', 6, '6 сек') + opt('slideSec', 8, '8 сек') + opt('slideSec', 12, '12 сек') + opt('slideSec', 15, '15 сек') + opt('slideSec', 20, '20 сек') + opt('slideSec', 30, '30 сек') + '</div>') +
      box('Данные пациента', '<div class="chiprow">' + actBtn('wipe', ic('replay') + 'Стереть «Мой путь» и отметки', 'ghost') + actBtn('idle', ic('play') + 'Показать заставку сейчас', 'ghost') + '</div>') +
      '<p class="disc">Музыка сочинена специально для приложения, без чужих авторских прав · «Авалон · Помощник пациента» для телевизора' + (APP ? ' · приложение' : ' · сайт') + (TTS ? ' · чтение вслух доступно' : '') + '</p>';
    return { title: 'Настройки', html: html };
  }

  // ———————————— Отрисовка ————————————
  var NAV = [['home', 'Главная', '#/', ''], ['book', 'Памятки', '#/guides', 'guides guide prep anesthesia'], ['heart', 'Мой путь', '#/tracker', 'tracker'],
    ['play', 'Как правильно', '#/howto', 'howto'], ['doc', 'Врачи', '#/doctors', 'doctors doctor'], ['clinic', 'Клиника', '#/clinic', 'clinic booking reviews promos promo'], ['gear', '', '#/settings', 'settings']];
  function clock() { var d = new Date(), m = d.getMinutes(); return d.getHours() + ':' + (m < 10 ? '0' : '') + m; }
  function topbar(r) {
    return '<header class="top">' + (r ? '<a class="f tbtn back" href="#" data-act="back">' + ic('back') + '<span>Назад</span></a>' : '') +
      '<img class="tlogo" src="img/logo-white.svg" alt="Авалон"><nav class="tnav">' + map(NAV, function (n) {
        var on = n[3] ? has(n[3].split(' '), r) : !r;
        return '<a class="f tbtn' + (on ? ' on' : '') + (n[1] ? '' : ' icon') + '" href="' + n[2] + '">' + ic(n[0]) + (n[1] ? '<span>' + n[1] + '</span>' : '') + '</a>';
      }) + '</nav>' + (S.music ? '<a class="f tbtn icon" href="#/settings" title="Музыка">' + ic('note') + '</a>' : '') + '<span class="clock" id="clock">' + clock() + '</span></header>';
  }
  function foot() {
    return '<footer class="foot"><span><i class="key">' + ic('dpad') + '</i> ' + (APP ? 'выбор' : 'курсор') + '</span><span><i class="key">OK</i> открыть</span><span><i class="key">Назад</i> вернуться</span>' +
      '<span class="fphone">' + ic('phone') + esc(D.clinic.phone) + '</span>' +
      '<span class="scrollbtns"><a class="sbtn" href="#" data-act="up" id="sup">' + ic('up') + 'Выше</a><a class="sbtn" href="#" data-act="down" id="sdown">' + ic('down') + 'Ниже</a></span></footer>';
  }

  function parts() { return location.hash.replace(/^#\/?/, '').split('/'); }
  function render() {
    if (!D) return;
    clearTimers(); closeSheet(true); stopSpeech(); TIMER = null;
    var p = parts(), r = p[0], a = p[1] ? decodeURIComponent(p[1]) : '', b = p[2];
    if (r !== 'howto' || !a) HT.auto = false;
    var v;
    switch (r) {
      case 'guides': v = viewGuides(a || SEC); break;
      case 'guide': v = viewGuide(a, b); break;
      case 'howto': v = a ? viewHowTo(a, b) : viewHowTos(); break;
      case 'prep': v = a ? viewPrep(a) : viewPrepList(); break;
      case 'anesthesia': v = viewAnesthesia(); break;
      case 'tracker': if (a && secOf(a)) SEC = a; v = viewTracker(); break;
      case 'promos': v = viewPromos(); break;
      case 'promo': v = viewPromo(a); break;
      case 'doctors': v = viewDoctors(a); break;
      case 'doctor': v = viewDoctor(a); break;
      case 'clinic': v = viewClinic(); break;
      case 'booking': v = viewBooking(a, p[2]); break;
      case 'reviews': v = viewReviews(); break;
      case 'articles': v = viewArticles(a); break;
      case 'article': v = viewArticle(a); break;
      case 'quiz': v = viewQuiz(); break;
      case 'myths': v = viewMyths(); break;
      case 'emergency': v = viewEmergency(); break;
      case 'settings': v = viewSettings(); break;
      default: v = viewHome(); r = '';
    }
    app.innerHTML = topbar(r) + '<main id="main" class="pg">' + v.html + '<div class="endpad"></div></main>' + foot();
    document.title = (v.title ? v.title + ' · ' : '') + 'Авалон · Помощник пациента';
    var fs = qa('.f'); for (var i = 0; i < fs.length; i++) fs[i].setAttribute('data-k', i);
    var t = null;
    if (pendingFocus) { t = q(pendingFocus); pendingFocus = null; }
    if (!t && memo[location.hash] != null) t = fs[memo[location.hash]];
    if (!t) t = q('#main [data-main]') || q('#main .f') || fs[0];
    window.scrollTo(0, 0); scrollY0 = 0;
    if (t) {
      focusEl(t, true);
      if (rect(t).top + window.pageYOffset < window.innerHeight - bars().bottom - 60) jump(0);
    }
    later(scrollBtns, 60);
    every(rotTick, 1700);
    if (!r && S.anim !== 'off') every(function () { if (!idleOn) heroGo(1); }, 7000);
    if (r === 'howto' && a && document.getElementById('timer')) tickTimer(false);
  }
  // сменяющийся текст: половина карточек меняется на одном такте, половина — на другом (не все сразу)
  var rotPhase = 0;
  function rotTick() {
    if (S.anim === 'off') return;
    rotPhase = 1 - rotPhase;
    var rs = qa('.rot[data-items]');
    for (var i = 0; i < rs.length; i++) {
      if (i % 2 !== rotPhase) continue;
      var el = rs[i], items; try { items = JSON.parse(el.getAttribute('data-items')); } catch (e) { continue; }
      var k = ((+el.getAttribute('data-k2') || 0) + 1) % items.length; el.setAttribute('data-k2', k);
      el.innerHTML = '<span class="in">' + esc(items[k]) + '</span>';
    }
  }

  // ———————————— Пульт: перемещение стрелками ————————————
  var scrollY0 = 0, scrollAnim = null;
  function rect(el) { return el.getBoundingClientRect(); }
  function bars() { var t = q('.top'), f = q('.foot'); return { top: t ? t.offsetHeight : 0, bottom: f ? f.offsetHeight : 0 }; }
  function maxY() { return Math.max(0, document.documentElement.scrollHeight - window.innerHeight); }
  function jump(y) { if (scrollAnim) { cancelAnimationFrame(scrollAnim); scrollAnim = null; } scrollY0 = Math.max(0, Math.min(maxY(), y)); window.scrollTo(0, scrollY0); }
  // плавная прокрутка (на слабом ТВ — без анимации)
  function scrollToY(y) {
    y = Math.max(0, Math.min(maxY(), Math.round(y)));
    if (S.anim === 'off' || !window.requestAnimationFrame) { jump(y); return; }
    if (scrollAnim) cancelAnimationFrame(scrollAnim);
    var from = window.pageYOffset, t0 = now(); scrollY0 = y;
    function step() {
      var k = Math.min(1, (now() - t0) / 200), e = 1 - Math.pow(1 - k, 3);
      window.scrollTo(0, Math.round(from + (y - from) * e));
      scrollAnim = k < 1 ? requestAnimationFrame(step) : null;
      if (!scrollAnim) scrollBtns();
    }
    scrollAnim = requestAnimationFrame(step);
  }
  function base() { return scrollAnim ? scrollY0 : window.pageYOffset; }
  function ensureVisible(el) {
    if (closest(el, '.top') || closest(el, '#sheet')) return;
    var b = bars(), pad = 16, r = rect(el), vh = window.innerHeight, y = window.pageYOffset, bs = base();
    var top = r.top + y, bot = r.bottom + y;
    if (bot < vh - b.bottom - pad) { scrollToY(0); return; }
    if (top < bs + b.top + pad) scrollToY(top - b.top - pad);
    else if (bot > bs + vh - b.bottom - pad) scrollToY(bs + Math.min(bot - (bs + vh - b.bottom - pad), top - (bs + b.top + pad)));
  }
  function focusEl(el, noScroll) {
    var y = window.pageYOffset;
    try { el.focus(); } catch (e) {}
    window.scrollTo(0, y); // браузер сам прокручивает рывком — возвращаем и прокручиваем аккуратно
    if (!noScroll) ensureVisible(el);
  }
  function visible(el) { return el.offsetWidth > 0 && el.offsetHeight > 0; }
  function page(dir) { var b = bars(), vh = window.innerHeight; scrollToY(base() + dir * Math.round((vh - b.top - b.bottom) * 0.55)); }
  function move(dir) {
    var sheet = document.getElementById('sheet');
    var all = qa(sheet ? '#sheet .f' : '.f');
    var cur = document.activeElement;
    if (!cur || !matches(cur, '.f') || (sheet && !closest(cur, '#sheet'))) { var m = (sheet ? q('#sheet [data-main]') : q('#main [data-main]')) || all[0]; if (m) focusEl(m); return; }
    if (cur.getAttribute('data-hero') && (dir === 'l' || dir === 'r')) { heroGo(dir === 'r' ? 1 : -1); return; }
    var c = rect(cur), b = bars(), vh = window.innerHeight;
    var inTop = !!closest(cur, '.top');
    // высокий блок (длинный текст): сначала докручиваем его, потом переходим дальше
    if (!inTop && !sheet && dir === 'd' && c.bottom > vh - b.bottom - 8) { page(1); return; }
    if (!inTop && !sheet && dir === 'u' && c.top < b.top - 2 && c.bottom > b.top + 40) { page(-1); return; }
    var ccx = (c.left + c.right) / 2, ccy = (c.top + c.bottom) / 2, best = null, bs = 1e12;
    for (var i = 0; i < all.length; i++) {
      var el = all[i]; if (el === cur || !visible(el)) continue;
      var r = rect(el), rcx = (r.left + r.right) / 2, rcy = (r.top + r.bottom) / 2, p, s, k;
      if (dir === 'r' || dir === 'l') {
        if (dir === 'r' ? !(rcx > ccx + 2 && r.left >= c.left + 4) : !(rcx < ccx - 2 && r.right <= c.right - 4)) continue;
        p = dir === 'r' ? Math.max(0, r.left - c.right) : Math.max(0, c.left - r.right);
        s = Math.max(0, r.top - c.bottom, c.top - r.bottom); k = Math.abs(rcy - ccy);
        if (s > 0) continue; // влево/вправо — только в пределах той же строки
      } else {
        if (dir === 'd' ? !(rcy > ccy + 2 && r.top >= c.top + 4) : !(rcy < ccy - 2 && r.bottom <= c.bottom - 4)) continue;
        p = dir === 'd' ? Math.max(0, r.top - c.bottom) : Math.max(0, c.top - r.bottom);
        s = Math.max(0, r.left - c.right, c.left - r.right); k = Math.abs(rcx - ccx);
      }
      var score = p + s * 3 + k * 0.3;
      if (score < bs) { bs = score; best = el; }
    }
    if (best) focusEl(best);
    else if (sheet) return;
    else if (dir === 'd') page(1);
    else if (dir === 'u') { if (base() > 0) page(-1); else { var tb = q('.top .f.on') || q('.top .f'); if (tb) focusEl(tb); } }
  }

  function goBack() {
    if (closeSheet()) return;
    var h = location.hash;
    if (!h || h === '#' || h === '#/') return;
    history.back();
    setTimeout(function () { if (location.hash === h) location.hash = '#/'; }, 350);
  }

  // запоминаем выбранный элемент; сцена «Как правильно» оживает, когда карточку выбрали
  document.addEventListener('focus', function (e) {
    var el = e.target; if (!el || !el.getAttribute) return;
    var k = el.getAttribute('data-k'); if (k != null) memo[location.hash] = +k;
    var im = el.querySelector ? el.querySelector('img[data-g]') : null;
    if (im && S.anim !== 'off') im.src = 'tv/g/' + im.getAttribute('data-g') + '.gif';
  }, true);
  document.addEventListener('blur', function (e) {
    var el = e.target; if (!el || !el.querySelector) return;
    var im = el.querySelector('img[data-g]'); if (im) im.src = still(im.getAttribute('data-g'));
  }, true);

  document.addEventListener('keydown', function (e) {
    lastInput = now();
    if (S.music && D && (!MU.el || MU.el.paused)) musicPlay();
    if (idleOn) { stopIdle(); e.preventDefault(); return; }
    var k = e.keyCode;
    var dir = k === 37 ? 'l' : k === 38 ? 'u' : k === 39 ? 'r' : k === 40 ? 'd' : null;
    if (dir) { e.preventDefault(); move(dir); return; }
    if (k === 13) { var a = document.activeElement; if (a && a !== document.body) { e.preventDefault(); a.click(); } return; }
    if (k === 461 || k === 10009) { // «Назад» на пульте LG / Samsung: если браузер не вернулся сам — возвращаем мы
      if (document.getElementById('sheet')) { e.preventDefault(); closeSheet(); return; }
      var h = location.hash; setTimeout(function () { if (location.hash === h) goBack(); }, 250); return;
    }
    if (k === 8 || k === 27) { e.preventDefault(); goBack(); return; }
    if (k === 33) { e.preventDefault(); page(-1); return; } // кнопки канала +/- (если приходят) — листать
    if (k === 34) { e.preventDefault(); page(1); return; }
    if (k === 415 || k === 19 || k === 179) { var au = q('[data-act=auto]') || q('[data-act=timer]'); if (au) au.click(); }
  });

  document.addEventListener('click', function (e) {
    lastInput = now();
    if (S.music && D && (!MU.el || MU.el.paused)) musicPlay();
    var el = closest(e.target, '[data-act],[data-rep],[data-tip],[data-pick],[data-back],[data-task],[data-sym],[data-prep],[data-ans],[data-flip],[data-set],[data-say],.slide');
    if (!el) return;
    if (matches(el, '.slide')) { e.preventDefault(); location.hash = el.getAttribute('data-href'); return; }
    e.preventDefault();
    var g = function (n) { return el.getAttribute(n); };
    if (g('data-rep')) { pendingFocus = g('data-pf'); location.replace(g('href')); return; }
    if (g('data-tip')) { openTip(g('data-gid'), g('data-tip')); return; }
    if (g('data-say')) { speak(g('data-say')); return; }
    if (g('data-pick')) { SEL.op = g('data-pick'); pendingFocus = '[data-pick=' + SEL.op + ']'; render(); return; }
    if (g('data-back') != null) { SEL.back = Math.max(0, +g('data-back')); pendingFocus = '[data-back="' + g('data-back') + '"]'; render(); return; }
    if (g('data-task')) { var tk = g('data-task'); if (S.checked[tk]) delete S.checked[tk]; else S.checked[tk] = true; save(); rerender(el); return; }
    if (g('data-sym')) { var sp = g('data-sym').split(':'); SYM[sp[0]] = +sp[1]; rerender(el); return; }
    if (g('data-prep')) { var pp = g('data-prep').split('|'), pid = pp[0], key = pp.slice(1).join('|'); var c = S.prep[pid] = S.prep[pid] || {}; if (c[key]) delete c[key]; else c[key] = true; save(); rerender(el); return; }
    if (g('data-ans') != null) { if (Q.answered != null) return; Q.answered = +g('data-ans'); if (Q.answered === D.quiz[Q.i].correct) Q.score++; pendingFocus = '[data-act=qnext]'; render(); return; }
    if (g('data-flip')) { el.className = el.className.indexOf(' on') >= 0 ? el.className.replace(' on', '') : el.className + ' on'; return; }
    if (g('data-set')) {
      var sv = g('data-set').split(':'), val = sv[1] === 'true' ? true : sv[1] === 'false' ? false : isNaN(+sv[1]) ? sv[1] : +sv[1];
      S[sv[0]] = val; save(); fit(); musicApply(); pendingFocus = '[data-set="' + g('data-set') + '"]'; render(); return;
    }
    var act = g('data-act');
    if (act === 'back') goBack();
    else if (act === 'close') closeSheet();
    else if (act === 'up' || act === 'down') page(act === 'up' ? -1 : 1);
    else if (act === 'auto') { HT.auto = !HT.auto; pendingFocus = '[data-act=auto]'; render(); }
    else if (act === 'share') { if (g('data-url')) shareSheet(g('data-url').replace(SITE, ''), g('data-title'), 'Наведите камеру телефона на код — откроется страница для отзыва.'); else shareSheet(g('data-share'), g('data-title')); }
    else if (act === 'start') { S.track = { op: g('data-op'), date: ymd(today()) }; S.checked = {}; save(); location.hash = '#/tracker'; }
    else if (act === 'begin') { var d = today(); d.setDate(d.getDate() - SEL.back); S.track = { op: SEL.op, date: ymd(d) }; S.checked = {}; save(); pendingFocus = '[data-task]'; render(); }
    else if (act === 'resettrack') { S.track = null; S.checked = {}; save(); SEL = { op: null, back: 0 }; render(); }
    else if (act === 'timer') { tickTimer(!TIMER); }
    else if (act === 'treset') { var tm = document.getElementById('timer'); if (tm) { tm.setAttribute('data-left', tm.getAttribute('data-total')); tickTimer(false); } }
    else if (act === 'qnext') { Q.i++; Q.answered = null; pendingFocus = Q.i >= D.quiz.length ? '[data-act=qrestart]' : '[data-ans="0"]'; if (Q.i >= D.quiz.length && Q.score > S.quizBest) { S.quizBest = Q.score; save(); } render(); }
    else if (act === 'qrestart') { Q = { i: 0, score: 0, answered: null }; pendingFocus = '[data-ans="0"]'; render(); }
    else if (act === 'wipe') { resetPatient(); pendingFocus = '[data-act=wipe]'; render(); }
    else if (act === 'idle') startIdle();
    else if (act === 'mnext') { musicNext(); later(function () { pendingFocus = '[data-act=mnext]'; render(); }, 300); }
  });
  // перерисовать экран, оставив выбранным тот же элемент и место прокрутки
  function rerender(el) {
    var k = el.getAttribute('data-k'), y = window.pageYOffset;
    render();
    var t = k != null ? q('[data-k="' + k + '"]') : null;
    jump(y); if (t) focusEl(t, true);
  }
  // указка Magic Remote / мышь: наведение = выбор (без прокрутки)
  document.addEventListener('mouseover', function (e) {
    var el = closest(e.target, '.f');
    if (el && el !== document.activeElement && !idleOn) { var y = window.pageYOffset; el.focus(); window.scrollTo(0, y); }
  });
  document.addEventListener('mousemove', function () { lastInput = now(); if (idleOn) stopIdle(); });
  document.addEventListener('wheel', function () { lastInput = now(); });
  window.addEventListener('hashchange', render);
  // кнопки «Выше/Ниже» видны, только когда есть куда листать
  function scrollBtns() {
    var u = document.getElementById('sup'), d = document.getElementById('sdown'); if (!u || !d) return;
    var y = window.pageYOffset, mx = maxY();
    u.className = 'sbtn' + (y > 4 ? '' : ' off'); d.className = 'sbtn' + (y < mx - 4 ? '' : ' off');
  }
  window.addEventListener('scroll', function () { if (!scrollAnim) scrollBtns(); });
  // приложение на webOS: не даём телевизору включать свою заставку — у нас своя (инструкции по кругу)
  document.addEventListener('webOSScreenSaverRequest', function (e) { if (e.preventDefault) e.preventDefault(); });
  document.addEventListener('screenSaverRequest', function (e) { if (e.preventDefault) e.preventDefault(); });

  // ———————————— Заставка: если пультом не пользуются — на весь экран по кругу все памятки и рекомендации
  // по хирургии, подготовке к операции и наркозу (интервал смены кадров — в настройках) ————————————
  var idleOn = false, slides = [], si = 0, idleTimer = null;
  function buildSlides() {
    slides = [];
    function add(o) { slides.push(o); }
    var ops = opsIn('Surgery'), hts = D.howtos || [], i, j;
    for (i = 0; i < ops.length; i++) {
      var o = ops[i], k0 = 'Памятка после операции · ' + o.title;
      add({ art: o.art, kick: 'Памятка после операции', title: o.title, text: o.about, tone: 'night', pill: periodOf(o) });
      for (j = 0; j < o.stages.length; j++) { var st = o.stages[j]; add({ art: o.art, kick: k0 + ' · этап ' + (j + 1) + ' из ' + o.stages.length, title: st.period + ': ' + st.title, text: st.whatHappens, list: st.tasks, tone: 'teal' }); }
      for (j = 0; j < o.dos.length; j++) add({ art: o.dos[j].art, kick: k0 + ' · можно', title: o.dos[j].title, sub: o.dos[j].short, text: o.dos[j].details, tone: 'mint', mark: 'check' });
      for (j = 0; j < o.donts.length; j++) add({ art: o.donts[j].art, kick: k0 + ' · нельзя', title: o.donts[j].title, sub: o.donts[j].short, text: o.donts[j].details, tone: 'coral', mark: 'cross' });
      add({ art: 'SoftFood', kick: k0 + ' · питание', title: 'Можно есть', list: o.foodYes, tone: 'sun', list2: o.foodNo, l2: 'Лучше исключить' });
      if ((o.care || []).length) add({ art: 'Pill', kick: k0, title: 'Уход и лекарства', text: 'Препараты — только те, что назначил ваш врач.', list: o.care, tone: 'teal' });
      if ((o.dates || []).length) add({ art: 'Calendar', kick: k0, title: 'Важные сроки', list: o.dates, tone: 'sun' });
      add({ art: 'Swelling', kick: k0, title: 'Это нормально', list: o.normal, tone: 'mint' });
      add({ art: 'Phone', kick: k0, title: 'Срочно позвоните врачу, если:', list: o.redFlags, tone: 'coral', warn: 1, sub: D.clinic.phone });
      for (j = 0; j < hts.length; j++) if (has(hts[j].ops, o.id) && !hts[j]._shown) {
        hts[j]._shown = 1;
        for (var m = 0; m < hts[j].steps.length; m++) { var hs = hts[j].steps[m]; add({ scene: hs.scene, kick: 'Как правильно · ' + hts[j].title + ' · шаг ' + (m + 1) + ' из ' + hts[j].steps.length, title: hs.title, text: hs.text, tone: 'night' }); }
      }
    }
    for (j = 0; j < hts.length; j++) delete hts[j]._shown;
    var pr = D.prep || [];
    for (i = 0; i < pr.length; i++) {
      var p = pr[i], kp = 'Как подготовиться · ' + p.title;
      add({ art: p.art, kick: 'Как подготовиться', title: p.title, text: p.intro, tone: 'night' });
      for (j = 0; j < p.steps.length; j++) add({ art: p.steps[j].art || p.art, kick: kp, title: p.steps[j].period + ': ' + p.steps[j].title, list: p.steps[j].items, tone: 'teal' });
      add({ art: 'Bonus', kick: kp, title: 'Взять с собой', list: p.bring, tone: 'teal' });
      add({ art: 'Doctor', kick: kp, title: 'Обязательно сообщите врачу', list: p.tell, tone: 'sun' });
      add({ art: 'Thermo', kick: kp, title: 'Позвоните и обсудите перенос, если:', list: p.postpone, tone: 'coral', warn: 1 });
    }
    var A = D.anesthesia;
    if (A) {
      var ka = 'Лечение во сне: седация и наркоз';
      add({ art: 'Drip', kick: ka, title: A.title, text: A.intro, tone: 'lilac' });
      for (j = 0; j < A.types.length; j++) { var t = A.types[j]; add({ art: t.art, kick: ka + ' · виды', title: t.name, sub: t.short, text: t.how + ' Дыхание: ' + t.breathing + '. После: ' + t.wakeUp, tone: 'lilac' }); }
      add({ art: 'Heart', kick: ka, title: 'Кому подходит', list: A.indications, tone: 'mint' });
      add({ art: 'NoFood', kick: ka, title: 'Когда нельзя или нужно отложить', list: A.contraindications, tone: 'coral', bad: 1 });
      add({ art: 'Monitor', kick: ka, title: 'Как проходит', list: A.process, tone: 'lilac', ol: 1 });
      add({ art: 'Pillow', kick: ka, title: 'После процедуры', list: A.after, tone: 'teal' });
      add({ art: 'Phone', kick: ka, title: 'Сразу позвоните врачу, если:', list: A.alarms, tone: 'coral', warn: 1, sub: D.clinic.phone });
      for (j = 0; j < A.faq.length; j++) add({ art: 'Doctor', kick: ka + ' · вопросы', title: A.faq[j].q, text: A.faq[j].a, tone: 'lilac' });
    }
  }
  function slideHtml(s) {
    var pic = s.scene ? '<div class="sart">' + scene(s.scene, true) + '</div>' : '<div class="sartw">' + art(s.art, 'idl live white') + '</div>';
    var n = (s.list || []).length + (s.list2 || []).length, cls = n > 9 ? ' xs' : n > 5 ? ' sm' : '';
    var ls = function (a, kind) { return s.ol ? '<ol class="olist">' + map(a, function (x) { return '<li>' + esc(x) + '</li>'; }) + '</ol>' : list(a, kind); };
    return '<div class="slide2 t-' + (s.tone || 'night') + '">' + pic + '<div class="stxt' + cls + '"><img class="slogo" src="img/logo-white.svg" alt="">' +
      '<div class="kick">' + esc(s.kick) + '</div>' + (s.pill ? '<span class="pill glass">' + esc(s.pill) + '</span>' : '') +
      '<h1>' + (s.mark ? '<span class="smark ' + s.mark + '">' + ic(s.mark) + '</span>' : '') + esc(s.title) + '</h1>' + (s.sub ? '<b class="ssub">' + esc(s.sub) + '</b>' : '') +
      (s.text ? '<p>' + esc(s.text) + '</p>' : '') + (s.list ? ls(s.list, s.warn ? 'warn' : s.bad ? 'bad' : '') : '') +
      (s.list2 ? '<b class="ssub">' + esc(s.l2) + '</b>' + list(s.list2, 'bad') : '') + '</div>' +
      '<div class="shint">' + (si % slides.length + 1) + ' / ' + slides.length + ' · Нажмите любую кнопку на пульте, чтобы открыть памятки · ' + esc(D.clinic.phone) + '</div>' +
      '<span class="autobar"><i style="-webkit-animation-duration:' + S.slideSec + 's;animation-duration:' + S.slideSec + 's"></i></span>' +
      '<span class="disc2">Следуйте рекомендациям вашего лечащего врача</span></div>';
  }
  function showSlide() {
    var s = slides[si % slides.length];
    idleBox.innerHTML = slideHtml(s); si++;
    var nx = slides[si % slides.length]; (new Image()).src = nx.scene ? 'tv/g/' + nx.scene + '.gif' : 'tv/s/' + nx.art + '.png'; // заранее грузим следующий кадр
  }
  function startIdle() {
    buildSlides();
    if (!slides.length) return;
    idleOn = true; HT.auto = false; closeSheet(true); stopSpeech();
    if (S.clinic) { resetPatient(); memo = {}; if (location.hash && location.hash !== '#/') location.hash = '#/'; else render(); } // следующий пациент начинает с главной
    idleBox.className = 'on';
    showSlide();
    idleTimer = setInterval(showSlide, (S.slideSec || 12) * 1000);
  }
  function stopIdle() {
    idleOn = false; clearInterval(idleTimer); idleBox.className = ''; idleBox.innerHTML = '';
    lastInput = now();
    var m = q('#main [data-main]'); if (m) focusEl(m);
  }
  setInterval(function () {
    var c = document.getElementById('clock'); if (c) c.textContent = clock();
    if (D && !idleOn && !HT.auto && !TIMER && !(TTS && SAY.id) && S.idleMin > 0 && now() - lastInput > S.idleMin * 60000) startIdle();
  }, 5000);

  // ———————————— Старт ————————————
  function load(tries) {
    var x = new XMLHttpRequest();
    x.open('GET', 'data.json', true);
    x.onload = function () {
      try { D = JSON.parse(x.responseText); } catch (err) { D = null; }
      if (D) { render(); musicApply(); } else retry(tries);
    };
    x.onerror = function () { retry(tries); };
    x.send();
  }
  function retry(tries) {
    var m = document.getElementById('bootmsg');
    if (m) m.textContent = 'Нет связи с интернетом. Пробуем ещё раз…';
    setTimeout(function () { load(tries + 1); }, Math.min(30000, 3000 * (tries + 1)));
  }
  load(0);
})();

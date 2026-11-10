/* Авалон · Помощник пациента — версия для телевизора.
 * Пишется на старом JavaScript (ES5): браузер телевизоров LG webOS 3.x — это Chromium 38 (2014 год).
 * НЕЛЬЗЯ: стрелочные функции, let/const, шаблонные строки `...`, fetch, Array.find/includes, Object.assign,
 * CSS-переменные, grid, gap. Управление — стрелки пульта, OK, «Назад»; мышь/указка Magic Remote тоже работает. */
(function () {
  'use strict';

  var D = null;
  var app = document.getElementById('app');
  var idleBox = document.getElementById('idle');
  var timers = [];
  var memo = {};           // адрес экрана -> номер выбранного элемента (чтобы «Назад» возвращал на то же место)
  var pendingFocus = null; // какой элемент выбрать после перерисовки
  var lastInput = new Date().getTime();
  var IDLE_MS = 3 * 60 * 1000; // через 3 минуты без пульта — показ инструкций по кругу
  var HT = { auto: false };
  // Приложение для webOS (папка tvapp/): там пульт отдаёт стрелки странице. В браузере ТВ стрелки двигают курсор.
  var APP = !!window.PalmSystem || location.protocol === 'file:';
  var HOW = APP ? 'выберите раздел стрелками пульта и нажмите OK' : 'наведите курсор стрелками пульта и нажмите OK';

  // ———————————— Масштаб: интерфейс рассчитан на 1280×720 и растягивается под экран ————————————
  function fit() {
    var w = window.innerWidth || 1280, h = window.innerHeight || 720;
    var fs = Math.min(w / 1280, h / 720) * 16;
    if (fs < 10) fs = 10; if (fs > 32) fs = 32;
    document.documentElement.style.fontSize = fs + 'px';
  }
  fit();
  window.addEventListener('resize', fit);

  // ———————————— Помощники ————————————
  var ENT = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  function esc(s) {
    // символы, которых может не быть в шрифте телевизора, заменяем на простые
    return String(s == null ? '' : s).replace(/₽/g, 'руб.').replace(/≈/g, '~').replace(/−/g, '-').replace(/•/g, '·')
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
  function clearTimers() { while (timers.length) clearTimeout(timers.pop()); }

  var IC = {
    back: 'M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z',
    next: 'M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z',
    home: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z',
    check: 'M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z',
    cross: 'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
    play: 'M8 5v14l11-7z',
    pause: 'M6 19h4V5H6v14zm8-14v14h4V5h-4z',
    phone: 'M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z',
    alert: 'M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z',
    clock: 'M12 2a10 10 0 100 20 10 10 0 000-20zm1 11h-5v-2h3V6h2v7z',
    pin: 'M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z',
    up: 'M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z',
    down: 'M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z',
    dpad: 'M12 1l4 5H8zM12 23l-4-5h8zM1 12l5-4v8zM23 12l-5 4V8z',
    info: 'M11 7h2v2h-2zm0 4h2v6h-2zm1-9a10 10 0 100 20 10 10 0 000-20z'
  };
  function ic(k, cls) { return '<svg class="ic ' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true"><path d="' + IC[k] + '"/></svg>'; }

  function rgba(hex, a) {
    var h = String(hex || '#579CAB').replace('#', '');
    return 'rgba(' + parseInt(h.substr(0, 2), 16) + ',' + parseInt(h.substr(2, 2), 16) + ',' + parseInt(h.substr(4, 2), 16) + ',' + a + ')';
  }
  // Рисунок: в покое — неподвижный кадр (_s), при выборе пультом — анимация (так телевизору легче)
  function art(name, cls) {
    var tint = (D.arts && D.arts[name]) || '#579CAB';
    var bg = cls && cls.indexOf('white') >= 0 ? 'rgba(255,255,255,.16)' : rgba(tint, 0.13);
    return '<span class="art ' + (cls || '') + '" style="background:' + bg + '"><img src="' + still(name) + '" alt=""></span>';
  }
  // Картинки для ТВ лежат в tv/ (делает web/tools/build_tv.py): браузер старых ТВ не показывает WebP.
  // Значки — PNG, сцены — JPEG; анимация (GIF) — только в пошаговой инструкции и на заставке, чтобы телевизору было легко.
  function still(name) { return 'tv/a/' + name + (D.arts && D.arts[name] ? '.png' : '.jpg'); }
  function scene(name, live) { return '<img class="scene" src="' + (live ? 'tv/g/' + name + '.gif' : still(name)) + '" alt="">'; }
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
  var DISCLAIMER = '<p class="disc">Информация носит справочный характер. Всегда следуйте рекомендациям вашего лечащего врача.</p>';

  // ———————————— Данные ————————————
  function opsIn(sec) { return filter(D.operations, function (o) { return (o.section || 'Surgery') === sec; }); }
  function secOf(id) { return byId(D.sections || [], id); }
  var PREP_FOR = { extraction: 'prep-extraction', wisdom: 'prep-extraction', resection: 'prep-extraction', cyst: 'prep-extraction', gum: 'prep-extraction', implant: 'prep-implant', bonegraft: 'prep-implant', sinus: 'prep-sinus' };
  var STYLE = { Teal: 'g-teal', Night: 'g-night', Sun: 'g-sun', Lilac: 'g-lilac', Coral: 'g-coral', Mint: 'g-mint' };

  // ———————————— Экраны ————————————
  function tile(href, pic, title, sub, extra, cls) {
    return '<a class="f card tile ' + (cls || '') + '" href="' + href + '">' + pic + '<b>' + title + '</b>' + (sub ? '<span class="muted">' + sub + '</span>' : '') + (extra || '') + '</a>';
  }

  function viewHome() {
    var secs = D.sections || [];
    var hts = D.howtos || [];
    return {
      title: '',
      html: '<section class="hero"><div><h1>Помощник пациента</h1><p>Памятки и рекомендации клиники «Авалон» — ' + HOW + '</p></div></section>' +
        '<h2 class="h">Памятки после лечения</h2><div class="grid g6 hm">' + map(secs, function (s, i) {
          var n = opsIn(s.id).length;
          return tile('#/guides/' + s.id, art(s.art, 'm'), esc(s.title), esc(s.short), '<span class="pill">' + n + ' ' + plural(n, 'памятка', 'памятки', 'памяток') + '</span>', i === 0 ? '" data-main="1' : '');
        }) + '</div>' +
        '<h2 class="h">Полезное</h2><div class="grid g6 hm">' +
        tile('#/howto', art(hts.length ? hts[0].cover : 'GzBite', 'm round'), 'Как правильно', hts.length + ' ' + plural(hts.length, 'инструкция', 'инструкции', 'инструкций') + ' с анимацией') +
        tile('#/prep', art('Calendar', 'm'), 'Перед операцией', 'Как подготовиться') +
        tile('#/anesthesia', art('Drip', 'm'), 'Лечение во сне', 'Седация и наркоз') +
        tile('#/promos', art('Gift', 'm'), 'Акции', 'Предложения клиники') +
        tile('#/doctors', art('Doctor', 'm'), 'Врачи', D.doctors.length + ' специалистов') +
        tile('#/clinic', art('Heart', 'm'), 'О клинике', 'Адрес, время работы') +
        '</div>'
    };
  }

  function viewGuides(sec) {
    var secs = D.sections || [{ id: 'Surgery', title: 'Хирургия' }];
    if (!secOf(sec)) sec = secs[0].id;
    var s = secOf(sec) || {};
    var html = '<div class="tabs">' + map(secs, function (x) {
      var on = x.id === sec;
      return '<a class="f tab' + (on ? ' on' : '') + '" href="#/guides/' + x.id + '" data-rep="1" data-pf="[data-sec=' + x.id + ']" data-sec="' + x.id + '">' + esc(x.title) + ' <i>' + opsIn(x.id).length + '</i></a>';
    }) + '</div>' +
      '<p class="lead">' + esc(s.short || '') + '</p>' +
      '<div class="grid g4">' + map(opsIn(sec), function (o, i) {
        var per = o.period && o.section !== 'Surgery' ? o.period : '≈ ' + o.recoveryDays + ' дней';
        return tile('#/guide/' + o.id + '/0', art(o.art, 'm'), esc(o.title), esc(o.subtitle), '<span class="pill">' + esc(per) + '</span>', i === 0 ? '" data-main="1' : '');
      }) + '</div>';
    if (sec === 'Surgery') html += prepBlock();
    return { title: 'Памятки', html: html + DISCLAIMER };
  }

  function prepBlock() {
    return '<h2 class="h">Перед операцией</h2><div class="grid g4">' + map(D.prep || [], function (p) {
      return tile('#/prep/' + p.id, art(p.art, 'm white'), esc(p.title), esc(p.subtitle), '', p.id === 'prep-sedation' ? 'g-lilac' : 'g-night');
    }) + tile('#/anesthesia', art('Drip', 'm white'), 'Лечение во сне', 'Седация и наркоз: виды, подготовка, вопросы', '', 'g-lilac') + '</div>';
  }

  var TABS = ['Этапы', 'Можно', 'Нельзя', 'Питание', 'Когда звонить врачу'];
  function viewGuide(id, tab) {
    var o = byId(D.operations, id); if (!o) return viewGuides('Surgery');
    tab = Math.max(0, Math.min(4, +tab || 0));
    var s = o.section && o.section !== 'Surgery' ? 'Памятка · ' + esc((secOf(o.section) || {}).title || '') : 'Памятка после операции';
    var period = o.period || 'Восстановление ≈ ' + o.recoveryDays + ' дней';
    var html = head(s, esc(o.title), '<span class="pill glass">' + esc(period) + '</span><p>' + esc(o.about) + '</p>', art(o.art, 'xl white')) +
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
      body = '<div class="grid g3">' + map(good ? o.dos : o.donts, function (t) {
        return '<div class="f card tip" tabindex="0"><div class="tiptop">' + art(t.art, 's') + '<span class="mark ' + (good ? 'ok' : 'no') + '">' + ic(good ? 'check' : 'cross') + '</span></div>' +
          '<b>' + esc(t.title) + '</b><span class="short ' + (good ? 'ok' : 'no') + '">' + esc(t.short) + '</span><p class="muted small">' + esc(t.details) + '</p></div>';
      }) + '</div>';
    } else if (tab === 3) {
      body = '<div class="grid g2">' + box('Можно есть', chips(o.foodYes), 'mint') + box('Лучше исключить', chips(o.foodNo), 'coral') + '</div>' +
        box('', '<div class="rowc">' + art('SoftFood', 's') + '<span>Еда — тёплая, не горячая. Жуйте на здоровой стороне. После еды аккуратно обходите рану при чистке зубов.</span></div>', 'sun');
    } else {
      body = '<div class="grid g2">' + box('Это нормально', list(o.normal), 'mint') + box('Срочно позвоните врачу, если:', list(o.redFlags, 'warn'), 'coral') + '</div>' +
        box('', '<div class="rowc">' + ic('phone', 'big') + '<div><b class="phone">' + esc(D.clinic.phone) + '</b><div class="muted">Клиника «Авалон» · ' + esc(D.clinic.hours) + '</div></div></div>', 'pale');
    }
    if (PREP_FOR[o.id]) body += '<div class="grid g2">' + tile('#/prep/' + PREP_FOR[o.id], art('Calendar', 's white'), 'Как подготовиться к операции', 'Что взять с собой и что сказать врачу', '', 'g-night wide') + '</div>';
    return { title: o.title, html: html + body + DISCLAIMER };
  }

  function htCard(h) {
    return '<a class="f card ht" href="#/howto/' + h.id + '/0"><span class="scenebox">' + scene(h.cover) + '<span class="pill dark">' + h.steps.length + ' ' + plural(h.steps.length, 'шаг', 'шага', 'шагов') + '</span></span>' +
      '<b>' + esc(h.title) + '</b><span class="muted">' + esc(h.subtitle) + '</span></a>';
  }
  function viewHowTos() {
    var hts = D.howtos || [];
    return { title: 'Как правильно', html: head('Анимированные инструкции', 'Как правильно', '<p>Покажем по шагам: тампон, холод, ванночки, чистка зубов, нить, ирригатор, брекеты, капы, протез и профилактика</p>', '', 'slim') +
      '<div class="grid g4">' + map(hts, function (h, i) { return htCard(h).replace('class="f card ht"', 'class="f card ht"' + (i === 0 ? ' data-main="1"' : '')); }) + '</div>' + DISCLAIMER };
  }
  function viewHowTo(id, stepArg) {
    var h = byId(D.howtos || [], id); if (!h) return viewHowTos();
    var step = Math.max(0, Math.min(h.steps.length - 1, +stepArg || 0)); var st = h.steps[step]; var last = step === h.steps.length - 1;
    var base = '#/howto/' + h.id + '/';
    var timer = st.timer ? '<div class="note">' + ic('clock') + '<span>' + esc(st.timerLabel || 'Время') + ': ' + (st.timer >= 60 ? Math.round(st.timer / 60) + ' мин' : st.timer + ' секунд') + '</span></div>' : '';
    var btns = '<div class="btns">' +
      (step ? '<a class="f btn ghost" href="' + base + (step - 1) + '" data-rep="1" data-pf="[data-nav=prev]" data-nav="prev">' + ic('back') + 'Назад</a>' : '') +
      (last ? '<a class="f btn mint" href="#/howto" data-nav="done"' + (HT.auto ? '' : ' data-main="1"') + '>' + ic('check') + 'Готово</a>'
        : '<a class="f btn teal" href="' + base + (step + 1) + '" data-rep="1" data-pf="[data-nav=next]" data-nav="next"' + (HT.auto ? '' : ' data-main="1"') + '>Дальше' + ic('next') + '</a>') +
      (h.steps.length > 1 ? '<a class="f btn ghost" href="#" data-act="auto"' + (HT.auto ? ' data-main="1"' : '') + '>' + ic(HT.auto ? 'pause' : 'play') + (HT.auto ? 'Пауза' : 'Показывать подряд') + '</a>' : '') + '</div>';
    var dots = '<div class="steps">' + map(h.steps, function (x, i) {
      return '<a class="f stepbtn' + (i === step ? ' on' : '') + '" href="' + base + i + '" data-rep="1" data-pf="[data-step=\'' + i + '\']" data-step="' + i + '"><span class="n">' + (i + 1) + '</span><span>' + esc(x.title) + '</span></a>';
    }) + '</div>';
    var html = '<section class="player"><div class="stagebox">' + scene(st.scene, true) + '<span class="pill dark">Шаг ' + (step + 1) + ' из ' + h.steps.length + '</span>' +
      (HT.auto ? '<span class="autobar"><i style="-webkit-animation-duration:8s;animation-duration:8s"></i></span>' : '') + '</div>' +
      '<div class="ptxt"><div class="kick">Как правильно · ' + esc(h.title) + '</div><h1>' + esc(st.title) + '</h1><p class="big">' + esc(st.text) + '</p>' + timer + btns + '</div></section>' +
      '<h2 class="h">Все шаги</h2>' + dots + DISCLAIMER +
      '<h2 class="h">Ещё инструкции</h2><div class="grid g4">' + map(filter(D.howtos, function (x) { return x.id !== h.id; }), htCard) + '</div>';
    if (HT.auto) later(function () {
      if (!last) { pendingFocus = '[data-act=auto]'; location.replace('#' + base.substr(1) + (step + 1)); }
      else { HT.auto = false; pendingFocus = '[data-nav=done]'; render(); }
    }, 8000);
    return { title: h.title, html: html };
  }

  function viewPrepList() {
    return { title: 'Перед операцией', html: head('Подготовка', 'Перед операцией', '<p>Как подготовиться, что взять с собой и что важно сказать врачу</p>', art('Calendar', 'xl white'), 'night') +
      prepBlock().replace('<h2 class="h">Перед операцией</h2>', '').replace('class="f card tile', 'data-main="1" class="f card tile') };
  }
  function viewPrep(id) {
    var p = byId(D.prep || [], id); if (!p) return viewPrepList();
    var after = p.afterGuide && byId(D.operations, p.afterGuide);
    var html = head('Как подготовиться', esc(p.title), '<p>' + esc(p.intro) + '</p>', art(p.art, 'xl white'), p.id === 'prep-sedation' ? 'lilac' : 'night') +
      '<div class="grid g2">' + map(p.steps, function (st, i) {
        return '<div class="f card stage" tabindex="0"' + (i === 0 ? ' data-main="1"' : '') + '><span class="num">' + (i + 1) + '</span><div><div class="period">' + esc(st.period) + '</div><b>' + esc(st.title) + '</b>' + list(st.items) + '</div></div>';
      }) + '</div>' +
      '<div class="grid g2">' + box('Взять с собой', list(p.bring), 'pale') + box('Купить заранее', chips(p.buy), 'sun') + '</div>' +
      '<div class="grid g2">' + box('Обязательно сообщите врачу', list(p.tell)) + box('Позвоните и обсудите перенос, если:', list(p.postpone, 'warn'), 'coral') + '</div>' +
      '<div class="grid g2">' + tile('#/anesthesia', art('Monitor', 's white'), 'Лечение во сне: седация и наркоз', 'Виды, как проходит, что будет после', '', 'g-lilac wide') +
      (after ? tile('#/guide/' + after.id + '/0', art(after.art, 's white'), 'Что делать после операции', 'Памятка: ' + esc(after.title), '', 'g-teal wide') : '') + '</div>' +
      '<p class="disc">Информация носит справочный характер. Точный план подготовки даст ваш врач и анестезиолог клиники.</p>';
    return { title: p.title, html: html };
  }

  function viewAnesthesia() {
    var A = D.anesthesia;
    var html = head('Без боли и страха', esc(A.title), '<p>' + esc(A.intro) + '</p>', art('Drip', 'xl white'), 'lilac') +
      '<h2 class="h">Виды обезболивания</h2><div class="grid g3">' + map(A.types, function (t, i) {
        return '<div class="f card tip" tabindex="0"' + (i === 0 ? ' data-main="1"' : '') + '><div class="tiptop">' + art(t.art, 's') + '</div><b>' + esc(t.name) + '</b><span class="short">' + esc(t.short) + '</span>' +
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

  function viewPromos() {
    return { title: 'Акции', html: '<div class="grid g3">' + map(D.promos, function (p, i) {
      return '<a class="f card promo ' + (STYLE[p.style] || 'g-teal') + '" href="#/promo/' + p.id + '"' + (i === 0 ? ' data-main="1"' : '') + '><span class="pill glass">' + esc(p.badge) + '</span>' +
        '<div class="ptop"><b>' + esc(p.title) + '</b>' + art(p.art, 's white') + '</div><span class="tease">' + esc(p.teaser) + '</span>' + (p.price ? '<span class="price">' + esc(p.price) + '</span>' : '') + '</a>';
    }) + '</div><p class="disc">Условия и сроки акций уточняйте у администратора.</p>' };
  }
  function viewPromo(id) {
    var p = byId(D.promos, id); if (!p) return viewPromos();
    var cls = { Teal: 'teal', Night: 'night', Sun: 'sun', Lilac: 'lilac', Coral: 'coral', Mint: 'mint' }[p.style] || 'teal';
    var html = head(esc(p.badge), esc(p.title), '<p>' + esc(p.teaser) + '</p>' + (p.price ? '<div class="bigprice">' + esc(p.price) + (p.oldPrice ? ' <s>' + esc(p.oldPrice) + '</s>' : '') + '</div>' : ''), art(p.art, 'xl white'), cls) +
      '<div class="grid g2">' + box('Что входит', list(p.includes), 'pale', ' data-main="1"') + box('Почему это выгодно', list(p.facts), 'mint') + '</div>' +
      box('', '<div class="rowc">' + ic('phone', 'big') + '<div><b class="phone">' + esc(D.clinic.phone) + '</b><div class="muted">Условия и сроки уточняйте у администратора</div></div></div>', 'sun');
    return { title: 'Акция', html: html };
  }

  function photo(d, cls) { return '<span class="photo ' + (cls || '') + '"><img src="tv/p/' + d.photo + '.jpg" alt=""></span>'; }
  function viewDoctors() {
    return { title: 'Врачи', html: '<div class="grid g4">' + map(D.doctors, function (d, i) {
      return '<a class="f card doc" href="#/doctor/' + d.id + '"' + (i === 0 ? ' data-main="1"' : '') + '>' + photo(d) + '<b>' + esc(d.name) + '</b><span class="muted small">' + esc(d.roles.slice(0, 2).join(' · ')) + '</span>' +
        (d.experienceLabel ? '<span class="pill">Стаж ' + esc(d.experienceLabel) + '</span>' : '') + '</a>';
    }) + '</div>' };
  }
  function viewDoctor(id) {
    var d = byId(D.doctors, id); if (!d) return viewDoctors();
    var html = '<section class="head docHead">' + photo(d, 'xl') + '<div class="htxt"><div class="kick">' + esc(d.roles.join(' · ')) + '</div><h1>' + esc(d.name) + '</h1>' +
      (d.experienceLabel ? '<span class="pill glass">Стаж ' + esc(d.experienceLabel) + '</span>' : '') + '<p>' + esc(d.about) + '</p></div></section>' +
      '<div class="grid g2">' + box('Направления работы', list(d.skills), 'pale', ' data-main="1"') + box('Достижения', list(d.highlights), 'sun') + '</div>' +
      box('Образование', list(d.education));
    return { title: 'Врач', html: html };
  }

  function viewClinic() {
    var c = D.clinic;
    var html = head(esc(c.tagline), 'Стоматология «' + esc(c.name) + '»', '<p>' + esc(c.slogan) + (c.founded ? ' · с ' + c.founded + ' года' : '') + '</p>', '<img class="logo" src="img/mark-white.svg" alt="">') +
      '<div class="grid g3">' +
      box('Телефон', '<b class="phone">' + esc(c.phone) + '</b><p class="muted">Запись, вопросы, срочная помощь</p>', 'pale', ' data-main="1"') +
      box('Адрес', '<p>' + esc(c.address) + '</p><p class="muted">Метро ' + esc(c.metro) + '</p>') +
      box('Время работы', '<p>' + esc(c.hours) + '</p><p class="muted">' + esc(c.site.replace('https://', '')) + ' · ' + esc(c.email) + '</p>') + '</div>' +
      box('Направления', chips(c.directions), 'mint') + box('Услуги', chips(c.services)) + box('Системы имплантатов', chips(c.implants), 'sun') +
      '<p class="disc">' + esc(c.license) + '</p>';
    return { title: 'О клинике', html: html };
  }

  // ———————————— Отрисовка ————————————
  function clock() { var d = new Date(), m = d.getMinutes(); return d.getHours() + ':' + (m < 10 ? '0' : '') + m; }
  function topbar(title, home) {
    return '<header class="top">' +
      (home ? '' : '<a class="f tbtn" href="#" data-act="back">' + ic('back') + '<span>Назад</span></a><a class="f tbtn" href="#/">' + ic('home') + '<span>Главная</span></a>') +
      '<img class="tlogo" src="img/logo-white.svg" alt="Авалон">' + (title ? '<span class="ttl">' + esc(title) + '</span>' : '') +
      '<span class="tright">' + ic('phone') + esc(D.clinic.phone) + '<span class="clock" id="clock">' + clock() + '</span></span></header>';
  }
  // На обычном пульте LG стрелки в браузере двигают курсор (сайт их не получает) — поэтому крупные кнопки «Выше/Ниже»
  var FOOT = '<footer class="foot"><span><i class="key">' + ic('dpad') + '</i> стрелки — ' + (APP ? 'выбор' : 'курсор') + '</span><span><i class="key">OK</i> открыть</span><span><i class="key">Назад</i> вернуться</span>' +
    '<span class="scrollbtns"><a class="sbtn" href="#" data-act="up" id="sup">' + ic('up') + 'Выше</a><a class="sbtn" href="#" data-act="down" id="sdown">' + ic('down') + 'Ниже</a></span></footer>';

  function parts() { return location.hash.replace(/^#\/?/, '').split('/'); }
  function render() {
    if (!D) return;
    clearTimers();
    var p = parts(), r = p[0], a = p[1] ? decodeURIComponent(p[1]) : '', b = p[2];
    if (r !== 'howto' || !a) HT.auto = false;
    var v;
    switch (r) {
      case 'guides': v = viewGuides(a || 'Surgery'); break;
      case 'guide': v = viewGuide(a, b); break;
      case 'howto': v = a ? viewHowTo(a, b) : viewHowTos(); break;
      case 'prep': v = a ? viewPrep(a) : viewPrepList(); break;
      case 'anesthesia': v = viewAnesthesia(); break;
      case 'promos': v = viewPromos(); break;
      case 'promo': v = viewPromo(a); break;
      case 'doctors': v = viewDoctors(); break;
      case 'doctor': v = viewDoctor(a); break;
      case 'clinic': v = viewClinic(); break;
      default: v = viewHome(); r = '';
    }
    app.innerHTML = topbar(v.title, !r) + '<main id="main">' + v.html + '<div class="endpad"></div></main>' + FOOT;
    document.title = (v.title ? v.title + ' · ' : '') + 'Авалон · Помощник пациента';
    var fs = qa('.f'); for (var i = 0; i < fs.length; i++) fs[i].setAttribute('data-k', i);
    var t = null;
    if (pendingFocus) { t = q(pendingFocus); pendingFocus = null; }
    if (!t && memo[location.hash] != null) t = fs[memo[location.hash]];
    if (!t) t = q('#main [data-main]') || q('#main .f') || fs[0];
    window.scrollTo(0, 0);
    setTimeout(scrollBtns, 50);
    if (t) {
      focusEl(t);
      // первый показ экрана: если выбранный блок хотя бы начинается на экране — оставляем видимой шапку
      if (rect(t).top + window.pageYOffset < window.innerHeight - bars().bottom - 60) window.scrollTo(0, 0);
    }
  }

  // ———————————— Пульт: перемещение стрелками ————————————
  function rect(el) { return el.getBoundingClientRect(); }
  function bars() { var t = q('.top'), f = q('.foot'); return { top: t ? t.offsetHeight : 0, bottom: f ? f.offsetHeight : 0 }; }
  function ensureVisible(el) {
    var b = bars(), pad = 14, r = rect(el), vh = window.innerHeight;
    var y = window.pageYOffset;
    if (closest(el, '.top')) return;
    if (r.bottom + y < vh - b.bottom - pad) { window.scrollTo(0, 0); return; } // первый экран — показываем с самого верха
    if (r.top < b.top + pad) window.scrollBy(0, r.top - b.top - pad);
    else if (r.bottom > vh - b.bottom - pad) window.scrollBy(0, Math.min(r.bottom - (vh - b.bottom - pad), r.top - b.top - pad));
  }
  function focusEl(el) {
    var y = window.pageYOffset;
    el.focus();
    window.scrollTo(0, y); // браузер сам прокручивает рывком — возвращаем и прокручиваем аккуратно
    ensureVisible(el);
  }
  function visible(el) { return el.offsetWidth > 0 && el.offsetHeight > 0; }
  function move(dir) {
    var cur = document.activeElement;
    var all = qa('.f');
    if (!cur || !matches(cur, '.f')) { var m = q('#main [data-main]') || all[0]; if (m) focusEl(m); return; }
    var c = rect(cur), b = bars(), vh = window.innerHeight;
    var inTop = !!closest(cur, '.top');
    // высокий блок (длинный текст): сначала докручиваем его, потом переходим дальше
    if (!inTop && dir === 'd' && c.bottom > vh - b.bottom - 8) { window.scrollBy(0, Math.round((vh - b.top - b.bottom) * 0.5)); return; }
    if (!inTop && dir === 'u' && c.top < b.top - 2 && c.bottom > b.top + 40) { window.scrollBy(0, -Math.round((vh - b.top - b.bottom) * 0.5)); return; }
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
    else if (dir === 'd') window.scrollBy(0, Math.round((vh - b.top - b.bottom) * 0.5));
    else if (dir === 'u') { if (window.pageYOffset > 0) window.scrollBy(0, -Math.round((vh - b.top - b.bottom) * 0.5)); else { var tb = q('.top .f'); if (tb) focusEl(tb); } }
  }

  function goBack() {
    var h = location.hash;
    if (!h || h === '#' || h === '#/') return;
    history.back();
    setTimeout(function () { if (location.hash === h) location.hash = '#/'; }, 350);
  }

  // запоминаем выбранный элемент экрана
  document.addEventListener('focus', function (e) {
    var el = e.target; if (!el || !el.getAttribute) return;
    var k = el.getAttribute('data-k'); if (k != null) memo[location.hash] = +k;
  }, true);

  document.addEventListener('keydown', function (e) {
    lastInput = now();
    if (idleOn) { stopIdle(); e.preventDefault(); return; }
    var k = e.keyCode;
    var dir = k === 37 ? 'l' : k === 38 ? 'u' : k === 39 ? 'r' : k === 40 ? 'd' : null;
    if (dir) { e.preventDefault(); move(dir); return; }
    if (k === 13) { var a = document.activeElement; if (a && a !== document.body) { e.preventDefault(); a.click(); } return; }
    if (k === 461 || k === 10009) { // «Назад» на пульте LG / Samsung: если браузер не вернулся сам — возвращаем мы
      var h = location.hash; setTimeout(function () { if (location.hash === h) goBack(); }, 250); return;
    }
    if (k === 8 || k === 27) { e.preventDefault(); goBack(); return; }
    if (k === 415 || k === 19 || k === 179) { var au = q('[data-act=auto]'); if (au) au.click(); }
  });

  document.addEventListener('click', function (e) {
    lastInput = now();
    var el = closest(e.target, '[data-act],[data-rep]');
    if (!el) return;
    e.preventDefault();
    if (el.getAttribute('data-rep')) { pendingFocus = el.getAttribute('data-pf'); location.replace(el.getAttribute('href')); return; }
    var act = el.getAttribute('data-act');
    if (act === 'back') goBack();
    if (act === 'up' || act === 'down') { var b = bars(); window.scrollBy(0, (act === 'up' ? -1 : 1) * Math.round((window.innerHeight - b.top - b.bottom) * 0.7)); scrollBtns(); }
    if (act === 'auto') { HT.auto = !HT.auto; pendingFocus = '[data-act=auto]'; render(); }
  });
  // указка Magic Remote / мышь: наведение = выбор (без прокрутки)
  document.addEventListener('mouseover', function (e) {
    var el = closest(e.target, '.f');
    if (el && el !== document.activeElement && !idleOn) { var y = window.pageYOffset; el.focus(); window.scrollTo(0, y); }
  });
  document.addEventListener('mousemove', function () { lastInput = now(); if (idleOn) stopIdle(); });
  document.addEventListener('wheel', function () { lastInput = now(); });
  window.addEventListener('hashchange', render);
  // приложение на webOS: не даём телевизору включать свою заставку — у нас своя (инструкции по кругу)
  document.addEventListener('webOSScreenSaverRequest', function (e) { if (e.preventDefault) e.preventDefault(); });
  document.addEventListener('screenSaverRequest', function (e) { if (e.preventDefault) e.preventDefault(); });
  // кнопки «Выше/Ниже» видны, только когда есть куда листать
  function scrollBtns() {
    var u = document.getElementById('sup'), d = document.getElementById('sdown'); if (!u || !d) return;
    var y = window.pageYOffset, max = document.documentElement.scrollHeight - window.innerHeight;
    u.className = 'sbtn' + (y > 4 ? '' : ' off'); d.className = 'sbtn' + (y < max - 4 ? '' : ' off');
  }
  window.addEventListener('scroll', scrollBtns);

  // ———————————— Заставка: если пультом не пользуются, показываем инструкции по кругу ————————————
  var idleOn = false, slides = [], si = 0, idleTimer = null;
  function buildSlides() {
    slides = [];
    var hts = D.howtos || [];
    for (var i = 0; i < hts.length; i++) {
      for (var j = 0; j < hts[i].steps.length; j++) {
        var st = hts[i].steps[j];
        slides.push({ img: 'tv/g/' + st.scene + '.gif', kick: 'Как правильно · ' + hts[i].title, n: 'Шаг ' + (j + 1) + ' из ' + hts[i].steps.length, title: st.title, text: st.text });
      }
      if (i % 3 === 2) slides.push({ img: still('Tooth'), kick: 'Помощник пациента', n: '', title: 'Памятки после лечения — на этом экране', text: 'Возьмите пульт: ' + HOW + '. Хирургия, терапия, ортопедия, гигиена, пародонтология и ортодонтия.' });
    }
  }
  function showSlide() {
    var s = slides[si % slides.length]; si++;
    var nx = slides[si % slides.length]; (new Image()).src = nx.img; // заранее грузим следующий кадр
    idleBox.innerHTML = '<div class="slide"><div class="sart"><img src="' + s.img + '" alt=""></div><div class="stxt"><img class="slogo" src="img/logo-white.svg" alt="">' +
      '<div class="kick">' + esc(s.kick) + (s.n ? ' · ' + esc(s.n) : '') + '</div><h1>' + esc(s.title) + '</h1><p>' + esc(s.text) + '</p></div>' +
      '<div class="shint">Нажмите любую кнопку на пульте, чтобы открыть памятки · ' + esc(D.clinic.phone) + '</div><span class="autobar"><i></i></span></div>';
  }
  function startIdle() {
    if (!slides.length) buildSlides();
    if (!slides.length) return;
    idleOn = true; HT.auto = false;
    memo = {};
    if (location.hash && location.hash !== '#/') location.hash = '#/'; // следующий пациент начинает с главной
    idleBox.className = 'on';
    showSlide();
    idleTimer = setInterval(showSlide, 10000);
  }
  function stopIdle() {
    idleOn = false; clearInterval(idleTimer); idleBox.className = ''; idleBox.innerHTML = '';
    lastInput = now();
    var m = q('#main [data-main]'); if (m) focusEl(m);
  }
  setInterval(function () {
    var c = document.getElementById('clock'); if (c) c.textContent = clock();
    if (D && !idleOn && !HT.auto && now() - lastInput > IDLE_MS) startIdle();
  }, 5000);

  // ———————————— Старт ————————————
  function load(tries) {
    var x = new XMLHttpRequest();
    x.open('GET', 'data.json', true);
    x.onload = function () {
      try { D = JSON.parse(x.responseText); } catch (err) { D = null; }
      if (D) render(); else retry(tries);
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

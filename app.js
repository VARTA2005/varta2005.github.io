/* Авалон · Помощник пациента — веб-версия (данные и картинки экспортированы из Android-приложения) */
'use strict';

let D = null;                         // данные из data.json
let APK = { url: 'version.json', name: '' }; // актуальный APK (из version.json)
const $app = document.getElementById('app');
const $nav = document.getElementById('nav');
const timers = [];

// ————————————————— Настройки и состояние —————————————————
const store = {
  load() { try { return JSON.parse(localStorage.getItem('avalon') || '{}'); } catch (e) { return {}; } },
  save() { try { localStorage.setItem('avalon', JSON.stringify(S)); } catch (e) {} },
};
const S = Object.assign({ theme: 'light', accent: 'Avalon', scale: 1, anim: true, rotate: true, tips: true, name: '',
  track: null, checked: {}, quizBest: 0 }, store.load());

function applySettings() {
  const r = document.documentElement;
  const dark = S.theme === 'dark' || (S.theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  r.dataset.theme = dark ? 'dark' : 'light';
  r.dataset.accent = S.accent;
  r.style.setProperty('--scale', S.scale);
  r.classList.toggle('no-anim', !S.anim);
  document.querySelector('meta[name=theme-color]').setAttribute('content', dark ? '#0D171A' : '#1F5866');
}

// ————————————————— Утилиты —————————————————
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const go = h => { location.hash = h; };
const byId = (list, id) => list.find(x => x.id === id);
const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const dayIndex = () => S.track ? Math.max(0, Math.round((today() - new Date(S.track.date + 'T00:00:00')) / 864e5)) : 0;
const stageOf = (op, day) => [...op.stages].reverse().find(s => day >= s.dayFrom) || op.stages[0];
const plural = (n, a, b, c) => { n = Math.abs(n) % 100; const n1 = n % 10; if (n > 10 && n < 20) return c; if (n1 > 1 && n1 < 5) return b; if (n1 === 1) return a; return c; };

function art(name, size = 100, opts = '') {
  const tint = D.arts[name] || '#579CAB';
  const src = `art/${name}${S.anim ? '' : '_s'}.webp`;
  return `<span class="art ${opts}" style="--s:${size}px;--tint:${tint}"><img src="${src}" alt="" loading="lazy" decoding="async"></span>`;
}
function rot(items, int = 3200, delay = 0, cls = '') {
  items = items.filter(Boolean);
  return `<span class="rot ${cls}" data-items="${esc(JSON.stringify(items))}" data-int="${int}" data-delay="${delay}"><span>${esc(items[0])}</span></span>`;
}
function startRotators() {
  if (!S.rotate) return;
  document.querySelectorAll('.rot[data-items]').forEach(el => {
    const items = JSON.parse(el.dataset.items); if (items.length < 2) return;
    let i = 0;
    const tick = () => { i = (i + 1) % items.length; el.innerHTML = `<span>${esc(items[i])}</span>`; };
    const t0 = setTimeout(() => { timers.push(setInterval(tick, +el.dataset.int)); }, +el.dataset.delay);
    timers.push(t0);
  });
}
function clearTimers() { while (timers.length) { const t = timers.pop(); clearTimeout(t); clearInterval(t); } }
function toast(msg) { const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 2200); }

const I = {
  home: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z',
  book: 'M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z',
  heart: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z',
  doc: 'M20 6h-4V4c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zM10 4h4v2h-4V4zm6 11h-3v3h-2v-3H8v-2h3v-3h2v3h3v2z',
  clinic: 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 11h-4v4h-4v-4H6v-4h4V6h4v4h4v4z',
  gear: 'M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.488.488 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z',
  back: 'M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z',
  call: 'M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z',
  map: 'M20.5 3l-.16.03L15 5.1 9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5zM15 19l-6-2.11V5l6 2.11V19z',
  share: 'M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z',
  play: 'M8 5v14l11-7z', bulb: 'M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z',
  android: 'M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85a.637.637 0 00-.83.22l-1.88 3.24a11.43 11.43 0 00-8.94 0L5.65 5.67a.643.643 0 00-.87-.2c-.28.18-.37.54-.22.83L6.4 9.48A10.78 10.78 0 001 18h22a10.78 10.78 0 00-5.4-8.52zM7 15.25a1.25 1.25 0 110-2.5 1.25 1.25 0 010 2.5zm10 0a1.25 1.25 0 110-2.5 1.25 1.25 0 010 2.5z',
};
const svg = (k, s = 24) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="currentColor" aria-hidden="true"><path d="${I[k]}"/></svg>`;

function header(inner, cls = '') {
  const b = [[12, 30, 36], [82, 22, 52], [65, 70, 70], [30, 75, 88], [92, 55, 106]]
    .map(([x, y, s], i) => `<i class="bubble" style="left:${x}%;top:${y}%;width:${s}px;height:${s}px;margin:-${s / 2}px;animation-delay:${i * .7}s"></i>`).join('');
  return `<header class="header ${cls}">${b}<div class="wrap pad" style="position:relative">${inner}</div>
  <svg class="wave" viewBox="0 0 1200 34" preserveAspectRatio="none"><path d="M0 18 C 100 4 200 4 300 18 S 500 32 600 18 S 800 4 900 18 S 1100 32 1200 18 V34 H0 Z"/></svg></header>`;
}
const backBtn = () => `<button class="back" data-back aria-label="Назад">${svg('back')}</button>`;
const section = (title, link, label = 'Все') => `<div class="section wrap"><h2>${esc(title)}</h2>${link ? `<a href="${link}">${label}</a>` : ''}</div>`;

// ————————————————— Главная —————————————————
function viewHome() {
  const op = S.track && byId(D.operations, S.track.op);
  const day = dayIndex();
  const slides = [];
  if (op) {
    const st = stageOf(op, day);
    slides.push({ tag: 'МОЙ ПУТЬ', title: `День ${day} восстановления`, sub: `${op.title} · ${st.title.toLowerCase()}`, facts: st.tasks.slice(0, 3), cta: 'Чек-лист', g: 'teal', art: op.art, href: '#/tracker' });
  } else {
    slides.push({ tag: 'МОЙ ПУТЬ', title: 'План восстановления по дням', sub: 'Укажите операцию и дату — подскажу, что делать каждый день', facts: ['Чек-лист на каждый день', 'Самопроверка симптомов'], cta: 'Начать', g: 'teal', art: 'Calendar', href: '#/tracker' });
  }
  slides.push({ tag: 'ПАМЯТКА', title: 'После удаления зуба', sub: 'Что можно и нельзя — по дням, с картинками', facts: ['Тампон 20–30 минут', 'Холод — первые сутки', 'Не полоскать в 1-й день'], cta: 'Открыть', g: 'lilac', art: 'Tooth', href: '#/guide/extraction' });
  slides.push({ tag: 'ПАМЯТКА', title: 'После имплантации', sub: 'Как помочь имплантату прижиться', facts: ['Не курить', 'Мягкая пища на другой стороне', 'Антибиотики — по схеме'], cta: 'Открыть', g: 'mint', art: 'Implant', href: '#/guide/implant' });
  slides.push({ tag: 'ПАМЯТКА', title: 'После синус-лифтинга', sub: 'Главное — не создавать давления в пазухе', facts: ['Не сморкаться 2 недели', 'Чихать с открытым ртом', 'Без перелётов 2–4 недели'], cta: 'Открыть', g: 'sun', art: 'Sinus', href: '#/guide/sinus' });
  slides.push({ tag: 'ВАЖНО', title: 'Норма или тревога?', sub: 'Когда всё идёт по плану, а когда срочно звонить врачу', facts: ['Отёк до 3 дней — норма', 'Кровь дольше 40 минут — звоните'], cta: 'Узнать', g: 'coral', art: 'Phone', href: '#/emergency' });
  const os = byId(D.promos, 'osstem');
  slides.push({ tag: 'АКЦИЯ', title: 'Имплантация Osstem', sub: `${os.price} под ключ`, facts: os.facts, cta: 'Подробнее', g: 'dark', art: 'Implant', href: '#/promo/osstem' });

  const tipsStart = new Date().getDate() % D.tips.length;
  const tips = D.tips.slice(tipsStart).concat(D.tips.slice(0, tipsStart));
  const isAndroid = /Android/i.test(navigator.userAgent);

  return header(`
    <div class="top"><img src="img/logo-white.svg" alt="Авалон"><span style="font-weight:600;font-size:.9rem">Здравствуйте${S.name ? ', ' + esc(S.name) : ''}!</span></div>
    <div class="hero" id="hero">
      <div class="stories">${slides.map((_, i) => `<i data-i="${i}"><b></b></i>`).join('')}</div>
      <div class="slides" id="slides">${slides.map(s => `
        <div class="slide grad-${s.g}" data-href="${s.href}">
          <div class="txt"><span class="pill glass">${s.tag}</span><h3>${esc(s.title)}</h3><p>${esc(s.sub)}</p>
            <div class="fact">✦ ${rot(s.facts, 2200)}</div><span class="cta">${svg('play', 18)}${s.cta}</span></div>
          ${art(s.art, 150, 'white')}
        </div>`).join('')}</div>
    </div>`, 'night') +
  `<main class="wrap">
    ${op ? `<div class="pad" style="margin-top:4px"><div class="card grad-night continue enter" data-href="#/tracker">
      <div class="ring" style="--p:${Math.min(100, day / op.recoveryDays * 100)}"><div><b>${day}</b><small>день</small></div></div>
      <div style="flex:1"><b>${esc(op.title)}</b><div class="small" style="opacity:.85">${rot([`Сейчас: ${stageOf(op, day).title.toLowerCase()}`, stageOf(op, day).tasks[0]], 3000)}</div>
      <div class="bar-line"><i style="width:${Math.max(2, Math.min(100, day / op.recoveryDays * 100))}%"></i></div></div><span>→</span></div></div>` : ''}

    ${section('Памятки после операций', '#/guides')}
    <p class="pad small muted" style="margin-bottom:8px">Выберите свою операцию — что можно, что нельзя и что делать по дням</p>
    <div class="grid pad" style="--cols:2;--cols-m:4;--cols-l:4">${D.operations.map((o, i) => `
      <div class="card tile enter" style="--i:${i}" data-href="#/guide/${o.id}">${art(o.art, 82)}<h3>${esc(o.title)}</h3>
        ${rot([`≈ ${o.recoveryDays} дней восстановления`, `${o.dos.length} советов «можно»`, `${o.donts.length} запретов`, `${o.stages.length} этапа заживления`], 2800, i * 350)}</div>`).join('')}</div>

    ${section('Проверьте себя')}
    <div class="pad"><div class="bento">
      <div class="card grad-coral small-tile" data-href="#/emergency">${art('Phone', 84, 'white')}<h3>Норма или тревога?</h3>${rot(['Когда звонить врачу', 'Что нормально после операции'], 3000)}</div>
      <div class="col">
        <div class="card grad-sun small-tile" data-href="#/quiz">${art('Calendar', 84, 'white')}<h3>Викторина</h3>${rot([S.quizBest ? `Рекорд: ${S.quizBest}/10` : '10 вопросов', 'Проверьте за 2 минуты'], 3000)}</div>
        <div class="card grad-lilac small-tile" data-href="#/myths">${art('Heart', 84, 'white')}<h3>Мифы и факты</h3>${rot(['Грелка снимет отёк?', 'Сода ускоряет заживление?'], 3000)}</div>
      </div></div></div>

    ${S.tips ? `<div class="pad" style="margin-top:14px"><div class="card flat tip"><span class="ic">${svg('bulb')}</span><div><b style="color:var(--sun-ink);font-size:.9rem">Совет дня</b><div>${rot(tips, 5000)}</div></div></div></div>` : ''}

    ${isAndroid ? `<div class="pad" style="margin-top:14px"><a class="card grad-teal apk-banner" href="${APK.url}" download>${svg('android', 32)}<div><b>Установить приложение для Android</b><div class="small" style="opacity:.85">Версия ${APK.name} · работает без интернета · 2 МБ</div></div></a></div>` : ''}

    ${section('Полезно знать', '#/articles', 'Все статьи')}
    <div class="row-scroll">${D.articles.map((a, i) => articleCard(a, i)).join('')}</div>

    ${section('Акции клиники', '#/promos', 'Все акции')}
    <div class="row-scroll">${D.promos.map((p, i) => promoCard(p, i)).join('')}</div>

    ${section('Наши врачи', '#/doctors', 'Все врачи')}
    <div class="row-scroll">${D.doctors.map((d, i) => `
      <div class="card doc" data-href="#/doctor/${d.id}"><div class="ph"><img src="img/${d.photo}.webp" alt="${esc(d.name)}" loading="lazy"></div>
        <div class="nm">${esc(d.name.split(' ').slice(0, 2).join(' '))}${rot([d.roles[0], 'Стаж ' + d.experienceLabel], 3000, (i % 5) * 400)}</div></div>`).join('')}</div>

    ${section('Клиника «Авалон»')}
    <div class="pad"><div class="clinic-row">
      <div class="card grad-night main" data-href="#/clinic"><img src="img/logo-white.svg" alt=""><div class="small">${rot([D.clinic.address.replace('Санкт-Петербург, ', ''), 'Метро ' + D.clinic.metro, D.clinic.hours, D.clinic.phone], 2800)}</div></div>
      <div class="col" style="display:grid;gap:12px">
        <a class="card grad-teal mini" href="#/booking">${svg('book', 20)}Записаться</a>
        <a class="card grad-mint mini" href="tel:${D.clinic.phoneRaw}">${svg('call', 20)}Позвонить</a>
      </div></div></div>
    <div class="spacer"></div>
  </main>`;
}
function articleCard(a, i) {
  return `<div class="card article" data-href="#/article/${a.id}"><div class="body"><span class="pill" style="align-self:flex-start">${esc(a.category)}</span>
    <h3>${esc(a.title)}</h3>${rot([a.teaser, `📖 ${a.readMin} мин чтения`], 3800, (i % 3) * 700)}</div><div class="side">${art(a.art, 66, 'nohalo')}</div></div>`;
}
const styleMap = { Teal: 'teal', Night: 'dark', Sun: 'sun', Lilac: 'lilac', Coral: 'coral', Mint: 'mint' };
function promoCard(p, i) {
  return `<div class="card promo grad-${styleMap[p.style]}" data-href="#/promo/${p.id}">${art(p.art, 104, 'white')}
    <span class="pill glass" style="align-self:flex-start;position:relative">${esc(p.badge)}</span><h3 style="margin-top:8px">${esc(p.title)}</h3>
    ${p.price ? `<div class="price">${esc(p.price)}${p.oldPrice ? `<s>${esc(p.oldPrice)}</s>` : ''}</div>` : '<div style="margin-top:auto"></div>'}
    ${rot([p.teaser, ...p.facts, ...p.includes.slice(0, 2)], 3400, (i % 4) * 500)}</div>`;
}
function initHero() {
  const box = document.getElementById('slides'); if (!box) return;
  const bars = [...document.querySelectorAll('#hero .stories i')];
  const n = bars.length;
  let cur = 0;
  const mark = i => bars.forEach((b, k) => { b.className = k < i ? 'done' : k === i ? (S.rotate ? 'cur' : 'done') : ''; if (k === i) { b.firstChild.style.animation = 'none'; b.firstChild.offsetWidth; b.firstChild.style.animation = ''; } });
  mark(0);
  let t = null;
  const schedule = () => { clearTimeout(t); if (!S.rotate) return; t = setTimeout(() => { box.scrollTo({ left: ((cur + 1) % n) * box.clientWidth, behavior: 'smooth' }); }, 6000); timers.push(t); };
  // Индекс считается только после окончания прокрутки — слайд всегда доезжает до конца
  let st = null;
  box.addEventListener('scroll', () => {
    clearTimeout(st);
    st = setTimeout(() => { const i = Math.round(box.scrollLeft / box.clientWidth); if (i !== cur) { cur = i; mark(i); } schedule(); }, 120);
  }, { passive: true });
  schedule();
}

// ————————————————— Памятки —————————————————
function viewGuides() {
  return header(`<h1 class="enter">Памятки</h1><p class="enter" style="--i:1">Выберите вашу операцию — покажу, что можно и что нельзя, по дням</p>`) +
  `<main class="wrap"><div class="grid pad" style="--cols:2;--cols-m:3;--cols-l:4">${D.operations.map((o, i) => `
    <div class="card tile enter" style="--i:${i};min-height:236px" data-href="#/guide/${o.id}">${art(o.art, 118)}<h3 style="font-size:1rem">${esc(o.title)}</h3>
      <p class="small muted" style="flex:1">${esc(o.subtitle)}</p><span class="pill" style="align-self:flex-start;margin-top:6px">≈ ${o.recoveryDays} дней</span></div>`).join('')}</div>
    <div class="spacer"></div></main>`;
}

const TABS = ['Этапы', 'Можно', 'Нельзя', 'Питание', 'Тревога'];
const TAB_COLORS = ['var(--teal)', 'var(--mint)', 'var(--coral)', 'var(--sun)', 'var(--coral)'];
function viewGuide(id, tab = 0) {
  const o = byId(D.operations, id); if (!o) return viewGuides();
  tab = Math.max(0, Math.min(4, +tab || 0));
  let body = '';
  if (tab === 0) {
    body = `<div class="hint">👆 Нажмите на этап, чтобы увидеть, что делать</div><div class="pad">${o.stages.map((s, i) => `
      <div class="stage ${i === 0 ? 'open' : ''} enter" style="--i:${i}"><div class="num"><b>${i + 1}</b>${i < o.stages.length - 1 ? '<i></i>' : ''}</div>
        <div class="card" data-toggle-stage><div class="period">${esc(s.period)}</div><b>${esc(s.title)}</b>
          <div class="more"><div><p class="muted" style="margin:8px 0">${esc(s.whatHappens)}</p>${s.tasks.map(t => `<div class="check">${esc(t)}</div>`).join('')}</div></div></div></div>`).join('')}</div>`;
  } else if (tab === 1 || tab === 2) {
    const good = tab === 1; const list = good ? o.dos : o.donts;
    body = `<div class="hint">👆 Нажмите на картинку — расскажу подробнее</div><div class="grid pad" style="--cols:2;--cols-m:3;--cols-l:4">${list.map((t, i) => `
      <div class="card tipcard enter" style="--i:${i}" data-tip="${good ? 'dos' : 'donts'}:${i}">${art(t.art, 104)}
        <span class="mark" style="background:${good ? 'var(--mint)' : 'var(--coral)'}">${good ? '✓' : '✕'}</span>
        <h3>${esc(t.title)}</h3><p class="small muted">${esc(t.short)}</p></div>`).join('')}</div>`;
  } else if (tab === 3) {
    body = `<div class="pad" style="display:grid;gap:12px;margin-top:8px">
      <div class="box mint enter"><h3>✅ Можно есть</h3><div class="chips">${o.foodYes.map(f => `<button class="chip">${esc(f)}</button>`).join('')}</div></div>
      <div class="box coral enter" style="--i:1"><h3>⛔ Лучше исключить</h3><div class="chips">${o.foodNo.map(f => `<button class="chip">${esc(f)}</button>`).join('')}</div></div>
      <div class="box sun enter" style="--i:2;display:flex;gap:10px;align-items:center">${art('SoftFood', 70)}<span>Еда — тёплая, не горячая. Жуйте на здоровой стороне. После еды аккуратно обходите рану при чистке зубов.</span></div></div>`;
  } else body = alarm(o.normal, o.redFlags);
  return header(`${backBtn()}<div class="row"><div style="flex:1"><div class="small" style="opacity:.75">Памятка после операции</div><h1>${esc(o.title)}</h1>
      <span class="pill glass" style="margin-top:6px">Восстановление ≈ ${o.recoveryDays} дней</span></div>${art(o.art, 130, 'white')}</div>
      <p style="margin-top:10px">${esc(o.about)}</p>`) +
  `<main class="wrap"><div class="tabs" style="--t:${tab}"><span class="ind" style="background:${TAB_COLORS[tab]}"></span>
      ${TABS.map((t, i) => `<button class="${i === tab ? 'on' : ''}" data-href="#/guide/${o.id}/${i}" data-replace>${t}</button>`).join('')}</div>
    <div class="view">${body}</div>
    <div class="disclaimer">Памятка носит информационный характер. Всегда следуйте индивидуальным рекомендациям вашего лечащего врача.</div>
    <div class="pad" style="display:grid;gap:12px">
      <button class="btn grad-night" data-start="${o.id}">${svg('heart', 22)} Мне сегодня сделали эту операцию — включить «Мой путь»</button>
      <button class="btn grad-teal" data-share="#/guide/${o.id}" data-title="Памятка: ${esc(o.title)}">${svg('share', 22)} Поделиться памяткой</button>
    </div><div style="height:40px"></div></main>`;
}
function alarm(normal, red) {
  return `<div class="pad" style="display:grid;gap:12px;margin-top:8px">
    <div class="box mint enter"><h3>✅ Это нормально</h3>${normal.map(x => `<div class="bullet">${esc(x)}</div>`).join('')}</div>
    <div class="box coral enter" style="--i:1"><h3>⚠️ Срочно позвоните врачу, если:</h3>${red.map(x => `<div class="bullet" style="--c:var(--coral)">${esc(x)}</div>`).join('')}</div>
    <a class="btn grad-coral enter" style="--i:2" href="tel:${D.clinic.phoneRaw}">${svg('call', 22)} Позвонить в клинику</a></div>`;
}
function openTip(guideId, key) {
  const o = byId(D.operations, guideId); const [k, i] = key.split(':'); const t = o[k][+i]; const good = k === 'dos';
  sheet(`${art(t.art, 180)}<div><span class="pill ${good ? 'mint' : 'coral'}">${good ? '✓ РЕКОМЕНДУЕТСЯ' : '✕ НЕЛЬЗЯ'}</span></div>
    <h2 style="margin-top:12px">${esc(t.title)}</h2><b style="color:${good ? 'var(--mint)' : 'var(--coral)'}">${esc(t.short)}</b>
    <div class="box pale why"><b style="color:var(--teal-deep)">Почему это важно</b><p style="margin-top:6px">${esc(t.details)}</p></div>`);
}
function sheet(html) {
  const bg = document.createElement('div'); bg.className = 'sheet-bg';
  const sh = document.createElement('div'); sh.className = 'sheet'; sh.innerHTML = `<div class="handle"></div>${html}`;
  document.body.append(bg, sh);
  requestAnimationFrame(() => { bg.classList.add('open'); sh.classList.add('open'); });
  const close = () => { bg.classList.remove('open'); sh.classList.remove('open'); setTimeout(() => { bg.remove(); sh.remove(); }, 400); };
  bg.onclick = close; sh.querySelector('.handle').onclick = close;
}

// ————————————————— Мой путь —————————————————
function viewTracker() {
  const o = S.track && byId(D.operations, S.track.op);
  if (!o) {
    const sel = window._sel || {};
    return header(`<div class="row"><div style="flex:1"><h1>Мой путь</h1><p>Персональный план восстановления по дням: чек-лист, этапы и самопроверка</p></div>${art('Calendar', 110, 'white')}</div>`, 'night') +
    `<main class="wrap">${section('1. Какая у вас операция?')}
      <div class="grid pad" style="--cols:1;--cols-m:2;--cols-l:2">${D.operations.map((x, i) => `
        <button class="card flat enter" style="--i:${i};display:flex;align-items:center;gap:12px;padding:10px;text-align:left;border:2px solid ${sel.op === x.id ? 'var(--teal)' : 'transparent'};background:${sel.op === x.id ? 'var(--pale)' : 'var(--card)'}" data-pick="${x.id}">
          ${art(x.art, 52)}<div style="flex:1"><b>${esc(x.title)}</b><div class="small muted">${esc(x.subtitle)}</div></div>${sel.op === x.id ? '<span class="pill mint">✓</span>' : ''}</button>`).join('')}</div>
      ${section('2. Когда была операция?')}
      <div class="pad"><input type="date" id="opdate" value="${sel.date || new Date().toISOString().slice(0, 10)}" max="${new Date().toISOString().slice(0, 10)}"></div>
      <div class="pad" style="margin-top:20px"><button class="btn grad-teal" style="width:100%;opacity:${sel.op ? 1 : .5}" data-begin>${sel.op ? 'Начать мой путь восстановления' : 'Выберите операцию'}</button></div>
      <div class="spacer"></div></main>`;
  }
  const day = dayIndex(); const st = stageOf(o, day); const si = o.stages.indexOf(st);
  const prog = Math.min(100, day / o.recoveryDays * 100);
  const done = st.tasks.filter(t => S.checked[`${day}:${t}`]).length;
  return header(`<div class="row"><div style="flex:1"><div class="small" style="opacity:.75">Мой путь</div><h1 style="font-size:1.3rem">${esc(o.title)}</h1></div>
      <button class="back" data-reset title="Сбросить">↺</button></div>
      <div class="big-ring" style="--p:${prog}"><div><small>день</small><b>${day}</b><small>из ${o.recoveryDays}</small></div></div>
      <div style="text-align:center"><span class="pill mint">${day >= o.recoveryDays ? 'Основной этап позади! 🎉' : `Вы прошли ${Math.round(prog)}% пути`}</span></div>`, 'night') +
  `<main class="wrap"><div class="row-scroll">${o.stages.map((s, i) => `<div class="card flat" style="width:136px;padding:12px;${i === si ? 'background:var(--teal);color:#fff' : i < si ? 'background:var(--mint-pale)' : ''}">
      <div class="small" style="opacity:.75">${esc(s.period)}</div><b style="font-size:.88rem">${esc(s.title)}</b>
      <div class="small">${i < si ? '✓ пройдено' : i === si ? '● сейчас' : ''}</div></div>`).join('')}</div>
    <div class="two pad">
      <div><div class="box pale" style="display:flex;gap:12px;align-items:center">${art(o.art, 72)}<div><b style="color:var(--teal-deep)">Что сейчас происходит</b><p>${esc(st.whatHappens)}</p></div></div>
        <a class="card" style="display:flex;gap:12px;align-items:center;padding:16px;margin-top:12px;color:inherit" href="#/guide/${o.id}">${art('Doctor', 56)}<div><b>Открыть полную памятку</b><div class="small muted">Можно / нельзя, питание, тревожные признаки</div></div></a></div>
      <div><h3 style="margin:8px 0">Чек-лист на сегодня ${done}/${st.tasks.length}</h3>
        ${st.tasks.map(t => `<button class="taskrow ${S.checked[`${day}:${t}`] ? 'on' : ''}" data-task="${esc(`${day}:${t}`)}"><span class="cb"><i>✓</i></span><span>${esc(t)}</span></button>`).join('')}
        ${done === st.tasks.length ? '<p style="color:var(--mint);font-weight:700;margin:6px 0">Отлично! Все задачи на сегодня выполнены 💚</p>' : ''}
        <h3 style="margin:16px 0 8px">Как вы себя чувствуете?</h3>
        <div class="group" id="symptoms">${slider('pain', 'Боль', ['😌 нет', '🙂 слабая', '😐 терпимая', '😣 сильная', '😫 очень сильная'], 2)}
          ${slider('sw', 'Отёк', ['😌 нет', '🙂 небольшой', '😮 заметный', '😟 сильный', '😰 нарастает'], 1)}
          ${slider('bl', 'Кровоточивость', ['😌 нет', '🙂 розовая слюна', '😟 кровит', '😰 не останавливается'], 0)}
          <div id="verdict"></div></div></div></div>
    <div class="spacer"></div></main>`;
}
function slider(id, label, levels, v) {
  return `<div style="margin:6px 0"><div style="display:flex;justify-content:space-between"><b>${label}</b><span id="${id}-l" style="font-weight:600">${levels[v]}</span></div>
    <input type="range" id="${id}" min="0" max="${levels.length - 1}" value="${v}" data-levels="${esc(JSON.stringify(levels))}"></div>`;
}
function updateVerdict() {
  const g = id => +document.getElementById(id).value; const day = dayIndex();
  ['pain', 'sw', 'bl'].forEach(id => { const el = document.getElementById(id); const lv = JSON.parse(el.dataset.levels); document.getElementById(id + '-l').textContent = lv[el.value];
    el.style.setProperty('--c', el.value <= 1 ? 'var(--mint)' : el.value == 2 ? 'var(--sun)' : 'var(--coral)'); });
  const pain = g('pain'), sw = g('sw'), bl = g('bl');
  const alarm = bl >= 3 || pain >= 4 || sw >= 4 || (day >= 3 && (pain >= 3 || sw >= 3));
  const caution = !alarm && (bl >= 2 || pain >= 3 || sw >= 3);
  const [cls, t, x] = alarm ? ['coral', 'Нужно связаться с врачом', 'Такие симптомы требуют осмотра. Позвоните в клинику — врач подскажет, что делать.']
    : caution ? ['sun', 'Понаблюдайте', bl >= 2 ? 'Прикусите стерильный марлевый тампон на 20–30 минут. Если кровь не остановится — звоните врачу.' : 'В первые дни это бывает. Холод, покой и лекарства по схеме. Если станет хуже — звоните.']
    : ['mint', 'Всё идёт по плану', 'Ваше самочувствие соответствует нормальному заживлению. Продолжайте следовать памятке!'];
  document.getElementById('verdict').innerHTML = `<div class="box ${cls} view" style="margin-top:8px"><b>${t}</b><p>${x}</p>${alarm ? `<a class="pill coral" style="margin-top:8px;padding:10px 16px" href="tel:${D.clinic.phoneRaw}">📞 Позвонить в клинику</a>` : ''}</div>`;
}

// ————————————————— Врачи —————————————————
const GROUPS = [['All', 'Все'], ['Surgeon', 'Хирурги'], ['Ortho', 'Ортопеды'], ['Therapy', 'Терапевты'], ['Orthodont', 'Ортодонты']];
function viewDoctors(g = 'All') {
  const list = D.doctors.filter(d => g === 'All' || d.groups.includes(g));
  return header(`<h1>Наши врачи</h1><p>${D.doctors.length} специалистов · кандидаты наук и врачи высшей категории</p>`) +
  `<main class="wrap"><div class="chips pad" style="margin-bottom:12px">${GROUPS.map(([k, l]) => `<button class="chip ${k === g ? 'on' : ''}" data-href="#/doctors/${k}" data-replace>${l}</button>`).join('')}</div>
    <div class="grid pad docs" style="--cols:2;--cols-m:3;--cols-l:5">${list.map((d, i) => `
      <div class="card enter" style="--i:${i}" data-href="#/doctor/${d.id}"><div class="ph"><img src="img/${d.photo}.webp" alt="${esc(d.name)}" loading="lazy"><span class="pill exp">${d.experienceYears}+ лет</span></div>
        <div style="padding:12px"><b style="font-size:.9rem">${esc(d.name)}</b><div class="small" style="color:var(--teal);margin-top:4px">${esc(d.roles.join(' · '))}</div></div></div>`).join('')}</div>
    <div class="spacer"></div></main>`;
}
function viewDoctor(id) {
  const d = byId(D.doctors, id); if (!d) return viewDoctors();
  return `<div class="doc-layout"><div class="doc-hero">${backBtn()}<img src="img/${d.photo}.webp" alt="${esc(d.name)}"></div>
    <div class="doc-info wrap pad" style="max-width:820px">
      <h1 class="enter" style="font-size:1.5rem;margin-top:8px">${esc(d.name)}</h1>
      <div class="chips enter" style="--i:1;margin:8px 0">${d.roles.map(r => `<span class="pill">${esc(r)}</span>`).join('')}</div>
      <div class="two enter" style="--i:2;grid-template-columns:1fr 1fr;gap:12px;margin:12px 0">
        <div class="card flat" style="padding:12px"><b style="font-size:1.4rem" data-count="${d.experienceYears}">0</b><b>+ лет</b><div class="small muted">опыт работы</div></div>
        <div class="card flat" style="padding:12px"><b style="font-size:1.4rem">${d.consultMinutes} мин</b><div class="small muted">консультация</div></div></div>
      <p class="enter" style="--i:3">${esc(d.about)}</p>
      ${d.highlights.length ? `<div class="chips" style="margin-top:10px">${d.highlights.map(h => `<span class="pill sun">🏆 ${esc(h)}</span>`).join('')}</div>` : ''}
      <h3 style="margin:20px 0 8px">Направления работы</h3>${d.skills.map((s, i) => `<div class="card flat enter" style="--i:${i};padding:12px;margin:6px 0" ><span class="check">${esc(s)}</span></div>`).join('')}
      <h3 style="margin:20px 0 8px">Образование и повышение квалификации</h3>${d.education.map(e => `<div class="bullet" style="--c:var(--teal)">${esc(e)}</div>`).join('')}
      <div style="height:110px"></div></div></div>
    <a class="btn grad-teal floating-cta" href="#/booking/doctor/${d.id}">${svg('call', 22)} Записаться на приём</a>`;
}

// ————————————————— Клиника —————————————————
function viewClinic() {
  const c = D.clinic;
  const row = (ic, color, t, v) => `<div class="info-row"><span class="ib" style="background:color-mix(in srgb, ${color} 15%, transparent);color:${color}">${ic}</span><div><div class="small muted">${t}</div>${v}</div></div>`;
  return header(`<div style="text-align:center"><img src="img/mark-white.svg" alt="" style="width:66px;padding:27px;box-sizing:content-box;border-radius:50%;background:rgba(255,255,255,.1)">
      <h1 style="margin-top:10px">АВАЛОН</h1><p style="color:var(--teal-light)">${esc(c.tagline)}</p><span class="pill glass" style="margin-top:8px">${esc(c.slogan)}</span></div>`, 'night') +
  `<main class="wrap"><div class="two pad"><div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">
        <a class="card" style="padding:14px;text-align:center;color:var(--ink)" href="tel:${c.phoneRaw}"><span style="color:var(--teal)">${svg('call')}</span><div class="small">Позвонить</div></a>
        <a class="card" style="padding:14px;text-align:center;color:var(--ink)" href="https://yandex.ru/maps/?text=${encodeURIComponent(c.address)}" target="_blank" rel="noopener"><span style="color:var(--mint)">${svg('map')}</span><div class="small">Маршрут</div></a>
        <a class="card" style="padding:14px;text-align:center;color:var(--ink)" href="${c.site}" target="_blank" rel="noopener"><span style="color:var(--lilac)">🌐</span><div class="small">Сайт</div></a></div>
      <a class="card grad-teal" style="display:flex;gap:12px;align-items:center;padding:16px;margin-top:12px;color:#fff" href="#/booking">${art('Calendar', 56, 'white')}<div><b>Записаться на приём</b><div class="small" style="opacity:.85">Заявка за 1 минуту — администратор перезвонит</div></div></a>
      <div class="group">${row('📍', 'var(--coral)', 'Адрес', esc(c.address))}${row('🚇', 'var(--lilac)', 'Метро', esc(c.metro))}${row('🕘', 'var(--sun)', 'Часы работы', esc(c.hours))}
        ${row('📞', 'var(--teal)', 'Телефон', `<a href="tel:${c.phoneRaw}">${esc(c.phone)}</a>`)}${row('✅', 'var(--mint)', 'Лицензия', esc(c.license) + ', бессрочная')}</div>
</div>
    </div><div>
      ${section('Хирургия в «Авалоне»')}<div class="chips">${c.services.map(s => `<span class="chip">${esc(s)}</span>`).join('')}</div>
      ${section('Все направления')}<div class="chips">${c.directions.map(s => `<span class="pill">${esc(s)}</span>`).join('')}</div>
      ${section('Системы имплантатов')}<div class="chips">${c.implants.map(s => `<span class="pill" style="background:var(--lilac-pale);color:var(--lilac-ink)">${esc(s)}</span>`).join('')}</div>
    </div></div>
    <p class="small muted" style="text-align:center;margin-top:20px">ООО «Авалон» · с ${c.founded} года</p><div class="spacer"></div></main>`;
}

// ————————————————— Акции и статьи —————————————————
function viewPromos() {
  return header(`${backBtn()}<div class="row"><div style="flex:1"><h1>Акции клиники</h1><p>Специальные предложения «Авалона»</p></div>${art('Gift', 110, 'white')}</div>`, 'coral') +
  `<main class="wrap"><div class="grid pad promos-grid" style="--cols:1;--cols-m:2;--cols-l:3">${D.promos.map((p, i) => promoCard(p, i)).join('')}</div>
    <p class="pad small muted" style="margin-top:14px">Цены и условия актуальны на момент выпуска. Уточняйте у администратора: ${esc(D.clinic.phone)}</p><div style="height:40px"></div></main>`;
}
function viewPromo(id) {
  const p = byId(D.promos, id); if (!p) return viewPromos();
  return header(`${backBtn()}<div class="row"><div style="flex:1"><span class="pill glass">${esc(p.badge)}</span><h1 style="margin-top:8px">${esc(p.title)}</h1><p>${esc(p.teaser)}</p>
      ${p.price ? `<div style="font-size:2rem;font-weight:800;margin-top:10px">${esc(p.price)} ${p.oldPrice ? `<s style="font-size:1rem;opacity:.7;font-weight:400">${esc(p.oldPrice)}</s>` : ''}</div>` : ''}</div>${art(p.art, 130, 'white')}</div>`, styleMap[p.style] === 'dark' ? 'night' : styleMap[p.style] === 'teal' ? '' : styleMap[p.style] === 'mint' ? '' : styleMap[p.style]) +
  `<main class="wrap pad" style="max-width:860px">
    <div class="chips">${p.facts.map(f => `<span class="pill sun">✦ ${esc(f)}</span>`).join('')}</div>
    <h3 style="margin:16px 0 8px">Что входит</h3>${p.includes.map((s, i) => `<div class="card flat enter" style="--i:${i};padding:14px;margin:6px 0"><span class="check">${esc(s)}</span></div>`).join('')}
    <div class="box pale small" style="margin:14px 0">ℹ️ Итоговая стоимость определяется после консультации и диагностики. Условия и сроки акции уточняйте у администратора.</div>
    <a href="${p.url}" target="_blank" rel="noopener">Подробнее на сайте клиники →</a><div style="height:110px"></div></main>
    <a class="btn grad-${styleMap[p.style]} floating-cta" href="#/booking/service/${encodeURIComponent('Акция: ' + p.title)}">${svg('call', 22)} Записаться по акции</a>`;
}
function viewArticles(cat = 'Все') {
  const cats = ['Все', ...new Set(D.articles.map(a => a.category))];
  const list = D.articles.filter(a => cat === 'Все' || a.category === cat);
  return header(`${backBtn()}<div class="row"><div style="flex:1"><h1>Полезно знать</h1><p>Статьи врачей «Авалона» простым языком</p></div>${art('Doctor', 110, 'white')}</div>`) +
  `<main class="wrap"><div class="chips pad" style="margin-bottom:12px">${cats.map(c => `<button class="chip ${c === cat ? 'on' : ''}" data-href="#/articles/${encodeURIComponent(c)}" data-replace>${esc(c)}</button>`).join('')}</div>
    <div class="grid pad articles-grid" style="--cols:1;--cols-m:2;--cols-l:3">${list.map((a, i) => articleCard(a, i)).join('')}</div><div style="height:40px"></div></main>`;
}
function viewArticle(id) {
  const a = byId(D.articles, id); if (!a) return viewArticles();
  const g = a.relatedGuide && byId(D.operations, a.relatedGuide);
  return header(`${backBtn()}<div class="row"><div style="flex:1"><span class="pill coral">${esc(a.category)}</span> <span class="pill glass">📖 ${a.readMin} мин</span>
      <h1 style="margin-top:10px">${esc(a.title)}</h1><p>${esc(a.teaser)}</p></div>${art(a.art, 120, 'white')}</div>`, 'night') +
  `<main class="wrap pad" style="max-width:760px">${a.sections.map((s, i) => `<div class="card flat enter" style="--i:${i};padding:18px;margin:10px 0">
      <h3 style="display:flex;gap:10px;align-items:center"><span class="pill">${i + 1}</span>${esc(s.h)}</h3><p style="margin-top:8px;white-space:pre-line">${esc(s.b)}</p></div>`).join('')}
    ${g ? `<div class="card grad-teal" style="display:flex;gap:12px;align-items:center;padding:16px" data-href="#/guide/${g.id}">${art(g.art, 60, 'white')}<div><b>Памятка: ${esc(g.title)}</b><div class="small" style="opacity:.85">Что делать после операции — по дням</div></div></div>` : ''}
    <p class="small muted" style="margin:12px 0">По материалам блога клиники «Авалон». Эксперт: Рыбальченко Д.С., к.м.н., челюстно-лицевой хирург.</p>
    <a href="${a.url}" target="_blank" rel="noopener">Читать полную статью на сайте →</a><div style="height:40px"></div></main>`;
}

// ————————————————— Викторина, мифы, тревога —————————————————
let Q = { i: 0, score: 0, answered: null };
function viewQuiz() {
  const fin = Q.i >= D.quiz.length;
  let body;
  if (fin) {
    const [t, x, ar] = Q.score >= 9 ? ['Вы эксперт!', 'Вы отлично знаете, как ухаживать за собой после операции. Скорейшего восстановления!', 'Heart']
      : Q.score >= 6 ? ['Хороший результат!', 'Вы знаете основные правила. Загляните в памятки, чтобы освежить детали.', 'Tooth']
      : ['Стоит повторить', 'Обязательно прочитайте памятку по вашей операции — это поможет избежать осложнений.', 'Calendar'];
    body = `<div style="text-align:center">${art(ar, 170)}<div style="font-size:2.4rem;font-weight:800;color:var(--teal)">${Q.score} / ${D.quiz.length}</div>
      <h2>${t}</h2><p class="muted" style="margin:6px 0">${x}</p><p style="color:var(--teal);font-weight:600">Лучший результат: ${Math.max(S.quizBest, Q.score)}</p>
      <button class="btn grad-teal" style="width:100%;margin-top:16px" data-quiz-restart>Пройти ещё раз</button></div>`;
  } else {
    const q = D.quiz[Q.i]; const a = Q.answered;
    body = `<div class="view" style="text-align:center">${art(q.art, 150)}<h2 style="font-size:1.25rem">${esc(q.q)}</h2></div>
      ${q.options.map((o, k) => `<button class="opt ${a != null && k === q.correct ? 'ok' : ''} ${a === k && k !== q.correct ? 'bad' : ''}" data-ans="${k}" ${a != null ? 'disabled' : ''}>
        <span class="l">${'АБВГ'[k]}</span><span style="flex:1">${esc(o)}</span>${a != null && k === q.correct ? '✅' : a === k ? '❌' : ''}</button>`).join('')}
      ${a != null ? `<div class="box sun view" style="margin-top:10px">💡 ${esc(q.explain)}</div><button class="btn grad-teal" style="width:100%;margin-top:14px" data-next>${Q.i === D.quiz.length - 1 ? 'Узнать результат' : 'Следующий вопрос'}</button>` : ''}`;
  }
  return header(`${backBtn()}<h1>Викторина</h1><p>Проверьте, хорошо ли вы знаете правила восстановления</p>
      <div class="progress" style="margin-top:12px"><i style="width:${Math.min(Q.i, D.quiz.length) / D.quiz.length * 100}%"></i></div>
      <div class="small" style="margin-top:6px;font-weight:600">${fin ? 'Готово!' : `Вопрос ${Q.i + 1} из ${D.quiz.length} · баллы: ${Q.score}`}</div>`, 'sun') +
  `<main class="wrap pad" style="max-width:720px">${body}<div style="height:40px"></div></main>`;
}
function viewMyths() {
  return header(`${backBtn()}<h1>Мифы и факты</h1><p>👆 Нажмите на карточку, чтобы узнать правду</p>`, 'lilac') +
  `<main class="wrap"><div class="grid pad" style="--cols:1;--cols-m:2;--cols-l:3">${D.myths.map((m, i) => `
    <div class="flip enter" style="--i:${i}" data-flip><div class="in">
      <div class="face front"><div style="flex:1"><div class="lab">МИФ</div><b style="display:block;margin:6px 0">${esc(m.myth)}</b><div class="small" style="opacity:.8">Нажмите — правда или нет?</div></div><b style="font-size:2.4rem;opacity:.35">?</b></div>
      <div class="face back">${art(m.art, 84, 'white')}<div style="flex:1"><div class="lab">ФАКТ</div><p style="font-size:.92rem">${esc(m.fact)}</p></div></div>
    </div></div>`).join('')}</div><div style="height:40px"></div></main>`;
}
function viewEmergency() {
  const o = D.operations[0];
  return header(`${backBtn()}<div class="row"><div style="flex:1"><h1>Норма или тревога?</h1><p>Как понять, что заживление идёт правильно, и когда нужна помощь врача</p></div>${art('Phone', 110, 'white')}</div>`, 'coral') +
  `<main class="wrap" style="max-width:860px">${alarm(o.normal, o.redFlags)}
    <p class="pad" style="color:var(--coral);font-weight:600;margin-top:12px">При угрожающих жизни состояниях (затруднённое дыхание, сильный отёк шеи, потеря сознания) звоните 103 или 112.</p><div style="height:40px"></div></main>`;
}

// ————————————————— Настройки —————————————————
const ACCENTS = [['Avalon', 'Фирменный', '#8CC4CF', '#1F5866'], ['Sea', 'Морской', '#8CBDEB', '#1C4C7E'], ['Lavender', 'Лаванда', '#BDB5F0', '#4A3F95'], ['Emerald', 'Изумруд', '#8ED6BF', '#1C6651']];
const SIZES = [[.9, 'Мелкий'], [1, 'Обычный'], [1.15, 'Крупный'], [1.3, 'Огромный']];
function viewSettings() {
  const tog = (k, t, s) => `<button style="display:flex;gap:12px;align-items:center;width:100%;text-align:left;padding:8px 0" data-toggle="${k}"><div style="flex:1"><b>${t}</b><div class="small muted">${s}</div></div><span class="switch ${S[k] ? 'on' : ''}"></span></button>`;
  const isAndroid = /Android/i.test(navigator.userAgent);
  return header(`${backBtn()}<div class="row"><div style="flex:1"><h1>Настройки</h1><p>Сделайте приложение удобным для себя</p></div><span style="font-size:70px;line-height:1;animation:spin 10s linear infinite;display:inline-block">⚙️</span></div>`, 'night') +
  `<main class="wrap pad"><div class="two"><div>
      <div class="group"><h3>👤 Профиль</h3><p class="small muted" style="margin-bottom:6px">Как к вам обращаться?</p><input type="text" id="name" value="${esc(S.name)}" placeholder="Например, Анна" maxlength="30"></div>
      <div class="group"><h3>🌗 Оформление</h3><b class="small">Тема</b><div class="seg" style="margin:8px 0 16px">${[['system', 'Как в системе'], ['light', 'Светлая'], ['dark', 'Тёмная']].map(([k, l]) => `<button class="${S.theme === k ? 'on' : ''}" data-set="theme:${k}">${l}</button>`).join('')}</div>
        <b class="small">🎨 Цвет акцента</b><div style="display:flex;justify-content:space-around;margin-top:10px">${ACCENTS.map(([k, l, a, b]) => `<button style="display:grid;justify-items:center;gap:4px" data-set="accent:${k}"><span class="dot ${S.accent === k ? 'on' : ''}" style="background:linear-gradient(${a},${b})">${S.accent === k ? '✓' : ''}</span><span class="small">${l}</span></button>`).join('')}</div></div>
      <div class="group"><h3>🔠 Размер текста</h3><div class="seg">${SIZES.map(([v, l]) => `<button class="${S.scale == v ? 'on' : ''}" data-set="scale:${v}">${l}</button>`).join('')}</div>
        <div class="box pale" style="margin-top:12px">Так будет выглядеть текст памяток: держите тампон 20–30 минут.</div></div>
    </div><div>
      <div class="group"><h3>✨ Анимации и карточки</h3>${tog('anim', 'Живые анимации', 'Движущиеся картинки и плавные переходы')}${tog('rotate', 'Автосмена карточек', 'Баннеры и карточки сами листаются и меняют информацию')}${tog('tips', 'Совет дня', 'Показывать полезные советы на главной')}</div>
      <div class="group"><h3>🗂 Данные</h3>
        <div style="display:flex;align-items:center;gap:8px;margin:6px 0"><div style="flex:1"><b>Сбросить «Мой путь»</b><div class="small muted">${S.track ? 'Операция: ' + esc(byId(D.operations, S.track.op)?.title) : 'Восстановление не отслеживается'}</div></div><button class="pill ${S.track ? 'coral' : ''}" data-reset>Сбросить</button></div>
        <div style="display:flex;align-items:center;gap:8px;margin:6px 0"><div style="flex:1"><b>Сбросить рекорд викторины</b><div class="small muted">${S.quizBest ? `Сейчас: ${S.quizBest}/10` : 'Рекорда пока нет'}</div></div><button class="pill ${S.quizBest ? 'coral' : ''}" data-resetquiz>Сбросить</button></div></div>
      <div class="group"><h3>📲 Приложение</h3>
        <p class="small muted">Добавьте сайт на главный экран: в Safari — «Поделиться» → «На экран „Домой“», в Chrome — меню ⋮ → «Добавить на главный экран».</p>
        ${isAndroid ? `<a class="btn grad-teal" style="margin-top:10px" href="${APK.url}" download>${svg('android')} Скачать приложение для Android ${APK.name}</a>` : `<a href="${APK.url}" class="small" download>Скачать APK для Android ${APK.name}</a>`}
</div></div>
      <div class="group"><img src="img/${document.documentElement.dataset.theme === 'dark' ? 'logo-white' : 'logo'}.svg" style="width:190px" alt=""><p><b>Помощник пациента · веб-версия</b></p>
        <p class="small muted">${esc(D.clinic.tagline)}<br>${esc(D.clinic.address)}<br>${esc(D.clinic.phone)}</p><p class="small muted" style="margin-top:8px">Информация в приложении не заменяет консультацию врача.</p></div>
    </div></div><div class="spacer"></div></main>`;
}


// ————————————————— Запись на приём (письмо на почту клиники) —————————————————
const PARTS = ['Утро · 9–12', 'День · 12–17', 'Вечер · 17–21', 'Любое время'];
let B = null;
function viewBooking(kind, val) {
  if (!B || B.key !== location.hash) B = { key: location.hash, doc: kind === 'doctor' ? val : '', svc: kind === 'service' ? val : '', day: -1, part: 3, name: S.bookName || S.name || '', phone: S.bookPhone || '', comment: '', consent: false, sent: false };
  if (B.sent) return header(`${backBtn()}<h1>Запись на приём</h1><p>Заявка готова</p>`, 'night') +
    `<main class="wrap pad" style="max-width:720px;text-align:center">${art('Calendar', 150)}<h2>Письмо с заявкой готово</h2>
     <p class="muted" style="margin:8px 0 16px">Проверьте, что письмо ушло на ${esc(D.clinic.email)}. Администратор перезвонит на ${esc(B.phone)} в рабочее время (9:00–21:00) и подтвердит запись.</p>
     <a class="btn grad-teal" href="${mailto()}">✉️ Открыть письмо ещё раз</a>
     <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px"><button class="btn" style="background:var(--card);color:var(--ink)" data-copybooking>📋 Скопировать</button><a class="btn" style="background:var(--card);color:var(--ink)" href="tel:${D.clinic.phoneRaw}">📞 Позвонить</a></div>
     <p style="margin-top:16px"><a href="#/">На главную</a></p></main>`;
  const days = [-1, ...Array.from({ length: 21 }, (_, i) => i)];
  const dname = o => { const d = new Date(); d.setDate(d.getDate() + o); return d; };
  const svcs = [...new Set([B.svc, 'Консультация врача', ...D.clinic.directions, 'Удаление зуба', 'Удаление зуба мудрости', 'Синус-лифтинг', 'Костная пластика'].filter(Boolean))];
  return header(`${backBtn()}<div class="row"><div style="flex:1"><h1>Запись на приём</h1><p>Заявка за 1 минуту — администратор перезвонит</p></div>${art('Calendar', 96, 'white')}</div>`, 'night') +
  `<main class="wrap pad" style="max-width:860px">
    <h3 style="margin:6px 0 10px">1. К кому записаться?</h3>
    <div class="grid" style="--cols:3;--cols-m:4;--cols-l:6">${[null, ...D.doctors].map(d => { const id = d ? d.id : 'any'; const on = B.doc === id;
      return `<button class="card flat" style="padding:8px;text-align:center;border:2px solid ${on ? 'var(--teal)' : 'transparent'};background:${on ? 'var(--pale)' : 'var(--card)'}" data-bk="doc:${id}">
        <span style="display:block;width:64px;height:64px;margin:0 auto;border-radius:50%;overflow:hidden;background:linear-gradient(var(--pale),var(--teal-light))">${d ? `<img src="img/${d.photo}.webp" style="width:100%;height:100%;object-fit:cover;object-position:top" alt="">` : art('Doctor', 64, 'nohalo')}</span>
        <b class="small" style="display:block;margin-top:6px">${d ? esc(d.name.split(' ').slice(0, 2).join(' ')) : 'Любой врач'}</b><span class="small" style="color:var(--teal)">${d ? esc(d.roles[0]) : 'подберём'}</span></button>`; }).join('')}</div>
    <p class="small muted" style="margin:12px 0 6px">или выберите услугу:</p>
    <div class="chips">${svcs.map(x => `<button class="chip ${B.svc === x ? 'on' : ''}" data-bk="svc:${esc(x)}">${esc(x)}</button>`).join('')}</div>
    <h3 style="margin:20px 0 10px">2. Когда вам удобно?</h3>
    <div class="row-scroll" style="padding:0 0 8px">${days.map(o => { const on = B.day === o; const d = dname(o);
      return `<button class="card flat" style="width:66px;padding:10px 0;text-align:center;${on ? 'background:var(--teal);color:#fff' : ''}" data-bk="day:${o}">${o < 0 ? '<b>Любой</b><div class="small">день</div>'
        : `<div class="small">${o === 0 ? 'сегодня' : o === 1 ? 'завтра' : d.toLocaleDateString('ru', { weekday: 'short' })}</div><b style="font-size:1.3rem">${d.getDate()}</b><div class="small">${d.toLocaleDateString('ru', { month: 'short' })}</div>`}</button>`; }).join('')}</div>
    <div class="chips" style="margin-top:6px">${PARTS.map((p, i) => `<button class="chip ${B.part === i ? 'on' : ''}" data-bk="part:${i}">${p}</button>`).join('')}</div>
    <h3 style="margin:20px 0 10px">3. Ваши контакты</h3>
    <div style="display:grid;gap:10px"><input type="text" id="bk-name" placeholder="Имя" value="${esc(B.name)}" maxlength="60">
      <input type="text" id="bk-phone" inputmode="tel" placeholder="Телефон, например +7 900 000-00-00" value="${esc(B.phone)}" maxlength="20">
      <textarea id="bk-comment" rows="2" placeholder="Комментарий (необязательно)" style="width:100%;padding:14px;border-radius:14px;border:1.5px solid var(--outline);background:var(--card);color:var(--ink);font:inherit">${esc(B.comment)}</textarea>
      <label style="display:flex;gap:10px;align-items:flex-start"><input type="checkbox" id="bk-consent" ${B.consent ? 'checked' : ''} style="width:22px;height:22px;accent-color:var(--teal)">
        <span>Даю согласие на обработку персональных данных · <a href="${D.clinic.consentUrl}" target="_blank" rel="noopener">прочитать</a></span></label></div>
    <p class="small muted" style="margin-top:10px;text-align:center">Откроется ваша почта с готовым письмом на ${esc(D.clinic.email)} — останется нажать «Отправить».</p>
    <div style="height:110px"></div></main>
    <button class="btn grad-teal floating-cta" id="bk-send" data-bksend>✉️ Отправить заявку</button>`;
}
function bookingText() {
  const doc = D.doctors.find(d => d.id === B.doc);
  const d = new Date(); d.setDate(d.getDate() + B.day);
  const date = B.day < 0 ? 'любая' : d.toLocaleDateString('ru', { weekday: 'long', day: 'numeric', month: 'long' });
  const lines = ['Заявка на приём с сайта «Авалон · Помощник пациента»', '', `Пациент: ${B.name.trim()}`, `Телефон: ${B.phone.trim()}`,
    `Врач: ${doc ? `${doc.name} (${doc.roles[0].toLowerCase()})` : 'любой'}`];
  if (B.svc) lines.push(`Услуга: ${B.svc}`);
  lines.push(`Желаемая дата: ${date}`, `Удобное время: ${PARTS[B.part].toLowerCase()}`);
  if (B.comment.trim()) lines.push(`Комментарий: ${B.comment.trim()}`);
  lines.push('', 'Пациент дал согласие на обработку персональных данных.', `Отправлено: ${new Date().toLocaleString('ru')}`);
  const short = doc ? doc.name.split(' ')[0] + ' ' + doc.name.split(' ')[1][0] + '.' : (B.svc || 'любой врач');
  return { subject: `Запись на приём: ${B.name.trim()}, ${B.phone.trim()} — ${short}`, body: lines.join('\n') };
}
const mailto = () => { const t = bookingText(); return `mailto:${D.clinic.email}?subject=${encodeURIComponent(t.subject)}&body=${encodeURIComponent(t.body)}`; };
function bookingValid() { return B.name.trim() && B.phone.replace(/\D/g, '').length >= 10 && B.consent && (B.doc || B.svc); }
function refreshSend() { const b = document.getElementById('bk-send'); if (b) b.style.opacity = bookingValid() ? 1 : .45; }

// ————————————————— Навигация —————————————————
const NAV = [['home', 'Главная', '#/'], ['book', 'Памятки', '#/guides'], ['heart', 'Мой путь', '#/tracker'], ['doc', 'Врачи', '#/doctors'], ['clinic', 'Клиника', '#/clinic'], ['gear', 'Настройки', '#/settings']];
function renderNav(route) {
  const roots = ['', 'guides', 'tracker', 'doctors', 'clinic', 'settings'];
  const idx = roots.indexOf(route);
  $nav.classList.toggle('hidden', idx < 0);
  if (idx < 0) return;
  $nav.style.setProperty('--n', idx);
  $nav.querySelectorAll('button').forEach((b, i) => b.classList.toggle('on', i === idx));
}
function buildNav() {
  $nav.innerHTML = `<span class="drop"></span>` + NAV.map(([ic, l, h]) => `<button data-nav="${h}" aria-label="${l}">${svg(ic)}<span>${l}</span></button>`).join('');
}
const shareUrl = h => location.origin + location.pathname + (h || '');
async function share(h, title) {
  const url = shareUrl(h);
  if (navigator.share) { try { await navigator.share({ title, text: title, url }); } catch (e) {} }
  else { try { await navigator.clipboard.writeText(url); toast('Ссылка скопирована'); } catch (e) { prompt('Ссылка:', url); } }
}

function route() {
  clearTimers();
  document.querySelectorAll('.sheet,.sheet-bg').forEach(e => e.remove());
  const parts = location.hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent);
  const [r, a, b] = parts;
  let html;
  switch (r) {
    case 'guides': html = viewGuides(); break;
    case 'guide': html = viewGuide(a, b); break;
    case 'tracker': html = viewTracker(); break;
    case 'doctors': html = viewDoctors(a || 'All'); break;
    case 'doctor': html = viewDoctor(a); break;
    case 'clinic': html = viewClinic(); break;
    case 'promos': html = viewPromos(); break;
    case 'promo': html = viewPromo(a); break;
    case 'articles': html = viewArticles(a || 'Все'); break;
    case 'article': html = viewArticle(a); break;
    case 'quiz': html = viewQuiz(); break;
    case 'myths': html = viewMyths(); break;
    case 'emergency': html = viewEmergency(); break;
    case 'settings': html = viewSettings(); break;
    case 'booking': html = viewBooking(a, b); break;
    default: html = viewHome();
  }
  const keepScroll = window._replace; window._replace = false;
  const y = scrollY;
  $app.innerHTML = `<div class="${keepScroll ? '' : 'view'}">${html}</div>`;
  scrollTo(0, keepScroll ? y : 0);
  renderNav(r || '');
  startRotators();
  if (!r) initHero();
  if (r === 'tracker' && document.getElementById('symptoms')) updateVerdict();
  if (r === 'booking') refreshSend();
  document.querySelectorAll('[data-count]').forEach(el => { const n = +el.dataset.count; let k = 0; const t = setInterval(() => { k++; el.textContent = Math.round(n * Math.min(1, k / 30)); if (k >= 30) clearInterval(t); }, 40); timers.push(t); });
  const titles = { guide: () => byId(D.operations, a)?.title, doctor: () => byId(D.doctors, a)?.name, article: () => byId(D.articles, a)?.title, promo: () => byId(D.promos, a)?.title };
  document.title = (titles[r]?.() ? titles[r]() + ' · ' : '') + 'Авалон · Помощник пациента';
}

// ————————————————— События —————————————————
document.addEventListener('click', e => {
  const el = e.target.closest('[data-bk],[data-bksend],[data-copybooking],[data-href],[data-nav],[data-back],[data-tip],[data-toggle-stage],[data-start],[data-share],[data-pick],[data-begin],[data-reset],[data-resetquiz],[data-task],[data-set],[data-toggle],[data-ans],[data-next],[data-quiz-restart],[data-flip]');
  if (!el) return;
  const d = el.dataset;
  if (d.bk) { const i = d.bk.indexOf(':'); const k = d.bk.slice(0, i), v = d.bk.slice(i + 1);
    if (k === 'doc') B.doc = B.doc === v ? '' : v; else if (k === 'svc') B.svc = B.svc === v ? '' : v; else B[k] = +v;
    window._replace = true; route(); return; }
  if (d.bksend !== undefined) {
    if (!bookingValid()) { toast(!(B.doc || B.svc) ? 'Выберите врача или услугу' : !B.name.trim() ? 'Укажите имя' : B.phone.replace(/\D/g, '').length < 10 ? 'Проверьте телефон' : 'Нужно согласие на обработку данных'); return; }
    S.bookName = B.name.trim(); S.bookPhone = B.phone.trim(); store.save();
    location.href = mailto(); B.sent = true; setTimeout(route, 400); return; }
  if (d.copybooking !== undefined) { const t = bookingText(); navigator.clipboard?.writeText(`Кому: ${D.clinic.email}\nТема: ${t.subject}\n\n${t.body}`).then(() => toast('Заявка скопирована')); return; }
  if (d.nav) { go(d.nav); return; }
  if (d.back !== undefined) { history.length > 1 ? history.back() : go('#/'); return; }
  if (d.tip) { openTip(location.hash.split('/')[2], d.tip); return; }
  if (d.toggleStage !== undefined) { el.closest('.stage').classList.toggle('open'); return; }
  if (d.start) { S.track = { op: d.start, date: new Date().toISOString().slice(0, 10) }; S.checked = {}; store.save(); go('#/tracker'); return; }
  if (d.share !== undefined) { share(d.share, d.title || document.title); return; }
  if (d.pick) { window._sel = Object.assign(window._sel || {}, { op: d.pick, date: document.getElementById('opdate')?.value }); window._replace = true; route(); return; }
  if (d.begin !== undefined) { const s = window._sel || {}; if (!s.op) return; S.track = { op: s.op, date: document.getElementById('opdate').value || new Date().toISOString().slice(0, 10) }; S.checked = {}; store.save(); window._sel = null; route(); return; }
  if (d.reset !== undefined) { S.track = null; S.checked = {}; store.save(); route(); return; }
  if (d.resetquiz !== undefined) { S.quizBest = 0; store.save(); window._replace = true; route(); return; }
  if (d.task) { S.checked[d.task] ? delete S.checked[d.task] : (S.checked[d.task] = true); store.save(); el.classList.toggle('on'); window._replace = true; setTimeout(route, 350); return; }
  if (d.set) { const [k, v] = d.set.split(':'); S[k] = k === 'scale' ? +v : v; store.save(); applySettings(); window._replace = true; route(); return; }
  if (d.toggle) { S[d.toggle] = !S[d.toggle]; store.save(); applySettings(); window._replace = true; route(); return; }
  if (d.ans) { const k = +d.ans; Q.answered = k; if (k === D.quiz[Q.i].correct) Q.score++; window._replace = true; route(); return; }
  if (d.next !== undefined) { Q.i++; Q.answered = null; if (Q.i >= D.quiz.length && Q.score > S.quizBest) { S.quizBest = Q.score; store.save(); } route(); return; }
  if (d.quizRestart !== undefined) { Q = { i: 0, score: 0, answered: null }; route(); return; }
  if (d.flip !== undefined) { el.classList.toggle('on'); return; }
  if (d.href) { if (d.replace !== undefined) { window._replace = true; history.replaceState(null, '', d.href); route(); } else go(d.href); }
});
document.addEventListener('input', e => {
  if (e.target.id === 'name') { S.name = e.target.value; store.save(); }
  if (B && e.target.id === 'bk-name') { B.name = e.target.value; refreshSend(); }
  if (B && e.target.id === 'bk-phone') { B.phone = e.target.value.replace(/[^\d+\-() ]/g, ''); refreshSend(); }
  if (B && e.target.id === 'bk-comment') { B.comment = e.target.value; }
  if (B && e.target.id === 'bk-consent') { B.consent = e.target.checked; refreshSend(); }
  if (['pain', 'sw', 'bl'].includes(e.target.id)) updateVerdict();
  if (e.target.id === 'opdate') { window._sel = Object.assign(window._sel || {}, { date: e.target.value }); }
});
window.addEventListener('hashchange', route);
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => { applySettings(); });

// ————————————————— Старт —————————————————
applySettings();
buildNav();
fetch('version.json', { cache: 'no-store' }).then(r => r.json()).then(v => { APK = { url: v.apk, name: v.versionName }; if (D) route(); }).catch(() => {});
fetch('data.json').then(r => r.json()).then(d => { D = d; route(); document.getElementById('splash')?.classList.add('gone'); });
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});

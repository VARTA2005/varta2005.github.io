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
  vol: 'M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0014 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z',
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
  if (!isStandalone()) slides.push({ tag: 'ПРИЛОЖЕНИЕ', title: 'Установите «Авалон» на телефон', sub: 'Значок на экране, открывается как приложение, работает без интернета', facts: ['iPhone и Android', 'Windows и Mac', 'Бесплатно, без магазина'], cta: 'Как установить', g: 'teal', art: 'Phone', href: '#/install' });
  slides.push({ tag: 'ОТЗЫВ', title: 'Оцените клинику «Авалон»', sub: 'Отзыв на Яндексе, 2ГИС или ПроДокторов — за 1 минуту', facts: D.reviews.map(r => `${r.name} ★ ${r.rating}`), cta: 'Оставить отзыв', g: 'sun', art: 'Heart', href: '#/reviews' });
  slides.push({ tag: 'ПАМЯТКА', title: 'После удаления зуба', sub: 'Что можно и нельзя — по дням, с картинками', facts: ['Тампон 15–20 минут', 'Холод — первые сутки', 'Не полоскать в 1-й день'], cta: 'Открыть', g: 'lilac', art: 'Tooth', href: '#/guide/extraction' });
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

    ${section('Памятки после лечения', '#/guides')}
    <p class="pad small muted" style="margin-bottom:2px">Выберите раздел и свою процедуру — что можно, что нельзя и что делать по дням</p>
    ${secChips()}
    <div class="grid pad" style="--cols:2;--cols-m:4;--cols-l:4">${opsIn(SEC).map((o, i) => `
      <div class="card tile enter" style="--i:${i}" data-href="#/guide/${o.id}">${art(o.art, 82)}<h3>${esc(o.title)}</h3>
        ${rot([o.section && o.section !== 'Surgery' ? o.period : `≈ ${o.recoveryDays} дней восстановления`, `${o.dos.length} советов «можно»`, `${o.donts.length} запретов`, `${o.stages.length} этапа по дням`], 2800, i * 350)}</div>`).join('')}</div>

    ${howToRow(D.howtos || [])}
    ${prepSection()}

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
// ————————————————— Разделы памяток —————————————————
let SEC = 'Surgery';
const opsIn = sec => D.operations.filter(o => (o.section || 'Surgery') === sec);
function secChips() {
  const list = D.sections || [{ id: 'Surgery', title: 'Хирургия' }];
  return `<div class="hrow secchips">${list.map(s => `<button class="secchip ${s.id === SEC ? 'on' : ''}" data-sec="${s.id}">${art(s.art, 30, 'nohalo')}<b>${esc(s.title)}</b><span>${opsIn(s.id).length}</span></button>`).join('')}</div>`;
}
const secShort = () => (D.sections || []).find(s => s.id === SEC)?.short || '';
const periodOf = o => o.period || `Восстановление ≈ ${o.recoveryDays} дней`;
function viewGuides() {
  return header(`<h1 class="enter">Памятки</h1><p class="enter" style="--i:1">Хирургия, терапия, ортопедия, гигиена, пародонтология и ортодонтия — что можно и что нельзя, по дням</p>`) +
  `<main class="wrap">${secChips()}<p class="pad small muted" style="margin:0 0 6px">${esc(secShort())}</p><div class="grid pad" style="--cols:2;--cols-m:3;--cols-l:4">${opsIn(SEC).map((o, i) => `
    <div class="card tile enter" style="--i:${i};min-height:236px" data-href="#/guide/${o.id}">${art(o.art, 118)}<h3 style="font-size:1rem">${esc(o.title)}</h3>
      <p class="small muted" style="flex:1">${esc(o.subtitle)}</p><span class="pill" style="align-self:flex-start;margin-top:6px">${esc(o.period && !(o.section === 'Surgery') ? o.period : `≈ ${o.recoveryDays} дней`)}</span></div>`).join('')}</div>
    ${SEC === 'Surgery' ? prepSection() : ''}<div class="spacer"></div></main>`;
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
          <div class="more"><div><p class="muted" style="margin:8px 0">${esc(s.whatHappens)}</p>${s.tasks.map(t => `<div class="check">${esc(t)}</div>`).join('')}</div></div></div></div>`).join('')}</div>` + careBlock(o) + ((hs) => howToRow(hs, 'Как правильно', `Для этой памятки — ${hs.length} из ${D.howtos.length}. Все инструкции — по кнопке «Все»`))((D.howtos || []).filter(h => h.ops.includes(o.id)));
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
  return header(`${backBtn()}<div class="row"><div style="flex:1"><div class="small" style="opacity:.75">${o.section && o.section !== 'Surgery' ? 'Памятка · ' + esc((D.sections.find(s => s.id === o.section) || {}).title || '') : 'Памятка после операции'}</div><h1>${esc(o.title)}</h1>
      <span class="pill glass" style="margin-top:6px">${esc(periodOf(o))}</span><div style="margin-top:10px">${listenBtn(`guide:${o.id}:${tab}`, `Слушать «${TABS[tab]}»`)}</div></div>${art(o.art, 130, 'white')}</div>
      <p style="margin-top:10px">${esc(o.about)}</p>`) +
  `<main class="wrap"><div class="tabs" style="--t:${tab}"><span class="ind" style="background:${TAB_COLORS[tab]}"></span>
      ${TABS.map((t, i) => `<button class="${i === tab ? 'on' : ''}" data-href="#/guide/${o.id}/${i}" data-replace>${t}</button>`).join('')}</div>
    <div class="view">${body}</div>
    <div class="disclaimer">Памятка носит информационный характер. Всегда следуйте индивидуальным рекомендациям вашего лечащего врача.</div>
    <div class="pad" style="display:grid;gap:12px">
      ${PREP_FOR[o.id] ? `<a class="btn grad-night" href="#/prep/${PREP_FOR[o.id]}">📋 Как подготовиться к операции</a>` : ''}
      <button class="btn grad-night" data-start="${o.id}">${svg('heart', 22)} ${o.section && o.section !== 'Surgery' ? 'Мне сегодня это сделали' : 'Мне сегодня сделали эту операцию'} — включить «Мой путь»</button>
      <button class="btn grad-teal" data-share="#/guide/${o.id}" data-title="Памятка: ${esc(o.title)}">${svg('share', 22)} Поделиться памяткой</button>
    </div><div style="height:40px"></div></main>`;
}
function careBlock(o) {
  const c = o.care || [], d = o.dates || [];
  return `<div class="pad" style="display:grid;gap:12px;margin-top:4px">
    ${c.length ? `<div class="box pale enter"><h3>💊 Уход и лекарства</h3><p class="small muted" style="margin:2px 0 6px">По памятке клиники «Авалон». Препараты — только те, что назначил ваш врач.</p>${c.map(x => `<div class="bullet" style="--c:var(--teal)">${esc(x)}</div>`).join('')}</div>` : ''}
    ${d.length ? `<div class="box sun enter" style="--i:1"><h3>📅 Важные сроки</h3>${d.map(x => `<div class="bullet" style="--c:var(--sun)">${esc(x)}</div>`).join('')}</div>` : ''}
    ${(o.prevention || []).length ? `<div class="box mint enter" style="--i:2"><h3>🛡 Профилактика</h3>${o.prevention.map(x => `<div class="bullet" style="--c:var(--mint)">${esc(x)}</div>`).join('')}</div>` : ''}</div>`;
}
function alarm(normal, red) {
  return `<div class="pad" style="display:grid;gap:12px;margin-top:8px">
    <div class="box mint enter"><h3>✅ Это нормально</h3>${normal.map(x => `<div class="bullet">${esc(x)}</div>`).join('')}</div>
    <div class="box coral enter" style="--i:1"><h3>⚠️ Срочно позвоните врачу, если:</h3>${red.map(x => `<div class="bullet" style="--c:var(--coral)">${esc(x)}</div>`).join('')}</div>
    <a class="btn grad-coral enter" style="--i:2" href="tel:${D.clinic.phoneRaw}">${svg('call', 22)} Позвонить в клинику</a></div>`;
}
function openTip(guideId, key) {
  const o = byId(D.operations, guideId); const [k, i] = key.split(':'); const t = o[k][+i]; const good = k === 'dos';
  sheet(`${art(t.art, 180)}<div style="display:flex;gap:8px;justify-content:center;align-items:center;flex-wrap:wrap"><span class="pill ${good ? 'mint' : 'coral'}">${good ? '✓ РЕКОМЕНДУЕТСЯ' : '✕ НЕЛЬЗЯ'}</span>${listenBtn(`tip:${guideId}:${k}.${i}`, 'Слушать', true)}</div>
    <h2 style="margin-top:12px">${esc(t.title)}</h2><b style="color:${good ? 'var(--mint)' : 'var(--coral)'}">${esc(t.short)}</b>
    <div class="box pale why"><b style="color:var(--teal-deep)">Почему это важно</b><p style="margin-top:6px">${esc(t.details)}</p></div>
    ${howToForTip(t.title) ? `<a class="btn grad-teal" style="margin-top:12px" href="#/howto/${howToForTip(t.title)}">▶ Показать, как правильно — по шагам</a>` : ''}`);
}
const howToForTip = title => [['Тампон', 'gauze'], ['Холод', 'ice'], ['Ванночки', 'bath'], ['Заживляющая паста', 'paste'], ['Чистить зубы', 'brush'], ['Гимнастика', 'jaw'], ['Чихать', 'sneeze'],
  ['Нить', 'floss'], ['Ирригатор', 'irrigator'], ['Мягкая щётка', 'brushing'], ['Осмотр', 'prevention'], ['Профгигиена', 'prevention'], ['Поддержка', 'prevention'], ['Контроль', 'prevention'],
  ['«Белая диета»', 'whitediet'], ['Меньше красящего', 'whitediet'], ['Ортодонтическая щётка', 'bracescare'], ['Воск', 'bracescare'], ['20–22 часа', 'aligners'], ['Почистить — и надеть', 'aligners'],
  ['Капа — от 12', 'aligners'], ['Футляр', 'aligners'], ['Чистить после еды', 'denturecare'], ['Крем для фиксации', 'denturefix'], ['Домашние капы', 'homewhite']].find(([p]) => title.startsWith(p))?.[1];
function sheet(html) {
  const bg = document.createElement('div'); bg.className = 'sheet-bg';
  const sh = document.createElement('div'); sh.className = 'sheet'; sh.innerHTML = `<div class="handle"></div>${html}`;
  document.body.append(bg, sh);
  requestAnimationFrame(() => { bg.classList.add('open'); sh.classList.add('open'); });
  const close = () => { if (SAY.id && SAY.id.startsWith('tip:')) stopSpeech(); bg.classList.remove('open'); sh.classList.remove('open'); setTimeout(() => { bg.remove(); sh.remove(); }, 400); };
  bg.onclick = close; sh.querySelector('.handle').onclick = close;
}

// ————————————————— Мой путь —————————————————
function viewTracker() {
  const o = S.track && byId(D.operations, S.track.op);
  if (!o) {
    const sel = window._sel || {};
    return header(`<div class="row"><div style="flex:1"><h1>Мой путь</h1><p>Персональный план восстановления по дням: чек-лист, этапы и самопроверка</p></div>${art('Calendar', 110, 'white')}</div>`, 'night') +
    `<main class="wrap">${section('1. Что вам сделали?')}${secChips()}
      <div class="grid pad" style="--cols:1;--cols-m:2;--cols-l:2">${opsIn(SEC).map((x, i) => `
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
    : caution ? ['sun', 'Понаблюдайте', bl >= 2 ? 'Прикусите стерильный марлевый тампон на 15–20 минут. Если кровь не остановится — звоните врачу.' : 'В первые дни это бывает. Холод, покой и лекарства по схеме. Если станет хуже — звоните.']
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
      <h1 style="margin-top:10px">${esc(a.title)}</h1><p>${esc(a.teaser)}</p><div style="margin-top:10px">${listenBtn('article:' + a.id, 'Слушать статью')}</div></div>${art(a.art, 120, 'white')}</div>`, 'night') +
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
        <div class="box pale" style="margin-top:12px">Так будет выглядеть текст памяток: держите тампон 15–20 минут.</div></div>
      ${TTS ? `<div class="group"><h3>🔊 Чтение вслух</h3><p class="small muted" style="margin-bottom:10px">В памятках, подготовке и статьях есть кнопка «Слушать» — телефон прочитает текст голосом.</p>
        <div class="seg">${RATES.map(([v, l]) => `<button class="${(S.rate || 1) == v ? 'on' : ''}" data-set="rate:${v}">${l}</button>`).join('')}</div>
        <div style="margin-top:12px">${listenBtn('test', 'Проверить голос', true)}</div></div>` : ''}
    </div><div>
      <div class="group"><h3>✨ Анимации и карточки</h3>${tog('anim', 'Живые анимации', 'Движущиеся картинки и плавные переходы')}${tog('rotate', 'Автосмена карточек', 'Баннеры и карточки сами листаются и меняют информацию')}${tog('tips', 'Совет дня', 'Показывать полезные советы на главной')}</div>
      <div class="group"><h3>🗂 Данные</h3>
        <div style="display:flex;align-items:center;gap:8px;margin:6px 0"><div style="flex:1"><b>Сбросить «Мой путь»</b><div class="small muted">${S.track ? 'Операция: ' + esc(byId(D.operations, S.track.op)?.title) : 'Восстановление не отслеживается'}</div></div><button class="pill ${S.track ? 'coral' : ''}" data-reset>Сбросить</button></div>
        <div style="display:flex;align-items:center;gap:8px;margin:6px 0"><div style="flex:1"><b>Сбросить рекорд викторины</b><div class="small muted">${S.quizBest ? `Сейчас: ${S.quizBest}/10` : 'Рекорда пока нет'}</div></div><button class="pill ${S.quizBest ? 'coral' : ''}" data-resetquiz>Сбросить</button></div></div>
      <div class="group"><h3>📲 Приложение</h3>
        <p class="small muted">${isStandalone() ? '✓ «Авалон» установлен как приложение.' : 'Установите сайт как приложение: значок на экране, работа без интернета.'}</p>
        ${isStandalone() ? '' : `<a class="btn grad-mint" style="margin-top:10px" href="#/install">📲 Как установить — инструкция</a>`}
        ${isAndroid ? `<a class="btn grad-teal" style="margin-top:10px" href="${APK.url}" download>${svg('android')} Скачать приложение для Android ${APK.name}</a>` : `<a href="${APK.url}" class="small" download>Скачать APK для Android ${APK.name}</a>`}
</div></div>
      <div class="group"><img src="img/${document.documentElement.dataset.theme === 'dark' ? 'logo-white' : 'logo'}.svg" style="width:190px" alt=""><p><b>Помощник пациента · веб-версия</b></p>
        <p class="small muted">${esc(D.clinic.tagline)}<br>${esc(D.clinic.address)}<br>${esc(D.clinic.phone)}</p><p class="small muted" style="margin-top:8px">Информация в приложении не заменяет консультацию врача.</p><p class="small"><a href="privacy.html" target="_blank">Политика конфиденциальности</a></p></div>
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


// ————————————————— Отзывы —————————————————
const stars = r => Array.from({ length: 5 }, (_, i) => `<span style="color:${r >= i + .5 ? 'var(--sun)' : 'color-mix(in srgb, var(--sun) 30%, transparent)'}">★</span>`).join('');
function viewReviews() {
  return header(`${backBtn()}<div class="row"><div style="flex:1"><h1>Оцените клинику «Авалон»</h1><p>Ваш отзыв помогает нам становиться лучше, а другим пациентам — выбрать врача</p>
      <div style="margin-top:10px;font-size:1.3rem;font-weight:800">4.8–5.0 <span style="letter-spacing:2px">★★★★★</span></div></div>${art('Heart', 120, 'white')}</div>`, 'sun') +
  `<main class="wrap pad" style="max-width:900px"><h3 style="margin:6px 0 10px">Выберите, где вам удобно оставить отзыв:</h3>
    <div class="grid" style="--cols:1;--cols-m:2;--cols-l:3">${D.reviews.map((r, i) => `
      <a class="card enter" style="--i:${i};display:flex;gap:12px;align-items:center;padding:14px;color:var(--ink)" href="${r.url}" target="_blank" rel="noopener">
        <span style="width:48px;height:48px;border-radius:50%;background:${r.color};color:#fff;display:grid;place-items:center;font-weight:700;font-size:1.3rem;flex:none">${esc(r.letter)}</span>
        <span style="flex:1"><b>${esc(r.name)}</b><br><b>${r.rating}</b> <span style="letter-spacing:1px">${stars(+r.rating)}</span></span>
        <span class="pill" style="background:var(--teal);color:#fff">Отзыв</span></a>`).join('')}</div>
    <p style="margin-top:14px"><a href="${D.reviewsPage}" target="_blank" rel="noopener">Все отзывы пациентов — на сайте клиники →</a></p>
    <p class="small muted">Рейтинги указаны по данным сайта клиники и могут меняться.</p><div style="height:40px"></div></main>`;
}


// ————————————————— Перед операцией: подготовка, седация и наркоз —————————————————
const PREP_FOR = { extraction: 'prep-extraction', wisdom: 'prep-extraction', resection: 'prep-extraction', cyst: 'prep-extraction', gum: 'prep-extraction', implant: 'prep-implant', bonegraft: 'prep-implant', sinus: 'prep-sinus' };
// ————————————————— Как правильно: анимированные инструкции —————————————————
const sceneImg = (name, cls = '') => `<img class="scene ${cls}" src="art/${name}${S.anim ? '' : '_s'}.webp" alt="" loading="lazy" decoding="async">`;
const stepsWord = n => plural(n, 'шаг', 'шага', 'шагов');
function howToCard(h, i = 0) {
  return `<a class="card htcard enter" style="--i:${i}" href="#/howto/${h.id}">${sceneImg(h.cover)}<span class="pill dark">${h.steps.length} ${stepsWord(h.steps.length)}</span>
    <div style="padding:10px 12px 12px"><b>${esc(h.title)}</b><div class="small muted">${esc(h.subtitle)}</div></div></a>`;
}
function howToRow(list, title = 'Как правильно', sub = 'Анимированные пошаговые инструкции с озвучкой') {
  if (!list.length) return '';
  return section(title, '#/howto', `Все ${(D.howtos || []).length}`) + (sub ? `<p class="small muted wrap" style="padding:0 16px">${sub}</p>` : '') +
    `<div class="hrow">${list.map(howToCard).join('')}</div>`;
}
function viewHowTos() {
  return header(`${backBtn()}<h1>Как правильно</h1><p>Покажем по шагам: тампон, холод, ванночки, паста на швы, чистка зубов, нить, ирригатор, брекеты, капы, протез, отбеливание и профилактика</p>`) +
    `<main class="wrap pad"><div class="grid" style="--cols:2;--cols-m:3;--cols-l:4">${D.howtos.map(howToCard).join('')}</div>
    <div class="disclaimer">Информация носит справочный характер. Всегда следуйте рекомендациям вашего лечащего врача.</div><div class="spacer"></div></main>`;
}
const HT = { auto: false };
function viewHowTo(id, stepArg) {
  const h = (D.howtos || []).find(x => x.id === id); if (!h) return viewHowTos();
  const step = Math.max(0, Math.min(h.steps.length - 1, +stepArg || 0)); const st = h.steps[step]; const last = step === h.steps.length - 1;
  const fmt = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const timer = st.timer ? `<div class="httimer" id="httimer" data-total="${st.timer}" data-left="${st.timer}">
      <div class="ring" style="--k:1"><b id="httime">${fmt(st.timer)}</b></div>
      <div style="flex:1"><b>⏱ ${esc(st.timerLabel)}</b><div class="small muted">${st.timer >= 60 ? `Таймер на ${st.timer / 60} мин — не нужно смотреть на часы` : `Таймер на ${st.timer} секунд`}</div>
      <div style="display:flex;gap:8px;margin-top:8px"><button class="pill tealbtn" data-httimer>▶ Запустить</button><button class="pill" data-htreset>↺ Сначала</button></div></div></div>` : '';
  return header(`${backBtn()}<div class="small" style="opacity:.75">Как правильно</div><h1>${esc(h.title)}</h1><p>${esc(h.subtitle)}</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">${listenBtn('howto:' + h.id, 'Слушать всё')}
      ${h.steps.length > 1 ? `<button class="listen ${HT.auto ? 'light' : ''}" data-htauto>${HT.auto ? '⏸ Пауза' : '▶ Показать подряд'}</button>` : ''}</div>`) +
  `<main class="wrap pad" style="max-width:1100px">
    <div class="stepbar">${h.steps.map((_, i) => `<button class="${i <= step ? 'on' : ''}" data-href="#/howto/${h.id}/${i}" data-replace aria-label="Шаг ${i + 1}"></button>`).join('')}</div>
    <div class="htgrid">
      <div class="stage view">${sceneImg(st.scene)}<span class="pill dark">Шаг ${step + 1} из ${h.steps.length}</span></div>
      <div class="view"><h2 style="margin-top:4px">${esc(st.title)}</h2><p style="font-size:1.05rem;margin:8px 0 12px">${esc(st.text)}</p>
        ${listenBtn(`howtostep:${h.id}:${step}`, 'Слушать шаг', true)}
        <div class="htnav"><button class="btn ghost" ${step ? `data-href="#/howto/${h.id}/${step - 1}" data-replace` : 'disabled'}>← Назад</button>
          ${last ? `<button class="btn grad-mint" data-back>Готово ✓</button>` : `<button class="btn grad-teal" data-href="#/howto/${h.id}/${step + 1}" data-replace>Дальше →</button>`}</div>
        ${timer}</div>
    </div>
    <h3 style="margin:18px 0 6px">Все шаги</h3>
    ${h.steps.map((x, i) => `<button class="htstep ${i === step ? 'on' : ''}" data-href="#/howto/${h.id}/${i}" data-replace><span class="num">${i + 1}</span><span><b>${esc(x.title)}</b><span class="small muted" style="display:block">${esc(x.text)}</span></span></button>`).join('')}
    <div class="disclaimer">Информация носит справочный характер. Всегда следуйте рекомендациям вашего лечащего врача.</div></main>` +
  howToRow(D.howtos.filter(x => x.id !== h.id), 'Ещё инструкции', null) + `<div class="spacer"></div>`;
}
function startHowTo(id, step) {
  const h = (D.howtos || []).find(x => x.id === id); if (!h) return;
  if (HT.auto) timers.push(setTimeout(() => {
    if (step < h.steps.length - 1) { window._replace = true; history.replaceState(null, '', `#/howto/${id}/${step + 1}`); route(); } else { HT.auto = false; window._replace = true; route(); }
  }, 7000));
}
function tickTimer(run) {
  const el = document.getElementById('httimer'); if (!el) return;
  if (el._iv) { clearInterval(el._iv); el._iv = null; }
  const btn = el.querySelector('[data-httimer]');
  const draw = () => { const left = +el.dataset.left, total = +el.dataset.total;
    el.querySelector('#httime').textContent = left ? `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}` : '✓';
    el.querySelector('.ring').style.setProperty('--k', left / total); el.classList.toggle('done', !left); };
  if (run) {
    if (+el.dataset.left === 0) el.dataset.left = el.dataset.total;
    el._iv = setInterval(() => { el.dataset.left = Math.max(0, +el.dataset.left - 1); draw(); if (+el.dataset.left === 0) { clearInterval(el._iv); el._iv = null; btn.textContent = '▶ Ещё раз'; navigator.vibrate?.(300); } }, 1000);
    timers.push(el._iv); btn.textContent = '⏸ Пауза';
  } else btn.textContent = +el.dataset.left < +el.dataset.total ? '▶ Продолжить' : '▶ Запустить';
  draw();
}
function prepSection() {
  return `${section('Перед операцией')}
    <p class="pad small muted" style="margin-bottom:8px">Как подготовиться, что взять с собой и что важно сказать врачу</p>
    <div class="pad"><div class="card grad-lilac" style="display:flex;gap:12px;align-items:center;padding:16px" data-href="#/anesthesia">
      <div style="flex:1"><span class="pill glass">БЕЗ БОЛИ И СТРАХА</span><h3 style="margin:8px 0 4px;font-size:1.2rem">Лечение во сне: седация и наркоз</h3>
      ${rot(['Чем седация отличается от наркоза', 'Как подготовиться: голод 6 часов', 'Анестезиолог следит за вами всё время', 'Кому подходит и кому нельзя'], 3000)}</div>${art('Drip', 96, 'white')}</div></div>
    <div class="grid pad" style="--cols:2;--cols-m:4;--cols-l:4;margin-top:12px">${D.prep.map((p, i) => `
      <div class="card ${p.id === 'prep-sedation' ? 'grad-lilac' : 'grad-night'} enter" style="--i:${i};padding:14px;min-height:150px;color:#fff" data-href="#/prep/${p.id}">
        <span style="position:absolute;top:-6px;right:-12px">${art(p.art, 80, 'white')}</span>
        <span class="pill glass">ПОДГОТОВКА</span><h3 style="margin-top:44px;font-size:.95rem">${esc(p.title)}</h3><div class="small" style="opacity:.85">${esc(p.subtitle)}</div></div>`).join('')}</div>`;
}
function viewPrep(id) {
  const p = D.prep.find(x => x.id === id); if (!p) return viewGuides();
  S.prepChecked = S.prepChecked || {}; const ch = S.prepChecked[id] || {};
  const total = p.steps.reduce((n, s) => n + s.items.length, 0) + p.bring.length; const done = Object.keys(ch).length;
  const row = (k, t) => `<button class="taskrow ${ch[k] ? 'on' : ''}" style="background:transparent;padding:6px 0" data-prep="${esc(id)}|${esc(k)}"><span class="cb"><i>✓</i></span><span>${esc(t)}</span></button>`;
  const after = p.afterGuide && byId(D.operations, p.afterGuide);
  return header(`${backBtn()}<div class="row"><div style="flex:1"><div class="small" style="opacity:.75">Как подготовиться</div><h1>${esc(p.title)}</h1>
      <span class="pill glass" style="margin-top:6px">✓ Готово: ${done} из ${total}</span><div style="margin-top:10px">${listenBtn('prep:' + p.id)}</div></div>${art(p.art, 130, 'white')}</div><p style="margin-top:10px">${esc(p.intro)}</p>`, p.id === 'prep-sedation' ? 'lilac' : 'night') +
  `<main class="wrap pad" style="max-width:900px;display:grid;gap:12px">
    <p class="small muted">ℹ️ Отмечайте выполненное — так ничего не забудете</p>
    ${p.steps.map((st, si) => `<div class="stage open enter" style="--i:${si}"><div class="num">${art(st.art, 44, 'nohalo')}${si < p.steps.length - 1 ? '<i></i>' : ''}</div>
      <div class="card flat" style="flex:1;padding:14px;margin-bottom:0"><div class="period">${esc(st.period)}</div><b>${esc(st.title)}</b>
      ${st.items.map(it => row('s' + si + ':' + it, it)).join('')}</div></div>`).join('')}
    <div class="box pale"><h3>🧳 Взять с собой</h3>${p.bring.map(it => row('b:' + it, it)).join('')}</div>
    <div class="box sun"><h3>🛒 Купить заранее</h3><div class="chips">${p.buy.map(x => `<span class="chip">${esc(x)}</span>`).join('')}</div></div>
    <div class="box" style="background:var(--card)"><h3>Обязательно сообщите врачу</h3>${p.tell.map(x => `<div class="bullet" style="--c:var(--teal)">${esc(x)}</div>`).join('')}</div>
    <div class="box coral"><h3>⚠️ Позвоните и обсудите перенос, если:</h3>${p.postpone.map(x => `<div class="bullet" style="--c:var(--coral)">${esc(x)}</div>`).join('')}</div>
    <a class="card grad-lilac" style="display:flex;gap:12px;align-items:center;padding:16px;color:#fff" href="#/anesthesia">${art('Monitor', 56, 'white')}<div><b>${p.id === 'prep-sedation' ? 'Всё о седации и наркозе' : 'Лечение во сне: седация и наркоз'}</b><div class="small" style="opacity:.85">Виды, как проходит, что будет после, вопросы</div></div></a>
    ${after ? `<a class="card grad-teal" style="display:flex;gap:12px;align-items:center;padding:16px;color:#fff" href="#/guide/${after.id}">${art(after.art, 56, 'white')}<div><b>Что делать после операции</b><div class="small" style="opacity:.85">Памятка: ${esc(after.title)}</div></div></a>` : ''}
    <p class="small muted">Информация носит справочный характер. Точный план подготовки даст ваш врач и анестезиолог клиники.</p><div style="height:30px"></div></main>`;
}
const AN_TABS = ['Виды', 'Кому', 'Процесс', 'После', 'Вопросы'];
function viewAnesthesia(tab = 0) {
  const A = D.anesthesia; tab = Math.max(0, Math.min(4, +tab || 0));
  const box = (cls, title, items, c) => `<div class="box ${cls}"><h3>${title}</h3>${items.map(x => `<div class="bullet" style="--c:${c}">${esc(x)}</div>`).join('')}</div>`;
  let body;
  if (tab === 0) body = `<div class="grid" style="--cols:1;--cols-m:3;--cols-l:3">${A.types.map((t, i) => `<div class="card flat enter" style="--i:${i};padding:16px">
      <div style="display:flex;gap:10px;align-items:center">${art(t.art, 56)}<div><b>${esc(t.name)}</b><div class="small muted">${esc(t.short)}</div></div></div>
      <div class="small muted" style="margin:10px 0 4px">Глубина сна ${[0, 1, 2].map(k => `<span style="display:inline-block;width:26px;height:8px;border-radius:4px;margin-left:4px;background:${k < t.depth ? 'var(--lilac)' : 'var(--lilac-pale)'}"></span>`).join('')}</div>
      <p style="font-size:.9rem">${esc(t.how)}</p>
      <p class="small" style="margin-top:6px"><b style="color:var(--lilac)">Дыхание:</b> ${esc(t.breathing)}<br><b style="color:var(--lilac)">Когда:</b> ${esc(t.usedFor)}<br><b style="color:var(--lilac)">После:</b> ${esc(t.wakeUp)}</p></div>`).join('')}</div>
    <p class="small muted" style="margin-top:8px">Вариант анестезии выбирает анестезиолог вместе со стоматологом — по объёму лечения и состоянию здоровья.</p>`;
  else if (tab === 1) body = box('mint', '✅ Кому подходит лечение во сне', A.indications, 'var(--mint)') + box('coral', '⚠️ Когда нельзя (противопоказания)', A.contraindications, 'var(--coral)') +
    `<p class="small muted">Допуск даёт анестезиолог-реаниматолог клиники после консультации и обследования.</p>`;
  else if (tab === 2) body = A.process.map((x, i) => `<div class="card flat enter" style="--i:${i};display:flex;gap:12px;align-items:center;padding:14px;margin:6px 0"><span class="pill" style="background:var(--lilac);color:#fff">${i + 1}</span><span>${esc(x)}</span></div>`).join('') +
    `<a class="card grad-lilac" style="display:flex;gap:12px;align-items:center;padding:16px;margin-top:10px;color:#fff" href="#/prep/prep-sedation">${art('NoFood', 56, 'white')}<div><b>Как подготовиться к лечению во сне</b><div class="small" style="opacity:.85">Чек-лист: анализы, голод 6 часов, сопровождающий</div></div></a>`;
  else if (tab === 3) body = box('mint', '✅ После пробуждения', A.after, 'var(--mint)') + box('coral', '⚠️ Срочно позвоните врачу, если:', A.alarms, 'var(--coral)') +
    `<a class="btn grad-coral" href="tel:${D.clinic.phoneRaw}">${svg('call', 22)} Позвонить в клинику</a>`;
  else body = A.faq.map((f, i) => `<details class="card flat enter" style="--i:${i};padding:14px;margin:6px 0"><summary style="font-weight:600;cursor:pointer">${esc(f.q)}</summary><p class="muted" style="margin-top:8px">${esc(f.a)}</p></details>`).join('');
  return header(`${backBtn()}<div class="row"><div style="flex:1"><div class="small" style="opacity:.8">Без боли и страха</div><h1>${esc(A.title)}</h1><div style="margin-top:10px">${listenBtn('anesthesia:' + tab, `Слушать «${AN_TABS[tab]}»`)}</div></div>${art('Monitor', 130, 'white')}</div><p style="margin-top:10px">${esc(A.intro)}</p>`, 'lilac') +
  `<main class="wrap" style="max-width:960px"><div class="tabs" style="--t:${tab}"><span class="ind" style="background:var(--lilac)"></span>
      ${AN_TABS.map((t, i) => `<button class="${i === tab ? 'on' : ''}" data-href="#/anesthesia/${i}" data-replace>${t}</button>`).join('')}</div>
    <div class="view pad" style="display:grid;gap:12px;margin-top:12px">${body}</div>
    ${section('Что можно сделать во сне в «Авалоне»')}
    <div class="pad"><div class="group" style="padding:6px 14px">${A.services.map(x => `<div style="display:flex;gap:10px;padding:9px 0;border-bottom:1px solid var(--outline)"><span style="flex:1">${esc(x.name)}</span><b style="color:var(--lilac)">${esc(x.price)}</b></div>`).join('')}</div>
    <p class="small muted">Цены — по данным сайта клиники; итоговую стоимость определяет врач после консультации.</p>
    <a class="btn grad-teal" style="margin-top:10px" href="#/booking/service/${encodeURIComponent('Лечение во сне (седация / наркоз)')}">Записаться на консультацию</a></div><div style="height:40px"></div></main>`;
}


// ————————————————— Чтение вслух (синтезатор речи браузера) —————————————————
const TTS = window.speechSynthesis && window.SpeechSynthesisUtterance ? speechSynthesis : null;
const SAY = { id: null, gen: 0 };
const RATES = [[.8, 'Медленно'], [1, 'Обычно'], [1.2, 'Быстро']];
const OUTRO = 'Памятка носит информационный характер. Всегда следуйте рекомендациям вашего лечащего врача.';
const sayList = a => a.map(x => String(x).replace(/[.\s]+$/, '')).join('. ') + '.';
const ruVoice = () => { const v = TTS.getVoices(); return v.find(x => /^ru[-_]RU/i.test(x.lang) && x.localService) || v.find(x => /^ru/i.test(x.lang)); };
function speechFor(id) {
  const [k, a, b] = id.split(':'); const out = [];
  if (k === 'guide') {
    const o = byId(D.operations, a); const t = +b; out.push(o.title + '.');
    if (t === 0) { out.push('Этапы восстановления.'); o.stages.forEach((st, i) => { out.push(`Этап ${i + 1}. ${st.period}. ${st.title}. ${st.whatHappens}`); if (st.tasks.length) out.push('Что делать: ' + sayList(st.tasks)); });
      if ((o.care || []).length) out.push('Уход и лекарства. Препараты — только те, что назначил ваш врач. ' + sayList(o.care));
      if ((o.dates || []).length) out.push('Важные сроки: ' + sayList(o.dates));
      if ((o.prevention || []).length) out.push('Профилактика: ' + sayList(o.prevention)); }
    else if (t === 1 || t === 2) { out.push(t === 1 ? 'Что можно и нужно делать.' : 'Чего делать нельзя.'); (t === 1 ? o.dos : o.donts).forEach(x => out.push(`${x.title}. ${x.short.replace(/\.$/, '')}. ${x.details}`)); }
    else if (t === 3) out.push('Питание. Можно есть: ' + sayList(o.foodYes), 'Лучше исключить: ' + sayList(o.foodNo), 'Еда — тёплая, не горячая. Жуйте на здоровой стороне.');
    else out.push('Это нормально: ' + sayList(o.normal), 'Срочно позвоните врачу, если: ' + sayList(o.redFlags), 'Телефон клиники: 8 812 501 75 01.');
    out.push(OUTRO);
  } else if (k === 'tip') {
    const o = byId(D.operations, a); const [kk, i] = b.split('.'); const x = o[kk][+i];
    out.push(`${x.title}. ${x.short.replace(/\.$/, '')}. ${x.details}`);
  } else if (k === 'prep') {
    const p = D.prep.find(x => x.id === a); out.push(`Как подготовиться. ${p.title}. ${p.intro}`);
    p.steps.forEach(st => out.push(`${st.period}. ${st.title}. ` + sayList(st.items)));
    out.push('Взять с собой: ' + sayList(p.bring), 'Купить заранее: ' + sayList(p.buy), 'Обязательно сообщите врачу: ' + sayList(p.tell), 'Когда операцию лучше перенести: ' + sayList(p.postpone), OUTRO);
  } else if (k === 'anesthesia') {
    const A = D.anesthesia; const t = +a;
    if (t === 0) { out.push(`${A.title}. ${A.intro}`); A.types.forEach(x => out.push(`${x.name}. ${x.short}. ${x.how} Дыхание: ${x.breathing}. Когда применяют: ${x.usedFor}. Пробуждение: ${x.wakeUp}.`)); }
    else if (t === 1) out.push('Кому подходит лечение во сне: ' + sayList(A.indications), 'Противопоказания: ' + sayList(A.contraindications));
    else if (t === 2) out.push('Как проходит лечение во сне. ' + sayList(A.process.map((x, i) => `Шаг ${i + 1}. ${x}`)));
    else if (t === 3) out.push('После седации или наркоза: ' + sayList(A.after), 'Срочно позвоните в клинику, если: ' + sayList(A.alarms));
    else { out.push('Частые вопросы.'); A.faq.forEach(f => out.push(`${f.q} ${f.a}`)); }
    out.push('Вариант анестезии подбирает анестезиолог. Следуйте рекомендациям вашего врача.');
  } else if (k === 'article') {
    const x = byId(D.articles, a); out.push(`${x.title}. ${x.teaser}`); x.sections.forEach(s => out.push(`${s.h}. ${s.b}`));
  } else if (k === 'howto') {
    const h = D.howtos.find(x => x.id === a); out.push(`${h.title}. ${h.subtitle}.`); h.steps.forEach((x, i) => out.push(`Шаг ${i + 1}. ${x.title}. ${x.text}`)); out.push('Следуйте рекомендациям вашего лечащего врача.');
  } else if (k === 'howtostep') {
    const x = D.howtos.find(h => h.id === a).steps[+b]; out.push(`Шаг ${+b + 1}. ${x.title}. ${x.text}`);
  } else out.push('Здравствуйте! Так звучит чтение памяток. Держите марлевый тампон пятнадцать–двадцать минут.');
  return out;
}
/** Кнопка «Слушать» / «Стоп»: light — на светлом фоне. */
function listenBtn(id, label = 'Слушать', light = false) {
  if (!TTS) return '';
  const on = SAY.id === id;
  return `<button class="listen ${light ? 'light' : ''} ${on ? 'on' : ''}" data-listen="${esc(id)}" data-label="${esc(label)}" aria-label="${on ? 'Остановить чтение' : 'Прочитать вслух'}">${listenInner(on, label)}</button>`;
}
const listenInner = (on, label) => on ? `<span class="bars"><i></i><i></i><i></i><i></i></span><span>Стоп</span>` : `${svg('vol', 20)}<span>${esc(label)}</span>`;
function refreshListen() {
  document.querySelectorAll('[data-listen]').forEach(b => { const on = b.dataset.listen === SAY.id; b.classList.toggle('on', on); b.innerHTML = listenInner(on, b.dataset.label); });
}
function stopSpeech() { if (!TTS) return; SAY.gen++; SAY.id = null; TTS.cancel(); refreshListen(); }
function speak(id) {
  if (!TTS) { toast('Этот браузер не умеет читать вслух'); return; }
  TTS.cancel(); const g = ++SAY.gen; SAY.id = id; refreshListen();
  const voice = ruVoice();
  if (!voice && TTS.getVoices().length) toast('Русский голос не найден — установите его в настройках устройства');
  // Режем на предложения: Chrome обрывает длинные фразы.
  const chunks = speechFor(id).flatMap(t => t.match(/[^.!?…]+[.!?…]*\s*/g) || [t]).map(t => t.trim().replace(/([!?…:])\./g, '$1')).filter(Boolean);
  chunks.forEach((t, i) => {
    const u = new SpeechSynthesisUtterance(t); u.lang = 'ru-RU'; if (voice) u.voice = voice; u.rate = S.rate || 1;
    if (i === chunks.length - 1) u.onend = () => { if (g === SAY.gen) { SAY.id = null; refreshListen(); } };
    u.onerror = e => { if (g === SAY.gen && e.error !== 'interrupted' && e.error !== 'canceled') { SAY.id = null; refreshListen(); } };
    TTS.speak(u);
  });
}
if (TTS) { TTS.getVoices(); TTS.addEventListener?.('voiceschanged', () => {}); }

// ————————————————— Установка сайта как приложения —————————————————
let installPrompt = null;   // событие браузера «можно установить» (Chrome, Edge, Samsung Internet)
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installPrompt = e; if (location.hash.startsWith('#/install')) { window._replace = true; route(); } });
window.addEventListener('appinstalled', () => { installPrompt = null; toast('Приложение установлено ✓'); });
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
function detectPlatform() {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 1;
  if (/Android/i.test(ua)) return 0;
  if (/Mac/i.test(ua)) return 3;
  return 2;
}
const INSTALL = [
  { name: 'Android', icon: 'android', steps: [
    ['Откройте сайт в Chrome', 'Адрес: varta2005.github.io. Подойдёт и Samsung Internet или Яндекс Браузер.'],
    ['Нажмите «Установить»', 'Если вверху этой страницы есть зелёная кнопка «Установить в одно нажатие» — нажмите её. Если нет: меню ⋮ (три точки справа вверху) → «Добавить на главный экран» или «Установить приложение».'],
    ['Подтвердите', 'Нажмите «Установить» или «Добавить» в окне браузера.'],
    ['Готово', 'На рабочем столе появится значок «Авалон». Он открывается как обычное приложение, во весь экран и без интернета.'],
  ], extra: 'Можно установить и полноценное Android-приложение (APK) — кнопка внизу.' },
  { name: 'iPhone / iPad', icon: 'share', steps: [
    ['Откройте сайт в Safari', 'Адрес: varta2005.github.io. На iOS 16.4 и новее подойдёт и Chrome — через ту же кнопку «Поделиться».'],
    ['Нажмите «Поделиться»', 'Квадрат со стрелкой вверх: на iPhone — внизу экрана, на iPad — вверху справа.'],
    ['«На экран „Домой“»', 'Пролистайте список действий вниз и выберите «На экран „Домой“».'],
    ['Нажмите «Добавить»', 'Значок «Авалон» появится рядом с другими приложениями и будет открываться во весь экран.'],
  ] },
  { name: 'Windows', icon: 'doc', steps: [
    ['Откройте сайт в Edge или Chrome', 'Адрес: varta2005.github.io.'],
    ['Установите', 'Если на этой странице есть кнопка «Установить в одно нажатие» — нажмите её. Или: Edge — меню «…» → «Приложения» → «Установить этот сайт как приложение»; Chrome — значок установки (монитор со стрелкой) справа в адресной строке.'],
    ['Подтвердите «Установить»', 'Приложение откроется в отдельном окне.'],
    ['Запускайте из «Пуска»', '«Авалон» появится в меню «Пуск»; его можно закрепить на панели задач.'],
  ] },
  { name: 'Mac', icon: 'clinic', steps: [
    ['Откройте сайт в Safari или Chrome', 'Адрес: varta2005.github.io.'],
    ['Safari: «Файл» → «Добавить в Dock»', 'Работает в macOS Sonoma и новее. Нажмите «Добавить».'],
    ['Chrome: значок установки', 'Справа в адресной строке (монитор со стрелкой) → «Установить». Или кнопка «Установить в одно нажатие» на этой странице.'],
    ['Запускайте из Dock или Launchpad', '«Авалон» откроется в отдельном окне, как обычная программа.'],
  ] },
];
function viewInstall(tab) {
  const t = tab === undefined || tab === '' ? detectPlatform() : Math.max(0, Math.min(3, +tab));
  const P = INSTALL[t];
  const done = isStandalone();
  return header(`${backBtn()}<div class="row"><div style="flex:1"><div class="small" style="opacity:.8">Как обычное приложение</div><h1>Установить на телефон или компьютер</h1>
      <p>Значок «Авалон» на экране, открывается во весь экран, памятки доступны без интернета. Бесплатно и без магазина приложений.</p></div>
      <img src="img/icon-192.png" alt="" style="width:96px;height:96px;border-radius:24px;box-shadow:0 10px 30px rgba(0,0,0,.3);animation:breathe 4s ease-in-out infinite"></div>`, 'night') +
  `<main class="wrap pad" style="max-width:860px;display:grid;gap:12px">
    ${done ? `<div class="box mint" style="display:flex;gap:10px;align-items:center"><b style="font-size:1.4rem">✓</b><div><b>Уже установлено</b><div class="small">Вы открыли «Авалон» как приложение.</div></div></div>` : ''}
    ${!done && installPrompt ? `<button class="btn grad-mint" data-install style="font-size:1.05rem">⬇️ Установить в одно нажатие</button>` : ''}
    <div class="tabs" style="--t:${t};grid-template-columns:repeat(4,1fr);margin:0"><span class="ind" style="width:calc((100% - 8px) / 4)"></span>
      ${INSTALL.map((x, i) => `<button class="${i === t ? 'on' : ''}" data-href="#/install/${i}" data-replace>${x.name}</button>`).join('')}</div>
    <div class="view" style="display:grid;gap:8px">${P.steps.map(([h, d], i) => `
      <div class="card flat enter" style="--i:${i};display:flex;gap:12px;padding:14px">
        <span style="width:32px;height:32px;border-radius:50%;background:var(--teal);color:#fff;display:grid;place-items:center;font-weight:700;flex:none">${i + 1}</span>
        <div><b>${h}</b><div class="muted" style="font-size:.92rem;margin-top:2px">${d}</div></div></div>`).join('')}
      ${P.extra ? `<p class="small muted">${P.extra}</p>` : ''}</div>
    ${t === 0 ? `<a class="btn grad-teal" href="${APK.url}" download>${svg('android')} Скачать Android-приложение ${APK.name}</a>` : ''}
    <p class="small muted">Ваши отметки в «Моём пути» и настройки хранятся только на вашем устройстве.</p>
    <div style="height:30px"></div></main>`;
}

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
  const speaking = SAY.id;
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
    case 'reviews': html = viewReviews(); break;
    case 'prep': html = viewPrep(a); break;
    case 'install': html = viewInstall(a); break;
    case 'anesthesia': html = viewAnesthesia(a); break;
    case 'howto': html = a ? viewHowTo(a, b) : viewHowTos(); break;
    default: html = viewHome();
  }
  const keepScroll = window._replace; window._replace = false;
  const y = scrollY;
  $app.innerHTML = `<div class="${keepScroll ? '' : 'view'}">${html}</div>`;
  scrollTo(0, keepScroll ? y : 0);
  renderNav(r || '');
  if (speaking && !document.querySelector(`[data-listen="${CSS.escape(speaking)}"]`)) stopSpeech();
  startRotators();
  if (!r) initHero();
  if (r === 'tracker' && document.getElementById('symptoms')) updateVerdict();
  if (r === 'booking') refreshSend();
  document.querySelectorAll('.secchips').forEach(row => { const on = row.querySelector('.secchip.on'); if (on) row.scrollLeft = on.offsetLeft - (row.clientWidth - on.offsetWidth) / 2; });
  if (r !== 'howto') HT.auto = false;
  if (r === 'howto' && a) startHowTo(a, Math.max(0, +b || 0));
  document.querySelectorAll('[data-count]').forEach(el => { const n = +el.dataset.count; let k = 0; const t = setInterval(() => { k++; el.textContent = Math.round(n * Math.min(1, k / 30)); if (k >= 30) clearInterval(t); }, 40); timers.push(t); });
  const titles = { howto: () => (D.howtos || []).find(x => x.id === a)?.title, guide: () => byId(D.operations, a)?.title, doctor: () => byId(D.doctors, a)?.name, article: () => byId(D.articles, a)?.title, promo: () => byId(D.promos, a)?.title };
  document.title = (titles[r]?.() ? titles[r]() + ' · ' : '') + 'Авалон · Помощник пациента';
}

// ————————————————— События —————————————————
document.addEventListener('click', e => {
  const el = e.target.closest('[data-sec],[data-htauto],[data-httimer],[data-htreset],[data-listen],[data-install],[data-prep],[data-bk],[data-bksend],[data-copybooking],[data-href],[data-nav],[data-back],[data-tip],[data-toggle-stage],[data-start],[data-share],[data-pick],[data-begin],[data-reset],[data-resetquiz],[data-task],[data-set],[data-toggle],[data-ans],[data-next],[data-quiz-restart],[data-flip]');
  if (!el) return;
  const d = el.dataset;
  if (d.sec) { SEC = d.sec; window._replace = true; route(); return; }
  if (d.htauto !== undefined) { HT.auto = !HT.auto; const m = location.hash.match(/^#\/howto\/([^/]+)\/?(\d*)/); if (HT.auto && m) { const h = D.howtos.find(x => x.id === m[1]); if (h && +m[2] >= h.steps.length - 1) { history.replaceState(null, '', `#/howto/${m[1]}/0`); } } window._replace = true; route(); return; }
  if (d.httimer !== undefined) { const t = document.getElementById('httimer'); tickTimer(!t._iv); return; }
  if (d.htreset !== undefined) { const t = document.getElementById('httimer'); t.dataset.left = t.dataset.total; tickTimer(false); return; }
  if (d.listen) { SAY.id === d.listen ? stopSpeech() : speak(d.listen); return; }
  if (d.install !== undefined) { if (installPrompt) { installPrompt.prompt(); installPrompt.userChoice.finally(() => { installPrompt = null; window._replace = true; route(); }); } return; }
  if (d.prep) { const [pid, k] = d.prep.split('|'); S.prepChecked = S.prepChecked || {}; const c = S.prepChecked[pid] = S.prepChecked[pid] || {}; c[k] ? delete c[k] : (c[k] = true); store.save(); window._replace = true; route(); return; }
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
  if (d.set) { const [k, v] = d.set.split(':'); S[k] = k === 'scale' || k === 'rate' ? +v : v; store.save(); applySettings(); window._replace = true; route(); return; }
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

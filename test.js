// اجرا: node test.js — منطق را از بخش <script id="core"> داخل index.html بیرون می‌کشد.
const fs = require('fs');
const assert = require('assert');
const html = fs.readFileSync(__dirname + '/index.html', 'utf8');
const src = /<script id="core">([\s\S]*?)<\/script>/.exec(html)[1];
const H = new Function('module', src + '\nreturn HomiCore;')(undefined);
const enc = s => new TextEncoder().encode(s);
let n = 0;
const t = (name, fn) => { fn(); n++; console.log('ok -', name); };

t('UTF-8 سخت‌گیرانه', () => {
  const r = H.decodeBytes(enc('سلام دنیا'));
  assert.strictEqual(r.encoding, 'utf-8'); assert.strictEqual(r.text, 'سلام دنیا');
});
t('UTF-8 با BOM', () => {
  const r = H.decodeBytes(Uint8Array.from([0xEF, 0xBB, 0xBF, ...enc('سلام')]));
  assert.strictEqual(r.text, 'سلام');
});
t('fallback به windows-1256', () => {
  const r = H.decodeBytes(Uint8Array.from([0xD3, 0xE1, 0xC7, 0xE3])); // سلام
  assert.strictEqual(r.encoding, 'windows-1256'); assert.strictEqual(r.text, 'سلام');
});
t('اصلاح «Ø§Ù„» (UTF-8 خوانده‌شده به‌صورت latin1)', () => {
  const moji = new TextDecoder('windows-1252').decode(enc('سلام، حال شما چطور است؟'));
  assert.ok(/Ø§Ù„/.test(moji));
  const r = H.decodeBytes(enc(moji));
  assert.strictEqual(r.text, 'سلام، حال شما چطور است؟'); assert.ok(r.mojibake);
});
t('متن انگلیسی دست نمی‌خورد', () => {
  const r = H.decodeBytes(enc('Hello Ø world'));
  assert.strictEqual(r.text, 'Hello Ø world');
});

const SRT = '1\r\n00:00:01,000 --> 00:00:03,500\r\nسلام ي دنيا ?\r\n\r\n2\r\n00:01:02,250 --> 00:01:04,000\r\n<i>.كجايي</i>\r\nخط 2: 123\r\n';
t('تشخیص و خواندن SRT', () => {
  const p = H.parse(SRT);
  assert.strictEqual(p.format, 'srt'); assert.strictEqual(p.cues.length, 2);
  assert.strictEqual(p.cues[1].start, 62250); assert.strictEqual(p.cues[1].text, '<i>.كجايي</i>\nخط 2: 123');
});
t('ي/ك عربی و ؟', () => {
  const o = { arabic: true, punct: false, digits: false };
  assert.strictEqual(H.fixText('سلام ي دنيا ?', o), 'سلام ی دنیا ?');
  assert.strictEqual(H.fixText('كجايي', o), 'کجایی');
  assert.strictEqual(H.fixText('٤٥٦', o), '۴۵۶');
});
t('علامت نگارشی: جابه‌جایی از اول خط + RLE', () => {
  const o = { arabic: true, punct: true, digits: false };
  assert.strictEqual(H.fixText('.سلام', o), '\u202Bسلام.\u202C');
  assert.strictEqual(H.fixText('<i>!كجايي</i>', o), '<i>\u202Bکجایی</i>!\u202C'.replace('</i>!', '!</i>'));
  assert.strictEqual(H.fixText('سلام ?', o), '\u202Bسلام؟\u202C');
  assert.strictEqual(H.fixText('...سلام', o), '\u202B...سلام\u202C'); // نقطه‌چین ابتدای خط دست‌نخورده
  const once = H.fixText('سلام!', o);
  assert.strictEqual(H.fixText(once, o), once); // idempotent
});
t('اعداد فارسی (تگ‌ها دست‌نخورده)', () => {
  const o = { arabic: false, punct: false, digits: true };
  assert.strictEqual(H.fixText('سال 2024 <font color="#00ff00">ساعت 5</font>', o), 'سال ۲۰۲۴ <font color="#00ff00">ساعت ۵</font>');
});
t('جابه‌جایی زمان', () => {
  const c = H.parse(SRT).cues;
  const s = H.shiftCues(c, 1500);
  assert.strictEqual(s[0].start, 2500); assert.strictEqual(s[1].end, 65500);
  const neg = H.shiftCues(c, -4000);
  assert.strictEqual(neg.length, 1); assert.strictEqual(neg[0].start, 58250); // خط اول کاملاً قبل از صفر → حذف
  assert.strictEqual(H.shiftCues(c, -2000)[0].start, 0);
});
t('تبدیل fps 23.976 → 25', () => {
  const c = H.scaleFps([{ start: 25000, end: 50000, text: 'x' }], 23.976, 25);
  assert.strictEqual(c[0].start, Math.round(25000 * 23.976 / 25));
  assert.strictEqual(H.scaleFps([{ start: 1000, end: 2000, text: 'x' }], 25, 25)[0].start, 1000);
});
t('SRT → VTT', () => {
  const v = H.serialize(H.parse(SRT), 'vtt');
  assert.ok(v.startsWith('WEBVTT\r\n\r\n00:00:01.000 --> 00:00:03.500\r\n'));
  const back = H.parse(v); assert.strictEqual(back.format, 'vtt'); assert.strictEqual(back.cues[0].end, 3500);
});
t('VTT → SRT (تنظیمات و تگ‌ها حذف)', () => {
  const vtt = 'WEBVTT\n\nNOTE x\n\nintro\n00:00:01.000 --> 00:00:02.000 align:start\n<v Ali>سلام <c.red>دنیا</c></v>\n\n01:00.500 --> 01:01.000\nبعدی\n';
  const p = H.parse(vtt);
  assert.strictEqual(p.cues.length, 2); assert.strictEqual(p.cues[0].text, 'سلام دنیا'); assert.strictEqual(p.cues[1].start, 60500);
  const s = H.serialize(p, 'srt');
  assert.ok(s.startsWith('1\r\n00:00:01,000 --> 00:00:02,000\r\nسلام دنیا'));
});
const BS = String.fromCharCode(92); // backslash
const AN8 = '{' + BS + 'an8}', I1 = '{' + BS + 'i1}', I0 = '{' + BS + 'i0}', NL = BS + 'N';
const ASS = ['[Script Info]', 'Title: t', '', '[V4+ Styles]', 'Format: Name, Fontname', 'Style: Default,Tahoma', '', '[Events]',
  'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
  'Dialogue: 0,0:00:01.00,0:00:03.50,Default,,0,0,0,,' + AN8 + I1 + 'سلام، دنیا' + I0 + NL + 'خط دوم',
  'Comment: 0,0:00:05.00,0:00:06.00,Default,,0,0,0,,نادیده', ''].join('\n');
t('ASS → SRT (کاما در متن، N، i، an)', () => {
  const p = H.parse(ASS);
  assert.strictEqual(p.format, 'ass'); assert.strictEqual(p.cues.length, 1);
  assert.strictEqual(p.cues[0].text, '<i>سلام، دنیا</i>\nخط دوم'); assert.strictEqual(p.cues[0].an, 8);
  const s = H.serialize(p, 'srt');
  assert.ok(s.includes('00:00:01,000 --> 00:00:03,500\r\n' + AN8 + '<i>سلام، دنیا</i>\r\nخط دوم'));
});
t('ASS → ASS هدر حفظ می‌شود، زمان جابه‌جا می‌شود', () => {
  const out = H.serialize(H.process(H.parse(ASS), { shiftMs: 1000 }), 'ass');
  assert.ok(out.includes('Style: Default,Tahoma'));
  assert.ok(out.includes('Dialogue: 0,0:00:02.00,0:00:04.50,Default,,0,0,0,,' + AN8 + I1 + 'سلام، دنیا' + I0 + NL + 'خط دوم'));
  assert.strictEqual(H.parse(out).cues[0].start, 2000);
});
t('SRT → ASS با هدر پیش‌فرض و رفت‌وبرگشت', () => {
  const a = H.serialize(H.parse(SRT), 'ass');
  assert.ok(a.includes('[Events]') && a.includes('Dialogue: 0,0:00:01.00,0:00:03.50,Default'));
  const p = H.parse(a); assert.strictEqual(p.cues.length, 2); assert.strictEqual(p.cues[1].text, '<i>.كجايي</i>\nخط 2: 123');
});
t('خروجی با BOM', () => { assert.strictEqual(H.bom('x').charCodeAt(0), 0xFEFF); });
t('خط لوله‌ی کامل', () => {
  const p = H.process(H.parse(SRT), { arabic: true, punct: true, digits: true, shiftMs: 500, fpsFrom: 23.976, fpsTo: 25 });
  const s = H.serialize(p, 'srt');
  assert.ok(s.includes('کجایی') && s.includes('۱۲۳') && !s.includes('ي'));
});
console.log('\n' + n + ' تست موفق بود');

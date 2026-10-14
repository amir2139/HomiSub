# HomiSub

**فارسی** · [English](#english)

## فارسی

HomiSub یک ابزار تک‌فایلی برای درست‌کردن زیرنویس فارسی است. همه‌چیز داخل مرورگر انجام می‌شود؛ هیچ فایلی آپلود نمی‌شود و به فریم‌ورک یا CDN نیازی نیست.

### استفاده
فایل `index.html` را در مرورگر باز کنید، فایل زیرنویس را بکشید و رها کنید (یا انتخاب کنید)، گزینه‌ها را تنظیم کنید و دکمه‌ی دانلود را بزنید.

### امکانات
- ورودی: SRT، VTT و ASS/SSA
- تشخیص encoding: اول UTF-8 سخت‌گیرانه، در صورت شکست windows-1256؛ مشکل «Ø§Ù„» (UTF-8 که به‌اشتباه latin1 خوانده شده) هم تشخیص و اصلاح می‌شود
- اصلاح متن: تبدیل «ي» و «ك» عربی به «ی» و «ک»، درست‌کردن علامت‌هایی که در پخش‌کننده‌ها به اول خط می‌پرند (با RLE و جابه‌جایی علامت)، و تبدیل اعداد به فارسی (اختیاری)
- زمان‌بندی: جابه‌جایی کل زیرنویس با ±میلی‌ثانیه و تبدیل fps (مثلاً 23.976 به 25)
- تبدیل بین SRT، VTT و ASS؛ خروجی UTF-8 با BOM
- پیش‌نمایش چند خط اول، قبل و بعد از اصلاح

### محدودیت‌ها
در تبدیل ASS، فقط ایتالیک/بولد/زیرخط و `\an` حفظ می‌شود؛ افکت‌های دیگر (karaoke، `\pos` و …) از بین می‌روند. هدر و استایل‌های فایل ASS اصلی حفظ می‌شود.

### تست
منطق تبدیل در بخش `<script id="core">` داخل `index.html` است و بدون DOM با Node تست می‌شود:

```bash
node test.js
```

### مجوز
MIT

---

## English

HomiSub is a single-file tool for fixing Persian subtitles. Everything runs in the browser: nothing is uploaded, and there is no framework or CDN.

### Usage
Open `index.html`, drag and drop (or pick) a subtitle file, adjust the options, then click download.

### Features
- Input: SRT, VTT and ASS/SSA
- Encoding detection: strict UTF-8 first, falling back to windows-1256; also detects and repairs the "Ø§Ù„" mojibake (UTF-8 mistakenly read as latin1)
- Text fixes: Arabic ي/ك → Persian ی/ک, punctuation that jumps to the start of the line in players (RLE marks plus moving leading punctuation), optional Persian digits
- Timing: shift the whole file by ±ms, and fps conversion (e.g. 23.976 → 25)
- Convert between SRT, VTT and ASS; output is UTF-8 with BOM
- Before/after preview of the first lines

### Limitations
When converting ASS, only italic/bold/underline and `\an` are kept; other effects (karaoke, `\pos`, …) are dropped. The original ASS header and styles are preserved.

### Tests
The conversion logic lives in the `<script id="core">` block of `index.html`, has no DOM dependency, and is tested with Node:

```bash
node test.js
```

### License
MIT

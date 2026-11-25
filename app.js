// ============================================================================
// V!ODSOFT — ESP32 3D Web Serial Flasher
// Boards: CYD ESP32-2432S024 | Wemos D1 Mini | Waveshare ESP32-S3-LCD-1.47B
// ============================================================================

import { Board3DViewer, BOARD_SPECS } from './board3d.js';
import { sfx } from './sound.js';

const CATALOG_FIRMWARES = [
  {
    id: 'cathack-tznusb-30',
    title: 'CatHack // TZNUSB 3.0',
    author: 'by TZNSEC (VO!DSOFT Build)',
    board: 'waveshare147',
    boardLabel: 'Waveshare ESP32-S3-LCD-1.47B',
    filename: 'TZNUSB_3.0_VOIDSOFT.bin',
    url: './firmware/TZNUSB_3.0_VOIDSOFT.bin',
    offset: '0x0',
    sizeBytes: 1057120,
    summary:
      'Samowystarczalny firmware USB HID (DuckyScript) + Wi-Fi IDS + bezprzewodowy Web Panel SD dla Waveshare ESP32-S3-LCD-1.47B. Sterowanie żyroskopem QMI8658, przyciskiem BOOT lub z telefonu.',
    features: [
      ['USB HID & DuckyScript', 'Klawiatura/mysz USB, skrypty .txt/.duck z microSD, 13 wbudowanych payloadów + tryb Autostart.'],
      ['Wi-Fi IDS', 'Pasywny sniffer 802.11 (ch. 1–13), żywy oscyloskop na LCD oraz alarm Deauth z diodą RGB.'],
      ['Web Panel + Captive Portal', 'AP TZNUSB-3.0 (hasło: tznsec123 • 192.168.4.1), zdalne payloady, menedżer microSD i skaner/ping klientów.'],
      ['16-bit Pixel UI & NVS', 'Animowane menu z kotem CatHack, sterowanie IMU/BOOT, wygaszanie LCD, formatowanie SD i zapis w NVS.'],
    ],
    tags: ['USB HID', 'DuckyScript', 'Wi-Fi IDS', 'Captive Portal', 'IMU QMI8658', 'All-in-One 0x0'],
  },
  {
    id: 'voidfox-cyd-2432s028',
    title: 'VoidFox // CYD 2.8"',
    author: 'by TZNSEC (VoidFox Build)',
    board: 'cyd',
    boardLabel: 'CYD ESP32-2432S028',
    filename: 'VOIDFOX_CYD_2432S028.bin',
    url: './firmware/VOIDFOX_CYD_2432S028.bin',
    offset: '0x0',
    sizeBytes: 1780752,
    summary:
      'Autorski firmware dla CYD (ESP32-2432S028, ekran 2.8" 240x320). Polskie UI, dotykowe kafelki, Wi-Fi Tools 2.4 GHz, BLE HID/BadUSB, bootowanie .bin z karty SD i blokada PIN. Tylko do własnych lub autoryzowanych urządzeń i sieci.',
    features: [
      ['Wi-Fi Tools 2.4 GHz', 'Skaner i łączenie z siecią, Packet Monitor 802.11, deauth/disassoc, auth/assoc/probe flood, beacon spam, EAPOL capture/logoff/start + zapis .pcap na SD.'],
      ['BLE HID / BadUSB', 'Klawiatura i mysz BLE, 12 gotowych skryptów (m.in. MYSZKA działająca w pętli do STOP) oraz własny skrypt edytowany klawiaturą dotykową.'],
      ['UI PL + PIN', 'Polski interfejs dotykowy 240x320, blokada PIN przy starcie, dioda RGB statusu, animacje kafelków i kalibracja ekranu.'],
      ['SD Boot + KNOWELG', 'Boot innych plików .bin z karty SD (FAT/FAT32), formatowanie SD oraz 5-stronicowy opis projektu w Ustawieniach.'],
      ['Pełny obraz 0x0', 'Bootloader + partycje min_spiffs + aplikacja w jednym pliku. Wgranie zastępuje dotychczasowy firmware CYD.'],
    ],
    tags: ['CYD 2.8"', 'ESP32-2432S028', 'Wi-Fi Tools', 'BLE HID', 'DuckyScript', 'SD Boot', 'UI PL', 'All-in-One 0x0'],
  },
  {
    id: 'esp8266-deauther-261-d1mini',
    title: 'ESP8266 Deauther 2.6.1',
    author: 'by Spacehuhn Tech (v2.6.1)',
    board: 'd1mini',
    boardLabel: 'Wemos D1 Mini (ESP8266)',
    filename: 'ESP8266_DEAUTHER_2.6.1_WEMOS_D1_MINI.bin',
    url: './firmware/ESP8266_DEAUTHER_2.6.1_WEMOS_D1_MINI.bin',
    offset: '0x0',
    sizeBytes: 833552,
    summary:
      'Najnowsze oficjalne wydanie (2.6.1) projektu SpacehuhnTech/esp8266_deauther dla Wemos D1 Mini z ESP8266. Narzędzie edukacyjne do testowania sieci 802.11: skanowanie, deauth, fake AP i probe flood. Źródło: github.com/SpacehuhnTech/esp8266_deauther. Tylko na własne sieci i urządzenia!',
    features: [
      ['Skaner Wi-Fi', 'Podgląd pobliskich access pointów i klientów w czasie rzeczywistym (2.4 GHz).'],
      ['Deauthentication', 'Rozłączanie wybranych urządzeń ramkami deauth — główna funkcja projektu.'],
      ['Fake Networks', 'Tworzenie dziesiątek fałszywych AP (beacon flood), aby zmylić skanery i użytkowników.'],
      ['Probe Flood', 'Wysyłanie fałszywych probe requestów, które mylą trackery Wi-Fi.'],
      ['Web / Serial UI', 'Panel webowy i interfejs szeregowy; AP `pwned` z hasłem `deauther`.'],
      ['Cel edukacyjny', 'Proof of concept do nauki o Wi-Fi i mikrokontrolerach. Używaj wyłącznie na własnym sprzęcie i zgodnie z prawem lokalnym.'],
    ],
    tags: ['ESP8266', 'Wemos D1 Mini', 'Deauther', '802.11', 'Deauth', 'Beacon Flood', 'Probe Flood', 'Web UI', '0x0'],
  },
];

const PINOUTS = {
  cyd: {
    title: 'CYD 2432S024 / S028',
    left: [
      { pin: 'VIN (5V)', cat: 'pwr', info: 'Zasilanie 5V (USB-C / Micro-USB / P1).' },
      { pin: '3V3', cat: 'pwr', info: 'Wyjście regulatora 3.3V.' },
      { pin: 'IO21 (BL)', cat: 'bus', info: 'Podświetlenie ekranu TFT 2.4" (Backlight PWM).' },
      { pin: 'IO14 (SCK)', cat: 'bus', info: 'TFT ILI9341 SPI Clock (HSPI).' },
      { pin: 'IO13 (MOSI)', cat: 'bus', info: 'TFT ILI9341 SPI MOSI.' },
      { pin: 'IO15 (CS)', cat: 'bus', info: 'TFT ILI9341 Chip Select.' },
      { pin: 'IO2 (DC)', cat: 'bus', info: 'TFT Data/Command.' },
      { pin: 'IO34 (LDR)', cat: 'bus', info: 'Czujnik światła (fotorezystor na froncie).' },
      { pin: 'GND', cat: 'gnd', info: 'Masa (0V).' },
    ],
    right: [
      { pin: 'IO1 (TX0)', cat: 'uart', info: 'UART0 TX (złącze P1 / USB).' },
      { pin: 'IO3 (RX0)', cat: 'uart', info: 'UART0 RX (złącze P1 / USB).' },
      { pin: 'IO22 (CN1)', cat: 'bus', info: 'Wolny pin GPIO / I2C SCL na złączu CN1.' },
      { pin: 'IO27 (CN1)', cat: 'bus', info: 'Wolny pin GPIO / I2C SDA na złączu CN1.' },
      { pin: 'IO33 (T_CS)', cat: 'bus', info: 'Dotyk XPT2046 Chip Select.' },
      { pin: 'IO5 (SD_CS)', cat: 'bus', info: 'Czytnik kart MicroSD Chip Select.' },
      { pin: 'IO4/16/17', cat: 'bus', info: 'Wbudowana dioda RGB LED (R=4, G=16, B=17, Active LOW).' },
      { pin: 'IO0 (BOOT)', cat: 'boot', info: 'Przycisk BOOT — tryb flashowania.' },
      { pin: 'EN (RST)', cat: 'boot', info: 'Przycisk RESET układu ESP32.' },
    ],
  },
  d1mini: {
    title: 'Wemos D1 Mini',
    left: [
      { pin: 'RST', cat: 'boot', info: 'Reset sprzętowy układu.' },
      { pin: 'A0', cat: 'bus', info: 'Wejście analogowe ADC (0–3.3V).' },
      { pin: 'D0 / IO16', cat: 'bus', info: 'GPIO / Deep-Sleep Wake.' },
      { pin: 'D5 / IO14', cat: 'bus', info: 'SPI SCK / GPIO / PWM.' },
      { pin: 'D6 / IO12', cat: 'bus', info: 'SPI MISO / GPIO / PWM.' },
      { pin: 'D7 / IO13', cat: 'bus', info: 'SPI MOSI / GPIO / PWM.' },
      { pin: 'D8 / IO15', cat: 'boot', info: 'SPI CS / Strapping Pin (pulled LOW).' },
      { pin: '3V3', cat: 'pwr', info: 'Wyjście 3.3V.' },
    ],
    right: [
      { pin: 'TX / IO1', cat: 'uart', info: 'UART0 TX.' },
      { pin: 'RX / IO3', cat: 'uart', info: 'UART0 RX.' },
      { pin: 'D1 / IO5', cat: 'bus', info: 'Domyślny I2C SCL.' },
      { pin: 'D2 / IO4', cat: 'bus', info: 'Domyślny I2C SDA.' },
      { pin: 'D3 / IO0', cat: 'boot', info: 'FLASH / BOOT Strapping Pin.' },
      { pin: 'D4 / IO2', cat: 'bus', info: 'Wbudowana niebieska dioda LED (Active LOW).' },
      { pin: 'GND', cat: 'gnd', info: 'Masa (0V).' },
      { pin: '5V', cat: 'pwr', info: 'Zasilanie 5V z USB.' },
    ],
  },
  waveshare147: {
    title: 'Waveshare 1.47B',
    left: [
      { pin: '5V (VBUS)', cat: 'pwr', info: 'Zasilanie 5V z portu USB-C.' },
      { pin: '3V3', cat: 'pwr', info: 'Wyjście zasilania 3.3V.' },
      { pin: 'IO40 (SCK)', cat: 'bus', info: 'LCD 1.47" ST7789 SPI Clock.' },
      { pin: 'IO45 (MOSI)', cat: 'bus', info: 'LCD 1.47" ST7789 SPI MOSI.' },
      { pin: 'IO42 (CS)', cat: 'bus', info: 'LCD Chip Select.' },
      { pin: 'IO41 (DC)', cat: 'bus', info: 'LCD Data/Command.' },
      { pin: 'IO48 (BL)', cat: 'bus', info: 'Podświetlenie IPS LCD 1.47".' },
      { pin: 'GND', cat: 'gnd', info: 'Masa (0V).' },
    ],
    right: [
      { pin: 'IO19 (USB-)', cat: 'uart', info: 'Natywne USB OTG D-.' },
      { pin: 'IO20 (USB+)', cat: 'uart', info: 'Natywne USB OTG D+.' },
      { pin: 'IO38 (RGB)', cat: 'bus', info: 'Wbudowana dioda RGB LED.' },
      { pin: 'IO11 (SDA)', cat: 'bus', info: 'I2C SDA — czujnik 6-osiowy IMU QMI8658.' },
      { pin: 'IO12 (SCL)', cat: 'bus', info: 'I2C SCL — czujnik 6-osiowy IMU QMI8658.' },
      { pin: 'IO14/15/16', cat: 'bus', info: 'Magistrala karty TF (MicroSD).' },
      { pin: 'IO0 (BOOT)', cat: 'boot', info: 'Przycisk BOOT — przytrzymaj przy podłączaniu USB.' },
      { pin: 'RST', cat: 'boot', info: 'Przycisk RESET.' },
    ],
  },
};

const state = {
  board: 'cyd',
  page: 'flasher',
  connected: false,
  flashing: false,
  progress: 0,
  mac: '--:--:--:--:--:--',
  speedHistory: Array(24).fill(0),
  partitions: [],
  hubFiles: [],
  hubQuery: '',
  hubBoardFilter: 'all',
  serialPort: null,
  transport: null,
  esploader: null,
  viewer3d: null,
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const connDot = $('#connDot');
const connLabel = $('#connLabel');
const chipDetected = $('#chipDetected');
const partCountSummary = $('#partCountSummary');
const macDisplay = $('#macDisplay');
const hudBoardName = $('#hudBoardName');
const hudStateBadge = $('#hudStateBadge');
const connectBtn = $('#connectBtn');
const disconnectBtn = $('#disconnectBtn');
const flashBtn = $('#flashBtn');
const eraseBtn = $('#eraseBtn');
const resetBtn = $('#resetBtn');
const progressFill = $('#progressFill');
const progressPct = $('#progressPct');
const progressText = $('#progressText');
const txStat = $('#txStat');
const speedStat = $('#speedStat');
const flashLog = $('#flashLog');
const partitionList = $('#partitionList');
const monitorOutput = $('#monitorOutput');

// ============================================================================
// SPLASH SCREEN, NAV & SPOTLIGHT
// ============================================================================

function initSplash() {
  const splash = $('#splashScreen');
  if (!splash) return;

  const dismiss = () => splash.classList.add('hidden');

  // Play synthwave intro by default; if autoplay-blocked, play silently on first gesture
  sfx.introMusic(false);

  const unlockHandler = () => {
    if (!sfx.introPlayed) sfx.introMusic(false);
    window.removeEventListener('pointerdown', unlockHandler);
    window.removeEventListener('keydown', unlockHandler);
  };
  window.addEventListener('pointerdown', unlockHandler, { once: true });
  window.addEventListener('keydown', unlockHandler, { once: true });

  splash.addEventListener('click', dismiss);
  setTimeout(dismiss, 2400);
}

function updateNavIndicator() {
  const activeBtn = $('.nav-btn.active');
  const indicator = $('#navIndicator');
  if (!activeBtn || !indicator) return;
  indicator.style.width = `${activeBtn.offsetWidth}px`;
  indicator.style.transform = `translateX(${activeBtn.offsetLeft - 4}px)`;
}

function switchPage(pageId) {
  state.page = pageId;
  $$('.page').forEach((p) => p.classList.toggle('active', p.id === `page-${pageId}`));
  $$('.nav-btn').forEach((b) => b.classList.toggle('active', b.dataset.pageTarget === pageId));
  updateNavIndicator();
  if (pageId === 'flasher' && state.viewer3d) {
    setTimeout(() => state.viewer3d.onResize(), 50);
  }
}

function initSpotlightCards() {
  document.addEventListener('pointermove', (e) => {
    $$('.spotlight-card').forEach((card) => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX - rect.left}px`);
      card.style.setProperty('--my', `${e.clientY - rect.top}px`);
    });
  });
}

// ============================================================================
// CONSOLE & SPARKLINE
// ============================================================================

function appendLog(container, msg, level = 'default') {
  const time = new Date().toLocaleTimeString('pl-PL', { hour12: false });
  const row = document.createElement('div');
  row.className = 'log-line';
  row.innerHTML = `<span class="log-ts">[${time}]</span><span class="log-${level}"></span>`;
  row.querySelector(`.log-${level}`).textContent = msg;
  container.appendChild(row);
  container.scrollTop = container.scrollHeight;
}

const logFlash = (msg, level = 'default') => appendLog(flashLog, msg, level);
const logMonitor = (msg, level = 'default') => appendLog(monitorOutput, msg, level);

function drawSparkline() {
  const canvas = $('#speedSparkline');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const vals = state.speedHistory;
  const max = Math.max(100, ...vals);
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, 'rgba(217, 249, 157, 0.35)');
  grad.addColorStop(1, 'rgba(217, 249, 157, 0.0)');

  ctx.beginPath();
  vals.forEach((v, i) => {
    const x = (i / (vals.length - 1)) * w;
    const y = h - 3 - (v / max) * (h - 6);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });

  ctx.strokeStyle = '#d9f99d';
  ctx.lineWidth = 1.8;
  ctx.stroke();

  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();
}

// ============================================================================
// BOARD SELECTION, PARTITIONS & REAL FIRMWARE HUB
// ============================================================================

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function detectOffset(filename) {
  const lower = filename.toLowerCase();
  if (lower.includes('bootloader')) return '0x1000';
  if (lower.includes('partition')) return '0x8000';
  if (lower.includes('merged') || lower.includes('factory')) return '0x0';
  return '0x10000';
}

function selectBoard(boardKey) {
  state.board = boardKey;
  const spec = BOARD_SPECS[boardKey] || BOARD_SPECS.cyd;
  $$('.board-chip').forEach((b) => b.classList.toggle('active', b.dataset.board === boardKey));
  hudBoardName.textContent = spec.label;
  chipDetected.textContent = spec.chip;
  if (state.viewer3d) {
    state.viewer3d.buildBoard(boardKey);
  }
  logFlash(`[3D] ${spec.label}`, 'info');
}

function updateQuickSteps() {
  const hasFiles = state.partitions.length > 0;
  $('#qStep1')?.classList.toggle('done', true);
  $('#qStep2')?.classList.toggle('done', hasFiles);
  $('#qStep2')?.classList.toggle('active', !hasFiles);
  $('#qStep3')?.classList.toggle('active', hasFiles);
  $('#qStep3')?.classList.toggle('done', state.progress === 100);
}

function renderPartitions() {
  partitionList.innerHTML = '';
  const totalBytes = state.partitions.reduce((s, p) => s + p.sizeBytes, 0);
  partCountSummary.textContent = state.partitions.length
    ? `${state.partitions.length} • ${formatBytes(totalBytes)}`
    : '0 plików';
  updateQuickSteps();

  state.partitions.forEach((part, idx) => {
    const row = document.createElement('div');
    row.className = 'partition-row';

    const offsetInput = document.createElement('input');
    offsetInput.type = 'text';
    offsetInput.value = part.offset;
    offsetInput.addEventListener('change', (e) => {
      state.partitions[idx].offset = e.target.value.trim() || '0x0';
    });

    const nameEl = document.createElement('span');
    nameEl.className = 'partition-name';
    const isEspImg = part.data && part.data[0] === 0xe9;
    nameEl.innerHTML = `${part.name}<span class="magic-badge ${isEspImg ? '' : 'raw'}">${isEspImg ? '0xE9' : 'BIN'}</span>`;
    nameEl.title = part.name;

    const sizeEl = document.createElement('span');
    sizeEl.className = 'partition-size';
    sizeEl.textContent = formatBytes(part.sizeBytes);

    const delBtn = document.createElement('button');
    delBtn.className = 'btn btn-sm btn-ghost';
    delBtn.textContent = '✕';
    delBtn.addEventListener('click', () => {
      state.partitions.splice(idx, 1);
      renderPartitions();
    });

    row.append(offsetInput, nameEl, sizeEl, delBtn);
    partitionList.appendChild(row);
  });
}

async function handleFiles(files, target = 'flasher') {
  for (const file of files) {
    if (!file.name.toLowerCase().endsWith('.bin')) {
      logFlash(`[UWAGA] Pominięto ${file.name} (wymagany .bin)`, 'warn');
      continue;
    }
    const buf = await file.arrayBuffer();
    const item = {
      offset: detectOffset(file.name),
      name: file.name,
      sizeBytes: buf.byteLength,
      data: new Uint8Array(buf),
    };
    if (target === 'hub') {
      state.hubFiles.push(item);
    } else {
      state.partitions.push(item);
      logFlash(`[PLIK] ${file.name} (${formatBytes(buf.byteLength)}) @ ${item.offset}`, 'info');
    }
  }
  renderPartitions();
  renderFirmwareHub();
}

function renderFirmwareHub() {
  const grid = $('#firmwareGrid');
  grid.innerHTML = '';

  const q = state.hubQuery.trim().toLowerCase();
  const boardFilter = state.hubBoardFilter;

  const catalogMatches = CATALOG_FIRMWARES.filter((fw) => {
    if (boardFilter !== 'all' && fw.board !== boardFilter) return false;
    if (!q) return true;
    const hay = [
      fw.title,
      fw.author,
      fw.boardLabel,
      fw.filename,
      fw.summary,
      ...fw.tags,
      ...fw.features.flat(),
    ]
      .join(' ')
      .toLowerCase();
    return hay.includes(q);
  });

  const userMatches = state.hubFiles.filter((fw) => {
    if (boardFilter !== 'all') return false;
    if (!q) return true;
    return `${fw.name} ${fw.offset}`.toLowerCase().includes(q);
  });

  if (catalogMatches.length === 0 && userMatches.length === 0) {
    grid.innerHTML = `
      <div class="hub-empty">
        <strong>Brak pasujących plików firmware</strong>
        <span>Zmień zapytanie w wyszukiwarce lub filtr płytki.</span>
      </div>
    `;
    return;
  }

  catalogMatches.forEach((fw) => {
    const card = document.createElement('div');
    card.className = 'fw-card-rich';
    card.innerHTML = `
      <div>
        <div class="fw-header">
          <div>
            <div class="fw-author">${fw.author}</div>
            <h3 class="fw-title">${fw.title}</h3>
          </div>
          <span class="badge-chip">${fw.boardLabel}</span>
        </div>
        <p class="fw-summary">${fw.summary}</p>
      </div>
      <ul class="fw-features">
        ${fw.features.map(([k, v]) => `<li><strong>${k}:</strong> ${v}</li>`).join('')}
      </ul>
      <div class="fw-tags">
        ${fw.tags.map((t) => `<span class="fw-tag">${t}</span>`).join('')}
      </div>
      <div class="fw-specs">
        <span>Plik: ${fw.filename}</span>
        <span>Offset: ${fw.offset}</span>
        <span>Rozmiar: ${formatBytes(fw.sizeBytes)}</span>
      </div>
      <div class="action-row">
        <button class="btn btn-lime" data-load-catalog>⚡ Załaduj do Flashera</button>
        <a class="btn btn-ghost" href="${fw.url}" download="${fw.filename}">⬇ Pobierz .bin</a>
      </div>
    `;

    card.querySelector('[data-load-catalog]').addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      btn.disabled = true;
      btn.textContent = 'Ładowanie .bin...';
      try {
        const res = await fetch(fw.url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buf = await res.arrayBuffer();
        selectBoard(fw.board);
        state.partitions = [
          {
            offset: fw.offset,
            name: fw.filename,
            sizeBytes: buf.byteLength,
            data: new Uint8Array(buf),
          },
        ];
        renderPartitions();
        switchPage('flasher');
        sfx.chime();
        logFlash(`[HUB] Załadowano ${fw.title} (${fw.filename}, ${formatBytes(buf.byteLength)}) @ ${fw.offset}`, 'ok');
      } catch (err) {
        logFlash(`[BŁĄD] Nie udało się pobrać ${fw.filename}: ${err.message}`, 'err');
      } finally {
        btn.disabled = false;
        btn.textContent = '⚡ Załaduj do Flashera';
      }
    });

    grid.appendChild(card);
  });

  userMatches.forEach((fw, idx) => {
    const card = document.createElement('div');
    card.className = 'fw-card';
    card.innerHTML = `
      <div>
        <div class="fw-meta">${fw.offset} • ${formatBytes(fw.sizeBytes)}</div>
        <h3>${fw.name}</h3>
      </div>
      <div class="action-row">
        <button class="btn btn-sm btn-lime" data-load>Załaduj</button>
        <button class="btn btn-sm btn-ghost" data-del>Usuń</button>
      </div>
    `;
    card.querySelector('[data-load]').addEventListener('click', () => {
      state.partitions.push({ ...fw });
      renderPartitions();
      switchPage('flasher');
      sfx.click(620);
      logFlash(`[HUB] Załadowano ${fw.name} @ ${fw.offset}`, 'ok');
    });
    card.querySelector('[data-del]').addEventListener('click', () => {
      state.hubFiles.splice(idx, 1);
      renderFirmwareHub();
    });
    grid.appendChild(card);
  });
}

// ============================================================================
// REAL WEB SERIAL CONNECTION & ESPTOOL-JS FLASHING
// ============================================================================

function syncConnectionUI() {
  connDot.classList.toggle('connected', state.connected);
  connLabel.textContent = state.connected ? 'USB ONLINE' : 'OFFLINE';
  connectBtn.disabled = state.connected;
  disconnectBtn.disabled = !state.connected;
  macDisplay.textContent = `MAC: ${state.mac}`;
  if (state.viewer3d) {
    state.viewer3d.setStatus({
      connected: state.connected,
      flashing: state.flashing,
      progress: state.progress,
    });
  }
}

async function connectBoard() {
  if (!('serial' in navigator)) {
    logFlash('[BŁĄD] Przeglądarka nie obsługuje Web Serial API (użyj Chrome lub Edge).', 'err');
    return;
  }
  try {
    logFlash('[USB] Wybierz port COM / ttyUSB...', 'info');
    const port = await navigator.serial.requestPort();
    const baud = parseInt($('#baudSelect').value, 10);
    const { ESPLoader, Transport } = await import('https://esm.sh/esptool-js@0.4.5');

    const transport = new Transport(port, true);
    const loader = new ESPLoader({
      transport,
      baudrate: baud,
      terminal: {
        clean: () => {},
        writeLine: (line) => logFlash(line, 'default'),
        write: (text) => {
          if (text.trim()) logFlash(text.trim(), 'default');
        },
      },
    });

    const chip = await loader.main();
    state.serialPort = port;
    state.transport = transport;
    state.esploader = loader;
    state.connected = true;
    state.mac = await loader.chip.readMac(loader).catch(() => 'USB-SERIAL');
    chipDetected.textContent = chip;
    hudStateBadge.textContent = 'ONLINE';
    syncConnectionUI();
    logFlash(`[OK] Połączono: ${chip}`, 'ok');
  } catch (err) {
    logFlash(`[BŁĄD] ${err.message}`, 'err');
  }
}

async function disconnectBoard() {
  if (state.transport) {
    try {
      await state.transport.disconnect();
    } catch (_) {}
  }
  state.serialPort = null;
  state.transport = null;
  state.esploader = null;
  state.connected = false;
  state.mac = '--:--:--:--:--:--';
  hudStateBadge.textContent = 'IDLE';
  syncConnectionUI();
  logFlash('[USB] Rozłączono.', 'warn');
}

async function flashFirmware() {
  if (state.flashing) return;
  if (state.partitions.length === 0) {
    logFlash('[BŁĄD] Dodaj najpierw plik .bin.', 'err');
    return;
  }
  if (!state.connected) {
    await connectBoard();
    if (!state.connected) return;
  }

  state.flashing = true;
  state.progress = 0;
  flashBtn.disabled = true;
  eraseBtn.disabled = true;
  hudStateBadge.textContent = 'FLASHING';
  hudStateBadge.classList.add('flashing');
  if (state.viewer3d) state.viewer3d.setStatus({ flashing: true, progress: 0 });

  const startedAt = performance.now();

  try {
    const fileArray = state.partitions.map((part) => {
      const binaryStr = Array.from(part.data, (b) => String.fromCharCode(b)).join('');
      return { data: binaryStr, address: parseInt(part.offset, 16) };
    });

    await state.esploader.writeFlash({
      fileArray,
      flashSize: 'keep',
      flashMode: $('#flashModeSelect').value,
      flashFreq: $('#flashFreqSelect').value,
      eraseAll: false,
      compress: $('#compressSelect').value === 'true',
      reportProgress: (fileIndex, written, total) => {
        const pct = Math.round((written / total) * 100);
        const elapsedSec = Math.max(0.1, (performance.now() - startedAt) / 1000);
        const speedKBs = Math.round(written / 1024 / elapsedSec);

        state.progress = pct;
        state.speedHistory.shift();
        state.speedHistory.push(speedKBs);
        drawSparkline();

        progressFill.style.width = `${pct}%`;
        progressPct.textContent = `${pct}%`;
        progressText.textContent = `Partycja #${fileIndex + 1} (${formatBytes(written)} / ${formatBytes(total)})`;
        txStat.textContent = formatBytes(written);
        speedStat.textContent = `${speedKBs} KB/s`;
        if (state.viewer3d) state.viewer3d.setStatus({ progress: pct });
      },
    });

    await state.esploader.hardReset();
    state.progress = 100;
    progressFill.style.width = '100%';
    progressPct.textContent = '100%';
    progressText.textContent = 'Zakończono';
    hudStateBadge.textContent = 'DONE';
    if (state.viewer3d) state.viewer3d.setStatus({ flashing: false, progress: 100 });
    sfx.chime();
    logFlash('[SUKCES] Firmware wgrany!', 'ok');
  } catch (err) {
    hudStateBadge.textContent = 'ERROR';
    logFlash(`[BŁĄD] ${err.message}`, 'err');
  }

  state.flashing = false;
  flashBtn.disabled = false;
  eraseBtn.disabled = false;
  hudStateBadge.classList.remove('flashing');
  if (state.viewer3d) state.viewer3d.setStatus({ flashing: false });
}

async function eraseFlash() {
  if (!state.connected || !state.esploader) {
    logFlash('[UWAGA] Najpierw połącz płytkę przez USB.', 'warn');
    return;
  }
  try {
    logFlash('[ERASE] Czyszczenie Flash...', 'warn');
    await state.esploader.eraseFlash();
    logFlash('[OK] Pamięć Flash wyczyszczona.', 'ok');
  } catch (err) {
    logFlash(`[BŁĄD] ${err.message}`, 'err');
  }
}

async function resetBoard() {
  if (!state.connected || !state.esploader) {
    logFlash('[UWAGA] Brak połączenia USB.', 'warn');
    return;
  }
  await state.esploader.hardReset();
  logFlash('[RESET] Impuls RTS wysłany.', 'info');
}

// ============================================================================
// PINOUT LAB
// ============================================================================

function renderPinout(boardKey) {
  const data = PINOUTS[boardKey];
  const diagram = $('#pinoutDiagram');
  diagram.innerHTML = '';

  const buildCol = (pins) => {
    const col = document.createElement('div');
    col.className = 'pin-col';
    pins.forEach((p) => {
      const btn = document.createElement('button');
      btn.className = 'pin-btn';
      btn.innerHTML = `<span>${p.pin}</span><i class="dot ${p.cat}"></i>`;
      btn.addEventListener('click', () => {
        $$('.pin-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        $('#pinInspector').innerHTML = `
          <span class="badge-chip">${p.cat.toUpperCase()}</span>
          <h4>${p.pin}</h4>
          <p>${p.info}</p>
        `;
      });
      col.appendChild(btn);
    });
    return col;
  };

  const body = document.createElement('div');
  body.className = 'pin-chip-body';
  body.innerHTML = `<div><strong>${data.title}</strong></div>`;

  diagram.append(buildCol(data.left), body, buildCol(data.right));
}

// ============================================================================
// INIT
// ============================================================================

function init() {
  initSplash();
  initSpotlightCards();
  renderPartitions();
  renderFirmwareHub();
  renderPinout('cyd');
  drawSparkline();
  syncConnectionUI();

  $('#goHubBtn')?.addEventListener('click', () => {
    sfx.click(560);
    switchPage('library');
  });

  if (!('serial' in navigator)) {
    logFlash('[INFO] Web Serial niedostępny w tej przeglądarce (na PC użyj Chrome/Edge). Możesz przeglądać 3D, Firmware Hub i Pinout.', 'warn');
  } else {
    logFlash('[VO!DSOFT] Gotowy.', 'ok');
  }

  try {
    state.viewer3d = new Board3DViewer($('#viewport3d'));
  } catch (err) {
    logFlash(`[3D] ${err.message}`, 'warn');
  }

  $$('.nav-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      sfx.click(540);
      switchPage(btn.dataset.pageTarget);
    });
  });
  window.addEventListener('resize', updateNavIndicator);
  requestAnimationFrame(updateNavIndicator);

  $$('.cam-btn[data-cam]').forEach((btn) => {
    btn.addEventListener('click', () => {
      sfx.click(620);
      $$('.cam-btn[data-cam]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      if (state.viewer3d) state.viewer3d.setCameraPreset(btn.dataset.cam);
    });
  });

  $('#explodeBtn').addEventListener('click', (e) => {
    if (!state.viewer3d) return;
    const active = state.viewer3d.toggleExplode();
    e.currentTarget.classList.toggle('active', active);
    sfx.sweep(active);
  });

  $('#xrayBtn').addEventListener('click', (e) => {
    if (!state.viewer3d) return;
    const active = state.viewer3d.toggleXray();
    e.currentTarget.classList.toggle('active', active);
    sfx.sweep(active);
  });

  $('#autoRotateBtn').addEventListener('click', (e) => {
    if (!state.viewer3d) return;
    sfx.click(480);
    const active = state.viewer3d.toggleAutoRotate();
    e.currentTarget.classList.toggle('active', active);
  });

  const stageCard = $('.stage-card');
  const toggleTheater = (force) => {
    const isTheater = typeof force === 'boolean'
      ? stageCard.classList.toggle('theater', force)
      : stageCard.classList.toggle('theater');
    $('#theaterBtn').classList.toggle('active', isTheater);
    if (state.viewer3d) setTimeout(() => state.viewer3d.onResize(), 40);
  };
  $('#theaterBtn').addEventListener('click', () => {
    sfx.click(580);
    toggleTheater();
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && stageCard.classList.contains('theater')) {
      toggleTheater(false);
    }
  });

  $$('.board-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      sfx.sweep(true);
      selectBoard(chip.dataset.board);
    });
  });

  connectBtn.addEventListener('click', connectBoard);
  disconnectBtn.addEventListener('click', disconnectBoard);
  flashBtn.addEventListener('click', flashFirmware);
  eraseBtn.addEventListener('click', eraseFlash);
  resetBtn.addEventListener('click', resetBoard);
  $('#clearLogBtn').addEventListener('click', () => {
    flashLog.innerHTML = '';
  });

  // Flasher dropzone
  const dropzone = $('#dropzone');
  const fileInput = $('#fileInput');
  $('#browseBtn').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => handleFiles(e.target.files, 'flasher'));
  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    handleFiles(e.dataTransfer.files, 'flasher');
  });

  // Firmware Hub search/filter
  $('#hubSearch').addEventListener('input', (e) => {
    state.hubQuery = e.target.value;
    renderFirmwareHub();
  });

  $$('#hubFilters .cam-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      sfx.click(520);
      $$('#hubFilters .cam-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.hubBoardFilter = btn.dataset.hubBoard;
      renderFirmwareHub();
    });
  });

  // Pinout tabs
  $$('.pinout-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      $$('.pinout-tab').forEach((t) => {
        t.classList.remove('active', 'btn-lime');
        t.classList.add('btn-ghost');
      });
      tab.classList.add('active', 'btn-lime');
      tab.classList.remove('btn-ghost');
      renderPinout(tab.dataset.pinout);
    });
  });

  // UART Monitor
  $('#monitorClearBtn').addEventListener('click', () => {
    monitorOutput.innerHTML = '';
  });
  $('#monitorExportBtn').addEventListener('click', () => {
    const blob = new Blob([monitorOutput.innerText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `viodsoft-uart-${Date.now()}.log`;
    a.click();
    URL.revokeObjectURL(url);
  });
  $('#monitorForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = $('#monitorInput');
    const cmd = input.value.trim();
    if (!cmd) return;
    logMonitor(`>>> ${cmd}`, 'info');
    input.value = '';
  });
}

init();

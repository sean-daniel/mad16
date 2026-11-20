(function () {
  "use strict";

  const DATA = window.MAD;
  const { AXES, TYPES, QUESTIONS, FAMILIES, STATS, SOURCES } = DATA;
  const TEST_KEY = "madtype_progress_v1";
  const RESULT_KEY = "madtype_last_result_v1";
  const SITE_URL = "https://sean-daniel.github.io/mad16/";
  const QR_MATRIX = [
    "1111111000010001010111101011101111111",
    "1000001010111110100110000000101000001",
    "1011101001100011110000100011001011101",
    "1011101001110101100111100101101011101",
    "1011101001101000101101100111001011101",
    "1000001011100110101000000110101000001",
    "1111111010101010101010101010101111111",
    "0000000010011110011000010010000000000",
    "0000111100001110110011001111001100010",
    "1111010011011010111001000000101110010",
    "1000111100100000011101010110110000100",
    "1010100100010111011010010010010001100",
    "0111101001011011101011101001011101100",
    "0101100110110100100011100001110010100",
    "0111101001110111001101101011010101100",
    "1010000011101111111001001001100100100",
    "0010001100010101010000111011011101101",
    "0001010010111010111001011011100011100",
    "1011001100011100100011100111010001000",
    "1001110110100100011111011011111101110",
    "1011001100110001100011001001001000111",
    "1010100000011100000011100011000011010",
    "0011111001001011111010101111101001110",
    "1101100110101100110001100100111100110",
    "0111101110000100001110011101110110111",
    "1000010001110011001001100110001111000",
    "0011001000010000001101000101010111000",
    "0001010111010000000001001011101111101",
    "1100111110111000110101011000111110111",
    "0000000011010110001000110010100011000",
    "1111111011110110100110011110101011100",
    "1000001010110001011110010000100010100",
    "1011101011010000011100100000111111111",
    "1011101000000010100111101010101001100",
    "1011101001011011111110111010001100110",
    "1000001001110010010110010011001000110",
    "1111111000111000111100101001000100111"
  ];

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const pad = (n) => String(n).padStart(2, "0");
  const axisByKey = Object.fromEntries(AXES.map((axis) => [axis.key, axis]));
  const axisByLetter = {};
  AXES.forEach((axis) => {
    axisByLetter[axis.a] = axis;
    axisByLetter[axis.b] = axis;
  });

  let state = {
    answers: {},
    current: 0,
    displayOrder: {},
    result: null,
    advancing: false
  };

  let lastSavedResult = null;
  let toastTimer = null;
  let shareCardBlob = null;
  let shareCardName = "疯格-MAD16.png";

  function escapeHTML(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function safeGet(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  function safeSet(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (error) {
      /* Local storage can be unavailable on file:// in some browsers. */
    }
  }

  function safeRemove(key) {
    try {
      window.localStorage.removeItem(key);
    } catch (error) {
      /* no-op */
    }
  }

  function hashString(value) {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i += 1) {
      hash ^= value.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a += 0x6d2b79f5;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffle(array, seed) {
    const rand = mulberry32(seed);
    const result = array.slice();
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rand() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  function sigil(code) {
    const type = TYPES[code];
    if (!type) return "";
    const isE = code[0] === "E";
    const isC = code[1] === "C";
    const isN = code[2] === "N";
    const isH = code[3] === "H";
    const seed = hashString(code);
    const rand = mulberry32(seed);
    const cx = 100;
    const cy = 100;
    const accent = type.color;
    const soft = type.soft;
    const ink = type.ink;
    const rays = [];
    const dots = [];
    const waves = [];
    const grid = [];

    for (let i = 0; i < 28; i += 1) {
      const angle = (Math.PI * 2 * i) / 28 - Math.PI / 2;
      const outer = 94;
      const inner = isE ? 82 : 70;
      const x1 = cx + Math.cos(angle) * inner;
      const y1 = cy + Math.sin(angle) * inner;
      const x2 = cx + Math.cos(angle) * outer;
      const y2 = cy + Math.sin(angle) * outer;
      rays.push(
        `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${ink}" stroke-width="${i % 4 === 0 ? 2 : 1}" opacity="${i % 4 === 0 ? 0.9 : 0.52}"/>`
      );
    }

    if (!isC) {
      for (let i = 0; i < 12; i += 1) {
        const angle = rand() * Math.PI * 2;
        const radius = 18 + rand() * 42;
        dots.push(
          `<circle cx="${(cx + Math.cos(angle) * radius).toFixed(1)}" cy="${(cy + Math.sin(angle) * radius).toFixed(1)}" r="${(1.5 + rand() * 3).toFixed(1)}" fill="${accent}" opacity="${(0.45 + rand() * 0.5).toFixed(2)}"/>`
        );
      }
    }

    if (isN) {
      for (let line = 0; line < 3; line += 1) {
        let d = "";
        for (let step = 0; step <= 12; step += 1) {
          const x = 28 + step * 4;
          const y = 50 + line * 22 + Math.sin(step * 1.35 + line * 1.7 + seed % 7) * 7;
          d += `${step === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)} `;
        }
        waves.push(
          `<path d="${d}" fill="none" stroke="${line === 1 ? accent : ink}" stroke-width="${line === 1 ? 2.4 : 1}" opacity="${line === 1 ? 0.9 : 0.4}"/>`
        );
      }
    } else {
      for (let i = 0; i < 4; i += 1) {
        grid.push(
          `<line x1="${36 + i * 18}" y1="34" x2="${36 + i * 18}" y2="166" stroke="${ink}" stroke-width="1" opacity="0.22"/>`,
          `<line x1="34" y1="${36 + i * 18}" x2="166" y2="${36 + i * 18}" stroke="${ink}" stroke-width="1" opacity="0.22"/>`
        );
      }
    }

    const centerShape = isH
      ? `<path d="M100 52 L112 86 L146 74 L124 100 L146 126 L112 114 L100 148 L88 114 L54 126 L76 100 L54 74 L88 86 Z" fill="${soft}" stroke="${ink}" stroke-width="2.2"/>`
      : `<path d="M100 54 L126 100 L100 146 L74 100 Z" fill="${soft}" stroke="${ink}" stroke-width="2.2"/><path d="M100 72 L114 100 L100 128 L86 100 Z" fill="${accent}" opacity="0.42"/>`;

    const rings = isC
      ? `<circle cx="100" cy="100" r="56" fill="none" stroke="${ink}" stroke-width="1.2" opacity="0.55"/>
         <circle cx="100" cy="100" r="42" fill="none" stroke="${ink}" stroke-width="1" opacity="0.34"/>
         <circle cx="100" cy="100" r="28" fill="none" stroke="${ink}" stroke-width="1" opacity="0.22"/>`
      : `<circle cx="100" cy="100" r="58" fill="none" stroke="${accent}" stroke-width="1.2" opacity="0.6" stroke-dasharray="4 7"/>`;

    return `
      <svg viewBox="0 0 200 200" role="img" aria-label="${escapeHTML(type.name)} 的图形标记">
        <defs>
          <filter id="soft-${code}" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="0.35"/>
          </filter>
        </defs>
        <circle cx="100" cy="100" r="66" fill="${soft}" stroke="${ink}" stroke-width="1.5"/>
        <circle cx="100" cy="100" r="88" fill="none" stroke="${ink}" stroke-width="1.5"/>
        <circle cx="100" cy="100" r="72" fill="none" stroke="${ink}" stroke-width="1" opacity="0.3" stroke-dasharray="2 6"/>
        ${grid.join("")}
        ${rays.join("")}
        ${rings}
        ${dots.join("")}
        ${centerShape}
        ${waves.join("")}
        <circle cx="100" cy="100" r="4.5" fill="${ink}"/>
        <circle cx="100" cy="100" r="9" fill="none" stroke="${accent}" stroke-width="1.4"/>
      </svg>
    `;
  }

  function typeInitial(code) {
    return TYPES[code] ? TYPES[code].name.charAt(0) : "?";
  }

  function dominantForCode(code, axisKey) {
    const index = AXES.findIndex((axis) => axis.key === axisKey);
    return code[index];
  }

  function miniBars(code) {
    return AXES.map((axis) => {
      const letter = dominantForCode(code, axis.key);
      const pct = 64 + (hashString(code + axis.key) % 23);
      const name = axis.a === letter ? axis.aName : axis.bName;
      return `
        <div class="mini-bar">
          <span>${letter}</span>
          <span class="mini-bar-track"><i class="mini-bar-fill" style="width:${pct}%;background:${TYPES[code].color}"></i></span>
          <span class="mini-bar-value">${name}</span>
        </div>
      `;
    }).join("");
  }

  function typeCardBars(code) {
    return AXES.map((axis, index) => {
      const pct = 58 + (hashString(code + index) % 34);
      return `<i class="${index % 2 === 0 ? "on" : ""}" style="flex:${pct};background:${index % 2 === 0 ? TYPES[code].color : "rgba(17,17,15,.22)"}"></i>`;
    }).join("");
  }

  function renderStats() {
    const grid = $("#stats-grid");
    if (!grid) return;
    grid.innerHTML = STATS.map((stat, index) => `
      <article class="stat-card">
        <div class="stat-value" data-value="${stat.value}" data-decimals="${stat.decimals}">
          <span class="stat-number">0</span><small>${escapeHTML(stat.suffix)}</small>
        </div>
        <p class="stat-label">${escapeHTML(stat.label)}</p>
        <p class="stat-note">${escapeHTML(stat.note)}</p>
      </article>
    `).join("");
    const values = $$(".stat-value", grid);
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const node = entry.target;
        if (node.dataset.animated === "true") return;
        node.dataset.animated = "true";
        animateStat(node);
        observer.unobserve(node);
      });
    }, { threshold: 0.4 });
    values.forEach((node) => observer.observe(node));
  }

  function animateStat(node) {
    const target = Number(node.dataset.value || 0);
    const decimals = Number(node.dataset.decimals || 0);
    const numberNode = $(".stat-number", node);
    const duration = 1100;
    const start = performance.now();
    function frame(now) {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = target * eased;
      numberNode.textContent = decimals > 0 ? value.toFixed(decimals) : Math.round(value).toLocaleString("en-US");
      if (progress < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function renderFamilies() {
    const grid = $("#families-grid");
    if (!grid) return;
    grid.innerHTML = FAMILIES.map((family) => `
      <article class="family-card">
        <span class="family-no">${family.no}</span>
        <div class="family-head">
          <div>
            <span class="family-index">FAMILY ${family.no}</span>
            <h3>${escapeHTML(family.name)}</h3>
          </div>
        </div>
        <div class="family-tags">
          ${family.tags.map((tag) => `<span class="tag">${escapeHTML(tag)}</span>`).join("")}
        </div>
        <p class="family-line">${escapeHTML(family.line)}</p>
        <p class="family-mechanism">MECHANISM / ${escapeHTML(family.mechanism)}</p>
        <div class="family-split">
          <div class="gain">
            <strong>可能换来的</strong>
            <p>${escapeHTML(family.gain)}</p>
          </div>
          <div class="cost">
            <strong>可能要付的</strong>
            <p>${escapeHTML(family.cost)}</p>
          </div>
        </div>
      </article>
    `).join("");
  }

  function renderAxes() {
    const list = $("#axes-list");
    if (!list) return;
    const secondaryColors = {
      EI: "#2F5BFF",
      CA: "#FF7A00",
      NR: "#0E7C7B",
      HL: "#8E2DE2"
    };
    list.innerHTML = AXES.map((axis, index) => `
      <article class="axis-card" style="--axis-a:${axis.color};--axis-b:${secondaryColors[axis.key] || "#d9d2c4"}">
        <div class="axis-title">
          <span class="axis-number">${pad(index + 1)}</span>
          <h3>${escapeHTML(axis.label)}</h3>
          <p>${escapeHTML(axis.question)}</p>
        </div>
        <div class="axis-visual">
          <div class="axis-poles">
            <div class="axis-pole">
              <strong>${axis.a} · ${escapeHTML(axis.aName)}</strong>
              <span>${escapeHTML(axis.aTag)}</span>
            </div>
            <div class="axis-pole">
              <strong>${axis.b} · ${escapeHTML(axis.bName)}</strong>
              <span>${escapeHTML(axis.bTag)}</span>
            </div>
          </div>
          <div class="axis-track">
            <span class="axis-marker" data-axis-marker="${axis.key}" style="left:50%"></span>
          </div>
          <div class="axis-descriptions">
            <div class="axis-description">
              <strong>${axis.a} / ${escapeHTML(axis.aName)}</strong>
              ${escapeHTML(axis.aDesc)}
            </div>
            <div class="axis-description">
              <strong>${axis.b} / ${escapeHTML(axis.bName)}</strong>
              ${escapeHTML(axis.bDesc)}
            </div>
          </div>
        </div>
      </article>
    `).join("");
  }

  function renderFilters() {
    const wrap = $("#type-filters");
    if (!wrap) return;
    const filters = [{ value: "all", label: "全部 16" }];
    AXES.forEach((axis) => {
      filters.push({ value: axis.a, label: `${axis.a} ${axis.aName}` });
      filters.push({ value: axis.b, label: `${axis.b} ${axis.bName}` });
    });
    wrap.innerHTML = filters.map((filter, index) => `
      <button class="filter-chip${index === 0 ? " is-active" : ""}" type="button" data-filter="${filter.value}">
        ${escapeHTML(filter.label)}
      </button>
    `).join("");
    wrap.addEventListener("click", (event) => {
      const button = event.target.closest("[data-filter]");
      if (!button) return;
      $$(".filter-chip", wrap).forEach((chip) => chip.classList.toggle("is-active", chip === button));
      renderTypeGrid(button.dataset.filter);
    });
  }

  function renderTypeGrid(filter = "all") {
    const grid = $("#types-grid");
    if (!grid) return;
    const codes = Object.keys(TYPES).filter((code) => {
      if (filter === "all") return true;
      const axis = axisByLetter[filter];
      return axis ? code[AXES.indexOf(axis)] === filter : true;
    });
    grid.innerHTML = codes.map((code) => {
      const type = TYPES[code];
      return `
        <article class="type-card" role="button" tabindex="0" data-type="${code}" data-code="${code}" style="--soft:${type.soft}">
          <div class="type-card-top">
            <span class="type-card-code">${code}</span>
            <span class="type-card-sigil">${sigil(code)}</span>
          </div>
          <h3>${escapeHTML(type.name)}</h3>
          <p>${escapeHTML(type.tagline)}</p>
          <div class="type-card-tags">
            ${type.keywords.map((keyword) => `<span>${escapeHTML(keyword)}</span>`).join("")}
          </div>
          <div class="type-card-bars">${typeCardBars(code)}</div>
        </article>
      `;
    }).join("");
    $$(".type-card", grid).forEach((card) => {
      card.addEventListener("click", () => openType(card.dataset.type));
      card.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openType(card.dataset.type);
        }
      });
    });
  }

  function renderFeatured() {
    const now = new Date();
    const seed = Number(`${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`);
    const codes = Object.keys(TYPES);
    const code = codes[seed % codes.length];
    const type = TYPES[code];
    const sigilNode = $("#featured-sigil");
    if (!sigilNode) return;
    $("#featured-code").textContent = code;
    $("#featured-name").textContent = type.name;
    $("#featured-tagline").textContent = type.tagline;
    $("#featured-no").textContent = `NO. ${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
    sigilNode.innerHTML = sigil(code);
    $("#featured-bars").innerHTML = miniBars(code);
    $("#featured-card").style.background = `linear-gradient(145deg, ${type.soft} 0%, var(--paper-light) 72%)`;
    $("#featured-open").addEventListener("click", () => openType(code));
  }

  function renderSources() {
    const grid = $("#sources-grid");
    if (!grid) return;
    grid.innerHTML = SOURCES.map((source) => `
      <article class="source-card">
        <span class="source-kicker">${escapeHTML(source.kicker)}</span>
        <h3>${escapeHTML(source.title)}</h3>
        <p class="source-meta">${escapeHTML(source.meta)}</p>
        <p class="source-finding">${escapeHTML(source.finding)}</p>
        <p class="source-caveat"><strong>别误读 /</strong> ${escapeHTML(source.caveat)}</p>
        <a class="source-link" href="${escapeHTML(source.url)}" target="_blank" rel="noreferrer">查看来源 <span>↗</span></a>
      </article>
    `).join("");
  }

  function openType(code) {
    const type = TYPES[code];
    if (!type) return;
    const modal = $("#type-modal");
    const content = $("#type-modal-content");
    const best = TYPES[type.best];
    const worst = TYPES[type.worst];
    content.innerHTML = `
      <div class="modal-hero" style="--soft:${type.soft}">
        <div>
          <span class="modal-code">${code} / ${escapeHTML(type.en)}</span>
          <h2>${escapeHTML(type.name)}</h2>
          <p>${escapeHTML(type.tagline)}</p>
          <p class="modal-quote">${escapeHTML(type.quote)}</p>
          <div class="modal-tag-row">
            ${type.keywords.map((keyword) => `<span class="tag">${escapeHTML(keyword)}</span>`).join("")}
            <span class="tag">社交面具：${escapeHTML(type.mask)}</span>
          </div>
        </div>
        <div class="modal-sigil">${sigil(code)}</div>
      </div>
      <div class="modal-sections">
        <section class="modal-section">
          <h3>一句话机制</h3>
          <p>${escapeHTML(type.core)}</p>
        </section>
        <div class="modal-split">
          <section class="modal-section">
            <h3>判定标准</h3>
            <ol class="criteria-list">
              ${type.criteria.map((item) => `<li>${escapeHTML(item)}</li>`).join("")}
            </ol>
          </section>
          <section class="modal-section">
            <h3>发作现场</h3>
            <ul class="bullet-list">
              ${type.symptoms.map((item) => `<li>${escapeHTML(item)}</li>`).join("")}
            </ul>
          </section>
        </div>
        <div class="modal-split">
          <section class="modal-section">
            <h3>隐藏技能</h3>
            <ul class="bullet-list">
              ${type.strengths.map((item) => `<li>${escapeHTML(item)}</li>`).join("")}
            </ul>
          </section>
          <section class="modal-section">
            <h3>使用代价</h3>
            <ul class="bullet-list">
              ${type.costs.map((item) => `<li>${escapeHTML(item)}</li>`).join("")}
            </ul>
          </section>
        </div>
        <section class="modal-section">
          <h3>本周处方</h3>
          <div class="rx-grid" style="--soft:${type.soft}">
            ${type.rx.map((item) => `<div class="rx-card"><p>${escapeHTML(item)}</p></div>`).join("")}
          </div>
        </section>
        <div class="modal-split">
          <section class="modal-section">
            <h3>搭子与克星</h3>
            <div class="result-compat">
              <article class="compat-card" role="button" tabindex="0" data-type="${type.best}">
                <span>BEST MATCH / 搭子</span>
                <strong>${type.best} ${escapeHTML(best.name)}</strong>
                <small>${escapeHTML(best.tagline)}</small>
              </article>
              <article class="compat-card" role="button" tabindex="0" data-type="${type.worst}">
                <span>HARD MODE / 克星</span>
                <strong>${type.worst} ${escapeHTML(worst.name)}</strong>
                <small>${escapeHTML(worst.tagline)}</small>
              </article>
            </div>
          </section>
          <section class="modal-section">
            <h3>使用说明</h3>
            <p class="modal-note">
              这是一张叙事标签，不是人格判决书。它描述的是「最近一个月更常用的应对方式」，
              不是你的全部。类型会随着压力、睡眠、关系和处境变化。
            </p>
          </section>
        </div>
      </div>
    `;
    modal.hidden = false;
    syncBodyLock();
    $$("[data-type]", content).forEach((node) => {
      node.addEventListener("click", () => openType(node.dataset.type));
      node.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openType(node.dataset.type);
        }
      });
    });
    $(".modal-close", modal).focus({ preventScroll: true });
  }

  function closeType() {
    $("#type-modal").hidden = true;
    syncBodyLock();
  }

  function syncBodyLock() {
    const testOpen = !$("#test-overlay").hidden;
    const modalOpen = !$("#type-modal").hidden;
    const shareOpen = !$("#share-sheet").hidden;
    document.body.classList.toggle("is-locked", testOpen || modalOpen || shareOpen);
  }

  function showToast(message) {
    const toast = $("#toast");
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 2400);
  }

  function loadProgress() {
    const raw = safeGet(TEST_KEY);
    if (!raw) return false;
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return false;
      if (Number(parsed.questionCount) !== QUESTIONS.length) {
        safeRemove(TEST_KEY);
        return false;
      }
      const answers = parsed.answers && typeof parsed.answers === "object" ? parsed.answers : {};
      Object.keys(answers).forEach((key) => {
        if (!QUESTIONS.some((question) => question.id === key)) delete answers[key];
      });
      const answered = Object.keys(answers).length;
      if (answered === 0) return false;
      state.answers = answers;
      state.current = Math.min(QUESTIONS.length - 1, Math.max(0, Number(parsed.current) || 0));
      state.displayOrder = parsed.displayOrder && typeof parsed.displayOrder === "object" ? parsed.displayOrder : {};
      return true;
    } catch (error) {
      safeRemove(TEST_KEY);
      return false;
    }
  }

  function saveProgress() {
    safeSet(TEST_KEY, JSON.stringify({
      questionCount: QUESTIONS.length,
      answers: state.answers,
      current: state.current,
      displayOrder: state.displayOrder
    }));
  }

  function loadLastResult() {
    const raw = safeGet(RESULT_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || !TYPES[parsed.code] || !Array.isArray(parsed.rows) || Number(parsed.questionCount) !== QUESTIONS.length) {
        safeRemove(RESULT_KEY);
        return null;
      }
      return parsed;
    } catch (error) {
      safeRemove(RESULT_KEY);
      return null;
    }
  }

  function renderLastResultChip() {
    if (!lastSavedResult) return;
    const meta = $(".hero-meta");
    if (!meta) return;
    const previous = $(".last-result-chip", meta);
    if (previous) previous.remove();
    const type = TYPES[lastSavedResult.code];
    const button = document.createElement("button");
    button.type = "button";
    button.className = "last-result-chip";
    button.innerHTML = `上次诊断：${lastSavedResult.code} ${escapeHTML(type.name)} <span>查看 →</span>`;
    button.addEventListener("click", () => showSavedResult(lastSavedResult));
    meta.appendChild(button);
  }

  function showSavedResult(result) {
    $("#test-overlay").hidden = false;
    syncBodyLock();
    $("#test-overlay").scrollTop = 0;
    $("#test-question-view").hidden = true;
    $("#test-result-view").hidden = false;
    $("#test-progress-label").textContent = "上次结果";
    $("#test-progress-fill").style.width = "100%";
    $("#test-dots").innerHTML = QUESTIONS.map(() => `<i class="done"></i>`).join("");
    renderResult(result);
  }

  function updateAxisMarkers(result) {
    const savedRows = result && (Array.isArray(result.axes) ? result.axes : result.rows);
    AXES.forEach((axis) => {
      const marker = $(`[data-axis-marker="${axis.key}"]`);
      if (!marker) return;
      let pct = 50;
      if (savedRows) {
        const row = savedRows.find((item) => (item.axis && item.axis.key === axis.key) || item.key === axis.key);
        if (row) pct = row.pctA;
        if (row && pct === undefined) {
          pct = row.winner === axis.a ? row.pct : 100 - row.pct;
        }
      }
      marker.style.left = `${Math.max(3, Math.min(97, pct))}%`;
    });
  }

  function openTest() {
    const overlay = $("#test-overlay");
    overlay.hidden = false;
    syncBodyLock();
    overlay.scrollTop = 0;
    showQuestionView();
    renderQuestion();
  }

  function closeTest() {
    const answered = Object.keys(state.answers).length;
    $("#test-overlay").hidden = true;
    syncBodyLock();
    if (answered > 0 && answered < QUESTIONS.length) {
      showToast("进度已保留，下次可以接着做。");
    } else {
      showToast("已关闭。");
    }
  }

  function startTest(options = {}) {
    const fresh = Boolean(options.fresh);
    const hasProgress = fresh ? false : loadProgress();
    if (fresh) {
      state.answers = {};
      state.current = 0;
      state.displayOrder = {};
      state.result = null;
      safeRemove(TEST_KEY);
    } else if (!hasProgress) {
      state.answers = {};
      state.current = 0;
      state.displayOrder = {};
      state.result = null;
    }
    state.advancing = false;
    openTest();
  }

  function showQuestionView() {
    $("#test-question-view").hidden = false;
    $("#test-result-view").hidden = true;
    $("#test-progress-label").textContent = `第 ${pad(state.current + 1)} / ${QUESTIONS.length} 题`;
  }

  function renderQuestion() {
    const question = QUESTIONS[state.current];
    if (!question) return;
    const axis = axisByKey[question.axis];
    const answered = Object.keys(state.answers).length;
    const progress = ((state.current + 1) / QUESTIONS.length) * 100;

    $("#test-progress-label").textContent = `第 ${pad(state.current + 1)} / ${QUESTIONS.length} 题`;
    $("#test-progress-fill").style.width = `${progress}%`;
    $("#question-index").textContent = `QUESTION ${pad(state.current + 1)}`;
    $("#question-axis").textContent = axis.label;
    $("#question-text").textContent = question.text;

    const dots = $("#test-dots");
    dots.innerHTML = QUESTIONS.map((item, index) => {
      const done = Boolean(state.answers[item.id]);
      const current = index === state.current;
      return `<i class="${done ? "done" : ""}${current ? " current" : ""}"></i>`;
    }).join("");

    if (!state.displayOrder[question.id]) {
      state.displayOrder[question.id] = shuffle([0, 1], hashString(question.id + question.text));
    }
    const order = state.displayOrder[question.id];
    const options = $("#question-options");
    options.innerHTML = order.map((optionIndex, displayIndex) => {
      const option = question.options[optionIndex];
      const selected = state.answers[question.id] === option.pole;
      return `
        <button class="option-btn${selected ? " is-selected" : ""}" type="button" data-pole="${option.pole}">
          <span class="option-key">${displayIndex === 0 ? "1" : "2"}</span>
          <span>${escapeHTML(option.text)}</span>
        </button>
      `;
    }).join("");
    $$(".option-btn", options).forEach((button) => {
      button.addEventListener("click", () => choose(button.dataset.pole));
    });

    $("#test-back").disabled = state.current === 0;
    $("#test-back").style.opacity = state.current === 0 ? "0.3" : "1";
    const answeredCount = Object.keys(state.answers).length;
    if (answeredCount > 0) {
      $("#test-progress-label").textContent = `第 ${pad(state.current + 1)} / ${QUESTIONS.length} 题 · 已完成 ${answeredCount}`;
    }
  }

  function choose(pole) {
    if (state.advancing) return;
    state.advancing = true;
    const question = QUESTIONS[state.current];
    state.answers[question.id] = pole;
    saveProgress();
    const selected = $(`.option-btn[data-pole="${pole}"]`);
    if (selected) selected.classList.add("is-selected");
    window.setTimeout(() => {
      if (state.current < QUESTIONS.length - 1) {
        state.current += 1;
        saveProgress();
        state.advancing = false;
        renderQuestion();
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        state.advancing = false;
        finishTest();
      }
    }, 210);
  }

  function goBack() {
    if (state.current === 0) {
      showToast("已经是第一题了。");
      return;
    }
    state.current -= 1;
    saveProgress();
    renderQuestion();
  }

  function computeResult() {
    const counts = { E: 0, I: 0, C: 0, A: 0, N: 0, R: 0, H: 0, L: 0 };
    QUESTIONS.forEach((question) => {
      const pole = state.answers[question.id];
      if (pole && counts[pole] !== undefined) counts[pole] += 1;
    });

    const rows = AXES.map((axis) => {
      const aCount = counts[axis.a];
      const bCount = counts[axis.b];
      const total = aCount + bCount || 1;
      const winner = aCount > bCount ? axis.a : axis.b;
      const pctA = Math.round((aCount / total) * 100);
      const pctB = 100 - pctA;
      const winnerPct = winner === axis.a ? pctA : pctB;
      return {
        axis,
        aCount,
        bCount,
        total,
        winner,
        pctA,
        pctB,
        pct: winnerPct,
        margin: Math.abs(aCount - bCount)
      };
    });

    const code = rows.map((row) => row.winner).join("");
    const closest = rows.reduce((min, row) => (row.margin < min.margin ? row : min), rows[0]);
    const flipMap = { E: "I", I: "E", C: "A", A: "C", N: "R", R: "N", H: "L", L: "H" };
    const altCode = code
      .split("")
      .map((letter, index) => (rows[index] === closest ? flipMap[letter] : letter))
      .join("");
    const clarity = Math.round(rows.reduce((sum, row) => sum + row.pct, 0) / rows.length);
    const stableAxes = rows.filter((row) => row.margin >= 2).length;
    let band = "混合态";
    if (clarity >= 90) band = "高纯度";
    else if (clarity >= 76) band = "典型型";
    else if (clarity >= 62) band = "倾向型";

    return {
      questionCount: QUESTIONS.length,
      code,
      altCode,
      rows,
      counts,
      clarity,
      band,
      stableAxes,
      closestAxis: closest.axis,
      createdAt: new Date().toISOString()
    };
  }

  function finishTest() {
    const result = computeResult();
    state.result = result;
    lastSavedResult = result;
    safeSet(RESULT_KEY, JSON.stringify(result));
    safeRemove(TEST_KEY);

    $("#test-question-view").hidden = true;
    $("#test-result-view").hidden = false;
    $("#test-progress-label").textContent = "鉴定完成";
    $("#test-progress-fill").style.width = "100%";
    $("#test-dots").innerHTML = QUESTIONS.map(() => `<i class="done"></i>`).join("");
    $("#result-content").innerHTML = `
      <div class="result-loading">
        <div class="loader-stamp"><span>疯</span></div>
        <p>正在把你的精神状态归档…</p>
        <small>CALCULATING 4 AXES / MATCHING 16 TYPES</small>
      </div>
    `;
    window.scrollTo({ top: 0, behavior: "smooth" });
    window.setTimeout(() => {
      renderResult(result);
      updateAxisMarkers(result);
      renderLastResultChip();
      $("#test-overlay").scrollTop = 0;
    }, 1050);
  }

  function renderResult(result) {
    const type = TYPES[result.code];
    const alt = TYPES[result.altCode];
    if (!type || !alt) return;
    const now = new Date();
    const dateLabel = `${now.getFullYear()}.${pad(now.getMonth() + 1)}.${pad(now.getDate())}`;
    const closest = result.closestAxis;
    const axisMarkup = result.rows.map((row) => {
      const winnerName = row.axis.a === row.winner ? row.axis.aName : row.axis.bName;
      return `
        <div class="result-axis">
          <div class="result-axis-label">
            <strong>${row.winner}</strong>
            <span>${escapeHTML(winnerName)}</span>
          </div>
          <div class="result-axis-track">
            <div class="result-axis-fill" style="width:${row.pct}%;background:${type.color}"></div>
          </div>
          <span class="result-axis-value">${row.pct}%</span>
        </div>
      `;
    }).join("");

    const logicMarkup = result.rows.map((row) => {
      return `<div><code>${row.axis.a} ${row.aCount} / ${row.axis.b} ${row.bCount}</code> → ${row.winner} · ${row.axis.a === row.winner ? row.axis.aName : row.axis.bName} ${row.pct}%</div>`;
    }).join("");

    $("#result-content").innerHTML = `
      <div class="result-hero" style="--soft:${type.soft};--accent:${type.color}">
        <div>
          <div class="result-kicker">鉴定结果 · ${dateLabel}</div>
          <span class="result-code" style="background:${type.soft}">${result.code}</span>
          <h2 class="result-name">${escapeHTML(type.name)}</h2>
          <p class="result-tagline">${escapeHTML(type.tagline)}</p>
          <p class="result-quote">${escapeHTML(type.quote)}</p>
          <span class="result-mask">社交面具：${escapeHTML(type.mask)}</span>
        </div>
        <div class="result-sigil">${sigil(result.code)}</div>
      </div>

      <section class="result-block">
        <div class="result-block-head">
          <h3>你的疯癫配方</h3>
          <span>4 AXES / CLARITY ${result.clarity}% · ${escapeHTML(result.band)}</span>
        </div>
        <p class="result-core">${escapeHTML(type.core)}</p>
        <div class="result-axis-list" style="--soft:${type.soft}">${axisMarkup}</div>
        <details class="result-logic">
          <summary>查看判定逻辑 / 你的轴分数</summary>
          <div class="result-logic-body">
            ${logicMarkup}
            <div style="margin-top:10px">主型 <code>${result.code}</code>；最接近翻转的轴是 <code>${closest.label}</code>
            （${closest.margin} 分差）；如果这一轴反过来，你会接近 <code>${result.altCode}</code> ${escapeHTML(alt.name)}。
            四轴中有 <code>${result.stableAxes}/4</code> 轴的差距 ≥ 2 分。清晰度是四条轴主导极占比的平均值，不是心理测量学的信度。</div>
          </div>
        </details>
      </section>

      <section class="result-block">
        <div class="result-block-head">
          <h3>怎么判断是不是你</h3>
          <span>NOT A DIAGNOSIS / 3 CRITERIA</span>
        </div>
        <div class="result-grid-2">
          <div>
            <ol class="criteria-list">
              ${type.criteria.map((item) => `<li>${escapeHTML(item)}</li>`).join("")}
            </ol>
          </div>
          <div>
            <h4 style="margin:0 0 10px;font-family:var(--serif);font-size:20px">发作现场</h4>
            <ul class="bullet-list">
              ${type.symptoms.map((item) => `<li>${escapeHTML(item)}</li>`).join("")}
            </ul>
          </div>
        </div>
      </section>

      <section class="result-block">
        <div class="result-block-head">
          <h3>隐藏技能 / 使用代价</h3>
          <span>THE GOOD / THE BILL</span>
        </div>
        <div class="result-grid-2">
          <div>
            <h4 style="margin:0 0 10px;font-family:var(--serif);font-size:20px">你靠它活下来的部分</h4>
            <ul class="bullet-list">
              ${type.strengths.map((item) => `<li>${escapeHTML(item)}</li>`).join("")}
            </ul>
          </div>
          <div>
            <h4 style="margin:0 0 10px;font-family:var(--serif);font-size:20px">它可能让你付的账</h4>
            <ul class="bullet-list">
              ${type.costs.map((item) => `<li>${escapeHTML(item)}</li>`).join("")}
            </ul>
          </div>
        </div>
      </section>

      <section class="result-block">
        <div class="result-block-head">
          <h3>本周处方</h3>
          <span>3 SMALL MOVES / 不要求你变正常</span>
        </div>
        <div class="rx-grid" style="--soft:${type.soft}">
          ${type.rx.map((item) => `<div class="rx-card"><p>${escapeHTML(item)}</p></div>`).join("")}
        </div>
      </section>

      <section class="result-block">
        <div class="result-block-head">
          <h3>搭子 / 克星 / 备用疯格</h3>
          <span>RELATIONSHIP WEATHER</span>
        </div>
        <div class="result-compat">
          <article class="compat-card" role="button" tabindex="0" data-type="${type.best}">
            <span>BEST MATCH / 搭子</span>
            <strong>${type.best} ${escapeHTML(TYPES[type.best].name)}</strong>
            <small>${escapeHTML(TYPES[type.best].tagline)}</small>
          </article>
          <article class="compat-card" role="button" tabindex="0" data-type="${type.worst}">
            <span>HARD MODE / 克星</span>
            <strong>${type.worst} ${escapeHTML(TYPES[type.worst].name)}</strong>
            <small>${escapeHTML(TYPES[type.worst].tagline)}</small>
          </article>
        </div>
        <div class="alt-type" style="margin-top:10px">
          <div>
            <h4>如果今天再累一点：${result.altCode} ${escapeHTML(alt.name)}</h4>
            <p>你的「${escapeHTML(closest.label)}」轴最接近中间。压力再偏一点，可能会滑向这个备用模式。</p>
          </div>
          <button class="btn btn-tiny btn-ghost" type="button" data-type="${result.altCode}">查看备用档案 →</button>
        </div>
      </section>

      <section class="result-actions">
        <button class="btn btn-primary btn-share" id="save-card" type="button">生成分享照片 <span>↗</span></button>
        <button class="btn btn-ghost" id="copy-result" type="button">复制结果文案</button>
        <button class="btn btn-ghost" id="retest" type="button">重新测一次</button>
        <button class="btn btn-ghost" id="browse-types" type="button">看全部 16 型</button>
      </section>
      <p class="result-fineprint">
        * 结果反映的是你在这 12 道题里的自我报告，不是临床评估。类型会变，人也会变。
        如果最近持续低落、失眠、功能受损，或出现自伤想法，请优先联系专业帮助。心理援助热线：12356。
      </p>
      <section class="result-share-nudge">
        <div>
          <span>SHARE CARD</span>
          <strong>把这张疯格发出去</strong>
          <p>照片自带本站二维码和网址。朋友扫一下，就能测自己的。</p>
        </div>
        <button class="btn btn-primary" type="button" data-start-share>生成分享照片 →</button>
      </section>
    `;

    $$("[data-type]", $("#result-content")).forEach((node) => {
      node.addEventListener("click", () => openType(node.dataset.type));
      node.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openType(node.dataset.type);
        }
      });
    });
    $("#save-card").addEventListener("click", () => downloadCard(result));
    $$("[data-start-share]", $("#result-content")).forEach((button) => {
      button.addEventListener("click", () => downloadCard(result));
    });
    $("#copy-result").addEventListener("click", () => copyResult(result));
    $("#retest").addEventListener("click", () => startTest({ fresh: true }));
    $("#browse-types").addEventListener("click", () => {
      closeTest();
      window.setTimeout(() => {
        $("#types").scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    });
  }

  function resultText(result) {
    const type = TYPES[result.code];
    const axisText = result.rows
      .map((row) => {
        const name = row.axis.a === row.winner ? row.axis.aName : row.axis.bName;
        return `${row.winner} ${name} ${row.pct}%`;
      })
      .join(" / ");
    return [
      `我的疯格：${result.code} ${type.name}`,
      `“${type.tagline}”`,
      axisText,
      `清晰度 ${result.clarity}% · ${result.band}`,
      `#疯格 #MAD16 #当代精神状态`
    ].join("\n");
  }

  async function copyResult(result) {
    const text = resultText(result);
    try {
      await navigator.clipboard.writeText(text);
      showToast("结果文案已复制。");
    } catch (error) {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand("copy");
        showToast("结果文案已复制。");
      } catch (fallbackError) {
        showToast("复制失败，请手动选中结果文字。");
      }
      textarea.remove();
    }
  }

  function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const chars = Array.from(text);
    let line = "";
    let currentY = y;
    chars.forEach((char) => {
      const test = line + char;
      if (ctx.measureText(test).width > maxWidth && line) {
        ctx.fillText(line, x, currentY);
        line = char;
        currentY += lineHeight;
      } else {
        line = test;
      }
    });
    if (line) ctx.fillText(line, x, currentY);
    return currentY;
  }

  function drawQRCode(ctx, x, y, size) {
    const count = QR_MATRIX.length;
    const cell = size / count;
    ctx.save();
    ctx.fillStyle = "#fbf8ef";
    ctx.fillRect(x, y, size, size);
    ctx.fillStyle = "#11110f";
    QR_MATRIX.forEach((row, rowIndex) => {
      for (let col = 0; col < row.length; col += 1) {
        if (row[col] === "1") {
          ctx.fillRect(
            Math.round(x + col * cell),
            Math.round(y + rowIndex * cell),
            Math.ceil(cell),
            Math.ceil(cell)
          );
        }
      }
    });
    ctx.restore();
  }

  function drawSigilCanvas(ctx, code, cx, cy, radius) {
    const type = TYPES[code];
    const isE = code[0] === "E";
    const isC = code[1] === "C";
    const isN = code[2] === "N";
    const isH = code[3] === "H";
    const rand = mulberry32(hashString(code));

    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = type.soft;
    ctx.strokeStyle = type.ink;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.globalAlpha = 0.55;
    for (let i = 0; i < 28; i += 1) {
      const angle = (Math.PI * 2 * i) / 28 - Math.PI / 2;
      const inner = radius * (isE ? 0.86 : 0.72);
      const outer = radius * 0.98;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
      ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.95, 0, Math.PI * 2);
    ctx.stroke();

    if (isC) {
      [0.58, 0.44, 0.3].forEach((scale) => {
        ctx.beginPath();
        ctx.arc(0, 0, radius * scale, 0, Math.PI * 2);
        ctx.globalAlpha = 0.55;
        ctx.stroke();
        ctx.globalAlpha = 1;
      });
    } else {
      for (let i = 0; i < 12; i += 1) {
        const angle = rand() * Math.PI * 2;
        const r = radius * (0.2 + rand() * 0.42);
        ctx.beginPath();
        ctx.arc(Math.cos(angle) * r, Math.sin(angle) * r, 2 + rand() * 4, 0, Math.PI * 2);
        ctx.fillStyle = type.color;
        ctx.globalAlpha = 0.6;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    if (isN) {
      for (let line = 0; line < 3; line += 1) {
        ctx.beginPath();
        for (let step = 0; step <= 16; step += 1) {
          const x = -radius * 0.6 + (step / 16) * radius * 1.2;
          const y = -radius * 0.18 + line * radius * 0.18 + Math.sin(step * 0.9 + line) * radius * 0.05;
          if (step === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = line === 1 ? type.color : type.ink;
        ctx.globalAlpha = line === 1 ? 1 : 0.45;
        ctx.lineWidth = line === 1 ? 4 : 2;
        ctx.stroke();
      }
    } else {
      ctx.globalAlpha = 0.25;
      ctx.lineWidth = 1;
      for (let i = -2; i <= 2; i += 1) {
        ctx.beginPath();
        ctx.moveTo(-radius * 0.55, i * radius * 0.22);
        ctx.lineTo(radius * 0.55, i * radius * 0.22);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(i * radius * 0.22, -radius * 0.55);
        ctx.lineTo(i * radius * 0.22, radius * 0.55);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    ctx.beginPath();
    if (isH) {
      for (let i = 0; i < 12; i += 1) {
        const angle = (Math.PI * 2 * i) / 12 - Math.PI / 2;
        const r = i % 2 === 0 ? radius * 0.36 : radius * 0.18;
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = type.color;
      ctx.globalAlpha = 0.38;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.stroke();
    } else {
      ctx.moveTo(0, -radius * 0.38);
      ctx.lineTo(radius * 0.28, 0);
      ctx.lineTo(0, radius * 0.38);
      ctx.lineTo(-radius * 0.28, 0);
      ctx.closePath();
      ctx.fillStyle = type.color;
      ctx.globalAlpha = 0.35;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.05, 0, Math.PI * 2);
    ctx.fillStyle = type.ink;
    ctx.fill();
    ctx.restore();
  }

  function downloadCard(result) {
    const type = TYPES[result.code];
    if (!type) return;
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1440;
    const ctx = canvas.getContext("2d");
    const paper = "#f2efe6";
    const ink = "#11110f";
    const muted = "#6f6a60";

    ctx.fillStyle = paper;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = ink;
    for (let x = 0; x < canvas.width; x += 8) {
      for (let y = 0; y < canvas.height; y += 8) {
        ctx.beginPath();
        ctx.arc(x, y, 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();

    ctx.fillStyle = type.soft;
    ctx.beginPath();
    ctx.arc(854, 286, 214, 0, Math.PI * 2);
    ctx.fill();

    drawSigilCanvas(ctx, result.code, 854, 286, 184);

    ctx.fillStyle = ink;
    ctx.font = '700 22px "SFMono-Regular", "Roboto Mono", monospace';
    ctx.fillText("疯格 / MAD TYPE INDEX", 72, 78);
    ctx.fillStyle = muted;
    ctx.font = '400 16px "SFMono-Regular", "Roboto Mono", monospace';
    ctx.fillText("NON-CLINICAL SELF-OBSERVATION / V0.1", 72, 108);

    ctx.fillStyle = type.color;
    ctx.beginPath();
    ctx.roundRect(72, 156, 138, 46, 10);
    ctx.fill();
    ctx.fillStyle = ink;
    ctx.font = '700 22px "SFMono-Regular", "Roboto Mono", monospace';
    ctx.fillText(result.code, 96, 187);

    ctx.fillStyle = ink;
    ctx.font = '700 108px "Songti SC", "STSong", serif';
    ctx.fillText(type.name, 66, 320);

    ctx.fillStyle = "#2b2a26";
    ctx.font = '500 34px "PingFang SC", "Hiragino Sans GB", sans-serif';
    wrapText(ctx, type.tagline, 72, 380, 620, 48);

    ctx.fillStyle = muted;
    ctx.font = '400 23px "Songti SC", "STSong", serif';
    wrapText(ctx, type.quote, 72, 466, 640, 38);

    const barStart = 650;
    ctx.fillStyle = muted;
    ctx.font = '400 16px "SFMono-Regular", "Roboto Mono", monospace';
    ctx.fillText("YOUR 4-AXIS FORMULA", 72, barStart - 22);
    result.rows.forEach((row, index) => {
      const y = barStart + index * 62;
      const name = row.axis.a === row.winner ? row.axis.aName : row.axis.bName;
      ctx.fillStyle = ink;
      ctx.font = '600 20px "PingFang SC", "Hiragino Sans GB", sans-serif';
      ctx.fillText(`${row.winner} ${name}`, 72, y + 8);
      ctx.fillStyle = "rgba(17,17,15,.12)";
      ctx.beginPath();
      ctx.roundRect(260, y - 9, 600, 16, 8);
      ctx.fill();
      ctx.fillStyle = type.color;
      ctx.beginPath();
      ctx.roundRect(260, y - 9, 600 * (row.pct / 100), 16, 8);
      ctx.fill();
      ctx.fillStyle = muted;
      ctx.font = '400 16px "SFMono-Regular", "Roboto Mono", monospace';
      ctx.fillText(`${row.pct}%`, 884, y + 6);
    });

    const strengthY = 948;
    ctx.fillStyle = ink;
    ctx.font = '700 28px "Songti SC", "STSong", serif';
    ctx.fillText("隐藏技能", 72, strengthY);
    ctx.fillStyle = "#2b2a26";
    ctx.font = '400 22px "PingFang SC", "Hiragino Sans GB", sans-serif';
    type.strengths.slice(0, 2).forEach((item, index) => {
      ctx.fillStyle = type.color;
      ctx.beginPath();
      ctx.arc(82, strengthY + 44 + index * 42, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#2b2a26";
      ctx.fillText(item, 100, strengthY + 52 + index * 42);
    });

    ctx.fillStyle = ink;
    ctx.font = '700 28px "Songti SC", "STSong", serif';
    ctx.fillText("本周处方", 552, strengthY);
    ctx.fillStyle = "#2b2a26";
    ctx.font = '400 22px "PingFang SC", "Hiragino Sans GB", sans-serif';
    wrapText(ctx, type.rx[0], 552, strengthY + 46, 440, 36);

    ctx.fillStyle = "rgba(17,17,15,.22)";
    ctx.fillRect(72, 1108, 936, 2);

    drawQRCode(ctx, 72, 1146, 236);
    ctx.strokeStyle = "rgba(17,17,15,.24)";
    ctx.lineWidth = 2;
    ctx.strokeRect(72, 1146, 236, 236);

    ctx.fillStyle = ink;
    ctx.font = '700 36px "Songti SC", "STSong", serif';
    ctx.fillText("扫码测测你的疯格", 348, 1192);
    ctx.fillStyle = muted;
    ctx.font = '400 22px "PingFang SC", "Hiragino Sans GB", sans-serif';
    wrapText(ctx, "12 道题 · 4 个轴 · 16 种疯格 · 约 1 分钟", 348, 1238, 620, 36);

    ctx.fillStyle = type.color;
    ctx.beginPath();
    ctx.roundRect(348, 1294, 660, 62, 12);
    ctx.fill();
    ctx.fillStyle = ink;
    ctx.font = '700 21px "SFMono-Regular", "Roboto Mono", monospace';
    ctx.fillText(SITE_URL, 370, 1334);

    ctx.fillStyle = muted;
    ctx.font = '400 17px "PingFang SC", "Hiragino Sans GB", sans-serif';
    ctx.fillText("非临床自我观察 · 不诊断、不治疗、不替代专业帮助", 348, 1392);

    ctx.textAlign = "right";
    ctx.fillStyle = ink;
    ctx.font = '700 17px "SFMono-Regular", "Roboto Mono", monospace';
    ctx.fillText("#疯格 #MAD16", 1008, 1392);
    ctx.textAlign = "left";

    canvas.toBlob((blob) => {
      if (!blob) {
        showToast("生成图片失败，请重试。");
        return;
      }
      openShareSheet(blob, `疯格-${result.code}-${type.name}.png`);
    }, "image/png");
  }

  function openShareSheet(blob, filename) {
    const preview = $("#share-preview");
    const sheet = $("#share-sheet");
    if (!preview || !sheet) return;
    if (shareCardBlob) URL.revokeObjectURL(shareCardBlob.url);
    shareCardName = filename;
    const url = URL.createObjectURL(blob);
    shareCardBlob = { blob, url };
    preview.innerHTML = `<img src="${url}" alt="${escapeHTML(filename)}" width="1080" height="1440">`;
    sheet.hidden = false;
    document.body.classList.add("is-locked");
    sheet.scrollTop = 0;
    $("#share-save").focus({ preventScroll: true });
  }

  function closeShareSheet() {
    const sheet = $("#share-sheet");
    if (!sheet || sheet.hidden) return;
    sheet.hidden = true;
    syncBodyLock();
  }

  function saveShareCard() {
    if (!shareCardBlob) return;
    const link = document.createElement("a");
    link.href = shareCardBlob.url;
    link.download = shareCardName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    showToast("已保存到你的下载目录。");
  }

  async function shareCardNatively() {
    if (!shareCardBlob) return;
    const file = new File([shareCardBlob.blob], shareCardName, { type: "image/png" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: "我的疯格 MAD-16",
          text: "测测你最近的疯癫类型：https://sean-daniel.github.io/mad16/"
        });
        return;
      } catch (error) {
        if (error && error.name === "AbortError") return;
      }
    }
    showToast("当前浏览器不支持直接分享，请长按图片保存。");
  }

  function initHeader() {
    const header = $("#site-header");
    const onScroll = () => {
      header.classList.toggle("is-scrolled", window.scrollY > 24);
      document.body.classList.toggle("has-scrolled", window.scrollY > 320);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  function initReveal() {
    const nodes = $$(".reveal");
    if (!nodes.length) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.14 });
    nodes.forEach((node) => observer.observe(node));
  }

  function initNav() {
    const links = $$(".site-nav a");
    const sections = links
      .map((link) => document.querySelector(link.getAttribute("href")))
      .filter(Boolean);
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((link) => {
          link.classList.toggle("is-active", link.getAttribute("href") === `#${entry.target.id}`);
        });
      });
    }, { rootMargin: "-35% 0px -55% 0px", threshold: 0 });
    sections.forEach((section) => observer.observe(section));
  }

  function initEvents() {
    $$("[data-start-test]").forEach((button) => {
      button.addEventListener("click", () => startTest());
    });
    $("#test-close").addEventListener("click", closeTest);
    $("#test-back").addEventListener("click", goBack);
    $("#type-modal-close").addEventListener("click", closeType);
    $$("[data-close-type]").forEach((node) => node.addEventListener("click", closeType));
    $("#random-type").addEventListener("click", () => {
      const codes = Object.keys(TYPES);
      const current = $("#featured-code")?.textContent;
      let code = codes[Math.floor(Math.random() * codes.length)];
      if (codes.length > 1 && code === current) {
        code = codes[(codes.indexOf(code) + 1) % codes.length];
      }
      openType(code);
    });

    document.addEventListener("keydown", (event) => {
      if (!document.querySelector("#share-sheet").hidden && event.key === "Escape") {
        closeShareSheet();
        return;
      }
      const modalOpen = !$("#type-modal").hidden;
      if (modalOpen && event.key === "Escape") {
        closeType();
        return;
      }
      const testOpen = !$("#test-overlay").hidden;
      if (!testOpen) return;
      if (event.key === "Escape") {
        closeTest();
        return;
      }
      if ($("#test-result-view").hidden === false) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goBack();
        return;
      }
      if (event.key === "1" || event.key === "2") {
        const question = QUESTIONS[state.current];
        if (!question) return;
        const order = state.displayOrder[question.id] || [0, 1];
        const option = question.options[order[Number(event.key) - 1]];
        if (option) {
          event.preventDefault();
          choose(option.pole);
        }
      }
    });

    $("#test-overlay").addEventListener("click", (event) => {
      if (event.target === $("#test-overlay")) {
        /* Don't close on backdrop click; the test is full-screen and accidental closes are annoying. */
      }
    });

    $("#share-close").addEventListener("click", closeShareSheet);
    $$("[data-close-share]").forEach((node) => node.addEventListener("click", closeShareSheet));
    $("#share-save").addEventListener("click", saveShareCard);
    $("#share-system").addEventListener("click", shareCardNatively);
  }

  function initUrlType() {
    const params = new URLSearchParams(window.location.search);
    const scrollTarget = params.get("scroll");
    if (scrollTarget) {
      window.setTimeout(() => {
        const target = document.getElementById(scrollTarget);
        if (target) target.scrollIntoView({ behavior: "auto", block: "start" });
      }, 80);
    }
    const code = params.get("type");
    if (code && TYPES[code.toUpperCase()]) {
      window.setTimeout(() => openType(code.toUpperCase()), 240);
    }
  }

  function init() {
    renderStats();
    renderFamilies();
    renderAxes();
    renderFilters();
    renderTypeGrid();
    renderFeatured();
    renderSources();
    initHeader();
    initReveal();
    initNav();
    initEvents();
    lastSavedResult = loadLastResult();
    if (lastSavedResult) {
      updateAxisMarkers(lastSavedResult);
      renderLastResultChip();
    }
    initUrlType();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

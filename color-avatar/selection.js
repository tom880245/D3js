// ---------- 配件定義 ----------
const parts = [
  { key: 'head', label: '頭/膚色',  rgb: { r:246, g:215, b:176 }, bright: 100 },
  { key: 'body', label: '上衣',     rgb: { r: 59, g:130, b:246 }, bright: 100 },
  { key: 'leg',  label: '褲子',     rgb: { r: 16, g:185, b:129 }, bright: 100 },
  { key: 'shoe', label: '鞋子',     rgb: { r: 55, g: 65, b: 81 }, bright: 100 }
];

// 以 key 快速索引狀態
const state = Object.fromEntries(parts.map(p => [p.key, { ...p.rgb, bright: p.bright }]));

// ---------- 工具函式 ----------
function clamp(value, min, max) {
  const v = Number.isFinite(+value) ? +value : min;
  return Math.max(min, Math.min(max, v));
}

// RGB + 亮度(%) -> HEX ；亮度允許 0~200%
function rgbWithBrightness(r, g, b, brightPercent) {
  const R = clamp(r, 0, 255);
  const G = clamp(g, 0, 255);
  const B = clamp(b, 0, 255);
  const factor = clamp(brightPercent, 0, 200) / 100; // 0~2
  const hsl = d3.hsl(d3.rgb(R, G, B));
  hsl.l = clamp(hsl.l * factor, 0, 1);
  return hsl.formatHex();
}

function adjustBrightness(r, g, b, brightPercent) {
  const hsl = d3.hsl(d3.rgb(r, g, b));
  if (brightPercent >= 100) {
    // 100~200% → 往白色靠近
    hsl.l = hsl.l + (1 - hsl.l) * ((brightPercent - 100) / 100);
  } else {
    // 0~100% → 往黑色靠近
    hsl.l = hsl.l * (brightPercent / 100);
  }
  return hsl.formatHex();
}


// ---------- 左欄控制面板（D3 生成 DOM + 綁事件） ----------
function buildControls() {
  const panel = d3.select('#controls');

  const cards = panel.selectAll('.ctrl-card')
    .data(parts, d => d.key)
    .join('div')
    .attr('class', 'ctrl-card');

  cards.selectAll('h4')
    .data(d => [d])
    .join('h4')
    .text(d => d.label);

  const rows = cards.selectAll('.ctrl-grid')
    .data(d => [d])
    .join('div')
    .attr('class', 'ctrl-grid');

  // 為每個 part 生成 R/G/B/亮度 四個輸入
  rows.each(function(d){
    const g = d3.select(this);

    // helper: 建立 number input（0~255）並 clamp
    function addRGB(field, label){
      g.append('label').attr('for', `${field}-${d.key}`).text(label);
      g.append('input')
        .attr('type', 'number')
        .attr('id', `${field}-${d.key}`)
        .attr('min', 0).attr('max', 255).attr('step', 1)
        .attr('value', state[d.key][field])
        .on('input', function() {
          const v = clamp(this.value, 0, 255);
          state[d.key][field] = v;
          this.value = v;      // 直接修正輸入框顯示
          applyColors();       // 即時套色
        });
    }
    addRGB('r', 'R');
    addRGB('g', 'G');
    addRGB('b', 'B');

    // 亮度：range 0~200（100 = 原色）
    g.append('label').attr('for', `br-${d.key}`).text('亮度 %');
    // 建立一個容器 <div> 放 slider + 數值
    const brRow = g.append('div').attr('class', 'bright-row');

    brRow.append('input')
    .attr('type', 'range')
    .attr('id', `br-${d.key}`)
    .attr('min', 0).attr('max', 200).attr('step', 1)
    .attr('value', state[d.key].bright)
    .on('input', function() {
      const v = clamp(this.value, 0, 200);
      state[d.key].bright = v;
      brValue.text(v + '%');  // 更新文字
      applyColors();
    });
    const brValue = brRow.append('span')
  .attr('class', 'bright-value')
  .style('margin-left', '8px')
  .text(state[d.key].bright + '%');
   });
}

// ---------- 畫人物（D3） ----------
const svg = d3.select('#scene');

function draw() {
  // 取容器寬度（原生）：D3 無 clientWidth API
  const w = document.getElementById('charts').clientWidth || 600;
  const h = Math.max(400, Math.round(w * 0.6));
  svg.attr('viewBox', `0 0 ${w} ${h}`);

  const s = Math.min(w, h);
  const cx = w / 2;
  const top = h * 0.15;

  const headR = 0.08 * s;
  const bodyW = 0.18 * s, bodyH = 0.28 * s;
  const armW  = 0.06 * s, armH  = 0.22 * s;
  const legW  = 0.08 * s, legH  = 0.28 * s;

  const g = svg.selectAll('g.person')
    .data([null])
    .join('g')
    .attr('class', 'person');

  // 頭
  g.selectAll('circle.head')
    .data([null])
    .join('circle')
    .attr('class', 'head')
    .attr('cx', cx)
    .attr('cy', top + headR)
    .attr('r', headR);

  // 身體
  const bodyX = cx - bodyW / 2;
  const bodyY = top + headR * 2 + 0.02 * s;
  g.selectAll('rect.body')
    .data([null])
    .join('rect')
    .attr('class', 'body')
    .attr('x', bodyX)
    .attr('y', bodyY)
    .attr('width', bodyW)
    .attr('height', bodyH)
    .attr('rx', 0.02 * s);

  // 手
  const arms = [
    { x: bodyX - 0.08 * s,         y: bodyY + 0.05 * s },
    { x: bodyX + bodyW + 0.02 * s, y: bodyY + 0.05 * s }
  ];
  g.selectAll('rect.arm')
    .data(arms)
    .join('rect')
    .attr('class', 'arm')
    .attr('x', d => d.x)
    .attr('y', d => d.y)
    .attr('width', armW)
    .attr('height', armH)
    .attr('rx', 0.02 * s);

  // 腿
  const legTop = bodyY + bodyH + 0.02 * s;
  const legs = [
    { x: cx - legW - 0.02 * s, y: legTop },
    { x: cx + 0.02 * s,        y: legTop }
  ];
  g.selectAll('rect.leg')
    .data(legs)
    .join('rect')
    .attr('class', 'leg')
    .attr('x', d => d.x)
    .attr('y', d => d.y)
    .attr('width', legW)
    .attr('height', legH)
    .attr('rx', 0.02 * s);

  // 鞋子
  const shoeH = 0.05 * s;
  const shoeW = legW * 1.2;
  const shoeY = legTop + legH;
  const shoes = [
    { x: cx - legW - 0.02 * s, y: shoeY },
    { x: cx + 0.02 * s,        y: shoeY }
  ];
  g.selectAll('rect.shoe')
    .data(shoes)
    .join('rect')
    .attr('class', 'shoe')
    .attr('x', d => d.x - (shoeW - legW) / 2)
    .attr('y', d => d.y)
    .attr('width', shoeW)
    .attr('height', shoeH)
    .attr('rx', 0.02 * s);

  applyColors(); // 套用目前顏色
}

// ---------- 根據 state 套顏色 ----------
function applyColors() {
  const color = (k) => {
    const { r, g, b, bright } = state[k];
    return adjustBrightness(r, g, b, bright);
  };
  svg.select('.head')            .attr('fill', color('head'));
  svg.selectAll('.body, .arm')   .attr('fill', color('body'));
  svg.selectAll('.leg')          .attr('fill', color('leg'));
  svg.selectAll('.shoe')         .attr('fill', color('shoe'));
}

// ---------- 初始化 ----------
buildControls();
draw();

// ---- 用 ResizeObserver 監聽 #charts 容器尺寸變化（原生 API） ----
// 為了避免連續回呼造成頻繁重繪，搭配 requestAnimationFrame 做輕量節流
const chartsEl = document.getElementById('charts');
let rafId = null;
const ro = new ResizeObserver(() => {
  if (rafId) cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(() => {
    rafId = null;
    draw();
  });
});
ro.observe(chartsEl);

// 若仍想保留 window.resize 以兼容極舊瀏覽器，可加：
// d3.select(window).on('resize', draw);

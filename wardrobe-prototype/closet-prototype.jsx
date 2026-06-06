import { useState, useEffect, useRef } from "react";

// ── Design tokens (from design-token.json) ──────────────────────────────
const C = {
  bg: "#F7F6F2",
  canvas: "#F1F0EC",
  surface: "#FFFFFF",
  ink: "#1E1E1C",
  inkSoft: "#6F6B64",
  inkMuted: "#B7B4AD",
  border: "#ECE9E3",
  borderMed: "#DEDAD2",
  terracotta: "#A94D28",
  // Closet section purple
  purple: "#7e72a8",
  purpleBg: "#f4f2fa",
  purpleBorder: "#ddd6ef",
  // Health / resale green
  green: "#3a8a5a",
  greenBg: "#eef7f1",
  greenBorder: "#cfe7d8",
};

// ── Wu-Xing (五行) system ────────────────────────────────────────────────
const WX = {
  wood:  { label: "木", c: "#5a8a6b", bg: "#e8f5ec", br: "#b8dcc4" },
  fire:  { label: "火", c: "#c44a28", bg: "#fde8e2", br: "#f0c4b8" },
  earth: { label: "土", c: "#b8932a", bg: "#fdf0d8", br: "#e8d0a0" },
  metal: { label: "金", c: "#7a7a7a", bg: "#f0f0f0", br: "#d0d0d0" },
  water: { label: "水", c: "#4a6fa5", bg: "#e2eaf8", br: "#b8ccec" },
};

// ── Mock clothing database ───────────────────────────────────────────────
const ITEMS = [
  { id:1,  name:"淺藍條紋襯衫",      cat:"上衣", season:"春夏", wx:"water", color:"#aecbe8", img:"./img/blue-shirt.png",  worn:12, price:1290, brand:"Uniqlo" },
  { id:2,  name:"卡其針織背心",      cat:"上衣", season:"春秋", wx:"earth", color:"#b8a890", img:"./img/shirt-knit.png",  worn:8,  price:1680, brand:"& Other Stories" },
  { id:3,  name:"淺灰抓皺長袖上衣",  cat:"上衣", season:"四季", wx:"metal", color:"#d6d8da", img:"./img/shirt-3.png",     worn:15, price:990,  brand:"COS" },
  { id:4,  name:"灰綠荷葉細肩上衣",  cat:"上衣", season:"夏",   wx:"wood",  color:"#a8b5a0", img:"./img/shirt-4.png",     worn:3,  price:1350, brand:"ZARA" },
  { id:5,  name:"淺藍寬版西裝褲",    cat:"下身", season:"春夏", wx:"water", color:"#aecbe2", img:"./img/pants-3.png",     worn:10, price:1580, brand:"Mango" },
  { id:6,  name:"淺色寬版牛仔褲",    cat:"下身", season:"四季", wx:"water", color:"#bcd0e4", img:"./img/pants-2.png",     worn:28, price:1980, brand:"Levi's" },
  { id:7,  name:"卡其寬褲",          cat:"下身", season:"春秋", wx:"earth", color:"#8a7a5e", img:"./img/pants-brown.png", worn:6,  price:1280, brand:"GU" },
  { id:8,  name:"黑色抓皺長裙",      cat:"下身", season:"四季", wx:"water", color:"#2a2a2a", img:"./img/skirt-1.png",     worn:22, price:1480, brand:"NET" },
  { id:9,  name:"白色無袖層次洋裝",  cat:"洋裝", season:"夏",   wx:"metal", color:"#ece7da", img:"./img/dress-1.png",     worn:3,  price:2100, brand:"ZARA" },
  { id:10, name:"藍色細肩帶長洋裝",  cat:"洋裝", season:"夏",   wx:"water", color:"#5a7fa8", img:"./img/dress-2.png",     worn:7,  price:1890, brand:"Mango" },
  { id:11, name:"水藍無袖長洋裝",    cat:"洋裝", season:"夏",   wx:"water", color:"#c8e4e8", img:"./img/dress-3.png",     worn:2,  price:2480, brand:"COS" },
  { id:12, name:"鵝黃襯衫洋裝",      cat:"洋裝", season:"春夏", wx:"earth", color:"#f0e6b8", img:"./img/dress-4.png",     worn:9,  price:1990, brand:"Uniqlo" },
];

const CATS = ["全部", "上衣", "下身", "外套", "洋裝", "鞋", "配件"];
const serif = { fontFamily: "'Cormorant Garamond','Georgia',serif" };
const sans  = { fontFamily: "'Noto Sans TC',system-ui,sans-serif" };

// ── Albums / collections (一排相簿) ───────────────────────────────────────
const ALBUMS = [
  { id: "all",    name: "全部單品", en: "All Clothes", match: () => true },
  { id: "winter", name: "夏季服裝", en: "Summer",      cover: "./img/summer.png", match: i => i.season.includes("夏") },
  { id: "dress",  name: "洋裝系列", en: "Dresses",     match: i => i.cat === "洋裝" },
  { id: "sleepy", name: "久未穿",   en: "Rarely Worn", match: i => i.worn < 4 },
];

// ── Lucide-style linear icons (single source for nav + FAB) ───────────────
const ICONS = {
  home:  <><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/></>,
  shirt: <path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"/>,
  trade: <><path d="m16 3 4 4-4 4"/><path d="M20 7H4"/><path d="m8 21-4-4 4-4"/><path d="M4 17h16"/></>,
  user:  <><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
  plus:  <><path d="M5 12h14"/><path d="M12 5v14"/></>,
  bar:   <><line x1="6" x2="6" y1="20" y2="14"/><line x1="12" x2="12" y1="20" y2="6"/><line x1="18" x2="18" y1="20" y2="10"/></>,
};
const Lucide = ({ name, size = 22, color = "currentColor", sw = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    {ICONS[name]}
  </svg>
);

export default function App() {
  const [filter,   setFilter]   = useState("洋裝");
  const [search,   setSearch]   = useState("");
  const [item,     setItem]     = useState(null);
  const [sheetIn,  setSheetIn]  = useState(false);
  const [addOpen,  setAddOpen]  = useState(false);
  const [addIn,    setAddIn]    = useState(false);
  const [step,     setStep]     = useState(0);   // 0 choose · 1 upload · 2 tags
  const [method,   setMethod]   = useState(null); // "photo" | "link"
  const [anaOpen,  setAnaOpen]  = useState(false); // 衣櫥分析 sheet
  const [anaIn,    setAnaIn]    = useState(false);

  // Load editorial fonts
  useEffect(() => {
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600&family=Noto+Sans+TC:wght@400;500;700&display=swap";
    document.head.appendChild(l);
    return () => { try { document.head.removeChild(l); } catch(e) {} };
  }, []);

  const list = ITEMS.filter(i =>
    (filter === "全部" || i.cat === filter) &&
    (!search || i.name.includes(search) || i.brand.toLowerCase().includes(search.toLowerCase()))
  );
  const cpw = (i) => i.worn > 0 ? Math.round(i.price / i.worn) : i.price;
  const sleepy = ITEMS.filter(i => i.worn < 4).length;

  const openItem  = (i) => { setItem(i); setTimeout(() => setSheetIn(true), 12); };
  const closeItem = ()  => { setSheetIn(false); setTimeout(() => setItem(null), 320); };
  const openAdd   = ()  => { setStep(0); setMethod(null); setAddOpen(true); setTimeout(() => setAddIn(true), 12); };
  const closeAdd  = ()  => { setAddIn(false); setTimeout(() => setAddOpen(false), 320); };
  const openAna   = ()  => { setAnaOpen(true); setTimeout(() => setAnaIn(true), 12); };
  const closeAna  = ()  => { setAnaIn(false); setTimeout(() => setAnaOpen(false), 320); };

  // Aggregate analytics for 衣櫥分析（統計 + 健檢同源）
  const totalWears  = ITEMS.reduce((s, i) => s + i.worn, 0);
  const totalValue  = ITEMS.reduce((s, i) => s + i.price, 0);
  const avgCpw      = Math.round(ITEMS.reduce((s, i) => s + cpw(i), 0) / ITEMS.length);
  const utilization = Math.round(ITEMS.filter(i => i.worn >= 4).length / ITEMS.length * 100);
  const sleepyItems = ITEMS.filter(i => i.worn < 4);
  const wxDist      = Object.keys(WX).map(k => ({ k, n: ITEMS.filter(i => i.wx === k).length }));
  const CAT_COLORS  = { "上衣": "#7e72a8", "下身": "#4a6fa5", "外套": "#5a8a6b", "洋裝": "#c4884a", "鞋": "#a94d28", "配件": "#b8932a" };
  const catDist     = CATS.filter(c => c !== "全部")
    .map(c => ({ c, n: ITEMS.filter(i => i.cat === c).length, color: CAT_COLORS[c] || C.inkMuted }))
    .filter(d => d.n > 0);

  // ── Chip button ─────────────────────────────────────────────────────────
  const Chip = ({ label }) => {
    const on = filter === label;
    return (
      <button onClick={() => setFilter(label)} style={{
        flexShrink: 0, padding: "6px 16px", borderRadius: 99,
        border: `1.5px solid ${on ? C.purple : C.purpleBorder}`,
        background: on ? C.purple : "transparent",
        color: on ? "#fff" : C.inkSoft,
        fontSize: 13, fontWeight: on ? 700 : 400,
        cursor: "pointer", transition: "all 150ms", ...sans,
      }}>{label}</button>
    );
  };

  // ── Sticker: 裁掉透明留白後，以「衣服本體」置中 + 選配白框 ───────────────────
  // 去背 PNG 兩側透明留白常不對稱，純 object-fit 會偏上/偏下；這裡先算出衣服的
  // 實際邊界（非透明像素 bbox）再 contain-fit 置中。stroke>0 時沿輪廓加白邊＋淡陰影。
  const Sticker = ({ src, alt, pad = 22, stroke = 6 }) => {
    const ref = useRef(null);
    useEffect(() => {
      const canvas = ref.current;
      if (!canvas || !src) return;
      let cancelled = false;
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        if (cancelled) return;
        // 1) 算衣服本體邊界（在縮圖上掃描 alpha，省效能）
        const maxDim = 360;
        const k = Math.min(1, maxDim / Math.max(img.width, img.height));
        const iw = Math.max(1, Math.round(img.width * k));
        const ih = Math.max(1, Math.round(img.height * k));
        const probe = document.createElement("canvas");
        probe.width = iw; probe.height = ih;
        const pctx = probe.getContext("2d", { willReadFrequently: true });
        pctx.drawImage(img, 0, 0, iw, ih);
        let minX = iw, minY = ih, maxX = 0, maxY = 0, found = false;
        try {
          const px = pctx.getImageData(0, 0, iw, ih).data;
          for (let yy = 0; yy < ih; yy++) {
            for (let xx = 0; xx < iw; xx++) {
              if (px[(yy * iw + xx) * 4 + 3] > 12) {
                found = true;
                if (xx < minX) minX = xx; if (xx > maxX) maxX = xx;
                if (yy < minY) minY = yy; if (yy > maxY) maxY = yy;
              }
            }
          }
        } catch (e) { /* 跨域讀不到像素就退回整張圖 */ }
        // 映射回原圖座標的來源矩形
        const sx = found ? minX / k : 0;
        const sy = found ? minY / k : 0;
        const sw = found ? (maxX - minX + 1) / k : img.width;
        const sh = found ? (maxY - minY + 1) / k : img.height;

        // 2) 以容器實際 CSS 尺寸為畫布（避免被拉伸變形）
        const rect = canvas.getBoundingClientRect();
        const cw = rect.width || canvas.parentElement?.clientWidth || 240;
        const ch = rect.height || canvas.parentElement?.clientHeight || 240;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.round(cw * dpr);
        canvas.height = Math.round(ch * dpr);
        const ctx = canvas.getContext("2d");
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, cw, ch);

        // 3) 把衣服本體 contain-fit 置中（含上下置中）
        const s = Math.min((cw - pad * 2) / sw, (ch - pad * 2) / sh);
        const w = sw * s, h = sh * s;
        const x = (cw - w) / 2, y = (ch - h) / 2;

        if (stroke > 0) {
          // 離屏：把衣服本體染成純白輪廓（source-in）
          const off = document.createElement("canvas");
          off.width = Math.max(1, Math.round(w * dpr));
          off.height = Math.max(1, Math.round(h * dpr));
          const octx = off.getContext("2d");
          octx.scale(dpr, dpr);
          octx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
          octx.globalCompositeOperation = "source-in";
          octx.fillStyle = "#fff";
          octx.fillRect(0, 0, w, h);

          // 淡陰影（墊底）
          ctx.save();
          ctx.shadowColor = "rgba(30,30,28,.20)";
          ctx.shadowBlur = 9;
          ctx.shadowOffsetY = 3;
          ctx.drawImage(off, x, y, w, h);
          ctx.restore();

          // 白框：沿圓周多角度重描白輪廓
          const steps = 32;
          for (let i = 0; i < steps; i++) {
            const a = (i / steps) * Math.PI * 2;
            ctx.drawImage(off, x + Math.cos(a) * stroke, y + Math.sin(a) * stroke, w, h);
          }
        }

        // 原圖（裁切後的本體）蓋在最上層
        ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
      };
      img.src = src;
      return () => { cancelled = true; };
    }, [src, pad, stroke]);
    return <canvas ref={ref} aria-label={alt} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />;
  };

  // ── Clothing card ───────────────────────────────────────────────────────
  const Card = ({ it }) => {
    const w = WX[it.wx];
    const asleep = it.worn < 4;
    const press = (e, scale) => e.currentTarget.style.transform = `scale(${scale})`;
    return (
      <div onClick={() => openItem(it)}
        style={{ background: C.surface, borderRadius: 14, border: `1.5px solid ${asleep ? "#e8d4b8" : C.border}`, padding: 8, cursor: "pointer", userSelect: "none", transition: "transform 120ms ease-out" }}
        onMouseDown={e => press(e, .94)} onMouseUp={e => press(e, 1)}
        onTouchStart={e => press(e, .94)} onTouchEnd={e => press(e, 1)}
      >
        <div style={{ aspectRatio: "1", borderRadius: 10, background: it.color, position: "relative", marginBottom: 7, overflow: "hidden" }}>
          {it.img && <Sticker src={it.img} alt={it.name} stroke={0} pad={12} />}
          {asleep && (
            <div style={{ position: "absolute", top: 4, right: 4, background: "rgba(255,248,234,.9)", borderRadius: 99, padding: "2px 6px", fontSize: 9, color: "#a07040", fontWeight: 700, backdropFilter: "blur(4px)" }}>
              久未穿
            </div>
          )}
          <div style={{ position: "absolute", bottom: 5, left: 5, width: 20, height: 20, borderRadius: "50%", background: w.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: w.c, fontWeight: 700, border: `1px solid ${w.br}` }}>
            {w.label}
          </div>
        </div>
        <div style={{ fontSize: 11.5, fontWeight: 500, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.name}</div>
        <div style={{ fontSize: 10, color: C.inkMuted, marginTop: 2 }}>穿 {it.worn} 次</div>
      </div>
    );
  };

  // ── Section header ────────────────────────────────────────────────────────
  const SectionHeader = ({ title, action }) => (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "0 22px 12px" }}>
      <div style={{ ...serif, fontSize: 19, fontWeight: 600, color: C.ink }}>{title}</div>
      {action && <button style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12.5, color: C.purple, fontWeight: 600, ...sans }}>{action} ›</button>}
    </div>
  );

  // ── Album card (2×2 collage cover) ────────────────────────────────────────
  const AlbumCard = ({ album }) => {
    const matched = ITEMS.filter(album.match);
    const over = matched.length > 4;
    const covers = over ? matched.slice(0, 3) : matched.slice(0, 4);
    const press = (e, s) => e.currentTarget.style.transform = `scale(${s})`;
    const onTap = () => { if (album.id === "all") setFilter("全部"); else if (album.id === "dress") setFilter("洋裝"); };
    return (
      <div onClick={onTap}
        style={{ flexShrink: 0, width: 124, cursor: "pointer", userSelect: "none", transition: "transform 120ms ease-out" }}
        onMouseDown={e => press(e, .96)} onMouseUp={e => press(e, 1)}
        onTouchStart={e => press(e, .96)} onTouchEnd={e => press(e, 1)}
      >
        {album.cover ? (
          <div style={{ aspectRatio: "1", borderRadius: 16, background: C.surface, border: `1px solid ${C.border}`, overflow: "hidden", boxShadow: "0 1px 3px rgba(30,30,28,.04)" }}>
            <img src={album.cover} alt={album.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          </div>
        ) : (
        <div style={{ aspectRatio: "1", borderRadius: 16, background: C.surface, border: `1px solid ${C.border}`, padding: 6, display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr", gap: 4, boxShadow: "0 1px 3px rgba(30,30,28,.04)" }}>
          {[0, 1, 2, 3].map(n => {
            const showOver = over && n === 3;
            const it = showOver ? matched[3] : covers[n];
            return (
              <div key={n} style={{ borderRadius: 8, background: it ? it.color : C.canvas, position: "relative", overflow: "hidden" }}>
                {it && it.img && <img src={it.img} alt={it.name} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />}
                {showOver && (
                  <div style={{ position: "absolute", inset: 0, background: "rgba(30,30,28,.5)", color: "#fff", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", ...sans }}>
                    +{matched.length - 3}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        )}
        <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, marginTop: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{album.name}</div>
        <div style={{ fontSize: 11, color: C.inkMuted, marginTop: 1 }}>{matched.length} 件物品</div>
      </div>
    );
  };

  // ── Create-album card (末張，dashed) ──────────────────────────────────────
  const CreateAlbumCard = () => (
    <div style={{ flexShrink: 0, width: 124, cursor: "pointer", userSelect: "none" }}>
      <div style={{ aspectRatio: "1", borderRadius: 16, border: `1.5px dashed ${C.borderMed}`, background: C.canvas, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, color: C.inkMuted }}>
        <Lucide name="plus" size={26} color={C.inkMuted} sw={1.8} />
        <span style={{ fontSize: 12, ...sans }}>建立相簿</span>
      </div>
      <div style={{ height: 33 }} />
    </div>
  );

  // ── Stat tile ───────────────────────────────────────────────────────────
  const Stat = ({ label, value, unit, sub, hl }) => (
    <div style={{ background: hl ? "#fff8f5" : "#faf9f6", borderRadius: 16, padding: 14, border: `1px solid ${hl ? "#f0d8cc" : C.border}` }}>
      <div style={{ fontSize: 11, color: C.inkMuted, marginBottom: 4, fontStyle: "italic" }}>{label}</div>
      <div style={{ ...serif, fontSize: 26, fontWeight: 600, color: hl ? C.terracotta : C.ink, lineHeight: 1 }}>
        {value}<span style={{ fontSize: 13, color: C.inkSoft }}>{unit}</span>
      </div>
      {sub && <div style={{ fontSize: 10, color: C.inkMuted, marginTop: 4 }}>{sub}</div>}
    </div>
  );

  // ── Donut chart（單品類型分布）────────────────────────────────────────────
  const Donut = ({ data, total, size = 124, stroke = 18 }) => {
    const r = (size - stroke) / 2;
    const cir = 2 * Math.PI * r;
    let acc = 0;
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={C.canvas} strokeWidth={stroke} />
          {data.map((d, i) => {
            const frac = d.n / total;
            const dash = `${frac * cir} ${cir}`;
            const off = -acc * cir;
            acc += frac;
            return (
              <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none"
                stroke={d.color} strokeWidth={stroke} strokeDasharray={dash} strokeDashoffset={off}
                strokeLinecap="butt" style={{ transition: "stroke-dasharray 500ms ease-out" }} />
            );
          })}
        </g>
        <text x="50%" y="46%" textAnchor="middle" dominantBaseline="middle" style={{ ...serif, fontSize: 26, fontWeight: 600, fill: C.ink }}>{total}</text>
        <text x="50%" y="63%" textAnchor="middle" dominantBaseline="middle" style={{ ...sans, fontSize: 9, fill: C.inkMuted }}>件單品</text>
      </svg>
    );
  };

  // ── Add option button ───────────────────────────────────────────────────
  const AddOption = ({ icon, label, desc, m, bg, br }) => (
    <button onClick={() => { setMethod(m); setStep(1); }}
      style={{ width: "100%", background: bg, border: `1.5px solid ${br}`, borderRadius: 18, padding: 18, display: "flex", alignItems: "center", gap: 14, cursor: "pointer", marginBottom: 10, textAlign: "left", ...sans, transition: "transform 120ms" }}
      onMouseDown={e => e.currentTarget.style.transform = "scale(.97)"}
      onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
    >
      <span style={{ fontSize: 32, lineHeight: 1 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.ink }}>{label}</div>
        <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 3 }}>{desc}</div>
      </div>
      <svg style={{ marginLeft: "auto", flexShrink: 0 }} width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M6 4l4 4-4 4" stroke={C.inkMuted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
  );

  // ── Sheet container (bottom drawer) ────────────────────────────────────
  const Sheet = ({ visible, onClose, children, maxH = "82%" }) => (
    <>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: visible ? "rgba(30,30,28,.44)" : "transparent", zIndex: 200, transition: "background 320ms" }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: C.surface, borderRadius: "26px 26px 0 0", zIndex: 201, transform: visible ? "translateY(0)" : "translateY(100%)", transition: "transform 320ms cubic-bezier(.32,.72,0,1)", maxHeight: maxH, overflowY: "auto" }}>
        <div style={{ width: 36, height: 4, background: C.border, borderRadius: 2, margin: "14px auto 0" }} />
        {children}
      </div>
    </>
  );

  // ═══════════════════════════════════════════════════════════════════════
  return (
    <div style={{ width: "100%", minHeight: "100vh", background: "#dedad0", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "20px 0", ...sans }}>
      <div style={{ width: 390, height: 820, position: "relative", borderRadius: 40, overflow: "hidden", background: C.bg, boxShadow: "0 24px 80px rgba(0,0,0,.2)" }}>

        {/* ── Scrollable body ────────────────────────────────────────── */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 82, overflowY: "auto", overflowX: "hidden" }}>

          {/* Status bar */}
          <div style={{ height: 50, display: "flex", alignItems: "flex-end", justifyContent: "space-between", padding: "0 24px 8px", fontSize: 12, color: C.inkSoft }}>
            <b style={{ fontWeight: 700 }}>9:41</b>
            <span>●● ◑ ▮▮</span>
          </div>

          {/* Header — 左=identity, 右=actions */}
          <div style={{ padding: "0 22px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div>
                <div style={{ ...serif, fontSize: 32, fontWeight: 600, color: C.ink, lineHeight: 1.05 }}>Wardrobe</div>
                <div style={{ fontSize: 13, color: C.purple, marginTop: 3, fontWeight: 500 }}>衣物管理 · {ITEMS.length} 件</div>
              </div>
              {/* 衣櫥分析入口（統計 + 健檢合併頁） */}
              <button onClick={openAna} aria-label="衣櫥分析"
                style={{ position: "relative", marginTop: 6, width: 40, height: 40, borderRadius: 12, background: C.surface, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 1px 3px rgba(30,30,28,.05)", transition: "transform 120ms" }}
                onMouseDown={e => e.currentTarget.style.transform = "scale(.92)"}
                onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
              >
                <Lucide name="bar" size={20} color={C.purple} sw={2} />
                {sleepy > 0 && (
                  <span style={{ position: "absolute", top: -5, right: -5, minWidth: 18, height: 18, padding: "0 4px", borderRadius: 99, background: C.terracotta, color: "#fff", fontSize: 10.5, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${C.bg}`, ...sans }}>{sleepy}</span>
                )}
              </button>
            </div>
            <div style={{ height: 1, background: `linear-gradient(90deg,${C.purpleBorder},${C.border})`, margin: "12px 0" }} />
          </div>

          {/* ── Albums (相簿區) ─ new top-level section ───────────────── */}
          <SectionHeader title="我的相簿" action="管理" />
          <div style={{ display: "flex", gap: 12, overflowX: "auto", overflowY: "hidden", scrollbarWidth: "none", padding: "0 22px 2px" }}>
            {ALBUMS.map(a => <AlbumCard key={a.id} album={a} />)}
            <CreateAlbumCard />
          </div>
          <div style={{ height: 1, background: C.border, margin: "16px 22px 16px" }} />

          {/* ── Clothing list ─ 單品清單節點 ──────────────────────────── */}
          <SectionHeader title="所有單品" />

          {/* Search */}
          <div style={{ padding: "0 22px 12px" }}>
            <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", padding: "10px 14px", gap: 10, boxShadow: "0 1px 3px rgba(30,30,28,.04)" }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="6" cy="6" r="5" stroke={C.inkMuted} strokeWidth="1.5"/><line x1="10" y1="10" x2="13.5" y2="13.5" stroke={C.inkMuted} strokeWidth="1.5" strokeLinecap="round"/></svg>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜尋名稱、品牌…"
                style={{ border: "none", outline: "none", background: "transparent", fontSize: 14, color: C.ink, flex: 1, ...sans }} />
              {search && <button onClick={() => setSearch("")} style={{ border: "none", background: "none", cursor: "pointer", color: C.inkMuted, fontSize: 18, lineHeight: 1 }}>×</button>}
            </div>
          </div>

          {/* Filter chips */}
          <div style={{ overflowX: "auto", scrollbarWidth: "none", padding: "0 22px 14px", display: "flex", gap: 8 }}>
            {CATS.map(c => <Chip key={c} label={c} />)}
          </div>

          {/* Count label */}
          <div style={{ padding: "0 22px 10px", fontSize: 11.5, color: C.inkMuted }}>
            {list.length} 件{filter !== "全部" && ` ${filter}`}{search && ` · "${search}"`}
          </div>

          {/* 3-col grid */}
          <div style={{ padding: "0 22px", display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 16 }}>
            {list.map(it => <Card key={it.id} it={it} />)}
            {list.length === 0 && (
              <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "40px 20px", color: C.inkMuted, fontSize: 14 }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>找不到符合的衣物
              </div>
            )}
          </div>

          {/* Health check entry — deep-link 進「衣櫥分析」的健檢段 */}
          <div onClick={openAna} style={{ margin: "0 22px 100px", background: C.surface, borderRadius: 18, border: `1px solid ${C.greenBorder}`, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: C.greenBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>♻️</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#2e7d4f" }}>幫久未穿的衣服找主人</div>
              <div style={{ fontSize: 12, color: "#7aaa88", marginTop: 3 }}>衣櫥健檢 · {sleepy} 件 90 天未穿</div>
            </div>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="#5a9b75" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
        </div>

        {/* ── FAB ─────────────────────────────────────────────────────── */}
        <button onClick={openAdd} style={{ position: "absolute", bottom: 98, right: 22, width: 58, height: 58, borderRadius: "50%", background: C.terracotta, color: "#fff", border: "none", fontSize: 28, cursor: "pointer", boxShadow: "0 6px 22px rgba(169,77,40,.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 80, lineHeight: 1, transition: "transform 120ms" }}
          onMouseDown={e => e.currentTarget.style.transform = "scale(.9)"}
          onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
        ><Lucide name="plus" size={26} color="#fff" sw={2.4} /></button>

        {/* ── Bottom nav (lucide linear icons) ─────────────────────────── */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 82, background: "rgba(247,246,242,.94)", backdropFilter: "blur(12px)", borderTop: `1px solid ${C.border}`, display: "flex", alignItems: "flex-start", justifyContent: "space-around", paddingTop: 12, zIndex: 79 }}>
          {[["home","首頁"],["shirt","衣櫥"],["trade","交易"],["user","我的"]].map(([ic, lb], i) => {
            const on = i === 1;
            return (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, opacity: on ? 1 : .5 }}>
                <Lucide name={ic} size={22} color={on ? C.purple : C.inkSoft} sw={on ? 2.2 : 1.8} />
                <span style={{ fontSize: 10, color: on ? C.purple : C.inkSoft, fontWeight: on ? 700 : 400, ...sans }}>{lb}</span>
                {on && <div style={{ width: 4, height: 4, borderRadius: "50%", background: C.purple }} />}
              </div>
            );
          })}
        </div>

        {/* ── Item detail sheet ───────────────────────────────────────── */}
        {item && (
          <Sheet visible={sheetIn} onClose={closeItem}>
            {/* Color block / hero */}
            <div style={{ margin: "14px 22px", height: 200, borderRadius: 20, background: item.color, position: "relative", overflow: "hidden" }}>
              {item.img && <Sticker src={item.img} alt={item.name} pad={16} />}
              <div style={{ position: "absolute", bottom: 12, left: 12, background: "rgba(255,255,255,.88)", backdropFilter: "blur(8px)", borderRadius: 99, padding: "5px 14px", fontSize: 12, color: WX[item.wx].c, fontWeight: 700, border: `1px solid ${WX[item.wx].br}` }}>
                {WX[item.wx].label} 屬性
              </div>
              <div style={{ position: "absolute", top: 12, right: 12, background: "rgba(255,255,255,.88)", backdropFilter: "blur(8px)", borderRadius: 99, padding: "5px 14px", fontSize: 12, color: C.ink, fontWeight: 600 }}>
                {item.brand}
              </div>
            </div>
            <div style={{ padding: "0 22px 32px" }}>
              {/* Name */}
              <div style={{ ...serif, fontSize: 26, fontWeight: 600, color: C.ink, marginBottom: 10 }}>{item.name}</div>
              {/* Tags */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 18 }}>
                {[
                  { t: item.cat,    bg: C.purpleBg, c: C.purple },
                  { t: item.season, bg: "#f0f8f3",  c: "#5a9b75" },
                  { t: `${WX[item.wx].label} 屬性`, bg: WX[item.wx].bg, c: WX[item.wx].c },
                ].map((tag, i) => (
                  <span key={i} style={{ padding: "5px 14px", borderRadius: 99, background: tag.bg, color: tag.c, fontSize: 12, fontWeight: 600 }}>{tag.t}</span>
                ))}
              </div>
              {/* Stats */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
                <Stat label="穿著次數"    value={item.worn}             unit="次" sub={item.worn < 4 ? "需要多穿！" : item.worn > 15 ? "高利用率" : "一般"}    hl={item.worn < 4} />
                <Stat label="每次穿著成本" value={`$${cpw(item)}`}     unit=""   sub="Cost Per Wear"   hl={cpw(item) > 500} />
                <Stat label="購入價格"    value={`$${item.price.toLocaleString()}`} unit="" sub={item.brand} hl={false} />
                <Stat label="利用率"      value={item.worn < 4 ? "待加強" : item.worn > 15 ? "優秀" : "良好"} unit="" sub="" hl={item.worn < 4} />
              </div>
              {/* Actions */}
              <div style={{ display: "flex", gap: 10 }}>
                <button style={{ flex: 1, padding: 13, borderRadius: 14, border: `1.5px solid ${C.purpleBorder}`, background: C.surface, color: C.purple, fontSize: 14, fontWeight: 600, cursor: "pointer", ...sans }}>✏️ 編輯</button>
                <button style={{ flex: 1.5, padding: 13, borderRadius: 14, border: "none", background: C.terracotta, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", ...sans }}>♻️ 上架轉售</button>
              </div>
            </div>
          </Sheet>
        )}

        {/* ── Add modal ───────────────────────────────────────────────── */}
        {addOpen && (
          <Sheet visible={addIn} onClose={closeAdd} maxH="90%">
            <div style={{ padding: "14px 22px 44px" }}>

              {/* Step 0 — choose method */}
              {step === 0 && (
                <>
                  <div style={{ ...serif, fontSize: 26, fontWeight: 600, color: C.ink, marginBottom: 4 }}>新增衣物</div>
                  <div style={{ fontSize: 13, color: C.inkMuted, marginBottom: 22 }}>選擇新增方式</div>
                  <AddOption icon="👕" label="拍單品"          desc="AI 自動去背 · 智慧標籤辨識"            m="photo" bg={C.purpleBg}  br={C.purpleBorder} />
                  <AddOption icon="🧍" label="拍整身"          desc="一次辨識多件單品，自動拆解"            m="photo" bg={C.purpleBg}  br={C.purpleBorder} />
                  <AddOption icon="🔗" label="電商連結匯入"    desc="貼上連結，自動抓取名稱、圖片、品牌"     m="link"  bg={C.greenBg}   br={C.greenBorder} />
                </>
              )}

              {/* Step 1a — photo upload */}
              {step === 1 && method === "photo" && (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <button onClick={() => setStep(0)} style={{ background: "none", border: "none", cursor: "pointer", color: C.inkMuted, fontSize: 20 }}>←</button>
                    <div style={{ ...serif, fontSize: 24, fontWeight: 600, color: C.ink }}>拍照 / 從相簿</div>
                  </div>
                  <div style={{ fontSize: 12, color: C.inkMuted, marginBottom: 18 }}>AI 將自動去背並辨識類型</div>
                  <div style={{ height: 196, background: C.canvas, borderRadius: 18, border: "2px dashed #d8d4cc", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 16, cursor: "pointer" }}>
                    <div style={{ width: 60, height: 60, borderRadius: "50%", background: C.purpleBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>📷</div>
                    <div style={{ fontSize: 14, color: C.inkSoft, fontWeight: 500 }}>點此拍照或選取照片</div>
                    <div style={{ fontSize: 11, color: C.inkMuted }}>支援 JPG · PNG · HEIC</div>
                  </div>
                  <div style={{ background: C.purpleBg, borderRadius: 12, padding: "12px 14px", marginBottom: 16, display: "flex", gap: 10 }}>
                    <span style={{ fontSize: 16 }}>✨</span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: C.purple, marginBottom: 2 }}>AI 自動處理流程</div>
                      <div style={{ fontSize: 11, color: "#8a7ab8" }}>去背 → 顏色辨識 → 五行對應 → 類型標記</div>
                    </div>
                  </div>
                  <button onClick={() => setStep(2)} style={{ width: "100%", padding: 14, borderRadius: 14, border: "none", background: C.terracotta, color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", ...sans }}>AI 去背 →</button>
                </>
              )}

              {/* Step 1b — link import */}
              {step === 1 && method === "link" && (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <button onClick={() => setStep(0)} style={{ background: "none", border: "none", cursor: "pointer", color: C.inkMuted, fontSize: 20 }}>←</button>
                    <div style={{ ...serif, fontSize: 24, fontWeight: 600, color: C.ink }}>電商連結匯入</div>
                  </div>
                  <div style={{ fontSize: 12, color: C.inkMuted, marginBottom: 18 }}>自動抓取名稱、圖片、品牌與價格</div>
                  <div style={{ background: C.surface, borderRadius: 14, border: `1.5px solid ${C.purpleBorder}`, display: "flex", alignItems: "center", padding: "13px 16px", gap: 10, marginBottom: 12 }}>
                    <span style={{ fontSize: 15, color: C.inkMuted }}>🔗</span>
                    <input placeholder="貼上商品連結…" style={{ border: "none", outline: "none", background: "transparent", fontSize: 14, color: C.ink, flex: 1, ...sans }} />
                  </div>
                  <div style={{ padding: "12px 14px", background: "#fdf0d8", borderRadius: 12, marginBottom: 18 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#a07040", marginBottom: 6 }}>支援電商平台</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {["ZARA", "H&M", "Uniqlo", "momo", "蝦皮", "NET", "ASOS"].map(p => (
                        <span key={p} style={{ background: "#fff", borderRadius: 6, padding: "3px 8px", fontSize: 11, color: C.inkSoft, border: "1px solid #e8dcc8" }}>{p}</span>
                      ))}
                    </div>
                  </div>
                  <button onClick={() => setStep(2)} style={{ width: "100%", padding: 14, borderRadius: 14, border: "none", background: C.terracotta, color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", ...sans }}>自動抓取 →</button>
                </>
              )}

              {/* Step 2 — tag form */}
              {step === 2 && (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <button onClick={() => setStep(1)} style={{ background: "none", border: "none", cursor: "pointer", color: C.inkMuted, fontSize: 20 }}>←</button>
                    <div style={{ ...serif, fontSize: 24, fontWeight: 600, color: C.ink }}>填寫標籤</div>
                  </div>
                  <div style={{ fontSize: 12, color: C.inkMuted, marginBottom: 18 }}>
                    {method === "link" ? "已自動抓取，請確認或修改" : "AI 已去背完成，請補充標籤"}
                  </div>
                  {method === "photo" && (
                    <div style={{ height: 110, background: "#e8e4da", borderRadius: 14, marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#8a857c" }}>
                      去背完成 ✓ 預覽圖
                    </div>
                  )}
                  {[
                    { label: "品牌",    ph: "e.g. ZARA, Uniqlo",  dv: method === "link" ? "ZARA"  : "" },
                    { label: "類別",    ph: "選擇類別",              dv: method === "link" ? "洋裝"  : "" },
                    { label: "顏色",    ph: "e.g. 奶白、深藍",       dv: "" },
                    { label: "季節",    ph: "春夏 / 秋冬 / 四季",    dv: "" },
                    { label: "購入價格（NT$）", ph: "e.g. 1680",    dv: method === "link" ? "1680"  : "" },
                  ].map((f, i) => (
                    <div key={i} style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 11, color: C.inkSoft, fontWeight: 700, marginBottom: 5, textTransform: "uppercase", letterSpacing: ".5px" }}>{f.label}</div>
                      <input defaultValue={f.dv} placeholder={f.ph} style={{ width: "100%", padding: "11px 14px", borderRadius: 12, border: `1.5px solid ${f.dv ? "#a8d5b5" : C.border}`, background: f.dv ? "#f2faf4" : C.canvas, fontSize: 14, color: C.ink, outline: "none", boxSizing: "border-box", ...sans }} />
                    </div>
                  ))}
                  {/* Wu-Xing selector */}
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 11, color: C.inkSoft, fontWeight: 700, marginBottom: 8, textTransform: "uppercase", letterSpacing: ".5px" }}>五行屬性</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      {Object.entries(WX).map(([k, w]) => (
                        <button key={k} style={{ flex: 1, padding: "10px 4px", borderRadius: 12, border: `1.5px solid ${w.br}`, background: w.bg, color: w.c, fontSize: 14, fontWeight: 700, cursor: "pointer", ...sans, transition: "transform 120ms" }}
                          onMouseDown={e => e.currentTarget.style.transform = "scale(.9)"}
                          onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
                        >{w.label}</button>
                      ))}
                    </div>
                  </div>
                  <button onClick={closeAdd} style={{ width: "100%", padding: 15, borderRadius: 16, border: "none", background: C.terracotta, color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer", ...serif, letterSpacing: ".3px" }}>
                    加入衣櫥
                  </button>
                </>
              )}

            </div>
          </Sheet>
        )}

        {/* ── 衣櫥分析 sheet（統計概覽 + 衣櫥健檢，合併一頁） ──────────── */}
        {anaOpen && (
          <Sheet visible={anaIn} onClose={closeAna} maxH="90%">
            <div style={{ padding: "14px 22px 40px" }}>
              {/* Title */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <Lucide name="bar" size={22} color={C.purple} />
                <div style={{ ...serif, fontSize: 26, fontWeight: 600, color: C.ink }}>衣櫥分析</div>
              </div>
              <div style={{ fontSize: 12, color: C.inkMuted, marginBottom: 22 }}>統計概覽 + 衣櫥健檢 · 僅供參考</div>

              {/* ① 統計概覽 */}
              <div style={{ fontSize: 11, color: C.inkSoft, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 10 }}>① 統計概覽</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                <Stat label="總穿著次數" value={totalWears}                  unit="次" sub={`${ITEMS.length} 件單品`} hl={false} />
                <Stat label="衣櫥總值"   value={`$${totalValue.toLocaleString()}`} unit="" sub="購入價總和"   hl={false} />
                <Stat label="平均 CPW"   value={`$${avgCpw}`}                unit=""   sub="每次穿著成本"   hl={avgCpw > 500} />
                <Stat label="利用率"     value={utilization}                 unit="%"  sub="≥4 次穿著佔比" hl={utilization < 60} />
              </div>

              {/* 單品類型分布（donut）*/}
              <div style={{ background: "#faf9f6", border: `1px solid ${C.border}`, borderRadius: 16, padding: 14, marginBottom: 14, display: "flex", alignItems: "center", gap: 18 }}>
                <Donut data={catDist} total={ITEMS.length} />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ fontSize: 11, color: C.inkMuted, fontStyle: "italic", marginBottom: 2 }}>單品類型分布</div>
                  {catDist.map(({ c, n, color }) => (
                    <div key={c} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 3, background: color, flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 12, color: C.ink }}>{c}</span>
                      <span style={{ fontSize: 12, color: C.inkSoft, fontWeight: 600, ...sans }}>{n}</span>
                      <span style={{ width: 38, textAlign: "right", fontSize: 11, color: C.inkMuted, ...sans }}>{Math.round(n / ITEMS.length * 100)}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 五行分布 */}
              <div style={{ background: "#faf9f6", border: `1px solid ${C.border}`, borderRadius: 16, padding: 14, marginBottom: 24 }}>
                <div style={{ fontSize: 11, color: C.inkMuted, fontStyle: "italic", marginBottom: 12 }}>五行分布</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                  {wxDist.map(({ k, n }) => {
                    const w = WX[k];
                    const pct = Math.round(n / ITEMS.length * 100);
                    return (
                      <div key={k} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ width: 20, height: 20, borderRadius: "50%", background: w.bg, border: `1px solid ${w.br}`, color: w.c, fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{w.label}</span>
                        <div style={{ flex: 1, height: 8, borderRadius: 99, background: C.canvas, overflow: "hidden" }}>
                          <div style={{ width: `${pct}%`, height: "100%", background: w.c, borderRadius: 99, transition: "width 400ms ease-out" }} />
                        </div>
                        <span style={{ width: 34, textAlign: "right", fontSize: 11, color: C.inkSoft, ...sans }}>{n} 件</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ② 衣櫥健檢（可行動） */}
              <div style={{ fontSize: 11, color: C.inkSoft, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 10 }}>
                ② 衣櫥健檢 <span style={{ color: "#5a9b75", fontWeight: 600 }}>· 可行動</span>
              </div>
              <div style={{ background: C.greenBg, border: `1px solid ${C.greenBorder}`, borderRadius: 16, padding: "14px 16px", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: sleepyItems.length ? 6 : 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#2e7d4f" }}>{sleepy} 件 90 天未穿</div>
                  <span style={{ fontSize: 11, color: "#7aaa88" }}>利用率 {utilization}%</span>
                </div>
                {sleepyItems.map(it => (
                  <div key={it.id} onClick={() => { closeAna(); setTimeout(() => openItem(it), 340); }}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", cursor: "pointer", borderTop: `1px solid ${C.greenBorder}` }}>
                    <span style={{ width: 30, height: 30, borderRadius: 8, background: it.color, flexShrink: 0, position: "relative", overflow: "hidden" }}>
                      {it.img && <img src={it.img} alt={it.name} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />}
                    </span>
                    <div style={{ flex: 1, fontSize: 12.5, color: C.ink }}>{it.name}</div>
                    <span style={{ fontSize: 11, color: C.inkMuted }}>穿 {it.worn} 次</span>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="#5a9b75" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                ))}
              </div>
              <button onClick={closeAna} style={{ width: "100%", padding: 14, borderRadius: 14, border: "none", background: C.terracotta, color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", ...sans }}>♻️ 整理待轉售清單</button>
            </div>
          </Sheet>
        )}

      </div>
    </div>
  );
}

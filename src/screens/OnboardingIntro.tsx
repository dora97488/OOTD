// Onboarding 開場連續動畫（照 1~10 分鏡，用真實素材重現）：
// 信封固定中央 → 闔→開（底部對齊）→ 8 件衣物依檔名 1→8 順序從信封口「灑出」、由下往上層層疊起
// （後出的 z-index 疊在前面）→ 左上「Outfit Oracle」、結尾「Today」浮現 → 淡出進表單。
// 「從信封灑出」的視覺：再疊一張裁切過下半部前袋的信封蓋住衣物底部，衣物看起來從信封裡冒出來。
// 素材來自 wardrobe-prototype/img（Vite static import）。keyframes 以元件內 <style> 注入，不動 token。
import { useEffect, useRef, useState, type CSSProperties } from 'react';

import envelopeClosed from '../../wardrobe-prototype/img/envelope_1.png';
import envelopeOpen from '../../wardrobe-prototype/img/envelope_2.png';
import oracleTitle from '../../wardrobe-prototype/img/outfit_oracle.svg';
import todayTitle from '../../wardrobe-prototype/img/today.svg';
import cutoutPants1 from '../../wardrobe-prototype/img/cutout_pants_1.png';
import cutoutSkirtBrown2 from '../../wardrobe-prototype/img/cutout_skirt_brown_2.png';
import cutoutDress2 from '../../wardrobe-prototype/img/cutout_dress_2.png';
import cutoutShirt3 from '../../wardrobe-prototype/img/cutout_shirt_3.png';
import cutoutPants4 from '../../wardrobe-prototype/img/cutout_pants_4.png';
import cutoutCoat5 from '../../wardrobe-prototype/img/cutout_coat_5.png';
import cutoutShirt6 from '../../wardrobe-prototype/img/cutout_shirt_6.png';
import cutoutSleeveless7 from '../../wardrobe-prototype/img/cutout_sleeveless_7.png';
import cutoutOuter8 from '../../wardrobe-prototype/img/cutout_outer_8.png';

// 截圖指定的暖紙漸層（0% FFFEFD → 100% F2F0EA）
const INTRO_BG = 'linear-gradient(180deg, #FEFDFC 0%, #F2F0EA 100%)';

// 顯示用信封尺寸（open envelope_2：341x440 → 等比）。stack 以此為座標系，clothes 用 px 定位。
const ENV_W = 240;
const ENV_H = Math.round((ENV_W * 440) / 341); // ≈ 310

// 衣物灑出順序＝檔名編號 1→8；z-index 同序（後出疊在前）。
// 兩組座標（皆相對 stack 左上, px，bottom y）：
//   sx/sy = 起始（信封裡浮起後、騷動時的分散位置，較低）；cx/by = 結束（灑出後的最終定位）。
//   w = 顯示寬；rot = 旋轉(deg)。灑出方向 = (sx-cx, sy-by) 自動指向各自終點。
type Cloth = { src: string; cx: number; by: number; w: number; rot: number; sx: number; sy: number };
const CLOTHES: Cloth[] = [
  { src: cutoutPants1,      cx: 124, by: 243, w:  72, rot:  -8, sx: 124, sy: 280 }, // 1 先出（最底層）
  { src: cutoutSkirtBrown2, cx:  78, by: 214, w:  66, rot:  -4, sx:  78, sy: 244 }, // 2a 棕裙
  { src: cutoutDress2,      cx: 197, by: 176, w:  84, rot:  -3, sx: 191, sy: 265 }, // 2b 洋裝
  { src: cutoutShirt3,      cx:  53, by: 174, w:  66, rot:  -7, sx:  68, sy: 260 }, // 3
  { src: cutoutPants4,      cx:  90, by: 158, w:  66, rot:   7, sx: 105, sy: 270 }, // 4
  { src: cutoutCoat5,       cx: 173, by: 107, w:  78, rot:   9, sx: 151, sy: 260 }, // 5
  { src: cutoutShirt6,      cx: 129, by: 134, w:  82, rot:  -1, sx: 127, sy: 255 }, // 6
  { src: cutoutSleeveless7, cx: 133, by: 169, w:  72, rot:   1, sx: 143, sy: 280 }, // 7
  { src: cutoutOuter8,      cx: 169, by: 200, w:  82, rot:  11, sx: 183, sy: 280 }, // 8 最後出（最上層）
];

const OPEN_AT = 380;     // ms：闔信封淡出 → 打開的信封淡入（crossfade）；此後信封先空著
const FLOAT_AT = 600;    // ms：整群衣物從信封裡同步「浮起」現身（之前空信封）
const FLOAT_DUR = 900;   // ms：浮起上升時長（緩慢、絲滑）
const STIR_AT = 600;     // ms：整群衣物同步開始緩慢騷動（與浮起重疊 → 邊浮邊晃）
const STIR_DUR = 1000;   // ms：同步騷動時長（緩慢、絲滑；ease-in-out 一個來回）
const DROP_START = 1600; // ms：浮起＋騷動完後，第一件開始灑出
const DROP_STEP = 230;   // ms：每件灑出間隔（交錯）
const DROP_DUR = 900;    // ms：單件灑出時長
const TODAY_AT = DROP_START + DROP_STEP * (CLOTHES.length - 1) + DROP_DUR - 200; // 最後一件快落定時
const LEAVE_AT = TODAY_AT + 1100;
const DONE_AT = LEAVE_AT + 600;

export default function OnboardingIntro({ onDone }: { onDone: () => void }) {
  const [leaving, setLeaving] = useState(false);
  const doneRef = useRef(false);

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone();
  };

  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      finish();
      return;
    }
    const t1 = setTimeout(() => setLeaving(true), LEAVE_AT);
    const t2 = setTimeout(finish, DONE_AT);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const skip = () => {
    setLeaving(true);
    setTimeout(finish, 280);
  };

  return (
    <div
      className={`oi-stage${leaving ? ' oi-leave' : ''}`}
      style={{ background: INTRO_BG }}
      onClick={skip}
      role="button"
      aria-label="跳過開場動畫"
    >
      <style>{CSS}</style>

      <div className="oi-frame">
        {/* 左上標題 Outfit Oracle */}
        <img src={oracleTitle} alt="Outfit Oracle" className="oi-oracle" draggable={false} />

        {/* 信封 + 掉落衣物（座標系：ENV_W x ENV_H） */}
        <div className="oi-stack" style={{ width: ENV_W, height: ENV_H }}>
          {/* 打開的信封（底層） */}
          <img src={envelopeOpen} alt="" className="oi-env-open" draggable={false} />

          {/* 衣物四層：wrapper 定位(終點)＋旋轉｜oi-spill 交錯灑出(起點→終點)｜oi-float 同步浮起現身｜img 整群同步騷動 */}
          {CLOTHES.map((c, i) => (
            <div
              key={i}
              className="oi-cloth"
              style={{
                left: `${c.cx}px`,
                bottom: `${ENV_H - c.by}px`,
                width: `${c.w}px`,
                transform: `translateX(-50%) rotate(${c.rot}deg)`,
                zIndex: i + 1, // 後出的疊在前面
              }}
            >
              <div
                className="oi-spill"
                style={{
                  animationDelay: `${DROP_START + i * DROP_STEP}ms`, // 交錯：每件依序灑出
                  // 起點偏移：起始 − 終點 → 灑出方向自動朝各自最終位置
                  '--dx': `${c.sx - c.cx}px`,
                  '--dy': `${c.sy - c.by}px`,
                } as CSSProperties}
              >
                <div className="oi-float">
                  <img src={c.src} alt="" draggable={false} />
                </div>
              </div>
            </div>
          ))}

          {/* 前袋遮罩：同一張信封，裁切只露下半部前袋，蓋住衣物底部 → 像掉進信封裡 */}
          <img src={envelopeOpen} alt="" className="oi-env-front" draggable={false} />

          {/* 闔上的信封（最上層，起手淡出露出打開的信封） */}
          <img src={envelopeClosed} alt="" className="oi-env-closed" draggable={false} />
        </div>

        {/* 結尾草寫 Today */}
        <img src={todayTitle} alt="Today" className="oi-today" draggable={false} />
      </div>

      <span className="oi-skip">點一下跳過</span>
    </div>
  );
}

const CSS = `
.oi-stage{
  position:fixed; inset:0; z-index:50;
  display:grid; place-items:center;
  overflow:hidden; cursor:pointer;
  animation: oi-fade-in .4s ease both;
}
.oi-stage.oi-leave{ animation: oi-stage-out .55s ease forwards; }

/* 維持與 html 預覽相同的舞台比例（390×760 = 39:76），百分比定位才會落在相同相對位置。
   由「寬度」決定盒子（手機寬度受限），高度＝寬×76/39，重現 html 的 390×760，
   文字才會緊貼信封；frame 由 .oi-stage 的 place-items:center 置中。 */
.oi-frame{
  position:relative;
  width:min(100%, 420px);
  aspect-ratio: 39 / 76;
  max-height:100dvh;
}

.oi-oracle{
  position:absolute; top:14%; left:14%; width:80%; max-width:300px;
  opacity:0; animation: oi-title-in .8s ease ${OPEN_AT}ms both;
  user-select:none; -webkit-user-drag:none;
}
.oi-today{
  position:absolute; bottom:25%; left:26%; width:70%; max-width:215px;
  opacity:0; animation: oi-title-in .9s ease ${TODAY_AT}ms both;
  user-select:none; -webkit-user-drag:none;
}

/* stack 置中略偏上，讓底部留給 Today */
.oi-stack{
  position:absolute; left:50%; top:46%;
  transform:translate(-50%,-50%);
}

.oi-env-open, .oi-env-front{
  position:absolute; left:0; bottom:0; width:100%;
  user-select:none; -webkit-user-drag:none;
}
/* 打開的信封與前袋遮罩：先隱藏，到 OPEN_AT 才 crossfade 淡入（起初只見闔上信封） */
.oi-env-open{ z-index:0; opacity:0; animation: oi-fade-in .5s ease ${OPEN_AT}ms both; }
/* 前袋：裁切只留下半部（上緣中央微 V），蓋住衣物底部。z 高於所有衣物。 */
.oi-env-front{
  z-index:20; opacity:0;
  clip-path: polygon(0% 44%, 12% 46%, 35% 65%, 64% 65%, 88% 45%, 97% 45%, 97% 100%, 50% 100%, 0% 100%);
  animation: oi-fade-in .5s ease ${OPEN_AT}ms both;
}

/* 闔上的信封：底部對齊，開場落下定位，到 OPEN_AT 淡出露出打開的信封 */
.oi-env-closed{
  position:absolute; left:0; bottom:0; width:100%;
  z-index:30;
  animation: oi-env-in .7s cubic-bezier(.2,.8,.2,1) both,
             oi-open-swap .45s ease ${OPEN_AT}ms forwards;
  user-select:none; -webkit-user-drag:none;
}

.oi-cloth{ position:absolute; }
/* 灑出層：起點→終點位移（每件交錯延遲，inline 設 animationDelay 與 --dx/--dy） */
.oi-spill{
  width:100%;
  animation: oi-spill ${DROP_DUR}ms cubic-bezier(.34,.62,.3,1) both;
  will-change: transform;
}
/* 浮起層：整群同步從信封裡浮現上升（之前空信封；opacity 由此控制） */
.oi-float{
  opacity:0;
  animation: oi-float ${FLOAT_DUR}ms ease-out both;
  animation-delay: ${FLOAT_AT}ms;
  will-change: transform, opacity;
}
/* 衣物本體：整群同步緩慢騷動（同一 delay，所以大家一起晃；ease-in-out 絲滑） */
.oi-cloth img{
  display:block; width:100%; height:auto;
  filter: drop-shadow(0 8px 12px rgba(120,100,80,.16));
  animation: oi-stir ${STIR_DUR}ms ease-in-out both;
  animation-delay: ${STIR_AT}ms;
  will-change: transform;
  user-select:none; -webkit-user-drag:none;
}

.oi-skip{
  position:absolute; bottom:3.5%; left:0; right:0; text-align:center;
  font-size:12px; letter-spacing:.1em; color:#bfb4a3;
  animation: oi-fade-in .6s ease 1.2s both;
}

@keyframes oi-fade-in{ from{opacity:0} to{opacity:1} }
@keyframes oi-stage-out{ to{ opacity:0; } }
@keyframes oi-env-in{
  0%   { opacity:0; transform:translateY(28px) scale(.45); }
  55%  { opacity:1; }
  100% { opacity:1; transform:translateY(0) scale(1); }
}
@keyframes oi-open-swap{ to{ opacity:0; } }
@keyframes oi-title-in{ from{ opacity:0; transform:translateY(-12px); } to{ opacity:1; transform:translateY(0); } }

/* 整群同步「浮起」：之前空信封 → 從下方緩緩升起、淡入現身（套在 oi-float，整群同一 delay） */
@keyframes oi-float{
  0%   { opacity:0; transform: translateY(34px); }
  100% { opacity:1; transform: translateY(0); }
}
/* 整群同步「騷動」：緩慢、絲滑的左右小幅搖擺＋微微上浮露出（套在 img，整群同一 delay 齊步動） */
@keyframes oi-stir{
  0%   { transform: translate(0, 0)       rotate(0deg); }
  20%  { transform: translate(2.5px, -3px) rotate(1.4deg); }
  50%  { transform: translate(-2.5px, -4px) rotate(-1.4deg); }
  80%  { transform: translate(1.5px, -2px) rotate(.8deg); }
  100% { transform: translate(0, 0)       rotate(0deg); }
}
/* 交錯「灑出」：從起始偏移（--dx/--dy）朝各自最終方向移出、微衝過頭再落定（套在 oi-spill） */
@keyframes oi-spill{
  0%   { transform: translate(var(--dx), var(--dy)); }
  82%  { transform: translate(0, -6px); }
  100% { transform: translate(0, 0); }
}

@media (prefers-reduced-motion: reduce){
  .oi-stage, .oi-oracle, .oi-today, .oi-env-open, .oi-env-front, .oi-env-closed, .oi-spill, .oi-float, .oi-cloth img, .oi-skip{
    animation:none !important; opacity:1;
  }
  .oi-env-closed{ display:none; }
}
`;

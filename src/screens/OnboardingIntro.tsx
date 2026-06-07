// Onboarding 開場連續動畫（照 1~10 分鏡，用真實素材重現）：
// 信封固定中央 → 闔→開（底部對齊）→ 8 件衣物依檔名 1→8 順序「掉進」信封口、層層疊成一束
// （後掉的 z-index 疊在前面）→ 左上「Outfit Oracle」、結尾「Today」浮現 → 淡出進表單。
// 「掉進信封」的視覺：再疊一張裁切過下半部前袋的信封蓋住衣物底部，衣物看起來塞在信封裡。
// 素材來自 wardrobe-prototype/img（Vite static import）。keyframes 以元件內 <style> 注入，不動 token。
import { useEffect, useRef, useState } from 'react';

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
const INTRO_BG = 'linear-gradient(180deg, #FFFEFD 0%, #F2F0EA 100%)';

// 顯示用信封尺寸（open envelope_2：341x440 → 等比）。stack 以此為座標系，clothes 用 px 定位。
const ENV_W = 240;
const ENV_H = Math.round((ENV_W * 440) / 341); // ≈ 310

// 衣物掉落順序＝檔名編號 1→8；z-index 同序（後掉疊在前）。
// cx/by = 衣物中心 x、底部 y（相對 stack 左上，單位 px）；w = 顯示寬；rot = 最終旋轉。
type Cloth = { src: string; cx: number; by: number; w: number; rot: number };
const CLOTHES: Cloth[] = [
  { src: cutoutPants1,      cx: 122, by: 244, w:  72, rot:  -8 }, // 1 先掉（最底層）
  { src: cutoutSkirtBrown2, cx:  77, by: 209, w:  66, rot:  -4 }, // 2a 棕裙
  { src: cutoutDress2,      cx: 194, by: 210, w:  84, rot:  -3 }, // 2b 洋裝
  { src: cutoutShirt3,      cx:  59, by: 181, w:  66, rot:  -7 }, // 3
  { src: cutoutPants4,      cx:  88, by: 169, w:  66, rot:   7 }, // 4
  { src: cutoutCoat5,       cx: 161, by: 169, w:  78, rot:  14 }, // 5
  { src: cutoutShirt6,      cx: 121, by: 166, w:  82, rot:  -1 }, // 6
  { src: cutoutSleeveless7, cx: 127, by: 192, w:  72, rot:   1 }, // 7
  { src: cutoutOuter8,      cx: 168, by: 214, w:  82, rot:  11 }, // 8 最後掉（最上層）
];

const OPEN_AT = 380;     // ms：闔信封淡出 → 打開的信封淡入（crossfade）
const DROP_START = 1000; // ms：第一件衣物開始掉落（信封已明顯打開）
const DROP_STEP = 230;   // ms：每件間隔
const DROP_DUR = 900;    // ms：單件掉落時長
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

          {/* 衣物：wrapper 定位＋旋轉，內層 img 做掉落位移 */}
          {CLOTHES.map((c, i) => (
            <div
              key={i}
              className="oi-cloth"
              style={{
                left: `${c.cx}px`,
                bottom: `${ENV_H - c.by}px`,
                width: `${c.w}px`,
                transform: `translateX(-50%) rotate(${c.rot}deg)`,
                zIndex: i + 1, // 後掉的疊在前面
              }}
            >
              <img
                src={c.src}
                alt=""
                draggable={false}
                style={{ animationDelay: `${DROP_START + i * DROP_STEP}ms` }}
              />
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

.oi-frame{
  position:relative;
  width:min(100%, 420px); height:100dvh;
}

.oi-oracle{
  position:absolute; top:16%; left:14%; width:80%; max-width:300px;
  opacity:0; animation: oi-title-in .8s ease ${OPEN_AT}ms both;
  user-select:none; -webkit-user-drag:none;
}
.oi-today{
  position:absolute; bottom:23%; left:26%; width:70%; max-width:215px;
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
.oi-cloth > img{
  display:block; width:100%; height:auto;
  filter: drop-shadow(0 8px 12px rgba(120,100,80,.16));
  opacity:0;
  animation: oi-drop ${DROP_DUR}ms cubic-bezier(.34,.62,.3,1) both;
  will-change: transform, opacity;
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
  from{ opacity:0; transform:translateY(28px) scale(.92); }
  to{ opacity:1; transform:translateY(0) scale(1); }
}
@keyframes oi-open-swap{ to{ opacity:0; } }
@keyframes oi-title-in{ from{ opacity:0; transform:translateY(-12px); } to{ opacity:1; transform:translateY(0); } }

/* 衣物從上方「掉進」信封：先快落、再微微回彈定位（位移疊在 wrapper 的旋轉之上） */
@keyframes oi-drop{
  0%   { opacity:0; transform: translateY(-300px); }
  8%   { opacity:1; }
  72%  { transform: translateY(14px); }
  86%  { transform: translateY(-5px); }
  100% { opacity:1; transform: translateY(0); }
}

@media (prefers-reduced-motion: reduce){
  .oi-stage, .oi-oracle, .oi-today, .oi-env-open, .oi-env-front, .oi-env-closed, .oi-cloth>img, .oi-skip{
    animation:none !important; opacity:1;
  }
  .oi-env-closed{ display:none; }
}
`;

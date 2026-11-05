import { useEffect, useRef } from 'react';
import { getCity } from '../game/city';
import { HALF } from '../game/config';
import { game, useStore } from '../game/state';

const city = getCity();
const MAP = 170;
const scale = MAP / (HALF * 2 + 30);
const toMap = (v: number) => MAP / 2 + v * scale;

// Draw the static part of the minimap once
function drawStaticMap(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = MAP * 2;
  const g = c.getContext('2d')!;
  g.scale(2, 2);
  g.fillStyle = '#2b3038';
  g.fillRect(0, 0, MAP, MAP);
  g.fillStyle = '#5b626c';
  for (const b of city.blocks) g.fillRect(toMap(b.x - b.w / 2), toMap(b.z - b.d / 2), b.w * scale, b.d * scale);
  g.fillStyle = '#4f8a3c';
  for (const p of city.parks) g.fillRect(toMap(p.x - p.w / 2), toMap(p.z - p.d / 2), p.w * scale, p.d * scale);
  for (const b of city.buildings) {
    const t = Math.min(1, b.h / 64);
    const l = Math.round(150 + t * 90);
    g.fillStyle = `rgb(${l},${l},${l + 8})`;
    g.fillRect(toMap(b.x - b.w / 2), toMap(b.z - b.d / 2), b.w * scale, b.d * scale);
  }
  g.fillStyle = '#3ddc84';
  for (const b of city.buildings)
    if (b.charger) {
      g.beginPath();
      g.arc(toMap(b.x), toMap(b.z), 3, 0, Math.PI * 2);
      g.fill();
    }
  g.fillStyle = '#ff6b35';
  g.beginPath();
  g.arc(toMap(0), toMap(0), 3.5, 0, Math.PI * 2);
  g.fill();
  return c;
}

const fmtTime = (s: number) => {
  const t = Math.max(0, Math.ceil(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
};

export function HUD() {
  const score = useRef<HTMLSpanElement>(null);
  const deliveries = useRef<HTMLSpanElement>(null);
  const streak = useRef<HTMLSpanElement>(null);
  const step = useRef<HTMLDivElement>(null);
  const place = useRef<HTMLDivElement>(null);
  const detail = useRef<HTMLDivElement>(null);
  const timer = useRef<HTMLDivElement>(null);
  const timerBar = useRef<HTMLDivElement>(null);
  const battery = useRef<HTMLDivElement>(null);
  const batteryText = useRef<HTMLSpanElement>(null);
  const hull = useRef<HTMLDivElement>(null);
  const hullText = useRef<HTMLSpanElement>(null);
  const alt = useRef<HTMLSpanElement>(null);
  const spd = useRef<HTMLSpanElement>(null);
  const windArrow = useRef<HTMLDivElement>(null);
  const windText = useRef<HTMLSpanElement>(null);
  const charging = useRef<HTMLDivElement>(null);
  const map = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const base = drawStaticMap();
    const ctx = map.current!.getContext('2d')!;
    let raf = 0;
    let frame = 0;

    const tick = () => {
      raf = requestAnimationFrame(tick);
      frame++;
      const o = game.order;
      score.current!.textContent = String(game.score);
      deliveries.current!.textContent = String(game.deliveries);
      streak.current!.textContent = game.streak > 1 ? `×${game.streak}` : '–';

      if (o) {
        const tgt = game.carrying
          ? { x: o.drop.x, y: o.drop.h, z: o.drop.z }
          : { x: o.pickup.x, y: 0, z: o.pickup.z };
        const dist = Math.hypot(tgt.x - game.pos.x, tgt.z - game.pos.z);
        const dy = tgt.y - game.pos.y;
        step.current!.textContent =
          (game.carrying ? 'STEP 2 / 2 · DELIVER' : 'STEP 1 / 2 · PICK UP') + (o.fragile ? ' · 🥚 FRAGILE' : '');
        step.current!.className = game.carrying ? 'step drop' : 'step pickup';
        place.current!.textContent = game.carrying
          ? `${o.drop.address} — rooftop`
          : `${o.pickup.name} · ${o.pickup.corner}`;
        const vert = Math.abs(dy) < 3 ? 'level with you' : dy > 0 ? `${Math.round(dy)} m above you` : `${Math.round(-dy)} m below you`;
        detail.current!.textContent = `${Math.round(dist)} m away · ${vert}`;
        timer.current!.textContent = fmtTime(o.timeLeft);
        timer.current!.classList.toggle('urgent', o.timeLeft < 10);
        timerBar.current!.style.width = `${(o.timeLeft / o.timeLimit) * 100}%`;
      }

      const b = Math.max(0, game.battery);
      battery.current!.style.width = `${b}%`;
      battery.current!.style.background = b < 20 ? '#ff4d4d' : b < 45 ? '#ffb020' : '#3ddc84';
      batteryText.current!.textContent = `${Math.round(b)}%`;
      hull.current!.style.width = `${Math.max(0, game.hull)}%`;
      hullText.current!.textContent = `${Math.round(Math.max(0, game.hull))}%`;
      alt.current!.textContent = `${Math.round(game.pos.y)} m`;
      spd.current!.textContent = `${Math.round(Math.hypot(game.vel.x, game.vel.z) * 3.6)} km/h`;
      charging.current!.style.opacity = game.charging ? '1' : '0';

      // wind arrow relative to where the drone is facing (up = forward)
      const w = game.wind;
      const fx = -Math.sin(game.yaw);
      const fz = -Math.cos(game.yaw);
      const rx = Math.cos(game.yaw);
      const rz = -Math.sin(game.yaw);
      const ang = Math.atan2(w.x * rx + w.z * rz, w.x * fx + w.z * fz);
      windArrow.current!.style.transform = `rotate(${ang}rad)`;
      const ws = w.length();
      windText.current!.textContent = ws < 0.8 ? 'calm' : `${Math.round(ws * 3.6)} km/h`;

      // minimap ~20fps
      if (frame % 3 === 0) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, MAP * 2, MAP * 2);
        ctx.drawImage(base, 0, 0);
        ctx.scale(2, 2);
        if (o) {
          const tx = game.carrying ? o.drop.x : o.pickup.x;
          const tz = game.carrying ? o.drop.z : o.pickup.z;
          const pulse = 4 + Math.sin(performance.now() / 150) * 1.5;
          ctx.fillStyle = game.carrying ? '#38e1ff' : '#ffb020';
          ctx.beginPath();
          ctx.arc(toMap(tx), toMap(tz), pulse, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.save();
        ctx.translate(toMap(game.pos.x), toMap(game.pos.z));
        ctx.rotate(-game.yaw);
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, -6);
        ctx.lineTo(4.5, 5);
        ctx.lineTo(-4.5, 5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="hud">
      <div className="panel stats">
        <div><label>Score</label><span ref={score}>0</span></div>
        <div><label>Delivered</label><span ref={deliveries}>0</span></div>
        <div><label>Streak</label><span ref={streak}>–</span></div>
      </div>

      <div className="panel order">
        <div ref={step} className="step pickup">STEP 1 / 2 · PICK UP</div>
        <div ref={place} className="place">—</div>
        <div ref={detail} className="detail">—</div>
        <div className="timer-row">
          <div className="timer-track"><div ref={timerBar} className="timer-bar" /></div>
          <div ref={timer} className="timer">0:00</div>
        </div>
      </div>

      <div className="panel gauges">
        <div className="gauge">
          <label>Battery <span ref={batteryText}>100%</span></label>
          <div className="track"><div ref={battery} className="bar" /></div>
        </div>
        <div className="gauge">
          <label>Hull <span ref={hullText}>100%</span></label>
          <div className="track"><div ref={hull} className="bar hull" /></div>
        </div>
        <div className="readouts">
          <span>ALT <b ref={alt}>0 m</b></span>
          <span>SPD <b ref={spd}>0</b></span>
        </div>
        <div ref={charging} className="charging">⚡ Charging…</div>
      </div>

      <div className="panel mapbox">
        <canvas ref={map} width={MAP * 2} height={MAP * 2} style={{ width: MAP, height: MAP }} />
        <div className="wind">
          <div ref={windArrow} className="wind-arrow">↑</div>
          <div>
            <label>Wind</label>
            <span ref={windText}>calm</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Toasts() {
  const toasts = useStore((s) => s.toasts);
  return (
    <div className="toasts">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.tone}`}>
          {t.text}
        </div>
      ))}
    </div>
  );
}

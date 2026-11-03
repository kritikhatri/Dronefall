import { useStore } from '../game/state';

const CONTROLS: [string, string][] = [
  ['W / S', 'Fly forward / back'],
  ['A / D', 'Turn left / right'],
  ['Q / E', 'Slide sideways'],
  ['Space', 'Climb'],
  ['Shift / C', 'Descend'],
  ['V', 'Switch camera'],
  ['P / Esc', 'Pause'],
  ['M', 'Mute'],
];

function Controls() {
  return (
    <div className="controls">
      {CONTROLS.map(([k, v]) => (
        <div key={k}>
          <kbd>{k}</kbd>
          <span>{v}</span>
        </div>
      ))}
    </div>
  );
}

export function Menu({ onStart }: { onStart: () => void }) {
  const best = useStore((s) => s.best);
  return (
    <div className="screen">
      <div className="card">
        <div className="logo">
          DRONE<span>FALL</span>
        </div>
        <p className="tagline">Pick up parcels. Beat the clock. Don't let the battery die.</p>
        <ul className="how">
          <li>
            <i className="dot pickup" /> Hover low over the <b>amber</b> beam to grab a parcel
          </li>
          <li>
            <i className="dot drop" /> Fly it to the <b>blue</b> beam and hover over the rooftop
          </li>
          <li>
            <i className="dot charge" /> Land on <b>green ⚡</b> rooftops (or HQ) to recharge
          </li>
          <li>🌬 Wind gets stronger the more you deliver</li>
        </ul>
        <Controls />
        <button className="btn" onClick={onStart} autoFocus>
          Start flying
        </button>
        {best > 0 && <div className="best">Best score: {best}</div>}
      </div>
    </div>
  );
}

export function Paused({ onResume, onQuit }: { onResume: () => void; onQuit: () => void }) {
  return (
    <div className="screen dim">
      <div className="card small">
        <div className="title">Paused</div>
        <Controls />
        <button className="btn" onClick={onResume}>
          Resume
        </button>
        <button className="btn ghost" onClick={onQuit}>
          Quit to menu
        </button>
      </div>
    </div>
  );
}

export function GameOver({ onRestart, onMenu }: { onRestart: () => void; onMenu: () => void }) {
  const result = useStore((s) => s.result);
  const best = useStore((s) => s.best);
  if (!result) return null;
  return (
    <div className="screen dim">
      <div className="card small">
        <div className="title">{result.reason}</div>
        <div className="final">
          <div>
            <label>Score</label>
            <b>{result.score}</b>
          </div>
          <div>
            <label>Deliveries</label>
            <b>{result.deliveries}</b>
          </div>
          <div>
            <label>Best</label>
            <b>{best}</b>
          </div>
        </div>
        {result.newBest && <div className="newbest">New best score!</div>}
        <button className="btn" onClick={onRestart}>
          Fly again
        </button>
        <button className="btn ghost" onClick={onMenu}>
          Main menu
        </button>
      </div>
    </div>
  );
}

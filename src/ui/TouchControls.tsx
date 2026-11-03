import { setVirtualKey } from '../game/input';

// Simple on-screen buttons for phones and tablets
function Btn({ code, label, className = '' }: { code: string; label: string; className?: string }) {
  const on = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    setVirtualKey(code, true);
  };
  const off = () => setVirtualKey(code, false);
  return (
    <button
      className={`tbtn ${className}`}
      onPointerDown={on}
      onPointerUp={off}
      onPointerCancel={off}
      onPointerLeave={off}
      onContextMenu={(e) => e.preventDefault()}
    >
      {label}
    </button>
  );
}

export function TouchControls() {
  return (
    <div className="touch">
      <div className="pad left">
        <Btn code="KeyW" label="▲" className="up" />
        <Btn code="KeyA" label="⟲" className="lt" />
        <Btn code="KeyD" label="⟳" className="rt" />
        <Btn code="KeyS" label="▼" className="dn" />
      </div>
      <div className="pad right">
        <Btn code="Space" label="Climb" className="up" />
        <Btn code="KeyQ" label="◀" className="lt" />
        <Btn code="KeyE" label="▶" className="rt" />
        <Btn code="KeyC" label="Drop" className="dn" />
      </div>
    </div>
  );
}

// Keyboard state, plus a virtual "keys" set that the on-screen touch controls write to.
const pressed = new Set<string>();

const BLOCKED = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

export function initInput(onKey: (code: string) => void) {
  const down = (e: KeyboardEvent) => {
    if (BLOCKED.has(e.code)) e.preventDefault();
    if (!e.repeat) onKey(e.code);
    pressed.add(e.code);
  };
  const up = (e: KeyboardEvent) => pressed.delete(e.code);
  const blur = () => pressed.clear();
  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  window.addEventListener('blur', blur);
  return () => {
    window.removeEventListener('keydown', down);
    window.removeEventListener('keyup', up);
    window.removeEventListener('blur', blur);
  };
}

export function setVirtualKey(code: string, on: boolean) {
  if (on) pressed.add(code);
  else pressed.delete(code);
}

const k = (...codes: string[]) => (codes.some((c) => pressed.has(c)) ? 1 : 0);

export function readControls() {
  return {
    forward: k('KeyW', 'ArrowUp') - k('KeyS', 'ArrowDown'),
    turn: k('KeyA', 'ArrowLeft') - k('KeyD', 'ArrowRight'),
    strafe: k('KeyE') - k('KeyQ'),
    lift: k('Space') - k('ShiftLeft', 'ShiftRight', 'KeyC'),
  };
}

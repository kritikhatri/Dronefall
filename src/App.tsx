import { Canvas } from '@react-three/fiber';
import { Sky } from '@react-three/drei';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { City } from './components/City';
import { Drone } from './components/Drone';
import { Markers } from './components/Markers';
import { WindStreaks } from './components/WindStreaks';
import { initInput } from './game/input';
import { newOrder } from './game/logic';
import { sfx } from './game/sfx';
import { game, resetGame, useStore } from './game/state';
import { HUD, Toasts } from './ui/HUD';
import { GameOver, Menu, Paused } from './ui/Screens';
import { TouchControls } from './ui/TouchControls';

const isTouch = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

function Scene() {
  const sun = useRef<THREE.DirectionalLight>(null);
  return (
    <>
      <Sky sunPosition={[120, 60, 80]} turbidity={6} rayleigh={1.2} mieCoefficient={0.006} mieDirectionalG={0.85} />
      <fog attach="fog" args={['#c9dcea', 90, 420]} />
      <hemisphereLight args={['#e6f4ff', '#6b5e50', 1.1]} />
      <directionalLight
        ref={sun}
        intensity={2.4}
        color="#fff1dc"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-70}
        shadow-camera-right={70}
        shadow-camera-top={70}
        shadow-camera-bottom={-70}
        shadow-camera-near={10}
        shadow-camera-far={300}
        shadow-bias={-0.0004}
      />
      <City />
      <Markers />
      <Drone sun={sun} />
      <WindStreaks />
    </>
  );
}

export default function App() {
  const phase = useStore((s) => s.phase);
  const setPhase = useStore((s) => s.setPhase);
  const [muted, setMuted] = useState(false);

  const start = () => {
    resetGame();
    newOrder();
    sfx.start();
    setPhase('playing');
    useStore.getState().toast('Fly to the amber beam to pick up your first parcel', 'info');
  };

  useEffect(
    () =>
      initInput((code) => {
        const s = useStore.getState();
        if (code === 'KeyP' || code === 'Escape') {
          if (s.phase === 'playing') {
            s.setPhase('paused');
            sfx.setRotor(0, false);
          } else if (s.phase === 'paused') s.setPhase('playing');
        }
        if (code === 'KeyV') game.camFar = !game.camFar;
        if (code === 'KeyM') setMuted(sfx.toggleMute());
      }),
    [],
  );

  // Pause automatically when the tab is hidden
  useEffect(() => {
    const onVis = () => {
      if (document.hidden && useStore.getState().phase === 'playing') {
        useStore.getState().setPhase('paused');
        sfx.setRotor(0, false);
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const toMenu = () => {
    resetGame();
    sfx.setRotor(0, false);
    setPhase('menu');
  };

  return (
    <>
      <Canvas shadows dpr={[1, 2]} camera={{ fov: 62, near: 0.1, far: 1200, position: [150, 85, 0] }}>
        <Scene />
      </Canvas>
      {(phase === 'playing' || phase === 'paused') && <HUD />}
      <Toasts />
      {phase === 'playing' && isTouch && <TouchControls />}
      {phase === 'menu' && <Menu onStart={start} />}
      {phase === 'paused' && <Paused onResume={() => setPhase('playing')} onQuit={toMenu} />}
      {phase === 'over' && <GameOver onRestart={start} onMenu={toMenu} />}
      {phase === 'playing' && (
        <div className="corner-hint">
          P pause · V camera · M {muted ? 'unmute' : 'mute'}
        </div>
      )}
    </>
  );
}

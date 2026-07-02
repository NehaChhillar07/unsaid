'use client';

// app-lifetime "felt this" celebration layer.
//
// the heart spray used to be a createPortal(..., document.body) rendered from
// *inside* ConfessionCard. but the card lives in CardDeck's keyed, imperatively
// -animated layer that unmounts on every swipe/advance — so advancing the card
// within the burst's lifetime made React tear down the portal's host and then
// try to remove the portaled node from a null parent ("removeChild of null").
//
// fix: the celebration lives here, mounted once near the app root (stable for
// the whole session). cards merely *trigger* a burst at a screen position via
// context; their mount/unmount no longer touches the burst's DOM at all.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import styles from './ConfessionCard.module.css';

interface Burst {
  key: number;
  x: number;
  y: number;
}

/** trigger a heart burst anchored at a screen position (button centre / top) */
export type FeltBurstTrigger = (x: number, y: number) => void;

// default is a no-op so ConfessionCard can render outside a provider
// (e.g. the server-rendered /p/[id] card) without throwing.
const Ctx = createContext<FeltBurstTrigger>(() => {});

export function useFeltBurst(): FeltBurstTrigger {
  return useContext(Ctx);
}

export function FeltBurstProvider({ children }: { children: ReactNode }) {
  const [bursts, setBursts] = useState<Burst[]>([]);
  const seq = useRef(0);
  const timers = useRef<number[]>([]);

  // never leave a timer running past unmount
  useEffect(
    () => () => {
      timers.current.forEach((t) => window.clearTimeout(t));
      timers.current = [];
    },
    [],
  );

  const trigger = useCallback<FeltBurstTrigger>((x, y) => {
    const key = (seq.current += 1);
    setBursts((b) => [...b, { key, x, y }]);
    const t = window.setTimeout(() => {
      setBursts((b) => b.filter((it) => it.key !== key));
    }, 2000);
    timers.current.push(t);
  }, []);

  return (
    <Ctx.Provider value={trigger}>
      {children}
      {bursts.map((b) => (
        <HeartSpray key={b.key} x={b.x} y={b.y} />
      ))}
    </Ctx.Provider>
  );
}

function HeartSpray({ x, y }: { x: number; y: number }) {
  return (
    <div className={styles.screenHearts} style={{ left: x, top: y }} aria-hidden="true">
      <span className={styles.burstGlow} />
      {Array.from({ length: 12 }).map((_, i) => {
        const dir = i % 2 ? 1 : -1;
        const spread = (8 + (i % 6) * 13) * dir;
        return (
          <span
            key={i}
            className={styles.screenHeart}
            style={
              {
                '--x1': `${spread * 0.4}px`,
                '--x2': `${spread}px`,
                '--rise': `${-(170 + (i % 5) * 48)}px`,
                fontSize: `${16 + (i % 3) * 6}px`,
                animationDuration: `${1.1 + (i % 4) * 0.18}s`,
                animationDelay: `${(i % 6) * 0.05}s`,
              } as React.CSSProperties
            }
          >
            ❤️
          </span>
        );
      })}
    </div>
  );
}

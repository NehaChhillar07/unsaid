'use client';

// intro hero — first-time animated welcome, ported from unsaid_BUILD_SPEC.md §2.
// the compose field IS the hero: it types a confession someone almost sent,
// hesitates, deletes it (the *unsaid*), then the brand resolves and the same
// field goes live for the visitor. dark "threshold" scene regardless of theme.
import { useEffect, useRef, useState } from 'react';
import { THRESHOLD } from '@unsaid/tokens';
import { prefersReducedMotion } from '@/lib/motion';
import { MaskIcon } from '../MaskIcon';

const DEMO = "i'm not as okay as everyone thinks i am.";
const accent = 'var(--accent)';
const { cream, creamSoft, creamFaint } = THRESHOLD;

type Stage = 'type' | 'hold' | 'erase' | 'gap' | 'brand';

export function IntroHero({ onDone }: { onDone: (confession?: string) => void }) {
  const [text, setText] = useState('');
  const [stage, setStage] = useState<Stage>('type');
  const [live, setLive] = useState(false);
  const [userText, setUserText] = useState('');
  const [releasing, setReleasing] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // orchestrated typewriter: type → hesitate → delete → silence → brand
  useEffect(() => {
    const reduce = prefersReducedMotion();
    let alive = true;
    const timers: number[] = [];
    const wait = (ms: number) => new Promise<void>((r) => timers.push(window.setTimeout(r, ms)));
    (async () => {
      if (reduce) {
        setText('');
        setStage('brand');
        setLive(true);
        return;
      }
      await wait(750);
      for (let i = 1; i <= DEMO.length && alive; i++) {
        setText(DEMO.slice(0, i));
        await wait(46 + Math.random() * 42);
      }
      if (!alive) return;
      setStage('hold');
      await wait(1150);
      if (!alive) return;
      setStage('erase');
      for (let i = DEMO.length - 1; i >= 0 && alive; i--) {
        setText(DEMO.slice(0, i));
        await wait(24);
      }
      if (!alive) return;
      setStage('gap');
      await wait(1000);
      if (!alive) return;
      setStage('brand');
      await wait(520);
      if (alive) setLive(true);
    })();
    return () => {
      alive = false;
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  const send = () => {
    const confession = userText.trim();
    if (!confession) return;
    setReleasing(true);
    // let the fly-up animation finish, then carry the confession into the explore
    // feed — it becomes the top card the visitor sees (IntroHero → ExploreLanding).
    window.setTimeout(() => onDone(confession), 900);
  };

  const showCaret = !live ? stage === 'type' || stage === 'hold' || stage === 'erase' : false;
  const fieldText = live ? userText : text;
  const isBrand = stage === 'brand';

  return (
    <div
      data-threshold="dark"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        overflow: 'hidden',
        background: THRESHOLD.introBg,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 30px',
        boxSizing: 'border-box',
        textAlign: 'center',
        animation: 'welScene .5s ease',
      }}
    >
      {/* soft warmth */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: -80,
          right: -50,
          width: 240,
          height: 240,
          borderRadius: 999,
          background: `radial-gradient(circle, color-mix(in srgb, ${accent} 22%, transparent), transparent 70%)`,
          filter: 'blur(10px)',
          animation: 'drift 10s ease-in-out infinite alternate',
        }}
      />

      {/* brand — rises in once the demo has played */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          height: isBrand ? 'auto' : 0,
          overflow: 'visible',
          opacity: isBrand ? 1 : 0,
          transform: isBrand ? 'translateY(0)' : 'translateY(14px)',
          transition: 'opacity .6s ease, transform .6s cubic-bezier(0.16,1,0.3,1)',
          marginBottom: isBrand ? 26 : 0,
          pointerEvents: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 14 }}>
          <MaskIcon size={30} color={accent} />
          <span
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: 40,
              fontWeight: 700,
              letterSpacing: '-0.035em',
              color: cream,
              lineHeight: 1,
            }}
          >
            unsaid
          </span>
        </div>
        <div
          style={{
            fontFamily: 'var(--font-confession)',
            fontStyle: 'italic',
            fontSize: 21,
            color: cream,
            lineHeight: 1.3,
          }}
        >
          say the thing you&rsquo;ve never said.
        </div>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 14, color: creamSoft, marginTop: 6 }}>
          nobody knows it&rsquo;s you. everybody feels it.
        </div>
      </div>

      {/* the compose field — the hero. demo types into it, then it goes live. */}
      <div
        onClick={() => live && inputRef.current?.focus()}
        style={{
          width: '100%',
          maxWidth: 340,
          minHeight: 132,
          background: 'linear-gradient(155deg, rgba(58,50,42,0.55), rgba(38,32,27,0.5))',
          border: `1.5px solid ${stage === 'hold' ? `color-mix(in srgb, ${accent} 60%, transparent)` : 'rgba(241,233,223,0.12)'}`,
          borderRadius: 22,
          padding: '20px 18px 16px',
          boxSizing: 'border-box',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          boxShadow: stage === 'hold' ? `0 0 0 4px color-mix(in srgb, ${accent} 14%, transparent)` : 'none',
          transition: 'border-color .3s, box-shadow .3s',
          cursor: live ? 'text' : 'default',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* small label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12, alignSelf: 'flex-start' }}>
          <MaskIcon size={14} color={accent} />
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: creamFaint, letterSpacing: '0.01em' }}>
            {live ? 'your turn' : 'anonymous'}
          </span>
        </div>

        {/* text body — releases upward when the visitor sends */}
        <div
          style={{
            flex: 1,
            position: 'relative',
            textAlign: 'left',
            minHeight: 52,
            // on send: the text flows up out of the card and vanishes — "sent".
            animation: releasing ? 'flyUpOut .85s cubic-bezier(0.4, 0, 0.2, 1) forwards' : 'none',
            willChange: 'transform, opacity',
          }}
        >
          {live && (
            <textarea
              ref={inputRef}
              value={userText}
              onChange={(e) => setUserText(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder=""
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                resize: 'none',
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontFamily: 'var(--font-confession)',
                fontStyle: userText ? 'normal' : 'italic',
                fontSize: 19,
                lineHeight: 1.4,
                color: cream,
                caretColor: accent,
              }}
            />
          )}
          {!live && (
            <div style={{ fontFamily: 'var(--font-confession)', fontSize: 19, lineHeight: 1.4, color: cream }}>
              {fieldText}
              {showCaret && (
                <span
                  style={{
                    display: 'inline-block',
                    width: 2,
                    height: 21,
                    marginLeft: 1,
                    background: accent,
                    verticalAlign: 'text-bottom',
                    borderRadius: 2,
                    animation: 'caretBlink 1s steps(1) infinite',
                  }}
                />
              )}
            </div>
          )}
          {live && !userText && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                fontFamily: 'var(--font-confession)',
                fontStyle: 'italic',
                fontSize: 19,
                lineHeight: 1.4,
                color: creamFaint,
              }}
            >
              say the thing you&rsquo;ve never said&hellip;
            </div>
          )}
        </div>

        {/* send row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11.5, color: creamFaint }}>
            {live ? 'no name, ever' : stage === 'hold' ? 'send?' : ' '}
          </span>
          <button
            type="button"
            onClick={send}
            aria-label="release it"
            style={{
              width: 40,
              height: 40,
              borderRadius: 999,
              border: 'none',
              flexShrink: 0,
              cursor: live && userText.trim() ? 'pointer' : 'default',
              background: (live && userText.trim()) || stage === 'hold' ? accent : 'rgba(241,233,223,0.12)',
              color: cream,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background .25s, transform .12s',
              animation: stage === 'hold' ? 'softPulse 1.4s ease-in-out infinite' : 'none',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 19V5M12 5l-6 6M12 5l6 6"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* footer — appears with the brand */}
      <div
        style={{
          position: 'absolute',
          left: 30,
          right: 30,
          bottom: 46,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
          opacity: isBrand ? 1 : 0,
          transform: isBrand ? 'translateY(0)' : 'translateY(12px)',
          transition: 'opacity .6s ease .2s, transform .6s ease .2s',
          pointerEvents: isBrand ? 'auto' : 'none',
        }}
      >
        <button
          type="button"
          onClick={() => onDone()}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'var(--font-ui)',
            fontSize: 14.5,
            fontWeight: 500,
            color: cream,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
          }}
        >
          look around first <span style={{ fontSize: 16 }}>&rarr;</span>
        </button>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '9px 16px',
            borderRadius: 999,
            background: 'rgba(241,233,223,0.07)',
            border: '1px solid rgba(241,233,223,0.1)',
            fontFamily: 'var(--font-ui)',
            fontSize: 12.5,
            color: creamSoft,
          }}
        >
          <span style={{ fontSize: 13 }}>&#9825;</span> lives right here &mdash; add it to your home screen
        </div>
      </div>
    </div>
  );
}

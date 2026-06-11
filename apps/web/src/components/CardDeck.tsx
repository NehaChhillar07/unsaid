'use client';

// one-card-at-a-time deck with a lightweight pointer-events version of the
// prototype's swipe engine (unsaid-feed.jsx): 1:1 finger tracking,
// rotate dx*0.09 clamped ±15°, commit at 92px, spring-back otherwise.
// plus left/right arrow buttons and keyboard arrows for the web.
import { useCallback, useEffect, useRef, useState } from 'react';
import { SWIPE, type FeedPost, type Mode, type ReactionType } from '@unsaid/tokens';
import { cardVars } from '@/lib/theme';
import { ConfessionCard } from './ConfessionCard';
import styles from './CardDeck.module.css';

interface Props {
  posts: FeedPost[];
  mode: Mode;
  reactions: Record<string, ReactionType | null>;
  onReact: (post: FeedPost, type: ReactionType, e?: React.MouseEvent<HTMLButtonElement>) => void;
  onReply: (post: FeedPost) => void;
  /** true while a modal is open — pauses keyboard navigation */
  paused?: boolean;
  /** fired once per committed swipe (signed-in: markSeen fire-and-forget) */
  onCommit?: (post: FeedPost) => void;
  /** swipe-up gesture on the active card (opens replies) */
  onSwipeUp?: (post: FeedPost) => void;
  /** 500ms long-press on the active card (opens the action sheet) */
  onLongPress?: (post: FeedPost) => void;
  /** "···" button on the active card */
  onMore?: (post: FeedPost) => void;
}

const SPRING = 'transform 0.5s cubic-bezier(0.34,1.56,0.64,1)';
const THROW = 'transform 0.42s cubic-bezier(0.22,0.61,0.36,1), opacity 0.42s ease-out';
const LONG_PRESS_MS = 500;

export function CardDeck({
  posts,
  mode,
  reactions,
  onReact,
  onReply,
  paused = false,
  onCommit,
  onSwipeUp,
  onLongPress,
  onMore,
}: Props) {
  const [index, setIndex] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLDivElement>(null);
  const drag = useRef({
    down: false, startX: 0, startY: 0, dx: 0, dy: 0, moved: false,
    vx: 0, lastX: 0, lastT: 0,
  });
  const animating = useRef(false);
  const suppressClick = useRef(false);
  const pressTimer = useRef(0);

  // reset when the world (or its content) changes
  useEffect(() => {
    setIndex(0);
  }, [mode, posts]);

  // never leave a long-press timer behind
  useEffect(() => () => window.clearTimeout(pressTimer.current), []);

  const post = posts[index];
  const next = posts[index + 1];
  const caughtUp = posts.length > 0 && index >= posts.length;
  const empty = posts.length === 0;

  const advance = useCallback(() => {
    animating.current = false;
    setIndex((i) => Math.min(i + 1, posts.length));
  }, [posts.length]);

  const throwOff = useCallback(
    (dir: 1 | -1, committed?: FeedPost) => {
      const el = cardRef.current;
      if (!el || animating.current) return;
      animating.current = true;
      if (committed && onCommit) onCommit(committed);
      const fly = dir * (Math.max(window.innerWidth * 0.6, 360) + 240);
      el.style.transition = THROW;
      el.style.transform = `translate(${fly}px, ${drag.current.dy * 0.5 + dir * 8}px) rotate(${dir * (SWIPE.maxRotationDeg + 4)}deg)`;
      el.style.opacity = '0';
      if (nextRef.current) {
        nextRef.current.style.transition = THROW;
        nextRef.current.style.transform = 'scale(1) translateY(0px)';
        nextRef.current.style.opacity = '1';
      }
      window.setTimeout(advance, 430);
    },
    [advance, onCommit],
  );

  const springBack = useCallback(() => {
    const el = cardRef.current;
    if (el) {
      el.style.transition = SPRING;
      el.style.transform = 'translate(0px, 0px) rotate(0deg)';
      el.style.opacity = '1';
    }
    if (nextRef.current) {
      nextRef.current.style.transition = SPRING;
      nextRef.current.style.transform = 'scale(0.94) translateY(14px)';
      nextRef.current.style.opacity = '0.72';
    }
  }, []);

  const goNext = useCallback(() => {
    if (index < posts.length) throwOff(1, posts[index]);
  }, [index, posts, throwOff]);

  const goPrev = useCallback(() => {
    if (animating.current) return;
    setIndex((i) => Math.max(0, i - 1));
  }, []);

  // keyboard arrows
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (paused) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      if (e.key === 'ArrowRight') goNext();
      else if (e.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goNext, goPrev, paused]);

  // pointer drag
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (animating.current || caughtUp || empty) return;
    const d = drag.current;
    d.down = true;
    d.startX = e.clientX;
    d.startY = e.clientY;
    d.dx = 0;
    d.dy = 0;
    d.moved = false;
    d.vx = 0;
    d.lastX = e.clientX;
    d.lastT = performance.now();
    if (cardRef.current) cardRef.current.style.transition = 'none';
    if (nextRef.current) nextRef.current.style.transition = 'none';
    e.currentTarget.setPointerCapture(e.pointerId);
    // long-press → action sheet (signed-in feed)
    window.clearTimeout(pressTimer.current);
    if (onLongPress && post) {
      const pressed = post;
      pressTimer.current = window.setTimeout(() => {
        const dd = drag.current;
        if (!dd.down || dd.moved) return;
        dd.down = false;
        suppressClick.current = true;
        springBack();
        onLongPress(pressed);
      }, LONG_PRESS_MS);
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d.down) return;
    d.dx = e.clientX - d.startX;
    d.dy = e.clientY - d.startY;
    if (Math.abs(d.dx) > 6 || Math.abs(d.dy) > 6) {
      d.moved = true;
      window.clearTimeout(pressTimer.current);
    }
    const now = performance.now();
    const dt = now - d.lastT;
    if (dt > 8) {
      const iv = Math.max(-3, Math.min(3, (e.clientX - d.lastX) / dt)); // px/ms
      d.vx = d.vx * 0.7 + iv * 0.3;
      d.lastX = e.clientX;
      d.lastT = now;
    }
    const rot = Math.max(
      -SWIPE.maxRotationDeg,
      Math.min(SWIPE.maxRotationDeg, d.dx * SWIPE.rotationFactor),
    );
    if (cardRef.current) {
      cardRef.current.style.transform = `translate(${d.dx.toFixed(1)}px, ${(d.dy * 0.5).toFixed(1)}px) rotate(${rot.toFixed(2)}deg)`;
    }
    const prog = Math.min(1, Math.abs(d.dx) / SWIPE.commitPx);
    if (nextRef.current) {
      nextRef.current.style.transform = `scale(${(0.94 + 0.06 * prog).toFixed(4)}) translateY(${(14 * (1 - prog)).toFixed(2)}px)`;
      nextRef.current.style.opacity = (0.72 + 0.28 * prog).toFixed(3);
    }
  };

  const onPointerUp = () => {
    const d = drag.current;
    window.clearTimeout(pressTimer.current);
    if (!d.down) return;
    d.down = false;
    if (d.moved) suppressClick.current = true;
    // swipe-up → replies (when not flicking sideways)
    if (
      onSwipeUp &&
      post &&
      d.dy < -SWIPE.swipeUpPx &&
      Math.abs(d.dy) > Math.abs(d.dx) * 1.25 &&
      Math.abs(d.vx) < SWIPE.velocityThreshold
    ) {
      springBack();
      onSwipeUp(post);
      return;
    }
    // commit on clear distance, or a fast flick that also moved a bit
    const committed =
      Math.abs(d.dx) > SWIPE.commitPx ||
      (Math.abs(d.vx) > SWIPE.velocityThreshold && Math.abs(d.dx) > 45);
    if (committed) {
      const dir = (Math.abs(d.dx) > 20 ? d.dx > 0 : d.vx > 0) ? 1 : -1;
      throwOff(dir, post);
    } else springBack();
  };

  // a drag that ends on a button shouldn't count as a tap
  const onClickCapture = (e: React.MouseEvent) => {
    if (suppressClick.current) {
      suppressClick.current = false;
      e.preventDefault();
      e.stopPropagation();
    }
  };

  if (empty) {
    return (
      <div className={styles.deckZone}>
        <div className={styles.caughtUp}>
          <Clouds />
          <div className={styles.caughtTitle}>the feed is warming up</div>
          <div className={styles.caughtSub}>be the first to say the thing you&rsquo;ve never said.</div>
        </div>
      </div>
    );
  }

  if (caughtUp) {
    return (
      <div className={styles.deckZone}>
        <div className={styles.caughtUp}>
          <Clouds />
          <div className={styles.caughtTitle}>you&rsquo;ve felt everything for now 🤍</div>
          <div className={styles.caughtSub}>come back later — there&rsquo;s always more left unsaid</div>
          <button type="button" className={styles.restartBtn} onClick={() => setIndex(0)}>
            feel them again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.deckZone}>
      <div className={styles.deck}>
        {/* decorative deck silhouettes — pure visual depth */}
        {[2, 1].map((depth) => (
          <div
            key={`deck-${depth}`}
            aria-hidden="true"
            className={styles.deckGhost}
            style={{
              transform: `scale(${(0.95 - depth * 0.045).toFixed(3)}) translateY(${16 + depth * 17}px)`,
              opacity: 0.7 - depth * 0.17,
            }}
          >
            <div className={styles.ghostCard} style={cardVars(mode, `${mode}-deck-${depth}`)} />
          </div>
        ))}
        {/* next card peeking behind */}
        {next && (
          <div key={`behind-${next.id}`} ref={nextRef} className={styles.nextLayer}>
            <ConfessionCard post={next} mode={mode} interactive={false} />
          </div>
        )}
        {/* active card */}
        {post && (
          <div
            key={`active-${post.id}`}
            ref={cardRef}
            className={styles.activeLayer}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onClickCapture={onClickCapture}
          >
            <ConfessionCard
              post={post}
              mode={mode}
              reacted={reactions[post.id] ?? null}
              onFelt={(e) => onReact(post, 'felt', e)}
              onSame={(e) => onReact(post, 'same', e)}
              onReply={() => onReply(post)}
              onMore={onMore ? () => onMore(post) : undefined}
            />
          </div>
        )}
      </div>
      {/* arrows + position — web navigation */}
      <div className={styles.controls}>
        <button
          type="button"
          className={styles.arrowBtn}
          onClick={goPrev}
          disabled={index === 0}
          aria-label="previous confession"
        >
          ←
        </button>
        <span className={styles.counter}>
          {Math.min(index + 1, posts.length)} / {posts.length}
        </span>
        <button type="button" className={styles.arrowBtn} onClick={goNext} aria-label="next confession">
          →
        </button>
      </div>
      <div className={styles.hintLine}>swipe, drag or use arrow keys</div>
    </div>
  );
}

function Clouds() {
  return (
    <div className={styles.clouds} aria-hidden="true">
      {(['☁️', '☁️', '☁️'] as const).map((c, i) => (
        <span
          key={i}
          className={styles.cloud}
          style={{
            fontSize: 40 + i * 8,
            left: [10, 70, 40][i],
            top: [10, 0, 44][i],
            animation: `drift ${7 + i * 2}s ease-in-out ${i}s infinite alternate`,
          }}
        >
          {c}
        </span>
      ))}
    </div>
  );
}

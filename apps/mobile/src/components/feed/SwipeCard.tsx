import React from 'react';
import { StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { SWIPE, type FeedPost, type ReactionType } from '@unsaid/tokens';
import { ConfessionCard, type BurstOrigin } from './ConfessionCard';

// easing curves hoisted out of the worklets (created once on the JS thread)
const THROW_EASING = Easing.bezier(0.22, 0.61, 0.36, 1);
const NEXT_EASING = Easing.bezier(0.22, 1, 0.36, 1);
const FADE_EASING = Easing.out(Easing.ease);

interface SwipeCardProps {
  post: FeedPost;
  reacted: ReactionType | null;
  motion: boolean;
  /** 0..1 drag progress, drives the next card + deck (owned by the feed) */
  progress: SharedValue<number>;
  /** "next 🤍" stamp opacities — left stamp shows on rightward drag */
  hintLeft: SharedValue<number>;
  hintRight: SharedValue<number>;
  onSwipedOff: (direction: 'left' | 'right') => void;
  onSwipeUp: () => void;
  onFelt: (origin: BurstOrigin) => void;
  onSame: () => void;
  onComments: () => void;
  onLongPress: () => void;
}

/**
 * Tinder-grade swipe engine — prototype physics, on the UI thread:
 * rotation dx*0.09 clamped ±15°, commit at 92px or 0.45px/ms flick,
 * throw-off ±620px, spring-back ≈ cubic-bezier(0.34,1.56,0.64,1),
 * swipe up ≥78px (|dy|>1.25|dx|) opens comments.
 */
export function SwipeCard({
  post,
  reacted,
  motion,
  progress,
  hintLeft,
  hintRight,
  onSwipedOff,
  onSwipeUp,
  onFelt,
  onSame,
  onComments,
  onLongPress,
}: SwipeCardProps) {
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const opacity = useSharedValue(1);
  const released = useSharedValue(false);

  const haptic = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      'worklet';
      if (released.value) return;
      tx.value = e.translationX;
      ty.value = e.translationY * 0.5;
      const p = Math.min(1, Math.abs(e.translationX) / SWIPE.commitPx);
      progress.value = p;
      hintLeft.value = Math.max(0, Math.min(1, e.translationX / SWIPE.commitPx));
      hintRight.value = Math.max(0, Math.min(1, -e.translationX / SWIPE.commitPx));
    })
    .onEnd((e) => {
      'worklet';
      if (released.value) return;
      const dx = e.translationX;
      const dy = e.translationY;
      const vx = e.velocityX / 1000; // px/ms

      // swipe up → comments
      if (
        dy < -SWIPE.swipeUpPx &&
        Math.abs(dy) > Math.abs(dx) * 1.25 &&
        Math.abs(vx) < SWIPE.velocityThreshold
      ) {
        runOnJS(onSwipeUp)();
        if (motion) {
          tx.value = withSpring(0, { damping: 14, stiffness: 160 });
          ty.value = withSpring(0, { damping: 14, stiffness: 160 });
          progress.value = withTiming(0, { duration: 300 });
        } else {
          tx.value = 0;
          ty.value = 0;
          progress.value = 0;
        }
        hintLeft.value = withTiming(0, { duration: 150 });
        hintRight.value = withTiming(0, { duration: 150 });
        return;
      }

      // commit a throw on clear distance, OR a fast flick that also moved a bit
      const committed =
        Math.abs(dx) > SWIPE.commitPx ||
        (Math.abs(vx) > SWIPE.velocityThreshold && Math.abs(dx) > 45);

      if (committed) {
        released.value = true;
        const dir: number = (Math.abs(dx) > 20 ? dx > 0 : vx > 0) ? 1 : -1;
        const speed = Math.max(Math.abs(vx), 0.6);
        const durMs = motion ? Math.min(460, Math.max(240, 600 / speed)) : 1;

        ty.value = withTiming(dy + dir * 8, { duration: durMs, easing: THROW_EASING });
        opacity.value = withTiming(0, { duration: durMs, easing: FADE_EASING });
        progress.value = withTiming(1, { duration: durMs, easing: NEXT_EASING });
        hintLeft.value = withTiming(0, { duration: 150 });
        hintRight.value = withTiming(0, { duration: 150 });
        tx.value = withTiming(
          dir * 620,
          { duration: durMs, easing: THROW_EASING },
          (finished) => {
            if (finished) runOnJS(onSwipedOff)(dir === 1 ? 'right' : 'left');
          },
        );
      } else {
        // spring back with the prototype's overshoot feel
        if (motion) {
          tx.value = withSpring(0, { damping: 14, stiffness: 160 });
          ty.value = withSpring(0, { damping: 14, stiffness: 160 });
          progress.value = withTiming(0, { duration: 300 });
        } else {
          tx.value = 0;
          ty.value = 0;
          progress.value = 0;
        }
        hintLeft.value = withTiming(0, { duration: 200 });
        hintRight.value = withTiming(0, { duration: 200 });
      }
    });

  const longPress = Gesture.LongPress()
    .minDuration(450)
    .onStart(() => {
      'worklet';
      runOnJS(haptic)();
      runOnJS(onLongPress)();
    });

  const gesture = Gesture.Race(pan, longPress);

  const cardStyle = useAnimatedStyle(() => {
    const rot = Math.max(
      -SWIPE.maxRotationDeg,
      Math.min(SWIPE.maxRotationDeg, tx.value * SWIPE.rotationFactor),
    );
    return {
      opacity: opacity.value,
      transform: [
        { translateX: tx.value },
        { translateY: ty.value },
        { rotate: `${rot}deg` },
      ],
    };
  });

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.layer, cardStyle]}>
        <ConfessionCard
          post={post}
          reacted={reacted}
          onFelt={onFelt}
          onSame={onSame}
          onComments={onComments}
        />
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    top: 4,
    left: 18,
    right: 18,
    bottom: 0,
    justifyContent: 'center',
  },
});

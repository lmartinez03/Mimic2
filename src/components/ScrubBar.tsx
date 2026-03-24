import React, { useRef, useEffect } from 'react';
import { View, PanResponder, Animated, StyleSheet } from 'react-native';
import { colors, spacing } from '../theme';

const BALL_SIZE = 16;
const TRACK_H = 2;

interface ScrubBarProps {
  position: number; // 0 to 1
  onScrubStart: () => void;
  onScrub: (ratio: number) => Promise<void> | void;
  onScrubEnd: () => void;
  disabled?: boolean;
}

export default function ScrubBar({
  position,
  onScrubStart,
  onScrub,
  onScrubEnd,
  disabled = false,
}: ScrubBarProps) {
  const trackWidthRef = useRef(0);
  const startBallXRef = useRef(0);
  const ballXRef = useRef(0);
  const isScrubbingRef = useRef(false);
  const ballX = useRef(new Animated.Value(0)).current;

  const disabledRef = useRef(disabled);
  useEffect(() => { disabledRef.current = disabled; }, [disabled]);

  const onScrubRef = useRef(onScrub);
  const onScrubStartRef = useRef(onScrubStart);
  const onScrubEndRef = useRef(onScrubEnd);
  useEffect(() => { onScrubRef.current = onScrub; }, [onScrub]);
  useEffect(() => { onScrubStartRef.current = onScrubStart; }, [onScrubStart]);
  useEffect(() => { onScrubEndRef.current = onScrubEnd; }, [onScrubEnd]);

  useEffect(() => {
    if (!isScrubbingRef.current && trackWidthRef.current > 0) {
      const newX = position * trackWidthRef.current;
      ballXRef.current = newX;
      ballX.setValue(newX);
    }
  }, [position, ballX]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabledRef.current && trackWidthRef.current > 0,
      onMoveShouldSetPanResponder: () => !disabledRef.current,
      onPanResponderGrant: (evt) => {
        if (disabledRef.current) return;
        isScrubbingRef.current = true;
        onScrubStartRef.current(); // must fire before onScrub so scrubbing guard is active
        const tapX = Math.max(0, Math.min(evt.nativeEvent.locationX, trackWidthRef.current));
        ballXRef.current = tapX;
        startBallXRef.current = tapX;
        ballX.setValue(tapX);
        if (trackWidthRef.current > 0) {
          onScrubRef.current(tapX / trackWidthRef.current);
        }
      },
      onPanResponderMove: (_, gs) => {
        if (disabledRef.current || trackWidthRef.current === 0) return;
        const newX = Math.max(0, Math.min(startBallXRef.current + gs.dx, trackWidthRef.current));
        ballXRef.current = newX;
        ballX.setValue(newX);
        onScrubRef.current(newX / trackWidthRef.current);
      },
      onPanResponderRelease: () => {
        isScrubbingRef.current = false;
        onScrubEndRef.current();
      },
      onPanResponderTerminate: () => {
        isScrubbingRef.current = false;
        onScrubEndRef.current();
      },
    }),
  ).current;

  const ballTranslate = Animated.subtract(ballX, BALL_SIZE / 2);

  return (
    <View style={styles.container}>
      <View
        style={styles.trackArea}
        onLayout={(e) => {
          trackWidthRef.current = e.nativeEvent.layout.width;
          const newX = position * e.nativeEvent.layout.width;
          ballXRef.current = newX;
          ballX.setValue(newX);
        }}
        {...panResponder.panHandlers}
      >
        <View style={styles.trackBg} />
        <Animated.View style={[styles.trackFill, { width: ballX }]} />
        <Animated.View
          pointerEvents="none"
          style={[
            styles.ball,
            disabled && styles.ballDisabled,
            { transform: [{ translateX: ballTranslate }] },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
  },
  trackArea: {
    height: 28,
    justifyContent: 'center',
    position: 'relative',
  },
  trackBg: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: TRACK_H,
    borderRadius: TRACK_H,
    backgroundColor: colors.scrubTrack,
  },
  trackFill: {
    position: 'absolute',
    left: 0,
    height: TRACK_H,
    borderRadius: TRACK_H,
    backgroundColor: colors.scrubFill,
  },
  ball: {
    position: 'absolute',
    top: '50%',
    marginTop: -(BALL_SIZE / 2),
    width: BALL_SIZE,
    height: BALL_SIZE,
    borderRadius: BALL_SIZE / 2,
    backgroundColor: colors.scrubBall,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 5,
    elevation: 3,
  },
  ballDisabled: {
    backgroundColor: colors.disabledText,
    shadowOpacity: 0,
  },
});

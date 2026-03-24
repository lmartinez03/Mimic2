import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, ViewStyle, ActivityIndicator } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { colors, spacing } from '../theme';

interface VideoPanelProps {
  uri: string | null;
  videoRef?: React.RefObject<Video | null>;
  rotation: number; // 0 | 90 | 180 | 270
  linesEnabled: boolean;
  isPlaying: boolean;
  playbackRate: number;
  onStatusUpdate?: (status: AVPlaybackStatus) => void;
  onReadyForDisplay?: (event: any) => void;
  orientation: 'vertical' | 'horizontal';
  disabled?: boolean;
  isLoading?: boolean;
}

export default function VideoPanel({
  uri,
  videoRef,
  rotation,
  linesEnabled,
  isPlaying,
  playbackRate,
  onStatusUpdate,
  onReadyForDisplay,
  orientation,
  disabled = false,
  isLoading = false,
}: VideoPanelProps) {
  const [containerW, setContainerW] = useState(0);
  const [containerH, setContainerH] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(false);
  }, [uri]);

  const isTransposed = rotation === 90 || rotation === 270;

  // Compute the video element size + position so it fills the container correctly after rotation.
  // When transposed: swap the element's width/height and center it, then rotate.
  const videoStyle = useMemo<ViewStyle>(() => {
    const W = containerW;
    const H = containerH;
    if (W === 0 || H === 0) return { flex: 1 };

    if (isTransposed) {
      return {
        position: 'absolute',
        width: H,
        height: W,
        left: (W - H) / 2,
        top: (H - W) / 2,
        transform: [{ rotate: `${rotation}deg` }],
      };
    }

    return {
      width: W,
      height: H,
      transform: [{ rotate: `${rotation}deg` }],
    };
  }, [containerW, containerH, rotation, isTransposed]);

  return (
    <View
      style={[styles.panel, disabled && !uri && styles.panelDisabled]}
      onLayout={(e) => {
        setContainerW(e.nativeEvent.layout.width);
        setContainerH(e.nativeEvent.layout.height);
      }}
    >
      {uri ? (
        <>
          <Video
            ref={videoRef as any}
            source={{ uri }}
            style={videoStyle as any}
            resizeMode={ResizeMode.CONTAIN}
            isMuted={true}
            shouldPlay={isPlaying}
            rate={playbackRate}
            onPlaybackStatusUpdate={onStatusUpdate}
            onReadyForDisplay={(event) => {
              setIsLoaded(true);
              onReadyForDisplay?.(event);
            }}
            isLooping={false}
          />
          {(!isLoaded || isLoading) && (
            <View style={styles.loadingOverlay} pointerEvents="none">
              <ActivityIndicator size="small" color={colors.primaryLight} />
              <Text style={styles.loadingText}>Loading...</Text>
            </View>
          )}
          {linesEnabled && (
            <View style={styles.linesOverlay} pointerEvents="none">
              <Text style={styles.linesLabel}>
                MediaPipe Lines{'\n'}coming soon
              </Text>
            </View>
          )}
        </>
      ) : isLoading ? (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={colors.primaryLight} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : (
        <View style={styles.emptyState}>
          {disabled ? (
            <>
              <Text style={styles.emptyIcon}>🔒</Text>
              <Text style={styles.emptyTitle}>Upload Pro{'\n'}Video First</Text>
            </>
          ) : (
            <>
              <Text style={styles.emptyIcon}>🎬</Text>
              <Text style={styles.emptyTitle}>No Video{'\n'}Loaded</Text>
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    flex: 1,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    position: 'relative',
  },
  panelDisabled: {
    backgroundColor: colors.disabled,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  emptyIcon: {
    fontSize: 28,
    opacity: 0.5,
  },
  emptyTitle: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    fontWeight: '500',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.surface,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '500',
  },
  linesOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
  },
  linesLabel: {
    color: colors.primaryLight,
    fontSize: 11,
    textAlign: 'center',
    fontWeight: '600',
  },
});

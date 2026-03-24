import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Video, AVPlaybackStatus } from 'expo-av';
import { colors, spacing, radius } from '../theme';
import VideoPanel from '../components/VideoPanel';
import ScrubBar from '../components/ScrubBar';
import BottomControls from '../components/BottomControls';
import AIReviewModal from '../components/AIReviewModal';
import LibraryModal from '../components/LibraryModal';
import CameraModal from '../components/CameraModal';

type VideoOrientation = 'vertical' | 'horizontal';
const SPEEDS = [0.25, 0.5, 1, 1.5, 2];

function handlePickError(e: any) {
  const msg: string = e?.message ?? '';
  if (msg.includes('3164') || msg.includes('NetworkAccess')) {
    Alert.alert(
      'Could Not Load Video',
      'iOS could not export this video. Try a different video, or record directly using the ⏺ button.',
    );
  } else {
    Alert.alert('Error', msg || 'Could not load video.');
  }
}

export default function MainScreen() {
  const [proVideoUri, setProVideoUri] = useState<string | null>(null);
  const [userVideoUri, setUserVideoUri] = useState<string | null>(null);
  const [videoOrientation, setVideoOrientation] = useState<VideoOrientation>('vertical');
  const [proDuration, setProDuration] = useState(0);
  const [userDuration, setUserDuration] = useState(0);
  const [scrubPosition, setScrubPosition] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [speedIndex, setSpeedIndex] = useState(2);
  const [proRotation, setProRotation] = useState(0);
  const [userRotation, setUserRotation] = useState(0);
  const [linesEnabled, setLinesEnabled] = useState(false);
  const [showAIReview, setShowAIReview] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [isProLoading, setIsProLoading] = useState(false);
  const [isUserLoading, setIsUserLoading] = useState(false);

  const proVideoRef = useRef<Video>(null);
  const userVideoRef = useRef<Video>(null);
  const isScrubbingRef = useRef(false);
  // Refs mirror duration state so handleScrub always reads the freshest value
  // regardless of when the useCallback closure was created.
  const proDurationRef = useRef(0);
  const userDurationRef = useRef(0);
  const pendingScrubRatioRef = useRef<number | null>(null);

  const playbackRate = SPEEDS[speedIndex];
  const proLoaded = !!proVideoUri;

  // ─── Video Picking ────────────────────────────────────────────────────────

  const pickProVideo = useCallback(async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photo library.');
        return;
      }
      if ((perm as any).accessPrivileges === 'limited') {
        Alert.alert(
          'Limited Access',
          'Expo Go can only see some of your photos. To access all videos:\n\nSettings → Privacy & Security → Photos → Expo Go → All Photos',
        );
      }
      setIsProLoading(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: false,
        quality: 1,
        videoExportPreset: ImagePicker.VideoExportPreset.HighestQuality,
      });
      if (!result.canceled && result.assets[0]) {
        setProVideoUri(result.assets[0].uri);
        setUserVideoUri(null);
        setScrubPosition(0);
        setIsPlaying(false);
        setProRotation(0);
        setUserRotation(0);
      } else {
        setIsProLoading(false);
      }
    } catch (e: any) {
      setIsProLoading(false);
      handlePickError(e);
    }
  }, []);

  const pickUserVideo = useCallback(async () => {
    if (!proVideoUri) return;
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photo library.');
        return;
      }
      if ((perm as any).accessPrivileges === 'limited') {
        Alert.alert(
          'Limited Access',
          'Expo Go can only see some of your photos. To access all videos:\n\nSettings → Privacy & Security → Photos → Expo Go → All Photos',
        );
      }
      setIsUserLoading(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: false,
        quality: 1,
        videoExportPreset: ImagePicker.VideoExportPreset.HighestQuality,
      });
      if (!result.canceled && result.assets[0]) {
        setUserVideoUri(result.assets[0].uri);
        setScrubPosition(0);
        setIsPlaying(false);
        setUserRotation(0);
        proVideoRef.current?.setPositionAsync(0);
      } else {
        setIsUserLoading(false);
      }
    } catch (e: any) {
      setIsUserLoading(false);
      handlePickError(e);
    }
  }, [proVideoUri]);

  // ─── Video Status ─────────────────────────────────────────────────────────

  const handleProReadyForDisplay = useCallback((event: any) => {
    setIsProLoading(false);
    const { width, height } = event.naturalSize ?? {};
    if (width && height) {
      setVideoOrientation(width > height ? 'horizontal' : 'vertical');
    }
  }, []);

  const handleProStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    if (status.durationMillis) {
      proDurationRef.current = status.durationMillis;
      setProDuration(status.durationMillis);
    }
    if (!isScrubbingRef.current && status.durationMillis) {
      setScrubPosition((status.positionMillis ?? 0) / status.durationMillis);
    }
    if (status.didJustFinish) {
      setIsPlaying(false);
      setScrubPosition(0);
    }
  }, []);

  const handleUserStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    if (status.durationMillis) {
      userDurationRef.current = status.durationMillis;
      setUserDuration(status.durationMillis);
    }
    setIsUserLoading(false);
  }, []);

  // ─── Scrub ────────────────────────────────────────────────────────────────

  const handleScrubStart = useCallback(() => {
    isScrubbingRef.current = true;
    setIsScrubbing(true);
  }, []);

  const seekVideos = useCallback((ratio: number) => {
    const pDur = proDurationRef.current;
    const uDur = userDurationRef.current;
    // Zero tolerance = frame-accurate, matches AVPlayer's native behaviour.
    // AVPlayer cancels the previous seek when a new one arrives, so rapid
    // drag events never queue up — only the latest frame renders.
    const tolerances = { toleranceBefore: 0, toleranceAfter: 0 };
    if (pDur > 0) proVideoRef.current?.setPositionAsync(ratio * pDur, tolerances);
    if (uDur > 0) userVideoRef.current?.setPositionAsync(ratio * uDur, tolerances);
  }, []);

  const handleScrub = useCallback((ratio: number) => {
    setScrubPosition(ratio);
    pendingScrubRatioRef.current = ratio;
    seekVideos(ratio);
  }, [seekVideos]);

  const handleScrubEnd = useCallback(() => {
    isScrubbingRef.current = false;
    setIsScrubbing(false);
    pendingScrubRatioRef.current = null;
  }, []);

  const togglePlayPause = useCallback(() => setIsPlaying(p => !p), []);

  // ─── Controls ────────────────────────────────────────────────────────────

  const cycleSpeed = useCallback(() => setSpeedIndex(i => (i + 1) % SPEEDS.length), []);
  const rotateProVideo = useCallback(() => setProRotation(r => (r + 90) % 360), []);
  const rotateUserVideo = useCallback(() => setUserRotation(r => (r + 90) % 360), []);

  const handleTrim = useCallback(() => {
    Alert.alert('Trim', 'Trimming requires a native build via Xcode. Use AutoTrim to align clips automatically once both videos are loaded.');
  }, []);

  const handleAutoTrim = useCallback(() => {
    if (!proVideoUri || !userVideoUri) {
      Alert.alert('AutoTrim', 'Upload both videos first.');
      return;
    }
    Alert.alert('AutoTrim — Native Build Required', 'AutoTrim uses MediaPipe pose detection to find the exact start/end of the movement. This feature is active after the Xcode build — it cannot run inside Expo Go.');
  }, [proVideoUri, userVideoUri]);

  const handleLinesToggle = useCallback(() => {
    if (!linesEnabled) {
      Alert.alert(
        'MediaPipe Lines — Native Build Required',
        'Pose skeleton overlay uses MediaPipe, which needs native GPU access. This is active after the Xcode build. It cannot run inside Expo Go.',
        [{ text: 'Got it' }],
      );
    }
    setLinesEnabled(l => !l);
  }, [linesEnabled]);

  const handleUserVideoRecorded = useCallback((uri: string) => {
    setShowCamera(false);
    setUserVideoUri(uri);
    setScrubPosition(0);
    setIsPlaying(false);
    setUserRotation(0);
    proVideoRef.current?.setPositionAsync(0);
  }, []);

  const handleProVideoFromLibrary = useCallback((uri: string) => {
    setShowLibrary(false);
    setProVideoUri(uri);
    setUserVideoUri(null);
    setScrubPosition(0);
    setIsPlaying(false);
    setProRotation(0);
    setUserRotation(0);
  }, []);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* ── Logo / App Title ── */}
      <View style={styles.logoRow}>
        <View style={styles.logoMark}>
          <Text style={styles.logoMarkText}>M</Text>
        </View>
        <Text style={styles.logoText}>Mimic</Text>
      </View>

      {/* ── Header ── */}
      <View style={styles.header}>
        {/* Pro side */}
        <View style={styles.side}>
          <Text style={styles.sideLabel}>Pro</Text>
          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => setShowLibrary(true)}>
              <Ionicons name="library-outline" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.uploadBtn} onPress={pickProVideo}>
              <Text style={styles.uploadBtnText}>Upload Video</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.iconBtn, !proLoaded && styles.iconBtnOff]}
              onPress={rotateProVideo}
              disabled={!proLoaded}
            >
              <Ionicons name="refresh-outline" size={18} color={proLoaded ? colors.textSecondary : colors.disabledText} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.divider} />

        {/* User side */}
        <View style={styles.side}>
          <Text style={styles.sideLabel}>User</Text>
          <View style={styles.btnRow}>
            <TouchableOpacity
              style={[styles.iconBtn, styles.recordWrapper, !proLoaded && styles.iconBtnOff]}
              onPress={() => proLoaded && setShowCamera(true)}
              disabled={!proLoaded}
            >
              <View style={styles.recordDot} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.uploadBtn, !proLoaded && styles.uploadBtnOff]}
              onPress={pickUserVideo}
              disabled={!proLoaded}
            >
              <Text style={[styles.uploadBtnText, !proLoaded && styles.uploadBtnTextOff]}>
                Upload Video
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.iconBtn, !proLoaded && styles.iconBtnOff]}
              onPress={rotateUserVideo}
              disabled={!proLoaded}
            >
              <Ionicons name="refresh-outline" size={18} color={proLoaded ? colors.textSecondary : colors.disabledText} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ── Videos ── */}
      <View
        style={[
          styles.videoArea,
          videoOrientation === 'horizontal' ? styles.videoCol : styles.videoRow,
        ]}
      >
        <VideoPanel
          uri={proVideoUri}
          videoRef={proVideoRef}
          rotation={proRotation}
          linesEnabled={linesEnabled}
          isPlaying={isPlaying && !isScrubbing}
          playbackRate={playbackRate}
          onStatusUpdate={handleProStatusUpdate}
          onReadyForDisplay={handleProReadyForDisplay}
          orientation={videoOrientation}
          isLoading={isProLoading}
        />
        <View style={styles.videoDivider} />
        <VideoPanel
          uri={userVideoUri}
          videoRef={userVideoRef}
          rotation={userRotation}
          linesEnabled={linesEnabled}
          isPlaying={isPlaying && !isScrubbing}
          playbackRate={playbackRate}
          onStatusUpdate={handleUserStatusUpdate}
          orientation={videoOrientation}
          disabled={!proLoaded}
          isLoading={isUserLoading}
        />
      </View>

      {/* ── Scrub Bar ── */}
      <ScrubBar
        position={scrubPosition}
        onScrubStart={handleScrubStart}
        onScrub={handleScrub}
        onScrubEnd={handleScrubEnd}
        disabled={!proLoaded}
      />

      {/* ── Play / Pause ── */}
      <View style={styles.playRow}>
        <TouchableOpacity
          style={[styles.playBtn, !proLoaded && styles.playBtnOff]}
          onPress={togglePlayPause}
          disabled={!proLoaded}
          activeOpacity={0.8}
        >
          <Ionicons
            name={isPlaying ? 'pause' : 'play'}
            size={26}
            color={proLoaded ? '#fff' : colors.disabledText}
          />
        </TouchableOpacity>
      </View>

      {/* ── Bottom Controls ── */}
      <BottomControls
        linesEnabled={linesEnabled}
        onToggleLines={handleLinesToggle}
        playbackRate={playbackRate}
        onCycleSpeed={cycleSpeed}
        onTrim={handleTrim}
        onAutoTrim={handleAutoTrim}
        onAIReview={() => setShowAIReview(true)}
        disabled={!proLoaded}
      />

      {/* ── Modals ── */}
      <AIReviewModal
        visible={showAIReview}
        proVideoUri={proVideoUri}
        userVideoUri={userVideoUri}
        proDuration={proDuration}
        userDuration={userDuration}
        onClose={() => setShowAIReview(false)}
      />
      <LibraryModal
        visible={showLibrary}
        onSelect={handleProVideoFromLibrary}
        onClose={() => setShowLibrary(false)}
      />
      <CameraModal
        visible={showCamera}
        onRecorded={handleUserVideoRecorded}
        onClose={() => setShowCamera(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  // Logo
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingTop: spacing.xs,
    paddingBottom: 2,
  },
  logoMark: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
  },
  logoMarkText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  logoText: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  // Header
  header: {
    flexDirection: 'row',
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
  },
  side: {
    flex: 1,
    gap: 5,
  },
  sideLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  divider: {
    width: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.xs,
    marginVertical: 2,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnOff: {
    opacity: 0.35,
  },
  recordWrapper: {
    borderColor: 'rgba(239,68,68,0.4)',
  },
  recordDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 5,
  },
  uploadBtn: {
    flex: 1,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  uploadBtnOff: {
    borderColor: colors.border,
    opacity: 0.4,
  },
  uploadBtnText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  uploadBtnTextOff: {
    color: colors.disabledText,
  },
  // Videos
  videoArea: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoRow: {
    flexDirection: 'row',
  },
  videoCol: {
    flexDirection: 'column',
  },
  videoDivider: {
    backgroundColor: colors.border,
    width: 1,
  },
  // Play button
  playRow: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
  },
  playBtn: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 12,
    elevation: 6,
  },
  playBtnOff: {
    backgroundColor: colors.surfaceElevated,
    shadowOpacity: 0,
  },
});

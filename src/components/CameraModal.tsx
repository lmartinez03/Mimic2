import React, { useState, useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { colors, spacing, radius } from '../theme';

interface CameraModalProps {
  visible: boolean;
  onRecorded: (uri: string) => void;
  onClose: () => void;
}

export default function CameraModal({ visible, onRecorded, onClose }: CameraModalProps) {
  const [facing, setFacing] = useState<CameraType>('back');
  const [recording, setRecording] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const cameraRef = useRef<CameraView>(null);

  // Request permissions when modal becomes visible
  useEffect(() => {
    if (visible) {
      (async () => {
        if (!cameraPermission?.granted) await requestCameraPermission();
        if (!micPermission?.granted) await requestMicPermission();
      })();
    }
  }, [visible]);

  const handleRecord = async () => {
    if (!cameraRef.current) return;
    if (recording) {
      cameraRef.current.stopRecording();
      return;
    }
    try {
      setRecording(true);
      const result = await cameraRef.current.recordAsync({ maxDuration: 30 });
      if (result?.uri) {
        onRecorded(result.uri);
      }
    } catch (e) {
      Alert.alert('Recording Error', 'Could not record video. Please try again.');
    } finally {
      setRecording(false);
    }
  };

  const handleClose = () => {
    if (recording) {
      cameraRef.current?.stopRecording();
    }
    setRecording(false);
    onClose();
  };

  const permissionsGranted = cameraPermission?.granted && micPermission?.granted;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} statusBarTranslucent>
      <View style={styles.container}>
        {permissionsGranted ? (
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing={facing}
            mode="video"
          >
            {/* Top bar */}
            <View style={styles.topBar}>
              <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.topTitle}>
                {recording ? '🔴 Recording...' : 'Record User Video'}
              </Text>
              <TouchableOpacity
                style={styles.flipBtn}
                onPress={() => setFacing(f => f === 'back' ? 'front' : 'back')}
                disabled={recording}
              >
                <Text style={styles.flipBtnText}>🔃</Text>
              </TouchableOpacity>
            </View>

            {/* Hint */}
            {!recording && (
              <View style={styles.hintContainer}>
                <Text style={styles.hintText}>Tap the button to start recording (max 30s)</Text>
              </View>
            )}

            {/* Record button */}
            <View style={styles.bottomBar}>
              <TouchableOpacity
                style={[styles.recordBtn, recording && styles.recordBtnActive]}
                onPress={handleRecord}
                activeOpacity={0.8}
              >
                <View style={[styles.recordInner, recording && styles.recordInnerActive]} />
              </TouchableOpacity>
            </View>
          </CameraView>
        ) : (
          <View style={styles.noPermission}>
            <Text style={styles.noPermissionIcon}>📷</Text>
            <Text style={styles.noPermissionTitle}>Camera Access Required</Text>
            <Text style={styles.noPermissionDesc}>
              Mimic needs camera and microphone access to record your videos.
            </Text>
            <TouchableOpacity
              style={styles.grantBtn}
              onPress={async () => {
                await requestCameraPermission();
                await requestMicPermission();
              }}
            >
              <Text style={styles.grantBtnText}>Grant Access</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  topTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  flipBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flipBtnText: {
    fontSize: 18,
  },
  hintContainer: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  hintText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  bottomBar: {
    alignItems: 'center',
    paddingBottom: 60,
    paddingTop: spacing.xl,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  recordBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordBtnActive: {
    borderColor: '#EF4444',
  },
  recordInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#EF4444',
  },
  recordInnerActive: {
    borderRadius: 6,
    width: 32,
    height: 32,
  },
  noPermission: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    gap: spacing.lg,
  },
  noPermissionIcon: { fontSize: 52 },
  noPermissionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  noPermissionDesc: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  grantBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
  },
  grantBtnText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  cancelBtn: {
    paddingVertical: spacing.sm,
  },
  cancelBtnText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
});

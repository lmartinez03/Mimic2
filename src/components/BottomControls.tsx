import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../theme';

interface BottomControlsProps {
  linesEnabled: boolean;
  onToggleLines: () => void;
  playbackRate: number;
  onCycleSpeed: () => void;
  onTrim: () => void;
  onAutoTrim: () => void;
  onAIReview: () => void;
  disabled?: boolean;
}

interface BtnProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  active?: boolean;
  disabled?: boolean;
  accentColor?: string;
  // For speed button: show text inside circle instead of icon
  textIcon?: string;
}

function CtrlBtn({ icon, label, onPress, active, disabled, accentColor, textIcon }: BtnProps) {
  const iconColor = disabled
    ? colors.disabledText
    : active
    ? (accentColor ?? colors.primaryLight)
    : colors.textSecondary;

  return (
    <TouchableOpacity
      style={[styles.btn, disabled && styles.btnDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.circle,
          active && {
            borderColor: accentColor ?? colors.primaryBorder,
            backgroundColor: accentColor ? `${accentColor}18` : colors.primaryGlow,
          },
        ]}
      >
        {textIcon ? (
          <Text style={[styles.textIcon, { color: iconColor }]}>{textIcon}</Text>
        ) : (
          <Ionicons name={icon} size={23} color={iconColor} />
        )}
      </View>
      <Text style={[styles.label, active && { color: accentColor ?? colors.primaryLight }, disabled && styles.labelDisabled]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function BottomControls({
  linesEnabled,
  onToggleLines,
  playbackRate,
  onCycleSpeed,
  onTrim,
  onAutoTrim,
  onAIReview,
  disabled = false,
}: BottomControlsProps) {
  const speedLabel = playbackRate === 1 ? '1x' : `${playbackRate}x`;

  return (
    <View style={styles.container}>
      <CtrlBtn
        icon="body-outline"
        label="Lines"
        onPress={onToggleLines}
        active={linesEnabled}
        disabled={disabled}
      />
      <CtrlBtn
        icon="timer-outline"
        label={speedLabel}
        textIcon={speedLabel}
        onPress={onCycleSpeed}
        disabled={disabled}
      />
      <CtrlBtn
        icon="cut-outline"
        label="Trim"
        onPress={onTrim}
        disabled={disabled}
      />
      <CtrlBtn
        icon="color-wand-outline"
        label="AutoTrim"
        onPress={onAutoTrim}
        disabled={disabled}
      />
      <CtrlBtn
        icon="hardware-chip-outline"
        label="AI Review"
        onPress={onAIReview}
        disabled={disabled}
        accentColor={colors.activeGreen}
      />
    </View>
  );
}

const CIRCLE = 56;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  btn: {
    flex: 1,
    alignItems: 'center',
    gap: 5,
  },
  btnDisabled: {
    opacity: 0.35,
  },
  circle: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textIcon: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  label: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  labelDisabled: {
    color: colors.disabledText,
  },
});

import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { colors, spacing, radius } from '../theme';

interface LibraryModalProps {
  visible: boolean;
  onSelect: (uri: string) => void;
  onClose: () => void;
}

interface SportCategory {
  emoji: string;
  name: string;
  clips: number;
}

const CATEGORIES: SportCategory[] = [
  { emoji: '🏐', name: 'Beach Volleyball', clips: 12 },
  { emoji: '🏀', name: 'Basketball', clips: 18 },
  { emoji: '⚽', name: 'Soccer', clips: 15 },
  { emoji: '🎾', name: 'Tennis', clips: 10 },
  { emoji: '🏊', name: 'Swimming', clips: 8 },
  { emoji: '🤸', name: 'Gymnastics', clips: 9 },
  { emoji: '💃', name: 'Dancing', clips: 14 },
  { emoji: '🥊', name: 'Boxing', clips: 11 },
  { emoji: '🏋️', name: 'Weightlifting', clips: 7 },
  { emoji: '⚾', name: 'Baseball', clips: 13 },
];

export default function LibraryModal({ visible, onSelect, onClose }: LibraryModalProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>📚 Pro Library</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            Browse professional clips by sport. Tap a category to explore.
          </Text>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.grid}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.name}
                style={styles.card}
                onPress={() => {
                  // TODO: Navigate to clip list for this category.
                  // For now, show coming-soon alert.
                  onClose();
                }}
                activeOpacity={0.75}
              >
                <Text style={styles.cardEmoji}>{cat.emoji}</Text>
                <Text style={styles.cardName}>{cat.name}</Text>
                <View style={styles.comingSoon}>
                  <Text style={styles.comingSoonText}>Coming Soon</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity style={styles.footer} onPress={onClose}>
            <Text style={styles.footerText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surfaceElevated,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  scroll: {
    flex: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  card: {
    width: '47%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardEmoji: {
    fontSize: 32,
    marginBottom: spacing.xs,
  },
  cardName: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  comingSoon: {
    backgroundColor: colors.primaryGlow,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    marginTop: spacing.xs,
  },
  comingSoonText: {
    color: colors.primaryLight,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  footer: {
    padding: spacing.lg,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
});

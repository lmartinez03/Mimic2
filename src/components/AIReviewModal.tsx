import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import * as VideoThumbnails from 'expo-video-thumbnails';
import * as FileSystem from 'expo-file-system/legacy';
import { ANTHROPIC_API_KEY } from '../config';
import { colors, spacing, radius } from '../theme';

interface AIReviewModalProps {
  visible: boolean;
  proVideoUri: string | null;
  userVideoUri: string | null;
  proDuration: number;
  userDuration: number;
  onClose: () => void;
}

interface ReviewResult {
  score: number;
  positive: string;
  improvements: { area: string; issue: string; tip: string }[];
}

// Extract a key frame from a video as a base64 JPEG
async function extractFrame(videoUri: string, durationMs: number): Promise<string | null> {
  try {
    const time = Math.max(500, Math.floor(durationMs * 0.4)); // 40% into the clip
    const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
      time,
      quality: 0.6,
    });
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return base64;
  } catch {
    return null;
  }
}

async function callClaudeVision(
  sport: string,
  proBase64: string | null,
  userBase64: string | null,
): Promise<ReviewResult> {
  const content: object[] = [];

  if (proBase64) {
    content.push({
      type: 'image',
      source: { type: 'base64', media_type: 'image/jpeg', data: proBase64 },
    });
    content.push({ type: 'text', text: 'Image 1: PRO athlete — this is the reference technique to mimic.' });
  }

  if (userBase64) {
    content.push({
      type: 'image',
      source: { type: 'base64', media_type: 'image/jpeg', data: userBase64 },
    });
    content.push({ type: 'text', text: 'Image 2: USER/student — this is the athlete trying to copy the pro.' });
  }

  const sport_context = sport.trim() || 'sports movement';
  content.push({
    type: 'text',
    text: `You are an expert ${sport_context} coach and biomechanics analyst. Analyze the athlete's form and technique${userBase64 ? ' differences compared to the pro' : ''}.

Be specific about body angles, joint positions, and alignment. Give warm, encouraging, actionable coaching feedback as if speaking directly to the athlete.

Respond with ONLY valid JSON in this exact format — no markdown, no extra text:
{
  "score": <0-100 number — how closely the user's form matches the pro>,
  "positive": "<1-2 sentences highlighting something they did well or are close on>",
  "improvements": [
    {
      "area": "<specific body part or technique element, e.g. 'Left Elbow', 'Hip Rotation', 'Knee Bend'>",
      "issue": "<precise description of what differs — use degrees, positions, timing if visible>",
      "tip": "<one specific drill, cue, or correction they can try right now>"
    }
  ]
}

Include 2-4 improvement items. If only one video is provided, analyze the pro's technique and give general advice for learning this skill.`,
  });

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-5',
      max_tokens: 1024,
      messages: [{ role: 'user', content }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any)?.error?.message ?? `API error ${res.status}`);
  }

  const data = await res.json();
  const text: string = data.content[0].text;

  // Strip any markdown fences if Claude added them
  const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(clean) as ReviewResult;
}

export default function AIReviewModal({
  visible,
  proVideoUri,
  userVideoUri,
  proDuration,
  userDuration,
  onClose,
}: AIReviewModalProps) {
  const [sport, setSport] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [review, setReview] = useState<ReviewResult | null>(null);

  const noApiKey = !ANTHROPIC_API_KEY;

  const handleAnalyze = async () => {
    if (!proVideoUri) return;
    setLoading(true);
    setReview(null);

    try {
      setLoadingStep('Extracting frames from videos...');
      const [proFrame, userFrame] = await Promise.all([
        extractFrame(proVideoUri, proDuration || 3000),
        userVideoUri ? extractFrame(userVideoUri, userDuration || 3000) : Promise.resolve(null),
      ]);

      setLoadingStep('Asking Claude to analyze your form...');
      const result = await callClaudeVision(sport, proFrame, userFrame);
      setReview(result);
    } catch (e: any) {
      Alert.alert('Analysis Failed', e?.message ?? 'Something went wrong. Check your API key in src/config.ts.');
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  const handleClose = () => {
    setReview(null);
    setLoading(false);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>🤖  AI Review</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>

            {/* No API key setup screen */}
            {noApiKey && (
              <View style={styles.setupCard}>
                <Text style={styles.setupIcon}>🔑</Text>
                <Text style={styles.setupTitle}>API Key Required</Text>
                <Text style={styles.setupDesc}>
                  Open{' '}
                  <Text style={styles.setupCode}>src/config.ts</Text>
                  {' '}and paste your Anthropic API key to enable AI analysis.{'\n\n'}
                  Get a free key at console.anthropic.com
                </Text>
              </View>
            )}

            {/* Idle / ready */}
            {!noApiKey && !loading && !review && (
              <View style={styles.idleCard}>
                <Text style={styles.idleIcon}>🤖</Text>
                <Text style={styles.idleTitle}>Ready to Analyze</Text>
                <Text style={styles.idleDesc}>
                  {userVideoUri
                    ? 'Claude will compare your form frame-by-frame against the pro and give you specific coaching tips.'
                    : 'Upload your video to compare against the pro. Or tap Analyze to get coaching on the pro\'s technique.'}
                </Text>

                <Text style={styles.sportLabel}>What sport / movement is this?</Text>
                <TextInput
                  style={styles.sportInput}
                  placeholder="e.g. beach volleyball passing, basketball free throw..."
                  placeholderTextColor={colors.textMuted}
                  value={sport}
                  onChangeText={setSport}
                  returnKeyType="done"
                />

                <TouchableOpacity style={styles.analyzeBtn} onPress={handleAnalyze}>
                  <Text style={styles.analyzeBtnText}>Analyze My Form</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Loading */}
            {loading && (
              <View style={styles.loadingCard}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingTitle}>Analyzing...</Text>
                <Text style={styles.loadingStep}>{loadingStep}</Text>
              </View>
            )}

            {/* Results */}
            {review && !loading && (
              <View style={styles.results}>
                {/* Score */}
                <View style={styles.scoreCard}>
                  <Text style={styles.scoreNum}>{review.score}</Text>
                  <Text style={styles.scoreLabel}>Form Match Score</Text>
                  <View style={styles.scoreBar}>
                    <View style={[styles.scoreBarFill, { width: `${review.score}%` }]} />
                  </View>
                </View>

                {/* Positive */}
                <View style={styles.positiveCard}>
                  <Text style={styles.positiveIcon}>🌟</Text>
                  <Text style={styles.positiveText}>{review.positive}</Text>
                </View>

                {/* Improvements */}
                <Text style={styles.sectionTitle}>Areas to Work On</Text>
                {review.improvements.map((item, i) => (
                  <View key={i} style={styles.improvCard}>
                    <Text style={styles.improvArea}>{item.area}</Text>
                    <View style={styles.improvRow}>
                      <Text style={styles.rowIcon}>⚠️</Text>
                      <Text style={styles.improvIssue}>{item.issue}</Text>
                    </View>
                    <View style={[styles.improvRow, styles.tipRow]}>
                      <Text style={styles.rowIcon}>💡</Text>
                      <Text style={styles.improvTip}>{item.tip}</Text>
                    </View>
                  </View>
                ))}

                <TouchableOpacity style={styles.reanalyzeBtn} onPress={() => setReview(null)}>
                  <Text style={styles.reanalyzeBtnText}>Analyze Again</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surfaceElevated,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    maxHeight: '88%',
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
  body: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  // Setup
  setupCard: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xl,
  },
  setupIcon: { fontSize: 44 },
  setupTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  setupDesc: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  setupCode: {
    color: colors.primaryLight,
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  // Idle
  idleCard: {
    gap: spacing.md,
  },
  idleIcon: {
    fontSize: 44,
    textAlign: 'center',
  },
  idleTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  idleDesc: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  sportLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginTop: spacing.sm,
  },
  sportInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    fontSize: 13,
  },
  analyzeBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  analyzeBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  // Loading
  loadingCard: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.lg,
  },
  loadingTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  loadingStep: {
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
  },
  // Results
  results: {
    gap: spacing.md,
  },
  scoreCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    gap: spacing.xs,
  },
  scoreNum: {
    color: colors.primaryLight,
    fontSize: 52,
    fontWeight: '800',
    lineHeight: 60,
  },
  scoreLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  scoreBar: {
    width: '100%',
    height: 5,
    backgroundColor: colors.scrubTrack,
    borderRadius: 3,
    marginTop: spacing.xs,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  positiveCard: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: 'rgba(16,185,129,0.08)',
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.25)',
  },
  positiveIcon: { fontSize: 16 },
  positiveText: {
    flex: 1,
    color: '#6EE7B7',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  improvCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  improvArea: {
    color: colors.primaryLight,
    fontSize: 13,
    fontWeight: '700',
  },
  improvRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  tipRow: {
    backgroundColor: colors.primaryGlow,
    borderRadius: radius.sm,
    padding: spacing.sm,
  },
  rowIcon: { fontSize: 12, marginTop: 1 },
  improvIssue: {
    flex: 1,
    color: colors.text,
    fontSize: 12,
    lineHeight: 18,
  },
  improvTip: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  reanalyzeBtn: {
    alignSelf: 'center',
    marginTop: spacing.sm,
    backgroundColor: colors.surfaceHigh,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reanalyzeBtnText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
});

import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, Card, Input } from './ui';
import { colors, radius, spacing, typography } from '../theme';
import type { ContributionCategory } from '../types';

export interface ContributionFormValues {
  title: string;
  description?: string;
  category: ContributionCategory;
  hours: number;
  datePerformed: string;
  attachmentUrl?: string;
}

interface ContributionFormProps {
  initialValues?: Partial<ContributionFormValues>;
  submitLabel: string;
  submitting?: boolean;
  onSubmit: (values: ContributionFormValues) => void;
  /** Optional notice banner shown above the fields. */
  notice?: string;
}

const CATEGORIES: { value: ContributionCategory; label: string }[] = [
  { value: 'DEVELOPMENT', label: 'Development' },
  { value: 'WORKSHOP', label: 'Workshop' },
  { value: 'PRESENTATION', label: 'Presentation' },
  { value: 'DESIGN', label: 'Design' },
  { value: 'EVENT_SUPPORT', label: 'Event Support' },
  { value: 'DOCUMENTATION', label: 'Documentation' },
  { value: 'MEETING', label: 'Meeting' },
  { value: 'OTHER', label: 'Other' },
];

const TITLE_MAX = 200;
const DESCRIPTION_MAX = 2000;
const ATTACHMENT_MAX = 2048;
const HOURS_MIN = 0.25;
const HOURS_MAX = 24;

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

type Errors = Partial<Record<'title' | 'hours' | 'datePerformed' | 'attachmentUrl', string>>;

export function ContributionForm({
  initialValues,
  submitLabel,
  submitting = false,
  onSubmit,
  notice,
}: ContributionFormProps) {
  const [title, setTitle] = useState(initialValues?.title ?? '');
  const [description, setDescription] = useState(initialValues?.description ?? '');
  const [category, setCategory] = useState<ContributionCategory>(
    initialValues?.category ?? 'DEVELOPMENT',
  );
  const [hoursText, setHoursText] = useState(
    initialValues?.hours != null ? String(initialValues.hours) : '',
  );
  const [datePerformed, setDatePerformed] = useState(
    initialValues?.datePerformed ?? todayISO(),
  );
  const [attachmentUrl, setAttachmentUrl] = useState(initialValues?.attachmentUrl ?? '');
  const [errors, setErrors] = useState<Errors>({});

  const today = useMemo(() => todayISO(), []);

  function validate(): ContributionFormValues | null {
    const next: Errors = {};
    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      next.title = 'Title is required.';
    } else if (trimmedTitle.length > TITLE_MAX) {
      next.title = `Title must be ${TITLE_MAX} characters or fewer.`;
    }

    const hours = Number(hoursText);
    if (hoursText.trim() === '' || Number.isNaN(hours)) {
      next.hours = 'Hours is required.';
    } else if (hours < HOURS_MIN || hours > HOURS_MAX) {
      next.hours = `Hours must be between ${HOURS_MIN} and ${HOURS_MAX}.`;
    } else if (Math.abs(hours / 0.25 - Math.round(hours / 0.25)) > 1e-9) {
      next.hours = 'Hours must be in increments of 0.25.';
    }

    if (!datePerformed.trim()) {
      next.datePerformed = 'Date is required.';
    } else if (!ISO_DATE_RE.test(datePerformed.trim())) {
      next.datePerformed = 'Use the format YYYY-MM-DD.';
    } else if (datePerformed.trim() > today) {
      next.datePerformed = 'Date cannot be in the future.';
    }

    const trimmedAttachment = attachmentUrl.trim();
    if (trimmedAttachment) {
      if (trimmedAttachment.length > ATTACHMENT_MAX) {
        next.attachmentUrl = `Link must be ${ATTACHMENT_MAX} characters or fewer.`;
      } else if (!isValidHttpUrl(trimmedAttachment)) {
        next.attachmentUrl = 'Enter a valid http(s) URL.';
      }
    }

    if (description.length > DESCRIPTION_MAX) {
      // Description has no dedicated error slot; clamp is enforced via maxLength.
    }

    setErrors(next);
    if (Object.keys(next).length > 0) return null;

    return {
      title: trimmedTitle,
      description: description.trim() || undefined,
      category,
      hours,
      datePerformed: datePerformed.trim(),
      attachmentUrl: trimmedAttachment || undefined,
    };
  }

  function handleSubmit() {
    const values = validate();
    if (values) onSubmit(values);
  }

  return (
    <View>
      {notice ? (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>{notice}</Text>
        </View>
      ) : null}

      <Input
        label="Title"
        placeholder="What did you work on?"
        value={title}
        onChangeText={setTitle}
        maxLength={TITLE_MAX}
        error={errors.title}
        editable={!submitting}
      />

      <Input
        label="Description"
        placeholder="Optional details"
        value={description}
        onChangeText={setDescription}
        maxLength={DESCRIPTION_MAX}
        multiline
        numberOfLines={4}
        hint={`${description.length}/${DESCRIPTION_MAX}`}
        style={styles.multiline}
        editable={!submitting}
      />

      <Text style={styles.fieldLabel}>Category</Text>
      <View style={styles.categoryWrap}>
        {CATEGORIES.map((cat) => {
          const active = cat.value === category;
          return (
            <Text
              key={cat.value}
              onPress={() => !submitting && setCategory(cat.value)}
              style={[styles.categoryChip, active && styles.categoryChipActive]}
            >
              {cat.label}
            </Text>
          );
        })}
      </View>

      <View style={styles.row}>
        <View style={styles.rowItem}>
          <Input
            label="Hours"
            placeholder="1.5"
            value={hoursText}
            onChangeText={setHoursText}
            keyboardType="decimal-pad"
            error={errors.hours}
            editable={!submitting}
          />
        </View>
        <View style={styles.rowItem}>
          <Input
            label="Date performed"
            placeholder="YYYY-MM-DD"
            value={datePerformed}
            onChangeText={setDatePerformed}
            autoCapitalize="none"
            error={errors.datePerformed}
            editable={!submitting}
          />
        </View>
      </View>

      <Input
        label="Attachment link"
        placeholder="https://… (optional)"
        value={attachmentUrl}
        onChangeText={setAttachmentUrl}
        autoCapitalize="none"
        keyboardType="url"
        maxLength={ATTACHMENT_MAX}
        error={errors.attachmentUrl}
        editable={!submitting}
      />

      <Button
        title={submitLabel}
        onPress={handleSubmit}
        loading={submitting}
        disabled={submitting}
        style={styles.submit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    backgroundColor: colors.accentSubtle,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: `${colors.accentEmphasis}55`,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  noticeText: {
    ...typography.small,
    color: colors.textMuted,
  },
  fieldLabel: {
    ...typography.small,
    color: colors.textMuted,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  categoryWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  categoryChip: {
    ...typography.small,
    color: colors.textMuted,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    overflow: 'hidden',
  },
  categoryChipActive: {
    color: colors.white,
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  rowItem: {
    flex: 1,
  },
  multiline: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  submit: {
    marginTop: spacing.sm,
  },
});

import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { roleCheck } from '@unsaid/api';
import { supabase } from '../../src/lib/supabase';
import {
  OnboardingShell,
  StepDots,
  useOnboardingInk,
  ONBOARDING_ACCENT,
} from '../../src/components/onboarding/Shell';
import { PrimaryButton } from '../../src/components/onboarding/PrimaryButton';
import { MaskIcon } from '../../src/components/MaskIcon';
import { UI } from '../../src/theme/fonts';
import { useTheme } from '../../src/theme/ThemeContext';

// offline fallback — same guard the prototype ships (unsaid-onboarding.jsx)
function localGuard(txt: string): string | null {
  const t = txt.toLowerCase();
  const named =
    /\b(at|@)\s+[a-z]/.test(t) ||
    /\b(google|meta|amazon|infosys|tcs|deloitte|kpmg|microsoft|apple)\b/.test(t);
  const place = /\b(gurgaon|bangalore|mumbai|delhi|noida|pune|seattle|london|sf|nyc)\b/.test(t);
  if (named || place) return 'that might point right at you — try a broader title 🤍';
  return null;
}

function useRoleWarning(value: string): string | null {
  const [warning, setWarning] = useState<string | null>(null);
  useEffect(() => {
    const v = value.trim();
    if (!v) {
      setWarning(null);
      return;
    }
    const t = setTimeout(() => {
      roleCheck(supabase, v)
        .then((res) => setWarning(res.ok ? null : (res.warning ?? null)))
        .catch(() => setWarning(localGuard(v)));
    }, 450);
    return () => clearTimeout(t);
  }, [value]);
  return warning;
}

function RoleField({
  value,
  onChange,
  placeholder,
  warning,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  warning: string | null;
}) {
  const { dark } = useTheme();
  const { ink, inkSoft, accent } = useOnboardingInk();
  return (
    <View style={{ marginBottom: 4 }}>
      <View
        style={[
          styles.field,
          {
            backgroundColor: dark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.55)',
            borderColor: warning
              ? 'rgba(232,131,107,0.6)'
              : dark
                ? 'rgba(255,255,255,0.14)'
                : 'rgba(255,255,255,0.8)',
          },
        ]}
      >
        <MaskIcon size={17} color={accent} />
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={inkSoft}
          autoCapitalize="none"
          style={[styles.input, { color: ink }]}
        />
      </View>
      <Text
        style={{
          minHeight: 18,
          paddingTop: 5,
          paddingHorizontal: 6,
          fontFamily: UI.regular,
          fontSize: 11.5,
          color: warning ? '#D9694C' : inkSoft,
        }}
      >
        {warning ?? 'this is the only thing people see — never your name'}
      </Text>
    </View>
  );
}

/** Step 2 — your two selves. */
export default function Roles() {
  const router = useRouter();
  const { ink, inkSoft } = useOnboardingInk();
  const insets = useSafeAreaInsets();
  const [personalRole, setPersonalRole] = useState('');
  const [proRole, setProRole] = useState('');
  const personalWarning = useRoleWarning(personalRole);
  const proWarning = useRoleWarning(proRole);

  const sectionLabel = (dot: string, label: string) => (
    <View style={styles.sectionRow}>
      <View style={[styles.sectionDot, { backgroundColor: dot }]} />
      <Text style={{ fontFamily: UI.semibold, fontSize: 13, color: ink }}>{label}</Text>
    </View>
  );

  return (
    <OnboardingShell>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={[styles.sheet, { paddingTop: insets.top + 70 }]}>
          <StepDots step={2} />
          <Text style={[styles.title, { color: ink }]}>your two selves</Text>
          <Text style={[styles.sub, { color: inkSoft }]}>
            pick a role for each world. it's all anyone sees — a feeling needs weight, not a name.
          </Text>
          {sectionLabel(ONBOARDING_ACCENT, 'personal · warm world')}
          <RoleField
            value={personalRole}
            onChange={setPersonalRole}
            placeholder="eldest daughter, 24"
            warning={personalWarning}
          />
          <View style={{ height: 14 }} />
          {sectionLabel('#5A7388', 'professional · cool world')}
          <RoleField
            value={proRole}
            onChange={setProRole}
            placeholder="intern at a big4"
            warning={proWarning}
          />
          <View style={{ flex: 1 }} />
          <View style={{ marginBottom: Math.max(insets.bottom, 20) + 20 }}>
            <PrimaryButton
              label="next"
              enabled={!!personalRole.trim() && !!proRole.trim()}
              onPress={() =>
                router.push({
                  pathname: '/(onboarding)/topics',
                  params: {
                    personal: personalRole.trim(),
                    professional: proRole.trim(),
                  },
                })
              }
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, paddingHorizontal: 28 },
  title: {
    fontFamily: UI.bold,
    fontSize: 28,
    letterSpacing: 28 * -0.02,
    marginBottom: 8,
  },
  sub: {
    fontFamily: UI.regular,
    fontSize: 15,
    lineHeight: 15 * 1.5,
    marginBottom: 24,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sectionDot: { width: 9, height: 9, borderRadius: 999 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 54,
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 14,
  },
  input: { flex: 1, fontFamily: UI.regular, fontSize: 15.5 },
});

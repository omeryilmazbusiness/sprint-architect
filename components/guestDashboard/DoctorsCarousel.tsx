import React, { useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { T, cardShadow } from "@/constants/adminTheme";

export interface DoctorItem {
  id: string;
  fullName: string;
  specialty?: string | null;
  photoUrl?: string | null;
  university?: string | null;
  experienceYears?: number | null;
  languages?: string | null;
  diplomaUrl?: string | null;
  phone?: string | null;
}

const { width: SCREEN_W } = Dimensions.get("window");
const CARD_H = 240;
const AUTO_MS = 6000;

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function parseLangs(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/[,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function DoctorSlide({ doctor }: { doctor: DoctorItem }) {
  const langs = parseLangs(doctor.languages);
  const visLangs = langs.slice(0, 4);
  const extra = langs.length > 4 ? langs.length - 4 : 0;

  return (
    <View style={[s.card, cardShadow]}>
      {/* Diploma badge — top-right */}
      {doctor.diplomaUrl ? (
        <View style={s.diplomaBadge}>
          <Ionicons name="ribbon-outline" size={11} color="#059669" />
          <Text style={s.diplomaText}>Certified</Text>
        </View>
      ) : null}

      {/* Avatar row */}
      <View style={s.topRow}>
        {doctor.photoUrl ? (
          <Image source={{ uri: doctor.photoUrl }} style={s.avatar} />
        ) : (
          <View style={s.avatarFallback}>
            <Text style={s.avatarInitials}>{initials(doctor.fullName)}</Text>
          </View>
        )}
        <View style={s.nameCol}>
          <Text style={s.name} numberOfLines={2}>
            {doctor.fullName}
          </Text>
          {doctor.specialty ? (
            <View style={s.specialtyRow}>
              <Ionicons name="medical-outline" size={12} color={T.accent} />
              <Text style={s.specialty} numberOfLines={1}>
                {doctor.specialty}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Details */}
      <View style={s.details}>
        {doctor.university ? (
          <View style={s.detailRow}>
            <Ionicons name="school-outline" size={13} color={T.textMuted} />
            <Text style={s.detailText} numberOfLines={1}>
              {doctor.university}
            </Text>
          </View>
        ) : null}
        {doctor.experienceYears ? (
          <View style={s.detailRow}>
            <Ionicons name="time-outline" size={13} color={T.textMuted} />
            <Text style={s.detailText}>
              {doctor.experienceYears}+ years experience
            </Text>
          </View>
        ) : null}
      </View>

      {/* Language chips */}
      {langs.length > 0 ? (
        <View style={s.langsRow}>
          {visLangs.map((l) => (
            <View key={l} style={s.langChip}>
              <Text style={s.langText}>{l}</Text>
            </View>
          ))}
          {extra > 0 ? (
            <View style={[s.langChip, s.langExtra]}>
              <Text style={s.langText}>+{extra}</Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function Dots({ count, active }: { count: number; active: number }) {
  return (
    <View style={s.dots}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={[s.dot, i === active ? s.dotActive : s.dotInactive]}
        />
      ))}
    </View>
  );
}

interface Props {
  doctors: DoctorItem[];
}

export function DoctorsCarousel({ doctors }: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const [idx, setIdx] = useState(0);
  const count = doctors.length;

  function startTimer() {
    clearInterval(timerRef.current);
    if (count <= 1) return;
    timerRef.current = setInterval(() => {
      setIdx((prev) => {
        const next = (prev + 1) % count;
        scrollRef.current?.scrollTo({ x: next * SCREEN_W, animated: true });
        return next;
      });
    }, AUTO_MS);
  }

  useFocusEffect(
    useCallback(() => {
      startTimer();
      return () => clearInterval(timerRef.current);
    }, [count])
  );

  function onMomentumEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const x = e.nativeEvent.contentOffset.x;
    const newIdx = Math.round(x / SCREEN_W);
    setIdx(newIdx);
    startTimer();
  }

  if (doctors.length === 0) {
    return (
      <View style={[s.emptyCard, cardShadow]}>
        <View style={s.emptyIcon}>
          <Ionicons name="people-outline" size={30} color={T.textMuted} />
        </View>
        <Text style={s.emptyTitle}>
          Clinic doctors will appear here soon.
        </Text>
        <Text style={s.emptySub}>
          Your care team will be shown once assigned by the clinic.
        </Text>
      </View>
    );
  }

  return (
    <View>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumEnd}
        style={s.scroll}
        decelerationRate="fast"
        scrollEventThrottle={16}
      >
        {doctors.map((doc) => (
          <View key={doc.id} style={s.page}>
            <DoctorSlide doctor={doc} />
          </View>
        ))}
      </ScrollView>
      {count > 1 ? <Dots count={count} active={idx} /> : null}
    </View>
  );
}

const s = StyleSheet.create({
  scroll: { marginHorizontal: -T.sp16 },
  page: { width: SCREEN_W, paddingHorizontal: T.sp16 },

  card: {
    height: CARD_H,
    backgroundColor: T.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: T.border,
    padding: T.sp20,
    gap: 12,
  },

  diplomaBadge: {
    position: "absolute",
    top: 14,
    right: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#D1FAE5",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
    zIndex: 1,
  },
  diplomaText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    color: "#059669",
  },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: T.sp16,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2.5,
    borderColor: T.accent,
  },
  avatarFallback: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(3,105,161,0.1)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2.5,
    borderColor: "rgba(3,105,161,0.2)",
    flexShrink: 0,
  },
  avatarInitials: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    color: T.accent,
    letterSpacing: -0.5,
  },

  nameCol: { flex: 1, gap: 4 },
  name: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    color: T.text,
    letterSpacing: -0.3,
    lineHeight: 22,
  },
  specialtyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  specialty: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: T.accent,
    flex: 1,
  },

  details: { gap: 6 },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  detailText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: T.textSec,
    flex: 1,
  },

  langsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  langChip: {
    backgroundColor: "rgba(3,105,161,0.08)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  langExtra: { backgroundColor: T.surfaceSubtle },
  langText: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: T.accent,
  },

  dots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    paddingTop: T.sp12,
  },
  dot: { borderRadius: 4 },
  dotActive: { width: 20, height: 6, backgroundColor: T.accent },
  dotInactive: { width: 6, height: 6, backgroundColor: T.border },

  emptyCard: {
    backgroundColor: T.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: T.border,
    padding: T.sp24,
    alignItems: "center",
    gap: T.sp10,
  },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: T.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: T.text,
    textAlign: "center",
  },
  emptySub: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: T.textMuted,
    textAlign: "center",
    lineHeight: 19,
    maxWidth: 260,
  },
});

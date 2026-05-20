import React, { useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Linking,
  Alert,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useFocusEffect } from "expo-router";
import { T } from "@/constants/adminTheme";
import { useT } from "@/hooks/useT";
import { useLanguage } from "@/context/LanguageContext";
import { getBrand } from "@/constants/vehicleBrands";
import type { PatientTransport, PatientHotel, PatientDocument } from "@/hooks/guest/useGuestDashboard";

const { width: SCREEN_W } = Dimensions.get("window");
const TILE_H = 240;
const AUTO_MS = 5000;
const SLIDE_COUNT = 3;

async function tryCall(
  phone: string | null | undefined,
  noPhoneTitle: string,
  noPhoneBody: string,
  cannotCallTitle: string,
  cannotCallBody: string,
) {
  if (!phone) { Alert.alert(noPhoneTitle, noPhoneBody); return; }
  const url = `tel:${phone}`;
  if (await Linking.canOpenURL(url)) Linking.openURL(url);
  else Alert.alert(cannotCallTitle, cannotCallBody);
}

function fmt(s: string | null | undefined, locale: string) {
  if (!s) return null;
  const l = locale === "ru" ? "ru-RU" : "en-US";
  return new Date(s).toLocaleDateString(l, { day: "numeric", month: "short" });
}

// ─── Tile: Transport ─────────────────────────────────────────────────────────

function TransportTile({ transport }: { transport: PatientTransport | null }) {
  const t = useT();
  const tg = t.guestDashboard;
  const brand = transport ? getBrand(transport.vehicleBrand) : null;
  const vName = transport
    ? [transport.vehicleBrand, transport.vehicleModel].filter(Boolean).join(" ") || transport.vehicleInfo || "Vehicle"
    : null;

  return (
    <LinearGradient colors={["#0D1117", "#161B27", "#1C2333"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={ts.tile}>
      <View style={ts.gloss} />
      <View style={ts.header}>
        <View style={ts.chipRow}>
          <Ionicons name="car-sport-outline" size={12} color="rgba(255,255,255,0.5)" />
          <Text style={ts.chipDark}>{tg.tileTransport}</Text>
        </View>
        {brand ? <Image source={brand.logo} style={ts.logo} resizeMode="contain" tintColor="#fff" /> : null}
      </View>

      {!transport ? (
        <View style={ts.empty}>
          <Ionicons name="car-outline" size={36} color="rgba(255,255,255,0.2)" />
          <Text style={ts.emptyTitleDark}>{tg.tileTransportEmpty}</Text>
          <Text style={ts.emptySubDark}>{tg.tileTransportEmptySub}</Text>
        </View>
      ) : (
        <>
          <View style={ts.grow}>
            {vName ? <Text style={ts.vehicleName}>{vName}</Text> : null}
            {transport.vehiclePlate ? (
              <View style={ts.plateBadge}><Text style={ts.plateText}>{transport.vehiclePlate}</Text></View>
            ) : null}
            <View style={ts.driverRow}>
              <View style={ts.driverAvatar}>
                <Ionicons name="person-outline" size={14} color="rgba(255,255,255,0.6)" />
              </View>
              <View>
                <Text style={ts.driverLbl}>{tg.tileDriver}</Text>
                <Text style={ts.driverName}>{transport.driverName ?? "—"}</Text>
              </View>
            </View>
            {transport.meetingPointText ? (
              <View style={ts.meetRow}>
                <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.4)" />
                <Text style={ts.meetText} numberOfLines={1}>{transport.meetingPointText}</Text>
              </View>
            ) : null}
          </View>
          <Pressable
            style={ts.ctaDark}
            onPress={() => tryCall(
              transport.driverPhone,
              tg.noPhone,
              tg.noPhoneSub.replace("{label}", tg.tileDriver),
              tg.cannotCall,
              tg.cannotCallSub,
            )}
          >
            <Ionicons name="call-outline" size={15} color="#0D1117" />
            <Text style={ts.ctaDarkTxt}>{tg.tileCallDriver}</Text>
          </Pressable>
        </>
      )}
    </LinearGradient>
  );
}

// ─── Tile: Hotel ─────────────────────────────────────────────────────────────

function HotelTile({ hotel }: { hotel: PatientHotel | null }) {
  const t = useT();
  const tg = t.guestDashboard;
  const { locale } = useLanguage();

  return (
    <LinearGradient colors={["#FFFFFF", "#F0F7FF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={ts.tile}>
      <View style={ts.arc} />
      <View style={ts.header}>
        <View style={ts.chipRow}>
          <Ionicons name="bed-outline" size={12} color={T.accent} />
          <Text style={ts.chipLight}>{tg.tileHotel}</Text>
        </View>
        <View style={ts.hotelIcon}><Ionicons name="business-outline" size={18} color={T.accent} /></View>
      </View>

      {!hotel ? (
        <View style={ts.empty}>
          <Ionicons name="bed-outline" size={36} color={T.border} />
          <Text style={ts.emptyTitleLight}>{tg.tileHotelEmpty}</Text>
          <Text style={ts.emptySubLight}>{tg.tileHotelEmptySub}</Text>
        </View>
      ) : (
        <>
          <View style={ts.grow}>
            <Text style={ts.hotelName} numberOfLines={1}>{hotel.name}</Text>
            {hotel.roomNo ? (
              <View style={ts.infoRow}>
                <Ionicons name="key-outline" size={13} color={T.textSec} />
                <Text style={ts.infoTxt}>{tg.tileHotelRoom.replace("{no}", hotel.roomNo)}</Text>
              </View>
            ) : null}
            {hotel.address ? (
              <View style={ts.infoRow}>
                <Ionicons name="location-outline" size={13} color={T.textSec} />
                <Text style={ts.infoTxt} numberOfLines={1}>{hotel.address}</Text>
              </View>
            ) : null}
          </View>
          {(hotel.checkInDate || hotel.checkOutDate) ? (
            <View style={ts.stayRow}>
              <View style={ts.stayCol}>
                <Text style={ts.stayLbl}>{tg.tileHotelCheckIn}</Text>
                <Text style={ts.stayVal}>{fmt(hotel.checkInDate, locale) ?? "—"}</Text>
              </View>
              <View style={ts.stayDiv} />
              <View style={ts.stayCol}>
                <Text style={ts.stayLbl}>{tg.tileHotelCheckOut}</Text>
                <Text style={ts.stayVal}>{fmt(hotel.checkOutDate, locale) ?? "—"}</Text>
              </View>
              {hotel.stayDays ? (
                <>
                  <View style={ts.stayDiv} />
                  <View style={ts.stayCol}>
                    <Text style={ts.stayLbl}>{tg.tileHotelNights}</Text>
                    <Text style={[ts.stayVal, { color: T.accent }]}>{hotel.stayDays}</Text>
                  </View>
                </>
              ) : null}
            </View>
          ) : null}
        </>
      )}
    </LinearGradient>
  );
}

// ─── Tile: Documents ─────────────────────────────────────────────────────────

function DocumentsTile({ documents }: { documents: PatientDocument[] }) {
  const router = useRouter();
  const t = useT();
  const tg = t.guestDashboard;

  const pending  = documents.filter(d => d.status === "ASSIGNED" || d.status === "REJECTED").length;
  const uploaded = documents.filter(d => d.status === "UPLOADED").length;
  const approved = documents.filter(d => d.status === "APPROVED").length;
  const total    = documents.length;

  return (
    <View style={[ts.tile, ts.docsTile]}>
      {/* Header */}
      <View style={ts.header}>
        <View style={ts.chipRow}>
          <Ionicons name="documents-outline" size={12} color={T.accent} />
          <Text style={ts.chipLight}>{tg.tileDocs}</Text>
        </View>
        <View style={[ts.statusBadge, { backgroundColor: pending > 0 ? T.warningBg : T.successBg }]}>
          <Text style={[ts.statusBadgeTxt, { color: pending > 0 ? T.warning : T.success }]}>
            {pending > 0
              ? tg.tileDocsPendingBadge.replace("{n}", String(pending))
              : tg.tileDocsAllDone}
          </Text>
        </View>
      </View>

      {/* Content */}
      <View style={ts.grow}>
        {total === 0 ? (
          <View style={ts.empty}>
            <Ionicons name="documents-outline" size={34} color={T.border} />
            <Text style={ts.emptyTitleLight}>{tg.tileDocsEmpty}</Text>
            <Text style={ts.emptySubLight}>{tg.tileDocsEmptySub}</Text>
          </View>
        ) : (
          <View style={ts.docsStats}>
            <View style={[ts.statBox, { backgroundColor: T.warningBg }]}>
              <Text style={[ts.statNum, { color: T.warning }]}>{pending}</Text>
              <Text style={[ts.statLbl, { color: T.warning }]}>{tg.tileDocsPending}</Text>
            </View>
            <View style={[ts.statBox, { backgroundColor: "#EFF6FF" }]}>
              <Text style={[ts.statNum, { color: T.accent }]}>{uploaded}</Text>
              <Text style={[ts.statLbl, { color: T.accent }]}>{tg.tileDocsReviewing}</Text>
            </View>
            <View style={[ts.statBox, { backgroundColor: T.successBg }]}>
              <Text style={[ts.statNum, { color: T.success }]}>{approved}</Text>
              <Text style={[ts.statLbl, { color: T.success }]}>{tg.tileDocsApproved}</Text>
            </View>
            <View style={[ts.statBox, { backgroundColor: T.surfaceSubtle }]}>
              <Text style={[ts.statNum, { color: T.textSec }]}>{total}</Text>
              <Text style={[ts.statLbl, { color: T.textSec }]}>{tg.tileDocsTotal}</Text>
            </View>
          </View>
        )}
      </View>

      {/* Single CTA */}
      <Pressable
        style={ts.ctaLight}
        onPress={() => router.push({ pathname: "/(patient)/track", params: { tab: "documents" } })}
      >
        <Ionicons name="folder-open-outline" size={15} color={T.accent} />
        <Text style={ts.ctaLightTxt}>{tg.tileDocsManage}</Text>
      </Pressable>
    </View>
  );
}

// ─── Dots Indicator ──────────────────────────────────────────────────────────

function Dots({ count, active }: { count: number; active: number }) {
  return (
    <View style={ts.dots}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={[
            ts.dot,
            i === active ? ts.dotActive : ts.dotInactive,
          ]}
        />
      ))}
    </View>
  );
}

// ─── Main Carousel ───────────────────────────────────────────────────────────

interface Props {
  transport: PatientTransport | null;
  hotel: PatientHotel | null;
  documents: PatientDocument[];
}

export function OverviewTileCarousel({ transport, hotel, documents }: Props) {
  const scrollRef  = useRef<ScrollView>(null);
  const timerRef   = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const [idx, setIdx] = useState(0);

  function advance(from: number) {
    const next = (from + 1) % SLIDE_COUNT;
    scrollRef.current?.scrollTo({ x: next * SCREEN_W, animated: true });
    return next;
  }

  function startTimer(current: number) {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setIdx(prev => advance(prev));
    }, AUTO_MS);
  }

  useFocusEffect(
    useCallback(() => {
      startTimer(idx);
      return () => clearInterval(timerRef.current);
    }, [])
  );

  function onMomentumEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const x = e.nativeEvent.contentOffset.x;
    const newIdx = Math.round(x / SCREEN_W);
    setIdx(newIdx);
    startTimer(newIdx);
  }

  return (
    <View style={ts.wrap}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumEnd}
        style={ts.scroll}
        decelerationRate="fast"
        scrollEventThrottle={16}
      >
        <View style={ts.page}><TransportTile transport={transport} /></View>
        <View style={ts.page}><HotelTile hotel={hotel} /></View>
        <View style={ts.page}><DocumentsTile documents={documents} /></View>
      </ScrollView>
      <Dots count={SLIDE_COUNT} active={idx} />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const ts = StyleSheet.create({
  wrap: { marginBottom: 4 },
  scroll: { marginHorizontal: -T.sp16 },
  page: { width: SCREEN_W, paddingHorizontal: T.sp16 },
  tile: {
    height: TILE_H,
    borderRadius: 20,
    padding: T.sp16,
    overflow: "hidden",
  },
  docsTile: {
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  gloss: {
    position: "absolute", top: -40, right: -40,
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  arc: {
    position: "absolute", top: -50, right: -50,
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: "rgba(3,105,161,0.08)",
  },
  header: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", marginBottom: T.sp12,
  },
  chipRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  chipDark: {
    fontFamily: "PlusJakartaSans_600SemiBold", fontSize: 11,
    color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: 0.5,
  },
  chipLight: {
    fontFamily: "PlusJakartaSans_600SemiBold", fontSize: 11,
    color: T.accent, textTransform: "uppercase", letterSpacing: 0.5,
  },
  logo: { width: 44, height: 22 },
  hotelIcon: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: "rgba(3,105,161,0.1)", alignItems: "center", justifyContent: "center",
  },
  statusBadge: { borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3 },
  statusBadgeTxt: { fontFamily: "PlusJakartaSans_600SemiBold", fontSize: 10 },
  grow: { flex: 1, gap: 7 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  emptyTitleDark:  { fontFamily: "PlusJakartaSans_600SemiBold", fontSize: 14, color: "rgba(255,255,255,0.35)" },
  emptySubDark:    { fontFamily: "PlusJakartaSans_400Regular",  fontSize: 12, color: "rgba(255,255,255,0.2)", textAlign: "center" },
  emptyTitleLight: { fontFamily: "PlusJakartaSans_600SemiBold", fontSize: 14, color: T.textMuted },
  emptySubLight:   { fontFamily: "PlusJakartaSans_400Regular",  fontSize: 12, color: T.textMuted, textAlign: "center" },
  vehicleName: { fontFamily: "PlusJakartaSans_700Bold", fontSize: 20, color: "#fff", letterSpacing: -0.5 },
  plateBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 6, paddingHorizontal: 9, paddingVertical: 3,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
  },
  plateText: { fontFamily: "PlusJakartaSans_700Bold", fontSize: 12, color: "rgba(255,255,255,0.8)", letterSpacing: 2 },
  driverRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  driverAvatar: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center",
  },
  driverLbl:   { fontFamily: "PlusJakartaSans_400Regular", fontSize: 10, color: "rgba(255,255,255,0.4)" },
  driverName:  { fontFamily: "PlusJakartaSans_600SemiBold", fontSize: 14, color: "#fff" },
  meetRow:     { flexDirection: "row", alignItems: "center", gap: 5 },
  meetText:    { fontFamily: "PlusJakartaSans_400Regular", fontSize: 11, color: "rgba(255,255,255,0.4)", flex: 1 },
  ctaDark: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 7, backgroundColor: "#fff", borderRadius: T.r10, paddingVertical: 12,
  },
  ctaDarkTxt: { fontFamily: "PlusJakartaSans_700Bold", fontSize: 14, color: "#0D1117" },
  hotelName: { fontFamily: "PlusJakartaSans_700Bold", fontSize: 18, color: T.text, letterSpacing: -0.3 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  infoTxt: { fontFamily: "PlusJakartaSans_400Regular", fontSize: 13, color: T.textSec, flex: 1 },
  stayRow: {
    flexDirection: "row",
    backgroundColor: "rgba(3,105,161,0.06)",
    borderRadius: T.r12, padding: T.sp12, alignItems: "center",
  },
  stayCol: { flex: 1, alignItems: "center" },
  stayLbl: { fontFamily: "PlusJakartaSans_400Regular", fontSize: 10, color: T.textMuted, marginBottom: 2 },
  stayVal: { fontFamily: "PlusJakartaSans_700Bold", fontSize: 13, color: T.text },
  stayDiv: { width: 1, height: 28, backgroundColor: "rgba(3,105,161,0.15)" },
  ctaLight: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 7, borderWidth: 1.5, borderColor: T.accent,
    borderRadius: T.r10, paddingVertical: 12,
    backgroundColor: "rgba(3,105,161,0.04)",
  },
  ctaLightTxt: { fontFamily: "PlusJakartaSans_700Bold", fontSize: 14, color: T.accent },
  docsStats: { flexDirection: "row", gap: 7 },
  statBox: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: T.r10 },
  statNum: { fontFamily: "PlusJakartaSans_700Bold", fontSize: 20 },
  statLbl: { fontFamily: "PlusJakartaSans_400Regular", fontSize: 10, marginTop: 2 },
  dots: {
    flexDirection: "row", justifyContent: "center",
    alignItems: "center", gap: 6, paddingTop: T.sp12,
  },
  dot: { borderRadius: 4 },
  dotActive:   { width: 20, height: 6, backgroundColor: T.accent },
  dotInactive: { width: 6,  height: 6, backgroundColor: T.border },
});

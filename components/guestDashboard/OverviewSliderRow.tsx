import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
  Linking,
  Alert,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { T } from "@/constants/adminTheme";
import { getBrand } from "@/constants/vehicleBrands";
import type { PatientTransport, PatientHotel, PatientDocument } from "@/hooks/guest/useGuestDashboard";

const CARD_W = Math.round(Dimensions.get("window").width * 0.78);
const CARD_H = 230;

async function tryCall(phone: string | null | undefined, label: string) {
  if (!phone) { Alert.alert("No phone", `${label} phone is not available.`); return; }
  const url = `tel:${phone}`;
  if (await Linking.canOpenURL(url)) Linking.openURL(url);
  else Alert.alert("Cannot call", "Your device cannot make phone calls.");
}

function fmtDate(s: string | null | undefined) {
  if (!s) return null;
  return new Date(s).toLocaleDateString("en-US", { day: "numeric", month: "short" });
}

// ─── Transport Card ─────────────────────────────────────────────────────────

function TransportSlide({ transport }: { transport: PatientTransport | null }) {
  const brand = transport ? getBrand(transport.vehicleBrand) : null;
  const vehicleName = transport
    ? [transport.vehicleBrand, transport.vehicleModel].filter(Boolean).join(" ") ||
      transport.vehicleInfo || "Vehicle"
    : null;

  return (
    <LinearGradient
      colors={["#0D1117", "#161B27", "#1C2333"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={s.card}
    >
      <View style={s.glossCircle} />

      {/* Header */}
      <View style={s.row}>
        <View style={s.chipRow}>
          <Ionicons name="car-sport-outline" size={12} color="rgba(255,255,255,0.5)" />
          <Text style={s.chipDark}>Transport</Text>
        </View>
        {brand && (
          <Image source={brand.logo} style={s.brandLogo} resizeMode="contain" tintColor="#fff" />
        )}
      </View>

      {!transport ? (
        <View style={s.emptyBody}>
          <Ionicons name="car-outline" size={32} color="rgba(255,255,255,0.2)" />
          <Text style={s.emptyTitleDark}>Transport not assigned yet</Text>
          <Text style={s.emptySubDark}>Your clinic will update this soon.</Text>
        </View>
      ) : (
        <>
          {/* Content grows */}
          <View style={s.grow}>
            {vehicleName ? <Text style={s.vehicleName}>{vehicleName}</Text> : null}
            {transport.vehiclePlate ? (
              <View style={s.plateBadge}><Text style={s.plateText}>{transport.vehiclePlate}</Text></View>
            ) : null}
            <View style={s.driverRow}>
              <View style={s.driverAvatar}>
                <Ionicons name="person-outline" size={13} color="rgba(255,255,255,0.6)" />
              </View>
              <View>
                <Text style={s.driverLabel}>Driver</Text>
                <Text style={s.driverName}>{transport.driverName ?? "—"}</Text>
              </View>
            </View>
          </View>
          {/* CTA pinned at bottom */}
          <Pressable
            style={s.ctaDark}
            onPress={() => tryCall(transport.driverPhone, "Driver")}
          >
            <Ionicons name="call-outline" size={14} color="#0D1117" />
            <Text style={s.ctaDarkText}>Call Driver</Text>
          </Pressable>
        </>
      )}
    </LinearGradient>
  );
}

// ─── Hotel Card ──────────────────────────────────────────────────────────────

function HotelSlide({ hotel }: { hotel: PatientHotel | null }) {
  return (
    <LinearGradient
      colors={["#FFFFFF", "#F0F7FF"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={s.card}
    >
      <View style={s.arcDecor} />

      {/* Header */}
      <View style={s.row}>
        <View style={s.chipRow}>
          <Ionicons name="bed-outline" size={12} color={T.accent} />
          <Text style={s.chipLight}>Hotel</Text>
        </View>
        <View style={s.hotelIcon}>
          <Ionicons name="business-outline" size={16} color={T.accent} />
        </View>
      </View>

      {!hotel ? (
        <View style={s.emptyBody}>
          <Ionicons name="bed-outline" size={32} color={T.border} />
          <Text style={s.emptyTitleLight}>Hotel not assigned yet</Text>
          <Text style={s.emptySubLight}>Your clinic will update this soon.</Text>
        </View>
      ) : (
        <>
          <View style={s.grow}>
            <Text style={s.hotelName} numberOfLines={1}>{hotel.name}</Text>
            {hotel.roomNo ? (
              <View style={s.infoRow}>
                <Ionicons name="key-outline" size={12} color={T.textSec} />
                <Text style={s.infoText}>Room {hotel.roomNo}</Text>
              </View>
            ) : null}
            {hotel.address ? (
              <View style={s.infoRow}>
                <Ionicons name="location-outline" size={12} color={T.textSec} />
                <Text style={s.infoText} numberOfLines={1}>{hotel.address}</Text>
              </View>
            ) : null}
          </View>

          {/* Stay row pinned at bottom */}
          {(hotel.checkInDate || hotel.checkOutDate) ? (
            <View style={s.stayRow}>
              <View style={s.stayCol}>
                <Text style={s.stayLbl}>Check-in</Text>
                <Text style={s.stayVal}>{fmtDate(hotel.checkInDate) ?? "—"}</Text>
              </View>
              <View style={s.stayDiv} />
              <View style={s.stayCol}>
                <Text style={s.stayLbl}>Check-out</Text>
                <Text style={s.stayVal}>{fmtDate(hotel.checkOutDate) ?? "—"}</Text>
              </View>
              {hotel.stayDays ? (
                <>
                  <View style={s.stayDiv} />
                  <View style={s.stayCol}>
                    <Text style={s.stayLbl}>Nights</Text>
                    <Text style={[s.stayVal, { color: T.accent }]}>{hotel.stayDays}</Text>
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

// ─── Documents Card ──────────────────────────────────────────────────────────

const DOC_STATUS: Record<string, { label: string; bg: string; tc: string }> = {
  ASSIGNED: { label: "Pending",   bg: T.warningBg, tc: T.warning },
  UPLOADED: { label: "Reviewing", bg: T.successBg, tc: T.success },
  APPROVED: { label: "Approved",  bg: T.successBg, tc: T.success },
  REJECTED: { label: "Rejected",  bg: T.dangerBg,  tc: T.danger  },
};

function DocsSlide({ documents }: { documents: PatientDocument[] }) {
  const router = useRouter();
  const pending  = documents.filter(d => d.status === "ASSIGNED" || d.status === "REJECTED").length;
  const uploaded = documents.filter(d => d.status === "UPLOADED" || d.status === "APPROVED").length;
  const preview  = documents.slice(0, 2);

  return (
    <View style={[s.card, s.docsCard]}>
      {/* Header */}
      <View style={s.row}>
        <View style={s.chipRow}>
          <Ionicons name="documents-outline" size={12} color={T.accent} />
          <Text style={s.chipLight}>Documents</Text>
        </View>
        <View style={[s.statusChip, { backgroundColor: pending > 0 ? T.warningBg : T.successBg }]}>
          <Text style={[s.statusChipTxt, { color: pending > 0 ? T.warning : T.success }]}>
            {pending > 0 ? `${pending} pending` : "All done"}
          </Text>
        </View>
      </View>

      {/* Content grows */}
      <View style={s.grow}>
        {documents.length === 0 ? (
          <View style={s.emptyBody}>
            <Ionicons name="documents-outline" size={28} color={T.border} />
            <Text style={s.emptyTitleLight}>No documents yet</Text>
            <Text style={s.emptySubLight}>Clinic will assign them here.</Text>
          </View>
        ) : (
          <>
            <View style={s.countsRow}>
              <View style={[s.countBox, { backgroundColor: T.warningBg }]}>
                <Text style={[s.countNum, { color: T.warning }]}>{pending}</Text>
                <Text style={[s.countLbl, { color: T.warning }]}>Pending</Text>
              </View>
              <View style={[s.countBox, { backgroundColor: T.successBg }]}>
                <Text style={[s.countNum, { color: T.success }]}>{uploaded}</Text>
                <Text style={[s.countLbl, { color: T.success }]}>Uploaded</Text>
              </View>
              <View style={[s.countBox, { backgroundColor: T.surfaceSubtle }]}>
                <Text style={[s.countNum, { color: T.textSec }]}>{documents.length}</Text>
                <Text style={[s.countLbl, { color: T.textSec }]}>Total</Text>
              </View>
            </View>
            {preview.map((doc) => {
              const cfg = DOC_STATUS[doc.status] ?? DOC_STATUS.ASSIGNED;
              return (
                <View key={doc.id} style={s.docRow}>
                  <Text style={s.docName} numberOfLines={1}>
                    {doc.documentType?.name ?? "Document"}
                  </Text>
                  <View style={[s.pill, { backgroundColor: cfg.bg }]}>
                    <Text style={[s.pillTxt, { color: cfg.tc }]}>{cfg.label}</Text>
                  </View>
                </View>
              );
            })}
          </>
        )}
      </View>

      {/* CTA pinned at bottom */}
      <Pressable
        style={s.ctaLight}
        onPress={() => router.push({ pathname: "/(patient)/track", params: { tab: "documents" } })}
      >
        <Ionicons name="open-outline" size={14} color={T.accent} />
        <Text style={s.ctaLightText}>Go to Documents</Text>
      </Pressable>
    </View>
  );
}

// ─── Public Component ────────────────────────────────────────────────────────

interface Props {
  transport: PatientTransport | null;
  hotel: PatientHotel | null;
  documents: PatientDocument[];
}

export function OverviewSliderRow({ transport, hotel, documents }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      decelerationRate="fast"
      snapToInterval={CARD_W + 12}
      snapToAlignment="start"
      contentContainerStyle={s.scrollContent}
      style={s.scroll}
    >
      <TransportSlide transport={transport} />
      <HotelSlide hotel={hotel} />
      <DocsSlide documents={documents} />
    </ScrollView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  scroll: { marginHorizontal: -T.sp16 },
  scrollContent: {
    paddingHorizontal: T.sp16,
    gap: 12,
    paddingBottom: 4,
  },
  card: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 20,
    padding: T.sp16,
    overflow: "hidden",
  },
  docsCard: {
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  glossCircle: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  arcDecor: {
    position: "absolute",
    top: -50,
    right: -50,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(3,105,161,0.08)",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: T.sp10,
  },
  chipRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  chipDark: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: "rgba(255,255,255,0.5)",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  chipLight: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: T.accent,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  brandLogo:  { width: 40, height: 20 },
  hotelIcon:  {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: "rgba(3,105,161,0.1)", alignItems: "center", justifyContent: "center",
  },
  statusChip: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  statusChipTxt: { fontFamily: "Inter_600SemiBold", fontSize: 10 },
  grow: { flex: 1, gap: 6 },
  emptyBody: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  emptyTitleDark:  { fontFamily: "Inter_600SemiBold", fontSize: 13, color: "rgba(255,255,255,0.4)" },
  emptySubDark:    { fontFamily: "Inter_400Regular",  fontSize: 11, color: "rgba(255,255,255,0.25)", textAlign: "center" },
  emptyTitleLight: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: T.textMuted },
  emptySubLight:   { fontFamily: "Inter_400Regular",  fontSize: 11, color: T.textMuted, textAlign: "center" },
  vehicleName: { fontFamily: "Inter_700Bold", fontSize: 18, color: "#fff", letterSpacing: -0.3 },
  plateBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
  },
  plateText: { fontFamily: "Inter_700Bold", fontSize: 12, color: "rgba(255,255,255,0.8)", letterSpacing: 1.5 },
  driverRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  driverAvatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center",
  },
  driverLabel: { fontFamily: "Inter_400Regular", fontSize: 10, color: "rgba(255,255,255,0.4)" },
  driverName:  { fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#fff" },
  ctaDark: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, backgroundColor: "#fff", borderRadius: T.r10, paddingVertical: 10,
  },
  ctaDarkText: { fontFamily: "Inter_700Bold", fontSize: 13, color: "#0D1117" },
  hotelName:   { fontFamily: "Inter_700Bold", fontSize: 16, color: T.text, letterSpacing: -0.3 },
  infoRow:     { flexDirection: "row", alignItems: "center", gap: 5 },
  infoText:    { fontFamily: "Inter_400Regular", fontSize: 12, color: T.textSec, flex: 1 },
  stayRow: {
    flexDirection: "row",
    backgroundColor: "rgba(3,105,161,0.06)",
    borderRadius: T.r10, padding: T.sp10, alignItems: "center",
  },
  stayCol: { flex: 1, alignItems: "center" },
  stayLbl: { fontFamily: "Inter_400Regular", fontSize: 10, color: T.textMuted },
  stayVal: { fontFamily: "Inter_700Bold", fontSize: 12, color: T.text },
  stayDiv: { width: 1, height: 24, backgroundColor: "rgba(3,105,161,0.15)" },
  ctaLight: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, borderWidth: 1.5, borderColor: T.accent,
    borderRadius: T.r10, paddingVertical: 10,
    backgroundColor: "rgba(3,105,161,0.04)",
  },
  ctaLightText: { fontFamily: "Inter_700Bold", fontSize: 13, color: T.accent },
  countsRow: { flexDirection: "row", gap: 6 },
  countBox:  { flex: 1, alignItems: "center", paddingVertical: 6, borderRadius: T.r8 },
  countNum:  { fontFamily: "Inter_700Bold", fontSize: 16 },
  countLbl:  { fontFamily: "Inter_400Regular", fontSize: 10, marginTop: 1 },
  docRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingVertical: 4, borderTopWidth: 1, borderTopColor: T.border,
  },
  docName: { fontFamily: "Inter_500Medium", fontSize: 12, color: T.text, flex: 1 },
  pill:    { borderRadius: 20, paddingHorizontal: 7, paddingVertical: 2 },
  pillTxt: { fontFamily: "Inter_600SemiBold", fontSize: 9 },
});

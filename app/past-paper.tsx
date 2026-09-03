import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useStudent } from "../context/StudentContext";
import { useStudy, type PaperSection } from "../context/StudyContext";
import { type SubjectName } from "../data/subjects";

const SECTIONS: PaperSection[] = ["MCQ", "Essay", "Full Paper"];

export default function PastPaperScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ subjectName?: string; topicName?: string }>();
  const subject = (params.subjectName || "Physics") as SubjectName;
  const topic = params.topicName || "Past Papers";
  const { profile } = useStudent();
  const { paperHistory, getPaperAttemptCount, setManualPastPaperAttempts } = useStudy();

  const latest = Math.max(2000, (profile.examYear ?? new Date().getFullYear()) - 1);
  const years = useMemo(
    () => Array.from({ length: Math.min(35, latest - 1999) }, (_, i) => latest - i),
    [latest],
  );

  const [year, setYear] = useState(years[0]);
  const [section, setSection] = useState<PaperSection>("MCQ");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyYear, setHistoryYear] = useState(String(years[0]));
  const [historySection, setHistorySection] = useState<PaperSection>("MCQ");
  const [historyAttempts, setHistoryAttempts] = useState(1);
  const [savingHistory, setSavingHistory] = useState(false);

  const attempts = getPaperAttemptCount(subject, year, section);
  const subjectHistory = useMemo(
    () => paperHistory
      .filter((item) => item.subjectName === subject)
      .sort((a, b) => b.paperYear - a.paperYear || a.paperSection.localeCompare(b.paperSection)),
    [paperHistory, subject],
  );

  const start = () => router.push({
    pathname: "/stopwatch",
    params: {
      subjectName: subject,
      topicName: topic,
      studyType: "Past Papers",
      paperYear: String(year),
      paperSection: section,
      attemptNo: String(attempts + 1),
    },
  });

  const openHistory = () => {
    setHistoryYear(String(year));
    setHistorySection(section);
    const manual = paperHistory.find(
      (item) => item.subjectName === subject && item.paperYear === year && item.paperSection === section,
    );
    setHistoryAttempts(Math.max(1, manual?.attempts ?? 1));
    setHistoryOpen(true);
  };

  const saveHistory = async () => {
    const parsedYear = Number(historyYear.trim());
    if (!Number.isInteger(parsedYear) || parsedYear < 1950 || parsedYear > new Date().getFullYear()) {
      Alert.alert("Invalid year", "Enter a valid four-digit past-paper year.");
      return;
    }
    setSavingHistory(true);
    try {
      await setManualPastPaperAttempts(subject, parsedYear, historySection, historyAttempts);
      setYear(parsedYear);
      setSection(historySection);
      setHistoryOpen(false);
    } catch (error) {
      Alert.alert("Could not save", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setSavingHistory(false);
    }
  };

  const removeHistory = async (paperYear: number, paperSection: PaperSection) => {
    try {
      await setManualPastPaperAttempts(subject, paperYear, paperSection, 0);
    } catch (error) {
      Alert.alert("Could not remove", error instanceof Error ? error.message : "Please try again.");
    }
  };

  return (
    <View style={styles.root}>
      <LinearGradient colors={["#1B1227", "#080D14"]} style={StyleSheet.absoluteFill} />

      <View style={styles.head}>
        <Pressable style={styles.back} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#FFF" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Past papers</Text>
          <Text style={styles.sub}>{subject} · {topic}</Text>
        </View>
        <Pressable style={styles.historyButton} onPress={openHistory}>
          <Ionicons name="add" size={18} color="#E9D9FF" />
          <Text style={styles.historyButtonText}>Add history</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <LinearGradient colors={["#33234C", "#151B27"]} style={styles.hero}>
          <Ionicons name="documents-outline" size={34} color="#E5D3FB" />
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Every attempt is kept</Text>
            <Text style={styles.heroSub}>
              Repeat the same paper year as many times as you need. You can also add papers you completed before installing Study Arc.
            </Text>
          </View>
        </LinearGradient>

        <Text style={styles.label}>PAPER SECTION</Text>
        <View style={styles.sections}>
          {SECTIONS.map((item) => (
            <Pressable key={item} onPress={() => setSection(item)} style={[styles.section, section === item && styles.sectionOn]}>
              <Text style={[styles.sectionText, section === item && styles.sectionTextOn]}>{item}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>PAPER YEAR</Text>
        <Text style={styles.help}>Choose any year. Saved stopwatch attempts and your manually entered history are combined.</Text>
        <View style={styles.years}>
          {years.map((itemYear) => {
            const count = getPaperAttemptCount(subject, itemYear, section);
            return (
              <Pressable key={itemYear} onPress={() => setYear(itemYear)} style={[styles.year, year === itemYear && styles.yearOn]}>
                <Text style={[styles.yearText, year === itemYear && styles.yearTextOn]}>{itemYear}</Text>
                <Text style={[styles.count, year === itemYear && styles.countOn]}>{count ? `${count} done` : "Not done"}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.historyHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.labelNoMargin}>PAST-PAPER HISTORY</Text>
            <Text style={styles.helpNoMargin}>Papers completed before using this app.</Text>
          </View>
          <Pressable style={styles.smallAdd} onPress={openHistory}>
            <Ionicons name="add-circle-outline" size={17} color="#D9C0FA" />
            <Text style={styles.smallAddText}>Add year</Text>
          </Pressable>
        </View>

        {subjectHistory.length === 0 ? (
          <View style={styles.emptyHistory}>
            <Ionicons name="archive-outline" size={24} color="#6F7C8F" />
            <Text style={styles.emptyTitle}>No previous papers added</Text>
            <Text style={styles.emptyText}>Add the years you already completed so attempt numbers stay accurate.</Text>
          </View>
        ) : (
          <View style={styles.historyList}>
            {subjectHistory.map((item) => (
              <View key={item.id} style={styles.historyRow}>
                <View style={styles.historyYearBadge}><Text style={styles.historyYearText}>{item.paperYear}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.historySection}>{item.paperSection}</Text>
                  <Text style={styles.historyMeta}>{item.attempts} previous {item.attempts === 1 ? "attempt" : "attempts"}</Text>
                </View>
                <Pressable style={styles.editHistory} onPress={() => {
                  setHistoryYear(String(item.paperYear));
                  setHistorySection(item.paperSection);
                  setHistoryAttempts(item.attempts);
                  setHistoryOpen(true);
                }}>
                  <Ionicons name="pencil" size={15} color="#BFA6DD" />
                </Pressable>
                <Pressable style={styles.deleteHistory} onPress={() => removeHistory(item.paperYear, item.paperSection)}>
                  <Ionicons name="trash-outline" size={15} color="#D896A5" />
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.bottom}>
        <View style={{ flex: 1 }}>
          <Text style={styles.bottomTop}>{year} · {section}</Text>
          <Text style={styles.bottomSub}>{attempts ? `Attempt ${attempts + 1} · ${attempts} previous` : "First attempt"}</Text>
        </View>
        <Pressable style={styles.start} onPress={start}>
          <Ionicons name="play" size={17} color="#160C20" />
          <Text style={styles.startText}>Start paper</Text>
        </Pressable>
      </View>

      <Modal transparent animationType="fade" visible={historyOpen} onRequestClose={() => setHistoryOpen(false)}>
        <View style={styles.modalShade}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setHistoryOpen(false)} />
          <View style={styles.modalCard}>
            <View style={styles.modalTop}>
              <View>
                <Text style={styles.modalTitle}>Add past-paper history</Text>
                <Text style={styles.modalSub}>{subject}</Text>
              </View>
              <Pressable style={styles.close} onPress={() => setHistoryOpen(false)}>
                <Ionicons name="close" size={19} color="#CFD6E0" />
              </Pressable>
            </View>

            <Text style={styles.modalLabel}>YEAR</Text>
            <TextInput
              value={historyYear}
              onChangeText={(text) => setHistoryYear(text.replace(/[^0-9]/g, "").slice(0, 4))}
              keyboardType="number-pad"
              placeholder="2023"
              placeholderTextColor="#566273"
              style={styles.yearInput}
            />

            <Text style={styles.modalLabel}>SECTION</Text>
            <View style={styles.sections}>
              {SECTIONS.map((item) => (
                <Pressable key={item} onPress={() => setHistorySection(item)} style={[styles.section, historySection === item && styles.sectionOn]}>
                  <Text style={[styles.sectionText, historySection === item && styles.sectionTextOn]}>{item}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.modalLabel}>HOW MANY TIMES HAVE YOU ALREADY DONE IT?</Text>
            <View style={styles.stepper}>
              <Pressable style={styles.stepButton} onPress={() => setHistoryAttempts((value) => Math.max(1, value - 1))}>
                <Ionicons name="remove" size={22} color="#ECE4F7" />
              </Pressable>
              <View style={styles.stepValueWrap}>
                <Text style={styles.stepValue}>{historyAttempts}</Text>
                <Text style={styles.stepHint}>{historyAttempts === 1 ? "attempt" : "attempts"}</Text>
              </View>
              <Pressable style={styles.stepButton} onPress={() => setHistoryAttempts((value) => Math.min(100, value + 1))}>
                <Ionicons name="add" size={22} color="#ECE4F7" />
              </Pressable>
            </View>

            <Pressable style={[styles.saveHistory, savingHistory && { opacity: 0.6 }]} disabled={savingHistory} onPress={saveHistory}>
              <Ionicons name="checkmark-circle" size={19} color="#160C20" />
              <Text style={styles.saveHistoryText}>{savingHistory ? "Saving…" : "Save past-paper history"}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#080D14" },
  head: { padding: 18, paddingTop: 22, flexDirection: "row", alignItems: "center", gap: 12 },
  back: { width: 43, height: 43, borderRadius: 14, backgroundColor: "#151C27", alignItems: "center", justifyContent: "center" },
  title: { color: "#F5F6F8", fontSize: 22, fontWeight: "900" },
  sub: { color: "#7D8999", fontSize: 10, marginTop: 3 },
  historyButton: { minHeight: 42, borderRadius: 14, borderWidth: 1, borderColor: "#624A83", backgroundColor: "#241A34", paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 6 },
  historyButtonText: { color: "#E2D0F7", fontSize: 10, fontWeight: "900" },
  content: { padding: 20, paddingBottom: 125, maxWidth: 800, width: "100%", alignSelf: "center" },
  hero: { borderRadius: 21, borderWidth: 1, borderColor: "#4C3867", padding: 17, flexDirection: "row", gap: 13, alignItems: "center" },
  heroTitle: { color: "#F1EAF9", fontSize: 16, fontWeight: "900" },
  heroSub: { color: "#9B8FAA", fontSize: 11, lineHeight: 17, marginTop: 4 },
  label: { color: "#788596", fontSize: 9, fontWeight: "900", letterSpacing: 1.2, marginTop: 23, marginBottom: 9 },
  labelNoMargin: { color: "#788596", fontSize: 9, fontWeight: "900", letterSpacing: 1.2 },
  help: { color: "#748194", fontSize: 11, lineHeight: 17, marginTop: -3, marginBottom: 9 },
  helpNoMargin: { color: "#748194", fontSize: 10, lineHeight: 16, marginTop: 4 },
  sections: { flexDirection: "row", gap: 8 },
  section: { flex: 1, minHeight: 48, borderRadius: 15, backgroundColor: "#111923", borderWidth: 1, borderColor: "#293646", alignItems: "center", justifyContent: "center" },
  sectionOn: { backgroundColor: "#3B2858", borderColor: "#8462BE" },
  sectionText: { color: "#8290A2", fontSize: 11, fontWeight: "900" },
  sectionTextOn: { color: "#F0E7FD" },
  years: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  year: { width: 95, minHeight: 64, borderRadius: 16, backgroundColor: "#101720", borderWidth: 1, borderColor: "#273342", padding: 10, alignItems: "center", justifyContent: "center" },
  yearOn: { backgroundColor: "#28203A", borderColor: "#7959A6" },
  yearText: { color: "#DDE2E8", fontSize: 15, fontWeight: "900" },
  yearTextOn: { color: "#DCC3FA" },
  count: { color: "#657284", fontSize: 8.5, marginTop: 4, fontWeight: "700" },
  countOn: { color: "#9F8CB8" },
  historyHeader: { marginTop: 28, marginBottom: 10, flexDirection: "row", gap: 10, alignItems: "center" },
  smallAdd: { borderWidth: 1, borderColor: "#47385D", borderRadius: 12, paddingHorizontal: 10, minHeight: 36, flexDirection: "row", gap: 5, alignItems: "center" },
  smallAddText: { color: "#BFA8DA", fontSize: 9.5, fontWeight: "900" },
  emptyHistory: { borderWidth: 1, borderColor: "#273341", backgroundColor: "#0F161F", borderRadius: 18, padding: 20, alignItems: "center" },
  emptyTitle: { color: "#D6DCE4", fontSize: 12, fontWeight: "900", marginTop: 8 },
  emptyText: { color: "#6F7C8E", fontSize: 10, textAlign: "center", maxWidth: 320, lineHeight: 15, marginTop: 5 },
  historyList: { gap: 8 },
  historyRow: { minHeight: 64, borderRadius: 17, backgroundColor: "#101720", borderWidth: 1, borderColor: "#273341", paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  historyYearBadge: { width: 52, height: 38, borderRadius: 11, backgroundColor: "#241B33", borderWidth: 1, borderColor: "#4D3B65", alignItems: "center", justifyContent: "center" },
  historyYearText: { color: "#DBC4F5", fontSize: 12, fontWeight: "900" },
  historySection: { color: "#E2E6EB", fontSize: 11, fontWeight: "900" },
  historyMeta: { color: "#6F7C8D", fontSize: 9, marginTop: 3 },
  editHistory: { width: 34, height: 34, borderRadius: 10, backgroundColor: "#1D1727", alignItems: "center", justifyContent: "center" },
  deleteHistory: { width: 34, height: 34, borderRadius: 10, backgroundColor: "#24171C", alignItems: "center", justifyContent: "center" },
  bottom: { position: "absolute", left: 0, right: 0, bottom: 0, minHeight: 90, backgroundColor: "#0C121BEE", borderTopWidth: 1, borderTopColor: "#273343", paddingHorizontal: 20, paddingVertical: 15, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 15 },
  bottomTop: { color: "#F0F3F7", fontSize: 14, fontWeight: "900" },
  bottomSub: { color: "#758294", fontSize: 10, marginTop: 3 },
  start: { height: 50, borderRadius: 16, backgroundColor: "#B784FF", paddingHorizontal: 18, flexDirection: "row", gap: 7, alignItems: "center", justifyContent: "center" },
  startText: { color: "#160C20", fontSize: 12, fontWeight: "900" },
  modalShade: { flex: 1, backgroundColor: "#03060CB8", alignItems: "center", justifyContent: "center", padding: 20 },
  modalCard: { width: "100%", maxWidth: 470, borderRadius: 24, backgroundColor: "#101721", borderWidth: 1, borderColor: "#384659", padding: 18 },
  modalTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  modalTitle: { color: "#F2F4F7", fontSize: 17, fontWeight: "900" },
  modalSub: { color: "#788496", fontSize: 10, marginTop: 3 },
  close: { width: 38, height: 38, borderRadius: 12, backgroundColor: "#19212D", alignItems: "center", justifyContent: "center" },
  modalLabel: { color: "#778497", fontSize: 9, fontWeight: "900", letterSpacing: 1, marginTop: 18, marginBottom: 8 },
  yearInput: { height: 52, borderRadius: 15, backgroundColor: "#0B1119", borderWidth: 1, borderColor: "#2D3948", color: "#F1F3F6", fontSize: 17, fontWeight: "900", paddingHorizontal: 15 },
  stepper: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 17, marginTop: 2 },
  stepButton: { width: 48, height: 48, borderRadius: 16, backgroundColor: "#21182D", borderWidth: 1, borderColor: "#4B3A60", alignItems: "center", justifyContent: "center" },
  stepValueWrap: { width: 90, alignItems: "center" },
  stepValue: { color: "#F1E6FF", fontSize: 31, fontWeight: "900" },
  stepHint: { color: "#7E8A99", fontSize: 9, fontWeight: "700", marginTop: 1 },
  saveHistory: { minHeight: 52, borderRadius: 16, backgroundColor: "#B784FF", marginTop: 22, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  saveHistoryText: { color: "#160C20", fontSize: 11.5, fontWeight: "900" },
});

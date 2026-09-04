import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line, Polyline } from "react-native-svg";

import Screen from "../components/Screen";
import { useStudent } from "../context/StudentContext";
import { type StudySession, useStudy } from "../context/StudyContext";
import { SUBJECTS, expandSubjectChoices, type SubjectName } from "../data/subjects";
import { durationMinutes } from "../lib/time";

const PIE_COLORS = ["#B784FF", "#63B8FF", "#65D79A", "#FF8DA1", "#F0B86A", "#8E9CFF", "#55C7C2", "#DA89FF"];
const WORK_COLORS: Record<string, string> = {
  "Study Session": "#B784FF",
  Revision: "#F0A96B",
  "Past Papers": "#63B8FF",
  "Tute Questions": "#65D79A",
};

const startDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const fmtSeconds = (sec: number) => {
  const safe = Math.max(0, Math.round(sec));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};
const average = (values: (number | null)[]) => {
  const real = values.filter((v): v is number => v != null);
  return real.length ? real.reduce((a, b) => a + b, 0) / real.length : null;
};
const sumSeconds = (sessions: StudySession[]) => sessions.reduce((sum, row) => sum + row.durationSeconds, 0);

export default function StatisticsScreen() {
  const router = useRouter();
  const { profile, classes, topicProgress, testMarks, subtopicCoverage } = useStudent();
  const { sessions } = useStudy();
  const subjects = useMemo(() => expandSubjectChoices(profile.subjectChoices), [profile.subjectChoices]);
  const [selected, setSelected] = useState<SubjectName | null>(null);
  const shown = selected ? [selected] : subjects;

  const relevantSessions = useMemo(
    () => sessions.filter((row) => subjects.includes(row.subjectName as SubjectName)),
    [sessions, subjects],
  );

  const subjectTotals = useMemo(
    () => subjects.map((name) => ({ name, seconds: sumSeconds(relevantSessions.filter((row) => row.subjectName === name)), color: SUBJECTS[name].color })),
    [relevantSessions, subjects],
  );

  const last14Days = useMemo(() => {
    const end = startDay(new Date());
    return Array.from({ length: 14 }, (_, index) => new Date(end.getTime() - (13 - index) * 86400000));
  }, []);

  const subjectLineSeries = useMemo(
    () => subjects.map((name) => ({
      name,
      color: SUBJECTS[name].color,
      values: last14Days.map((day) => relevantSessions
        .filter((row) => row.subjectName === name && startDay(new Date(row.startedAt)).getTime() === day.getTime())
        .reduce((sum, row) => sum + row.durationSeconds / 60, 0)),
    })),
    [last14Days, relevantSessions, subjects],
  );

  const workTypeSegments = useMemo(
    () => ["Study Session", "Revision", "Past Papers", "Tute Questions"].map((type) => ({
      label: type,
      value: sumSeconds(relevantSessions.filter((row) => row.studyType === type)),
      color: WORK_COLORS[type],
    })).filter((row) => row.value > 0),
    [relevantSessions],
  );

  const totalSeconds = sumSeconds(relevantSessions);
  const allFocus = average(relevantSessions.map((row) => row.focusRating));
  const allUnderstanding = average(relevantSessions.map((row) => row.understandingRating));

  return (
    <Screen>
      <LinearGradient colors={["#0E1220", "#080D14"]} style={StyleSheet.absoluteFill} />
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={s.title}>Analytics</Text>
        <Text style={s.subtitle}>Your study time, effort, subjects and lessons — based on your saved Study Arc sessions.</Text>

        <View style={s.filters}>
          <Pressable onPress={() => setSelected(null)} style={[s.filter, !selected && s.filterOn]}>
            <Text style={[s.filterText, !selected && s.filterTextOn]}>All subjects</Text>
          </Pressable>
          {subjects.map((name) => (
            <Pressable key={name} onPress={() => setSelected(name)} style={[s.filter, selected === name && s.filterOn]}>
              <Text style={[s.filterText, selected === name && s.filterTextOn]}>{name}</Text>
            </Pressable>
          ))}
        </View>

        {!selected && (
          <>
            <View style={s.overviewGrid}>
              <OverviewMetric icon="time-outline" label="Total self-study" value={fmtSeconds(totalSeconds)} />
              <OverviewMetric icon="layers-outline" label="Sessions" value={String(relevantSessions.length)} />
              <OverviewMetric icon="flash-outline" label="Avg focus" value={allFocus == null ? "—" : `${allFocus.toFixed(1)}/5`} />
              <OverviewMetric icon="bulb-outline" label="Understanding" value={allUnderstanding == null ? "—" : `${allUnderstanding.toFixed(1)}/5`} />
            </View>

            <AnalyticsCard title="Time given to each subject" subtitle="Lifetime saved self-study">
              <View style={s.chartSplit}>
                <DonutChart segments={subjectTotals.map((row) => ({ label: row.name, value: row.seconds, color: row.color }))} centerTop={fmtSeconds(totalSeconds)} centerBottom="TOTAL" />
                <Legend segments={subjectTotals.map((row) => ({ label: row.name, value: row.seconds, color: row.color }))} formatValue={fmtSeconds} />
              </View>
            </AnalyticsCard>

            <AnalyticsCard title="Subject study trend" subtitle="Last 14 days · minutes per day">
              <LineChart series={subjectLineSeries} labels={last14Days.map((day) => day.toLocaleDateString(undefined, { weekday: "narrow" }))} />
              <View style={s.lineLegend}>
                {subjectLineSeries.map((row) => <LegendDot key={row.name} color={row.color} label={row.name} />)}
              </View>
            </AnalyticsCard>

            <AnalyticsCard title="How your study time is used" subtitle="Study, revision, papers and tute work">
              <StudyTimeUsage segments={workTypeSegments} totalSeconds={totalSeconds} />
            </AnalyticsCard>

            <Text style={s.sectionTitle}>Subject effort</Text>
            <Text style={s.sectionSub}>Tap a subject to see every lesson and its detailed breakdown.</Text>
            <View style={s.subjectSummaryGrid}>
              {subjects.map((name) => {
                const ss = relevantSessions.filter((row) => row.subjectName === name);
                const sec = sumSeconds(ss);
                const focus = average(ss.map((row) => row.focusRating));
                const understand = average(ss.map((row) => row.understandingRating));
                return (
                  <Pressable key={name} onPress={() => setSelected(name)} style={s.subjectSummaryCard}>
                    <View style={[s.subjectAccent, { backgroundColor: SUBJECTS[name].color }]} />
                    <Text style={[s.subjectSummaryName, { color: SUBJECTS[name].color }]}>{name}</Text>
                    <Text style={s.subjectSummaryTime}>{fmtSeconds(sec)}</Text>
                    <Text style={s.subjectSummaryMeta}>{ss.length} sessions · Focus {focus == null ? "—" : focus.toFixed(1)} · Understanding {understand == null ? "—" : understand.toFixed(1)}</Text>
                    <Ionicons name="arrow-forward" size={16} color="#647184" style={s.subjectSummaryArrow} />
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {shown.map((name) => (
          <SubjectAnalytics
            key={name}
            name={name}
            sessions={sessions.filter((row) => row.subjectName === name)}
            classes={classes.filter((row) => row.subjectName === name)}
            topicProgress={topicProgress.filter((row) => row.subjectName === name)}
            testMarks={testMarks.filter((row) => row.subjectName === name)}
            subtopicCoverage={subtopicCoverage}
            onOpenSubject={() => router.push({ pathname: "/subject", params: { subjectName: name } })}
            onOpenSessions={() => router.push("/(tabs)/sessions")}
            onOpenClasses={() => router.push("/classes")}
            onOpenRevision={() => router.push("/revision")}
            onOpenPapers={() => router.push({ pathname: "/past-paper", params: { subjectName: name } })}
            onOpenMarks={() => router.push("/test-mark")}
            onOpenTopic={(topicName: string) => router.push({ pathname: "/topic", params: { subjectName: name, topicName } })}
          />
        ))}
      </ScrollView>
    </Screen>
  );
}

function SubjectAnalytics({
  name,
  sessions,
  classes,
  topicProgress,
  testMarks,
  subtopicCoverage,
  onOpenSubject,
  onOpenSessions,
  onOpenClasses,
  onOpenRevision,
  onOpenPapers,
  onOpenMarks,
  onOpenTopic,
}: any) {
  const config = SUBJECTS[name as SubjectName];
  const total = sumSeconds(sessions);
  const focus = average(sessions.map((row: StudySession) => row.focusRating));
  const understanding = average(sessions.map((row: StudySession) => row.understandingRating));
  const classMinutes = classes.reduce((sum: number, row: any) => sum + durationMinutes(row.startTime, row.endTime), 0);
  const due = topicProgress.filter((row: any) => row.nextRecallAt && new Date(row.nextRecallAt) <= new Date()).length;
  const papers = sessions.filter((row: StudySession) => row.studyType === "Past Papers").length;
  const totalSubtopics = config.topics.reduce((sum, topic) => sum + topic.subtopics.length, 0);
  const coveredSubtopics = config.topics.reduce((sum, topic) => sum + topic.subtopics.filter((sub) => subtopicCoverage.some((row: any) => row.subjectName === name && row.topicName === topic.title && row.subtopicName === sub && row.covered && row.source === "Manual")).length, 0);

  const days = Array.from({ length: 14 }, (_, i) => new Date(startDay(new Date()).getTime() - (13 - i) * 86400000));
  const dayMinutes = days.map((day) => sessions
    .filter((row: StudySession) => startDay(new Date(row.startedAt)).getTime() === day.getTime())
    .reduce((sum: number, row: StudySession) => sum + row.durationSeconds / 60, 0));

  const lessonRows = config.topics.map((topic, index) => {
    const lessonSessions = sessions.filter((row: StudySession) => row.topicName === topic.title || row.topicName === topic.sinhala);
    const seconds = sumSeconds(lessonSessions);
    return {
      title: topic.title,
      display: topic.sinhala || topic.title,
      unit: topic.unit || topic.id,
      seconds,
      sessions: lessonSessions.length,
      focus: average(lessonSessions.map((row: StudySession) => row.focusRating)),
      understanding: average(lessonSessions.map((row: StudySession) => row.understandingRating)),
      lastStudied: lessonSessions.length ? [...lessonSessions].sort((a, b) => +new Date(b.startedAt) - +new Date(a.startedAt))[0].startedAt : null,
      color: PIE_COLORS[index % PIE_COLORS.length],
    };
  });

  const lessonPie = lessonRows.filter((row) => row.seconds > 0).map((row) => ({ label: row.display, value: row.seconds, color: row.color }));
  const workSegments = ["Study Session", "Revision", "Past Papers", "Tute Questions"].map((type) => ({
    label: type,
    value: sumSeconds(sessions.filter((row: StudySession) => row.studyType === type)),
    color: WORK_COLORS[type],
  })).filter((row) => row.value > 0);

  const marks = testMarks.slice(-6);

  return (
    <View style={s.subjectBlock}>
      <Pressable onPress={onOpenSubject}>
        <LinearGradient colors={[config.color + "32", config.accent + "12", "#101720"]} style={[s.subjectHead, { borderColor: config.color + "66" }]}>
          <View style={{ flex: 1 }}>
            <Text style={[s.subjectName, { color: config.color }]}>{name}</Text>
            <Text style={s.range}>LIFETIME EFFORT</Text>
          </View>
          <View style={s.subjectHeadRight}>
            <Text style={s.academic}>{fmtSeconds(total)}</Text>
            <Text style={s.subjectHeadMeta}>{sessions.length} sessions</Text>
          </View>
          <Ionicons name="chevron-forward" size={17} color="#758294" />
        </LinearGradient>
      </Pressable>

      <View style={s.metricGrid}>
        <Metric label="Self-study" value={fmtSeconds(total)} onPress={onOpenSessions} />
        <Metric label="Sessions" value={String(sessions.length)} onPress={onOpenSessions} />
        <Metric label="Avg focus" value={focus == null ? "—" : `${focus.toFixed(1)}/5`} onPress={onOpenSessions} />
        <Metric label="Understanding" value={understanding == null ? "—" : `${understanding.toFixed(1)}/5`} onPress={onOpenSessions} />
        <Metric label="Weekly class schedule" value={fmtSeconds(classMinutes * 60)} onPress={onOpenClasses} />
        <Metric label="Syllabus self-covered" value={`${coveredSubtopics}/${totalSubtopics}`} onPress={onOpenSubject} />
        <Metric label="Memory due" value={String(due)} onPress={onOpenRevision} />
        <Metric label="Past-paper attempts" value={String(papers)} onPress={onOpenPapers} />
      </View>

      <AnalyticsCard title={`${name} study trend`} subtitle="Last 14 days · minutes per day">
        <LineChart series={[{ name, color: config.color, values: dayMinutes }]} labels={days.map((day) => day.toLocaleDateString(undefined, { weekday: "narrow" }))} />
      </AnalyticsCard>

      <View style={s.twoCharts}>
        <AnalyticsCard style={s.flexChart} title="Lesson time" subtitle="Where your subject time went">
          <DonutChart segments={lessonPie} centerTop={fmtSeconds(total)} centerBottom="TOTAL" />
        </AnalyticsCard>
        <AnalyticsCard style={s.flexChart} title="Work mix" subtitle="Study vs revision vs papers">
          <DonutChart segments={workSegments} centerTop={String(sessions.length)} centerBottom="SESSIONS" />
          <Legend segments={workSegments} formatValue={fmtSeconds} compact />
        </AnalyticsCard>
      </View>

      <AnalyticsCard title="Every lesson" subtitle="Time, sessions, focus and understanding">
        <View style={s.lessonList}>
          {lessonRows.map((row) => {
            const width = total > 0 ? Math.max(2, row.seconds / total * 100) : 0;
            return (
              <Pressable key={row.title} onPress={() => onOpenTopic(row.title)} style={s.lessonRow}>
                <View style={s.lessonTop}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.lessonTitle} numberOfLines={1}>{row.display}</Text>
                    <Text style={s.lessonUnit}>{row.unit} · {row.sessions} session{row.sessions === 1 ? "" : "s"}</Text>
                  </View>
                  <Text style={[s.lessonTime, { color: config.color }]}>{fmtSeconds(row.seconds)}</Text>
                  <Ionicons name="chevron-forward" size={14} color="#536172" />
                </View>
                <View style={s.lessonTrack}><View style={[s.lessonFill, { width: `${width}%`, backgroundColor: config.color }]} /></View>
                <View style={s.lessonMetaRow}>
                  <Text style={s.lessonMeta}>Focus {row.focus == null ? "—" : `${row.focus.toFixed(1)}/5`}</Text>
                  <Text style={s.lessonMeta}>Understanding {row.understanding == null ? "—" : `${row.understanding.toFixed(1)}/5`}</Text>
                  <Text style={s.lessonMeta}>{row.lastStudied ? `Last ${new Date(row.lastStudied).toLocaleDateString()}` : "Not studied yet"}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </AnalyticsCard>

      <Pressable onPress={onOpenMarks} style={s.markCard}>
        <View style={s.chartTop}>
          <View>
            <Text style={s.chartTitle}>Test marks</Text>
            <Text style={s.cardSub}>Latest MCQ and essay results</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#647184" />
        </View>
        {marks.length ? marks.map((mark: any) => (
          <View key={mark.id} style={s.markRow}>
            <Text style={s.markName} numberOfLines={1}>{mark.title}</Text>
            <Text style={s.markValue}>MCQ {mark.mcqScore == null || mark.mcqTotal == null ? "—" : `${mark.mcqScore}/${mark.mcqTotal}`}</Text>
            <Text style={s.markValue}>Essay {mark.essayScore == null || mark.essayTotal == null ? "—" : `${mark.essayScore}/${mark.essayTotal}`}</Text>
          </View>
        )) : <Text style={s.noMarks}>No test marks for this subject yet. Tap to add one.</Text>}
      </Pressable>
    </View>
  );
}

function AnalyticsCard({ title, subtitle, children, style }: { title: string; subtitle?: string; children: React.ReactNode; style?: any }) {
  return (
    <View style={[s.card, style]}>
      <View style={s.cardHead}>
        <View style={{ flex: 1 }}>
          <Text style={s.cardTitle}>{title}</Text>
          {subtitle ? <Text style={s.cardSub}>{subtitle}</Text> : null}
        </View>
      </View>
      {children}
    </View>
  );
}

function OverviewMetric({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={s.overviewMetric}>
      <View style={s.overviewIcon}><Ionicons name={icon} size={18} color="#C7A5F3" /></View>
      <View style={{ flex: 1 }}><Text style={s.overviewValue}>{value}</Text><Text style={s.overviewLabel}>{label}</Text></View>
    </View>
  );
}

function Metric({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.metric, pressed && { opacity: 0.72 }]}>
      <View style={{ flex: 1 }}><Text style={s.metricValue}>{value}</Text><Text style={s.metricLabel}>{label}</Text></View>
      <Ionicons name="chevron-forward" size={15} color="#536172" />
    </Pressable>
  );
}

function StudyTimeUsage({
  segments,
  totalSeconds,
}: {
  segments: { label: string; value: number; color: string }[];
  totalSeconds: number;
}) {
  const visible = segments.filter((item) => item.value > 0);

  const friendlyLabel = (label: string) => {
    if (label === "Study Session") return "Lesson study";
    if (label === "Tute Questions") return "Tute work";
    return label;
  };

  if (!visible.length) {
    return (
      <View style={s.studyUsageEmpty}>
        <View style={s.studyUsageEmptyIcon}>
          <Ionicons name="pie-chart-outline" size={24} color="#746584" />
        </View>
        <Text style={s.studyUsageEmptyTitle}>No study time yet</Text>
        <Text style={s.studyUsageEmptyText}>
          Your study-type breakdown will appear after you save sessions.
        </Text>
      </View>
    );
  }

  return (
    <View style={s.studyUsageLayout}>
      <View style={s.studyUsageChart}>
        <DonutChart
          segments={visible}
          centerTop={fmtSeconds(totalSeconds)}
          centerBottom="TOTAL TIME"
        />
      </View>

      <View style={s.studyUsageBreakdown}>
        {visible.map((item) => {
          const percentage = totalSeconds > 0
            ? Math.round((item.value / totalSeconds) * 100)
            : 0;

          return (
            <View key={item.label} style={s.studyUsageRow}>
              <View
                style={[
                  s.studyUsageAccent,
                  { backgroundColor: item.color },
                ]}
              />

              <View style={s.studyUsageInfo}>
                <Text style={s.studyUsageLabel}>
                  {friendlyLabel(item.label)}
                </Text>
                <Text style={s.studyUsagePercentage}>
                  {percentage}% of your study time
                </Text>
              </View>

              <Text style={s.studyUsageTime}>
                {fmtSeconds(item.value)}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function DonutChart({ segments, centerTop, centerBottom }: { segments: { label: string; value: number; color: string }[]; centerTop: string; centerBottom: string }) {
  const positive = segments.filter((row) => row.value > 0);
  const total = positive.reduce((sum, row) => sum + row.value, 0);
  const radius = 43;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <View style={s.donutWrap}>
      <Svg width="150" height="150" viewBox="0 0 120 120">
        <Circle cx="60" cy="60" r={radius} stroke="#1B2531" strokeWidth="14" fill="none" />
        {total > 0 && positive.map((row) => {
          const length = row.value / total * circumference;
          const dashOffset = -offset;
          offset += length;
          return <Circle key={row.label} cx="60" cy="60" r={radius} stroke={row.color} strokeWidth="14" fill="none" strokeLinecap="butt" strokeDasharray={`${length} ${circumference - length}`} strokeDashoffset={dashOffset} rotation={-90} origin="60,60" />;
        })}
      </Svg>
      <View pointerEvents="none" style={s.donutCenter}><Text style={s.donutTop}>{centerTop}</Text><Text style={s.donutBottom}>{centerBottom}</Text></View>
    </View>
  );
}

function Legend({ segments, formatValue, compact = false }: { segments: { label: string; value: number; color: string }[]; formatValue: (v: number) => string; compact?: boolean }) {
  const shown = segments.filter((row) => row.value > 0);
  if (!shown.length) return <Text style={s.emptyChart}>No study data yet.</Text>;
  return (
    <View style={[s.legend, compact && s.legendCompact]}>
      {shown.map((row) => (
        <View key={row.label} style={s.legendRow}>
          <View style={[s.legendDot, { backgroundColor: row.color }]} />
          <Text style={s.legendLabel} numberOfLines={1}>{row.label}</Text>
          <Text style={s.legendValue}>{formatValue(row.value)}</Text>
        </View>
      ))}
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return <View style={s.legendDotRow}><View style={[s.legendDot, { backgroundColor: color }]} /><Text style={s.legendDotText}>{label}</Text></View>;
}

function LineChart({ series, labels }: { series: { name: string; color: string; values: number[] }[]; labels: string[] }) {
  const width = 100;
  const height = 42;
  const max = Math.max(30, ...series.flatMap((row) => row.values));
  const pointsFor = (values: number[]) => values.map((value, index) => {
    const x = values.length <= 1 ? 0 : index / (values.length - 1) * width;
    const y = height - value / max * (height - 4) - 2;
    return `${x},${y}`;
  }).join(" ");

  return (
    <View style={s.lineChartWrap}>
      <Svg width="100%" height="180" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        {[0.25, 0.5, 0.75].map((fraction) => <Line key={fraction} x1="0" x2={width} y1={height * fraction} y2={height * fraction} stroke="#263240" strokeWidth="0.35" />)}
        {series.map((row) => <Polyline key={row.name} points={pointsFor(row.values)} fill="none" stroke={row.color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />)}
      </Svg>
      <View style={s.axisLabels}>{labels.map((label, index) => index % 2 === 0 ? <Text key={index} style={s.axisLabel}>{label}</Text> : <View key={index} style={{ flex: 1 }} />)}</View>
    </View>
  );
}

const s = StyleSheet.create({
  content: { padding: 20, paddingBottom: 52, maxWidth: 1080, width: "100%", alignSelf: "center" },
  title: { color: "#F5F6F8", fontSize: 34, fontWeight: "900" },
  subtitle: { color: "#7B8797", fontSize: 13, marginTop: 5, marginBottom: 16, lineHeight: 19 },
  filters: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginBottom: 18 },
  filter: { minHeight: 36, paddingHorizontal: 12, borderRadius: 12, backgroundColor: "#111923", borderWidth: 1, borderColor: "#263241", alignItems: "center", justifyContent: "center" },
  filterOn: { backgroundColor: "#34234D", borderColor: "#7454A5" },
  filterText: { color: "#7C899A", fontSize: 10, fontWeight: "800" },
  filterTextOn: { color: "#EBDDFD" },
  overviewGrid: { flexDirection: "row", flexWrap: "wrap", gap: 9, marginBottom: 10 },
  overviewMetric: { minWidth: 155, flex: 1, minHeight: 82, borderRadius: 18, backgroundColor: "#101720", borderWidth: 1, borderColor: "#263241", padding: 13, flexDirection: "row", alignItems: "center", gap: 10 },
  overviewIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: "#B784FF15", alignItems: "center", justifyContent: "center" },
  overviewValue: { color: "#F2F4F7", fontSize: 19, fontWeight: "900" },
  overviewLabel: { color: "#718093", fontSize: 9, fontWeight: "800", marginTop: 3 },
  card: { backgroundColor: "#101720", borderWidth: 1, borderColor: "#263241", borderRadius: 22, padding: 16, marginTop: 10 },
  cardHead: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  cardTitle: { color: "#E9EDF2", fontSize: 14, fontWeight: "900" },
  cardSub: { color: "#697789", fontSize: 9, marginTop: 3 },
  chartSplit: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 15 },
  studyUsageLayout: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 20 },
  studyUsageChart: { width: 175, minHeight: 175, alignItems: "center", justifyContent: "center" },
  studyUsageBreakdown: { flex: 1, minWidth: 220, gap: 8 },
  studyUsageRow: { minHeight: 58, borderRadius: 15, backgroundColor: "#0D141D", borderWidth: 1, borderColor: "#202C39", paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  studyUsageAccent: { width: 4, height: 30, borderRadius: 4 },
  studyUsageInfo: { flex: 1, minWidth: 0 },
  studyUsageLabel: { color: "#E9EDF2", fontSize: 11, fontWeight: "900" },
  studyUsagePercentage: { color: "#687789", fontSize: 8, fontWeight: "700", marginTop: 4 },
  studyUsageTime: { color: "#F2F4F7", fontSize: 13, fontWeight: "900", fontVariant: ["tabular-nums"] },
  studyUsageEmpty: { minHeight: 150, alignItems: "center", justifyContent: "center", paddingHorizontal: 20 },
  studyUsageEmptyIcon: { width: 46, height: 46, borderRadius: 15, backgroundColor: "#B784FF12", alignItems: "center", justifyContent: "center" },
  studyUsageEmptyTitle: { color: "#E8ECF1", fontSize: 12, fontWeight: "900", marginTop: 10 },
  studyUsageEmptyText: { color: "#687789", fontSize: 9, lineHeight: 14, textAlign: "center", marginTop: 4, maxWidth: 260 },
  donutWrap: { width: 160, height: 160, alignItems: "center", justifyContent: "center", alignSelf: "center" },
  donutCenter: { position: "absolute", alignItems: "center", justifyContent: "center" },
  donutTop: { color: "#F3F5F8", fontSize: 16, fontWeight: "900" },
  donutBottom: { color: "#697789", fontSize: 7, fontWeight: "900", letterSpacing: 1, marginTop: 2 },
  legend: { flex: 1, minWidth: 190, gap: 8 },
  legendCompact: { minWidth: 0, marginTop: 5 },
  legendRow: { minHeight: 25, flexDirection: "row", alignItems: "center", gap: 7 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { flex: 1, minWidth: 0, color: "#AAB3C0", fontSize: 9, fontWeight: "700" },
  legendValue: { color: "#E5E9EE", fontSize: 9, fontWeight: "900" },
  lineChartWrap: { width: "100%" },
  axisLabels: { flexDirection: "row", marginTop: 2 },
  axisLabel: { flex: 1, color: "#536172", fontSize: 7, textAlign: "center" },
  lineLegend: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10 },
  legendDotRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDotText: { color: "#788598", fontSize: 8, fontWeight: "800" },
  sectionTitle: { color: "#F0F2F5", fontSize: 20, fontWeight: "900", marginTop: 24 },
  sectionSub: { color: "#718093", fontSize: 10, marginTop: 4, marginBottom: 10 },
  subjectSummaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  subjectSummaryCard: { width: "48%", minWidth: 250, flexGrow: 1, minHeight: 118, borderRadius: 19, backgroundColor: "#101720", borderWidth: 1, borderColor: "#263241", padding: 15, overflow: "hidden" },
  subjectAccent: { position: "absolute", left: 0, top: 0, bottom: 0, width: 4 },
  subjectSummaryName: { fontSize: 13, fontWeight: "900" },
  subjectSummaryTime: { color: "#F3F5F8", fontSize: 24, fontWeight: "900", marginTop: 8 },
  subjectSummaryMeta: { color: "#718093", fontSize: 8.5, marginTop: 5, paddingRight: 25 },
  subjectSummaryArrow: { position: "absolute", right: 14, top: 14 },
  subjectBlock: { marginTop: 10, marginBottom: 28 },
  subjectHead: { minHeight: 92, borderRadius: 21, borderWidth: 1, padding: 16, flexDirection: "row", alignItems: "center", gap: 10 },
  subjectName: { fontSize: 20, fontWeight: "900" },
  range: { color: "#718093", fontSize: 8, fontWeight: "900", letterSpacing: 1, marginTop: 5 },
  subjectHeadRight: { alignItems: "flex-end" },
  academic: { color: "#F4F5F7", fontSize: 21, fontWeight: "900" },
  subjectHeadMeta: { color: "#718093", fontSize: 8, marginTop: 3 },
  metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  metric: { width: "23%", minWidth: 150, flexGrow: 1, minHeight: 72, borderRadius: 17, backgroundColor: "#101720", borderWidth: 1, borderColor: "#263241", padding: 13, flexDirection: "row", alignItems: "center" },
  metricValue: { color: "#F0F2F6", fontSize: 18, fontWeight: "900" },
  metricLabel: { color: "#748194", fontSize: 8.5, marginTop: 4, fontWeight: "800" },
  twoCharts: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  flexChart: { flex: 1, minWidth: 280 },
  lessonList: { gap: 7 },
  lessonRow: { borderRadius: 15, backgroundColor: "#0D141D", borderWidth: 1, borderColor: "#202C39", padding: 11 },
  lessonTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  lessonTitle: { color: "#E8ECF1", fontSize: 11, fontWeight: "900" },
  lessonUnit: { color: "#657386", fontSize: 8, marginTop: 3 },
  lessonTime: { fontSize: 11, fontWeight: "900" },
  lessonTrack: { height: 5, borderRadius: 3, backgroundColor: "#1B2632", overflow: "hidden", marginTop: 8 },
  lessonFill: { height: "100%", borderRadius: 3 },
  lessonMetaRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 7 },
  lessonMeta: { color: "#697789", fontSize: 7.5, fontWeight: "700" },
  markCard: { backgroundColor: "#101720", borderWidth: 1, borderColor: "#263241", borderRadius: 20, padding: 15, marginTop: 10 },
  chartTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  chartTitle: { color: "#E9EDF2", fontSize: 13, fontWeight: "900" },
  markRow: { minHeight: 36, borderTopWidth: 1, borderTopColor: "#1D2835", flexDirection: "row", alignItems: "center", gap: 10 },
  markName: { flex: 1, color: "#8E9AAA", fontSize: 9, fontWeight: "800" },
  markValue: { color: "#D7DCE3", fontSize: 8.5, fontWeight: "900" },
  noMarks: { color: "#687587", fontSize: 10, marginTop: 13 },
  emptyChart: { color: "#687587", fontSize: 10, textAlign: "center", paddingVertical: 20 },
});

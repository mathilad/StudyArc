import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line, Polyline, Text as SvgText } from "react-native-svg";

export type PaperTrendPoint = { date: string; score: number; label: string; subject: string };
const dateLabel = (date: string) => {
  const parsed = new Date(date.slice(0, 10) + "T12:00:00");
  return Number.isNaN(parsed.getTime()) ? date : parsed.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

export default function PaperTrendGraph({ points }: { points: PaperTrendPoint[] }) {
  const shown = points.slice(-16);
  const [selected, setSelected] = useState<number | null>(null);
  const activeIndex = selected !== null && selected < shown.length ? selected : shown.length - 1;
  const active = shown[activeIndex];
  const w = 360, h = 190, left = 40, right = 20, top = 22, bottom = 32;
  const y = (score: number) => top + (100 - Math.max(0, Math.min(100, score))) * (h - top - bottom) / 100;
  const coords = shown.map((point, index) => ({
    x: shown.length === 1 ? (left + w - right) / 2 : left + index * (w - left - right) / (shown.length - 1),
    y: y(point.score),
  }));
  const change = shown.length > 1 ? shown[shown.length - 1].score - shown[shown.length - 2].score : null;
  return <View style={s.root}>
    <Svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} accessibilityLabel="Marks over time, from zero to one hundred percent">
      {[0, 25, 50, 75, 100].map(value => <React.Fragment key={value}>
        <Line x1={left} y1={y(value)} x2={w - right} y2={y(value)} stroke="#273342" strokeDasharray="3 5" />
        <SvgText x={left - 8} y={y(value) + 4} textAnchor="end" fill="#8D9AAA" fontSize={10}>{value}%</SvgText>
      </React.Fragment>)}
      {coords.length > 1 && <Polyline points={coords.map(p => `${p.x},${p.y}`).join(" ")} fill="none" stroke="#B784FF" strokeWidth={3} strokeLinejoin="round" />}
      {coords.map((p, index) => <Circle key={index} cx={p.x} cy={p.y} r={index === activeIndex ? 6 : 4} fill={index === activeIndex ? "#E2CCFF" : "#B784FF"} />)}
      {shown.length > 0 && <SvgText x={coords[0].x} y={h - 10} textAnchor={shown.length === 1 ? "middle" : "start"} fill="#8D9AAA" fontSize={10}>{dateLabel(shown[0].date)}</SvgText>}
      {shown.length > 1 && <SvgText x={w - right} y={h - 10} textAnchor="end" fill="#8D9AAA" fontSize={10}>{dateLabel(shown[shown.length - 1].date)}</SvgText>}
    </Svg>
    {active ? <>
      <View style={s.summary}><View style={{ flex: 1 }}><Text style={s.result}>{active.label || "Scored paper"} · {dateLabel(active.date)}</Text><Text style={s.caption}>{shown.length} latest result{shown.length === 1 ? "" : "s"} · oldest to newest · marks normalized to %</Text></View><Text style={s.score}>{active.score}%</Text></View>
      <Text style={[s.change, change !== null && { color: change >= 0 ? "#7FD09E" : "#E6A06A" }]}>{change === null ? "Save another result to see how your marks change." : `${change > 0 ? "+" : ""}${change} percentage points since the previous result`}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.results}>
        {shown.map((point, index) => <Pressable key={`${point.date}-${index}`} onPress={() => setSelected(index)} accessibilityRole="button" accessibilityLabel={`${point.label}, ${dateLabel(point.date)}, ${point.score} percent`} accessibilityState={{ selected: activeIndex === index }} style={[s.chip, activeIndex === index && s.chipActive]}><Text style={s.chipScore}>{point.score}%</Text><Text style={s.caption}>{dateLabel(point.date)}</Text></Pressable>)}
      </ScrollView>
    </> : <Text style={s.empty}>No marks yet. Save a test mark or scored paper result to start this subject’s graph.</Text>}
  </View>;
}
const s = StyleSheet.create({
  root: { marginTop: 10, borderRadius: 16, backgroundColor: "#0B1119", padding: 10 },
  summary: { flexDirection: "row", alignItems: "center", gap: 12 },
  result: { color: "#E0D7EC", fontSize: 12, fontWeight: "700" },
  caption: { color: "#8D9AAA", fontSize: 10, marginTop: 4 },
  score: { color: "#D9C1F5", fontSize: 24, fontWeight: "800" },
  change: { color: "#8D9AAA", fontSize: 11, marginTop: 10 },
  results: { gap: 8, paddingTop: 12, paddingBottom: 2 },
  chip: { minWidth: 72, minHeight: 48, padding: 9, borderWidth: 1, borderColor: "#293646", borderRadius: 10 },
  chipActive: { borderColor: "#B784FF", backgroundColor: "#261B35" },
  chipScore: { color: "#E6DBF3", fontSize: 12, fontWeight: "700" },
  empty: { color: "#8D9AAA", fontSize: 12, lineHeight: 18, padding: 8 },
});

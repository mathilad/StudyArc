import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useStudent } from "../context/StudentContext";
import {
  SUBJECTS,
  expandSubjectChoices,
  topicDisplayName,
  type SubjectName,
} from "../data/subjects";

export default function Revision() {
  const router = useRouter();
  const { profile, topicProgress, subtopicCoverage } = useStudent();

  const subjects = useMemo(
    () => expandSubjectChoices(profile.subjectChoices),
    [profile.subjectChoices],
  );

  const [subject, setSubject] = useState<SubjectName>(subjects[0] ?? "Physics");

  const coveredSet = useMemo(
    () =>
      new Set(
        subtopicCoverage
          .filter((row) => row.covered)
          .map((row) => `${row.subjectName}::${row.topicName}`),
      ),
    [subtopicCoverage],
  );

  const availableTopics = useMemo(
    () =>
      SUBJECTS[subject].topics.filter((topic) =>
        coveredSet.has(`${subject}::${topic.title}`),
      ),
    [coveredSet, subject],
  );

  const [topic, setTopic] = useState("");

  useEffect(() => {
    if (!subjects.includes(subject)) {
      setSubject(subjects[0] ?? "Physics");
      return;
    }

    if (!topic || !availableTopics.some((item) => item.title === topic)) {
      setTopic(availableTopics[0]?.title ?? "");
    }
  }, [availableTopics, subject, subjects, topic]);

  const chooseSubject = (nextSubject: SubjectName) => {
    setSubject(nextSubject);
    const first = SUBJECTS[nextSubject].topics.find((item) =>
      coveredSet.has(`${nextSubject}::${item.title}`),
    );
    setTopic(first?.title ?? "");
  };

  const dueTopics = useMemo(
    () =>
      [...availableTopics].sort((a, b) => {
        const aProgress = topicProgress.find(
          (row) => row.subjectName === subject && row.topicName === a.title,
        );
        const bProgress = topicProgress.find(
          (row) => row.subjectName === subject && row.topicName === b.title,
        );
        return (aProgress?.memory ?? 0) - (bProgress?.memory ?? 0);
      }),
    [availableTopics, subject, topicProgress],
  );

  return (
    <View style={s.root}>
      <LinearGradient
        colors={["#1A1124", "#080D14"]}
        style={StyleSheet.absoluteFill}
      />

      <View style={s.head}>
        <Pressable style={s.back} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#FFF" />
        </Pressable>
        <View>
          <Text style={s.title}>Revision session</Text>
          <Text style={s.sub}>Choose a covered lesson to revise</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.label}>SUBJECT</Text>
        <View style={s.wrap}>
          {subjects.map((item) => (
            <Pressable
              key={item}
              onPress={() => chooseSubject(item)}
              style={[s.chip, subject === item && s.chipOn]}
            >
              <Text style={[s.chipText, subject === item && s.chipTextOn]}>
                {item}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={s.label}>TOPIC</Text>
        {dueTopics.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="checkmark-done-outline" size={30} color="#657386" />
            <Text style={s.emptyTitle}>No covered lessons yet</Text>
            <Text style={s.emptyText}>
              Open this subject and mark a lesson or sublesson as covered before
              starting revision.
            </Text>
          </View>
        ) : (
          dueTopics.map((item) => {
            const progress = topicProgress.find(
              (row) => row.subjectName === subject && row.topicName === item.title,
            );
            const selected = topic === item.title;

            return (
              <Pressable
                key={item.id}
                onPress={() => setTopic(item.title)}
                style={[s.topic, selected && s.topicOn]}
              >
                <View
                  style={[
                    s.dot,
                    {
                      backgroundColor:
                        SUBJECTS[subject].color + (selected ? "55" : "1A"),
                    },
                  ]}
                >
                  <Ionicons
                    name={selected ? "checkmark" : "refresh"}
                    size={17}
                    color={SUBJECTS[subject].color}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text
                    style={[s.topicTitle, selected && { color: "#F1E8FC" }]}
                  >
                    {topicDisplayName(subject, item.title, profile.medium)}
                  </Text>
                  <Text style={s.topicSub}>
                    Memory {progress?.memory ?? 0}%
                    {progress?.nextRecallAt &&
                    new Date(progress.nextRecallAt) <= new Date()
                      ? " · Review due"
                      : ""}
                  </Text>
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      <View style={s.bottom}>
        <Pressable
          disabled={!topic}
          style={[s.start, !topic && { opacity: 0.4 }]}
          onPress={() =>
            topic &&
            router.push({
              pathname: "/stopwatch",
              params: {
                subjectName: subject,
                topicName: topic,
                studyType: "Revision",
              },
            })
          }
        >
          <Ionicons name="play" size={17} color="#160C20" />
          <Text style={s.startText}>Start revision</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#080D14" },
  head: {
    padding: 18,
    paddingTop: 22,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  back: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: "#151C27",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { color: "#F5F6F8", fontSize: 22, fontWeight: "900" },
  sub: { color: "#748194", fontSize: 10, marginTop: 3 },
  content: {
    padding: 20,
    paddingBottom: 105,
    maxWidth: 760,
    width: "100%",
    alignSelf: "center",
  },
  label: {
    color: "#788596",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.2,
    marginTop: 16,
    marginBottom: 9,
  },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    minHeight: 40,
    paddingHorizontal: 13,
    borderRadius: 13,
    backgroundColor: "#111923",
    borderWidth: 1,
    borderColor: "#283546",
    alignItems: "center",
    justifyContent: "center",
  },
  chipOn: { backgroundColor: "#392557", borderColor: "#805EBC" },
  chipText: { color: "#8290A2", fontSize: 11, fontWeight: "800" },
  chipTextOn: { color: "#F1E9FC" },
  topic: {
    minHeight: 67,
    borderRadius: 17,
    backgroundColor: "#101720",
    borderWidth: 1,
    borderColor: "#273342",
    padding: 12,
    flexDirection: "row",
    gap: 11,
    alignItems: "center",
    marginBottom: 8,
  },
  topicOn: { backgroundColor: "#1C1627", borderColor: "#5C4576" },
  dot: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  topicTitle: { color: "#DCE1E8", fontSize: 13, fontWeight: "900" },
  topicSub: { color: "#6F7C8D", fontSize: 9.5, marginTop: 4 },
  empty: {
    padding: 28,
    borderRadius: 18,
    backgroundColor: "#101720",
    borderWidth: 1,
    borderColor: "#263241",
    alignItems: "center",
  },
  emptyTitle: {
    color: "#E6EBF1",
    fontSize: 15,
    fontWeight: "900",
    marginTop: 9,
  },
  emptyText: {
    color: "#758294",
    fontSize: 10,
    lineHeight: 16,
    textAlign: "center",
    marginTop: 5,
    maxWidth: 420,
  },
  bottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: "#0B1119EE",
    borderTopWidth: 1,
    borderTopColor: "#263241",
  },
  start: {
    height: 53,
    borderRadius: 17,
    backgroundColor: "#B784FF",
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    maxWidth: 760,
    width: "100%",
    alignSelf: "center",
  },
  startText: { color: "#160C20", fontSize: 13, fontWeight: "900" },
});

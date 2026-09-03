import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";

export default function StudyArcLoader({ compact = false }: { compact?: boolean }) {
  const fade = useRef(new Animated.Value(0)).current;
  const lift = useRef(new Animated.Value(12)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const dot1 = useRef(new Animated.Value(0.25)).current;
  const dot2 = useRef(new Animated.Value(0.25)).current;
  const dot3 = useRef(new Animated.Value(0.25)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(lift, {
        toValue: 0,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    const textPulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    const dots = Animated.loop(
      Animated.stagger(160, [
        Animated.sequence([
          Animated.timing(dot1, { toValue: 1, duration: 260, useNativeDriver: true }),
          Animated.timing(dot1, { toValue: 0.25, duration: 320, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(dot2, { toValue: 1, duration: 260, useNativeDriver: true }),
          Animated.timing(dot2, { toValue: 0.25, duration: 320, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(dot3, { toValue: 1, duration: 260, useNativeDriver: true }),
          Animated.timing(dot3, { toValue: 0.25, duration: 320, useNativeDriver: true }),
        ]),
      ]),
    );

    textPulse.start();
    dots.start();

    return () => {
      textPulse.stop();
      dots.stop();
    };
  }, [dot1, dot2, dot3, fade, lift, pulse]);

  const scale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.018],
  });

  const lineScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.55, 1],
  });

  return (
    <View style={[styles.root, compact && styles.compact]}>
      <LinearGradient
        colors={["#0E0A16", "#080D14", "#060A10"]}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fade,
            transform: [{ translateY: lift }, { scale }],
          },
        ]}
      >
        <View style={styles.wordmarkRow}>
          <Text style={[styles.wordmark, compact && styles.wordmarkCompact]}>Study</Text>
          <Text style={[styles.wordmarkAccent, compact && styles.wordmarkCompact]}> Arc</Text>
        </View>

        <Animated.View
          style={[
            styles.accentLine,
            compact && styles.accentLineCompact,
            { transform: [{ scaleX: lineScale }] },
          ]}
        />

        {!compact && (
          <Text style={styles.subtitle}>BUILDING YOUR NEXT STUDY SESSION</Text>
        )}

        <View style={styles.dots}>
          <Animated.View style={[styles.dot, { opacity: dot1 }]} />
          <Animated.View style={[styles.dot, { opacity: dot2 }]} />
          <Animated.View style={[styles.dot, { opacity: dot3 }]} />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 260,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#080D14",
  },
  compact: {
    minHeight: 180,
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  wordmarkRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
  },
  wordmark: {
    color: "#F7F4FB",
    fontSize: 36,
    lineHeight: 42,
    fontWeight: "900",
    letterSpacing: -1.3,
  },
  wordmarkAccent: {
    color: "#B784FF",
    fontSize: 36,
    lineHeight: 42,
    fontWeight: "900",
    letterSpacing: -1.3,
  },
  wordmarkCompact: {
    fontSize: 29,
    lineHeight: 35,
  },
  accentLine: {
    width: 92,
    height: 3,
    borderRadius: 3,
    backgroundColor: "#A86CFF",
    marginTop: 10,
  },
  accentLineCompact: {
    width: 70,
    marginTop: 8,
  },
  subtitle: {
    color: "#746A82",
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.6,
    marginTop: 18,
    textAlign: "center",
  },
  dots: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 12,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#C49AF7",
  },
});

import React from "react";
import {
  Pressable,
  type PressableProps,
  type PressableStateCallbackType,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { usePerformance } from "../context/PerformanceContext";

/**
 * Shared pressable that preserves the exact layout semantics of React Native's
 * Pressable. Avoid wrapping Pressable with Animated.createAnimatedComponent:
 * several StudyArc hub cards use percentage widths, flex rows and style
 * callbacks, and the animated wrapper can distort those layouts on web/native.
 */
export default function MotionPressable({ style, ...props }: PressableProps) {
  const { performanceMode } = usePerformance();

  const resolveStyle = (state: PressableStateCallbackType): StyleProp<ViewStyle> => {
    const resolved = typeof style === "function" ? style(state) : style;

    if (performanceMode || !state.pressed) {
      return resolved as StyleProp<ViewStyle>;
    }

    return [
      resolved as StyleProp<ViewStyle>,
      {
        opacity: 0.96,
        transform: [{ scale: 0.99 }],
      },
    ];
  };

  return <Pressable {...props} style={resolveStyle} />;
}

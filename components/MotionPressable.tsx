import React, { useRef } from "react";
import {
  Animated,
  Pressable,
  type GestureResponderEvent,
  type PressableProps,
  type PressableStateCallbackType,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { usePerformance } from "../context/PerformanceContext";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable) as React.ComponentType<
  PressableProps & { style?: any }
>;

export default function MotionPressable({
  style,
  onPressIn,
  onPressOut,
  disabled,
  ...props
}: PressableProps) {
  const { performanceMode } = usePerformance();
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = (value: number) => {
    if (performanceMode || disabled) return;
    Animated.spring(scale, {
      toValue: value,
      useNativeDriver: true,
      speed: value < 1 ? 30 : 22,
      bounciness: value < 1 ? 0 : 5,
    }).start();
  };

  const handlePressIn = (event: GestureResponderEvent) => {
    animateTo(0.975);
    onPressIn?.(event);
  };

  const handlePressOut = (event: GestureResponderEvent) => {
    animateTo(1);
    onPressOut?.(event);
  };

  const resolveStyle = (state: PressableStateCallbackType): StyleProp<ViewStyle> => {
    const resolved = typeof style === "function" ? style(state) : style;
    return [resolved as StyleProp<ViewStyle>, !performanceMode && { transform: [{ scale }] }];
  };

  return (
    <AnimatedPressable
      {...props}
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={resolveStyle}
    />
  );
}

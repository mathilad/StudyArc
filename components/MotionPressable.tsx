import React, { useEffect, useRef } from "react";
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
  const opacity = useRef(new Animated.Value(1)).current;
  const lift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!performanceMode) return;
    scale.stopAnimation();
    opacity.stopAnimation();
    lift.stopAnimation();
    scale.setValue(1);
    opacity.setValue(1);
    lift.setValue(0);
  }, [lift, opacity, performanceMode, scale]);

  const animatePressed = (pressed: boolean) => {
    if (performanceMode || disabled) return;
    Animated.parallel([
      Animated.spring(scale, {
        toValue: pressed ? 0.965 : 1,
        useNativeDriver: true,
        speed: pressed ? 34 : 24,
        bounciness: pressed ? 0 : 6,
      }),
      Animated.timing(opacity, {
        toValue: pressed ? 0.9 : 1,
        duration: pressed ? 85 : 150,
        useNativeDriver: true,
      }),
      Animated.spring(lift, {
        toValue: pressed ? 1.5 : 0,
        useNativeDriver: true,
        speed: 28,
        bounciness: 2,
      }),
    ]).start();
  };

  const handlePressIn = (event: GestureResponderEvent) => {
    animatePressed(true);
    onPressIn?.(event);
  };

  const handlePressOut = (event: GestureResponderEvent) => {
    animatePressed(false);
    onPressOut?.(event);
  };

  const resolveStyle = (state: PressableStateCallbackType): StyleProp<ViewStyle> => {
    const resolved = typeof style === "function" ? style(state) : style;
    return [
      resolved as StyleProp<ViewStyle>,
      !performanceMode && {
        opacity,
        transform: [{ translateY: lift }, { scale }],
      },
    ];
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

import React,{useEffect,useRef}from"react";
import{Animated,SafeAreaView,StyleSheet,type StyleProp,type ViewStyle}from"react-native";
import{usePerformance}from"../context/PerformanceContext";

export default function Screen({children,style}:{children:React.ReactNode;style?:StyleProp<ViewStyle>}){
 const{performanceMode}=usePerformance();
 const opacity=useRef(new Animated.Value(performanceMode?1:0)).current;
 const translate=useRef(new Animated.Value(performanceMode?0:10)).current;
 const scale=useRef(new Animated.Value(performanceMode?1:.992)).current;
 useEffect(()=>{
  opacity.stopAnimation();translate.stopAnimation();scale.stopAnimation();
  if(performanceMode){opacity.setValue(1);translate.setValue(0);scale.setValue(1);return}
  opacity.setValue(0);translate.setValue(10);scale.setValue(.992);
  Animated.parallel([
   Animated.timing(opacity,{toValue:1,duration:260,useNativeDriver:true}),
   Animated.spring(translate,{toValue:0,useNativeDriver:true,speed:17,bounciness:4}),
   Animated.spring(scale,{toValue:1,useNativeDriver:true,speed:16,bounciness:3}),
  ]).start();
 },[opacity,performanceMode,scale,translate]);
 return <SafeAreaView style={[styles.screen,style]}><Animated.View style={[styles.fill,{opacity,transform:[{translateY:translate},{scale}]}]}>{children}</Animated.View></SafeAreaView>;
}
const styles=StyleSheet.create({screen:{flex:1,backgroundColor:"#080C13"},fill:{flex:1}});

import React,{useEffect,useRef}from"react";
import{Animated,SafeAreaView,StyleSheet,type StyleProp,type ViewStyle}from"react-native";
import{usePerformance}from"../context/PerformanceContext";

export default function Screen({children,style}:{children:React.ReactNode;style?:StyleProp<ViewStyle>}){
 const{performanceMode}=usePerformance();
 const opacity=useRef(new Animated.Value(performanceMode?1:0)).current;
 const translate=useRef(new Animated.Value(performanceMode?0:8)).current;
 useEffect(()=>{
  if(performanceMode){opacity.setValue(1);translate.setValue(0);return}
  opacity.setValue(0);translate.setValue(8);
  Animated.parallel([
   Animated.timing(opacity,{toValue:1,duration:220,useNativeDriver:true}),
   Animated.spring(translate,{toValue:0,useNativeDriver:true,speed:18,bounciness:3}),
  ]).start();
 },[opacity,performanceMode,translate]);
 return <SafeAreaView style={[styles.screen,style]}><Animated.View style={[styles.fill,{opacity,transform:[{translateY:translate}]}]}>{children}</Animated.View></SafeAreaView>;
}
const styles=StyleSheet.create({screen:{flex:1,backgroundColor:"#080C13"},fill:{flex:1}});

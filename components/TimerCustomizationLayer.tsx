import React,{useEffect,useRef} from "react";
import { Animated,StyleSheet,View } from "react-native";
import type { RewardItem } from "../lib/rewardsCatalog";

export default function TimerCustomizationLayer({focusEffect,timerAnimation,running}:{focusEffect?:RewardItem;timerAnimation?:RewardItem;running:boolean}){
 const pulse=useRef(new Animated.Value(0)).current;
 useEffect(()=>{if(!running){pulse.stopAnimation();pulse.setValue(0);return}const loop=Animated.loop(Animated.sequence([Animated.timing(pulse,{toValue:1,duration:1500,useNativeDriver:true}),Animated.timing(pulse,{toValue:0,duration:1500,useNativeDriver:true})]));loop.start();return()=>loop.stop()},[pulse,running]);
 if(!running||(!focusEffect&&!timerAnimation))return null;
 const scale=pulse.interpolate({inputRange:[0,1],outputRange:[.82,1.18]}),opacity=pulse.interpolate({inputRange:[0,1],outputRange:[.18,.48]}),spin=pulse.interpolate({inputRange:[0,1],outputRange:["0deg","160deg"]});
 return <View pointerEvents="none" style={StyleSheet.absoluteFill}>
   {focusEffect?<><Animated.View style={[s.aura,{borderColor:focusEffect.colors[1],opacity,transform:[{scale}]}]}/>{focusEffect.previewVariant%3===1?<Animated.View style={[s.core,{backgroundColor:focusEffect.colors[0],opacity}]}/>:null}</>:null}
   {timerAnimation?<Animated.View style={[s.ring,{borderColor:timerAnimation.colors[1],borderTopColor:"#FFFFFFDD",transform:[{rotate:spin},{scale:timerAnimation.previewVariant%2?scale:1}]}]}/>:null}
   {timerAnimation&&timerAnimation.previewVariant%3===2?<View style={s.bars}>{[0,1,2,3,4,5].map(i=><Animated.View key={i} style={[s.bar,{backgroundColor:i%2?timerAnimation.colors[1]:"#FFFFFFAA",opacity,transform:[{scaleY:scale}]}]}/>)}</View>:null}
  </View>
}
const s=StyleSheet.create({aura:{position:"absolute",alignSelf:"center",top:"50%",marginTop:-95,width:190,height:190,borderRadius:110,borderWidth:3},core:{position:"absolute",alignSelf:"center",top:"50%",marginTop:-42,width:84,height:84,borderRadius:50},ring:{position:"absolute",alignSelf:"center",top:"50%",marginTop:-78,width:156,height:156,borderRadius:90,borderWidth:2,borderStyle:"dashed",opacity:.72},bars:{position:"absolute",alignSelf:"center",bottom:18,height:30,flexDirection:"row",alignItems:"center",gap:4},bar:{width:4,height:18,borderRadius:4}});

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React,{useEffect,useRef} from "react";
import { Animated,Modal,Pressable,StyleSheet,Text,View } from "react-native";
import { useRewards } from "../context/RewardsContext";

export default function RewardToast(){
 const{lastReward,clearLastReward,equippedItem}=useRewards();
 const milestoneFx=equippedItem("milestone-effects");
 const y=useRef(new Animated.Value(-80)).current,opacity=useRef(new Animated.Value(0)).current;
 useEffect(()=>{if(!lastReward)return;y.setValue(-80);opacity.setValue(0);Animated.parallel([Animated.spring(y,{toValue:0,useNativeDriver:true,speed:18,bounciness:4}),Animated.timing(opacity,{toValue:1,duration:180,useNativeDriver:true})]).start();const id=setTimeout(()=>clearLastReward(),lastReward.levelUp?3000:2200);return()=>clearTimeout(id)},[clearLastReward,lastReward,opacity,y]);
 if(!lastReward)return null;
 const t=lastReward.transaction;
 if(lastReward.levelUp)return <Modal transparent animationType="fade" visible onRequestClose={clearLastReward}><Pressable style={s.levelBack} onPress={clearLastReward}><LinearGradient colors={milestoneFx?[milestoneFx.colors[0],milestoneFx.colors[2],"#080D14"]:["#30164D","#161124","#080D14"]} style={s.levelCard}><View style={[s.levelRing,milestoneFx&&{borderColor:milestoneFx.colors[1]}]}><Ionicons name={(milestoneFx?.previewVariant??0)%2?"trophy":"sparkles"} size={38} color={milestoneFx?.colors[1]??"#F5D77B"}/></View><Text style={s.levelKicker}>{milestoneFx?milestoneFx.name.toUpperCase():"LEVEL UP"}</Text><Text style={s.levelValue}>Level {lastReward.levelAfter}</Text><Text style={s.levelSub}>Your StudyArc level increased.</Text><View style={s.rewardLine}><Text style={s.coin}>+{t.coins} AC</Text><Text style={s.dot}>•</Text><Text style={s.xp}>+{t.xp} XP</Text></View><Text style={s.tap}>Tap anywhere to continue</Text></LinearGradient></Pressable></Modal>;
 return <View pointerEvents="box-none" style={s.toastHost}><Animated.View style={[s.toast,{opacity,transform:[{translateY:y}]}]}><View style={s.coinIcon}><Ionicons name="diamond" size={16} color="#170D20"/></View><View style={{flex:1}}><Text style={s.toastTitle}>{t.label}</Text><Text style={s.toastSub}>{t.coins>0?`+${t.coins} Arc Coins`:""}{t.coins>0&&t.xp>0?"  ·  ":""}{t.xp>0?`+${t.xp} XP`:""}</Text></View><Pressable onPress={clearLastReward} hitSlop={8}><Ionicons name="close" size={17} color="#837493"/></Pressable></Animated.View></View>
}
const s=StyleSheet.create({
 toastHost:{position:"absolute",left:0,right:0,top:18,zIndex:999,alignItems:"center",paddingHorizontal:16},
 toast:{width:"100%",maxWidth:460,minHeight:62,borderRadius:18,backgroundColor:"#171220F5",borderWidth:1,borderColor:"#5D4275",padding:11,flexDirection:"row",alignItems:"center",gap:10,shadowColor:"#000",shadowOpacity:.32,shadowRadius:12,elevation:14},
 coinIcon:{width:38,height:38,borderRadius:14,backgroundColor:"#E0B6FF",alignItems:"center",justifyContent:"center"},toastTitle:{color:"#F7F2FA",fontSize:11,fontWeight:"900"},toastSub:{color:"#BE9EE0",fontSize:9,fontWeight:"800",marginTop:3},
 levelBack:{flex:1,backgroundColor:"#030407E8",alignItems:"center",justifyContent:"center",padding:22},levelCard:{width:"100%",maxWidth:430,minHeight:360,borderRadius:34,borderWidth:1,borderColor:"#76559A",alignItems:"center",justifyContent:"center",padding:28,overflow:"hidden"},levelRing:{width:92,height:92,borderRadius:50,borderWidth:2,borderColor:"#E1BFFF",backgroundColor:"#B784FF18",alignItems:"center",justifyContent:"center"},levelKicker:{color:"#B99CD9",fontSize:10,fontWeight:"900",letterSpacing:2.3,marginTop:20},levelValue:{color:"#FFF",fontSize:38,fontWeight:"900",marginTop:5},levelSub:{color:"#8D7E9C",fontSize:11,marginTop:6},rewardLine:{flexDirection:"row",alignItems:"center",gap:8,marginTop:24},coin:{color:"#F5D77B",fontSize:15,fontWeight:"900"},xp:{color:"#D9B9FF",fontSize:15,fontWeight:"900"},dot:{color:"#6E607B"},tap:{color:"#665B70",fontSize:9,marginTop:30},
});

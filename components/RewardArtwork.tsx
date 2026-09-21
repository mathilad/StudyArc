import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React,{useEffect,useMemo,useRef,useState} from "react";
import { Animated,Easing,StyleSheet,Text,View } from "react-native";
import type { RewardItem } from "../lib/rewardsCatalog";

type Props={item:RewardItem;large?:boolean;playing?:boolean};

const two=(n:number)=>String(n).padStart(2,"0");
const clockText=()=>{const d=new Date();return `${two(d.getHours())}:${two(d.getMinutes())}:${two(d.getSeconds())}`};

export default function RewardArtwork({item,large=false,playing=true}:Props){
 const h=large?238:138;
 const[a,b,c]=item.colors;
 const pulse=useRef(new Animated.Value(0)).current;
 const spin=useRef(new Animated.Value(0)).current;
 const shift=useRef(new Animated.Value(0)).current;
 const burst=useRef(new Animated.Value(0)).current;
 const[time,setTime]=useState(clockText());
 const[stopwatch,setStopwatch]=useState(0);

 useEffect(()=>{
   if(!playing){pulse.stopAnimation();spin.stopAnimation();shift.stopAnimation();burst.stopAnimation();return}
   const p=Animated.loop(Animated.sequence([
     Animated.timing(pulse,{toValue:1,duration:1100+item.previewVariant*90,easing:Easing.inOut(Easing.quad),useNativeDriver:true}),
     Animated.timing(pulse,{toValue:0,duration:1100+item.previewVariant*90,easing:Easing.inOut(Easing.quad),useNativeDriver:true}),
   ]));
   const r=Animated.loop(Animated.timing(spin,{toValue:1,duration:2600+item.previewVariant*220,easing:Easing.linear,useNativeDriver:true}));
   const m=Animated.loop(Animated.sequence([
     Animated.timing(shift,{toValue:1,duration:1350,easing:Easing.inOut(Easing.cubic),useNativeDriver:true}),
     Animated.timing(shift,{toValue:0,duration:1350,easing:Easing.inOut(Easing.cubic),useNativeDriver:true}),
   ]));
   const x=Animated.loop(Animated.sequence([
     Animated.timing(burst,{toValue:1,duration:720,easing:Easing.out(Easing.cubic),useNativeDriver:true}),
     Animated.delay(420),
     Animated.timing(burst,{toValue:0,duration:0,useNativeDriver:true}),
     Animated.delay(260),
   ]));
   p.start();r.start();m.start();x.start();
   return()=>{p.stop();r.stop();m.stop();x.stop()};
 },[burst,item.id,item.previewVariant,playing,pulse,shift,spin]);

 useEffect(()=>{
   if(!playing)return;
   const tick=()=>setTime(clockText());
   tick();
   const id=setInterval(tick,1000);
   return()=>clearInterval(id);
 },[playing]);

 useEffect(()=>{
   if(!playing)return;
   const id=setInterval(()=>setStopwatch(v=>(v+1)%3600),1000);
   return()=>clearInterval(id);
 },[playing]);

 const rotation=spin.interpolate({inputRange:[0,1],outputRange:["0deg","360deg"]});
 const reverseRotation=spin.interpolate({inputRange:[0,1],outputRange:["360deg","0deg"]});
 const scale=pulse.interpolate({inputRange:[0,1],outputRange:[.92,1.08]});
 const softScale=pulse.interpolate({inputRange:[0,1],outputRange:[.98,1.035]});
 const opacity=pulse.interpolate({inputRange:[0,1],outputRange:[.30,.92]});
 const softOpacity=pulse.interpolate({inputRange:[0,1],outputRange:[.48,.88]});
 const translateX=shift.interpolate({inputRange:[0,1],outputRange:[-12,12]});
 const translateY=shift.interpolate({inputRange:[0,1],outputRange:[-5,7]});
 const burstScale=burst.interpolate({inputRange:[0,.2,1],outputRange:[.35,1,1.55]});
 const burstOpacity=burst.interpolate({inputRange:[0,.12,.7,1],outputRange:[0,1,.75,0]});
 const progress=useMemo(()=>68+(item.previewVariant%4)*6,[item.previewVariant]);
 const sw=`${two(Math.floor(stopwatch/60))}:${two(stopwatch%60)}`;
 const bars=[28,44,20,54,34,46,24,40];

 return <LinearGradient colors={[c,a,b]} start={{x:0,y:1}} end={{x:1,y:0}} style={[s.frame,{height:h}]}>
   <Animated.View style={[s.glowOne,{opacity:softOpacity,transform:[{scale}]}]}/>
   <Animated.View style={[s.glowTwo,{transform:[{translateX}]}]}/>

   {item.category==="clock-faces"?<View style={s.center}>
     <Animated.View style={[s.clockOrbit,{borderColor:b,transform:[{rotate:rotation},{scale:softScale}]}]}/>
     <Animated.View style={[s.clockShell,item.previewVariant%2===0?s.rounded:s.square,{transform:[{scale:softScale}]}]}>
       <Text style={[s.clockDigits,large&&{fontSize:36},item.previewVariant%3===1&&{letterSpacing:0},item.previewVariant%3===2&&{fontWeight:"700"}]}>{time}</Text>
       <Animated.View style={[s.tickRow,{opacity:softOpacity}]}>{[0,1,2,3,4].map(i=><View key={i} style={[s.tick,{opacity:.35+i*.12,backgroundColor:i===item.previewVariant%5?b:"#FFF"}]}/>)}</Animated.View>
     </Animated.View>
   </View>:null}

   {item.category==="stopwatch-layouts"?<View style={[s.previewPad,item.previewVariant%2?{flexDirection:"row"}:null]}>
     <Animated.View style={[s.timerOrb,{borderColor:b,transform:[{rotate:item.previewVariant%3===0?rotation:"0deg"},{scale:softScale}]}]}><Animated.View style={[s.orbSweep,{backgroundColor:b,transform:[{rotate:reverseRotation}]}]}/><Text style={s.timerOrbText}>{sw}</Text></Animated.View>
     <Animated.View style={[s.layoutStack,{transform:[{translateY}]}]}><View style={s.longLine}/><Animated.View style={[s.mediumLine,{width:shift.interpolate({inputRange:[0,1],outputRange:["48%","86%"]}) as any}]}/><View style={s.buttonRow}><Animated.View style={[s.miniButton,{opacity:softOpacity}]}/><Animated.View style={[s.miniButton,{transform:[{scale:softScale}]}]}/></View></Animated.View>
   </View>:null}

   {item.category==="themes"?<Animated.View style={[s.appMock,{transform:[{translateY:translateY},{scale:softScale}]}]}>
     <View style={s.mockTop}><Animated.View style={[s.mockLogo,{backgroundColor:b,transform:[{rotate:rotation}]}]}/><View style={s.mockTitle}/><Animated.View style={[s.mockBell,{borderColor:b,transform:[{scale}]}]}/></View>
     <LinearGradient colors={[a+"55",b+"35"]} style={s.mockHero}><Animated.Text style={[s.mockHeroText,{opacity:softOpacity}]}>{item.name}</Animated.Text><Animated.View style={[s.themeSweep,{backgroundColor:"#FFFFFF18",transform:[{translateX}]}]}/></LinearGradient>
     <View style={s.mockCards}>{[0,1,2].map(i=><Animated.View key={i} style={[s.mockCard,{opacity:i===item.previewVariant%3?opacity:softOpacity,transform:[{translateY:i===item.previewVariant%3?translateY:0}]}]}/>)}</View>
   </Animated.View>:null}

   {item.category==="page-themes"?<Animated.View style={[s.pageMock,{transform:[{scale:softScale}]}]}>
     <Animated.View style={[s.pageRail,{backgroundColor:b,opacity:softOpacity}]}/><View style={s.pageContent}><Animated.View style={[s.pageTitle,{width:shift.interpolate({inputRange:[0,1],outputRange:["46%","68%"]}) as any}]}/><Animated.View style={[s.pageHero,{transform:[{translateX:shift.interpolate({inputRange:[0,1],outputRange:[-3,3]})}]}]}><Animated.View style={[s.pageHeroGlow,{backgroundColor:b,opacity:softOpacity,transform:[{translateX}]}]}/></Animated.View><View style={s.pageRows}>{[0,1,2].map(i=><Animated.View key={i} style={[s.pageRow,{opacity:i===item.previewVariant%3?opacity:softOpacity,transform:[{translateX:i===item.previewVariant%3?translateX:0}]}]}/>)}</View></View>
   </Animated.View>:null}

   {item.category==="completion-effects"?<View style={s.center}>
     <Animated.View style={{transform:[{scale:burstScale}],opacity:burstOpacity}}><Ionicons name={item.previewVariant%2?"sparkles":"checkmark-circle"} size={large?72:52} color="#FFF"/></Animated.View>
     {[0,1,2,3,4,5,6,7].map(i=><Animated.View key={i} style={[s.spark,{backgroundColor:i%2?b:"#FFF",opacity:burstOpacity,transform:[{rotate:`${i*45}deg`},{translateY:burst.interpolate({inputRange:[0,1],outputRange:[large?-24:-18,large?-91:-66]})},{scale:burstScale}]}]}/>)}
     <Animated.View style={[s.effectRing,{borderColor:b,opacity:burstOpacity,transform:[{scale:burstScale}]}]}/>
   </View>:null}

   {item.category==="focus-effects"?<View style={s.center}>
     <Animated.View style={[s.focusOuter,{borderColor:b,opacity,transform:[{scale}]}]}><Animated.View style={[s.focusMid,{borderColor:"#FFFFFF88",transform:[{scale:softScale}]}]}><Animated.View style={[s.focusCore,{backgroundColor:b,opacity:softOpacity,transform:[{scale}]}]}/></Animated.View></Animated.View>
     <Animated.Text style={[s.focusText,{opacity:softOpacity,transform:[{translateY}]}]}>FOCUS</Animated.Text>
   </View>:null}

   {item.category==="timer-animations"?<View style={s.center}>
     <Animated.View style={[s.arc,{borderColor:"#FFFFFF44",borderTopColor:"#FFF",borderRightColor:b,transform:[{rotate:rotation},{scale:softScale}]}]}><Animated.Text style={[s.arcText,{opacity:softOpacity}]}>{progress}%</Animated.Text></Animated.View>
     {item.previewVariant%3===2?<Animated.View style={[s.timerWave,{borderColor:b,opacity,transform:[{scaleX:scale},{translateY}]}]}/>:null}
   </View>:null}

   {item.category==="focus-sounds"?<View style={s.soundWrap}>
     <Animated.View style={{transform:[{scale:softScale}]}}><Ionicons name="headset" size={large?42:34} color="#FFF"/></Animated.View>
     <View style={s.wave}>{bars.map((height,i)=>{const wobble=pulse.interpolate({inputRange:[0,1],outputRange:[Math.max(10,height*.45),large?height*1.45:height]});return <Animated.View key={i} style={[s.waveBar,{height:wobble,backgroundColor:i%2?b:"#FFFFFFCC",opacity:i%3===item.previewVariant%3?opacity:softOpacity}]}/>})}</View>
     <Animated.Text style={[s.soundText,{opacity:softOpacity}]}>{item.name}</Animated.Text>
   </View>:null}

   {item.category==="loading-screens"?<View style={s.center}>
     <Animated.Text style={[s.studyArc,large&&{fontSize:30},{transform:[{scale:softScale}],opacity:softOpacity}]}>Study<Text style={{color:b}}>Arc</Text></Animated.Text>
     <View style={s.loaderDots}>{[0,1,2].map(i=><Animated.View key={i} style={[s.loaderDot,{backgroundColor:i===item.previewVariant%3?b:"#FFF",opacity:i===0?pulse:i===1?softOpacity:opacity,transform:[{scale:i===0?scale:i===1?softScale:scale}]}]}/>)}</View>
     {item.previewVariant%2?<Animated.View style={[s.loaderOrbit,{borderColor:b,transform:[{rotate:rotation}]}]}/>:null}
   </View>:null}

   {item.category==="milestone-effects"?<View style={s.center}>
     <Animated.View style={[s.trophyRing,{borderColor:b,opacity:softOpacity,transform:[{rotate:item.previewVariant%2?rotation:"0deg"},{scale:burstScale}]}]}><Ionicons name={item.previewVariant%2?"trophy":"ribbon"} size={large?62:46} color="#FFF"/></Animated.View>
     {[0,1,2,3].map(i=><Animated.View key={i} style={[s.miniSpark,{backgroundColor:i%2?b:"#FFF",opacity:burstOpacity,transform:[{rotate:`${i*90}deg`},{translateY:burst.interpolate({inputRange:[0,1],outputRange:[-28,large?-78:-58]})}]}]}/>)}
     <Animated.Text style={[s.milestoneText,{opacity,transform:[{translateY}]}]}>LEVEL UP</Animated.Text>
   </View>:null}

   <View style={s.previewBadge}><View style={s.liveDot}/><Text style={s.previewBadgeText}>{playing?"LIVE PREVIEW":"PREVIEW PAUSED"}</Text></View>
   <View style={s.caption}><View><Text numberOfLines={1} style={s.name}>{item.name}</Text><Text style={s.kind}>{item.category.replaceAll("-"," ").toUpperCase()}</Text></View><Animated.View style={{transform:[{scale:softScale}]}}><Ionicons name={item.icon as any} size={18} color="#FFFFFFCC"/></Animated.View></View>
 </LinearGradient>
}

const s=StyleSheet.create({
 frame:{borderRadius:20,overflow:"hidden",position:"relative",borderWidth:1,borderColor:"#FFFFFF18",padding:14},
 glowOne:{position:"absolute",width:150,height:150,borderRadius:90,backgroundColor:"#FFFFFF12",right:-45,top:-55},
 glowTwo:{position:"absolute",width:100,height:100,borderRadius:60,backgroundColor:"#00000020",left:-25,bottom:-40},
 center:{flex:1,alignItems:"center",justifyContent:"center"},rounded:{borderRadius:36},square:{borderRadius:14},
 clockOrbit:{position:"absolute",width:118,height:118,borderRadius:70,borderWidth:1,borderStyle:"dashed",opacity:.5},
 clockShell:{minWidth:"79%",paddingVertical:15,paddingHorizontal:12,backgroundColor:"#06080DBA",borderWidth:1,borderColor:"#FFFFFF30",alignItems:"center"},
 clockDigits:{color:"#FFF",fontSize:26,fontWeight:"900",letterSpacing:1.4,fontVariant:["tabular-nums"]},
 tickRow:{flexDirection:"row",gap:5,marginTop:8},tick:{width:16,height:2,borderRadius:2},
 previewPad:{flex:1,alignItems:"center",justifyContent:"center",gap:10},
 timerOrb:{width:74,height:74,borderRadius:40,borderWidth:5,backgroundColor:"#05070A88",alignItems:"center",justifyContent:"center",overflow:"hidden"},
 orbSweep:{position:"absolute",width:5,height:46,borderRadius:4,top:9},
 timerOrbText:{color:"#FFF",fontSize:13,fontWeight:"900",fontVariant:["tabular-nums"]},
 layoutStack:{width:92,gap:7},longLine:{height:8,borderRadius:5,backgroundColor:"#FFFFFFB8"},mediumLine:{height:7,borderRadius:5,backgroundColor:"#FFFFFF65"},
 buttonRow:{flexDirection:"row",gap:6},miniButton:{flex:1,height:22,borderRadius:8,backgroundColor:"#FFFFFF30"},
 appMock:{flex:1,borderRadius:14,backgroundColor:"#080B1099",padding:10,gap:8},mockTop:{flexDirection:"row",alignItems:"center",gap:6},
 mockLogo:{width:18,height:18,borderRadius:5},mockTitle:{width:58,height:7,borderRadius:4,backgroundColor:"#FFFFFF9A"},
 mockBell:{marginLeft:"auto",width:16,height:16,borderRadius:8,borderWidth:1},mockHero:{flex:1,borderRadius:12,overflow:"hidden",alignItems:"center",justifyContent:"center"},
 mockHeroText:{color:"#FFF",fontSize:13,fontWeight:"900"},themeSweep:{position:"absolute",width:54,height:"150%",borderRadius:28,opacity:.6},
 mockCards:{flexDirection:"row",gap:6},mockCard:{flex:1,height:27,borderRadius:8,backgroundColor:"#FFFFFF14"},
 pageMock:{flex:1,flexDirection:"row",gap:8,backgroundColor:"#070A0F88",borderRadius:14,padding:9},pageRail:{width:20,borderRadius:8},
 pageContent:{flex:1,gap:8},pageTitle:{height:9,borderRadius:5,backgroundColor:"#FFFFFFC8"},pageHero:{height:36,borderRadius:10,backgroundColor:"#FFFFFF18",overflow:"hidden"},
 pageHeroGlow:{width:70,height:52,borderRadius:28},pageRows:{gap:5},pageRow:{height:10,borderRadius:5,backgroundColor:"#FFFFFF18"},
 spark:{position:"absolute",width:7,height:18,borderRadius:5},effectRing:{position:"absolute",width:102,height:102,borderRadius:60,borderWidth:2},
 focusOuter:{width:88,height:88,borderRadius:50,borderWidth:3,alignItems:"center",justifyContent:"center"},
 focusMid:{width:62,height:62,borderRadius:40,borderWidth:2,alignItems:"center",justifyContent:"center"},focusCore:{width:28,height:28,borderRadius:20},
 focusText:{color:"#FFF",fontSize:8,fontWeight:"900",letterSpacing:2,marginTop:8},
 arc:{width:88,height:88,borderRadius:50,borderWidth:8,alignItems:"center",justifyContent:"center"},arcText:{color:"#FFF",fontSize:18,fontWeight:"900"},
 timerWave:{position:"absolute",width:130,height:45,borderRadius:50,borderWidth:1,borderStyle:"dashed"},
 soundWrap:{flex:1,alignItems:"center",justifyContent:"center"},wave:{height:56,flexDirection:"row",alignItems:"center",gap:4,marginTop:4},
 waveBar:{width:5,borderRadius:4},soundText:{color:"#FFF",fontSize:10,fontWeight:"900"},
 studyArc:{color:"#FFF",fontSize:24,fontWeight:"900",letterSpacing:-1},loaderDots:{flexDirection:"row",gap:7,marginTop:12},
 loaderDot:{width:7,height:7,borderRadius:4},loaderOrbit:{position:"absolute",width:124,height:124,borderRadius:70,borderWidth:1,borderStyle:"dashed",opacity:.55},
 trophyRing:{width:94,height:94,borderRadius:50,borderWidth:3,alignItems:"center",justifyContent:"center",backgroundColor:"#05070A55"},
 miniSpark:{position:"absolute",width:6,height:15,borderRadius:4},milestoneText:{color:"#FFF",fontSize:9,fontWeight:"900",letterSpacing:2,marginTop:7},
 previewBadge:{position:"absolute",right:9,top:9,height:20,paddingHorizontal:7,borderRadius:8,backgroundColor:"#06080AB8",borderWidth:1,borderColor:"#FFFFFF1A",flexDirection:"row",alignItems:"center",gap:4},
 liveDot:{width:5,height:5,borderRadius:4,backgroundColor:"#77E2A7"},previewBadgeText:{color:"#FFFFFFC9",fontSize:5.7,fontWeight:"900",letterSpacing:.6},
 caption:{position:"absolute",left:12,right:12,bottom:10,flexDirection:"row",alignItems:"center",justifyContent:"space-between"},
 name:{color:"#FFF",fontSize:10,fontWeight:"900",maxWidth:180},kind:{color:"#FFFFFF8A",fontSize:6.5,fontWeight:"800",letterSpacing:.7,marginTop:2},
});

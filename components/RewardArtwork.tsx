import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { RewardItem } from "../lib/rewardsCatalog";

export default function RewardArtwork({ item, large = false }: { item: RewardItem; large?: boolean }) {
  const h = large ? 220 : 132;
  const [a,b,c]=item.colors;
  const bars=[28,44,20,54,34,46,24,40].map((base,i)=>Math.max(10,base+((item.previewVariant+i)%3)*6));
  return <LinearGradient colors={[c,a,b]} start={{x:0,y:1}} end={{x:1,y:0}} style={[s.frame,{height:h}]}>
    <View style={s.glowOne}/><View style={s.glowTwo}/>
    {item.category==="clock-faces"?<View style={s.center}>
      <View style={[s.clockShell,item.previewVariant%2===0?s.rounded:s.square]}>
        <Text style={[s.clockDigits,large&&{fontSize:38}]}>{item.previewVariant%3===0?"10:24":"42:18"}</Text>
        <View style={s.tickRow}>{[0,1,2,3,4].map(i=><View key={i} style={[s.tick,{opacity:.35+i*.12}]}/>)}</View>
      </View>
    </View>:null}
    {item.category==="stopwatch-layouts"?<View style={[s.previewPad,item.previewVariant%2?{flexDirection:"row"}:null]}>
      <View style={[s.timerOrb,{borderColor:b}]}><Text style={s.timerOrbText}>42:18</Text></View>
      <View style={s.layoutStack}><View style={s.longLine}/><View style={s.mediumLine}/><View style={s.buttonRow}><View style={s.miniButton}/><View style={s.miniButton}/></View></View>
    </View>:null}
    {item.category==="themes"?<View style={s.appMock}>
      <View style={s.mockTop}><View style={s.mockLogo}/><View style={s.mockTitle}/><View style={s.mockBell}/></View>
      <View style={s.mockHero}><Text style={s.mockHeroText}>{item.name}</Text></View>
      <View style={s.mockCards}><View style={s.mockCard}/><View style={s.mockCard}/><View style={s.mockCard}/></View>
    </View>:null}
    {item.category==="page-themes"?<View style={s.pageMock}>
      <View style={s.pageRail}/><View style={s.pageContent}><View style={s.pageTitle}/><View style={s.pageHero}/><View style={s.pageRows}><View style={s.pageRow}/><View style={s.pageRow}/><View style={s.pageRow}/></View></View>
    </View>:null}
    {item.category==="completion-effects"?<View style={s.center}>
      <Ionicons name={item.previewVariant%2?"sparkles":"checkmark-circle"} size={large?72:52} color="#FFF"/>
      {[0,1,2,3,4,5,6,7].map(i=><View key={i} style={[s.spark,{transform:[{rotate:`${i*45}deg`},{translateY:large?-74:-52}],backgroundColor:i%2?b:"#FFF"}]}/>)}
    </View>:null}
    {item.category==="focus-effects"?<View style={s.center}>
      <View style={[s.focusOuter,{borderColor:b}]}><View style={[s.focusMid,{borderColor:"#FFFFFF88"}]}><View style={[s.focusCore,{backgroundColor:b}]}/></View></View>
      <Text style={s.focusText}>FOCUS</Text>
    </View>:null}
    {item.category==="timer-animations"?<View style={s.center}>
      <View style={[s.arc,{borderColor:"#FFFFFF44",borderTopColor:"#FFF",borderRightColor:b,transform:[{rotate:`${item.previewVariant*24}deg`}]}]}><Text style={s.arcText}>68%</Text></View>
    </View>:null}
    {item.category==="focus-sounds"?<View style={s.soundWrap}>
      <Ionicons name="headset" size={large?42:34} color="#FFF"/>
      <View style={s.wave}>{bars.map((height,i)=><View key={i} style={[s.waveBar,{height:large?height*1.25:height,backgroundColor:i%2?b:"#FFFFFFCC"}]}/>)}</View>
      <Text style={s.soundText}>{item.name}</Text>
    </View>:null}
    {item.category==="loading-screens"?<View style={s.center}>
      <Text style={[s.studyArc,large&&{fontSize:30}]}>Study<Text style={{color:b}}>Arc</Text></Text>
      <View style={s.loaderDots}>{[0,1,2].map(i=><View key={i} style={[s.loaderDot,{opacity:.45+i*.25,transform:[{scale:1+i*.15}]}]}/>)}</View>
    </View>:null}
    {item.category==="milestone-effects"?<View style={s.center}>
      <View style={[s.trophyRing,{borderColor:b}]}><Ionicons name={item.previewVariant%2?"trophy":"ribbon"} size={large?62:46} color="#FFF"/></View>
      <Text style={s.milestoneText}>LEVEL UP</Text>
    </View>:null}
    <View style={s.caption}><View><Text numberOfLines={1} style={s.name}>{item.name}</Text><Text style={s.kind}>{item.category.replaceAll("-"," ").toUpperCase()}</Text></View><Ionicons name={item.icon as any} size={18} color="#FFFFFFCC"/></View>
  </LinearGradient>;
}
const s=StyleSheet.create({
 frame:{borderRadius:20,overflow:"hidden",position:"relative",borderWidth:1,borderColor:"#FFFFFF18",padding:14},
 glowOne:{position:"absolute",width:150,height:150,borderRadius:90,backgroundColor:"#FFFFFF12",right:-45,top:-55},
 glowTwo:{position:"absolute",width:100,height:100,borderRadius:60,backgroundColor:"#00000020",left:-25,bottom:-40},
 center:{flex:1,alignItems:"center",justifyContent:"center"},
 rounded:{borderRadius:36},square:{borderRadius:14},clockShell:{minWidth:"78%",paddingVertical:17,paddingHorizontal:12,backgroundColor:"#06080DBA",borderWidth:1,borderColor:"#FFFFFF30",alignItems:"center"},
 clockDigits:{color:"#FFF",fontSize:30,fontWeight:"900",letterSpacing:1.4,fontVariant:["tabular-nums"]},tickRow:{flexDirection:"row",gap:5,marginTop:8},tick:{width:16,height:2,borderRadius:2,backgroundColor:"#FFF"},
 previewPad:{flex:1,alignItems:"center",justifyContent:"center",gap:10},timerOrb:{width:74,height:74,borderRadius:40,borderWidth:5,backgroundColor:"#05070A88",alignItems:"center",justifyContent:"center"},timerOrbText:{color:"#FFF",fontSize:13,fontWeight:"900"},layoutStack:{width:92,gap:7},longLine:{height:8,borderRadius:5,backgroundColor:"#FFFFFFB8"},mediumLine:{width:"72%",height:7,borderRadius:5,backgroundColor:"#FFFFFF65"},buttonRow:{flexDirection:"row",gap:6},miniButton:{flex:1,height:22,borderRadius:8,backgroundColor:"#FFFFFF30"},
 appMock:{flex:1,borderRadius:14,backgroundColor:"#080B1099",padding:10,gap:8},mockTop:{flexDirection:"row",alignItems:"center",gap:6},mockLogo:{width:18,height:18,borderRadius:5,backgroundColor:"#FFFFFFCC"},mockTitle:{width:58,height:7,borderRadius:4,backgroundColor:"#FFFFFF9A"},mockBell:{marginLeft:"auto",width:16,height:16,borderRadius:8,borderWidth:1,borderColor:"#FFFFFF66"},mockHero:{flex:1,borderRadius:12,backgroundColor:"#FFFFFF16",alignItems:"center",justifyContent:"center"},mockHeroText:{color:"#FFF",fontSize:13,fontWeight:"900"},mockCards:{flexDirection:"row",gap:6},mockCard:{flex:1,height:27,borderRadius:8,backgroundColor:"#FFFFFF14"},
 pageMock:{flex:1,flexDirection:"row",gap:8,backgroundColor:"#070A0F88",borderRadius:14,padding:9},pageRail:{width:20,borderRadius:8,backgroundColor:"#FFFFFF14"},pageContent:{flex:1,gap:8},pageTitle:{width:"56%",height:9,borderRadius:5,backgroundColor:"#FFFFFFC8"},pageHero:{height:36,borderRadius:10,backgroundColor:"#FFFFFF18"},pageRows:{gap:5},pageRow:{height:10,borderRadius:5,backgroundColor:"#FFFFFF18"},
 spark:{position:"absolute",width:7,height:18,borderRadius:5},focusOuter:{width:88,height:88,borderRadius:50,borderWidth:3,alignItems:"center",justifyContent:"center"},focusMid:{width:62,height:62,borderRadius:40,borderWidth:2,alignItems:"center",justifyContent:"center"},focusCore:{width:28,height:28,borderRadius:20},focusText:{color:"#FFF",fontSize:8,fontWeight:"900",letterSpacing:2,marginTop:8},
 arc:{width:88,height:88,borderRadius:50,borderWidth:8,alignItems:"center",justifyContent:"center"},arcText:{color:"#FFF",fontSize:18,fontWeight:"900"},
 soundWrap:{flex:1,alignItems:"center",justifyContent:"center"},wave:{height:56,flexDirection:"row",alignItems:"center",gap:4,marginTop:6},waveBar:{width:5,borderRadius:4},soundText:{color:"#FFF",fontSize:10,fontWeight:"900"},
 studyArc:{color:"#FFF",fontSize:24,fontWeight:"900",letterSpacing:-1},loaderDots:{flexDirection:"row",gap:7,marginTop:12},loaderDot:{width:7,height:7,borderRadius:4,backgroundColor:"#FFF"},
 trophyRing:{width:94,height:94,borderRadius:50,borderWidth:3,alignItems:"center",justifyContent:"center",backgroundColor:"#05070A55"},milestoneText:{color:"#FFF",fontSize:9,fontWeight:"900",letterSpacing:2,marginTop:7},
 caption:{position:"absolute",left:12,right:12,bottom:10,flexDirection:"row",alignItems:"center",justifyContent:"space-between"},name:{color:"#FFF",fontSize:10,fontWeight:"900",maxWidth:180},kind:{color:"#FFFFFF8A",fontSize:6.5,fontWeight:"800",letterSpacing:.7,marginTop:2},
});

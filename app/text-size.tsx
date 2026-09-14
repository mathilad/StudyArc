import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTypography } from "../context/TypographyContext";
import type { AppTextSize } from "../lib/globalTypography";

const OPTIONS: Array<{ id: AppTextSize; title: string; sub: string; sample: number }> = [
  { id: "comfortable", title: "Comfortable", sub: "Slightly larger than the old StudyArc text size.", sample: 16 },
  { id: "large", title: "Large", sub: "Recommended if the normal mobile text feels too small.", sample: 18 },
  { id: "extra-large", title: "Extra large", sub: "Maximum StudyArc text size for easier reading.", sample: 21 },
];

export default function TextSizeScreen() {
  const router = useRouter();
  const { textSize, setTextSize } = useTypography();
  return <View style={s.root}>
    <LinearGradient colors={["#171027", "#080D14", "#080D14"]} style={StyleSheet.absoluteFill}/>
    <View style={s.header}>
      <Pressable onPress={() => router.back()} style={s.back}><Ionicons name="arrow-back" size={21} color="#FFF"/></Pressable>
      <View style={{flex:1}}><Text style={s.kicker}>ACCESSIBILITY</Text><Text style={s.title}>Text size</Text><Text style={s.sub}>Choose a larger font size for the whole app.</Text></View>
    </View>
    <View style={s.content}>
      <View style={s.preview}><Text style={s.previewLabel}>PREVIEW</Text><Text style={s.previewTitle}>StudyArc should be easy to read.</Text><Text style={s.previewText}>Titles, labels, buttons, timers and helper text use the selected app-wide text scale.</Text></View>
      <View style={s.stack}>{OPTIONS.map(option => {
        const active = option.id === textSize;
        return <Pressable key={option.id} onPress={() => setTextSize(option.id)} style={[s.option, active && s.optionActive]}>
          <View style={[s.sample,{borderColor:active?"#B784FF":"#354253"}]}><Text style={{color:active?"#F0E5FF":"#AEB8C5",fontSize:option.sample,fontWeight:"900"}}>Aa</Text></View>
          <View style={{flex:1}}><Text style={[s.optionTitle,active&&s.optionTitleActive]}>{option.title}</Text><Text style={s.optionSub}>{option.sub}</Text></View>
          <Ionicons name={active?"checkmark-circle":"ellipse-outline"} size={23} color={active?"#B784FF":"#536174"}/>
        </Pressable>;
      })}</View>
      <View style={s.note}><Ionicons name="information-circle-outline" size={20} color="#9FC4FF"/><Text style={s.noteText}>Changing text size reloads the app so every screen can rebuild with the new typography scale. Your study data and active account are not changed.</Text></View>
    </View>
  </View>;
}

const s=StyleSheet.create({root:{flex:1,backgroundColor:"#080D14"},header:{padding:18,paddingTop:22,flexDirection:"row",alignItems:"center",gap:12},back:{width:43,height:43,borderRadius:14,backgroundColor:"#151C27",alignItems:"center",justifyContent:"center"},kicker:{color:"#A884D1",fontSize:9,fontWeight:"900",letterSpacing:1.2},title:{color:"#F5F6F8",fontSize:24,fontWeight:"900",marginTop:2},sub:{color:"#7A8798",fontSize:11,marginTop:3},content:{padding:20,maxWidth:720,width:"100%",alignSelf:"center"},preview:{borderRadius:21,backgroundColor:"#151321",borderWidth:1,borderColor:"#463553",padding:17},previewLabel:{color:"#9278AF",fontSize:9,fontWeight:"900",letterSpacing:1.2},previewTitle:{color:"#F1EBF6",fontSize:18,fontWeight:"900",marginTop:8},previewText:{color:"#91869B",fontSize:12,lineHeight:18,marginTop:6},stack:{gap:9,marginTop:16},option:{minHeight:82,borderRadius:19,backgroundColor:"#101720",borderWidth:1,borderColor:"#2A3747",padding:12,flexDirection:"row",alignItems:"center",gap:12},optionActive:{backgroundColor:"#20172D",borderColor:"#72519D"},sample:{width:52,height:52,borderRadius:15,backgroundColor:"#161E29",borderWidth:1,alignItems:"center",justifyContent:"center"},optionTitle:{color:"#DDE2E8",fontSize:13,fontWeight:"900"},optionTitleActive:{color:"#F3E9FE"},optionSub:{color:"#758294",fontSize:10,lineHeight:15,marginTop:4},note:{marginTop:16,borderRadius:16,backgroundColor:"#101A28",borderWidth:1,borderColor:"#2E4868",padding:12,flexDirection:"row",gap:9,alignItems:"flex-start"},noteText:{flex:1,color:"#8FA6C1",fontSize:10.5,lineHeight:16}});

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function FeatureDisabledScreen({ title, message }: { title: string; message: string }) {
  const router = useRouter();
  return <View style={s.root}>
    <LinearGradient colors={["#17101F","#080D14","#080D14"]} style={StyleSheet.absoluteFill}/>
    <View style={s.card}>
      <View style={s.icon}><Ionicons name="power-outline" size={30} color="#C9A8EB"/></View>
      <Text style={s.kicker}>CURRENTLY UNAVAILABLE</Text>
      <Text style={s.title}>{title}</Text>
      <Text style={s.message}>{message}</Text>
      <Pressable onPress={()=>router.back()} style={s.button}><Ionicons name="arrow-back" size={17} color="#160B20"/><Text style={s.buttonText}>Go back</Text></Pressable>
    </View>
  </View>
}
const s=StyleSheet.create({
  root:{flex:1,backgroundColor:"#080D14",alignItems:"center",justifyContent:"center",padding:22},
  card:{width:"100%",maxWidth:470,borderRadius:26,backgroundColor:"#101720",borderWidth:1,borderColor:"#3C2D49",padding:25,alignItems:"center"},
  icon:{width:64,height:64,borderRadius:22,backgroundColor:"#281D34",alignItems:"center",justifyContent:"center"},
  kicker:{color:"#8F73A8",fontSize:8,fontWeight:"900",letterSpacing:1.5,marginTop:18},
  title:{color:"#F4F1F7",fontSize:24,fontWeight:"900",textAlign:"center",marginTop:5},
  message:{color:"#8491A2",fontSize:10.5,lineHeight:17,textAlign:"center",marginTop:8,maxWidth:360},
  button:{height:46,paddingHorizontal:18,borderRadius:14,backgroundColor:"#C59AFF",flexDirection:"row",alignItems:"center",gap:7,marginTop:20},
  buttonText:{color:"#160B20",fontSize:10,fontWeight:"900"},
});

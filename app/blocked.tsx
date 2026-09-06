import { Ionicons } from "@expo/vector-icons";
import { Redirect } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAccess } from "../context/AccessContext";
import { useAuth } from "../context/AuthContext";

export default function BlockedScreen() {
  const { session, signOut } = useAuth();
  const { loading, blocked, blockedReason, contactEmail } = useAccess();
  if (!session) return <Redirect href="/login" />;
  if (!loading && !blocked) return <Redirect href="/" />;
  return <View style={s.root}><View style={s.card}>
    <View style={s.icon}><Ionicons name="lock-closed" size={31} color="#FFB3BC" /></View>
    <Text style={s.title}>Account unavailable</Text>
    <Text style={s.copy}>{blockedReason || "Your Study Arc account has been blocked by an administrator."}</Text>
    <Text style={s.help}>Contact {contactEmail} if you believe this was a mistake.</Text>
    <Pressable style={s.button} onPress={() => signOut()}><Text style={s.buttonText}>SIGN OUT</Text></Pressable>
  </View></View>;
}
const s=StyleSheet.create({root:{flex:1,backgroundColor:"#080D14",alignItems:"center",justifyContent:"center",padding:22},card:{width:"100%",maxWidth:440,borderRadius:26,backgroundColor:"#12151D",borderWidth:1,borderColor:"#56343B",padding:27,alignItems:"center"},icon:{width:68,height:68,borderRadius:22,backgroundColor:"#321B21",alignItems:"center",justifyContent:"center"},title:{color:"#F6F1F2",fontSize:28,fontWeight:"900",marginTop:19},copy:{color:"#B69AA0",fontSize:14,lineHeight:22,textAlign:"center",marginTop:12},help:{color:"#748090",fontSize:11,textAlign:"center",marginTop:15},button:{width:"100%",height:51,borderRadius:15,backgroundColor:"#2A1A20",borderWidth:1,borderColor:"#603944",alignItems:"center",justifyContent:"center",marginTop:23},buttonText:{color:"#FFD8DE",fontSize:12,fontWeight:"900"}});

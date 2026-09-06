import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Redirect } from "expo-router";
import React from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { useAccess } from "../context/AccessContext";
import { useAuth } from "../context/AuthContext";

export default function ActivatePlanScreen() {
  const { session, signOut } = useAuth();
  const { loading, paidEnabled, isPremium, isAdmin, accessCode, monthlyPriceLkr, contactEmail, refreshAccess } = useAccess();
  if (!session) return <Redirect href="/login" />;
  if (!loading && (isAdmin || !paidEnabled || isPremium)) return <Redirect href="/" />;

  const contact = () => Linking.openURL(`mailto:${contactEmail}?subject=Study%20Arc%20Premium%20Activation%20${encodeURIComponent(accessCode)}`);

  return <View style={s.root}>
    <LinearGradient colors={["#1D1230", "#080D14", "#080D14"]} style={StyleSheet.absoluteFill} />
    <View style={s.card}>
      <View style={s.icon}><Ionicons name="sparkles" size={32} color="#E5D2FF" /></View>
      <Text style={s.brand}>Study<Text style={s.accent}> Arc</Text></Text>
      <Text style={s.title}>Activate your monthly plan</Text>
      <Text style={s.price}>LKR {monthlyPriceLkr.toLocaleString()}<Text style={s.month}> / month</Text></Text>
      <Text style={s.copy}>Send your payment confirmation and the activation code below to Study Arc support. An admin can then activate 30 days of premium access.</Text>
      <View style={s.codeBox}>
        <Text style={s.codeLabel}>YOUR ACTIVATION CODE</Text>
        <Text selectable style={s.code}>{accessCode || "Loading…"}</Text>
      </View>
      <Pressable style={s.primary} onPress={contact}><Ionicons name="mail-outline" size={19} color="#160B20" /><Text style={s.primaryText}>CONTACT SUPPORT</Text></Pressable>
      <Pressable style={s.secondary} onPress={() => refreshAccess()}><Ionicons name="refresh" size={18} color="#DCC8F5" /><Text style={s.secondaryText}>I&apos;VE BEEN ACTIVATED</Text></Pressable>
      <Pressable onPress={() => signOut()}><Text style={s.signOut}>Sign out</Text></Pressable>
    </View>
  </View>;
}

const s=StyleSheet.create({
  root:{flex:1,backgroundColor:"#080D14",alignItems:"center",justifyContent:"center",padding:22},
  card:{width:"100%",maxWidth:470,borderRadius:28,backgroundColor:"#0F151F",borderWidth:1,borderColor:"#44345A",padding:26,alignItems:"center"},
  icon:{width:70,height:70,borderRadius:23,backgroundColor:"#2D1E40",alignItems:"center",justifyContent:"center"},
  brand:{color:"#F5F3F8",fontSize:20,fontWeight:"900",marginTop:17},accent:{color:"#B784FF"},
  title:{color:"#F5F6F8",fontSize:28,fontWeight:"900",textAlign:"center",marginTop:20},
  price:{color:"#C79BFF",fontSize:29,fontWeight:"900",marginTop:13},month:{color:"#7D8796",fontSize:13},
  copy:{color:"#8E98A7",fontSize:13,lineHeight:21,textAlign:"center",marginTop:14},
  codeBox:{width:"100%",borderRadius:18,backgroundColor:"#171123",borderWidth:1,borderColor:"#513B69",padding:17,alignItems:"center",marginTop:22},
  codeLabel:{color:"#79658F",fontSize:9,fontWeight:"900",letterSpacing:1.3},code:{color:"#F0E5FF",fontSize:23,fontWeight:"900",letterSpacing:2,marginTop:8},
  primary:{width:"100%",height:54,borderRadius:16,backgroundColor:"#B784FF",flexDirection:"row",alignItems:"center",justifyContent:"center",gap:8,marginTop:18},
  primaryText:{color:"#160B20",fontSize:12,fontWeight:"900"},secondary:{width:"100%",height:50,borderRadius:16,borderWidth:1,borderColor:"#4A3760",flexDirection:"row",alignItems:"center",justifyContent:"center",gap:8,marginTop:10},
  secondaryText:{color:"#DCC8F5",fontSize:11,fontWeight:"900"},signOut:{color:"#788596",fontSize:12,fontWeight:"800",marginTop:19}
});

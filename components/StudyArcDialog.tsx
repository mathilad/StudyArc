import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
  primaryLabel?: string;
  onPrimary?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  tone?: "info" | "success" | "warning" | "danger";
};

const tones = {
  info: { accent: "#B784FF", surface: "#21182D", icon: "information-circle-outline" as const },
  success: { accent: "#79D29F", surface: "#12251A", icon: "checkmark-circle-outline" as const },
  warning: { accent: "#F0B477", surface: "#2A2115", icon: "alert-circle-outline" as const },
  danger: { accent: "#E59AAA", surface: "#29171D", icon: "warning-outline" as const },
};

export default function StudyArcDialog({
  visible,
  title,
  message,
  onClose,
  primaryLabel = "OK",
  onPrimary,
  secondaryLabel,
  onSecondary,
  icon,
  tone = "info",
}: Props) {
  const palette = tones[tone];
  const primary = () => { onPrimary?.(); if (!onPrimary) onClose(); };
  const secondary = () => { onSecondary?.(); if (!onSecondary) onClose(); };
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={s.overlay}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose}/>
      <View style={s.card}>
        <View style={[s.icon,{backgroundColor:palette.surface,borderColor:`${palette.accent}55`}]}>
          <Ionicons name={icon ?? palette.icon} size={25} color={palette.accent}/>
        </View>
        <Text style={s.eyebrow}>STUDYARC</Text>
        <Text style={s.title}>{title}</Text>
        <Text style={s.message}>{message}</Text>
        <View style={s.actions}>
          {secondaryLabel ? <Pressable onPress={secondary} style={s.secondary}><Text style={s.secondaryText}>{secondaryLabel}</Text></Pressable> : null}
          <Pressable onPress={primary} style={[s.primary,{backgroundColor:palette.accent}]}><Text style={s.primaryText}>{primaryLabel}</Text></Pressable>
        </View>
      </View>
    </View>
  </Modal>;
}

const s=StyleSheet.create({
  overlay:{flex:1,backgroundColor:"rgba(3,6,10,.78)",alignItems:"center",justifyContent:"center",padding:20},
  card:{width:"100%",maxWidth:410,borderRadius:25,backgroundColor:"#101720",borderWidth:1,borderColor:"#334154",padding:19,shadowColor:"#000",shadowOpacity:.4,shadowRadius:20,shadowOffset:{width:0,height:10},elevation:16},
  icon:{width:50,height:50,borderRadius:16,borderWidth:1,alignItems:"center",justifyContent:"center",marginBottom:13},
  eyebrow:{color:"#81708F",fontSize:8,fontWeight:"900",letterSpacing:1.35},
  title:{color:"#F3F5F7",fontSize:20,fontWeight:"900",marginTop:5},
  message:{color:"#8A98AA",fontSize:11,lineHeight:18,marginTop:8},
  actions:{flexDirection:"row",justifyContent:"flex-end",gap:8,marginTop:19},
  secondary:{minHeight:44,borderRadius:13,backgroundColor:"#18212C",borderWidth:1,borderColor:"#2C3948",paddingHorizontal:15,alignItems:"center",justifyContent:"center"},
  secondaryText:{color:"#C5CED8",fontSize:9.5,fontWeight:"900"},
  primary:{minHeight:44,borderRadius:13,paddingHorizontal:18,alignItems:"center",justifyContent:"center"},
  primaryText:{color:"#150C1D",fontSize:9.5,fontWeight:"900"},
});
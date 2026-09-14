import{Ionicons}from"@expo/vector-icons";
import React,{useState}from"react";
import{Pressable,StyleSheet,Text,View}from"react-native";
import AssignmentPriorityModal from"../components/AssignmentPriorityModal";
import AssignmentEnhanced from"./AssignmentEnhanced";
export default function AssignmentWithPriority(){const[open,setOpen]=useState(false);return <View style={s.root}><AssignmentEnhanced/><Pressable onPress={()=>setOpen(true)} style={s.priority} accessibilityLabel="Prioritize assignments"><Ionicons name="reorder-four-outline" size={18} color="#160B20"/><Text style={s.priorityText}>Prioritize</Text></Pressable><AssignmentPriorityModal visible={open} onClose={()=>setOpen(false)}/></View>}
const s=StyleSheet.create({root:{flex:1},priority:{position:"absolute",right:18,top:88,minHeight:40,borderRadius:13,backgroundColor:"#D0AEF7",paddingHorizontal:12,flexDirection:"row",alignItems:"center",gap:6,zIndex:40,shadowColor:"#000",shadowOpacity:.25,shadowRadius:10,shadowOffset:{width:0,height:4},elevation:6},priorityText:{color:"#160B20",fontSize:11,fontWeight:"900"}});

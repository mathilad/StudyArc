import React,{useState}from"react";
import{View}from"react-native";
import AssignmentPriorityModal from"../components/AssignmentPriorityModal";
import AssignmentEnhanced from"./AssignmentEnhanced";

export default function AssignmentWithPriority(){
 const[open,setOpen]=useState(false);
 return <View style={{flex:1}}>
  <AssignmentEnhanced onPrioritize={()=>setOpen(true)}/>
  <AssignmentPriorityModal visible={open} onClose={()=>setOpen(false)}/>
 </View>;
}

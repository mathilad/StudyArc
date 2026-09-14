import { Ionicons } from "@expo/vector-icons";
import React,{useEffect,useMemo,useState}from"react";
import { Alert,Modal,Pressable,ScrollView,StyleSheet,Text,View,type AlertButton,type AlertOptions } from "react-native";

type AlertPayload={title:string;message?:string;buttons:AlertButton[];options?:AlertOptions}|null;

export default function GlobalInAppAlertBridge(){
 const[payload,setPayload]=useState<AlertPayload>(null);
 useEffect(()=>{
  const original=(Alert as any).alert?.bind(Alert);
  (Alert as any).alert=(title:string,message?:string,buttons?:AlertButton[],options?:AlertOptions)=>{
    const safeButtons=buttons?.length?buttons:[{text:"OK"}];
    setPayload({title:title||"StudyArc",message,buttons:safeButtons,options});
  };
  return()=>{if(original)(Alert as any).alert=original};
 },[]);
 const tone=useMemo(()=>{
  if(!payload)return"info" as const;
  if(payload.buttons.some(b=>b.style==="destructive"))return"danger" as const;
  const text=`${payload.title} ${payload.message??""}`.toLowerCase();
  if(text.includes("could not")||text.includes("error")||text.includes("failed"))return"danger" as const;
  if(text.includes("saved")||text.includes("complete")||text.includes("success"))return"success" as const;
  return"info" as const;
 },[payload]);
 const palette=tone==="danger"?{accent:"#EAA7B2",surface:"#2A171D",icon:"warning-outline" as const}:tone==="success"?{accent:"#83D6A3",surface:"#13261B",icon:"checkmark-circle-outline" as const}:{accent:"#C19AEF",surface:"#21182D",icon:"information-circle-outline" as const};
 const close=()=>setPayload(null);
 const press=(button:AlertButton)=>{close();requestAnimationFrame(()=>button.onPress?.())};
 return <Modal visible={Boolean(payload)} transparent animationType="fade" onRequestClose={()=>{if(payload?.options?.cancelable!==false)close()}}>
  <View style={s.overlay}>
   {payload?.options?.cancelable!==false?<Pressable style={StyleSheet.absoluteFill} onPress={close}/>:null}
   <View style={s.card}>
    <View style={[s.icon,{backgroundColor:palette.surface,borderColor:`${palette.accent}55`}]}><Ionicons name={palette.icon} size={26} color={palette.accent}/></View>
    <Text style={s.eyebrow}>STUDYARC</Text>
    <Text style={s.title}>{payload?.title||"StudyArc"}</Text>
    {payload?.message?<ScrollView style={s.messageScroll} contentContainerStyle={{paddingBottom:2}}><Text style={s.message}>{payload.message}</Text></ScrollView>:null}
    <View style={[s.actions,(payload?.buttons.length??0)>2&&s.actionsStack]}>{payload?.buttons.map((button,index)=>{
      const destructive=button.style==="destructive",cancel=button.style==="cancel",primary=!cancel&&!destructive&&(index===payload.buttons.length-1||payload.buttons.length===1);
      return <Pressable key={`${button.text??"OK"}-${index}`} onPress={()=>press(button)} style={[s.action,primary&&{backgroundColor:palette.accent,borderColor:palette.accent},destructive&&s.destructive,cancel&&s.cancel]}><Text style={[s.actionText,primary&&s.primaryText,destructive&&s.destructiveText]}>{button.text??"OK"}</Text></Pressable>
    })}</View>
   </View>
  </View>
 </Modal>
}

const s=StyleSheet.create({overlay:{flex:1,backgroundColor:"rgba(3,6,10,.82)",alignItems:"center",justifyContent:"center",padding:20},card:{width:"100%",maxWidth:420,borderRadius:25,backgroundColor:"#101720",borderWidth:1,borderColor:"#344154",padding:19,shadowColor:"#000",shadowOpacity:.38,shadowRadius:20,shadowOffset:{width:0,height:10},elevation:16},icon:{width:52,height:52,borderRadius:17,borderWidth:1,alignItems:"center",justifyContent:"center",marginBottom:12},eyebrow:{color:"#756887",fontSize:7.5,fontWeight:"900",letterSpacing:1.3},title:{color:"#F2F4F7",fontSize:19,fontWeight:"900",marginTop:4},messageScroll:{maxHeight:220},message:{color:"#8794A5",fontSize:10,lineHeight:16,marginTop:8},actions:{flexDirection:"row",justifyContent:"flex-end",gap:8,marginTop:18},actionsStack:{flexDirection:"column-reverse"},action:{minHeight:44,borderRadius:13,backgroundColor:"#18212C",borderWidth:1,borderColor:"#2D3948",paddingHorizontal:15,alignItems:"center",justifyContent:"center"},cancel:{backgroundColor:"#141B24"},destructive:{backgroundColor:"#30191F",borderColor:"#60323D"},actionText:{color:"#C3CCD6",fontSize:9.5,fontWeight:"900"},primaryText:{color:"#160B20"},destructiveText:{color:"#EBA8B3"}});
import { Platform } from "react-native";
import { supabase } from "./supabase";

export type AdaptiveRecall = { subjectName:string; topicName:string; nextRecallAt:string };

export async function scheduleAdaptiveRecallReminders(rows:AdaptiveRecall[]){
  if(Platform.OS==="web"||!rows.length)return;
  let prefs:any=null;
  try{const{data}=await supabase.rpc("get_my_notification_preferences");prefs=data}catch{}
  if(prefs?.revision_reminders===false)return;
  const Notifications=await import("expo-notifications");
  const permission=await Notifications.getPermissionsAsync();
  if(permission.status!=="granted")return;
  const existing=await Notifications.getAllScheduledNotificationsAsync();
  const keys=new Set(rows.map(row=>`${row.subjectName}::${row.topicName}`));
  await Promise.all(existing.filter(item=>item.content.data?.kind==="adaptive-revision"&&keys.has(String(item.content.data?.topicKey??""))).map(item=>Notifications.cancelScheduledNotificationAsync(item.identifier)));
  for(const row of rows){
    const date=new Date(row.nextRecallAt);
    if(!Number.isFinite(date.getTime())||date.getTime()<=Date.now())continue;
    await Notifications.scheduleNotificationAsync({
      content:{
        title:"StudyArc review due",
        body:`${row.topicName} · ${row.subjectName}`,
        data:{kind:"adaptive-revision",topicKey:`${row.subjectName}::${row.topicName}`,subjectName:row.subjectName,topicName:row.topicName,url:"/revision"},
      },
      trigger:{type:Notifications.SchedulableTriggerInputTypes.DATE,date},
    });
  }
}

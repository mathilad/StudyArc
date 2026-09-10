import { router } from "expo-router";
import React, { useEffect, useMemo } from "react";
import { Platform } from "react-native";
import { useAcademic } from "../context/AcademicContext";
import { usePlanning } from "../context/PlanningContext";
import { useScheduleAdjustments } from "../context/ScheduleAdjustmentsContext";
import { useStudent } from "../context/StudentContext";
import { scheduleAssignmentReminders } from "../lib/assignmentNotifications";
import { generateDailyPlan } from "../lib/planner";
import { scheduleDailyReviewReminder, scheduleStudyReminders } from "../lib/notifications";
import { supabase } from "../lib/supabase";

const defaults={next_session:true,class_reminders:true,revision_reminders:true,paper_reminders:true,missed_plan_reminders:true};

export default function NotificationScheduler(){
  const{profile,classes,topicProgress,testMarks,subtopicCoverage}=useStudent();
  const{assignments}=useAcademic();
  const{preferences}=usePlanning();
  const{protectedTimes,classWeekOverrides}=useScheduleAdjustments();
  const today=useMemo(()=>new Date(),[]);
  const plan=useMemo(()=>generateDailyPlan(today,profile,classes,topicProgress,testMarks,subtopicCoverage),[classWeekOverrides,classes,preferences,profile,protectedTimes,subtopicCoverage,testMarks,today,topicProgress]);

  useEffect(()=>{
    if(Platform.OS==="web")return;
    let active=true;
    let subscription:{remove:()=>void}|null=null;
    const openResponse=(response:any)=>{
      const url=response?.notification?.request?.content?.data?.url;
      if(typeof url==="string"&&url.startsWith("/"))router.push(url as any);
    };
    import("expo-notifications").then(async Notifications=>{
      if(!active)return;
      const last=await Notifications.getLastNotificationResponseAsync();
      if(last&&active){openResponse(last);await Notifications.clearLastNotificationResponseAsync().catch(()=>undefined)}
      if(!active)return;
      subscription=Notifications.addNotificationResponseReceivedListener(response=>{
        openResponse(response);
        Notifications.clearLastNotificationResponseAsync().catch(()=>undefined);
      });
    }).catch(()=>undefined);
    return()=>{active=false;subscription?.remove()};
  },[]);

  useEffect(()=>{
    if(Platform.OS==="web"||!profile.onboardingComplete)return;
    let cancelled=false;
    (async()=>{
      const{data}=await supabase.rpc("get_my_notification_preferences");
      if(cancelled)return;
      const prefs={...defaults,...(data??{})};
      const filtered=plan.filter(item=>{
        if(item.id.startsWith("protected-"))return true;
        if(item.type==="class")return prefs.class_reminders;
        if(item.type==="revision")return prefs.revision_reminders;
        if(item.type==="study"&&item.title.startsWith("Exam practice"))return prefs.paper_reminders||prefs.next_session;
        if(item.type==="study")return prefs.next_session;
        return false;
      });
      await scheduleStudyReminders(today,filtered);
      await scheduleDailyReviewReminder(profile);
      await scheduleAssignmentReminders(assignments);
    })().catch(()=>undefined);
    return()=>{cancelled=true};
  },[assignments,plan,profile,today]);
  return null;
}

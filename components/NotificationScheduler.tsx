import React, { useEffect, useMemo } from "react";
import { Platform } from "react-native";
import { usePlanning } from "../context/PlanningContext";
import { useScheduleAdjustments } from "../context/ScheduleAdjustmentsContext";
import { useStudent } from "../context/StudentContext";
import { generateDailyPlan } from "../lib/planner";
import { scheduleDailyReviewReminder, scheduleStudyReminders } from "../lib/notifications";
import { supabase } from "../lib/supabase";

const defaults={next_session:true,class_reminders:true,revision_reminders:true,paper_reminders:true,missed_plan_reminders:true};

export default function NotificationScheduler(){
  const{profile,classes,topicProgress,testMarks,subtopicCoverage}=useStudent();
  const{preferences}=usePlanning();
  const{protectedTimes,classWeekOverrides}=useScheduleAdjustments();
  const today=useMemo(()=>new Date(),[]);
  const plan=useMemo(()=>generateDailyPlan(today,profile,classes,topicProgress,testMarks,subtopicCoverage),[classWeekOverrides,classes,preferences,profile,protectedTimes,subtopicCoverage,testMarks,today,topicProgress]);

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
    })().catch(()=>undefined);
    return()=>{cancelled=true};
  },[plan,profile,today]);
  return null;
}

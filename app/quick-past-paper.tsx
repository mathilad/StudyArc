import React from "react";
import {Redirect,useLocalSearchParams} from "expo-router";
import {timerSection} from "../lib/pastPaperUi";
const first=(value?:string|string[])=>Array.isArray(value)?value[0]:value;
export default function QuickPastPaper(){
 const p=useLocalSearchParams<{subjectName?:string|string[];section?:string|string[];paperYear?:string|string[]}>();
 const subject=first(p.subjectName);
 if(!subject)return <Redirect href="/past-paper"/>;
 return <Redirect href={{pathname:"/paper-stopwatch",params:{subjectName:subject,topicName:"General",studyType:"Past Papers",paperSection:timerSection(first(p.section)||"Full Paper"),paperYear:first(p.paperYear),recordQuestions:"1"}}}/>;
}

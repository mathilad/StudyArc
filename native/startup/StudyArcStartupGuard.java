package com.studyarc.app;

import android.app.ActivityManager;
import android.app.ApplicationExitInfo;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.List;

public final class StudyArcStartupGuard {
  private static final String PREFS="studyarc_startup_diagnostics";
  public static boolean blocked=false;
  public static String report="";
  private static long reportTime;
  private static SharedPreferences prefs(Context c){return c.getSharedPreferences(PREFS,Context.MODE_PRIVATE);}
  public static boolean install(Context c){
    Thread.UncaughtExceptionHandler previous=Thread.getDefaultUncaughtExceptionHandler();
    Thread.setDefaultUncaughtExceptionHandler((thread,error)->{
      try{
        String stack=Log.getStackTraceString(error);
        prefs(c).edit().putLong("java_time",System.currentTimeMillis())
          .putString("java_report",stack.length()>24000?stack.substring(0,24000):stack).commit();
      }catch(Throwable ignored){}
      if(previous!=null)previous.uncaughtException(thread,error);
      else android.os.Process.killProcess(android.os.Process.myPid());
    });
    try{
      SharedPreferences p=prefs(c);long acknowledged=p.getLong("acknowledged",0);
      long javaTime=p.getLong("java_time",0);
      if(javaTime>acknowledged){reportTime=javaTime;report=header()+"\n"+p.getString("java_report","");}
      if(Build.VERSION.SDK_INT>=30){
        ActivityManager manager=(ActivityManager)c.getSystemService(Context.ACTIVITY_SERVICE);
        List<ApplicationExitInfo> exits=manager.getHistoricalProcessExitReasons(c.getPackageName(),0,4);
        for(ApplicationExitInfo exit:exits){
          int reason=exit.getReason();long time=exit.getTimestamp();
          if((reason!=ApplicationExitInfo.REASON_CRASH&&reason!=ApplicationExitInfo.REASON_CRASH_NATIVE)
            ||time<=acknowledged||time<reportTime||time<System.currentTimeMillis()-86400000L)continue;
          reportTime=time;
          StringBuilder text=new StringBuilder(header()).append("\nPrevious exit: ").append(reason)
            .append(" (native=5, Java=4)\n").append(exit.getDescription()).append('\n');
          if(reason==ApplicationExitInfo.REASON_CRASH_NATIVE&&Build.VERSION.SDK_INT>=31){
            try(InputStream in=exit.getTraceInputStream()){
              if(in!=null){
                ByteArrayOutputStream bytes=new ByteArrayOutputStream();byte[] chunk=new byte[4096];int n;
                while((n=in.read(chunk))!=-1){if(bytes.size()+n>2*1024*1024)break;bytes.write(chunk,0,n);}
                try{text.append(StudyArcTombstone.format(bytes.toByteArray()));}
                catch(Exception e){text.append("Native trace could not be decoded.\n");}
              }else text.append("Android did not retain a native trace.\n");
            }catch(Exception e){text.append("Native trace is unavailable.\n");}
          }else if(javaTime>acknowledged){text.append(p.getString("java_report",""));}
          report=text.toString();break;
        }
      }
      blocked=!report.isEmpty();
    }catch(Exception e){Log.w("StudyArcStartup","Crash history unavailable",e);}
    return blocked;
  }
  private static String header(){
    return "StudyArc "+BuildConfig.VERSION_NAME+" ("+BuildConfig.VERSION_CODE+")\n"
      +Build.MANUFACTURER+" "+Build.MODEL+"\nAndroid "+Build.VERSION.RELEASE+" / API "+Build.VERSION.SDK_INT
      +"\nSupported ABIs: "+java.util.Arrays.toString(Build.SUPPORTED_ABIS)
      +"\nProcess: "+(android.os.Process.is64Bit()?"64-bit":"32-bit");
  }
  public static void acknowledge(Context c){prefs(c).edit().putLong("acknowledged",Math.max(System.currentTimeMillis(),reportTime)).commit();}
}

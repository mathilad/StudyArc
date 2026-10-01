package com.studyarc.app;

import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.os.Bundle;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

/** Framework-only gateway: crash details remain accessible even if React cannot start. */
public class StudyArcStartupActivity extends Activity {
  @Override public void onCreate(Bundle state){
    super.onCreate(state);
    if(!StudyArcStartupGuard.blocked){
      Intent main=new Intent(getIntent());main.setClass(this,MainActivity.class);
      main.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP);
      startActivity(main);finish();return;
    }
    getWindow().setStatusBarColor(Color.rgb(8,13,20));getWindow().setNavigationBarColor(Color.rgb(8,13,20));
    LinearLayout column=new LinearLayout(this);column.setOrientation(LinearLayout.VERTICAL);
    int pad=(int)(20*getResources().getDisplayMetrics().density);column.setPadding(pad,pad,pad,pad);
    column.setBackgroundColor(Color.rgb(8,13,20));
    TextView title=new TextView(this);title.setText("StudyArc couldn’t start");title.setTextSize(24);title.setTextColor(Color.WHITE);column.addView(title);
    TextView message=new TextView(this);message.setText("Your study data is still stored. Copy the report and send it to help identify the crash. The report stays on this phone until you copy it.");message.setTextColor(Color.LTGRAY);message.setTextSize(16);message.setPadding(0,pad,0,pad);column.addView(message);
    Button copy=new Button(this);copy.setText("Copy crash report");copy.setOnClickListener(v->{
      ClipboardManager clipboard=(ClipboardManager)getSystemService(Context.CLIPBOARD_SERVICE);
      clipboard.setPrimaryClip(ClipData.newPlainText("StudyArc crash report",StudyArcStartupGuard.report));
      Toast.makeText(this,"Report copied. Paste it into the chat.",Toast.LENGTH_LONG).show();
    });column.addView(copy);
    Button retry=new Button(this);retry.setText("Close and try again");retry.setOnClickListener(v->{
      StudyArcStartupGuard.acknowledge(this);finishAndRemoveTask();android.os.Process.killProcess(android.os.Process.myPid());
    });column.addView(retry);
    TextView hint=new TextView(this);hint.setText("After closing, tap StudyArc again to retry.");hint.setTextColor(Color.LTGRAY);column.addView(hint);
    ScrollView scroll=new ScrollView(this);TextView details=new TextView(this);details.setText(StudyArcStartupGuard.report);details.setTextIsSelectable(true);details.setTextColor(Color.LTGRAY);details.setTextSize(12);details.setPadding(0,pad,0,0);scroll.addView(details);
    column.addView(scroll,new LinearLayout.LayoutParams(-1,0,1));setContentView(column);
  }
}

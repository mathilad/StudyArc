package com.studyarc.app;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/** Bounded reader for Android's public debuggerd/proto/tombstone.proto.
 * Extracts the crashing thread's frames only, never memory dumps or log buffers. */
public final class StudyArcTombstone {
  private static final class Field {
    int number; long value; byte[] bytes;
    String text(){return bytes==null?"":new String(bytes,StandardCharsets.UTF_8);}
  }
  private static long varint(byte[] b,int[] pos)throws IOException{
    long v=0;
    for(int shift=0;shift<64;shift+=7){
      if(pos[0]>=b.length)throw new IOException("Truncated crash trace");
      int n=b[pos[0]++]&255;v|=(long)(n&127)<<shift;
      if((n&128)==0)return v;
    }
    throw new IOException("Invalid crash trace integer");
  }
  private static List<Field> fields(byte[] b)throws IOException{
    List<Field> result=new ArrayList<>();int[] p={0};
    while(p[0]<b.length){
      if(result.size()>20000)throw new IOException("Crash trace is too complex");
      long tag=varint(b,p);Field f=new Field();f.number=(int)(tag>>>3);
      if(f.number==0)throw new IOException("Invalid crash trace field");
      int wire=(int)(tag&7);
      if(wire==0)f.value=varint(b,p);
      else if(wire==2){
        long length=varint(b,p);
        if(length<0||length>b.length-p[0])throw new IOException("Invalid crash trace length");
        f.bytes=Arrays.copyOfRange(b,p[0],p[0]+(int)length);p[0]+=(int)length;
      }else if(wire==1||wire==5){
        int length=wire==1?8:4;
        if(length>b.length-p[0])throw new IOException("Truncated crash trace field");p[0]+=length;
      }else throw new IOException("Unsupported crash trace field");
      result.add(f);
    }
    return result;
  }
  private static String text(List<Field> fs,int n){for(Field f:fs)if(f.number==n)return f.text();return "";}
  private static long number(List<Field> fs,int n){for(Field f:fs)if(f.number==n)return f.value;return 0;}
  public static String format(byte[] bytes)throws IOException{
    if(bytes.length>2*1024*1024)throw new IOException("Crash trace exceeds limit");
    List<Field> top=fields(bytes);long tid=number(top,6);StringBuilder out=new StringBuilder();
    String abort=text(top,14);if(!abort.isEmpty())out.append("Abort: ").append(abort).append('\n');
    for(Field f:top)if(f.number==10&&f.bytes!=null){
      List<Field> sig=fields(f.bytes);
      out.append("Signal: ").append(text(sig,2)).append(" ").append(text(sig,4)).append("; address 0x").append(Long.toHexString(number(sig,9))).append('\n');
    }
    for(Field f:top)if(f.number==16&&f.bytes!=null){
      List<Field> entry=fields(f.bytes);if(number(entry,1)!=tid)continue;
      for(Field thread:entry)if(thread.number==2&&thread.bytes!=null){
        List<Field> values=fields(thread.bytes);out.append("Thread: ").append(text(values,2)).append('\n');int index=0;
        for(Field frame:values)if(frame.number==4&&frame.bytes!=null&&index<48){
          List<Field> v=fields(frame.bytes);
          out.append('#').append(index++).append(" pc 0x").append(Long.toHexString(number(v,1))).append(' ')
            .append(text(v,6)).append(' ').append(text(v,4)).append('+').append(number(v,5)).append(" [").append(text(v,8)).append("]\n");
        }
      }
    }
    return out.length()>24000?out.substring(0,24000):out.toString();
  }
}

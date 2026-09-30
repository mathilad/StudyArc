import {useThemeRefresh} from "../../context/AppThemeContext";
import {appColor} from "../../lib/appTheme";
import React from "react";
import { View } from "react-native";
import StatisticsScreen from "../../screens/StatisticsScreen";

export default function StatisticsTab(){
 useThemeRefresh();
  return <View style={{flex:1,backgroundColor:appColor("#080D14")}}><StatisticsScreen/></View>;
}

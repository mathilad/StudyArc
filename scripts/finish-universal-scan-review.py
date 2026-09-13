from pathlib import Path


def one(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 match, found {count}")
    return text.replace(old, new, 1)

# StudyArc AI photo/PDF analysis: replace read-only proposed rows with editable action cards.
p = Path("app/ai-assistant.tsx")
t = p.read_text()
t = one(t, 'import { useAcademic } from "../context/AcademicContext";\n', 'import StudyArcAIActionEditor from "../components/StudyArcAIActionEditor";\nimport ScanReviewBanner from "../components/ScanReviewBanner";\nimport { useAcademic } from "../context/AcademicContext";\n', "AI editor imports")
t = one(t, '      {pendingActions.length ? <View style={s.review}>\n        <View style={s.reviewHead}><View><Text style={s.reviewTitle}>Review proposed changes</Text><Text style={s.reviewSub}>Nothing below has been applied yet.</Text></View><Text style={s.count}>{pendingActions.length}</Text></View>\n        {pendingActions.map((action, index) => <View key={`${action.type}-${index}`} style={s.actionRow}><View style={s.actionIcon}><Ionicons name="create-outline" size={17} color="#D5B9F4" /></View><Text style={s.actionText}>{actionLabel(action)}</Text></View>)}\n        <View style={s.reviewButtons}><Pressable disabled={applying} onPress={() => setPendingActions([])} style={s.discard}><Text style={s.discardText}>Discard</Text></Pressable><Pressable disabled={applying} onPress={applyAll} style={s.apply}><Ionicons name="checkmark" size={17} color="#170B20" /><Text style={s.applyText}>{applying ? "Applying…" : "Review & Apply"}</Text></Pressable></View>\n      </View> : null}', '      {pendingActions.length ? <View style={s.review}>\n        <View style={s.reviewHead}><View><Text style={s.reviewTitle}>Review proposed changes</Text><Text style={s.reviewSub}>Edit anything StudyArc misread before applying it.</Text></View><Text style={s.count}>{pendingActions.length}</Text></View>\n        <ScanReviewBanner items={pendingActions.map(actionLabel)}/>\n        {pendingActions.map((action, index) => <StudyArcAIActionEditor key={`${action.type}-${index}`} action={action} onChange={next => setPendingActions(current => current.map((item, i) => i === index ? next : item))} onRemove={() => setPendingActions(current => current.filter((_, i) => i !== index))}/>)}\n        <View style={s.reviewButtons}><Pressable disabled={applying} onPress={() => setPendingActions([])} style={s.discard}><Text style={s.discardText}>Discard</Text></Pressable><Pressable disabled={applying} onPress={applyAll} style={s.apply}><Ionicons name="checkmark" size={17} color="#170B20" /><Text style={s.applyText}>{applying ? "Applying…" : "Confirm & Apply"}</Text></Pressable></View>\n      </View> : null}', "editable AI review")
p.write_text(t)

# Full marked-paper analysis: weak topics influence planning, so make them reviewable too.
p = Path("screens/AnswerSheetAnalysisScreen.tsx")
t = p.read_text()
t = one(t, '  const [maximumText, setMaximumText] = useState("");\n  const [scoreConfirmed, setScoreConfirmed] = useState(false);', '  const [maximumText, setMaximumText] = useState("");\n  const [weakTopicsText, setWeakTopicsText] = useState("");\n  const [scoreConfirmed, setScoreConfirmed] = useState(false);', "weak topics state")
t = one(t, '      setMaximumText(total == null ? "" : String(total));\n      const markEvidence', '      setMaximumText(total == null ? "" : String(total));\n      setWeakTopicsText(Array.isArray(next.weakTopics) ? next.weakTopics.map(String).join(", ") : "");\n      const markEvidence', "weak topics populate")
t = one(t, '  const weak = Array.isArray(analysis?.weakTopics) ? analysis.weakTopics.map(String) : [];', '  const weak = weakTopicsText.split(",").map(value => value.trim()).filter(Boolean);', "reviewed weak topics source")
t = one(t, '          <Text style={s.label}>CONFIRM SUBJECT</Text><View style={s.wrap}>{subjects.map(x => <Pressable key={x} onPress={() => chooseSubject(x)} style={[s.chip, subject === x && s.chipOn]}><Text style={[s.chipText, subject === x && s.chipTextOn]}>{x}</Text></Pressable>)}</View>\n        </View>', '          <Text style={s.label}>CONFIRM SUBJECT</Text><View style={s.wrap}>{subjects.map(x => <Pressable key={x} onPress={() => chooseSubject(x)} style={[s.chip, subject === x && s.chipOn]}><Text style={[s.chipText, subject === x && s.chipTextOn]}>{x}</Text></Pressable>)}</View>\n          <Text style={s.label}>WEAK TOPICS THAT WILL AFFECT REVISION</Text><TextInput value={weakTopicsText} onChangeText={setWeakTopicsText} placeholder="Separate topics with commas" placeholderTextColor="#586678" style={s.reviewInput}/>\n        </View>', "weak topics editor")
t = one(t, '        confirmedSubject: subject,\n        paperDate,', '        confirmedSubject: subject,\n        weakTopics: weak,\n        paperDate,', "persist reviewed weak topics")
end = t.rfind("\n});")
if end < 0:
    raise SystemExit("Answer sheet styles end not found")
t = t[:end] + '\n  reviewInput:{minHeight:42,borderRadius:11,backgroundColor:"#0A1119",borderWidth:1,borderColor:"#293646",color:"#E5E9EE",paddingHorizontal:9,fontSize:9},' + t[end:]
p.write_text(t)

print("Final universal scan review coverage applied.")

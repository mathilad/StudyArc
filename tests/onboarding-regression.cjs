// Run with Node 24+: node tests/onboarding-regression.cjs
const { stripTypeScriptTypes } = require('node:module');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const storage = new Map();
const tick = () => new Promise(resolve => setImmediate(resolve));
function compile(path, injected, suffix = '') {
  let source = readFileSync(path, 'utf8').replace(/^import .*;\n/gm, '').replace(/export /g, '');
  source = source.replace('return <StudentContext.Provider value={value}>{children}</StudentContext.Provider>;', 'return value;');
  const js = stripTypeScriptTypes(source);
  return vm.runInNewContext(js + suffix, { ...injected, console, setTimeout, clearTimeout, process });
}
const store = compile('lib/offlineStore.ts', {
  AsyncStorage: {
    async getItem(key) { await tick(); return storage.get(key) ?? null; },
    async setItem(key, value) { await tick(); storage.set(key, value); },
  },
}, ';({enqueueMutation,removeQueuedMutation,queuedMutationsFor,readQueue,cacheKey,readJson,writeJson,makeUuid})');
let slots = [], cursor = 0;
const hooks = {
  createContext: () => ({}), useContext: () => null,
  useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
  useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial }; },
  useCallback: fn => fn, useMemo: fn => fn(), useEffect: () => {},
};
let user = { id: 'student-a', user_metadata: {} }, online = false;
let serverProfile = { user_id: user.id, onboarding_complete: false };
let release = null, hold = false;
const supabase = { from(table) {
  const result = { data: table === 'student_profiles' ? { ...serverProfile } : [], error: null };
  const query = {
    select() { return this; }, eq() { return this; }, order() { return this; }, limit() { return this; },
    maybeSingle() { return this; }, single() { return this; },
    then(resolve) { if (hold && table === 'student_profiles') release = () => resolve(result); else resolve(result); },
    async upsert(payload) { if (table === 'student_profiles') serverProfile = { ...payload }; return { error: null }; },
  }; return query;
} };
const Provider = compile('context/StudentContext.tsx', {
  ...hooks, ...store, supabase, React: {},
  useAuth: () => ({ user, loading: false }),
  useOffline: () => ({ isOnline: online, checking: false, syncTick: 0, refreshConnectivity: async () => {} }),
}, ';StudentProvider');
function render() { cursor = 0; return Provider({ children: null }); }
(async () => {
  const entries = await Promise.all(Array.from({ length: 30 }, (_, i) => store.enqueueMutation({ userId: user.id, kind: 'stream', payload: { i } })));
  assert.equal((await store.readQueue()).length, 30, 'parallel saves must all survive');
  await Promise.all([store.removeQueuedMutation(entries[0].id), store.enqueueMutation({ userId: user.id, kind: 'stream', payload: {} })]);
  assert.equal((await store.readQueue()).length, 30, 'acknowledgement must not erase another save');
  storage.clear();
  let value = render();
  await value.refreshStudentData();
  value = render();
  online = true; hold = true;
  const refresh = render().refreshStudentData();
  await tick();
  online = false;
  value = render();
  await value.completeOnboarding({ ...value.profile, fullName: 'Student', examYear: 2028, subjectChoices: ['Physics'] });
  hold = false; release(); await refresh;
  assert.equal(render().profile.onboardingComplete, true, 'old server read must not undo submission');
  // Recreate provider to simulate an app restart with an unsynced local save.
  slots = []; online = true;
  await render().refreshStudentData();
  assert.equal(render().profile.onboardingComplete, true, 'pending profile must override older server profile');
  assert.equal(render().profile.fullName, 'Student');
  user = { id: 'student-b', user_metadata: {} }; online = false;
  assert.equal(render().loading, true, 'account switch must wait for the new profile');
  await render().refreshStudentData();
  assert.equal(render().profile.onboardingComplete, false, 'completion must remain account-specific');
  const screen = readFileSync('app/onboarding.tsx', 'utf8');
  assert.ok(screen.indexOf('if (isAdmin)') < screen.indexOf('if (studentLoading)'), 'admin redirect must precede student checks');
  assert.ok(screen.includes('if (isAdmin) return <Redirect href="/admin" />;'));
  console.log('PASS: concurrent queue saves, acknowledgement race, stale refresh, restart with pending onboarding, account isolation, admin bypass');
})().catch(error => { console.error(error); process.exitCode = 1; });

# npm / Expo fix used in this project

This build uses one consistent Expo SDK 54 dependency set. Do not mix a package-lock from another SDK into this project.

If you extract the ZIP without `node_modules`, this is normal. Run:

```bat
npm start
```

The project now runs `scripts/ensure-deps.js` first. If Expo is missing, it runs `npm install` automatically and only then launches `npx expo start`.

If installation is interrupted or your proxy changes, clean and retry:

```bat
rmdir /s /q node_modules
if exist package-lock.json del package-lock.json
npm cache verify
npm install
npx expo install --check
npx expo start -c
```

If you are behind your existing npm proxy, verify both values with:

```bat
npm config get proxy
npm config get https-proxy
npm ping
```

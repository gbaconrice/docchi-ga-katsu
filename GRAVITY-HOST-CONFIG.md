# Gravity host layout contract (candidate)

The normal `index.html` is standalone/web-preview by default. It does not infer a native header height, and `window.isGravity` only opts into the Gravity shell—not a guessed inset. There is no SDK call, iframe-height probe, or network request in this adapter.

If the actual embedding geometry is known, set this before the game script runs:

```js
window.DOCCHI_HOST_LAYOUT = {
  shell: 'gravity',
  topInsetPx: 74, // measured obstruction, not safe-area padding
  bottomInsetPx: 0,
  viewportAlreadyInset: false
};
```

`topInsetPx`/`bottomInsetPx` are authoritative host-obstruction values and override the legacy profile. If the host has already reduced the webview viewport to exclude its chrome, set `viewportAlreadyInset: true`; this wins over all inset values and resolves both to zero. Do not provide both a profile and measured values unless the measured values should take precedence.

For an explicit, provisional legacy profile (only where the host has no measured geometry), choose one at deployment:

```js
window.DOCCHI_HOST_LAYOUT = { shell: 'gravity', profile: 'legacy-74' };
// or profile: 'legacy-98'
```

The 74px/98px values are user-provided historical profile values, not measured in this build. They are never selected by viewport size or Gravity detection alone. CSS uses `max(OS safe-area, host obstruction) + 8px/10px gutter`, not their sum. With no profile/config, Gravity gets only OS safe-area plus gutter. Standalone gets no Gravity obstruction, only OS safe-area plus gutter.

Keyboard handling changes only `--app-viewport-height` while a text field is focused and only if `visualViewport.height` exists. It does not blur inputs or infer an unavailable keyboard height. Native Gravity/webview geometry, notch behavior, keyboard resize policy, and these profile values remain unverified on device.

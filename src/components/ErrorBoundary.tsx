import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

// Without this, an uncaught error anywhere in the tree (e.g. a
// localStorage write that throws QuotaExceededError once the browser's
// storage limit is hit — see useAppStore.ts) unmounts the whole app to a
// silent blank white screen, with nothing telling the person what
// happened or that a reload might fix it. This catches that instead.
//
// It only catches errors during render/lifecycle, per React's rules —
// the localStorage try/catch in useAppStore.ts is the first line of
// defense for that specific case; this is the backstop for anything else
// that isn't (or can't be) individually guarded.
export class ErrorBoundary extends React.Component<Props, State> {
  // Explicitly re-declared: this project has no @types/react installed
  // (react ships its own types in newer releases, but not this pinned
  // one), so React.Component resolves as an untyped base here — and a
  // class extending an untyped base only exposes members it re-declares
  // itself, not ones it would normally inherit. `state` below doesn't
  // need the same treatment since assigning it as a typed field already
  // declares it.
  declare props: Readonly<Props>;
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error('Uncaught error, showing fallback screen:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center bg-psu-bg">
          <div className="w-16 h-16 rounded-2xl bg-psu-rejected/10 text-psu-rejected flex items-center justify-center mb-5 text-2xl font-black">
            !
          </div>
          <h2 className="text-lg font-black text-psu-gray">Something went wrong</h2>
          <p className="mt-2 text-sm text-psu-gray/50 max-w-xs">
            Reloading usually fixes this. If it keeps happening, your
            device's local storage may be full — try clearing older data
            from Admin, or free up space on your device.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 px-6 py-3 bg-psu-blue text-white rounded-xl font-bold text-sm"
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// jsdom lays nothing out, so it has no ResizeObserver. One that never reports is what it would see;
// a spec that needs a width stubs its own.
globalThis.ResizeObserver ??= class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
} as unknown as typeof ResizeObserver;

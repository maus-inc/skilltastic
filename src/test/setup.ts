import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => cleanup());

// motion/react probes matchMedia for reducedMotion="user"; jsdom has none
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

// layout animations measure with ResizeObserver
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof globalThis.ResizeObserver;
}

// deletes confirm — let them through in tests
window.confirm = () => true;

// jsdom implements no scrolling APIs
if (typeof Element.prototype.scrollTo !== "function") {
  Element.prototype.scrollTo = () => {};
}
if (typeof Element.prototype.scrollIntoView !== "function") {
  Element.prototype.scrollIntoView = () => {};
}

// jsdom has no layout engine; CodeMirror 6's view measurement needs the
// Range rect APIs to exist (zeros are fine — tests assert structure,
// not geometry)
if (typeof Range !== "undefined") {
  const rects = () => {
    const arr: DOMRect[] = [];
    return Object.assign(arr, {
      item: (i: number) => arr[i] ?? null,
    }) as unknown as DOMRectList;
  };
  if (typeof Range.prototype.getClientRects !== "function") {
    Range.prototype.getClientRects = rects;
  }
  if (typeof Range.prototype.getBoundingClientRect !== "function") {
    Range.prototype.getBoundingClientRect = () =>
      ({ x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, toJSON: () => ({}) }) as DOMRect;
  }
}

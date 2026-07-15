/** Lazy singleton loader for OpenCV.js (@techstark/opencv-js). The module is
 *  ~10 MB of wasm, so it is only imported when contour detection first runs,
 *  and the WASM runtime init is awaited exactly once. */

// The opencv-js typings are incomplete for the calls we use, so the loader
// deliberately returns the module as `any`-shaped `CvModule`.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CvModule = any;

let cvPromise: Promise<CvModule> | null = null;

const INIT_TIMEOUT_MS = 30000;

export function loadOpenCV(): Promise<CvModule> {
  if (!cvPromise) {
    cvPromise = import("@techstark/opencv-js").then(async (mod) => {
      let cv: CvModule = (mod as { default?: CvModule }).default ?? mod;
      // opencv-js v5 default-exports a thenable resolving to the module
      if (typeof cv?.then === "function") cv = await cv;
      if (cv.Mat) return cv;
      return new Promise<CvModule>((resolve, reject) => {
        const done = () => {
          clearInterval(poll);
          clearTimeout(bail);
          resolve(cv);
        };
        cv.onRuntimeInitialized = done;
        // some builds miss the callback if the runtime is already up — poll too
        const poll = setInterval(() => {
          if (cv.Mat) done();
        }, 50);
        const bail = setTimeout(() => {
          clearInterval(poll);
          reject(new Error("OpenCV runtime failed to initialize"));
        }, INIT_TIMEOUT_MS);
      });
    });
    // allow a retry on failure instead of caching the rejection
    cvPromise.catch(() => {
      cvPromise = null;
    });
  }
  return cvPromise;
}

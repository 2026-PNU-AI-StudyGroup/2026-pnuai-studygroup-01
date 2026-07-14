export class TranslationGate {
  private active = false;

  tryAcquire(): (() => void) | null {
    if (this.active) return null;
    this.active = true;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.active = false;
    };
  }
}

const translationGlobal = globalThis as typeof globalThis & {
  pmsTranslationGate?: TranslationGate;
};

export const translationGate =
  translationGlobal.pmsTranslationGate ??= new TranslationGate();

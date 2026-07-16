export class TranslationGate {
  private active = false;
  private readonly cooldownUntil = new Map<string, number>();

  constructor(
    private readonly cooldownMs = 5_000,
    private readonly now: () => number = Date.now,
  ) {}

  tryAcquire(userId: string): (() => void) | null {
    const acquiredAt = this.now();
    for (const [id, until] of this.cooldownUntil) {
      if (until <= acquiredAt) this.cooldownUntil.delete(id);
    }
    if (this.active) return null;
    if ((this.cooldownUntil.get(userId) ?? 0) > acquiredAt) return null;
    this.active = true;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.active = false;
      this.cooldownUntil.set(userId, this.now() + this.cooldownMs);
    };
  }
}

const translationGlobal = globalThis as typeof globalThis & {
  pmsTranslationGate?: TranslationGate;
};

export const translationGate =
  translationGlobal.pmsTranslationGate ??= new TranslationGate();

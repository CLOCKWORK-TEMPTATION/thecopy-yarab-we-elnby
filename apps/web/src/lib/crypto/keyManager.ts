/**
 * مدير المفاتيح المحلي
 * Key Manager for Zero-Knowledge Architecture
 *
 * يدير دورة حياة المفاتيح في الذاكرة و IndexedDB
 * لا يتم مزامنة أي مفاتيح مع السيرفر
 */

/**
 * مدير المفاتيح
 */
export class KeyManager {
  private static instance: KeyManager;
  private kek: CryptoKey | null = null;

  private constructor() {
    /* empty */
  }

  /**
   * الحصول على المثيل الوحيد (Singleton)
   */
  public static getInstance(): KeyManager {
    if (!KeyManager.instance) {
      KeyManager.instance = new KeyManager();
    }
    return KeyManager.instance;
  }

  /**
   * تعيين KEK في الذاكرة
   */
  public setKEK(kek: CryptoKey): void {
    this.kek = kek;
  }

  /**
   * الحصول على KEK من الذاكرة
   */
  public getKEK(): CryptoKey | null {
    return this.kek;
  }

  /**
   * التحقق من وجود KEK
   */
  public hasKEK(): boolean {
    return this.kek !== null;
  }

  /**
   * مسح KEK من الذاكرة
   */
  public clearKEK(): void {
    this.kek = null;
  }

  /**
   * إنهاء الجلسة (مسح المفاتيح من الذاكرة)
   */
  public endSession(): void {
    this.clearKEK();
  }

  /**
   * حذف كامل (إنهاء الجلسة)
   */
  public fullLogout(): void {
    this.clearKEK();
  }
}

/**
 * الحصول على مدير المفاتيح
 */
export function getKeyManager(): KeyManager {
  return KeyManager.getInstance();
}

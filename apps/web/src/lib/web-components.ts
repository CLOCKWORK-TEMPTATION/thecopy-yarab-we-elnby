/**
 * Web Components Guard
 *
 * This utility prevents "DOMException: Failed to execute 'define' on 'CustomElementRegistry'"
 * errors when trying to register the same custom element multiple times.
 *
 * Use this instead of customElements.define() directly.
 */

/**
 * Safely define a custom element only if it hasn't been defined yet
 *
 * @param name - The custom element tag name (e.g., 'mce-autosize-textarea')
 * @param constructor - The custom element constructor class
 *
 * @example
 * defineOnce('mce-autosize-textarea', AutosizeTextareaElement);
 */
export function defineOnce(
  name: string,
  constructor: CustomElementConstructor
): void {
  if (typeof window === "undefined") {
    // Server-side rendering guard
    return;
  }

  if (!customElements.get(name)) {
    customElements.define(name, constructor);
  }
}

/**
 * Check if a custom element is already defined
 *
 * @param name - The custom element tag name
 * @returns true if the element is already defined
 */
export function isDefined(name: string): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return customElements.get(name) !== undefined;
}

/**
 * Wait for a custom element to be defined
 *
 * @param name - The custom element tag name
 * @returns Promise that resolves when the element is defined
 */
export async function whenDefined(name: string): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }

  await customElements.whenDefined(name);
}

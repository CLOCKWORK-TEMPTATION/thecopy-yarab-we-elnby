import type { ThreeElements } from "@react-three/fiber";
import type { ComponentType, CSSProperties, FC, ReactNode, Ref } from "react";

declare module '*.json' {
  const content: unknown;
  export default content;
}

declare module '*.md' {
  const content: string;
  export default content;
}

declare module '*.mdx' {
  const MDXComponent: ComponentType;
  export default MDXComponent;
}

declare module '*.css' {
  const content: Readonly<Record<string, string>>;
  export default content;
}

declare module '*.scss' {
  const content: Readonly<Record<string, string>>;
  export default content;
}

declare module '*.sass' {
  const content: Readonly<Record<string, string>>;
  export default content;
}

// Web Workers
declare module '*.worker.ts' {
  class WebpackWorker extends Worker {
    constructor();
  }
  export default WebpackWorker;
}

declare module '*.worker.js' {
  class WebpackWorker extends Worker {
    constructor();
  }
  export default WebpackWorker;
}

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

// Extend React namespace for custom props
declare module "react" {
  type CSSProperties = Record<`--${string}`, string | number | undefined>;
}

declare module "react" {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {
      primitive: ThreeElements["primitive"];
    }
  }
}

declare module "react/jsx-runtime" {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {
      primitive: ThreeElements["primitive"];
    }
  }
}

declare module "react/jsx-dev-runtime" {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {
      primitive: ThreeElements["primitive"];
    }
  }
}

// Sonner toast library
declare module 'sonner' {
  export interface ToastOptions {
    id?: string | number;
    duration?: number;
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center';
    dismissible?: boolean;
    icon?: ReactNode;
    description?: ReactNode;
    action?: {
      label: string;
      onClick: () => void;
    };
    cancel?: {
      label: string;
      onClick?: () => void;
    };
    onDismiss?: (toast: { id: string | number }) => void;
    onAutoClose?: (toast: { id: string | number }) => void;
    className?: string;
    descriptionClassName?: string;
    style?: CSSProperties;
  }

  export interface ToastT {
    id: string | number;
    title?: string | ReactNode;
    description?: ReactNode;
    duration?: number;
    delete?: boolean;
  }

  export function toast(message: string | ReactNode, options?: ToastOptions): string | number;
  export namespace toast {
    function success(message: string | ReactNode, options?: ToastOptions): string | number;
    function error(message: string | ReactNode, options?: ToastOptions): string | number;
    function warning(message: string | ReactNode, options?: ToastOptions): string | number;
    function info(message: string | ReactNode, options?: ToastOptions): string | number;
    function promise<T>(
      promise: Promise<T>,
      options: {
        loading: string | ReactNode;
        success: string | ReactNode | ((data: T) => string | ReactNode);
        error: string | ReactNode | ((error: unknown) => string | ReactNode);
        duration?: number;
      }
    ): Promise<T>;
    function custom(jsx: ReactNode, options?: ToastOptions): string | number;
    function message(message: string | ReactNode, options?: ToastOptions): string | number;
    function dismiss(id?: string | number): void;
    function loading(message: string | ReactNode, options?: ToastOptions): string | number;
  }

  export interface ToasterProps {
    position?: ToastOptions['position'];
    hotkey?: string[];
    expand?: boolean;
    richColors?: boolean;
    duration?: number;
    visibleToasts?: number;
    closeButton?: boolean;
    toastOptions?: ToastOptions;
    className?: string;
    style?: CSSProperties;
    offset?: string | number;
    dir?: 'ltr' | 'rtl' | 'auto';
    theme?: 'light' | 'dark' | 'system';
    icons?: {
      success?: ReactNode;
      info?: ReactNode;
      warning?: ReactNode;
      error?: ReactNode;
      loading?: ReactNode;
    };
  }

  export const Toaster: FC<ToasterProps>;
}

// Tiptap Pro Pages Extension (dist files missing from registry package)
declare module '@tiptap-pro/extension-pages' {
  import { Extension } from '@tiptap/core';
  export const Pages: Extension;
}

// React Window
declare module 'react-window' {
  export interface GridChildComponentProps<T = unknown> {
    columnIndex: number;
    rowIndex: number;
    style: CSSProperties;
    data: T;
    isScrolling?: boolean;
  }

  export interface ListChildComponentProps<T = unknown> {
    index: number;
    style: CSSProperties;
    data: T;
    isScrolling?: boolean;
  }

  export interface GridProps<T = unknown> {
    children: ComponentType<GridChildComponentProps<T>>;
    columnCount: number;
    columnWidth: number | ((index: number) => number);
    height: number;
    rowCount: number;
    rowHeight: number | ((index: number) => number);
    width: number;
    itemData?: T;
    className?: string;
    style?: CSSProperties;
    direction?: 'ltr' | 'rtl';
    initialScrollLeft?: number;
    initialScrollTop?: number;
    innerRef?: Ref<HTMLDivElement>;
    innerElementType?: string | ComponentType;
    innerTagName?: string;
    itemKey?: (params: { columnIndex: number; rowIndex: number; data: T }) => string | number;
    onItemsRendered?: (props: {
      overscanColumnStartIndex: number;
      overscanColumnStopIndex: number;
      overscanRowStartIndex: number;
      overscanRowStopIndex: number;
      visibleColumnStartIndex: number;
      visibleColumnStopIndex: number;
      visibleRowStartIndex: number;
      visibleRowStopIndex: number;
    }) => void;
    onScroll?: (props: {
      horizontalScrollDirection: 'forward' | 'backward';
      scrollLeft: number;
      scrollTop: number;
      scrollUpdateWasRequested: boolean;
      verticalScrollDirection: 'forward' | 'backward';
    }) => void;
    outerRef?: Ref<HTMLDivElement>;
    outerElementType?: string | ComponentType;
    outerTagName?: string;
    overscanColumnCount?: number;
    overscanRowCount?: number;
    useIsScrolling?: boolean;
  }

  export interface ListProps<T = unknown> {
    children: ComponentType<ListChildComponentProps<T>>;
    height: number;
    itemCount: number;
    itemSize: number | ((index: number) => number);
    width: number | string;
    itemData?: T;
    className?: string;
    style?: CSSProperties;
    direction?: 'ltr' | 'rtl';
    initialScrollOffset?: number;
    innerRef?: Ref<HTMLDivElement>;
    innerElementType?: string | ComponentType;
    innerTagName?: string;
    itemKey?: (index: number, data: T) => string | number;
    layout?: 'horizontal' | 'vertical';
    onItemsRendered?: (props: {
      overscanStartIndex: number;
      overscanStopIndex: number;
      visibleStartIndex: number;
      visibleStopIndex: number;
    }) => void;
    onScroll?: (props: {
      scrollDirection: 'forward' | 'backward';
      scrollOffset: number;
      scrollUpdateWasRequested: boolean;
    }) => void;
    outerRef?: Ref<HTMLDivElement>;
    outerElementType?: string | ComponentType;
    outerTagName?: string;
    overscanCount?: number;
    useIsScrolling?: boolean;
  }

  export const FixedSizeGrid: ComponentType<GridProps<unknown>>;
  export const VariableSizeGrid: ComponentType<GridProps<unknown>>;
  export const FixedSizeList: ComponentType<ListProps<unknown>>;
  export const VariableSizeList: ComponentType<ListProps<unknown>>;

  export function areEqual<P>(prevProps: Readonly<P>, nextProps: Readonly<P>): boolean;
  export function shouldComponentUpdate<P>(
    this: { props: Readonly<P> },
    nextProps: Readonly<P>,
    nextState: unknown
  ): boolean;
}

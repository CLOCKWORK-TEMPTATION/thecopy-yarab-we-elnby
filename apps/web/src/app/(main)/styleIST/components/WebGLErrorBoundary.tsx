"use client";

import { Component, ErrorInfo, ReactNode } from "react";

import { logger } from "@/lib/ai/utils/logger";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class WebGLErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error("WebGL Error caught", { error, errorInfo });
  }

  public override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="w-full h-full flex items-center justify-center bg-black/40 rounded-lg p-8 backdrop-blur-sm border border-white/8">
          <div className="text-center text-white/60">
            <div className="text-4xl mb-4">🎬</div>
            <p className="text-sm">3D Preview Unavailable</p>
            <p className="text-xs mt-2 opacity-60">
              WebGL not supported in this environment
            </p>
            {this.state.error?.message && (
              <p className="mt-2 text-xs opacity-50">
                {this.state.error.message}
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default WebGLErrorBoundary;

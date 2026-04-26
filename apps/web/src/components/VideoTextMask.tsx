import { forwardRef, useState } from "react";

import { createModuleLogger } from "@/lib/logger";

const logger = createModuleLogger("components.video-text-mask");

interface VideoTextMaskProps {
  videoSrc: string;
  text: string;
  className?: string;
}

export const VideoTextMask = forwardRef<HTMLDivElement, VideoTextMaskProps>(
  ({ videoSrc, text, className = "" }, ref) => {
    // Error handling: Track video loading failures
    const [hasError, setHasError] = useState(false);

    return (
      <div className={`relative ${className}`}>
        <div ref={ref} className="absolute inset-0 w-full h-full">
          {!hasError && (
            <video
              autoPlay
              loop
              muted
              playsInline
              onError={(e) => {
                logger.warn(
                  { videoSrc, mediaError: e.currentTarget.error },
                  "video failed to load",
                );
                setHasError(true);
              }}
              className="video-text-mask__video absolute top-1/2 left-1/2 w-full h-full min-w-full min-h-full object-cover -translate-x-1/2 -translate-y-1/2"
              src={videoSrc}
            />
          )}

          <div className="video-text-mask__overlay absolute top-0 left-0 w-full h-full flex items-center justify-center bg-white">
            <h1 className="video-text-mask__title">{text}</h1>
          </div>
        </div>

        <div className="absolute inset-0 -z-10 bg-black" />
      </div>
    );
  }
);

VideoTextMask.displayName = "VideoTextMask";

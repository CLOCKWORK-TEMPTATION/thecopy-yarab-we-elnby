import React, { useState } from "react";

interface ExternalAppFrameProps {
  title: string;
  url: string;
}

const ExternalAppFrame: React.FC<ExternalAppFrameProps> = ({ title, url }) => {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  return (
    <div className="w-full h-full flex flex-col">
      {loading && !err && (
        <div className="p-4 text-sm text-center">جاري التحميل...</div>
      )}
      {err && (
        <div className="p-4 text-red-600 text-sm text-center">
          فشل تحميل {title}: {err}
        </div>
      )}

      <iframe
        src={url}
        title={title}
        className="w-full h-full border-0"
        onLoad={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setErr("خطأ في الشبكة أو المحتوى");
        }}
        allow="fullscreen; clipboard-read; clipboard-write"
        allowFullScreen
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
      />
    </div>
  );
};

export default ExternalAppFrame;

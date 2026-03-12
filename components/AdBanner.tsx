"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

export default function AdBanner() {
  useEffect(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {}
  }, []);

  return (
    <div className="w-full bg-gray-900 border-t border-gray-800 flex justify-center py-1">
      <ins
        className="adsbygoogle"
        style={{ display: "block", width: "100%", height: "60px" }}
        data-ad-client="ca-pub-2942034959680617"
        data-ad-slot="XXXXXXXXXX"
        data-ad-format="horizontal"
        data-full-width-responsive="true"
      />
    </div>
  );
}

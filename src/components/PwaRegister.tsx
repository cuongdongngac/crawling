"use client";

import { useEffect } from "react";

/** Đăng ký service worker (chỉ bản build production, để lúc dev không bị cache gây rối). */
export default function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch(() => {
        /* không có service worker thì web vẫn chạy bình thường */
      });
  }, []);
  return null;
}

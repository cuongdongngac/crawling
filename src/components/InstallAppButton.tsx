"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Download, Share, PlusSquare, X } from "lucide-react";

// Sự kiện Chrome/Edge/Samsung Internet trên Android bắn ra khi web cài được.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Platform = "server" | "installed" | "ios" | "other";

function readPlatform(): Platform {
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (standalone) return "installed";
  const ua = navigator.userAgent;
  const ios =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  return ios ? "ios" : "other";
}

function subscribe(cb: () => void) {
  const mq = window.matchMedia("(display-mode: standalone)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

/**
 * Nút "Cài ứng dụng" trên thanh đầu trang.
 * - Android (Chrome…): bấm là hiện hộp thoại cài của hệ điều hành.
 * - iPhone/iPad: Safari không cho nút cài tự động → hiện hướng dẫn "Chia sẻ → Thêm vào MH chính".
 * - Đã mở dưới dạng app (standalone) hoặc trình duyệt máy tính không hỗ trợ: không hiện gì.
 */
export default function InstallAppButton() {
  const platform = useSyncExternalStore<Platform>(subscribe, readPlatform, () => "server");
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHelp, setShowIosHelp] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setDeferred(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (platform === "server" || platform === "installed") return null;

  if (platform === "ios") {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIosHelp(true)}
          className="md:hidden inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-700 text-white text-sm font-semibold"
        >
          <Download className="w-4 h-4" /> Cài ứng dụng
        </button>
        {/* Gắn vào <body>: thanh đầu trang dùng backdrop-blur sẽ "nhốt" phần tử fixed nếu để bên trong */}
        {showIosHelp &&
          createPortal(
          <div
            className="fixed inset-0 z-[100] bg-black/50 flex items-end justify-center p-3"
            onClick={() => setShowIosHelp(false)}
          >
            <div
              className="w-full max-w-sm bg-white rounded-2xl p-5 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-bold text-stone-900">Cài lên màn hình chính</h3>
                <button type="button" onClick={() => setShowIosHelp(false)} aria-label="Đóng">
                  <X className="w-5 h-5 text-stone-500" />
                </button>
              </div>
              <ol className="space-y-3 text-sm text-stone-700">
                <li className="flex gap-2">
                  <span className="font-bold">1.</span>
                  <span>
                    Mở trang này bằng <b>Safari</b>, bấm nút <b>Chia sẻ</b>{" "}
                    <Share className="inline w-4 h-4 -mt-1" /> ở thanh dưới.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold">2.</span>
                  <span>
                    Chọn <b>Thêm vào MH chính</b> <PlusSquare className="inline w-4 h-4 -mt-1" />{" "}
                    rồi bấm <b>Thêm</b>.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold">3.</span>
                  <span>
                    Mở biểu tượng <b>VPHA Quét</b> trên màn hình chính và đăng nhập một lần nữa.
                  </span>
                </li>
              </ol>
            </div>
          </div>,
          document.body
        )}
      </>
    );
  }

  if (!deferred) return null;
  return (
    <button
      type="button"
      onClick={async () => {
        await deferred.prompt();
        await deferred.userChoice;
        setDeferred(null);
      }}
      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-700 text-white text-sm font-semibold"
    >
      <Download className="w-4 h-4" /> Cài ứng dụng
    </button>
  );
}

"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  KeyRound,
  LogOut,
  UserCircle,
  Users,
  Tags
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

interface HeaderMenuProps {
  isAdmin: boolean;
  userEmail?: string;
}

export default function HeaderMenu({ isAdmin, userEmail }: HeaderMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 pl-2 pr-4 py-1.5 rounded-full hover:bg-stone-100 transition-all duration-200 border border-transparent hover:border-stone-200"
      >
        <div className="size-8 rounded-full bg-linear-to-br from-stone-800 to-stone-600 text-white flex items-center justify-center font-bold shadow-sm">
          {userEmail ? (
            userEmail.charAt(0).toUpperCase()
          ) : (
            <UserCircle className="size-5" />
          )}
        </div>
        <ChevronDown
          className={`size-4 text-stone-500 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-stone-200/60 py-2 z-50 overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-stone-100 bg-stone-50/50">
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-0.5">
                Tài khoản {isAdmin && "(Admin)"}
              </p>
              <p className="text-sm font-medium text-stone-900 truncate">
                {userEmail || "Khách"}
              </p>
            </div>

            <div className="py-1">
              {isAdmin && (
                <>
                  <Link
                    href="/dashboard/users"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-stone-700 hover:text-amber-700 hover:bg-amber-50 transition-colors"
                  >
                    <Users className="size-4" />
                    Quản lý Người dùng
                  </Link>
                  <Link
                    href="/dashboard/hashtag-groups"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-stone-700 hover:text-amber-700 hover:bg-amber-50 transition-colors"
                  >
                    <Tags className="size-4" />
                    Nhóm Từ khóa (Groups)
                  </Link>
                  <Link
                    href="/dashboard/hashtags"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-stone-700 hover:text-amber-700 hover:bg-amber-50 transition-colors"
                  >
                    <Tags className="size-4" />
                    Từ khóa (Hashtags)
                  </Link>
                </>
              )}
              
              <button
                onClick={() => {
                  setIsOpen(false);
                  alert("Tính năng đổi mật khẩu sẽ được cập nhật sau!");
                }}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-stone-700 hover:text-amber-700 hover:bg-amber-50 transition-colors w-full text-left"
              >
                <KeyRound className="size-4" />
                Đổi mật khẩu
              </button>

              <form action="/auth/signout" method="post" className="w-full">
                <button
                  type="submit"
                  className="flex flex-row items-center gap-2 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors w-full text-left"
                >
                  <LogOut className="size-4" />
                  Đăng xuất
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

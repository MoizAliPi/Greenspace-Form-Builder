"use client";

import * as Toast from "@radix-ui/react-toast";
import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

type ToastContextValue = {
  success: (message: string) => void;
};

const ToastCtx = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");

  const success = useCallback((msg: string) => {
    setMessage(msg);
    setOpen(true);
  }, []);

  return (
    <ToastCtx.Provider value={{ success }}>
      <Toast.Provider duration={3000} swipeDirection="up">
        {children}
        <Toast.Root
          open={open}
          onOpenChange={setOpen}
          className="pointer-events-auto z-[100] w-full max-w-[min(420px,calc(100vw-2rem))] rounded-lg border border-primary/50 bg-primary px-4 py-3 shadow-lg shadow-primary/20"
        >
          <Toast.Title className="text-center text-sm font-medium text-primary-foreground">
            {message}
          </Toast.Title>
        </Toast.Root>
        <Toast.Viewport className="fixed left-0 right-0 top-0 z-[100] flex max-h-screen flex-col items-center gap-2 p-4 pt-6 outline-none" />
      </Toast.Provider>
    </ToastCtx.Provider>
  );
}

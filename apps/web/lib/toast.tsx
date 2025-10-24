"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

export type ToastType = "success" | "error" | "info" | "loading";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (message: string, type: ToastType, duration?: number) => string;
  hideToast: (id: string) => void;
  updateToast: (id: string, message: string, type: ToastType) => void;
  confirm: (
    message: string,
    options?: {
      confirmText?: string;
      cancelText?: string;
      confirmVariant?: "danger" | "primary";
    }
  ) => Promise<boolean>;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

interface ConfirmDialog {
  message: string;
  confirmText: string;
  cancelText: string;
  confirmVariant: "danger" | "primary";
  resolve: (value: boolean) => void;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog | null>(
    null
  );

  const showToast = useCallback(
    (message: string, type: ToastType, duration = 5000): string => {
      const id = Math.random().toString(36).substring(7);
      const newToast: Toast = { id, message, type, duration };

      setToasts((prev) => [...prev, newToast]);

      // Auto-remove toast after duration (except for loading toasts)
      if (type !== "loading" && duration > 0) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, duration);
      }

      return id;
    },
    []
  );

  const hideToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const updateToast = useCallback(
    (id: string, message: string, type: ToastType) => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, message, type } : t))
      );

      // Auto-remove after duration if not loading
      if (type !== "loading") {
        setTimeout(() => {
          hideToast(id);
        }, 5000);
      }
    },
    [hideToast]
  );

  const confirm = useCallback(
    (
      message: string,
      options?: {
        confirmText?: string;
        cancelText?: string;
        confirmVariant?: "danger" | "primary";
      }
    ): Promise<boolean> => {
      return new Promise((resolve) => {
        setConfirmDialog({
          message,
          confirmText: options?.confirmText || "Confirm",
          cancelText: options?.cancelText || "Cancel",
          confirmVariant: options?.confirmVariant || "primary",
          resolve,
        });
      });
    },
    []
  );

  const handleConfirmClose = useCallback(
    (confirmed: boolean) => {
      if (confirmDialog) {
        confirmDialog.resolve(confirmed);
        setConfirmDialog(null);
      }
    },
    [confirmDialog]
  );

  return (
    <ToastContext.Provider
      value={{ toasts, showToast, hideToast, updateToast, confirm }}
    >
      {children}
      <ToastContainer toasts={toasts} onDismiss={hideToast} />
      {confirmDialog && (
        <ConfirmDialogModal
          message={confirmDialog.message}
          confirmText={confirmDialog.confirmText}
          cancelText={confirmDialog.cancelText}
          confirmVariant={confirmDialog.confirmVariant}
          onClose={handleConfirmClose}
        />
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: string) => void;
}) {
  const bgColor =
    toast.type === "success"
      ? "bg-green-50 border-green-200"
      : toast.type === "error"
        ? "bg-red-50 border-red-200"
        : toast.type === "loading"
          ? "bg-blue-50 border-blue-200"
          : "bg-gray-50 border-gray-200";

  const textColor =
    toast.type === "success"
      ? "text-green-800"
      : toast.type === "error"
        ? "text-red-800"
        : toast.type === "loading"
          ? "text-blue-800"
          : "text-gray-800";

  const Icon = () => {
    if (toast.type === "loading") {
      return (
        <svg
          className="animate-spin h-5 w-5 text-blue-600"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      );
    }

    if (toast.type === "success") {
      return (
        <svg
          className="h-5 w-5 text-green-600"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
      );
    }

    if (toast.type === "error") {
      return (
        <svg
          className="h-5 w-5 text-red-600"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clipRule="evenodd"
          />
        </svg>
      );
    }

    return (
      <svg
        className="h-5 w-5 text-gray-600"
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
          clipRule="evenodd"
        />
      </svg>
    );
  };

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-lg border shadow-lg min-w-80 max-w-md ${bgColor} ${textColor} transition-all duration-300 animate-in slide-in-from-right`}
    >
      <Icon />
      <div className="flex-1 text-sm font-medium">{toast.message}</div>
      {toast.type !== "loading" && (
        <button
          onClick={() => onDismiss(toast.id)}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600"
        >
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      )}
    </div>
  );
}

function ConfirmDialogModal({
  message,
  confirmText,
  cancelText,
  confirmVariant,
  onClose,
}: {
  message: string;
  confirmText: string;
  cancelText: string;
  confirmVariant: "danger" | "primary";
  onClose: (confirmed: boolean) => void;
}) {
  const confirmBgColor =
    confirmVariant === "danger"
      ? "bg-red-600 hover:bg-red-700"
      : "bg-blue-600 hover:bg-blue-700";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Confirm Action
        </h3>
        <p className="text-sm text-gray-600 mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={() => onClose(false)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {cancelText}
          </button>
          <button
            onClick={() => onClose(true)}
            className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${confirmBgColor}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

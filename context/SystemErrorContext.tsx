import React, { createContext, useContext, useState, useCallback, useRef } from "react";

export interface SystemErrorInfo {
  code: string;
  requestId?: string;
  message?: string;
}

interface SystemErrorContextValue {
  errorInfo: SystemErrorInfo | null;
  showSystemError: (info: SystemErrorInfo) => void;
  clearSystemError: () => void;
}

const SystemErrorContext = createContext<SystemErrorContextValue>({
  errorInfo: null,
  showSystemError: () => {},
  clearSystemError: () => {},
});

export function SystemErrorProvider({ children }: { children: React.ReactNode }) {
  const [errorInfo, setErrorInfo] = useState<SystemErrorInfo | null>(null);

  const showSystemError = useCallback((info: SystemErrorInfo) => {
    setErrorInfo(info);
  }, []);

  const clearSystemError = useCallback(() => {
    setErrorInfo(null);
  }, []);

  return (
    <SystemErrorContext.Provider value={{ errorInfo, showSystemError, clearSystemError }}>
      {children}
    </SystemErrorContext.Provider>
  );
}

export function useSystemError() {
  return useContext(SystemErrorContext);
}

let _globalShowSystemError: ((info: SystemErrorInfo) => void) | null = null;

export function setGlobalSystemErrorHandler(fn: (info: SystemErrorInfo) => void) {
  _globalShowSystemError = fn;
}

export function triggerSystemError(info: SystemErrorInfo) {
  _globalShowSystemError?.(info);
}

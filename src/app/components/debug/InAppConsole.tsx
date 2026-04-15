import { useState, useEffect } from 'react';

export const InAppConsole = () => {
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    // 기존 console.log 저장
    const originalLog = console.log;

    // console.log 덮어쓰기 (Hooking)
    console.log = (...args) => {
      const msg = args.map(arg => {
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg);
          } catch {
            return String(arg);
          }
        }
        return String(arg);
      }).join(' ');
      
      // 최신 로그가 위로 오도록 추가하고, 최대 20개까지만 유지
      setLogs(prev => [`> ${msg}`, ...prev].slice(0, 20));
      
      // 원래 콘솔에도 출력 (혹시 모르니)
      originalLog(...args);
    };

    // 컴포넌트 언마운트 시 원상복구
    return () => {
      console.log = originalLog;
    };
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-[99999999] bg-black/90 text-[#00ff00] font-mono text-[10px] md:text-xs p-3 rounded-lg border border-[#00ff00]/30 shadow-2xl max-w-[300px] md:max-w-md max-h-[200px] overflow-hidden pointer-events-none backdrop-blur-sm">
      <div className="border-b border-[#00ff00]/30 mb-2 pb-1 text-white font-bold flex justify-between items-center">
        <span>🖥️ SYSTEM LOGS</span>
        <span className="animate-pulse">●</span>
      </div>
      <div className="flex flex-col gap-1 opacity-90">
        {logs.length === 0 ? (
          <div className="text-gray-500 italic">Waiting for events...</div>
        ) : (
          logs.map((log, i) => (
            <div key={i} className="break-all leading-tight">
              {log}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
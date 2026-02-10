
import React, { useState } from 'react';
import { User as UserIcon, Lock, ArrowRight, Building2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { sheetService } from '../services/sheetService';
import { SessionUser } from '../types';
import { AUTH_CONFIG, STORAGE_CONFIG } from '../config/constants';
import { Logger } from '../services/logger';

const log = Logger.create('LoginView');

interface LoginViewProps {
  onLoginSuccess: (user: SessionUser) => void;
}

const MAX_LOGIN_ATTEMPTS = AUTH_CONFIG.MAX_LOGIN_ATTEMPTS;
const LOCKOUT_DURATION_MS = AUTH_CONFIG.LOCKOUT_DURATION_MS;

const getLoginLockState = (): { attempts: number; lockedUntil: number | null } => {
  try {
    const raw = localStorage.getItem('ce_login_lock');
    if (!raw) return { attempts: 0, lockedUntil: null };
    return JSON.parse(raw);
  } catch { return { attempts: 0, lockedUntil: null }; }
};

const setLoginLockState = (attempts: number, lockedUntil: number | null) => {
  localStorage.setItem('ce_login_lock', JSON.stringify({ attempts, lockedUntil }));
};

const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [empId, setEmpId] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remainingAttempts, setRemainingAttempts] = useState(MAX_LOGIN_ATTEMPTS);

  // 初始化時檢查鎖定狀態
  React.useEffect(() => {
    const state = getLoginLockState();
    if (state.lockedUntil && Date.now() < state.lockedUntil) {
      const mins = Math.ceil((state.lockedUntil - Date.now()) / 60000);
      setError(`登入嘗試次數過多，帳號已鎖定 ${mins} 分鐘。 ACCOUNT LOCKED.`);
      setRemainingAttempts(0);
    } else if (state.lockedUntil && Date.now() >= state.lockedUntil) {
      // 鎖定已過期，重置
      setLoginLockState(0, null);
      setRemainingAttempts(MAX_LOGIN_ATTEMPTS);
    } else {
      setRemainingAttempts(MAX_LOGIN_ATTEMPTS - state.attempts);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // 🔒 檢查是否被鎖定
    const lockState = getLoginLockState();
    if (lockState.lockedUntil && Date.now() < lockState.lockedUntil) {
      const mins = Math.ceil((lockState.lockedUntil - Date.now()) / 60000);
      setError(`登入嘗試次數過多，請等待 ${mins} 分鐘後再試。 ACCOUNT LOCKED.`);
      setIsLoading(false);
      return;
    }
    // 如果鎖定已過期，重置
    if (lockState.lockedUntil && Date.now() >= lockState.lockedUntil) {
      setLoginLockState(0, null);
    }

    try {
        // Fetch latest users (including ADMIN) from the service
        const users = await sheetService.getUsers();
        const targetId = empId.trim().toUpperCase();
        const targetPhone = phone.trim();

        const user = users.find(u => u.id.toUpperCase() === targetId);
        
        if (user) {
            // Check Password (Phone)
            if (user.phone === targetPhone) {
                if (user.status === 'suspended') {
                    setError("帳號已被停權，請聯繫管理員。 ACCESS DENIED.");
                } else {
                    // 登入成功，重置失敗計數
                    setLoginLockState(0, null);
                    // Check Role based on ID
                    if (user.id.toUpperCase() === 'ADMIN') {
                        onLoginSuccess({ id: user.id.toUpperCase(), name: user.name, role: 'admin' });
                    } else {
                        onLoginSuccess({ id: user.id.toUpperCase(), name: user.name, role: 'user' });
                    }
                }
            } else {
                // 🔒 登入失敗，增加失敗計數
                const currentState = getLoginLockState();
                const newAttempts = (currentState.attempts || 0) + 1;
                const remaining = MAX_LOGIN_ATTEMPTS - newAttempts;
                
                if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
                  const lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
                  setLoginLockState(newAttempts, lockedUntil);
                  setRemainingAttempts(0);
                  setError(`連續登入失敗 ${MAX_LOGIN_ATTEMPTS} 次，帳號已鎖定 15 分鐘。 ACCOUNT LOCKED.`);
                } else {
                  setLoginLockState(newAttempts, null);
                  setRemainingAttempts(remaining);
                  setError(`驗證失敗，手機號碼(密碼)不正確。還剩 ${remaining} 次嘗試機會。`);
                }
            }
        } else {
            // 🔒 即使找不到用戶也要計數（防止帳號枚舉）
            const currentState = getLoginLockState();
            const newAttempts = (currentState.attempts || 0) + 1;
            const remaining = MAX_LOGIN_ATTEMPTS - newAttempts;

            if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
              const lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
              setLoginLockState(newAttempts, lockedUntil);
              setRemainingAttempts(0);
              setError(`連續登入失敗 ${MAX_LOGIN_ATTEMPTS} 次，帳號已鎖定 15 分鐘。 ACCOUNT LOCKED.`);
            } else {
              setLoginLockState(newAttempts, null);
              setRemainingAttempts(remaining);
              // 使用通用錯誤訊息，避免洩漏「帳號是否存在」的資訊
              setError(`驗證失敗，員工編號或密碼不正確。還剩 ${remaining} 次嘗試機會。`);
            }
        }
    } catch (err) {
        console.error(err);
        setError("系統連線錯誤，請稍後重試。 CONNECTION ERROR.");
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans text-zinc-300">
      
      {/* Background Decor */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,18,18,0)_1px,transparent_1px),linear-gradient(90deg,rgba(18,18,18,0)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_80%)] opacity-20 pointer-events-none"></div>
      <div className="absolute top-0 left-0 w-full h-1/2 bg-neon-orange/5 skew-y-6 origin-top-left -translate-y-20 blur-3xl rounded-full opacity-30 pointer-events-none"></div>
      
      <div className="w-full max-w-md bg-black/80 backdrop-blur-xl rounded-sm border border-zinc-800 shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden relative z-10 group">
        
        {/* Animated Border Top */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-neon-orange to-transparent opacity-50"></div>

        {/* Header */}
        <div className="p-10 text-center border-b border-zinc-800 relative">
          <div className="w-16 h-16 border-2 border-neon-orange/50 text-neon-orange rounded-full mx-auto flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(255,107,0,0.2)] bg-black">
            <Building2 className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-[0.2em] uppercase">CleanEstate AI</h1>
          <p className="text-neon-orange text-[10px] font-mono mt-2 tracking-widest uppercase opacity-80">Enterprise Neural Network v2.5</p>
        </div>

        {/* Form */}
        <div className="p-8 pt-10">
          <form onSubmit={handleLogin} className="space-y-6">
            
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                <UserIcon className="w-3 h-3 text-neon-orange" />
                Employee ID (員工編號)
              </label>
              <input 
                type="text" 
                placeholder="例如: A888 或 ADMIN"
                value={empId}
                onChange={(e) => setEmpId(e.target.value)}
                className="w-full px-4 py-3 bg-[#0a0a0a] border border-zinc-800 rounded-sm text-white focus:border-neon-orange focus:ring-1 focus:ring-neon-orange/50 outline-none transition-all placeholder-zinc-700 font-mono text-sm uppercase"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                <Lock className="w-3 h-3 text-neon-orange" />
                Access Code (手機號碼)
              </label>
              <input 
                type="password" 
                placeholder="••••••••••"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-3 bg-[#0a0a0a] border border-zinc-800 rounded-sm text-white focus:border-neon-orange focus:ring-1 focus:ring-neon-orange/50 outline-none transition-all placeholder-zinc-700 font-mono text-sm tracking-widest"
                required
              />
            </div>

            {error && (
                <div className="bg-red-950/30 text-red-500 p-3 rounded-sm text-xs flex items-center gap-2 border border-red-900/50 animate-pulse font-mono">
                    <AlertTriangle size={14} />
                    {error}
                </div>
            )}

            <button 
              type="submit"
              disabled={isLoading || remainingAttempts <= 0}
              className={`w-full py-4 rounded-sm font-bold text-black shadow-lg flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5 uppercase tracking-widest text-xs ${
                (isLoading || remainingAttempts <= 0) 
                  ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700' 
                  : 'bg-neon-orange hover:bg-white border border-transparent shadow-[0_0_20px_rgba(255,107,0,0.4)]'
              }`}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-zinc-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>驗證中 Authenticating...</span>
                </>
              ) : (
                <>
                  <span>登入系統 System Login</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer Bar */}
        <div className="bg-black/50 p-4 border-t border-zinc-900 text-center flex items-center justify-center gap-2">
             <ShieldCheck size={12} className="text-zinc-600" />
             <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-mono">Secure Connection // Internal Use Only</p>
        </div>
      </div>
    </div>
  );
};

export default LoginView;

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Sun, ShieldAlert, KeyRound, User, Eye, EyeOff, LogIn } from 'lucide-react';
import { getDBState } from '../data/databaseState';
import { Employee } from '../types';

interface LoginProps {
  onLogin: (employee: Employee) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  // ==========================================================
  // ЗАЩИТА ОТ БРУТФОРСА
  // ==========================================================
  const [loginAttempts, setLoginAttempts] = useState(() => {
    const saved = localStorage.getItem('maria_ra_login_attempts');
    return saved ? parseInt(saved) : 0;
  });

  const [blockedUntil, setBlockedUntil] = useState(() => {
    const saved = localStorage.getItem('maria_ra_blocked_until');
    return saved ? new Date(parseInt(saved)) : null;
  });

  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isBlocked, setIsBlocked] = useState(false);

  const MAX_ATTEMPTS = 5;
  const BLOCK_DURATION = 5 * 60 * 1000;

  useEffect(() => {
    localStorage.setItem('maria_ra_login_attempts', String(loginAttempts));
  }, [loginAttempts]);

  useEffect(() => {
    if (blockedUntil) {
      localStorage.setItem('maria_ra_blocked_until', String(blockedUntil.getTime()));
    }
  }, [blockedUntil]);

  useEffect(() => {
    if (!blockedUntil) {
      setIsBlocked(false);
      return;
    }

    const now = new Date();
    const diff = blockedUntil.getTime() - now.getTime();

    if (diff <= 0) {
      setIsBlocked(false);
      setBlockedUntil(null);
      setLoginAttempts(0);
      localStorage.removeItem('maria_ra_blocked_until');
      return;
    }

    setIsBlocked(true);
    setTimeLeft(Math.ceil(diff / 1000));

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsBlocked(false);
          setBlockedUntil(null);
          setLoginAttempts(0);
          localStorage.removeItem('maria_ra_blocked_until');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [blockedUntil]);

  // ==========================================================
  // ОСТАЛЬНЫЕ ФУНКЦИИ
  // ==========================================================

  const roleMap: Record<string, string> = {
    'role_dir': 'Директор магазина',
    'role_acc': 'Старший бухгалтер',
    'role_mer': 'Старший товаровед',
    'role_tra': 'Товаровед-кассир'
  };

  const avatarColors: Record<string, string> = {
    '1': 'bg-emerald-500',
    '2': 'bg-amber-500',
    '3': 'bg-blue-500',
    '4': 'bg-purple-500',
    '5': 'bg-teal-500'
  };

  const getSystemEmployees = () => {
    const dbState = getDBState();
    return dbState.employees.map((emp: any) => {
      let defaultUser = '';
      if (emp.id === '1') defaultUser = 'kopyl';
      else if (emp.id === '2') defaultUser = 'ivanova';
      else if (emp.id === '3') defaultUser = 'fedorova';
      else if (emp.id === '4') defaultUser = 'vasiliev';
      else if (emp.id === '5') defaultUser = 'smirnov';
      else {
        defaultUser = emp.name.toLowerCase().split(' ')[0] || 'employee';
      }

      return {
        ...emp,
        username: defaultUser,
        password: '123'
      };
    });
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isBlocked) {
      setError(`⚠️ Аккаунт заблокирован. Попробуйте через ${Math.ceil(timeLeft / 60)} минут ${timeLeft % 60} секунд.`);
      return;
    }

    if (!username.trim() || !password.trim()) {
      setError('Пожалуйста, заполните все поля!');
      return;
    }

    const systemEmps = getSystemEmployees();
    
    const matchedEmp = systemEmps.find((emp: any) => {
      const isUsernameMatch = emp.username.toLowerCase() === username.trim().toLowerCase();
      const isPersNumMatch = emp.personnel_number.toLowerCase() === username.trim().toLowerCase();
      return (isUsernameMatch || isPersNumMatch) && emp.is_active;
    });

    if (!matchedEmp) {
      const newAttempts = loginAttempts + 1;
      setLoginAttempts(newAttempts);
      
      if (newAttempts >= MAX_ATTEMPTS) {
        const blockUntil = new Date(Date.now() + BLOCK_DURATION);
        setBlockedUntil(blockUntil);
        setError(`⚠️ Превышено количество попыток! Доступ заблокирован на 5 минут.`);
      } else {
        setError(`Неверный логин или пароль. Осталось попыток: ${MAX_ATTEMPTS - newAttempts}`);
      }
      return;
    }

    if (matchedEmp.password !== password) {
      const newAttempts = loginAttempts + 1;
      setLoginAttempts(newAttempts);
      
      if (newAttempts >= MAX_ATTEMPTS) {
        const blockUntil = new Date(Date.now() + BLOCK_DURATION);
        setBlockedUntil(blockUntil);
        setError(`⚠️ Превышено количество попыток! Доступ заблокирован на 5 минут.`);
      } else {
        setError(`Неверный пароль. Осталось попыток: ${MAX_ATTEMPTS - newAttempts}`);
      }
      return;
    }

    setLoginAttempts(0);
    localStorage.removeItem('maria_ra_blocked_until');

    const uiEmp: Employee = {
      id: matchedEmp.id,
      name: matchedEmp.name,
      role: roleMap[matchedEmp.role_id] || 'Товаровед-кассир',
      avatarColor: avatarColors[matchedEmp.id] || 'bg-green-600'
    };

    onLogin(uiEmp);
  };

  const handleQuickFill = (emp: any) => {
    setUsername(emp.personnel_number);
    setPassword(emp.password);
    setError('');
  };

  const employeesList = getSystemEmployees();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950 p-4 transition-colors duration-200">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.08),rgba(255,255,255,0))] pointer-events-none"></div>
      
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-12 gap-8 items-center relative z-10">
        
        <div className="md:col-span-5 text-center md:text-left space-y-6">
          <div className="flex flex-col items-center md:items-start space-y-3">
            <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-amber-400 text-white shadow-lg border-2 border-yellow-300">
              <Sun className="w-10 h-10 text-yellow-900 animate-pulse" />
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-600 rounded-full border-2 border-white flex items-center justify-center">
                <span className="text-[10px] font-bold text-white">M</span>
              </div>
            </div>
            
            <div>
              <h1 className="text-2xl font-black text-green-700 dark:text-green-500 uppercase tracking-tight">
                Мария-Ра
              </h1>
              <span className="text-xs text-gray-500 dark:text-slate-400 font-bold uppercase tracking-widest block">
                СУБД Портал 142
              </span>
            </div>
          </div>

          <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed font-medium">
            Добро пожаловать в единую защищенную корпоративную среду контроля качества, ротации FIFO и оформления списаний ТОРГ-16.
          </p>

          <div className="hidden md:block border-t border-gray-200 dark:border-slate-800 pt-4 space-y-3">
            <div className="flex items-center space-x-3 text-[10px] text-gray-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
              <span>Стандарт ротации FIFO 2.1</span>
            </div>
            <div className="flex items-center space-x-3 text-[10px] text-gray-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
              <span>Интеграция с корпоративной СУБД</span>
            </div>
          </div>
        </div>

        <div className="md:col-span-7 space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800/80 rounded-2xl p-6 md:p-8 shadow-md"
          >
            <h2 className="text-sm font-black text-gray-900 dark:text-slate-100 uppercase tracking-wider mb-5 pb-3 border-b border-gray-100 dark:border-slate-800">
              Авторизация сотрудника
            </h2>

            {error && (
              <div className={`mb-4 p-3 rounded-xl text-xs font-bold flex items-start space-x-2 animate-fade-in ${
                isBlocked || error.includes('блокирован') || error.includes('превышено')
                  ? 'bg-red-50 dark:bg-red-950/20 border border-red-150 dark:border-red-900/30 text-red-700 dark:text-red-400'
                  : 'bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 text-amber-700 dark:text-amber-400'
              }`}>
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {!isBlocked && loginAttempts > 0 && loginAttempts < MAX_ATTEMPTS && (
              <div className="mb-4 text-xs text-amber-600 dark:text-amber-400 font-bold">
                ⚠️ Осталось попыток: {MAX_ATTEMPTS - loginAttempts}
              </div>
            )}

            {isBlocked && (
              <div className="mb-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-xl p-4 text-center">
                <p className="text-sm text-red-700 dark:text-red-400 font-bold">
                  🔒 Доступ заблокирован
                </p>
                <p className="text-xs text-red-600 dark:text-red-300 mt-1">
                  Попробуйте через {Math.floor(timeLeft / 60)} мин {timeLeft % 60} сек
                </p>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase block mb-1">
                  Табельный номер или логин:
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-400">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    placeholder="Например, T-0421 или kopyl"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={isBlocked}
                    className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-green-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase block mb-1">
                  Пароль доступа:
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-400">
                    <KeyRound className="w-4 h-4" />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Пароль администратора"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isBlocked}
                    className="w-full pl-9 pr-10 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-green-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isBlocked}
                className="w-full py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 dark:disabled:bg-slate-700 text-white font-black uppercase text-xs tracking-wider rounded-xl cursor-pointer transition-all active:scale-98 shadow-sm flex items-center justify-center space-x-2 disabled:cursor-not-allowed"
              >
                <LogIn className="w-4 h-4" />
                <span>{isBlocked ? 'ДОСТУП ЗАБЛОКИРОВАН' : 'Войти в систему'}</span>
              </button>
            </form>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="bg-gray-100/50 dark:bg-slate-900/40 border border-gray-200 dark:border-slate-800 rounded-2xl p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">
                🔑 Ассистент демо-доступа (Кликните для автозаполнения)
              </span>
              <span className="text-[9px] font-mono text-gray-400 dark:text-slate-500">Пароль по умолчанию: 123</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {employeesList.filter(emp => emp.is_active).map(emp => (
                <button
                  key={emp.id}
                  onClick={() => handleQuickFill(emp)}
                  type="button"
                  disabled={isBlocked}
                  className="p-2.5 bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-850 hover:border-green-500/50 dark:hover:border-green-500/50 rounded-xl flex items-center justify-between text-left transition-all hover:shadow-2xs group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="truncate pr-2">
                    <span className="text-[11px] font-black text-gray-850 dark:text-slate-100 block group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                      {emp.name}
                    </span>
                    <span className="text-[9px] text-gray-400 dark:text-slate-500 block leading-tight">
                      {roleMap[emp.role_id] || 'Кассир'}
                    </span>
                    <span className="text-[9px] font-mono font-bold text-green-700 dark:text-green-500 block mt-0.5">
                      Логин: {emp.personnel_number}
                    </span>
                  </div>
                  <span className="text-[10px] font-black uppercase text-gray-400 group-hover:text-green-600 transition-colors shrink-0">
                    ➔
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        </div>

      </div>
    </div>
  );
}
import React, { useState } from 'react';
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

  // Mapping role IDs from the DB state to strings expected by other components
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
      // Set a default username if not explicitly set
      let defaultUser = '';
      if (emp.id === '1') defaultUser = 'kopyl';
      else if (emp.id === '2') defaultUser = 'ivanova';
      else if (emp.id === '3') defaultUser = 'fedorova';
      else if (emp.id === '4') defaultUser = 'vasiliev';
      else if (emp.id === '5') defaultUser = 'smirnov';
      else {
        // Fallback for newly hired employees
        defaultUser = emp.name.toLowerCase().split(' ')[0] || 'employee';
      }

      return {
        ...emp,
        username: defaultUser,
        password: '123' // default password for everyone
      };
    });
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('Пожалуйста, заполните все поля!');
      return;
    }

    const systemEmps = getSystemEmployees();
    
    // Find employee by username OR personnel number (case insensitive)
    const matchedEmp = systemEmps.find((emp: any) => {
      const isUsernameMatch = emp.username.toLowerCase() === username.trim().toLowerCase();
      const isPersNumMatch = emp.personnel_number.toLowerCase() === username.trim().toLowerCase();
      return (isUsernameMatch || isPersNumMatch) && emp.is_active;
    });

    if (!matchedEmp) {
      setError('Пользователь с таким логином или табельным номером не найден или деактивирован.');
      return;
    }

    if (matchedEmp.password !== password) {
      setError('Неверный пароль. Попробуйте еще раз или используйте подсказку.');
      return;
    }

    // Convert matched DB employee to Employee type expected by UI
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
        
        {/* Left column: Brand Info */}
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
              <span>Прямой экспорт в 1С:Предприятие 8.3</span>
            </div>
          </div>
        </div>

        {/* Right column: Login form and Assistant */}
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
              <div className="mb-4 bg-red-50 dark:bg-red-950/20 border border-red-150 dark:border-red-900/30 text-red-700 dark:text-red-400 p-3 rounded-xl text-xs font-bold flex items-start space-x-2 animate-fade-in">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
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
                    className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-green-500/20 transition-all"
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
                    className="w-full pl-9 pr-10 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-green-500/20 transition-all"
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
                className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white font-black uppercase text-xs tracking-wider rounded-xl cursor-pointer transition-all active:scale-98 shadow-sm flex items-center justify-center space-x-2"
              >
                <LogIn className="w-4 h-4" />
                <span>Войти в систему</span>
              </button>
            </form>
          </motion.div>

          {/* Assistant Panel */}
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
                  className="p-2.5 bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-850 hover:border-green-500/50 dark:hover:border-green-500/50 rounded-xl flex items-center justify-between text-left transition-all hover:shadow-2xs group cursor-pointer"
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

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import Header from './components/Header';
import Login from './components/Login';
import FreshnessControl from './components/FreshnessControl';
import FifoPlan from './components/FifoPlan';
import DatabaseSchema from './components/DatabaseSchema';
import RoleWorkspace from './components/RoleWorkspace';
import { Employee, Product } from './types';
import { getDBState, getActiveProductsFromDB } from './data/databaseState';
import { 
  Terminal, ShieldCheck, RefreshCw, Database
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'freshness' | 'fifo' | 'database'>('freshness');
  const [currentUser, setCurrentUser] = useState<Employee | null>(() => {
    const saved = localStorage.getItem('maria_ra_logged_in_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });
  
  const [products, setProducts] = useState<Product[]>(() => {
    return getActiveProductsFromDB(getDBState());
  });

  const handleDbUpdate = () => {
    setProducts(getActiveProductsFromDB(getDBState()));
  };

  useEffect(() => {
    window.addEventListener('maria_ra_db_updated', handleDbUpdate);
    window.addEventListener('storage', handleDbUpdate);
    return () => {
      window.removeEventListener('maria_ra_db_updated', handleDbUpdate);
      window.removeEventListener('storage', handleDbUpdate);
    };
  }, []);

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('maria_ra_logged_in_user');
  };

  if (!currentUser) {
    return (
      <Login 
        onLogin={(emp) => {
          setCurrentUser(emp);
          localStorage.setItem('maria_ra_logged_in_user', JSON.stringify(emp));
        }} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 dark:text-slate-100 flex flex-col font-sans select-none antialiased transition-colors duration-200">
      <Header currentUser={currentUser} onLogout={handleLogout} />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-5 md:p-6 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full -mr-10 -mt-10 blur-xl"></div>
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-xl text-green-600 dark:text-green-400 border border-green-100 dark:border-green-900/30">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-sm font-black text-gray-900 dark:text-slate-100 uppercase tracking-tight">
                Информационная система контроля качества ТС «Мария-Ра»
              </h2>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 leading-relaxed">
                Комплексное цифровое решение для сотрудников ООО «Розница К-1». Контроль сроков годности, автоматическое формирование актов списания (<span className="text-green-700 dark:text-green-400 font-semibold">ТОРГ-16</span>) и интерактивные схемы выкладки товаров по стандарту ротации <span className="font-semibold text-green-700 dark:text-green-400">FIFO</span>.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 px-3 py-1.5 rounded-lg text-[10px] font-mono text-gray-500 dark:text-slate-400">
            <Terminal className="w-4 h-4 text-green-600 dark:text-green-400" />
            <span>СТАТУС СИСТЕМЫ: АКТИВЕН</span>
          </div>
        </div>

        <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-slate-900 dark:to-slate-900/50 border border-green-100 dark:border-slate-800 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[9px] font-black tracking-widest text-green-700 dark:text-green-400 uppercase bg-green-100 dark:bg-green-950/40 px-2 py-0.5 rounded-sm">
              ПЕРСОНАЛЬНАЯ СРЕДА: {currentUser.role === 'Товаровед-кассир' ? 'КАССИР' : currentUser.role.toUpperCase()}
            </span>
            <h3 className="text-xs font-extrabold text-gray-900 dark:text-slate-100">
              Рабочий сеанс: <span className="text-green-700 dark:text-green-400">{currentUser.name}</span>
            </h3>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[10px] font-mono text-gray-400 dark:text-slate-500 font-bold block">IP терминала: 192.168.12.44</span>
            <span className="text-[9px] text-green-600 dark:text-green-400 font-black block mt-0.5">РЕЖИМ ДОСТУПА: {currentUser.role === 'Директор магазина' ? 'ПОЛНЫЙ' : 'РАЗГРАНИЧЕННЫЙ'}</span>
          </div>
        </div>

        <RoleWorkspace currentUser={currentUser} onDbUpdate={handleDbUpdate} />

        <div className="flex flex-wrap gap-2 mb-6 no-print border-b border-gray-150 dark:border-slate-800 pb-4">
          <button
            onClick={() => setActiveTab('freshness')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-tight transition-all cursor-pointer ${
              activeTab === 'freshness'
                ? 'bg-green-600 text-white shadow-md'
                : 'bg-white dark:bg-slate-900 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-850 border border-gray-100 dark:border-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Контроль свежести & Списания</span>
          </button>
          <button
            onClick={() => setActiveTab('fifo')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-tight transition-all cursor-pointer ${
              activeTab === 'fifo'
                ? 'bg-green-600 text-white shadow-md'
                : 'bg-white dark:bg-slate-900 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-850 border border-gray-100 dark:border-slate-800'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            <span>План выкладки (FIFO)</span>
          </button>
          <button
            onClick={() => setActiveTab('database')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-tight transition-all cursor-pointer ${
              activeTab === 'database'
                ? 'bg-green-600 text-white shadow-md'
                : 'bg-white dark:bg-slate-900 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-850 border border-gray-100 dark:border-slate-800'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Схема СУБД (17 таблиц)</span>
          </button>
        </div>

        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="focus:outline-none"
        >
          {activeTab === 'freshness' && (
            <FreshnessControl 
              products={products} 
              setProducts={setProducts} 
              currentUser={currentUser}
            />
          )}
          {activeTab === 'fifo' && (
            <FifoPlan 
              products={products} 
              currentUser={currentUser}
            />
          )}
          {activeTab === 'database' && (
            <DatabaseSchema />
          )}
        </motion.div>
      </main>

      <footer className="bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 py-6 mt-12 no-print text-center text-[10px] text-gray-400 dark:text-slate-500 font-medium">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p>© 2026 ООО «Розница К-1» — Торговая сеть «Мария-Ра». Единый портал контроля качества и стандартов свежести.</p>
          <div className="flex space-x-4">
            <span className="hover:text-green-600 dark:hover:text-green-400 cursor-pointer">Правила ротации товаров (FIFO)</span>
            <span>•</span>
            <span className="hover:text-green-600 dark:hover:text-green-400 cursor-pointer">Стандарты выкладки ФРОВ</span>
            <span>•</span>
            <span className="hover:text-green-600 dark:hover:text-green-400 cursor-pointer">Регламент утилизации</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
import React from 'react';
import { Sun, MapPin, User, LogOut } from 'lucide-react';
import { Employee } from '../types';

interface HeaderProps {
  currentUser: Employee;
  onLogout: () => void;
}

export default function Header({ currentUser, onLogout }: HeaderProps) {
  return (
    <header className="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 shadow-xs sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div className="flex items-center space-x-3">
            <div className="relative flex items-center justify-center w-12 h-12 rounded-full bg-amber-400 text-white shadow-md shadow-amber-200 border border-yellow-300">
              <Sun className="w-8 h-8 text-yellow-900 animate-pulse" />
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-600 rounded-full border-2 border-white flex items-center justify-center">
                <span className="text-[8px] font-bold text-white">M</span>
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="text-xl font-extrabold tracking-tight text-green-700 dark:text-green-500">Мария-Ра</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 bg-green-100 dark:bg-green-950/40 text-green-800 dark:text-green-400 rounded-md">ПОРТАЛ</span>
              </div>
              <span className="text-xs text-gray-500 dark:text-slate-400 font-medium block">Контроль качества & Списания</span>
            </div>
          </div>

          <div className="hidden md:flex items-center space-x-6 text-xs text-gray-500">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 bg-gray-50 dark:bg-slate-800 rounded-lg text-gray-400">
                <MapPin className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <span className="text-[10px] text-gray-400 dark:text-slate-500 block uppercase font-bold tracking-wider">Филиал</span>
                <span className="font-semibold text-gray-700 dark:text-slate-300">г. Барнаул, пр. Ленина, 54 (№142)</span>
              </div>
            </div>

            <div className="h-8 w-px bg-gray-100 dark:bg-slate-800"></div>

            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 bg-gray-50 dark:bg-slate-800/30 px-3 py-1.5 rounded-xl border border-gray-100 dark:border-slate-800/80">
                <div className="p-1.5 bg-white dark:bg-slate-800 rounded-lg text-gray-400 shadow-2xs">
                  <User className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                </div>
                <div>
                  <span className="text-[9px] text-gray-400 dark:text-slate-500 block uppercase font-extrabold tracking-wider leading-none mb-0.5">Авторизован</span>
                  <span className="font-bold text-gray-800 dark:text-slate-100 text-xs block">
                    {currentUser.name} <span className="text-[10px] text-gray-450 dark:text-slate-400 font-medium">({currentUser.role})</span>
                  </span>
                </div>
              </div>

              <button
                onClick={onLogout}
                className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30 transition-all duration-150 cursor-pointer flex items-center justify-center shadow-2xs group"
              >
                <LogOut className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                <span className="text-[10px] font-black uppercase tracking-tight ml-1.5 pr-1 hidden lg:inline">Выйти</span>
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={onLogout}
              className="md:hidden p-2.5 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30 transition-all duration-150 cursor-pointer flex items-center justify-center shadow-xs"
            >
              <LogOut className="w-4 h-4" />
            </button>

            <div className="flex items-center space-x-2 bg-green-50 dark:bg-green-950/20 border border-green-100 dark:border-green-900/30 px-3.5 py-1.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              <span className="text-xs font-bold text-green-800 dark:text-green-400">Связь ОК</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
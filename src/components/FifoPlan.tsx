import React, { useState } from 'react';
import { 
  RefreshCw, Info, CheckSquare, Search, Filter, HelpCircle, 
  ArrowRight, Sparkles, BookOpen, Layers, CheckCircle2, UserCheck
} from 'lucide-react';
import { Product, ProductCategory, Employee } from '../types';
import { categoryLabels, categoryColors } from '../data/initialProducts';

interface FifoPlanProps {
  products: Product[];
  currentUser: Employee;
}

export default function FifoPlan({ products, currentUser }: FifoPlanProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | 'all'>('all');
  const [rotationLogged, setRotationLogged] = useState<string | null>(null);
  const [checkedSteps, setCheckedSteps] = useState<Record<number, boolean>>({});

  const simulatedToday = '2026-06-30';

  // Helper to calculate remaining days
  const getDaysRemaining = (expiryDateStr: string) => {
    const today = new Date(simulatedToday);
    const expiry = new Date(expiryDateStr);
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Group active, non-written-off products by name to find different batches
  const activeProducts = products.filter(p => p.status !== 'written_off');

  // Filter products based on search & category
  const filteredProducts = activeProducts.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.barcode.includes(searchTerm);
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // To build a batch plan, let's group products by Name + Category + Location
  // Each unique product name can have multiple batches (represented by separate entries in catalog)
  const uniqueProductKeys = Array.from(new Set(filteredProducts.map(p => p.name)));

  // Generate FIFO shelf rotation advice for a product's batches
  const getFifoAdvice = (batches: Product[]) => {
    // Sort batches by expiry date ascending (oldest first - must be sold first)
    const sorted = [...batches].sort((a, b) => {
      return new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime();
    });

    return sorted.map((batch, index) => {
      const days = getDaysRemaining(batch.expirationDate);
      let shelfRow = '';
      let priority = '';
      let actionClass = '';
      let textAction = '';

      if (batch.status === 'expired') {
        shelfRow = 'ИЗЪЯТЬ С ПОЛКИ';
        priority = 'КРИТИЧЕСКИЙ (Брак)';
        actionClass = 'bg-red-600 text-white border-red-700';
        textAction = 'Убрать в зону списания ТОРГ-16. Не допускать попадания в корзину покупателя!';
      } else if (days <= 2 || batch.status === 'marked_down' || batch.status === 'expiring_soon') {
        shelfRow = 'ПЕРВЫЙ РЯД (Фронт)';
        priority = 'ВЫСОКИЙ (Продажа сегодня)';
        actionClass = 'bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 border-amber-300';
        textAction = batch.status === 'marked_down' 
          ? `Выставить в первый ряд с зеленой наклейкой уценки (${batch.markdownPrice} ₽).` 
          : 'Сделать уценку -30%/-50% и выставить в первый ряд на уровне глаз покупателя.';
      } else if (days <= 5) {
        shelfRow = 'ВТОРОЙ РЯД (Середина)';
        priority = 'СРЕДНИЙ';
        actionClass = 'bg-blue-50 dark:bg-blue-950/30 text-blue-850 dark:text-blue-300 border-blue-200';
        textAction = 'Разместить сразу за первым рядом. Контролировать при следующем аудите.';
      } else {
        shelfRow = 'ГЛУБИНА ПОЛКИ (Задний ряд)';
        priority = 'НИЗКИЙ (Свежая партия)';
        actionClass = 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-850 dark:text-emerald-300 border-emerald-200';
        textAction = 'Отодвинуть в самый конец полки. Новые партии ставить только НАЗАД!';
      }

      return {
        batch,
        daysRemaining: days,
        shelfRow,
        priority,
        actionClass,
        textAction,
        order: index + 1
      };
    });
  };

  const toggleStep = (stepIndex: number) => {
    setCheckedSteps(prev => ({
      ...prev,
      [stepIndex]: !prev[stepIndex]
    }));
  };

  const handleCompleteRotation = () => {
    const todayStr = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    setRotationLogged(`Ротация успешно проведена сотрудником ${currentUser.name} в ${todayStr}. Данные занесены в электронный табель аудита качества.`);
    setTimeout(() => {
      setRotationLogged(null);
      setCheckedSteps({});
    }, 6000);
  };

  // Standard FIFO Merchandising steps
  const fifoSteps = [
    { title: 'Проверка ценников', desc: 'Проверить соответствие ценников на полке. Для уцененных товаров наклеить желтый/зеленый акционный штрихкод.' },
    { title: 'Очистка зоны выкладки', desc: 'Протереть полку от пыли и следов влаги перед выкладкой новой партии.' },
    { title: 'Правило "Сзади свежее"', desc: 'При выкладке товара со склада всегда отодвигать старый товар вперед, а новый ставить назад.' },
    { title: 'Фейсинг товара', desc: 'Повернуть все упаковки лицевой стороной к покупателю, выровнять по краю полки без пустот.' },
    { title: 'Контроль брака', desc: 'Проверить целостность упаковки и герметичность крышек. Помятые или порванные пачки списать.' }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Intro Banner */}
      <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-6 shadow-xs transition-colors">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="p-1.5 bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400 rounded-lg">
                <RefreshCw className="w-5 h-5 animate-spin-slow" />
              </span>
              <h2 className="text-sm font-black text-gray-900 dark:text-slate-100 uppercase tracking-tight">
                Интерактивный планограмма-ассистент ротации FIFO
              </h2>
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed max-w-3xl">
              Принцип <b>FIFO (First In, First Out — первым пришел, первым ушел)</b> требует, чтобы товары с меньшим сроком годности продавались первыми. Данный модуль автоматически группирует реальные остатки на полках и строит схему их правильного расположения для продавцов.
            </p>
          </div>
          <div className="bg-green-50 dark:bg-green-950/20 border border-green-100 dark:border-green-900/30 rounded-xl p-3 text-[11px] text-green-950 dark:text-green-300 max-w-xs transition-colors">
            <span className="font-bold flex items-center mb-0.5">
              <UserCheck className="w-3.5 h-3.5 mr-1 text-green-600" />
              Ответственный исполнитель:
            </span>
            <p className="font-extrabold">{currentUser.name}</p>
            <p className="text-[10px] text-gray-400 dark:text-slate-500 font-medium">{currentUser.role}</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Layout */}
      <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl p-4 shadow-2xs flex flex-wrap gap-3 items-center justify-between no-print transition-colors">
        <div className="flex flex-1 min-w-[280px] items-center space-x-2 bg-gray-50 dark:bg-slate-800/50 border border-gray-150 dark:border-slate-800 rounded-lg px-3 py-2">
          <Search className="w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Поиск товара по названию или штрихкоду для ротации..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent border-none text-xs text-gray-900 dark:text-slate-100 focus:outline-none w-full font-semibold"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-green-600 text-white shadow-xs'
                : 'bg-gray-50 dark:bg-slate-850 hover:bg-gray-100 text-gray-600 dark:text-slate-300 border border-gray-150 dark:border-slate-800'
            }`}
          >
            Все отделы
          </button>
          {Object.keys(categoryLabels).map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat as ProductCategory)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-green-600 text-white shadow-xs'
                  : 'bg-gray-50 dark:bg-slate-850 hover:bg-gray-100 text-gray-600 dark:text-slate-300 border border-gray-150 dark:border-slate-800'
              }`}
            >
              {categoryLabels[cat as ProductCategory]}
            </button>
          ))}
        </div>
      </div>

      {/* Main Rotation Plans & Instructions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left column: Shelf Placement Schemas (Take up 2/3 space on large screens) */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl p-5 shadow-2xs transition-colors">
            <div className="flex justify-between items-center mb-4 border-b border-gray-50 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-green-600 dark:text-green-400" />
                <h3 className="text-xs font-extrabold text-gray-900 dark:text-slate-100 uppercase tracking-tight">
                  Интерактивная карта выкладки партий
                </h3>
              </div>
              <span className="text-[10px] text-gray-400 font-mono font-bold">Найдено позиций: {uniqueProductKeys.length}</span>
            </div>

            {uniqueProductKeys.length === 0 ? (
              <div className="text-center py-16 text-gray-400 dark:text-slate-500 italic">
                Нет подходящих товаров для отображения планограммы. Измените параметры поиска или добавьте новый товар в каталог.
              </div>
            ) : (
              <div className="space-y-8">
                {uniqueProductKeys.map(prodName => {
                  const batches = filteredProducts.filter(p => p.name === prodName);
                  const adviceList = getFifoAdvice(batches);
                  const firstBatch = batches[0];

                  return (
                    <div key={prodName} className="border border-gray-100 dark:border-slate-800 rounded-xl p-4 bg-gray-50/30 dark:bg-slate-900/50 transition-colors">
                      
                      {/* Product Header inside plan */}
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
                        <div>
                          <h4 className="text-xs font-extrabold text-gray-900 dark:text-slate-100 flex items-center flex-wrap gap-1.5">
                            <span>{prodName}</span>
                            <span className={`inline-block whitespace-nowrap px-2 py-0.5 rounded-sm border text-[9px] font-extrabold ${categoryColors[firstBatch.category]}`}>
                              {categoryLabels[firstBatch.category]}
                            </span>
                          </h4>
                          <span className="text-[10px] text-gray-400 font-mono block mt-0.5">
                            Штрихкод: {firstBatch.barcode} | Зона по умолчанию: {firstBatch.location || 'Общий стеллаж'}
                          </span>
                        </div>
                        <div className="bg-white dark:bg-slate-800 border border-gray-150 dark:border-slate-700 px-2.5 py-1 rounded-lg text-center text-xs font-bold text-gray-700 dark:text-slate-300">
                          Всего в зале: <span className="text-green-700 dark:text-green-400 font-extrabold">{batches.reduce((sum, b) => sum + b.quantity, 0)} шт.</span>
                        </div>
                      </div>

                      {/* Visual Interactive Shelf Placement */}
                      <div className="bg-amber-400/5 dark:bg-amber-400/[0.02] border border-amber-200/50 dark:border-amber-900/20 rounded-xl p-4">
                        <span className="text-[9px] font-black text-amber-800 dark:text-amber-400 uppercase tracking-widest block mb-3">
                          Схема расстановки на полке (Слева - ближе к покупателю, Справа - глубже)
                        </span>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {/* We render 3 virtual positions: Front, Middle, Back */}
                          {/* Front Slot (Row 1) */}
                          <div className="bg-white dark:bg-slate-900 border border-dashed border-red-300 dark:border-red-900/50 rounded-xl p-3 flex flex-col justify-between min-h-[140px] shadow-2xs">
                            <div className="flex justify-between items-center pb-2 border-b border-gray-50 dark:border-slate-800 mb-2">
                              <span className="text-[9px] font-black text-red-700 dark:text-red-400 uppercase">ПЕРВЫЙ РЯД (ФРОНТ)</span>
                              <span className="w-2 h-2 rounded-full bg-red-500"></span>
                            </div>
                            
                            {adviceList.some(a => a.shelfRow.includes('ПЕРВЫЙ РЯД')) ? (
                              <div className="space-y-2">
                                {adviceList.filter(a => a.shelfRow.includes('ПЕРВЫЙ РЯД')).map(item => (
                                  <div key={item.batch.id} className="bg-red-50/50 dark:bg-red-950/10 border border-red-100 dark:border-red-900/30 p-2 rounded-lg">
                                    <div className="flex justify-between text-[11px] font-bold">
                                      <span className="text-gray-900 dark:text-slate-100">Партия #{item.batch.id.slice(-3)}</span>
                                      <span className="text-red-600 dark:text-red-400">Ост. {item.daysRemaining} дн.</span>
                                    </div>
                                    <p className="text-[10px] text-gray-500 mt-1 font-semibold">{item.batch.quantity} шт. | Срок: {item.batch.expirationDate.split('-').reverse().join('.')}</p>
                                  </div>
                                ))}
                                <p className="text-[9px] text-gray-400 leading-tight italic mt-1 font-medium">{adviceList.find(a => a.shelfRow.includes('ПЕРВЫЙ'))?.textAction}</p>
                              </div>
                            ) : (
                              <p className="text-[10px] text-gray-400 dark:text-slate-500 italic text-center my-auto font-medium">Нет партий для переднего края полки</p>
                            )}
                          </div>

                          {/* Middle Slot (Row 2) */}
                          <div className="bg-white dark:bg-slate-900 border border-dashed border-blue-300 dark:border-blue-900/50 rounded-xl p-3 flex flex-col justify-between min-h-[140px] shadow-2xs">
                            <div className="flex justify-between items-center pb-2 border-b border-gray-50 dark:border-slate-800 mb-2">
                              <span className="text-[9px] font-black text-blue-700 dark:text-blue-400 uppercase">СЕРЕДИНА ПОЛКИ</span>
                              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                            </div>

                            {adviceList.some(a => a.shelfRow.includes('ВТОРОЙ РЯД')) ? (
                              <div className="space-y-2">
                                {adviceList.filter(a => a.shelfRow.includes('ВТОРОЙ РЯД')).map(item => (
                                  <div key={item.batch.id} className="bg-blue-50/50 dark:bg-blue-950/10 border border-blue-100 dark:border-blue-900/30 p-2 rounded-lg">
                                    <div className="flex justify-between text-[11px] font-bold">
                                      <span className="text-gray-900 dark:text-slate-100">Партия #{item.batch.id.slice(-3)}</span>
                                      <span className="text-blue-600 dark:text-blue-400">Ост. {item.daysRemaining} дн.</span>
                                    </div>
                                    <p className="text-[10px] text-gray-500 mt-1 font-semibold">{item.batch.quantity} шт. | Срок: {item.batch.expirationDate.split('-').reverse().join('.')}</p>
                                  </div>
                                ))}
                                <p className="text-[9px] text-gray-400 leading-tight italic mt-1 font-medium">Разместить строго за товарами первого ряда.</p>
                              </div>
                            ) : (
                              <p className="text-[10px] text-gray-400 dark:text-slate-500 italic text-center my-auto font-medium">Нет партий среднего срока</p>
                            )}
                          </div>

                          {/* Back Slot (Row 3 - Deep) */}
                          <div className="bg-white dark:bg-slate-900 border border-dashed border-emerald-300 dark:border-emerald-900/50 rounded-xl p-3 flex flex-col justify-between min-h-[140px] shadow-2xs">
                            <div className="flex justify-between items-center pb-2 border-b border-gray-50 dark:border-slate-800 mb-2">
                              <span className="text-[9px] font-black text-emerald-700 dark:text-emerald-400 uppercase">ГЛУБИНА ПОЛКИ</span>
                              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            </div>

                            {adviceList.some(a => a.shelfRow.includes('ГЛУБИНА')) ? (
                              <div className="space-y-2">
                                {adviceList.filter(a => a.shelfRow.includes('ГЛУБИНА')).map(item => (
                                  <div key={item.batch.id} className="bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/30 p-2 rounded-lg">
                                    <div className="flex justify-between text-[11px] font-bold">
                                      <span className="text-gray-900 dark:text-slate-100">Партия #{item.batch.id.slice(-3)}</span>
                                      <span className="text-emerald-600 dark:text-emerald-400">Ост. {item.daysRemaining} дн.</span>
                                    </div>
                                    <p className="text-[10px] text-gray-500 mt-1 font-semibold">{item.batch.quantity} шт. | Срок: {item.batch.expirationDate.split('-').reverse().join('.')}</p>
                                  </div>
                                ))}
                                <p className="text-[9px] text-gray-400 leading-tight italic mt-1 font-medium">Самый свежий завоз. Не выталкивать вперед!</p>
                              </div>
                            ) : (
                              <p className="text-[10px] text-gray-400 dark:text-slate-500 italic text-center my-auto font-medium">Нет ультра-свежих партий</p>
                            )}
                          </div>
                        </div>

                        {/* Expired / Alerts warnings if any */}
                        {adviceList.some(a => a.shelfRow.includes('ИЗЪЯТЬ')) && (
                          <div className="mt-3 bg-red-600 text-white rounded-lg p-3 text-xs flex items-center space-x-3 shadow-xs">
                            <span className="text-lg">⚠️</span>
                            <div>
                              <span className="font-extrabold uppercase block text-[10px] tracking-wider">Критическое предупреждение!</span>
                              <p className="font-medium mt-0.5">
                                Обнаружена просроченная партия этого товара! Немедленно изымите {adviceList.filter(a => a.shelfRow.includes('ИЗЪЯТЬ')).reduce((acc, i) => acc + i.batch.quantity, 0)} шт. с полок и оформите Акт ТОРГ-16!
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right column: FIFO Merchandising Standard & checklist */}
        <div className="space-y-6">
          
          {/* Active Audit checklist card */}
          <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl p-5 shadow-2xs transition-colors">
            <h3 className="text-xs font-extrabold text-gray-900 dark:text-slate-100 uppercase tracking-tight mb-3 flex items-center space-x-1.5">
              <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
              <span>Чек-лист проведения ротации</span>
            </h3>
            
            <p className="text-[11px] text-gray-500 dark:text-slate-400 mb-4 leading-relaxed font-medium">
              Каждую смену ответственный сотрудник должен выполнять физическую перестановку товаров в закрепленном за ним отделе:
            </p>

            <div className="space-y-3">
              {fifoSteps.map((step, idx) => (
                <div 
                  key={idx} 
                  onClick={() => toggleStep(idx)}
                  className={`border rounded-lg p-3 cursor-pointer transition-all flex items-start space-x-3 select-none ${
                    checkedSteps[idx] 
                      ? 'bg-green-50/50 dark:bg-green-950/10 border-green-200 dark:border-green-900/30' 
                      : 'bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800 hover:bg-gray-50/50 dark:hover:bg-slate-850'
                  }`}
                >
                  <input 
                    type="checkbox" 
                    checked={!!checkedSteps[idx]}
                    onChange={() => {}} // handled by parent onClick
                    className="mt-0.5 h-4 w-4 rounded-sm border-gray-350 dark:border-slate-700 text-green-600 focus:ring-green-500 cursor-pointer"
                  />
                  <div className="space-y-0.5">
                    <span className={`text-xs font-extrabold ${checkedSteps[idx] ? 'text-green-900 dark:text-green-300 line-through' : 'text-gray-900 dark:text-slate-200'}`}>
                      {step.title}
                    </span>
                    <p className="text-[10px] text-gray-400 dark:text-slate-400 leading-normal font-medium">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Complete button */}
            <div className="mt-6 pt-4 border-t border-gray-50 dark:border-slate-800">
              <button
                onClick={handleCompleteRotation}
                disabled={Object.keys(checkedSteps).length !== fifoSteps.length}
                className={`w-full py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center space-x-2 ${
                  Object.keys(checkedSteps).length === fifoSteps.length
                    ? 'bg-green-600 hover:bg-green-700 text-white shadow-md cursor-pointer'
                    : 'bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-500 cursor-not-allowed'
                }`}
              >
                <UserCheck className="w-4 h-4" />
                <span>Зафиксировать ротацию в ТСД</span>
              </button>
              <span className="text-[9px] text-gray-400 dark:text-slate-500 text-center block mt-2 font-medium">
                *Кнопка станет активной после выполнения всех 5 обязательных пунктов контроля качества.
              </span>
            </div>

            {rotationLogged && (
              <div className="mt-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/30 rounded-lg p-3 text-[11px] text-emerald-800 dark:text-emerald-300 font-extrabold animate-fade-in flex items-start space-x-2">
                <span className="text-sm">🎉</span>
                <span>{rotationLogged}</span>
              </div>
            )}
          </div>

          {/* Quick FAQ / standard standards card */}
          <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl p-5 shadow-2xs transition-colors">
            <h3 className="text-xs font-extrabold text-gray-900 dark:text-slate-100 uppercase tracking-tight mb-2.5 flex items-center space-x-1.5">
              <BookOpen className="w-4 h-4 text-green-600 dark:text-green-400" />
              <span>Стандарт ТС «Мария-Ра»</span>
            </h3>
            
            <div className="text-[11px] space-y-3 text-gray-600 dark:text-slate-300 font-medium leading-relaxed">
              <div className="border-l-2 border-amber-400 pl-2">
                <p className="font-extrabold text-gray-800 dark:text-slate-200 text-xs">Правило зеленого стикера</p>
                <p className="mt-0.5 text-gray-500 dark:text-slate-400 text-[10px]">
                  Товары, срок которых истекает завтра/послезавтра, уцениваются наставником с помощью акционной зеленой наклейки. Наклеивать только на заводской штрихкод, перекрывая его!
                </p>
              </div>

              <div className="border-l-2 border-green-600 pl-2">
                <p className="font-extrabold text-gray-800 dark:text-slate-200 text-xs">Частота аудита полок</p>
                <p className="mt-0.5 text-gray-500 dark:text-slate-400 text-[10px]">
                  Молочная продукция и хлеб проверяются дважды в день (утром в 8:00 при приемке и вечером в 19:00). Бакалея и кондитерские изделия проверяются раз в неделю по графику.
                </p>
              </div>

              <div className="border-l-2 border-red-500 pl-2">
                <p className="font-extrabold text-gray-800 dark:text-slate-200 text-xs">Правило товарного соседства</p>
                <p className="mt-0.5 text-gray-500 dark:text-slate-400 text-[10px]">
                  Категорически запрещено выкладывать молочные продукты или сыры рядом с резко пахнущими колбасными или рыбными изделиями. Каждая категория имеет строгие границы.
                </p>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}

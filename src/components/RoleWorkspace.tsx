import React, { useState, useEffect } from 'react';
import { 
  Users, UserPlus, UserMinus, ShieldAlert, TrendingDown, FileSignature, 
  RefreshCw, DollarSign, Calculator, Percent, Tag, Plus, CheckCircle, 
  Truck, ClipboardCheck, ScanLine, Barcode, Calendar, MapPin, ListPlus, Send, CircleDollarSign, Play, Square, ShoppingCart,
  Zap, CreditCard
} from 'lucide-react';
import { 
  getDBState, saveDBState, addTelemetry, DBTableData, 
  getActiveProductsFromDB, addProductToDB, addBatchToDB, 
  markdownBatchInDB, createWriteoffActInDB, approveActInDB, syncActTo1CInDB,
  updateEmployeeScheduleInDB, recordSaleInDB
} from '../data/databaseState';

interface RoleWorkspaceProps {
  currentUser: { id: string; name: string; role: string };
  onDbUpdate: () => void;
}

export default function RoleWorkspace({ currentUser, onDbUpdate }: RoleWorkspaceProps) {
  const [dbState, setDbState] = useState<DBTableData>(getDBState());
  
  // States for Director workspace
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpRole, setNewEmpRole] = useState('role_tra'); // default to cashier
  const [newEmpPersNum, setNewEmpPersNum] = useState('');
  const [selectedScheduleDay, setSelectedScheduleDay] = useState<'today' | 'tomorrow'>('today');
  
  // States for Senior Accountant
  const [priceChangeProduct, setPriceChangeProduct] = useState('');
  const [priceChangeNewPrice, setPriceChangeNewPrice] = useState('');

  // States for Senior Commodity Manager (Supply Ingestion)
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [supplyQty, setSupplyQty] = useState('');
  const [supplyManDate, setSupplyManDate] = useState('');
  const [supplyExpDate, setSupplyExpDate] = useState('');
  const [supplyLocation, setSupplyLocation] = useState('shelf_1'); // default to shelf 1
  
  // States for Cashier & Live POS simulation
  const [tsdSelectedProduct, setTsdSelectedProduct] = useState('');
  const [tsdStatusMessage, setTsdStatusMessage] = useState<string | null>(null);
  
  // New States for POS terminal
  const [posSelectedBatch, setPosSelectedBatch] = useState('');
  const [posQty, setPosQty] = useState('1');
  const [salesSimulationActive, setSalesSimulationActive] = useState(false);
  const [liveSalesJournal, setLiveSalesJournal] = useState<{ id: string; text: string; time: string }[]>([]);

  // Load and refresh state
  const refreshLocalState = () => {
    const updated = getDBState();
    setDbState(updated);
  };

  useEffect(() => {
    refreshLocalState();
    window.addEventListener('maria_ra_db_updated', refreshLocalState);
    return () => {
      window.removeEventListener('maria_ra_db_updated', refreshLocalState);
    };
  }, []);

  // Automatic customer sales simulator
  useEffect(() => {
    if (!salesSimulationActive) return;
    
    const interval = setInterval(() => {
      const state = getDBState();
      // Filter batches that have actual quantity
      const activeBatches = state.batches.filter(b => b.quantity > 0);
      if (activeBatches.length === 0) {
        setSalesSimulationActive(false);
        alert("Все товары распроданы! Оприходуйте новые поставки со склада, чтобы запустить симуляцию покупателей.");
        return;
      }
      
      const randomBatch = activeBatches[Math.floor(Math.random() * activeBatches.length)];
      const maxPurchase = Math.min(3, randomBatch.quantity);
      const buyQty = Math.floor(Math.random() * maxPurchase) + 1;
      
      const prod = state.products.find(p => p.id === randomBatch.product_id);
      if (!prod) return;
      
      const markdown = state.markdown_log.find(m => m.batch_id === randomBatch.id);
      const price = markdown ? markdown.new_price : prod.base_price;
      
      const success = recordSaleInDB(prod.id, buyQty, price, randomBatch.id);
      if (success) {
        triggerUpdate();
        const text = `Покупатель приобрел: ${prod.name} [${buyQty} шт.] за ${(buyQty * price).toFixed(2)} ₽`;
        setLiveSalesJournal(prev => [
          { id: `j_${Date.now()}`, text, time: new Date().toLocaleTimeString('ru-RU') },
          ...prev.slice(0, 19)
        ]);
      }
    }, 4000);
    
    return () => clearInterval(interval);
  }, [salesSimulationActive]);

  const handleUpdateSchedule = (employeeId: string, shiftName: string, status: string) => {
    updateEmployeeScheduleInDB(currentUser.id, employeeId, selectedScheduleDay, shiftName, status);
    triggerUpdate();
  };

  const triggerUpdate = () => {
    onDbUpdate();
    refreshLocalState();
    // Dispatch global storage event for other components
    window.dispatchEvent(new Event('maria_ra_db_updated'));
  };

  // --- DIRECTOR ACTIONS ---
  const handleHireEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmpName || !newEmpPersNum) {
      alert("Пожалуйста, заполните ФИО и табельный номер!");
      return;
    }
    
    const newState = { ...dbState };
    const empId = `emp_${Date.now()}`;
    
    newState.employees.unshift({
      id: empId,
      name: newEmpName,
      role_id: newEmpRole,
      store_id: 'store_1',
      personnel_number: newEmpPersNum,
      is_active: true
    });
    
    saveDBState(newState);
    addTelemetry(currentUser.id, 'HIRE_EMPLOYEE', { employee_name: newEmpName, personnel_number: newEmpPersNum });
    
    // Reset Form
    setNewEmpName('');
    setNewEmpPersNum('');
    triggerUpdate();
    alert(`Сотрудник ${newEmpName} успешно зачислен в штат розничной точки №142!`);
  };

  const handleFireEmployee = (empId: string, empName: string) => {
    if (empId === currentUser.id) {
      alert("Вы не можете уволить сами себя!");
      return;
    }
    if (window.confirm(`Вы уверены, что хотите деактивировать учетную запись сотрудника ${empName}?`)) {
      const newState = { ...dbState };
      const emp = newState.employees.find(e => e.id === empId);
      if (emp) {
        emp.is_active = false;
        saveDBState(newState);
        addTelemetry(currentUser.id, 'DEACTIVATE_EMPLOYEE', { employee_id: empId, name: empName });
        triggerUpdate();
        alert(`Сотрудник ${empName} переведен в архив штатного расписания.`);
      }
    }
  };

  const handleApproveAct = (actId: string, actNum: string) => {
    approveActInDB(actId, currentUser.id);
    triggerUpdate();
    alert(`Акт ${actNum} успешно заверен усиленной ЭЦП директора Ивановой А.С. и передан в бухгалтерию!`);
  };

  // --- ACCOUNTANT ACTIONS ---
  const handleExecute1C = (actId: string) => {
    syncActTo1CInDB(actId, currentUser.id);
    triggerUpdate();
    alert("Проводки успешно экспортированы в 1С:Предприятие 8.3! Сформированы дебетовые ордера по сч.94.");
  };

  const handleChangeProductPrice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!priceChangeProduct || !priceChangeNewPrice) {
      alert("Выберите товар и укажите цену!");
      return;
    }
    
    const newState = { ...dbState };
    const prod = newState.products.find(p => p.id === priceChangeProduct);
    if (prod) {
      const oldPrice = prod.base_price;
      const newPrice = parseFloat(priceChangeNewPrice);
      prod.base_price = newPrice;
      
      // Добавляем в историю цен
      newState.price_history.unshift({
        id: `ph_${Date.now()}`,
        product_id: priceChangeProduct,
        price_before: oldPrice,
        price_after: newPrice,
        changed_at: new Date().toISOString()
      });
      
      saveDBState(newState);
      addTelemetry(currentUser.id, 'CHANGE_PRODUCT_PRICE', { product_id: priceChangeProduct, old_price: oldPrice, new_price: newPrice });
      
      setPriceChangeProduct('');
      setPriceChangeNewPrice('');
      triggerUpdate();
      alert(`Ценник на «${prod.name}» успешно обновлен на кассах. Старая цена: ${oldPrice} руб., Новая цена: ${newPrice} руб.`);
    }
  };

  // --- COMMODITY MANAGER ACTIONS ---
  const handleIngestSupply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplier || !selectedProduct || !supplyQty || !supplyExpDate) {
      alert("Заполните все обязательные поля поставки!");
      return;
    }
    
    const qty = parseInt(supplyQty);
    const prod = dbState.products.find(p => p.id === selectedProduct);
    if (!prod) return;
    
    const totalSum = qty * prod.base_price * 0.7; // Себестоимость ~70% от розничной
    
    const newState = { ...dbState };
    const deliveryId = `del_${Date.now()}`;
    
    // 1. Добавляем поставку в накладные
    newState.deliveries.unshift({
      id: deliveryId,
      supplier_id: selectedSupplier,
      store_id: 'store_1',
      delivery_date: new Date().toISOString().split('T')[0],
      receiver_id: currentUser.id,
      total_sum: parseFloat(totalSum.toFixed(2))
    });
    
    // 2. Создаем новую партию на полках
    const batchId = `batch_${Date.now()}`;
    newState.batches.unshift({
      id: batchId,
      product_id: selectedProduct,
      store_id: 'store_1',
      quantity: qty,
      manufacture_date: supplyManDate || new Date().toISOString().split('T')[0],
      expiration_date: supplyExpDate,
      location_id: supplyLocation,
      added_at: new Date().toISOString()
    });
    
    saveDBState(newState);
    addTelemetry(currentUser.id, 'RECEIVE_DELIVERY', { delivery_id: deliveryId, product: prod.name, qty });
    
    // Reset Form
    setSelectedSupplier('');
    setSelectedProduct('');
    setSupplyQty('');
    setSupplyManDate('');
    setSupplyExpDate('');
    triggerUpdate();
    
    alert(`Поставка успешно оприходована! На полку выложено ${qty} шт. товара «${prod.name}» в зону выкладки.`);
  };

  // --- TRAINEE ACTIONS ---
  const handleTsdMarkdown = (percent: number) => {
    if (!tsdSelectedProduct) {
      alert("Сначала отсканируйте/выберите товар на ТСД!");
      return;
    }
    
    // Ищем партию этого товара на полке
    const batch = dbState.batches.find(b => b.product_id === tsdSelectedProduct);
    if (!batch) {
      alert("На полках магазина не найдено активных партий этого товара для уценки!");
      return;
    }
    
    markdownBatchInDB(batch.id, currentUser.id, percent);
    triggerUpdate();
    
    const prod = dbState.products.find(p => p.id === tsdSelectedProduct);
    setTsdStatusMessage(`✓ ТСД-СИГНАЛ: Напечатан ценник -${percent}% на «${prod?.name}». Новая цена: ${(prod!.base_price * (1 - percent/100)).toFixed(2)} руб.`);
    setTimeout(() => setTsdStatusMessage(null), 7000);
  };

  const handleTsdWriteOff = () => {
    if (!tsdSelectedProduct) {
      alert("Сначала отсканируйте/выберите товар на ТСД!");
      return;
    }
    
    const batch = dbState.batches.find(b => b.product_id === tsdSelectedProduct);
    if (!batch) {
      alert("Активная партия этого товара не найдена на полках!");
      return;
    }
    
    const prod = dbState.products.find(p => p.id === tsdSelectedProduct);
    if (!prod) return;
    
    // Создаем строку списания
    const items = [{
      product_id: prod.id,
      quantity: batch.quantity,
      reason: 'Истек срок годности (Обнаружено на ТСД)',
      unit_price: prod.base_price
    }];
    
    createWriteoffActInDB(currentUser.id, items);
    
    // Удаляем партию с полок (утилизируем)
    const newState = { ...dbState };
    newState.batches = newState.batches.filter(b => b.id !== batch.id);
    saveDBState(newState);
    
    triggerUpdate();
    setTsdSelectedProduct('');
    setTsdStatusMessage(`✓ ТСД-СИГНАЛ: Товар «${prod.name}» в количестве ${batch.quantity} шт. списан с полок в проект Акта ТОРГ-16.`);
    setTimeout(() => setTsdStatusMessage(null), 7000);
  };


  const handleManualSale = (e: React.FormEvent) => {
    e.preventDefault();
    if (!posSelectedBatch) {
      alert("Выберите товарную партию со стоком на полках!");
      return;
    }
    const batch = dbState.batches.find(b => b.id === posSelectedBatch);
    if (!batch) return;
    const qty = parseInt(posQty);
    if (isNaN(qty) || qty <= 0) {
      alert("Укажите корректное количество товара!");
      return;
    }
    if (batch.quantity < qty) {
      alert(`Недостаточно товара на полке! В наличии всего: ${batch.quantity} шт.`);
      return;
    }
    
    const prod = dbState.products.find(p => p.id === batch.product_id);
    if (!prod) return;
    
    const markdown = dbState.markdown_log.find(m => m.batch_id === batch.id);
    const price = markdown ? markdown.new_price : prod.base_price;
    
    const success = recordSaleInDB(prod.id, qty, price, batch.id);
    if (success) {
      setPosQty('1');
      setPosSelectedBatch('');
      triggerUpdate();
      
      const text = `Ручная продажа на кассе: ${prod.name} [${qty} шт.] на сумму ${(qty * price).toFixed(2)} ₽`;
      setLiveSalesJournal(prev => [
        { id: `j_${Date.now()}`, text, time: new Date().toLocaleTimeString('ru-RU') },
        ...prev.slice(0, 19)
      ]);
    }
  };


  return (
    <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-5 md:p-6 shadow-sm mb-6 transition-all no-print">
      
      {/* Workspace Header */}
      <div className="flex items-center space-x-2.5 border-b border-gray-50 dark:border-slate-800 pb-4 mb-5">
        <div className="p-2 bg-green-600 text-white rounded-lg">
          {currentUser.role === 'Директор магазина' && <Users className="w-5 h-5" />}
          {currentUser.role === 'Старший бухгалтер' && <Calculator className="w-5 h-5" />}
          {currentUser.role === 'Старший товаровед' && <Truck className="w-5 h-5" />}
          {currentUser.role === 'Товаровед-кассир' && <ScanLine className="w-5 h-5" />}
        </div>
        <div>
          <h4 className="text-xs font-black text-gray-900 dark:text-slate-100 uppercase tracking-wider">
            {currentUser.role === 'Директор магазина' && 'Интерактивный кабинет руководителя филиала'}
            {currentUser.role === 'Старший бухгалтер' && 'Рабочее место старшего бухгалтера: Финансы и Налоги'}
            {currentUser.role === 'Старший товаровед' && 'Операционная консоль старшего товароведа'}
            {currentUser.role === 'Товаровед-кассир' && 'Рабочее место товароведа-кассира: ТСД и Кассовый терминал'}
          </h4>
          <span className="text-[10px] text-gray-400 font-bold block mt-0.5">
            Платформа «Мария-Ра СУБД» • Роль: {currentUser.role}
          </span>
        </div>
      </div>

      {/* --- RENDER 1: DIRECTOR WORKSPACE --- */}
      {currentUser.role === 'Директор магазина' && (() => {
        // Calculate P&L figures
        const totalRevenue = dbState.sales_log?.reduce((sum, s) => sum + s.total_sum, 0) || 0;
        const totalCogs = totalRevenue * 0.6; // wholesale cost of goods ~ 60%
        
        const approvedActs = dbState.writeoff_acts.filter(act => act.approved_by_id);
        const totalWriteoffLosses = dbState.writeoff_items
          .filter(item => approvedActs.some(act => act.id === item.act_id))
          .reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
        
        const totalMarkdownLosses = dbState.markdown_log.reduce((sum, m) => {
          const prod = dbState.products.find(p => p.id === m.product_id);
          if (!prod) return sum;
          const diff = prod.base_price - m.new_price;
          const soldQty = dbState.sales_log
            ?.filter(s => s.product_id === prod.id && s.unit_price === m.new_price)
            ?.reduce((s, sitem) => s + sitem.quantity, 0) || 0;
          return sum + (soldQty * diff);
        }, 0);

        const netProfit = totalRevenue - totalCogs - totalWriteoffLosses - totalMarkdownLosses;

        return (
          <div className="space-y-6">
            
            {/* P&L Statement Scorecard Banner */}
            <div className="bg-gradient-to-br from-green-900 via-emerald-950 to-teal-950 border border-green-850 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/5 rounded-full -mr-20 -mt-20 blur-2xl"></div>
              
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-white/10 pb-4 mb-4 gap-4">
                <div>
                  <h5 className="text-[11px] font-black uppercase tracking-wider text-green-400 flex items-center space-x-1.5">
                    <CircleDollarSign className="w-4 h-4 text-green-400" />
                    <span>Сводный финансовый результат филиала №142 (Мария-Ра)</span>
                  </h5>
                  <p className="text-[10px] text-emerald-200/80 mt-0.5">
                    Интеграционная выгрузка кассовых продаж СУБД в реальном времени. Издержки уценки и ТОРГ-16 вычитаются автоматически.
                  </p>
                </div>
                
                <div className="bg-white/10 border border-white/15 px-3 py-1.5 rounded-lg text-[10px] font-mono flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-ping"></span>
                  <span>Транзакций в СУБД: {dbState.sales_log?.length || 0}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                
                <div className="bg-white/5 border border-white/5 rounded-xl p-3.5">
                  <span className="text-[9px] font-black text-emerald-300 uppercase block mb-1">Выручка касс</span>
                  <div className="text-lg font-black text-emerald-400 font-mono flex items-baseline">
                    <span>{totalRevenue.toLocaleString('ru-RU')}</span>
                    <span className="text-xs font-bold ml-1">₽</span>
                  </div>
                  <span className="text-[8px] text-emerald-200/60 block mt-1">100% чековые продажи</span>
                </div>

                <div className="bg-white/5 border border-white/5 rounded-xl p-3.5">
                  <span className="text-[9px] font-black text-slate-300 uppercase block mb-1">Себестоимость закупок</span>
                  <div className="text-lg font-black text-slate-300 font-mono flex items-baseline">
                    <span>-{totalCogs.toLocaleString('ru-RU')}</span>
                    <span className="text-xs font-bold ml-1">₽</span>
                  </div>
                  <span className="text-[8px] text-slate-400 block mt-1">Оценка закупа (60% розн.)</span>
                </div>

                <div className="bg-white/5 border border-white/5 rounded-xl p-3.5">
                  <span className="text-[9px] font-black text-rose-300 uppercase block mb-1">Списания (ТОРГ-16)</span>
                  <div className="text-lg font-black text-rose-400 font-mono flex items-baseline">
                    <span>-{totalWriteoffLosses.toLocaleString('ru-RU')}</span>
                    <span className="text-xs font-bold ml-1">₽</span>
                  </div>
                  <span className="text-[8px] text-rose-300/60 block mt-1">Утвержденный брак/порча</span>
                </div>

                <div className="bg-white/5 border border-white/5 rounded-xl p-3.5">
                  <span className="text-[9px] font-black text-amber-300 uppercase block mb-1">Упущенная выгода уценок</span>
                  <div className="text-lg font-black text-amber-400 font-mono flex items-baseline">
                    <span>-{totalMarkdownLosses.toLocaleString('ru-RU')}</span>
                    <span className="text-xs font-bold ml-1">₽</span>
                  </div>
                  <span className="text-[8px] text-amber-300/60 block mt-1">Скидки по свежести (FIFO)</span>
                </div>

                <div className="bg-white/10 border border-green-500/20 rounded-xl p-3.5 col-span-2 md:col-span-1">
                  <span className="text-[9px] font-black text-green-300 uppercase block mb-1">Чистая прибыль</span>
                  <div className={`text-lg font-black font-mono flex items-baseline ${netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    <span>{netProfit.toLocaleString('ru-RU')}</span>
                    <span className="text-xs font-bold ml-1">₽</span>
                  </div>
                  <span className="text-[8px] text-emerald-200/80 block mt-1">Финансовый итог филиала</span>
                </div>

              </div>

              <div className="mt-4 bg-black/20 rounded-lg p-3 text-[10px] leading-relaxed text-emerald-100/90 flex items-start space-x-2">
                <span className="text-green-400 font-extrabold">📌 Аналитическая справка СУБД:</span>
                <span>
                  Заработок (выручка) магазина поступает от розничной реализации товаров через кассы. Для стимуляции покупательской активности и получения живой прибыли перейдите под роль <b>«Товаровед-кассир»</b> и включите <b>«Автоматическую симуляцию покупателей»</b>. Данные выручки моментально обновятся на этой панели!
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Box 1: Interactive Employee Schedules */}
              <div className="bg-gray-50/50 dark:bg-slate-850/40 border border-gray-150 dark:border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h5 className="text-[11px] font-black text-gray-900 dark:text-slate-100 uppercase tracking-wider flex items-center space-x-1.5">
                      <Calendar className="w-4 h-4 text-green-600" />
                      <span>График рабочих смен персонала</span>
                    </h5>
                    
                    {/* Day Selector Tabs */}
                    <div className="bg-gray-200 dark:bg-slate-800 p-0.5 rounded-lg flex space-x-1">
                      <button
                        onClick={() => setSelectedScheduleDay('today')}
                        className={`px-2 py-0.5 text-[9px] font-extrabold uppercase rounded-md transition-all ${selectedScheduleDay === 'today' ? 'bg-white dark:bg-slate-700 text-green-700 dark:text-white shadow-xs' : 'text-gray-500 dark:text-slate-400 hover:text-gray-800'}`}
                      >
                        Сегодня
                      </button>
                      <button
                        onClick={() => setSelectedScheduleDay('tomorrow')}
                        className={`px-2 py-0.5 text-[9px] font-extrabold uppercase rounded-md transition-all ${selectedScheduleDay === 'tomorrow' ? 'bg-white dark:bg-slate-700 text-green-700 dark:text-white shadow-xs' : 'text-gray-500 dark:text-slate-400 hover:text-gray-800'}`}
                      >
                        Завтра
                      </button>
                    </div>
                  </div>

                  <p className="text-[10px] text-gray-500 dark:text-slate-400 font-medium mb-3 leading-relaxed">
                    Планирование выходов сотрудников розницы (5 человек, 2 рабочие смены). Изменения пишутся в СУБД-таблицу <span className="font-mono text-emerald-600 dark:text-emerald-400">employee_schedules</span>.
                  </p>

                  {/* Schedules Table */}
                  <div className="space-y-2 mb-4">
                    {dbState.employees.filter(e => e.is_active).map(emp => {
                      const sched = dbState.employee_schedules?.find(s => s.employee_id === emp.id && s.day_type === selectedScheduleDay);
                      const currentShift = sched ? sched.shift_name : '—';
                      const currentStatus = sched ? sched.status : 'Выходной';

                      return (
                        <div key={emp.id} className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-2.5 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs">
                          <div>
                            <span className="font-extrabold text-gray-900 dark:text-slate-100 block">{emp.name}</span>
                            <span className="text-[9px] text-gray-400 font-bold block">{dbState.roles.find(r => r.id === emp.role_id)?.name}</span>
                          </div>

                          <div className="flex items-center space-x-2 w-full sm:w-auto justify-between sm:justify-end">
                            {/* Shift Badge Indicator */}
                            <span className={`px-1.5 py-0.5 text-[9px] font-black uppercase rounded ${
                              currentStatus === 'Выходной' 
                                ? 'bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-slate-400' 
                                : currentShift.includes('Дневная') 
                                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                                  : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400'
                            }`}>
                              {currentStatus === 'Выходной' ? 'Выходной' : currentShift.split(' ')[0]}
                            </span>

                            {/* Dropdown to re-schedule */}
                            <select
                              value={currentStatus === 'Выходной' ? 'off' : currentShift}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === 'off') {
                                  handleUpdateSchedule(emp.id, '—', 'Выходной');
                                } else if (val.includes('Дневная')) {
                                  handleUpdateSchedule(emp.id, 'Дневная смена (08:00 - 15:30)', 'Работает');
                                } else {
                                  handleUpdateSchedule(emp.id, 'Вечерняя смена (15:30 - 23:00)', 'Работает');
                                }
                              }}
                              className="bg-gray-50 dark:bg-slate-800 border border-gray-150 dark:border-slate-750 rounded px-1.5 py-0.5 text-[10px] font-bold text-gray-700 dark:text-slate-300 focus:outline-none"
                            >
                              <option value="off">Выходной</option>
                              <option value="Дневная смена (08:00 - 15:30)">Дневная смена</option>
                              <option value="Вечерняя смена (15:30 - 23:00)">Вечерняя смена</option>
                            </select>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Sub Hiring Form if they want to expand */}
                <form onSubmit={handleHireEmployee} className="space-y-2 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-2.5 rounded-lg">
                  <span className="text-[9px] font-black text-gray-400 dark:text-slate-500 uppercase block">Принять нового работника в штат</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <input 
                      type="text" 
                      placeholder="ФИО сотрудника"
                      value={newEmpName}
                      onChange={(e) => setNewEmpName(e.target.value)}
                      className="bg-gray-50 dark:bg-slate-800 border border-gray-150 dark:border-slate-700 rounded px-2 py-1 text-[10px] font-bold text-gray-800 dark:text-slate-100"
                    />
                    <input 
                      type="text" 
                      placeholder="Табельный №"
                      value={newEmpPersNum}
                      onChange={(e) => setNewEmpPersNum(e.target.value)}
                      className="bg-gray-50 dark:bg-slate-800 border border-gray-150 dark:border-slate-700 rounded px-2 py-1 text-[10px] font-mono font-bold text-gray-800 dark:text-slate-100"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-1.5 pt-1">
                    <select
                      value={newEmpRole}
                      onChange={(e) => setNewEmpRole(e.target.value)}
                      className="bg-gray-50 dark:bg-slate-800 border border-gray-150 dark:border-slate-700 rounded px-2 py-1 text-[9px] font-bold text-gray-700 dark:text-slate-300 w-full"
                    >
                      <option value="role_tra">Товаровед-кассир</option>
                      <option value="role_com">Старший товаровед</option>
                      <option value="role_dir">Директор магазина</option>
                    </select>
                    <button
                      type="submit"
                      className="bg-green-600 hover:bg-green-700 text-white rounded px-2.5 py-1 text-[9px] font-black uppercase shrink-0 cursor-pointer"
                    >
                      Нанять
                    </button>
                  </div>
                </form>
              </div>

              {/* Box 2: Loss Analytics & Budget Gauge */}
              <div className="bg-gray-50/50 dark:bg-slate-850/40 border border-gray-150 dark:border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <h5 className="text-[11px] font-black text-gray-900 dark:text-slate-100 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                    <TrendingDown className="w-4 h-4 text-rose-500" />
                    <span>Финансовый аудит потерь филиала</span>
                  </h5>
                  <p className="text-[10px] text-gray-500 dark:text-slate-400 font-medium mb-3 leading-relaxed">
                    Автоматический подсчет всех списанных товаров по утвержденным актам ТОРГ-16 в текущем квартале.
                  </p>
                </div>

                <div className="space-y-3 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-4 rounded-lg flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold text-gray-500">Утвержденный ущерб:</span>
                      <span className="text-sm font-black text-rose-600 font-mono">{totalWriteoffLosses.toLocaleString('ru-RU')} ₽</span>
                    </div>
                    
                    <div className="space-y-1 mt-2">
                      <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-gray-400">Лимит потерь квартала:</span>
                        <span className="text-gray-700 dark:text-slate-300">150 000 ₽</span>
                      </div>
                      
                      {/* Progress Bar */}
                      {(() => {
                        const lossPercent = Math.min(100, Math.round((totalWriteoffLosses / 150000) * 100));
                        return (
                          <div className="w-full bg-gray-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                lossPercent > 80 ? 'bg-red-500' : lossPercent > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${lossPercent}%` }}
                            ></div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="flex items-start space-x-1.5 pt-2 border-t border-gray-50 dark:border-slate-800">
                    <ShieldAlert className="w-4 h-4 shrink-0 text-amber-500" />
                    <span className="text-[9px] text-gray-400 leading-normal font-medium">
                      Потери снижают облагаемую базу налога на прибыль согласно ст. 265 НК РФ после выгрузки в 1С Бухгалтерию.
                    </span>
                  </div>
                </div>
              </div>

              {/* Box 3: Approval Panel of TORG-16 */}
              <div className="bg-gray-50/50 dark:bg-slate-850/40 border border-gray-150 dark:border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <h5 className="text-[11px] font-black text-gray-900 dark:text-slate-100 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                    <FileSignature className="w-4 h-4 text-amber-500" />
                    <span>Утверждение актов ТОРГ-16 ({dbState.writeoff_acts.filter(a => !a.approved_by_id).length} шт.)</span>
                  </h5>
                  <p className="text-[10px] text-gray-500 dark:text-slate-400 font-medium mb-3 leading-relaxed">
                    Юридическая подпись ведомостей списания товара для проведения бухгалтерских проводок.
                  </p>
                </div>

                {/* Acts waiting signature */}
                <div className="space-y-1.5 max-h-44 overflow-y-auto custom-scrollbar flex-1">
                  {dbState.writeoff_acts.filter(a => !a.approved_by_id).length === 0 ? (
                    <div className="text-center py-8 text-gray-400 italic text-xs">
                      Нет актов, ожидающих подписания. Все документы утверждены.
                    </div>
                  ) : (
                    dbState.writeoff_acts.filter(a => !a.approved_by_id).map(act => {
                      const actItems = dbState.writeoff_items.filter(item => item.act_id === act.id);
                      const totalSum = actItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
                      const creator = dbState.employees.find(e => e.id === act.creator_id)?.name || 'ТСД Терминал';

                      return (
                        <div key={act.id} className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-2.5 rounded-lg flex justify-between items-center text-xs">
                          <div className="truncate pr-2">
                            <span className="font-mono font-black text-gray-900 dark:text-slate-100 block">{act.act_number}</span>
                            <span className="text-[9px] text-gray-400 block truncate font-medium">Составил: {creator} • {actItems.length} поз.</span>
                            <span className="text-[9px] text-rose-600 font-extrabold block font-mono">{totalSum.toFixed(2)} ₽</span>
                          </div>
                          <button
                            onClick={() => handleApproveAct(act.id, act.act_number)}
                            className="px-2.5 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-[10px] font-black uppercase tracking-tight shrink-0 cursor-pointer shadow-xs active:scale-97"
                          >
                            Заверить ЭЦП
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>
          </div>
        );
      })()}

      {/* --- RENDER 2: ACCOUNTANT WORKSPACE --- */}
      {currentUser.role === 'Старший бухгалтер' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Box 1: 1C Synchronization */}
          <div className="bg-gray-50/50 dark:bg-slate-850/40 border border-gray-150 dark:border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
            <div>
              <h5 className="text-[11px] font-black text-gray-900 dark:text-slate-100 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                <RefreshCw className="w-4 h-4 text-indigo-500" />
                <span>1С:Предприятие 8.3 Проводки ({dbState.writeoff_acts.filter(a => a.approved_by_id && !a.is_exported_to_1c).length} шт.)</span>
              </h5>
              <p className="text-[10px] text-gray-500 dark:text-slate-400 font-medium mb-3">
                Выгрузка утвержденных руководителем ТОРГ-16 под списание на Дебет счета 94 (Недостачи и потери).
              </p>
            </div>

            <div className="space-y-1.5 max-h-44 overflow-y-auto custom-scrollbar flex-1">
              {dbState.writeoff_acts.filter(a => a.approved_by_id && !a.is_exported_to_1c).length === 0 ? (
                <div className="text-center py-8 text-gray-400 italic text-xs">
                  Нет актов, готовых к выгрузке. Ожидайте подписания Директором.
                </div>
              ) : (
                dbState.writeoff_acts.filter(a => a.approved_by_id && !a.is_exported_to_1c).map(act => {
                  const items = dbState.writeoff_items.filter(i => i.act_id === act.id);
                  const sum = items.reduce((s, i) => s + (i.quantity * i.unit_price), 0);

                  return (
                    <div key={act.id} className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-2.5 rounded-lg flex justify-between items-center text-xs">
                      <div>
                        <span className="font-mono font-black text-gray-900 dark:text-slate-100 block">{act.act_number}</span>
                        <span className="text-[9px] text-emerald-600 block font-bold">✓ Подпись Ивановой подтверждена</span>
                        <span className="text-[9px] text-gray-500 font-mono block">Сумма: {sum.toFixed(2)} ₽</span>
                      </div>
                      <button
                        onClick={() => handleExecute1C(act.id)}
                        className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[10px] font-black uppercase tracking-tight cursor-pointer shadow-xs active:scale-97 shrink-0"
                      >
                        Провести в 1С
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Box 2: Profit Tax optimization (Art. 265 Tax Code of RF) */}
          <div className="bg-gray-50/50 dark:bg-slate-850/40 border border-gray-150 dark:border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
            <div>
              <h5 className="text-[11px] font-black text-gray-900 dark:text-slate-100 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                <Calculator className="w-4 h-4 text-emerald-500" />
                <span>Налоговая экономия (ст. 265 НК РФ)</span>
              </h5>
              <p className="text-[10px] text-gray-500 dark:text-slate-400 font-medium mb-3">
                Согласно подп. 2 п. 7 ст. 254 и ст. 265 НК РФ, потери в пределах норм естественной убыли и утилизация просрочки уменьшают налоговую базу по налогу на прибыль (20%).
              </p>
            </div>

            {(() => {
              const allSyncSum = dbState.writeoff_items
                .filter(item => dbState.writeoff_acts.find(act => act.id === item.act_id)?.is_exported_to_1c)
                .reduce((s, i) => s + (i.quantity * i.unit_price), 0);
              
              const taxShield = allSyncSum * 0.20;

              return (
                <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-3 rounded-lg text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-bold">Проведено списаний в 1С:</span>
                    <span className="font-mono font-black text-gray-950 dark:text-slate-100">{allSyncSum.toLocaleString('ru-RU')} ₽</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-50 dark:border-slate-800 pt-2">
                    <span className="text-emerald-700 dark:text-emerald-400 font-black">Снижение налога на прибыль:</span>
                    <span className="font-mono font-black text-emerald-600">{taxShield.toLocaleString('ru-RU')} ₽</span>
                  </div>
                  <div className="text-[8px] text-gray-400 leading-relaxed font-bold bg-gray-50 dark:bg-slate-800 p-1.5 rounded uppercase mt-1">
                    *Бухгалтерские проводки: Дт 94 - Кт 41.01 и Дт 99 - Кт 68 (Налог на прибыль) начислены автоматически.
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Box 3: Price management (price_history) */}
          <div className="bg-gray-50/50 dark:bg-slate-850/40 border border-gray-150 dark:border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
            <div>
              <h5 className="text-[11px] font-black text-gray-900 dark:text-slate-100 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                <Tag className="w-4 h-4 text-purple-500" />
                <span>Реестр изменения базовых цен номенклатуры</span>
              </h5>
              <p className="text-[10px] text-gray-500 dark:text-slate-400 font-medium mb-3">
                Переоценка товаров в номенклатуре. Каждое изменение автоматически записывается в таблицу <span className="font-mono font-bold">price_history</span>.
              </p>
            </div>

            <form onSubmit={handleChangeProductPrice} className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={priceChangeProduct}
                  onChange={(e) => setPriceChangeProduct(e.target.value)}
                  className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs font-bold text-gray-800 dark:text-slate-100 w-full"
                >
                  <option value="">-- Выберите товар --</option>
                  {dbState.products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.base_price}₽)</option>
                  ))}
                </select>
                <input 
                  type="number" 
                  step="0.01"
                  placeholder="Новая цена, ₽"
                  value={priceChangeNewPrice}
                  onChange={(e) => setPriceChangeNewPrice(e.target.value)}
                  className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs font-bold text-gray-850 dark:text-slate-100"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700 text-white rounded py-2 text-xs font-black uppercase tracking-wider cursor-pointer shadow-xs active:scale-98"
              >
                Опубликовать новые цены
              </button>
            </form>
          </div>

        </div>
      )}

      {/* --- RENDER 3: COMMODITY MANAGER WORKSPACE --- */}
      {currentUser.role === 'Старший товаровед' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Box 1: Receive Deliveries (Deliveries + Batches mutation) */}
          <div className="bg-gray-50/50 dark:bg-slate-850/40 border border-gray-150 dark:border-slate-800/80 rounded-xl p-4">
            <h5 className="text-[11px] font-black text-gray-900 dark:text-slate-100 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
              <Truck className="w-4 h-4 text-emerald-600" />
              <span>Оформление прихода поставок от контрагентов</span>
            </h5>
            <p className="text-[10px] text-gray-500 dark:text-slate-400 font-medium mb-3">
              Регистрация новых партий товаров. Добавляет строки в таблицы <span className="font-mono">deliveries</span> и <span className="font-mono">batches</span>.
            </p>

            <form onSubmit={handleIngestSupply} className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-4 rounded-lg">
              
              <div className="space-y-1">
                <label className="text-[9px] font-black text-gray-400 dark:text-slate-500 uppercase block">Контрагент-Поставщик</label>
                <select
                  value={selectedSupplier}
                  onChange={(e) => setSelectedSupplier(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-150 dark:border-slate-700 rounded px-2 py-1.5 text-xs font-bold text-gray-800 dark:text-slate-100"
                  required
                >
                  <option value="">-- Выбрать поставщика --</option>
                  {dbState.suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name} (ИНН {s.inn})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-gray-400 dark:text-slate-500 uppercase block">Товарная номенклатура</label>
                <select
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-150 dark:border-slate-700 rounded px-2 py-1.5 text-xs font-bold text-gray-800 dark:text-slate-100"
                  required
                >
                  <option value="">-- Выбрать товар --</option>
                  {dbState.products.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-gray-400 dark:text-slate-500 uppercase block">Объем поставки, шт.</label>
                <input 
                  type="number" 
                  placeholder="Количество коробок/штук"
                  value={supplyQty}
                  onChange={(e) => setSupplyQty(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-150 dark:border-slate-700 rounded px-2 py-1.5 text-xs font-bold text-gray-850 dark:text-slate-100"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-gray-400 dark:text-slate-500 uppercase block">Дата выработки партии</label>
                <input 
                  type="date" 
                  value={supplyManDate}
                  onChange={(e) => setSupplyManDate(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-150 dark:border-slate-700 rounded px-2 py-1.5 text-xs font-bold text-gray-850 dark:text-slate-100 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-gray-400 dark:text-slate-500 uppercase block">Дата окончания годности (Важно!)</label>
                <input 
                  type="date" 
                  value={supplyExpDate}
                  onChange={(e) => setSupplyExpDate(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-150 dark:border-slate-700 rounded px-2 py-1.5 text-xs font-bold text-gray-850 dark:text-slate-100 font-mono"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-gray-400 dark:text-slate-500 uppercase block">Куда выгрузить в зале</label>
                <select
                  value={supplyLocation}
                  onChange={(e) => setSupplyLocation(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-150 dark:border-slate-700 rounded px-2 py-1.5 text-xs font-bold text-gray-800 dark:text-slate-100"
                >
                  {dbState.shelf_locations.map(loc => (
                    <option key={loc.id} value={loc.id}>{loc.zone_code} ({loc.description})</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2 pt-2">
                <button
                  type="submit"
                  className="w-full flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 text-white font-black uppercase tracking-wider py-2.5 rounded-lg text-xs cursor-pointer active:scale-98 shadow-sm transition-all"
                >
                  <ListPlus className="w-4 h-4" />
                  <span>Оприходовать поставку на полку</span>
                </button>
              </div>

            </form>
          </div>

          {/* Box 2: Suppliers Directory */}
          <div className="bg-gray-50/50 dark:bg-slate-850/40 border border-gray-150 dark:border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
            <div>
              <h5 className="text-[11px] font-black text-gray-900 dark:text-slate-100 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                <ClipboardCheck className="w-4 h-4 text-blue-600" />
                <span>Справочник поставщиков ТС «Мария-Ра»</span>
              </h5>
              <p className="text-[10px] text-gray-500 dark:text-slate-400 font-medium mb-3">
                Активный реестр контрагентов Алтайского Края и Сибири для заключения логистических соглашений.
              </p>
            </div>

            <div className="space-y-1.5 max-h-64 overflow-y-auto custom-scrollbar flex-1">
              {dbState.suppliers.map(sup => (
                <div key={sup.id} className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-3 rounded-lg text-xs flex justify-between items-center">
                  <div>
                    <span className="font-extrabold block text-gray-900 dark:text-slate-100">{sup.name}</span>
                    <span className="text-[9px] text-gray-400 block font-medium">ИНН: {sup.inn} | Тел: {sup.phone || '—'}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                    sup.reliability_rating === 'A+' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    Рейтинг: {sup.reliability_rating}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* --- RENDER 4: COMMODITY CASHIER WORKSPACE --- */}
      {currentUser.role === 'Товаровед-кассир' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Column 1: Portative TSD Barcode Scanner Simulator */}
          <div className="bg-gray-950 text-slate-100 rounded-2xl p-4 border-4 border-slate-700 shadow-md flex flex-col justify-between font-mono relative overflow-hidden h-[360px]">
            <div className="absolute top-0 right-0 p-2 bg-emerald-500 text-slate-950 text-[8px] font-black rounded-bl uppercase">
              ТСД-10 ONLINE
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-1.5 text-emerald-400 border-b border-slate-800 pb-2">
                <Barcode className="w-5 h-5" />
                <span className="text-xs uppercase font-extrabold">Лазерный ТСД Терминал</span>
              </div>

              {/* Selector to simulate physical scan */}
              <div className="space-y-1">
                <label className="text-[9px] text-slate-400 uppercase block font-bold">Выберите товар на полке для наведения лазера:</label>
                <select
                  value={tsdSelectedProduct}
                  onChange={(e) => setTsdSelectedProduct(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-2 text-xs font-bold text-emerald-400 focus:outline-none"
                >
                  <option value="">-- НАВЕДИТЕ ЛАЗЕР НА ШТРИХКОД --</option>
                  {dbState.products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.barcode})</option>
                  ))}
                </select>
              </div>

              {/* Scan detail output */}
              {tsdSelectedProduct ? (
                (() => {
                  const prod = dbState.products.find(p => p.id === tsdSelectedProduct);
                  const bList = dbState.batches.filter(b => b.product_id === tsdSelectedProduct && b.quantity > 0);
                  const totalQty = bList.reduce((s, b) => s + b.quantity, 0);

                  return (
                    <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 text-[11px] space-y-1 text-slate-300">
                      <div><span className="text-slate-500">АРТИКУЛ:</span> <span className="text-slate-100 font-bold">{prod?.name}</span></div>
                      <div><span className="text-slate-500">ШТРИХКОД:</span> <span className="text-emerald-400 font-mono font-bold">{prod?.barcode}</span></div>
                      <div><span className="text-slate-500">ОСТАТОК В ЗАЛЕ:</span> <span className="text-amber-400 font-black">{totalQty} шт.</span> ({bList.length} активных партий)</div>
                      {bList.length > 0 && (
                        <div className="text-red-400 text-[10px] font-bold mt-1">
                          ➔ Срок годности ближайшего: {bList[0].expiration_date.split('-').reverse().join('.')}
                        </div>
                      )}
                    </div>
                  );
                })()
              ) : (
                <div className="bg-slate-900/40 py-8 rounded-lg border border-dashed border-slate-800 text-center text-xs text-slate-500 font-bold">
                  [ ОЖИДАНИЕ СКАНИРОВАНИЯ ТОВАРА ]
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-900">
              <button
                onClick={() => handleTsdMarkdown(30)}
                disabled={!tsdSelectedProduct}
                className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 rounded py-2 text-[10px] font-black uppercase text-center cursor-pointer transition-all active:scale-97"
              >
                Уценка -30%
              </button>
              <button
                onClick={() => handleTsdMarkdown(50)}
                disabled={!tsdSelectedProduct}
                className="bg-amber-400 hover:bg-amber-500 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 rounded py-2 text-[10px] font-black uppercase text-center cursor-pointer transition-all active:scale-97"
              >
                Уценка -50%
              </button>
              <button
                onClick={handleTsdWriteOff}
                disabled={!tsdSelectedProduct}
                className="bg-red-600 hover:bg-red-700 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded py-2 text-[10px] font-black uppercase text-center cursor-pointer transition-all active:scale-97"
              >
                ТОРГ-16 списать
              </button>
            </div>
          </div>

          {/* Column 2: POS Checkout Terminal & Cash Register */}
          <div className="bg-gray-50/50 dark:bg-slate-850/40 border border-gray-150 dark:border-slate-800/80 rounded-xl p-4 flex flex-col justify-between h-[360px]">
            <div>
              <div className="flex justify-between items-center mb-2">
                <h5 className="text-[11px] font-black text-gray-900 dark:text-slate-100 uppercase tracking-wider flex items-center space-x-1.5">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  <span>Кассовый терминал POS</span>
                </h5>
                
                {/* Traffic Simulator Toggle */}
                <div className="flex items-center space-x-1.5 bg-green-100 dark:bg-green-950/40 px-2 py-1 rounded-md">
                  <input
                    type="checkbox"
                    id="auto-sim-checkbox"
                    checked={salesSimulationActive}
                    onChange={(e) => setSalesSimulationActive(e.target.checked)}
                    className="w-3 h-3 text-green-600 rounded focus:ring-green-500 cursor-pointer"
                  />
                  <label htmlFor="auto-sim-checkbox" className="text-[9px] font-black uppercase text-green-800 dark:text-green-400 cursor-pointer select-none">
                    Покупатели {salesSimulationActive ? 'ВКЛ' : 'ВЫКЛ'}
                  </label>
                </div>
              </div>
              
              <p className="text-[10px] text-gray-500 dark:text-slate-400 font-medium mb-3 leading-relaxed">
                Обслуживание покупателей в торговом зале. Каждая покупка списывает остаток товара и записывает прибыль в таблицу <span className="font-mono text-emerald-600 dark:text-emerald-400">sales_log</span>.
              </p>

              {/* Cash Register Form */}
              <div className="space-y-2 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-3 rounded-lg text-xs">
                <div>
                  <label className="text-[9px] font-black text-gray-400 uppercase block mb-1">Выбор партии с полки:</label>
                  <select
                    value={posSelectedBatch}
                    onChange={(e) => setPosSelectedBatch(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-150 dark:border-slate-700 rounded px-2 py-1.5 font-bold text-gray-800 dark:text-slate-100 text-xs"
                  >
                    <option value="">-- Выбрать партию в зале --</option>
                    {dbState.batches.filter(b => b.quantity > 0).map(b => {
                      const prod = dbState.products.find(p => p.id === b.product_id);
                      return (
                        <option key={b.id} value={b.id}>
                          {prod?.name} (Партия #${(b.batch_number || b.id || '').slice(-4)} • {b.quantity} шт • {prod?.base_price}₽)
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] font-black text-gray-400 uppercase block mb-1">Количество, шт:</label>
                    <input
                      type="number"
                      min="1"
                      value={posQty}
                      onChange={(e) => setPosQty(e.target.value)}
                      className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-150 dark:border-slate-700 rounded px-2 py-1.5 font-bold text-gray-850 dark:text-slate-100 text-xs"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      onClick={handleManualSale}
                      disabled={!posSelectedBatch}
                      className="w-full py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-100 disabled:text-gray-400 dark:disabled:bg-slate-800 dark:disabled:text-slate-600 text-white font-black uppercase text-[10px] rounded cursor-pointer transition-all active:scale-97"
                    >
                      Продать чек
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded p-2.5 flex items-start space-x-1.5">
              <Zap className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="text-[9px] text-amber-800 dark:text-amber-300 font-medium leading-normal">
                При включении чекбокса «Покупатели ВКЛ» запускается автоматический робот касс, имитирующий реальный трафик розничных клиентов раз в 4 секунды.
              </span>
            </div>
          </div>

          {/* Column 3: Practice audit list & log */}
          <div className="bg-gray-50/50 dark:bg-slate-850/40 border border-gray-150 dark:border-slate-800/80 rounded-xl p-4 flex flex-col justify-between h-[360px]">
            <div>
              <h5 className="text-[11px] font-black text-gray-900 dark:text-slate-100 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>Чек-лента кассового аппарата</span>
              </h5>
              <p className="text-[10px] text-gray-500 dark:text-slate-400 font-medium mb-3">
                Лента продаж кассового узла и системные логи телеметрии ТСД.
              </p>
            </div>

            <div className="flex-1 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-lg p-3 overflow-y-auto custom-scrollbar flex flex-col justify-between">
              
              {/* Receipts ticker */}
              <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar flex-1 mb-2">
                {tsdStatusMessage && (
                  <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-300 p-2.5 rounded text-[10px] font-bold animate-fade-in flex items-start space-x-1.5">
                    <span>🎉 {tsdStatusMessage}</span>
                  </div>
                )}

                {liveSalesJournal.length === 0 ? (
                  <div className="text-center py-10 text-gray-400 italic text-[10px]">
                    Ожидание розничных транзакций. Продайте чек вручную или включите Робот-Симулятор!
                  </div>
                ) : (
                  liveSalesJournal.map(item => (
                    <div key={item.id} className="text-[10px] font-mono leading-tight border-b border-gray-50 dark:border-slate-850 py-1 font-bold text-emerald-600 dark:text-emerald-400 flex justify-between">
                      <span className="truncate">🛍️ {item.text}</span>
                      <span className="text-gray-400 ml-1 shrink-0">{item.time}</span>
                    </div>
                  ))
                )}
              </div>

              {/* TSD telemetry ticker bottom */}
              <div className="border-t border-gray-100 dark:border-slate-800 pt-2">
                <span className="text-[9px] font-black text-gray-400 uppercase block mb-1">Системные логи ТСД:</span>
                <div className="space-y-1">
                  {(dbState.system_telemetry || []).slice(0, 2).map(log => {
                    const emp = dbState.employees.find(e => e.id === log.employee_id)?.name || 'Кассир';
                    return (
                      <div key={log.id} className="text-[9px] font-mono leading-tight text-gray-400 dark:text-slate-500">
                        [{(log.occurred_at || '').slice(11, 19)}] {log.action_type} • {emp}
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>

        </div>
      )}

    </div>
  );
}

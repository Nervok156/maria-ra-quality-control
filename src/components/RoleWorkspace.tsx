import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  TrendingDown,
  FileSignature,
  Calendar as CalendarIcon,
  Truck,
  ClipboardCheck,
  ScanLine,
  Barcode,
  CreditCard,
  CheckCircle,
  Zap,
  CircleDollarSign,
  ListPlus,
  ShieldAlert
} from 'lucide-react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import {
  getProducts,
  getBatches,
  getWriteoffActs,
  getWriteoffItems,
  getMarkdownLog,
  getSalesLog,
  getEmployees,
  getRoles,
  getStores,
  getSuppliers,
  getShelfLocations,
  getDeliveries,
  getAuditLogs,
  getPriceHistory,
  getTelemetry,
  getEmployeeSchedules,
  getSchedulesByDate,
  updateScheduleForDate,
  recordSaleInSupabase,
  createBatch,
  createMarkdown,
  createWriteoffAct,
  createWriteoffItems,
  approveWriteoffAct,
  addTelemetry
} from '../api/databaseAPI';
import { supabase } from '../lib/supabaseClient';

interface RoleWorkspaceProps {
  currentUser: { id: string; name: string; role: string };
  onDbUpdate: () => Promise<void>;
}

export default function RoleWorkspace({ currentUser, onDbUpdate }: RoleWorkspaceProps) {
  // Состояния для данных
  const [dbState, setDbState] = useState<any>({
    products: [],
    batches: [],
    employees: [],
    roles: [],
    stores: [],
    suppliers: [],
    shelf_locations: [],
    writeoff_acts: [],
    writeoff_items: [],
    markdown_log: [],
    deliveries: [],
    audit_logs: [],
    price_history: [],
    system_telemetry: [],
    employee_schedules: [],
    sales_log: []
  });

  // Состояния для директора
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpRole, setNewEmpRole] = useState('role_tra');
  const [newEmpPersNum, setNewEmpPersNum] = useState('');
  const [selectedScheduleDay, setSelectedScheduleDay] = useState<'today' | 'tomorrow'>('today');

  // Состояния для товароведа
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [supplyQty, setSupplyQty] = useState('');
  const [supplyManDate, setSupplyManDate] = useState('');
  const [supplyExpDate, setSupplyExpDate] = useState('');
  const [supplyLocation, setSupplyLocation] = useState('shelf_1');

  // Состояния для кассира
  const [tsdSelectedProduct, setTsdSelectedProduct] = useState('');
  const [tsdStatusMessage, setTsdStatusMessage] = useState<string | null>(null);
  const [posSelectedBatch, setPosSelectedBatch] = useState('');
  const [posQty, setPosQty] = useState('1');
  const [salesSimulationActive, setSalesSimulationActive] = useState(false);
  const [liveSalesJournal, setLiveSalesJournal] = useState<{ id: string; text: string; time: string }[]>([]);

  // Состояния для календаря
  const [schedules, setSchedules] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'month'>('day');
  const [showCalendar, setShowCalendar] = useState(false);

  // Загрузка данных
  const loadDataFromSupabase = async () => {
    try {
      console.log('📥 Загружаем данные из Supabase...');

      const [
        products,
        batches,
        employees,
        roles,
        stores,
        suppliers,
        shelfLocations,
        writeoffActs,
        writeoffItems,
        markdownLog,
        deliveries,
        auditLogs,
        priceHistory,
        telemetry,
        schedules,
        salesLog
      ] = await Promise.all([
        getProducts(),
        getBatches(),
        getEmployees(),
        getRoles(),
        getStores(),
        getSuppliers(),
        getShelfLocations(),
        getWriteoffActs(),
        getWriteoffItems(),
        getMarkdownLog(),
        getDeliveries(),
        getAuditLogs(),
        getPriceHistory(),
        getTelemetry(),
        getEmployeeSchedules(),
        getSalesLog()
      ]);

      setDbState({
        products: products || [],
        batches: batches || [],
        employees: employees || [],
        roles: roles || [],
        stores: stores || [],
        suppliers: suppliers || [],
        shelf_locations: shelfLocations || [],
        writeoff_acts: writeoffActs || [],
        writeoff_items: writeoffItems || [],
        markdown_log: markdownLog || [],
        deliveries: deliveries || [],
        audit_logs: auditLogs || [],
        price_history: priceHistory || [],
        system_telemetry: telemetry || [],
        employee_schedules: schedules || [],
        sales_log: salesLog || [],
        categories: []
      });

      console.log('✅ Данные загружены');
    } catch (error) {
      console.error('❌ Ошибка загрузки данных из Supabase:', error);
    }
  };

  // Загрузка расписания
  const loadSchedules = async (date: Date) => {
    try {
      console.log('📥 Загружаем расписание на', date.toLocaleDateString('ru-RU'));
      const data = await getSchedulesByDate(date);
      setSchedules(data);
      console.log('✅ Загружено записей:', data.length);
    } catch (error) {
      console.error('❌ Ошибка загрузки расписания:', error);
    }
  };

  // Effect для загрузки данных
  useEffect(() => {
    loadDataFromSupabase();

    window.addEventListener('maria_ra_db_updated', loadDataFromSupabase);
    return () => {
      window.removeEventListener('maria_ra_db_updated', loadDataFromSupabase);
    };
  }, []);

  useEffect(() => {
    if (viewMode === 'day') {
      let date = new Date();
      if (selectedScheduleDay === 'tomorrow') {
        date.setDate(date.getDate() + 1);
      }
      const newDate = new Date(date);
      newDate.setHours(0, 0, 0, 0);
      setSelectedDate(newDate);
      loadSchedules(newDate);
    }
  }, [selectedScheduleDay, viewMode]);

  useEffect(() => {
    if (viewMode === 'month' && selectedDate) {
      loadSchedules(selectedDate);
    }
  }, [selectedDate, viewMode]);

  // Автоматическая симуляция покупателей
  useEffect(() => {
    if (!salesSimulationActive) return;

    const interval = setInterval(async () => {
      try {
        const batches = await getBatches();
        const activeBatches = batches.filter(b => b.quantity > 0);

        if (activeBatches.length === 0) {
          setSalesSimulationActive(false);
          alert("Все товары распроданы! Оприходуйте новые поставки со склада, чтобы запустить симуляцию покупателей.");
          return;
        }

        const randomBatch = activeBatches[Math.floor(Math.random() * activeBatches.length)];
        const maxPurchase = Math.min(3, randomBatch.quantity);
        const buyQty = Math.floor(Math.random() * maxPurchase) + 1;

        const products = await getProducts();
        const prod = products.find(p => p.id === randomBatch.product_id);
        if (!prod) return;

        const markdowns = await getMarkdownLog();
        const markdown = markdowns.find(m => m.batch_id === randomBatch.id);
        const price = markdown ? markdown.new_price : prod.base_price;

        const success = await recordSaleInSupabase(prod.id, buyQty, price, randomBatch.id);
        if (success) {
          await triggerUpdate();
          const text = `Покупатель приобрел: ${prod.name} [${buyQty} шт.] за ${(buyQty * price).toFixed(2)} ₽`;
          setLiveSalesJournal(prev => [
            { id: `j_${Date.now()}`, text, time: new Date().toLocaleTimeString('ru-RU') },
            ...prev.slice(0, 19)
          ]);
        }
      } catch (error) {
        console.error('❌ Ошибка в симуляции:', error);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [salesSimulationActive]);

  const triggerUpdate = async () => {
    await onDbUpdate();
    await loadDataFromSupabase();
    window.dispatchEvent(new Event('maria_ra_db_updated'));
  };

  const isPastDate = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate < today;
  };

  // ==========================================================
  // ДЕЙСТВИЯ ДИРЕКТОРА
  // ==========================================================
  const handleHireEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmpName || !newEmpPersNum) {
      alert("Пожалуйста, заполните ФИО и табельный номер!");
      return;
    }

    try {
      const { data, error } = await supabase
        .from('employees')
        .insert([{
          id: `emp_${Date.now()}`,
          name: newEmpName,
          role_id: newEmpRole,
          store_id: 'store_1',
          personnel_number: newEmpPersNum,
          is_active: true
        }])
        .select();

      if (error) throw error;

      await addTelemetry({
        employee_id: currentUser.id,
        action_type: 'HIRE_EMPLOYEE',
        payload: { employee_name: newEmpName, personnel_number: newEmpPersNum }
      });

      setNewEmpName('');
      setNewEmpPersNum('');
      await triggerUpdate();
      alert(`Сотрудник ${newEmpName} успешно зачислен в штат розничной точки №142!`);
    } catch (error) {
      console.error('❌ Ошибка при найме сотрудника:', error);
      alert('Не удалось нанять сотрудника.');
    }
  };

  const handleFireEmployee = async (empId: string, empName: string) => {
    if (empId === currentUser.id) {
      alert("Вы не можете уволить сами себя!");
      return;
    }
    if (window.confirm(`Вы уверены, что хотите деактивировать учетную запись сотрудника ${empName}?`)) {
      try {
        await supabase
          .from('employees')
          .update({ is_active: false })
          .eq('id', empId);

        await addTelemetry({
          employee_id: currentUser.id,
          action_type: 'DEACTIVATE_EMPLOYEE',
          payload: { employee_id: empId, name: empName }
        });

        await triggerUpdate();
        alert(`Сотрудник ${empName} переведен в архив штатного расписания.`);
      } catch (error) {
        console.error('❌ Ошибка при увольнении:', error);
        alert('Не удалось уволить сотрудника.');
      }
    }
  };

  const handleApproveAct = async (actId: string, actNum: string) => {
    try {
      await approveWriteoffAct(actId, currentUser.id);
      await triggerUpdate();
      alert(`Акт ${actNum} успешно заверен усиленной ЭЦП директора!`);
    } catch (error) {
      console.error('❌ Ошибка при утверждении акта:', error);
      alert('Не удалось утвердить акт.');
    }
  };

  const handleUpdateSchedule = async (employeeId: string, shiftName: string, status: string) => {
    try {
      const date = new Date();
      if (selectedScheduleDay === 'tomorrow') {
        date.setDate(date.getDate() + 1);
      }

      await updateScheduleForDate(employeeId, date, shiftName, status, 'weekday');
      await loadSchedules(date);
      await triggerUpdate();
    } catch (error) {
      console.error('❌ Ошибка при обновлении расписания:', error);
      alert('Не удалось обновить расписание.');
    }
  };

  // ==========================================================
  // ДЕЙСТВИЯ СТАРШЕГО ТОВАРОВЕДА
  // ==========================================================
  const handleIngestSupply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplier || !selectedProduct || !supplyQty || !supplyExpDate) {
      alert("Заполните все обязательные поля поставки!");
      return;
    }

    try {
      const qty = parseInt(supplyQty);
      const products = await getProducts();
      const prod = products.find(p => p.id === selectedProduct);
      if (!prod) throw new Error('Товар не найден');

      const totalSum = qty * prod.base_price * 0.7;

      const { data: delivery, error: deliveryError } = await supabase
        .from('deliveries')
        .insert([{
          id: `del_${Date.now()}`,
          supplier_id: selectedSupplier,
          store_id: 'store_1',
          delivery_date: new Date().toISOString().split('T')[0],
          receiver_id: currentUser.id,
          total_sum: parseFloat(totalSum.toFixed(2))
        }])
        .select();

      if (deliveryError) throw deliveryError;

      await createBatch({
        product_id: selectedProduct,
        store_id: 'store_1',
        quantity: qty,
        manufacture_date: supplyManDate || new Date().toISOString().split('T')[0],
        expiration_date: supplyExpDate,
        location_id: supplyLocation
      });

      await addTelemetry({
        employee_id: currentUser.id,
        action_type: 'RECEIVE_DELIVERY',
        payload: { delivery_id: delivery?.[0]?.id, product: prod.name, qty }
      });

      setSelectedSupplier('');
      setSelectedProduct('');
      setSupplyQty('');
      setSupplyManDate('');
      setSupplyExpDate('');
      await triggerUpdate();

      alert(`Поставка успешно оприходована! На полку выложено ${qty} шт. товара «${prod.name}».`);
    } catch (error) {
      console.error('❌ Ошибка при оприходовании поставки:', error);
      alert('Не удалось оприходовать поставку.');
    }
  };

  // ==========================================================
  // ДЕЙСТВИЯ КАССИРА
  // ==========================================================
  const handleTsdMarkdown = async (percent: number) => {
    if (!tsdSelectedProduct) {
      alert("Сначала отсканируйте/выберите товар на ТСД!");
      return;
    }

    try {
      const batches = await getBatches();
      const batch = batches.find(b => b.product_id === tsdSelectedProduct);
      if (!batch) {
        alert("На полках магазина не найдено активных партий этого товара для уценки!");
        return;
      }

      const products = await getProducts();
      const prod = products.find(p => p.id === tsdSelectedProduct);
      if (!prod) throw new Error('Товар не найден');

      await createMarkdown({
        batch_id: batch.id,
        employee_id: currentUser.id,
        discount_percent: percent,
        old_price: prod.base_price,
        new_price: Math.round(prod.base_price * (1 - percent / 100))
      });

      await triggerUpdate();

      setTsdStatusMessage(
        `✓ ТСД-СИГНАЛ: Напечатан ценник -${percent}% на «${prod.name}». Новая цена: ${(prod.base_price * (1 - percent / 100)).toFixed(2)} руб.`
      );
      setTimeout(() => setTsdStatusMessage(null), 7000);
    } catch (error) {
      console.error('❌ Ошибка при уценке:', error);
      alert('Не удалось применить уценку.');
    }
  };

  const handleTsdWriteOff = async () => {
    if (!tsdSelectedProduct) {
      alert("Сначала отсканируйте/выберите товар на ТСД!");
      return;
    }

    try {
      const batches = await getBatches();
      const batch = batches.find(b => b.product_id === tsdSelectedProduct);
      if (!batch) {
        alert("Активная партия этого товара не найдена на полках!");
        return;
      }

      const products = await getProducts();
      const prod = products.find(p => p.id === tsdSelectedProduct);
      if (!prod) throw new Error('Товар не найден');

      const actNumber = `АКТ-ТОРГ16-00${Date.now().toString().slice(-5)}`;
      const act = await createWriteoffAct({
        act_number: actNumber,
        store_id: 'store_1',
        creator_id: currentUser.id,
        approved_by_id: null,
        is_exported_to_1c: false
      });

      if (!act) throw new Error('Не удалось создать акт списания');

      await createWriteoffItems([{
        act_id: act.id,
        product_id: prod.id,
        quantity: batch.quantity,
        reason: 'Истек срок годности (Обнаружено на ТСД)',
        unit_price: prod.base_price
      }]);

      await supabase
        .from('batches')
        .update({
          is_written_off: true,
          writeoff_reason: 'Истек срок годности (Обнаружено на ТСД)'
        })
        .eq('id', batch.id);

      await addTelemetry({
        employee_id: currentUser.id,
        action_type: 'CREATE_WRITEOFF_ACT',
        payload: { act_id: act.id, items_count: 1 }
      });

      await triggerUpdate();
      setTsdSelectedProduct('');
      setTsdStatusMessage(
        `✓ ТСД-СИГНАЛ: Товар «${prod.name}» в количестве ${batch.quantity} шт. списан с полок в проект Акта ТОРГ-16.`
      );
      setTimeout(() => setTsdStatusMessage(null), 7000);
    } catch (error) {
      console.error('❌ Ошибка при списании:', error);
      alert('Не удалось списать товар.');
    }
  };

  const handleManualSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!posSelectedBatch) {
      alert("Выберите товарную партию со стоком на полках!");
      return;
    }

    try {
      const batches = await getBatches();
      const batch = batches.find(b => b.id === posSelectedBatch);
      if (!batch) throw new Error('Партия не найдена');

      const qty = parseInt(posQty);
      if (isNaN(qty) || qty <= 0) {
        alert("Укажите корректное количество товара!");
        return;
      }

      if (batch.quantity < qty) {
        alert(`Недостаточно товара на полке! В наличии всего: ${batch.quantity} шт.`);
        return;
      }

      const products = await getProducts();
      const prod = products.find(p => p.id === batch.product_id);
      if (!prod) throw new Error('Товар не найден');

      const markdowns = await getMarkdownLog();
      const markdown = markdowns.find(m => m.batch_id === batch.id);
      const price = markdown ? markdown.new_price : prod.base_price;

      const success = await recordSaleInSupabase(prod.id, qty, price, batch.id);
      if (success) {
        setPosQty('1');
        setPosSelectedBatch('');
        await triggerUpdate();

        const text = `Ручная продажа на кассе: ${prod.name} [${qty} шт.] на сумму ${(qty * price).toFixed(2)} ₽`;
        setLiveSalesJournal(prev => [
          { id: `j_${Date.now()}`, text, time: new Date().toLocaleTimeString('ru-RU') },
          ...prev.slice(0, 19)
        ]);
      }
    } catch (error) {
      console.error('❌ Ошибка при продаже:', error);
      alert('Не удалось провести продажу.');
    }
  };

  // ==========================================================
  // РАСЧЕТЫ ДЛЯ ДИРЕКТОРА
  // ==========================================================
  const totalRevenue = dbState.sales_log?.reduce((sum: number, s: any) => sum + (s.total_sum || 0), 0) || 0;
  const totalCogs = totalRevenue * 0.6;
  const approvedActs = dbState.writeoff_acts?.filter((act: any) => act.approved_by_id) || [];
  const totalWriteoffLosses = dbState.writeoff_items
    ?.filter((item: any) => approvedActs.some((act: any) => act.id === item.act_id))
    .reduce((sum: number, item: any) => sum + (item.quantity * item.unit_price), 0) || 0;
  const totalMarkdownLosses = dbState.markdown_log?.reduce((sum: number, m: any) => {
    const prod = dbState.products?.find((p: any) => p.id === m.product_id);
    if (!prod) return sum;
    const diff = prod.base_price - m.new_price;
    const soldQty = dbState.sales_log
      ?.filter((s: any) => s.product_id === prod.id && s.unit_price === m.new_price)
      ?.reduce((s: number, sitem: any) => s + sitem.quantity, 0) || 0;
    return sum + (soldQty * diff);
  }, 0) || 0;
  const netProfit = totalRevenue - totalCogs - totalWriteoffLosses - totalMarkdownLosses;

  // ==========================================================
  // JSX
  // ==========================================================
  return (
    <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-5 md:p-6 shadow-sm mb-6 transition-all no-print">
      <div className="flex items-center space-x-2.5 border-b border-gray-50 dark:border-slate-800 pb-4 mb-5">
        <div className="p-2 bg-green-600 text-white rounded-lg">
          {currentUser.role === 'Директор магазина' && <Users className="w-5 h-5" />}
          {currentUser.role === 'Старший товаровед' && <Truck className="w-5 h-5" />}
          {currentUser.role === 'Товаровед-кассир' && <ScanLine className="w-5 h-5" />}
        </div>
        <div>
          <h4 className="text-xs font-black text-gray-900 dark:text-slate-100 uppercase tracking-wider">
            {currentUser.role === 'Директор магазина' && 'Интерактивный кабинет руководителя филиала'}
            {currentUser.role === 'Старший товаровед' && 'Операционная консоль старшего товароведа'}
            {currentUser.role === 'Товаровед-кассир' && 'Рабочее место товароведа-кассира: ТСД и Кассовый терминал'}
          </h4>
          <span className="text-[10px] text-gray-400 font-bold block mt-0.5">
            Платформа «Мария-Ра СУБД» • Роль: {currentUser.role}
          </span>
        </div>
      </div>

      {/* ДИРЕКТОР */}
      {currentUser.role === 'Директор магазина' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-green-900 via-emerald-950 to-teal-950 border border-green-850 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/5 rounded-full -mr-20 -mt-20 blur-2xl"></div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-white/10 pb-4 mb-4 gap-4">
              <div>
                <h5 className="text-[11px] font-black uppercase tracking-wider text-green-400 flex items-center space-x-1.5">
                  <CircleDollarSign className="w-4 h-4 text-green-400" />
                  <span>Сводный финансовый результат филиала №142</span>
                </h5>
                <p className="text-[10px] text-emerald-200/80 mt-0.5">
                  Интеграционная выгрузка кассовых продаж СУБД в реальном времени.
                </p>
              </div>
              <div className="bg-white/10 border border-white/15 px-3 py-1.5 rounded-lg text-[10px] font-mono flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-ping"></span>
                <span>Транзакций: {dbState.sales_log?.length || 0}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-white/5 border border-white/5 rounded-xl p-3.5">
                <span className="text-[9px] font-black text-emerald-300 uppercase block mb-1">Выручка</span>
                <div className="text-lg font-black text-emerald-400 font-mono">
                  {totalRevenue.toLocaleString('ru-RU')} ₽
                </div>
              </div>
              <div className="bg-white/5 border border-white/5 rounded-xl p-3.5">
                <span className="text-[9px] font-black text-slate-300 uppercase block mb-1">Себестоимость</span>
                <div className="text-lg font-black text-slate-300 font-mono">
                  -{totalCogs.toLocaleString('ru-RU')} ₽
                </div>
              </div>
              <div className="bg-white/5 border border-white/5 rounded-xl p-3.5">
                <span className="text-[9px] font-black text-rose-300 uppercase block mb-1">Списания</span>
                <div className="text-lg font-black text-rose-400 font-mono">
                  -{totalWriteoffLosses.toLocaleString('ru-RU')} ₽
                </div>
              </div>
              <div className="bg-white/5 border border-white/5 rounded-xl p-3.5">
                <span className="text-[9px] font-black text-amber-300 uppercase block mb-1">Уценки</span>
                <div className="text-lg font-black text-amber-400 font-mono">
                  -{totalMarkdownLosses.toLocaleString('ru-RU')} ₽
                </div>
              </div>
              <div className="bg-white/10 border border-green-500/20 rounded-xl p-3.5 col-span-2 md:col-span-1">
                <span className="text-[9px] font-black text-green-300 uppercase block mb-1">Чистая прибыль</span>
                <div className={`text-lg font-black font-mono ${netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {netProfit.toLocaleString('ru-RU')} ₽
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* График смен */}
            <div className="bg-gray-50/50 dark:bg-slate-850/40 border border-gray-150 dark:border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h5 className="text-[11px] font-black text-gray-900 dark:text-slate-100 uppercase tracking-wider flex items-center space-x-1.5">
                    <CalendarIcon className="w-4 h-4 text-green-600" />
                    <span>График смен</span>
                  </h5>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setViewMode('day')}
                      className={`px-2 py-0.5 text-[9px] font-extrabold uppercase rounded-md transition-all ${viewMode === 'day' ? 'bg-green-600 text-white shadow-xs' : 'bg-gray-200 dark:bg-slate-800 text-gray-500 dark:text-slate-400'}`}
                    >
                      День
                    </button>
                    <button
                      onClick={() => {
                        setViewMode('month');
                        setShowCalendar(!showCalendar);
                      }}
                      className={`px-2 py-0.5 text-[9px] font-extrabold uppercase rounded-md transition-all ${viewMode === 'month' ? 'bg-green-600 text-white shadow-xs' : 'bg-gray-200 dark:bg-slate-800 text-gray-500 dark:text-slate-400'}`}
                    >
                      Месяц {showCalendar ? '▲' : '▼'}
                    </button>
                  </div>
                </div>

                {showCalendar && viewMode === 'month' && (
                  <div className="mb-4 p-4 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-lg">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-xs font-bold text-gray-700 dark:text-slate-300">📅 Выберите дату</span>
                      <button onClick={() => setShowCalendar(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-sm">✕</button>
                    </div>
                    <Calendar
                      onChange={(value: any) => {
                        if (value instanceof Date) {
                          const newDate = new Date(value);
                          newDate.setHours(0, 0, 0, 0);
                          setSelectedDate(newDate);
                          loadSchedules(newDate);
                          setTimeout(() => setShowCalendar(false), 300);
                        }
                      }}
                      value={selectedDate}
                      locale="ru-RU"
                      className="w-full border-0 shadow-none"
                      tileDisabled={({ date }) => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const checkDate = new Date(date);
                        checkDate.setHours(0, 0, 0, 0);
                        return checkDate < today;
                      }}
                    />
                  </div>
                )}

                <div className="space-y-2 mb-4">
                  <div className="text-[10px] text-gray-400 dark:text-slate-500 mb-2">
                    {viewMode === 'month' ? (
                      <span>📅 {selectedDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    ) : (
                      <span>📅 {selectedScheduleDay === 'today' ? 'Сегодня' : 'Завтра'}: {selectedDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</span>
                    )}
                  </div>

                  {dbState.employees?.filter((e: any) => e.is_active).map((emp: any) => {
                    const sched = schedules.find((s: any) => s.employee_id === emp.id);
                    const currentShift = sched ? sched.shift_name : '—';
                    const currentStatus = sched ? sched.status : 'Выходной';
                    const role = dbState.roles?.find((r: any) => r.id === emp.role_id);

                    return (
                      <div key={emp.id} className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-2.5 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs">
                        <div>
                          <span className="font-extrabold text-gray-900 dark:text-slate-100 block">{emp.name}</span>
                          <span className="text-[9px] text-gray-400 font-bold block">{role?.name || 'Нет роли'}</span>
                          {isPastDate(selectedDate) && (
                            <span className="text-[8px] text-red-500 dark:text-red-400 font-bold block mt-0.5">⚠️ Дата прошла</span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 w-full sm:w-auto justify-between sm:justify-end">
                          <span className={`px-1.5 py-0.5 text-[9px] font-black uppercase rounded ${currentStatus === 'Выходной' ? 'bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-slate-400' : currentShift.includes('Дневная') ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400'}`}>
                            {currentStatus === 'Выходной' ? 'Выходной' : currentShift.split(' ')[0]}
                          </span>
                          <select
                            value={currentStatus === 'Выходной' ? 'off' : currentShift}
                            onChange={async (e) => {
                              if (isPastDate(selectedDate)) {
                                alert('⚠️ Нельзя изменять расписание на прошедшие даты!');
                                return;
                              }
                              const val = e.target.value;
                              if (val === 'off') {
                                await handleUpdateSchedule(emp.id, '—', 'Выходной');
                              } else if (val.includes('Дневная')) {
                                await handleUpdateSchedule(emp.id, 'Дневная смена (08:00 - 15:30)', 'Работает');
                              } else {
                                await handleUpdateSchedule(emp.id, 'Вечерняя смена (15:30 - 23:00)', 'Работает');
                              }
                            }}
                            disabled={isPastDate(selectedDate)}
                            className={`bg-gray-50 dark:bg-slate-800 border border-gray-150 dark:border-slate-750 rounded px-1.5 py-0.5 text-[10px] font-bold ${isPastDate(selectedDate) ? 'text-gray-400 cursor-not-allowed opacity-50' : 'text-gray-700 dark:text-slate-300'} focus:outline-none`}
                          >
                            <option value="off">Выходной</option>
                            <option value="Дневная смена (08:00 - 15:30)">Дневная</option>
                            <option value="Вечерняя смена (15:30 - 23:00)">Вечерняя</option>
                          </select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <form onSubmit={handleHireEmployee} className="space-y-2 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-2.5 rounded-lg">
                <span className="text-[9px] font-black text-gray-400 dark:text-slate-500 uppercase block">Принять сотрудника</span>
                <div className="grid grid-cols-2 gap-1.5">
                  <input type="text" placeholder="ФИО" value={newEmpName} onChange={(e) => setNewEmpName(e.target.value)} className="bg-gray-50 dark:bg-slate-800 border border-gray-150 dark:border-slate-700 rounded px-2 py-1 text-[10px] font-bold" />
                  <input type="text" placeholder="Табельный №" value={newEmpPersNum} onChange={(e) => setNewEmpPersNum(e.target.value)} className="bg-gray-50 dark:bg-slate-800 border border-gray-150 dark:border-slate-700 rounded px-2 py-1 text-[10px] font-mono font-bold" />
                </div>
                <div className="flex items-center justify-between gap-1.5 pt-1">
                  <select value={newEmpRole} onChange={(e) => setNewEmpRole(e.target.value)} className="bg-gray-50 dark:bg-slate-800 border border-gray-150 dark:border-slate-700 rounded px-2 py-1 text-[9px] font-bold w-full">
                    <option value="role_tra">Товаровед-кассир</option>
                    <option value="role_com">Старший товаровед</option>
                    <option value="role_dir">Директор</option>
                  </select>
                  <button type="submit" className="bg-green-600 hover:bg-green-700 text-white rounded px-2.5 py-1 text-[9px] font-black uppercase shrink-0 cursor-pointer">Нанять</button>
                </div>
              </form>
            </div>

            {/* Потери */}
            <div className="bg-gray-50/50 dark:bg-slate-850/40 border border-gray-150 dark:border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
              <div>
                <h5 className="text-[11px] font-black text-gray-900 dark:text-slate-100 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                  <TrendingDown className="w-4 h-4 text-rose-500" />
                  <span>Финансовый аудит потерь</span>
                </h5>
                <p className="text-[10px] text-gray-500 dark:text-slate-400 font-medium mb-3">Автоматический подсчет списанных товаров.</p>
              </div>
              <div className="space-y-3 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-4 rounded-lg flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-gray-500">Утвержденный ущерб:</span>
                    <span className="text-sm font-black text-rose-600 font-mono">{totalWriteoffLosses.toLocaleString('ru-RU')} ₽</span>
                  </div>
                  <div className="space-y-1 mt-2">
                    <div className="flex justify-between text-[10px] font-bold">
                      <span className="text-gray-400">Лимит квартала:</span>
                      <span className="text-gray-700 dark:text-slate-300">150 000 ₽</span>
                    </div>
                    {(() => {
                      const lossPercent = Math.min(100, Math.round((totalWriteoffLosses / 150000) * 100));
                      return (
                        <div className="w-full bg-gray-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-500 ${lossPercent > 80 ? 'bg-red-500' : lossPercent > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${lossPercent}%` }}></div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
                <div className="flex items-start space-x-1.5 pt-2 border-t border-gray-50 dark:border-slate-800">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-amber-500" />
                  <span className="text-[9px] text-gray-400 leading-normal font-medium">Потери снижают налогооблагаемую базу.</span>
                </div>
              </div>
            </div>

            {/* Утверждение актов */}
            <div className="bg-gray-50/50 dark:bg-slate-850/40 border border-gray-150 dark:border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
              <div>
                <h5 className="text-[11px] font-black text-gray-900 dark:text-slate-100 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                  <FileSignature className="w-4 h-4 text-amber-500" />
                  <span>Утверждение актов ТОРГ-16 ({dbState.writeoff_acts?.filter((a: any) => !a.approved_by_id).length || 0} шт.)</span>
                </h5>
                <p className="text-[10px] text-gray-500 dark:text-slate-400 font-medium mb-3">Юридическая подпись ведомостей списания.</p>
              </div>
              <div className="space-y-1.5 max-h-44 overflow-y-auto custom-scrollbar flex-1">
                {dbState.writeoff_acts?.filter((a: any) => !a.approved_by_id).length === 0 ? (
                  <div className="text-center py-8 text-gray-400 italic text-xs">Нет актов для подписания.</div>
                ) : (
                  dbState.writeoff_acts?.filter((a: any) => !a.approved_by_id).map((act: any) => {
                    const actItems = dbState.writeoff_items?.filter((item: any) => item.act_id === act.id) || [];
                    const totalSum = actItems.reduce((sum: number, item: any) => sum + (item.quantity * item.unit_price), 0);
                    const creator = dbState.employees?.find((e: any) => e.id === act.creator_id)?.name || 'ТСД';
                    return (
                      <div key={act.id} className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-2.5 rounded-lg flex justify-between items-center text-xs">
                        <div className="truncate pr-2">
                          <span className="font-mono font-black text-gray-900 dark:text-slate-100 block">{act.act_number}</span>
                          <span className="text-[9px] text-gray-400 block truncate font-medium">{creator} • {actItems.length} поз.</span>
                          <span className="text-[9px] text-rose-600 font-extrabold block font-mono">{totalSum.toFixed(2)} ₽</span>
                        </div>
                        <button onClick={() => handleApproveAct(act.id, act.act_number)} className="px-2.5 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-[10px] font-black uppercase tracking-tight shrink-0 cursor-pointer shadow-xs active:scale-97">Заверить ЭЦП</button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* СТАРШИЙ ТОВАРОВЕД */}
      {currentUser.role === 'Старший товаровед' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-50/50 dark:bg-slate-850/40 border border-gray-150 dark:border-slate-800/80 rounded-xl p-4">
            <h5 className="text-[11px] font-black text-gray-900 dark:text-slate-100 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
              <Truck className="w-4 h-4 text-emerald-600" />
              <span>Оформление прихода поставок</span>
            </h5>
            <p className="text-[10px] text-gray-500 dark:text-slate-400 font-medium mb-3">Регистрация новых партий товаров.</p>
            <form onSubmit={handleIngestSupply} className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-4 rounded-lg">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-gray-400 dark:text-slate-500 uppercase block">Поставщик</label>
                <select value={selectedSupplier} onChange={(e) => setSelectedSupplier(e.target.value)} className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-150 dark:border-slate-700 rounded px-2 py-1.5 text-xs font-bold" required>
                  <option value="">-- Выбрать --</option>
                  {dbState.suppliers?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-gray-400 dark:text-slate-500 uppercase block">Товар</label>
                <select value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)} className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-150 dark:border-slate-700 rounded px-2 py-1.5 text-xs font-bold" required>
                  <option value="">-- Выбрать --</option>
                  {dbState.products?.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-gray-400 dark:text-slate-500 uppercase block">Кол-во, шт</label>
                <input type="number" value={supplyQty} onChange={(e) => setSupplyQty(e.target.value)} className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-150 dark:border-slate-700 rounded px-2 py-1.5 text-xs font-bold" required />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-gray-400 dark:text-slate-500 uppercase block">Срок годности</label>
                <input type="date" value={supplyExpDate} onChange={(e) => setSupplyExpDate(e.target.value)} className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-150 dark:border-slate-700 rounded px-2 py-1.5 text-xs font-bold font-mono" required />
              </div>
              <div className="md:col-span-2 pt-2">
                <button type="submit" className="w-full flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 text-white font-black uppercase tracking-wider py-2.5 rounded-lg text-xs cursor-pointer active:scale-98 shadow-sm transition-all">
                  <ListPlus className="w-4 h-4" />
                  <span>Оприходовать</span>
                </button>
              </div>
            </form>
          </div>

          <div className="bg-gray-50/50 dark:bg-slate-850/40 border border-gray-150 dark:border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
            <div>
              <h5 className="text-[11px] font-black text-gray-900 dark:text-slate-100 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                <ClipboardCheck className="w-4 h-4 text-blue-600" />
                <span>Справочник поставщиков</span>
              </h5>
              <p className="text-[10px] text-gray-500 dark:text-slate-400 font-medium mb-3">Активный реестр контрагентов.</p>
            </div>
            <div className="space-y-1.5 max-h-64 overflow-y-auto custom-scrollbar flex-1">
              {dbState.suppliers?.map((sup: any) => (
                <div key={sup.id} className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-3 rounded-lg text-xs flex justify-between items-center">
                  <div>
                    <span className="font-extrabold block text-gray-900 dark:text-slate-100">{sup.name}</span>
                    <span className="text-[9px] text-gray-400 block font-medium">ИНН: {sup.inn} | {sup.phone || '—'}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${sup.reliability_rating === 'A+' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>Рейтинг: {sup.reliability_rating}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ТОВАРОВЕД-КАССИР */}
      {currentUser.role === 'Товаровед-кассир' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ТСД */}
          <div className="bg-gray-950 text-slate-100 rounded-2xl p-4 border-4 border-slate-700 shadow-md flex flex-col justify-between font-mono relative overflow-hidden h-[360px]">
            <div className="absolute top-0 right-0 p-2 bg-emerald-500 text-slate-950 text-[8px] font-black rounded-bl uppercase">ТСД-10 ONLINE</div>
            <div className="space-y-3">
              <div className="flex items-center space-x-1.5 text-emerald-400 border-b border-slate-800 pb-2">
                <Barcode className="w-5 h-5" />
                <span className="text-xs uppercase font-extrabold">Лазерный ТСД Терминал</span>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] text-slate-400 uppercase block font-bold">Выберите товар:</label>
                <select value={tsdSelectedProduct} onChange={(e) => setTsdSelectedProduct(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-2 text-xs font-bold text-emerald-400 focus:outline-none">
                  <option value="">-- НАВЕДИТЕ ЛАЗЕР --</option>
                  {dbState.products?.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              {tsdSelectedProduct ? (() => {
                const prod = dbState.products?.find((p: any) => p.id === tsdSelectedProduct);
                const batches = dbState.batches?.filter((b: any) => b.product_id === tsdSelectedProduct && b.quantity > 0) || [];
                const totalQty = batches.reduce((sum: number, b: any) => sum + b.quantity, 0);
                return (
                  <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 text-[11px] space-y-1 text-slate-300">
                    <div><span className="text-slate-500">АРТИКУЛ:</span> <span className="text-slate-100 font-bold">{prod?.name}</span></div>
                    <div><span className="text-slate-500">ШТРИХКОД:</span> <span className="text-emerald-400 font-mono font-bold">{prod?.barcode}</span></div>
                    <div><span className="text-slate-500">ОСТАТОК:</span> <span className="text-amber-400 font-black">{totalQty} шт.</span> ({batches.length} партий)</div>
                    {batches.length > 0 && <div className="text-red-400 text-[10px] font-bold mt-1">➔ Срок: {batches[0].expiration_date?.split('-').reverse().join('.')}</div>}
                  </div>
                );
              })() : (
                <div className="bg-slate-900/40 py-8 rounded-lg border border-dashed border-slate-800 text-center text-xs text-slate-500 font-bold">[ ОЖИДАНИЕ СКАНИРОВАНИЯ ]</div>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-900">
              <button onClick={() => handleTsdMarkdown(30)} disabled={!tsdSelectedProduct} className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 rounded py-2 text-[10px] font-black uppercase cursor-pointer transition-all active:scale-97">Уценка -30%</button>
              <button onClick={() => handleTsdMarkdown(50)} disabled={!tsdSelectedProduct} className="bg-amber-400 hover:bg-amber-500 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 rounded py-2 text-[10px] font-black uppercase cursor-pointer transition-all active:scale-97">Уценка -50%</button>
              <button onClick={handleTsdWriteOff} disabled={!tsdSelectedProduct} className="bg-red-600 hover:bg-red-700 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded py-2 text-[10px] font-black uppercase cursor-pointer transition-all active:scale-97">Списать</button>
            </div>
          </div>

          {/* POS */}
          <div className="bg-gray-50/50 dark:bg-slate-850/40 border border-gray-150 dark:border-slate-800/80 rounded-xl p-4 flex flex-col justify-between h-[360px]">
            <div>
              <div className="flex justify-between items-center mb-2">
                <h5 className="text-[11px] font-black text-gray-900 dark:text-slate-100 uppercase tracking-wider flex items-center space-x-1.5">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  <span>Кассовый терминал</span>
                </h5>
                <div className="flex items-center space-x-1.5 bg-green-100 dark:bg-green-950/40 px-2 py-1 rounded-md">
                  <input type="checkbox" id="auto-sim" checked={salesSimulationActive} onChange={(e) => setSalesSimulationActive(e.target.checked)} className="w-3 h-3 text-green-600 rounded focus:ring-green-500 cursor-pointer" />
                  <label htmlFor="auto-sim" className="text-[9px] font-black uppercase text-green-800 dark:text-green-400 cursor-pointer select-none">Покупатели {salesSimulationActive ? 'ВКЛ' : 'ВЫКЛ'}</label>
                </div>
              </div>
              <p className="text-[10px] text-gray-500 dark:text-slate-400 font-medium mb-3 leading-relaxed">Обслуживание покупателей. Каждая покупка списывает остаток.</p>
              <div className="space-y-2 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-3 rounded-lg text-xs">
                <div>
                  <label className="text-[9px] font-black text-gray-400 uppercase block mb-1">Партия с полки:</label>
                  <select value={posSelectedBatch} onChange={(e) => setPosSelectedBatch(e.target.value)} className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-150 dark:border-slate-700 rounded px-2 py-1.5 font-bold text-gray-800 dark:text-slate-100 text-xs">
                    <option value="">-- Выбрать --</option>
                    {dbState.batches?.filter((b: any) => b.quantity > 0).map((batch: any) => {
                      const prod = dbState.products?.find((p: any) => p.id === batch.product_id);
                      return <option key={batch.id} value={batch.id}>{prod?.name} ({batch.quantity} шт)</option>;
                    })}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] font-black text-gray-400 uppercase block mb-1">Кол-во:</label>
                    <input type="number" min="1" value={posQty} onChange={(e) => setPosQty(e.target.value)} className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-150 dark:border-slate-700 rounded px-2 py-1.5 font-bold text-xs" />
                  </div>
                  <div className="flex items-end">
                    <button onClick={handleManualSale} disabled={!posSelectedBatch} className="w-full py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-100 disabled:text-gray-400 dark:disabled:bg-slate-800 dark:disabled:text-slate-600 text-white font-black uppercase text-[10px] rounded cursor-pointer transition-all active:scale-97">Продать</button>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded p-2.5 flex items-start space-x-1.5">
              <Zap className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="text-[9px] text-amber-800 dark:text-amber-300 font-medium leading-normal">При включении «Покупатели ВКЛ» запускается симуляция клиентов раз в 4 сек.</span>
            </div>
          </div>

          {/* Чек-лента */}
          <div className="bg-gray-50/50 dark:bg-slate-850/40 border border-gray-150 dark:border-slate-800/80 rounded-xl p-4 flex flex-col justify-between h-[360px]">
            <div>
              <h5 className="text-[11px] font-black text-gray-900 dark:text-slate-100 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>Чек-лента кассы</span>
              </h5>
              <p className="text-[10px] text-gray-500 dark:text-slate-400 font-medium mb-3">Лента продаж и логи ТСД.</p>
            </div>
            <div className="flex-1 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-lg p-3 overflow-y-auto custom-scrollbar flex flex-col justify-between">
              <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar flex-1 mb-2">
                {tsdStatusMessage && (
                  <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-300 p-2.5 rounded text-[10px] font-bold animate-fade-in flex items-start space-x-1.5">
                    <span>🎉 {tsdStatusMessage}</span>
                  </div>
                )}
                {liveSalesJournal.length === 0 ? (
                  <div className="text-center py-10 text-gray-400 italic text-[10px]">Ожидание транзакций...</div>
                ) : (
                  liveSalesJournal.map((entry) => (
                    <div key={entry.id} className="text-[10px] font-mono leading-tight border-b border-gray-50 dark:border-slate-850 py-1 font-bold text-emerald-600 dark:text-emerald-400 flex justify-between">
                      <span className="truncate">🛍️ {entry.text}</span>
                      <span className="text-gray-400 ml-1 shrink-0">{entry.time}</span>
                    </div>
                  ))
                )}
              </div>
              <div className="border-t border-gray-100 dark:border-slate-800 pt-2">
                <span className="text-[9px] font-black text-gray-400 uppercase block mb-1">Логи ТСД:</span>
                <div className="space-y-1">
                  {(dbState.system_telemetry || []).slice(0, 2).map((log: any) => {
                    const emp = dbState.employees?.find((e: any) => e.id === log.employee_id);
                    return <div key={log.id} className="text-[9px] font-mono leading-tight text-gray-400 dark:text-slate-500">[{log.occurred_at?.slice(11, 19)}] {log.action_type} • {emp?.name || 'Кассир'}</div>;
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
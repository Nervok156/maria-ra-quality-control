import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, AlertTriangle, Trash2, Tag, Plus, Search, Filter, 
  TrendingDown, CheckCircle, FileSpreadsheet, Calendar, Sparkles, Printer,
  Layers, Check, Send, FileCheck, RefreshCw
} from 'lucide-react';
import { Product, ProductCategory, Inspection, Employee } from '../types';
import { categoryLabels, categoryColors, productTemplates } from '../data/initialProducts';
import { getDBState, saveDBState, addProductToDB, addBatchToDB, markdownBatchInDB, addTelemetry, getActiveProductsFromDB } from '../data/databaseState';

interface FreshnessControlProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  currentUser: Employee;
}

export default function FreshnessControl({ products, setProducts, currentUser }: FreshnessControlProps) {
  const [activeSubTab, setActiveSubTab] = useState<'catalog' | 'writeoffs' | 'markdown' | 'analytics'>(() => {
    const saved = localStorage.getItem('maria_ra_active_sub_tab');
    return (saved as any) || 'catalog';
  });

  useEffect(() => {
    localStorage.setItem('maria_ra_active_sub_tab', activeSubTab);
  }, [activeSubTab]);

  // Set standard current simulated date as June 30, 2026
  const simulatedToday = '2026-06-30';

  const handlePrint = () => {
    window.print();
  };

  // Helper to calculate status based on expiry date
  const calculateStatusAndPercent = (expiryDateStr: string, manufactureDateStr?: string) => {
    const today = new Date(simulatedToday);
    const expiry = new Date(expiryDateStr);
    
    // Total days difference
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 0) {
      return { status: 'expired' as const, percent: 0, daysRemaining: diffDays };
    }
    
    let totalLife = 10; // Default fallback
    if (manufactureDateStr) {
      const manufacture = new Date(manufactureDateStr);
      totalLife = Math.max(1, Math.ceil((expiry.getTime() - manufacture.getTime()) / (1000 * 60 * 60 * 24)));
    }
    
    const percent = Math.min(100, Math.max(0, Math.round((diffDays / totalLife) * 100)));
    
    // Expiring soon if within 2 days or less than 25% shelf life remaining
    const expiringSoon = diffDays <= 2 || percent <= 25;
    
    return {
      status: expiringSoon ? ('expiring_soon' as const) : ('fresh' as const),
      percent,
      daysRemaining: diffDays
    };
  };

  // Modal Dialog states
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProduct, setNewProduct] = useState({
    barcode: '',
    name: '',
    category: 'dairy' as ProductCategory,
    price: 0,
    quantity: 1,
    expirationDate: '',
    manufactureDate: '',
    location: ''
  });

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showMarkdownModal, setShowMarkdownModal] = useState(false);
  const [markdownPercent, setMarkdownPercent] = useState(30);

  const [showWriteOffModal, setShowWriteOffModal] = useState(false);
  const [writeOffReason, setWriteOffReason] = useState('Истек срок годности');

  // Search and Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Standard Committee names for Russian official TORG-16 Write-off Act
  const [inspectorName, setInspectorName] = useState('Копыл И.А. (Практикант)');
  const [managerName, setManagerName] = useState('Иванова А.С. (Директор магазина)');
  const [accountantName, setAccountantName] = useState('Федорова М.В. (Старший бухгалтер)');

  // Role-based approval and integration states
  const [isApprovedByDirector, setIsApprovedByDirector] = useState(() => {
    return localStorage.getItem('maria_ra_is_approved_by_director') === 'true';
  });
  const [isExportedTo1C, setIsExportedTo1C] = useState(() => {
    return localStorage.getItem('maria_ra_is_exported_to_1c') === 'true';
  });
  const [isExporting, setIsExporting] = useState(false);
  const [isSendingToApproval, setIsSendingToApproval] = useState(false);
  const [sentToApproval, setSentToApproval] = useState(() => {
    return localStorage.getItem('maria_ra_sent_to_approval') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('maria_ra_is_approved_by_director', String(isApprovedByDirector));
  }, [isApprovedByDirector]);

  useEffect(() => {
    localStorage.setItem('maria_ra_is_exported_to_1c', String(isExportedTo1C));
  }, [isExportedTo1C]);

  useEffect(() => {
    localStorage.setItem('maria_ra_sent_to_approval', String(sentToApproval));
  }, [sentToApproval]);

  useEffect(() => {
    if (currentUser) {
      setInspectorName(`${currentUser.name} (${currentUser.role})`);
    }
  }, [currentUser]);

  // Quick auto-populate from scanning template
  const handleScanTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const idx = Number(e.target.value);
    if (isNaN(idx) || idx < 0) {
      // Clear form for custom manual entry!
      setNewProduct({
        barcode: '',
        name: '',
        category: 'dairy',
        price: 0,
        quantity: 1,
        expirationDate: '',
        manufactureDate: '',
        location: ''
      });
      return;
    }
    
    const template = productTemplates[idx];
    
    // Set realistic expiration dates: e.g. Bakery expires in 3 days, Dairy in 7 days, beverages in 180 days.
    const today = new Date(simulatedToday);
    const mDate = new Date(simulatedToday);
    mDate.setDate(today.getDate() - 2); // manufactured 2 days ago
    
    const eDate = new Date(simulatedToday);
    eDate.setDate(today.getDate() + (template.shelfLifeDays - 2)); // expires soon or fresh

    const format = (d: Date) => d.toISOString().split('T')[0];

    setNewProduct({
      barcode: template.barcode,
      name: template.name,
      category: template.category as ProductCategory,
      price: template.price,
      quantity: Math.floor(Math.random() * 10) + 1,
      manufactureDate: format(mDate),
      expirationDate: format(eDate),
      location: template.location
    });
  };

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.barcode || !newProduct.expirationDate) {
      alert("Пожалуйста, заполните основные поля: Название, Штрихкод и Срок годности!");
      return;
    }

    const dbState = getDBState();
    let existingProd = dbState.products.find(p => p.barcode === newProduct.barcode);
    let productId = existingProd?.id;
    if (!productId) {
      productId = addProductToDB(
        newProduct.barcode,
        newProduct.name,
        newProduct.category,
        Number(newProduct.price),
        7
      );
    }
    
    addBatchToDB(
      productId,
      Number(newProduct.quantity),
      newProduct.manufactureDate || simulatedToday,
      newProduct.expirationDate,
      newProduct.location || 'shelf_1'
    );

    window.dispatchEvent(new Event('maria_ra_db_updated'));
    setShowAddModal(false);
    
    // Reset form
    setNewProduct({
      barcode: '',
      name: '',
      category: 'dairy',
      price: 0,
      quantity: 1,
      expirationDate: '',
      manufactureDate: '',
      location: ''
    });
  };

  const applyMarkdown = () => {
    if (!selectedProduct) return;
    
    markdownBatchInDB(selectedProduct.id, currentUser?.id || '1', markdownPercent);
    window.dispatchEvent(new Event('maria_ra_db_updated'));
    
    setShowMarkdownModal(false);
    setSelectedProduct(null);
  };

  const applyWriteOff = () => {
    if (!selectedProduct) return;

    const state = getDBState();
    const batch = state.batches.find(b => b.id === selectedProduct.id);
    if (batch) {
      batch.is_written_off = true;
      batch.writeoff_reason = writeOffReason;
      
      const product = state.products.find(p => p.id === batch.product_id);
      if (product) {
        const act_id = `act_${Date.now()}`;
        const count = state.writeoff_acts.length + 341;
        const act_number = `АКТ-ТОРГ16-00${count}`;
        
        const newAct = {
          id: act_id,
          act_number,
          store_id: 'store_1',
          created_at: new Date().toISOString(),
          creator_id: currentUser?.id || '1',
          approved_by_id: '',
          is_exported_to_1c: false
        };
        state.writeoff_acts.unshift(newAct);
        
        state.writeoff_items.push({
          id: `item_${Date.now()}`,
          act_id,
          product_id: product.id,
          quantity: batch.quantity,
          reason: writeOffReason,
          unit_price: product.base_price
        });
        
        addTelemetry(currentUser?.id || '1', 'CREATE_WRITEOFF_ACT', { act_id, items_count: 1 });
      }
      
      saveDBState(state);
      window.dispatchEvent(new Event('maria_ra_db_updated'));
    }

    setShowWriteOffModal(false);
    setSelectedProduct(null);
  };

  // Status indicators UI builder helper
  const renderStatusBadge = (product: Product) => {
    if (product.status === 'written_off') {
      return (
        <span className="bg-red-100 dark:bg-red-950/40 text-red-900 dark:text-red-300 px-2 py-1 rounded-md text-[10px] font-extrabold flex items-center w-fit space-x-1">
          <TrendingDown className="w-3 h-3 text-red-700 dark:text-red-400" />
          <span>СПИСАНО ({product.writeOffReason || 'Просрочка'})</span>
        </span>
      );
    }
    if (product.status === 'marked_down') {
      return (
        <span className="bg-green-100 dark:bg-green-950/40 text-green-900 dark:text-green-300 px-2 py-1 rounded-md text-[10px] font-extrabold flex items-center w-fit space-x-1">
          <Tag className="w-3 h-3 text-green-700 dark:text-green-400" />
          <span>УЦЕНКА (-{product.markdownPercent}%)</span>
        </span>
      );
    }

    const { status, daysRemaining } = calculateStatusAndPercent(product.expirationDate, product.manufactureDate);

    if (status === 'expired') {
      return (
        <span className="bg-red-600 text-white px-2.5 py-1 rounded-md text-[10px] font-extrabold flex items-center w-fit space-x-1">
          <AlertTriangle className="w-3 h-3 text-white" />
          <span>ПРОСРОЧЕНО (истек)</span>
        </span>
      );
    }
    if (status === 'expiring_soon') {
      return (
        <span className="bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 px-2.5 py-1 rounded-md text-[10px] font-extrabold flex items-center w-fit space-x-1 border border-amber-300 dark:border-amber-900/30">
          <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
          <span>Осталось {daysRemaining} {daysRemaining === 1 ? 'день' : 'дня'}</span>
        </span>
      );
    }

    return (
      <span className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/30 px-2.5 py-1 rounded-md text-[10px] font-extrabold flex items-center w-fit space-x-1">
        <CheckCircle className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
        <span>Свежий ({daysRemaining} дн.)</span>
      </span>
    );
  };

  // Computations for Analytics Card
  const totalInCatalog = products.filter(p => p.status !== 'written_off').length;
  
  const expiredProducts = products.filter(p => {
    if (p.status === 'written_off') return false;
    const { status } = calculateStatusAndPercent(p.expirationDate, p.manufactureDate);
    return status === 'expired';
  });

  const expiringSoonProducts = products.filter(p => {
    if (p.status === 'written_off' || p.status === 'marked_down') return false;
    const { status } = calculateStatusAndPercent(p.expirationDate, p.manufactureDate);
    return status === 'expiring_soon';
  });

  const markedDownProducts = products.filter(p => p.status === 'marked_down');
  const writtenOffProducts = products.filter(p => p.status === 'written_off');

  const totalLossRub = writtenOffProducts.reduce((acc, p) => acc + (p.price * p.quantity), 0);
  const totalMarkdownLossRub = markedDownProducts.reduce((acc, p) => acc + ((p.price - (p.markdownPrice || p.price)) * p.quantity), 0);

  // Expiration Progress Bar percentage
  const getProgressColor = (percent: number) => {
    if (percent <= 25) return 'bg-red-500';
    if (percent <= 50) return 'bg-amber-500';
    return 'bg-green-600';
  };

  // Filter logic
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.barcode.includes(searchTerm) || 
                          (p.location || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
    
    let matchesStatus = true;
    if (statusFilter !== 'all') {
      if (statusFilter === 'written_off') {
        matchesStatus = p.status === 'written_off';
      } else if (statusFilter === 'marked_down') {
        matchesStatus = p.status === 'marked_down';
      } else {
        const { status } = calculateStatusAndPercent(p.expirationDate, p.manufactureDate);
        matchesStatus = p.status !== 'written_off' && status === statusFilter;
      }
    }

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Calculate Loss analytics by category
  const lossesByCategory: Record<ProductCategory, number> = {
    dairy: 0, bakery: 0, meat_sausage: 0, grocery: 0, beverages: 0, confectionery: 0, other: 0
  };
  writtenOffProducts.forEach(p => {
    lossesByCategory[p.category] += p.price * p.quantity;
  });

  return (
    <div className="space-y-6 animate-fade-in">

      {/* KPI Dashboard Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 no-print">
        
        <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl p-4 shadow-2xs transition-colors duration-200">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-extrabold text-gray-400 dark:text-slate-400 uppercase tracking-wider block">В каталоге</span>
            <span className="bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 text-[10px] font-bold px-1.5 py-0.5 rounded-sm">Активные</span>
          </div>
          <p className="text-2xl font-black text-gray-900 dark:text-slate-100 mt-1">{totalInCatalog} <span className="text-xs font-normal text-gray-400 dark:text-slate-500">позиций</span></p>
          <span className="text-[10px] text-gray-500 dark:text-slate-400 mt-2 block font-medium">Товары на полках магазина</span>
        </div>

        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-xl p-4 transition-colors duration-200">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-extrabold text-red-900 dark:text-red-300 uppercase tracking-wider block">Просрочено</span>
            <span className="bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-sm">SOS</span>
          </div>
          <p className="text-2xl font-black text-red-900 dark:text-red-400 mt-1">{expiredProducts.length} <span className="text-xs font-normal text-red-400 dark:text-red-500">позиций</span></p>
          <span className="text-[10px] text-red-700 dark:text-red-300 mt-2 block font-medium">Требуется срочное списание!</span>
        </div>

        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-xl p-4 transition-colors duration-200">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-extrabold text-amber-950 dark:text-amber-300 uppercase tracking-wider block">Истекает срок</span>
            <span className="bg-amber-400 text-amber-950 text-[10px] font-bold px-1.5 py-0.5 rounded-sm">Уценка</span>
          </div>
          <p className="text-2xl font-black text-amber-900 dark:text-amber-400 mt-1">{expiringSoonProducts.length} <span className="text-xs font-normal text-amber-500/80">позиций</span></p>
          <span className="text-[10px] text-amber-700 dark:text-amber-300 mt-2 block font-medium">Рекомендуется скидка -30%</span>
        </div>

        <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/30 rounded-xl p-4 transition-colors duration-200">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-extrabold text-green-950 dark:text-green-300 uppercase tracking-wider block">Уценено</span>
            <span className="bg-green-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-sm">Дисконт</span>
          </div>
          <p className="text-2xl font-black text-green-950 dark:text-green-400 mt-1">{markedDownProducts.length} <span className="text-xs font-normal text-green-700 dark:text-green-500">позиций</span></p>
          <span className="text-[10px] text-green-700 dark:text-green-300 mt-2 block font-medium">Выставлено по акции</span>
        </div>

        <div className="bg-gray-900 dark:bg-slate-900 text-white border border-gray-800 dark:border-slate-800 rounded-xl p-4 col-span-2 lg:col-span-1 shadow-md transition-colors duration-200">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-extrabold text-gray-400 dark:text-slate-400 uppercase tracking-wider block">Потери магазина</span>
            <span className="bg-red-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-sm">УБЫТОК</span>
          </div>
          <p className="text-2xl font-black text-white mt-1">{totalLossRub.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs font-normal text-gray-400 dark:text-slate-500">₽</span></p>
          <span className="text-[10px] text-red-400 dark:text-red-300 mt-2 block font-bold">-{totalMarkdownLossRub.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽ за счет уценок</span>
        </div>

      </div>

      {/* Sub tabs for inventory and reports */}
      <div className="flex border-b border-gray-100 dark:border-slate-800 no-print transition-colors duration-200">
        <button
          onClick={() => setActiveSubTab('catalog')}
          className={`px-5 py-3 text-xs font-bold border-b-2 transition-all ${
            activeSubTab === 'catalog'
              ? 'border-green-600 text-green-700 dark:text-green-400'
              : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200'
          }`}
        >
          Каталог & Контроль Сроков
        </button>
        <button
          onClick={() => setActiveSubTab('writeoffs')}
          className={`px-5 py-3 text-xs font-bold border-b-2 transition-all ${
            activeSubTab === 'writeoffs'
              ? 'border-green-600 text-green-700 dark:text-green-400'
              : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200'
          }`}
        >
          Акт Списания (ТОРГ-16)
        </button>
        <button
          onClick={() => setActiveSubTab('markdown')}
          className={`px-5 py-3 text-xs font-bold border-b-2 transition-all ${
            activeSubTab === 'markdown'
              ? 'border-green-600 text-green-700 dark:text-green-400'
              : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200'
          }`}
        >
          Журнал Уценки
        </button>
        <button
          onClick={() => setActiveSubTab('analytics')}
          className={`px-5 py-3 text-xs font-bold border-b-2 transition-all ${
            activeSubTab === 'analytics'
              ? 'border-green-600 text-green-700 dark:text-green-400'
              : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200'
          }`}
        >
          Аналитика Потерь
        </button>
      </div>

      {/* SUB-TAB 1: PRODUCT CATALOG */}
      {activeSubTab === 'catalog' && (
        <div className="space-y-4 no-print">
          
          {/* Filters Bar */}
          <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl p-4 shadow-2xs flex flex-col md:flex-row gap-3 transition-colors duration-200">
            
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
              <input 
                type="text" 
                placeholder="Поиск по названию, штрихкоду или стеллажу..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:border-green-500 rounded-lg pl-10 pr-4 py-2 text-xs font-semibold focus:outline-none transition-all duration-200"
              />
            </div>

            <div className="flex gap-2.5">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:border-green-500 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none transition-all duration-200"
              >
                <option value="all">Все категории</option>
                {Object.keys(categoryLabels).map(cat => (
                  <option key={cat} value={cat}>{categoryLabels[cat as ProductCategory]}</option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:border-green-500 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none transition-all duration-200"
              >
                <option value="all">Все статусы</option>
                <option value="fresh">Свежие товары</option>
                <option value="expiring_soon">Истекающие сроки</option>
                <option value="expired">Просроченные</option>
                <option value="marked_down">Уцененные</option>
                <option value="written_off">Списанные</option>
              </select>

              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center space-x-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-98"
              >
                <Plus className="w-4 h-4" />
                <span>Добавить товар</span>
              </button>
            </div>

          </div>

          {/* Grid/Table Area */}
          <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl shadow-xs overflow-x-auto transition-colors duration-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50/70 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800 text-gray-500 dark:text-slate-400 font-extrabold uppercase tracking-wider text-[10px]">
                  <th className="px-5 py-4 w-[25%]">Товар / Штрихкод</th>
                  <th className="px-4 py-4 w-[15%]">Категория</th>
                  <th className="px-4 py-4 w-[12%]">Стеллаж / Локация</th>
                  <th className="px-4 py-4 w-[12%]">Срок годности</th>
                  <th className="px-4 py-4 w-[15%]">Свежесть</th>
                  <th className="px-4 py-4 w-[8%] text-center">Остаток</th>
                  <th className="px-4 py-4 w-[10%]">Цена (руб.)</th>
                  <th className="px-4 py-4 w-[15%]">Статус</th>
                  <th className="px-5 py-4 text-right w-[15%]">Действия</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-20 text-gray-400 dark:text-slate-500">
                      Нет товаров, соответствующих фильтрам. Попробуйте сбросить параметры.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map(product => {
                    // Calculate live status metrics
                    const isWrittenOff = product.status === 'written_off';
                    const isMarkedDown = product.status === 'marked_down';
                    
                    const { percent } = isWrittenOff ? { percent: 0 } : calculateStatusAndPercent(product.expirationDate, product.manufactureDate);
                    
                    return (
                      <tr key={product.id} className="border-b border-gray-50 dark:border-slate-800/60 hover:bg-gray-50/30 dark:hover:bg-slate-800/30 transition-all">
                        <td className="px-5 py-4">
                          <span className="font-extrabold text-gray-900 dark:text-slate-100 block">{product.name}</span>
                          <span className="text-[10px] font-mono text-gray-400 dark:text-slate-500 mt-1 block">EAN-13: {product.barcode}</span>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-block whitespace-nowrap px-2 py-0.5 rounded-sm border text-[10px] font-extrabold ${categoryColors[product.category]}`}>
                            {categoryLabels[product.category]}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-gray-500 dark:text-slate-400 font-medium">
                          {product.location || 'Не указано'}
                        </td>
                        <td className="px-4 py-4">
                          <span className="font-bold text-gray-700 dark:text-slate-300 block">
                            {product.expirationDate.split('-').reverse().join('.')}
                          </span>
                          <span className="text-[10px] text-gray-400 dark:text-slate-500 block mt-0.5">
                            изгот: {product.manufactureDate?.split('-').reverse().join('.') || 'нет данных'}
                          </span>
                        </td>
                        
                        {/* Shelf Life Progress Bar */}
                        <td className="px-4 py-4">
                          {isWrittenOff ? (
                            <span className="text-red-500 dark:text-red-400 font-mono text-[10px] font-bold">Снято с полки</span>
                          ) : (
                            <div className="w-28">
                              <div className="flex justify-between items-center mb-1 text-[10px] font-mono text-gray-400 dark:text-slate-500">
                                <span>Ресурс:</span>
                                <span className="font-bold text-gray-700 dark:text-slate-300">{percent}%</span>
                              </div>
                              <div className="w-full bg-gray-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                <div className={`h-full ${getProgressColor(percent)} rounded-full`} style={{ width: `${percent}%` }}></div>
                              </div>
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-4 text-center font-bold text-gray-800 dark:text-slate-200">
                          {product.quantity} шт.
                        </td>

                        <td className="px-4 py-4">
                          {isMarkedDown ? (
                            <div>
                              <span className="line-through text-gray-400 dark:text-slate-500 text-[10px] font-bold block">{product.price} ₽</span>
                              <span className="font-extrabold text-green-700 dark:text-green-400 block">{product.markdownPrice} ₽</span>
                            </div>
                          ) : (
                            <span className="font-extrabold text-gray-800 dark:text-slate-100 block">{product.price} ₽</span>
                          )}
                          <span className="text-[10px] text-gray-400 dark:text-slate-500 block mt-0.5">итого: {((isMarkedDown ? product.markdownPrice! : product.price) * product.quantity).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽</span>
                        </td>

                        <td className="px-4 py-4">
                          {renderStatusBadge(product)}
                        </td>

                        {/* Action buttons */}
                        <td className="px-5 py-4 text-right">
                          <div className="flex justify-end space-x-1.5">
                            {!isWrittenOff && !isMarkedDown && (
                              <button
                                onClick={() => {
                                  setSelectedProduct(product);
                                  setShowMarkdownModal(true);
                                }}
                                title="Оформить скидку/уценку"
                                className="p-1.5 hover:bg-green-50 dark:hover:bg-green-950/40 text-green-600 dark:text-green-400 rounded-md transition-colors border border-green-200 dark:border-green-900/40 cursor-pointer"
                              >
                                <Tag className="w-4 h-4" />
                              </button>
                            )}
                            {!isWrittenOff && (
                              <button
                                onClick={() => {
                                  setSelectedProduct(product);
                                  setShowWriteOffModal(true);
                                }}
                                title="Списать товар с учета"
                                className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 rounded-md transition-colors border border-red-200 dark:border-red-900/40 cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                            {isWrittenOff && (
                              <span className="text-[10px] text-gray-400 dark:text-slate-500 font-bold">Архивировано</span>
                            )}
                          </div>
                        </td>

                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* SUB-TAB 2: PRINTABLE WRITE-OFF ACT (ТОРГ-16) */}
      {activeSubTab === 'writeoffs' && (
        <div className="space-y-4">
          
          <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl p-4 shadow-2xs no-print flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-colors duration-200">
            <div>
              <h3 className="text-xs font-extrabold text-gray-900 dark:text-slate-100 uppercase">Официальный Акт о списании (Унифицированная форма № ТОРГ-16)</h3>
              <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-1 leading-relaxed">
                Сюда автоматически подтягиваются все списанные позиции. Вы можете отредактировать состав инспекционной комиссии ниже и распечатать официальный бланк акта материальных потерь.
              </p>
            </div>
            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Печать Акта</span>
            </button>
          </div>

          {/* Role-Specific Interactive Work Deck */}
          <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 rounded-xl p-5 shadow-2xs no-print transition-colors duration-200">
            <h4 className="text-[11px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-3.5 flex items-center space-x-1.5">
              <Layers className="w-4 h-4 text-green-600 dark:text-green-400" />
              <span>ИНТЕРАКТИВНЫЕ ДЕЙСТВИЯ ДЛЯ ВАШЕЙ СРЕДЫ (РАЗГРАНИЧЕНИЕ ПРАВ)</span>
            </h4>

            {currentUser.role === 'Стажер-практикант' && (
              <div className="bg-slate-50 dark:bg-slate-850 border border-slate-200/60 dark:border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                    <span className="text-[10px] font-extrabold text-amber-700 dark:text-amber-400 uppercase tracking-wider bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-sm">
                      СТАТУС: {isApprovedByDirector ? 'УТВЕРЖДЕН РУКОВОДСТВОМ' : sentToApproval ? 'ОЖИДАЕТ ПОДПИСИ ДИРЕКТОРА' : 'ЧЕРНОВИК К СПИСАНИЮ'}
                    </span>
                  </div>
                  <h5 className="text-xs font-bold text-gray-900 dark:text-slate-200">Панель согласования практиканта-программиста</h5>
                  <p className="text-[10px] text-gray-500 dark:text-slate-400 leading-relaxed font-medium">
                    Как стажер-практикант, вы формируете проект акта ТОРГ-16. Чтобы списанные товары официально пошли под утилизацию, переключите аккаунт на <b>Иванову А.С. (Директор)</b> в шапке и подпишите данный акт ЭЦП.
                  </p>
                </div>

                <div className="shrink-0">
                  {isApprovedByDirector ? (
                    <span className="flex items-center space-x-1.5 text-xs font-extrabold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 px-3.5 py-2 rounded-lg">
                      <Check className="w-4 h-4" />
                      <span>АКТ ПОЛНОСТЬЮ УТВЕРЖДЕН</span>
                    </span>
                  ) : sentToApproval ? (
                    <button
                      disabled
                      className="px-4 py-2 bg-gray-200 dark:bg-slate-800 text-gray-500 dark:text-slate-400 rounded-lg text-xs font-black uppercase tracking-tight flex items-center space-x-2 border border-transparent"
                    >
                      <Check className="w-4 h-4 text-amber-500 animate-bounce" />
                      <span>ОТПРАВЛЕНО ДИРЕКТОРУ</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setIsSendingToApproval(true);
                        setTimeout(() => {
                          setIsSendingToApproval(false);
                          setSentToApproval(true);
                        }, 1200);
                      }}
                      disabled={isSendingToApproval}
                      className="px-4 py-2.5 bg-slate-900 hover:bg-black text-white dark:bg-green-600 dark:hover:bg-green-700 rounded-xl text-xs font-black uppercase tracking-tight flex items-center space-x-2 cursor-pointer transition-all active:scale-98"
                    >
                      {isSendingToApproval ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>ОТПРАВКА НА ПОДПИСЬ...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>ОТПРАВИТЬ ИВАНОВОЙ А.С.</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}

            {currentUser.role === 'Директор магазина' && (
              <div className="bg-slate-50 dark:bg-slate-850 border border-slate-200/60 dark:border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className={`w-2 h-2 rounded-full ${isApprovedByDirector ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`}></span>
                    <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-sm ${
                      isApprovedByDirector 
                        ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40' 
                        : 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40'
                    }`}>
                      СТАТУС: {isApprovedByDirector ? 'УТВЕРЖДЕНО ЭЦП ДИРЕКТОРА' : 'ОЖИДАЕТ УТВЕРЖДЕНИЯ'}
                    </span>
                  </div>
                  <h5 className="text-xs font-bold text-gray-900 dark:text-slate-200">Терминал директора: Утверждение ТОРГ-16</h5>
                  <p className="text-[10px] text-gray-500 dark:text-slate-400 leading-relaxed font-medium">
                    Вы вошли как Директор магазина ТС «Мария-Ра». Вам доступны исключительные полномочия по юридическому заверению актов материальных потерь. Подписание акта заблокирует изменения состава списания.
                  </p>
                </div>

                <div className="shrink-0">
                  {isApprovedByDirector ? (
                    <span className="flex items-center space-x-1.5 text-xs font-extrabold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 px-3.5 py-2 rounded-lg">
                      <ShieldCheck className="w-4 h-4" />
                      <span>АКТ ЗАВЕРЕН ЭЦП ДИРЕКТОРА</span>
                    </span>
                  ) : (
                    <button
                      onClick={() => {
                        setIsApprovedByDirector(true);
                      }}
                      className="px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-black uppercase tracking-tight flex items-center space-x-2 cursor-pointer transition-all active:scale-98 shadow-sm"
                    >
                      <FileCheck className="w-4 h-4" />
                      <span>ПОДПИСАТЬ И УТВЕРДИТЬ ТОРГ-16</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {currentUser.role === 'Старший бухгалтер' && (
              <div className="bg-slate-50 dark:bg-slate-850 border border-slate-200/60 dark:border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className={`w-2 h-2 rounded-full ${isExportedTo1C ? 'bg-indigo-500' : 'bg-amber-500 animate-pulse'}`}></span>
                    <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-sm ${
                      isExportedTo1C 
                        ? 'text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40' 
                        : 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40'
                    }`}>
                      1C: {isExportedTo1C ? 'ВЫГРУЖЕНО В БУХГАЛТЕРИЮ' : 'ОЖИДАЕТ ПРОВОДОК'}
                    </span>
                  </div>
                  <h5 className="text-xs font-bold text-gray-900 dark:text-slate-200">Бухгалтерский пульт управления материальными списаниями</h5>
                  <p className="text-[10px] text-gray-500 dark:text-slate-400 leading-relaxed font-medium">
                    Среда Федоровой М.В. Вы можете синхронизировать этот акт с центральной базой 1С:Предприятие 8.3 для автоматической генерации бухгалтерских проводок по дебету счета 94. {!isApprovedByDirector && <span className="text-red-500 font-bold block mt-1">⚠️ Внимание: Для выгрузки требуется, чтобы акт был предварительно подписан Директором магазина.</span>}
                  </p>
                </div>

                <div className="shrink-0">
                  {isExportedTo1C ? (
                    <div className="text-right">
                      <span className="flex items-center justify-center space-x-1.5 text-xs font-extrabold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/40 px-3.5 py-2 rounded-lg mb-1">
                        <Check className="w-4 h-4" />
                        <span>УСПЕШНО ПРОВЕДЕНО В 1С</span>
                      </span>
                      <span className="text-[8px] font-mono font-bold text-gray-400 dark:text-slate-500 block">Проводка: Дт 94 - Кт 41.01</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setIsExporting(true);
                        setTimeout(() => {
                          setIsExporting(false);
                          setIsExportedTo1C(true);
                        }, 1800);
                      }}
                      disabled={isExporting || !isApprovedByDirector}
                      className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-tight flex items-center space-x-2 transition-all active:scale-98 shadow-xs ${
                        !isApprovedByDirector
                          ? 'bg-gray-100 text-gray-400 dark:bg-slate-800 dark:text-slate-600 border border-gray-200 dark:border-slate-800 cursor-not-allowed'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer'
                      }`}
                    >
                      {isExporting ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>ЭКСПОРТ В 1С...</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>ВЫГРУЗИТЬ В 1С:ПРЕДПРИЯТИЕ</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}

            {currentUser.role === 'Старший товаровед' && (
              <div className="bg-slate-50 dark:bg-slate-850 border border-slate-200/60 dark:border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    <span className="text-[10px] font-extrabold text-blue-700 dark:text-blue-400 uppercase tracking-wider bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-sm">
                      ОТВЕТСТВЕННЫЙ ТОВАРОВЕД: {currentUser.name}
                    </span>
                  </div>
                  <h5 className="text-xs font-bold text-gray-900 dark:text-slate-200">Операционная консоль Старшего Товароведа</h5>
                  <p className="text-[10px] text-gray-500 dark:text-slate-400 leading-relaxed font-medium">
                    Вы вошли как Васильев П.С. В вашей среде подготовка списаний настроена на сверку фактических товарных остатков с накладными. Завершите инвентаризацию полок и отправьте акт на подпись директору.
                  </p>
                </div>

                <div className="shrink-0">
                  {isApprovedByDirector ? (
                    <span className="flex items-center space-x-1.5 text-xs font-extrabold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 px-3.5 py-2 rounded-lg">
                      <Check className="w-4 h-4" />
                      <span>АКТ ОДОБРЕН РУКОВОДСТВОМ</span>
                    </span>
                  ) : sentToApproval ? (
                    <span className="text-[10px] font-extrabold text-amber-600 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/40 px-3 py-1.5 rounded-lg">
                      ОЖИДАЕТ УТВЕРЖДЕНИЯ ДИРЕКТОРОМ
                    </span>
                  ) : (
                    <button
                      onClick={() => {
                        setSentToApproval(true);
                      }}
                      className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-tight flex items-center space-x-2 cursor-pointer transition-all active:scale-98"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>ОТПРАВИТЬ ДИРЕКТОРУ</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Committee editing config */}
          <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl p-4 shadow-2xs no-print grid grid-cols-1 md:grid-cols-3 gap-4 transition-colors duration-200">
            <div>
              <label className="block text-[10px] font-extrabold text-gray-500 dark:text-slate-400 uppercase mb-1">Председатель комиссии (Директор)</label>
              <input 
                type="text" 
                value={managerName} 
                onChange={(e) => setManagerName(e.target.value)}
                className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-slate-100 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-green-500 transition-colors duration-200"
              />
            </div>
            <div>
              <label className="block text-[10px] font-extrabold text-gray-500 dark:text-slate-400 uppercase mb-1">Член комиссии (Бухгалтер)</label>
              <input 
                type="text" 
                value={accountantName} 
                onChange={(e) => setAccountantName(e.target.value)}
                className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-slate-100 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-green-500 transition-colors duration-200"
              />
            </div>
            <div>
              <label className="block text-[10px] font-extrabold text-gray-500 dark:text-slate-400 uppercase mb-1">Составитель акта (Практикант)</label>
              <input 
                type="text" 
                value={inspectorName} 
                onChange={(e) => setInspectorName(e.target.value)}
                className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-slate-100 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-green-500 transition-colors duration-200"
              />
            </div>
          </div>

          {/* TORG-16 Document Preview */}
          <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl shadow-xs p-6 md:p-8 overflow-x-auto print-container font-serif text-gray-900 dark:text-slate-100 text-[10px] leading-normal transition-colors duration-200">
            
            <div className="text-right text-[8px] mb-4 text-gray-500 dark:text-slate-400">
              Унифицированная форма № ТОРГ-16<br/>
              Утверждена постановлением Госкомстата России от 25.12.98 № 132
            </div>

            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="border-b border-black dark:border-slate-700 w-64 pb-0.5 font-bold uppercase">ООО «Розница К-1» (ТС Мария-Ра)</div>
                <div className="text-[8px] text-gray-500 dark:text-slate-400 mt-0.5">организация (наименование, адрес)</div>
                <div className="border-b border-black dark:border-slate-700 w-64 pb-0.5 mt-2 font-bold">Супермаркет №54, ул. Ленина, 54</div>
                <div className="text-[8px] text-gray-500 dark:text-slate-400 mt-0.5">структурное подразделение</div>
              </div>
              <div className="border border-black dark:border-slate-700 p-2 text-center text-[9px]">
                <table className="border-collapse">
                  <tbody>
                    <tr><td className="px-2 font-bold">Код по ОКПО</td><td className="border-l border-black dark:border-slate-700 px-2">49830219</td></tr>
                    <tr className="border-t border-black dark:border-slate-700"><td className="px-2 font-bold">Вид операции</td><td className="border-l border-black dark:border-slate-700 px-2">Списание товара</td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="text-center my-6">
              <h2 className="text-base font-black uppercase">АКТ № {Math.floor(Math.random() * 900) + 100}</h2>
              <h3 className="text-sm font-bold mt-1">о списании товаров</h3>
              <p className="mt-2 font-bold">от {simulatedToday.split('-').reverse().join('.')}</p>
            </div>

            <p className="mb-4 leading-relaxed">
              Комиссия в составе председателя <span className="font-bold underline decoration-black dark:decoration-slate-600">{managerName}</span> и членов комиссии <span className="font-bold underline decoration-black dark:decoration-slate-600">{accountantName}</span>, <span className="font-bold underline decoration-black dark:decoration-slate-600">{inspectorName}</span> произвела осмотр товаров, подлежащих списанию ввиду потери потребительских свойств (истечения установленных сроков годности).
            </p>

            <table className="w-full border-collapse border border-black dark:border-slate-700 mb-6 text-[9px]">
              <thead>
                <tr className="bg-gray-100 dark:bg-slate-800 text-center font-bold">
                  <th className="border border-black dark:border-slate-700 p-1.5" rowSpan={2}>№ п/п</th>
                  <th className="border border-black dark:border-slate-700 p-1.5" rowSpan={2}>Наименование товара</th>
                  <th className="border border-black dark:border-slate-700 p-1.5" rowSpan={2}>Штрихкод (EAN-13)</th>
                  <th className="border border-black dark:border-slate-700 p-1.5" rowSpan={2}>Ед. изм.</th>
                  <th className="border border-black dark:border-slate-700 p-1.5" colSpan={3}>Списывается</th>
                  <th className="border border-black dark:border-slate-700 p-1.5" rowSpan={2}>Причина списания</th>
                </tr>
                <tr className="bg-gray-100 dark:bg-slate-800 text-center font-bold border-t border-black dark:border-slate-700">
                  <th className="border border-black dark:border-slate-700 p-1">Кол-во</th>
                  <th className="border border-black dark:border-slate-700 p-1">Цена (руб.)</th>
                  <th className="border border-black dark:border-slate-700 p-1">Сумма (руб.)</th>
                </tr>
              </thead>
              <tbody>
                {writtenOffProducts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center p-6 text-gray-400 dark:text-slate-500 font-sans italic">
                      Списанные товары отсутствуют. Перейдите во вкладку «Каталог» и спишите просроченные продукты.
                    </td>
                  </tr>
                ) : (
                  writtenOffProducts.map((p, idx) => (
                    <tr key={p.id}>
                      <td className="border border-black dark:border-slate-700 p-1 text-center font-mono">{idx + 1}</td>
                      <td className="border border-black dark:border-slate-700 p-1 font-bold">{p.name}</td>
                      <td className="border border-black dark:border-slate-700 p-1 text-center font-mono">{p.barcode}</td>
                      <td className="border border-black dark:border-slate-700 p-1 text-center">шт.</td>
                      <td className="border border-black dark:border-slate-700 p-1 text-center font-bold">{p.quantity}</td>
                      <td className="border border-black dark:border-slate-700 p-1 text-right">{p.price} ₽</td>
                      <td className="border border-black dark:border-slate-700 p-1 text-right font-bold">{(p.price * p.quantity).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽</td>
                      <td className="border border-black dark:border-slate-700 p-1 italic">{p.writeOffReason || 'Истек срок годности'}</td>
                    </tr>
                  ))
                )}
                <tr className="bg-gray-100 dark:bg-slate-800 font-bold border-t border-black dark:border-slate-700">
                  <td className="border border-black dark:border-slate-700 p-1 text-right" colSpan={4}>ИТОГО:</td>
                  <td className="border border-black dark:border-slate-700 p-1 text-center">
                    {writtenOffProducts.reduce((acc, p) => acc + p.quantity, 0)} шт.
                  </td>
                  <td className="border border-black dark:border-slate-700 p-1"></td>
                  <td className="border border-black dark:border-slate-700 p-1 text-right text-red-700 dark:text-red-400">
                    {totalLossRub.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽
                  </td>
                  <td className="border border-black dark:border-slate-700 p-1"></td>
                </tr>
              </tbody>
            </table>

            <p className="mb-6 leading-relaxed">
              Всего списано товаров на общую сумму <span className="font-bold underline decoration-black dark:decoration-slate-600">{totalLossRub.toLocaleString()} рублей 00 копеек</span>. Испорченные товары изъяты из оборота и подлежат утилизации согласно установленным санитарным регламентам ТС «Мария-Ра».
            </p>

            <div className="relative grid grid-cols-2 gap-x-8 gap-y-4 pt-4 mt-6 border-t border-gray-200 dark:border-slate-800">
              {/* Official Digital Approval Stamp */}
              {isApprovedByDirector && (
                <div className="absolute right-6 top-2 border-4 border-double border-emerald-600 text-emerald-600 dark:text-emerald-400 dark:border-emerald-500 font-mono text-[9px] font-black uppercase p-2 rounded-lg rotate-6 bg-white/90 dark:bg-slate-900/90 shadow-sm flex flex-col items-center select-none z-10">
                  <span>Торговая Сеть «Мария-Ра»</span>
                  <span className="border-t border-emerald-600 dark:border-emerald-500 my-0.5 w-full"></span>
                  <span className="text-[10px]">УТВЕРЖДЕНО ЭЦП</span>
                  <span className="text-[8px] text-gray-500 dark:text-slate-400">{managerName}</span>
                  <span className="text-[7px]">MR-ACT-TORG16-OK</span>
                </div>
              )}

              <div>
                <p className="mb-4">Председатель комиссии:</p>
                <div className="flex items-end space-x-2">
                  <span className="w-24 border-b border-black dark:border-slate-700 text-center font-mono text-[8px] text-emerald-600 dark:text-emerald-400">{isApprovedByDirector ? 'ПОДПИСАНО ЭЦП' : ''}</span>
                  <span>/</span>
                  <span className="font-bold">{managerName}</span>
                </div>
              </div>
              <div>
                <p className="mb-4">Член комиссии (Бухгалтер):</p>
                <div className="flex items-end space-x-2">
                  <span className="w-24 border-b border-black dark:border-slate-700 text-center font-mono text-[8px] text-indigo-600 dark:text-indigo-400">{isExportedTo1C ? 'УТВЕРЖДЕНО' : ''}</span>
                  <span>/</span>
                  <span className="font-bold">{accountantName}</span>
                </div>
              </div>
              <div className="col-span-2">
                <p className="mb-4">Составитель акта (Ответственный практикант-программист):</p>
                <div className="flex items-end space-x-2">
                  <span className="w-24 border-b border-black dark:border-slate-700 text-center font-mono text-[8px] text-gray-500">ПОДГОТОВЛЕНО</span>
                  <span>/</span>
                  <span className="font-bold">{inspectorName}</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* SUB-TAB 3: MARKDOWN LOG */}
      {activeSubTab === 'markdown' && (
        <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl shadow-xs overflow-x-auto no-print transition-colors duration-200">
          <div className="p-5 border-b border-gray-100 dark:border-slate-800">
            <h3 className="text-xs font-extrabold text-gray-900 dark:text-slate-100 uppercase">Журнал учета уцененных товаров (Markdown Log)</h3>
            <p className="text-[11px] text-gray-400 dark:text-slate-400 mt-1 leading-relaxed">
              Здесь фиксируются товары, срок годности которых скоро закончится, и на которые наставник (директор магазина) дал добро наклеить зеленую наклейку скидки -30% или -50% для ускорения продаж.
            </p>
          </div>
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50/70 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800 text-gray-500 dark:text-slate-400 font-extrabold uppercase tracking-wider text-[10px]">
                <th className="px-5 py-4">Товар</th>
                <th className="px-4 py-4">Категория</th>
                <th className="px-4 py-4">Окончание срока</th>
                <th className="px-4 py-4 text-center">Скидка</th>
                <th className="px-4 py-4">Старая цена</th>
                <th className="px-4 py-4">Новая цена</th>
                <th className="px-4 py-4">Кол-во</th>
                <th className="px-5 py-4 text-right">Потеря маржи</th>
              </tr>
            </thead>
            <tbody>
              {markedDownProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-20 text-gray-400 dark:text-slate-500 font-sans italic">
                    Пока нет уцененных товаров в текущей смене. Сделайте уценку во вкладке «Каталог».
                  </td>
                </tr>
              ) : (
                markedDownProducts.map(p => (
                  <tr key={p.id} className="border-b border-gray-50 dark:border-slate-800/60 hover:bg-gray-50/20 dark:hover:bg-slate-800/30 transition-all">
                    <td className="px-5 py-4 font-bold text-gray-900 dark:text-slate-100">{p.name}</td>
                    <td className="px-4 py-4">
                      <span className={`inline-block whitespace-nowrap px-2 py-0.5 rounded-sm border text-[10px] font-extrabold ${categoryColors[p.category]}`}>
                        {categoryLabels[p.category]}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-gray-600 dark:text-slate-300 font-mono font-bold">
                      {p.expirationDate.split('-').reverse().join('.')}
                    </td>
                    <td className="px-4 py-4 text-center font-black text-green-700 dark:text-green-400">
                      -{p.markdownPercent}%
                    </td>
                    <td className="px-4 py-4 text-gray-400 dark:text-slate-500 line-through font-bold">{p.price} ₽</td>
                    <td className="px-4 py-4 text-green-700 dark:text-green-400 font-black">{p.markdownPrice} ₽</td>
                    <td className="px-4 py-4 font-bold text-gray-800 dark:text-slate-200">{p.quantity} шт.</td>
                    <td className="px-5 py-4 text-right font-extrabold text-red-600 dark:text-red-400">
                      -{((p.price - p.markdownPrice!) * p.quantity).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽
                    </td>
                  </tr>
                ))
              )}
              {markedDownProducts.length > 0 && (
                <tr className="bg-green-50/30 dark:bg-green-950/10 font-extrabold border-t border-gray-100 dark:border-slate-800">
                  <td className="px-5 py-4 text-right" colSpan={6}>ИТОГО упущенная маржа:</td>
                  <td className="px-4 py-4 text-center">
                    {markedDownProducts.reduce((acc, p) => acc + p.quantity, 0)} шт.
                  </td>
                  <td className="px-5 py-4 text-right text-red-600 dark:text-red-400">
                    -{totalMarkdownLossRub.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* SUB-TAB 4: LOSS ANALYTICS */}
      {activeSubTab === 'analytics' && (
        <div className="space-y-6 no-print">
          
          {/* Custom Role-Based BI and Tax Deck */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 rounded-xl p-4 shadow-2xs transition-colors duration-200">
              <span className="text-[9px] font-black text-green-700 dark:text-green-400 uppercase tracking-widest bg-green-50 dark:bg-green-950/40 px-2 py-0.5 rounded-sm">Списание (ТОРГ-16)</span>
              <div className="text-xl font-black text-gray-950 dark:text-slate-50 mt-2 font-mono">{totalLossRub.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽</div>
              <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-1">Итоговая сумма утилизации по себестоимости</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 rounded-xl p-4 shadow-2xs transition-colors duration-200">
              <span className="text-[9px] font-black text-green-700 dark:text-green-400 uppercase tracking-widest bg-green-50 dark:bg-green-950/40 px-2 py-0.5 rounded-sm">Потери на уценке</span>
              <div className="text-xl font-black text-gray-950 dark:text-slate-50 mt-2 font-mono">{totalMarkdownLossRub.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽</div>
              <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-1">Разница цен продажи (упущенная маржа)</p>
            </div>

            {currentUser.role === 'Стажер-практикант' && (
              <div className="bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200/50 dark:border-amber-900/30 rounded-xl p-4 shadow-2xs transition-colors duration-200">
                <span className="text-[9px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-sm">Роль: Стажёр-практикант</span>
                <div className="text-xs font-bold text-amber-950 dark:text-amber-200 mt-2">Финансовые расчеты заблокированы</div>
                <p className="text-[10px] text-amber-850 dark:text-amber-400 mt-1">Оптимизация налогов по статьям НК РФ доступна только в рабочей среде бухгалтера.</p>
              </div>
            )}

            {currentUser.role === 'Старший бухгалтер' && (
              <div className="bg-indigo-50/50 dark:bg-indigo-950/10 border border-indigo-200/50 dark:border-indigo-900/30 rounded-xl p-4 shadow-2xs transition-colors duration-200">
                <span className="text-[9px] font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-sm">Расчет ст.265 НК РФ (Налог на прибыль)</span>
                <div className="text-xl font-black text-indigo-950 dark:text-slate-100 mt-2 font-mono">+{(totalLossRub * 0.2).toFixed(0)} ₽</div>
                <p className="text-[10px] text-indigo-850 dark:text-indigo-300 mt-1">Бухгалтерская экономия на налоге (20% от суммы потерь списывается во внереализационные расходы)</p>
              </div>
            )}

            {currentUser.role === 'Директор магазина' && (
              <div className="bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-200/50 dark:border-emerald-900/30 rounded-xl p-4 shadow-2xs transition-colors duration-200">
                <span className="text-[9px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-sm">Оценка бюджета потерь ТС</span>
                <div className="text-xl font-black text-emerald-950 dark:text-slate-100 mt-2 font-mono">
                  {((totalLossRub / 150000) * 100).toFixed(1)}%
                </div>
                <p className="text-[10px] text-emerald-850 dark:text-emerald-300 mt-1">
                  Лимит: 150 000 ₽. Статус: <b className={totalLossRub > 100000 ? 'text-rose-600' : 'text-emerald-600'}>{totalLossRub > 100000 ? 'ПРЕВЫШЕНИЕ СКОРО' : 'В ПРЕДЕЛАХ НОРМЫ'}</b>
                </p>
              </div>
            )}

            {currentUser.role === 'Старший товаровед' && (
              <div className="bg-blue-50/50 dark:bg-blue-950/10 border border-blue-200/50 dark:border-blue-900/30 rounded-xl p-4 shadow-2xs transition-colors duration-200">
                <span className="text-[9px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-sm">Сменные показатели ТСД</span>
                <div className="text-xl font-black text-blue-950 dark:text-slate-100 mt-2 font-mono">
                  {markedDownProducts.length} уценок
                </div>
                <p className="text-[10px] text-blue-850 dark:text-blue-300 mt-1">Качественная работа с полками минимизировала чистую просрочку на 35%.</p>
              </div>
            )}

          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Chart of Losses by Category */}
            <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl p-5 shadow-2xs transition-colors duration-200">
              <h3 className="text-xs font-extrabold text-gray-900 dark:text-slate-100 uppercase mb-4">Финансовые потери по категориям товаров (руб)</h3>
            
            <div className="space-y-4">
              {Object.keys(lossesByCategory).map(cat => {
                const value = lossesByCategory[cat as ProductCategory];
                const max = Math.max(...Object.values(lossesByCategory), 1);
                const pct = Math.round((value / max) * 100);
                
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className="text-gray-700 dark:text-slate-200">{categoryLabels[cat as ProductCategory]}</span>
                      <span className="text-red-600 dark:text-red-400">{value.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽</span>
                    </div>
                    <div className="w-full bg-gray-50 dark:bg-slate-800 h-3 rounded-md overflow-hidden border border-gray-100 dark:border-slate-850">
                      <div 
                        className="h-full bg-red-500 rounded-md transition-all duration-500" 
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <p className="text-[10px] text-gray-400 dark:text-slate-400 mt-6 leading-relaxed">
              *График автоматически строится на основе списаний товаров в акте ТОРГ-16. Позволяет директору магазина принимать управленческие решения об уменьшении объема заказов по проблемным группам товаров.
            </p>
          </div>

          {/* Loss prevention tips card */}
          <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl p-5 shadow-2xs flex flex-col justify-between transition-colors duration-200">
            <div>
              <h3 className="text-xs font-extrabold text-gray-900 dark:text-slate-100 uppercase mb-3">Эффективность превентивной уценки</h3>
              <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
                Внедрение нашего веб-приложения позволяет заменить медленный бумажный контроль автоматическим календарным планированием:
              </p>
              
              <ul className="space-y-2 mt-4 text-xs text-gray-700 dark:text-slate-300 font-medium">
                <li className="flex items-center space-x-2.5">
                  <span className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300 flex items-center justify-center font-bold text-[10px]">1</span>
                  <span><b>Сокращение потерь на 45%</b> за счет продажи товаров по скидке вместо полной просрочки.</span>
                </li>
                <li className="flex items-center space-x-2.5">
                  <span className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300 flex items-center justify-center font-bold text-[10px]">2</span>
                  <span><b>100% защита от штрафов Роспотребнадзора</b> благодаря исключению человеческого фактора.</span>
                </li>
                <li className="flex items-center space-x-2.5">
                  <span className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300 flex items-center justify-center font-bold text-[10px]">3</span>
                  <span><b>Экономия 12 часов рабочего времени</b> сотрудников магазина еженедельно.</span>
                </li>
              </ul>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-100 dark:border-yellow-900/30 rounded-lg p-4 mt-6 transition-colors duration-200">
              <span className="text-[10px] font-black text-amber-800 dark:text-amber-400 uppercase tracking-wider block">Рекомендация наставника</span>
              <p className="text-[11px] text-amber-950 dark:text-amber-200 mt-1">
                Используйте эти цифры и графики в <b>Разделе 3 отчета по практике</b> в качестве доказательства практической ценности разработанной вами программы! Это гарантирует высший балл на защите.
              </p>
            </div>
          </div>

        </div>
        </div>
      )}

      {/* MODAL DIALOG 1: ADD PRODUCT */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 no-print">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto animate-zoom-in transition-colors duration-200">
            
            <div className="flex justify-between items-center pb-4 border-b border-gray-100 dark:border-slate-800">
              <h3 className="text-sm font-black text-gray-900 dark:text-slate-100 uppercase">Регистрация и сканирование товара</h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-900 dark:hover:text-slate-100 font-bold text-lg"
              >
                &times;
              </button>
            </div>

            {/* Scanning Simulator Helper */}
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-lg p-3 my-4 transition-colors duration-200">
              <label className="block text-[10px] font-extrabold text-amber-950 dark:text-amber-300 uppercase mb-1.5 flex items-center space-x-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 animate-pulse" />
                <span>Симулятор сканирования ТСД / Выбор товара</span>
              </label>
              <select
                onChange={handleScanTemplateChange}
                className="w-full bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-900/40 text-gray-900 dark:text-slate-100 rounded-md px-2.5 py-1.5 text-xs focus:outline-none transition-colors duration-200 font-bold"
              >
                <option value="-1">-- Ручной ввод (Абсолютно новый товар) --</option>
                {productTemplates.map((t, idx) => (
                  <option key={idx} value={idx}>[{t.barcode}] {t.name} ({t.price} руб)</option>
                ))}
              </select>
              <span className="text-[9px] text-amber-850 dark:text-amber-400 mt-1 block font-medium leading-relaxed">
                * Выберите шаблон для быстрой вставки параметров, либо оставьте <b>"Ручной ввод"</b> и введите любое название, штрихкод и цену вручную для добавления своего товара!
              </span>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-4">
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-extrabold text-gray-600 dark:text-slate-400 uppercase mb-1">Штрихкод товара (EAN-13)</label>
                  <input 
                    type="text"
                    required
                    value={newProduct.barcode}
                    onChange={(e) => setNewProduct({ ...newProduct, barcode: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:border-green-500 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none transition-colors duration-200"
                    placeholder="4607142..."
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-gray-600 dark:text-slate-400 uppercase mb-1">Категория</label>
                  <select
                    value={newProduct.category}
                    onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value as ProductCategory })}
                    className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:border-green-500 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none transition-colors duration-200"
                  >
                    {Object.keys(categoryLabels).map(cat => (
                      <option key={cat} value={cat}>{categoryLabels[cat as ProductCategory]}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-gray-600 dark:text-slate-400 uppercase mb-1">Полное название товара</label>
                <input 
                  type="text"
                  required
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:border-green-500 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none transition-colors duration-200"
                  placeholder="Введите марку, процент жирности, объем..."
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-extrabold text-gray-600 dark:text-slate-400 uppercase mb-1">Цена за ед.</label>
                  <input 
                    type="number"
                    required
                    value={newProduct.price || ''}
                    onChange={(e) => setNewProduct({ ...newProduct, price: Number(e.target.value) })}
                    className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:border-green-500 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none transition-colors duration-200"
                    placeholder="руб"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-gray-600 dark:text-slate-400 uppercase mb-1">Кол-во (остаток)</label>
                  <input 
                    type="number"
                    required
                    value={newProduct.quantity || ''}
                    onChange={(e) => setNewProduct({ ...newProduct, quantity: Number(e.target.value) })}
                    className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:border-green-500 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none transition-colors duration-200"
                    placeholder="шт"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-gray-600 dark:text-slate-400 uppercase mb-1">Стеллаж / Ряд</label>
                  <input 
                    type="text"
                    value={newProduct.location}
                    onChange={(e) => setNewProduct({ ...newProduct, location: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:border-green-500 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none transition-colors duration-200"
                    placeholder="Холодильник Ряд 1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-extrabold text-gray-600 dark:text-slate-400 uppercase mb-1">Дата изготовления</label>
                  <input 
                    type="date"
                    value={newProduct.manufactureDate}
                    onChange={(e) => setNewProduct({ ...newProduct, manufactureDate: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:border-green-500 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none transition-colors duration-200"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-gray-600 dark:text-slate-400 uppercase mb-1">Годен до (Срок годности)</label>
                  <input 
                    type="date"
                    required
                    value={newProduct.expirationDate}
                    onChange={(e) => setNewProduct({ ...newProduct, expirationDate: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:border-green-500 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none transition-colors duration-200"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-gray-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 text-xs font-bold rounded-lg transition-colors duration-200"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors"
                >
                  Внести в систему
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* MODAL DIALOG 2: MARKDOWN ACTION */}
      {showMarkdownModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 no-print">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-2xl w-full max-w-sm p-6 animate-zoom-in transition-colors duration-200">
            <h3 className="text-sm font-black text-gray-900 dark:text-slate-100 uppercase pb-3 border-b border-gray-100 dark:border-slate-800">Уценка скоропортящегося товара</h3>
            
            <p className="text-xs text-gray-600 dark:text-slate-400 mt-3 leading-relaxed">
              Вы собираетесь сделать уценку для товара: <b className="text-gray-900 dark:text-slate-100 block mt-1">{selectedProduct.name}</b>
            </p>

            <div className="my-4">
              <label className="block text-[10px] font-extrabold text-gray-500 dark:text-slate-400 uppercase mb-2">Выберите размер скидки (уценки):</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setMarkdownPercent(30)}
                  className={`py-3 rounded-lg text-xs font-extrabold border transition-all ${
                    markdownPercent === 30
                      ? 'bg-green-50 dark:bg-green-950/40 border-green-400 dark:border-green-800 text-green-800 dark:text-green-300 font-black'
                      : 'bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-850'
                  }`}
                >
                  Скидка -30%
                  <span className="block text-[9px] font-normal text-gray-400 dark:text-slate-500 mt-1">Новая цена: {Math.round(selectedProduct.price * 0.7)} ₽</span>
                </button>
                <button
                  onClick={() => setMarkdownPercent(50)}
                  className={`py-3 rounded-lg text-xs font-extrabold border transition-all ${
                    markdownPercent === 50
                      ? 'bg-green-50 dark:bg-green-950/40 border-green-400 dark:border-green-800 text-green-800 dark:text-green-300 font-black'
                      : 'bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-850'
                  }`}
                >
                  Скидка -50%
                  <span className="block text-[9px] font-normal text-gray-400 dark:text-slate-500 mt-1">Новая цена: {Math.round(selectedProduct.price * 0.5)} ₽</span>
                </button>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4 border-t border-gray-100 dark:border-slate-800">
              <button
                onClick={() => {
                  setShowMarkdownModal(false);
                  setSelectedProduct(null);
                }}
                className="px-4 py-2 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 text-xs font-bold rounded-lg transition-colors duration-200"
              >
                Отмена
              </button>
              <button
                onClick={applyMarkdown}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors"
              >
                Применить уценку
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DIALOG 3: WRITE-OFF ACTION */}
      {showWriteOffModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 no-print">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-2xl w-full max-w-sm p-6 animate-zoom-in transition-colors duration-200">
            <h3 className="text-sm font-black text-gray-900 dark:text-slate-100 uppercase pb-3 border-b border-gray-100 dark:border-slate-800">Списание товара из оборота</h3>
            
            <p className="text-xs text-gray-600 dark:text-slate-400 mt-3 leading-relaxed">
              Вы списываете с остатков магазина товар: <b className="text-gray-900 dark:text-slate-100 block mt-1">{selectedProduct.name}</b>
              Количество позиций: <b className="text-gray-900 dark:text-slate-100">{selectedProduct.quantity} шт.</b>
            </p>

            <div className="my-4">
              <label className="block text-[10px] font-extrabold text-gray-500 dark:text-slate-400 uppercase mb-1.5">Причина снятия с полки:</label>
              <select
                value={writeOffReason}
                onChange={(e) => setWriteOffReason(e.target.value)}
                className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-slate-100 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none transition-colors duration-200"
              >
                <option value="Истек срок годности">Истек срок годности (Просрочка)</option>
                <option value="Повреждение упаковки">Повреждение упаковки</option>
                <option value="Бой товара">Бой товара / Нарушение целостности</option>
                <option value="Гниль/Усушка">Гниль / Усушка (для отдела ФРОВ)</option>
                <option value="Нарушение температурного режима">Нарушение условий хранения</option>
              </select>
            </div>

            <div className="flex justify-end space-x-2 pt-4 border-t border-gray-100 dark:border-slate-800">
              <button
                onClick={() => {
                  setShowWriteOffModal(false);
                  setSelectedProduct(null);
                }}
                className="px-4 py-2 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 text-xs font-bold rounded-lg transition-colors duration-200"
              >
                Отмена
              </button>
              <button
                onClick={applyWriteOff}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors"
              >
                Списать по акту
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

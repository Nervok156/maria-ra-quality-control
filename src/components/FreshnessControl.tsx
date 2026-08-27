import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, AlertTriangle, Trash2, Tag, Plus, Search, 
  TrendingDown, CheckCircle, Sparkles, Printer,
  Layers, Check, Send, FileCheck, RefreshCw
} from 'lucide-react';
import { Product, ProductCategory, Employee } from '../types';
import { categoryLabels, categoryColors, productTemplates } from '../data/initialProducts';
import { supabase } from '../lib/supabaseClient';
import { createProduct, createBatch, createMarkdown, createWriteoffAct, createWriteoffItems, getActiveProducts, addTelemetry } from '../api/databaseAPI';

interface FreshnessControlProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  currentUser: Employee;
  onDataChange: () => Promise<void>;
}

export default function FreshnessControl({ products, setProducts, currentUser, onDataChange }: FreshnessControlProps) {
  const [activeSubTab, setActiveSubTab] = useState<'catalog' | 'writeoffs' | 'markdown' | 'analytics'>(() => {
    const saved = localStorage.getItem('maria_ra_active_sub_tab');
    return (saved as any) || 'catalog';
  });

  useEffect(() => {
    localStorage.setItem('maria_ra_active_sub_tab', activeSubTab);
  }, [activeSubTab]);

  const handlePrint = () => {
    window.print();
  };

  // ✅ Проверка прав на уценку
  const canMarkdown = currentUser.role === 'Директор магазина' || currentUser.role === 'Старший товаровед';

  // ✅ Helper to calculate status based on expiry date (используем реальную дату)
const calculateStatusAndPercent = (expiryDateStr: string, manufactureDateStr?: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDateStr);
  expiry.setHours(0, 0, 0, 0);
  
  const diffTime = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays <= 0) {
    return { status: 'expired' as const, percent: 0, daysRemaining: diffDays };
  }
  
  // ✅ Проверяем на бессрочный (≈100 лет)
  const isUnlimited = diffDays > 36500;
  if (isUnlimited) {
    return {
      status: 'long_term' as const,
      percent: 100,
      daysRemaining: 0
    };
  }
    let totalLife = 10;
  if (manufactureDateStr) {
    const manufacture = new Date(manufactureDateStr);
    manufacture.setHours(0, 0, 0, 0);
    totalLife = Math.max(1, Math.ceil((expiry.getTime() - manufacture.getTime()) / (1000 * 60 * 60 * 24)));
  }
  
  const percent = Math.min(100, Math.max(0, Math.round((diffDays / totalLife) * 100)));
  const expiringSoon = diffDays <= 2 || percent <= 25;
  
  return {
    status: expiringSoon ? ('expiring_soon' as const) : ('fresh' as const),
    percent,
    daysRemaining: diffDays
  };
};

  const [showAddModal, setShowAddModal] = useState(false);
  const [newProduct, setNewProduct] = useState({
    barcode: '',
    name: '',
    category: 'dairy' as ProductCategory,
    price: 0,
    quantity: 1,
    expirationDate: '',
    manufactureDate: '',
    location: 'shelf_1',
    isUnlimited: false
  });

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showMarkdownModal, setShowMarkdownModal] = useState(false);
  const [markdownPercent, setMarkdownPercent] = useState(30);

  const [showWriteOffModal, setShowWriteOffModal] = useState(false);
  const [writeOffReason, setWriteOffReason] = useState('Истек срок годности');

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [inspectorName, setInspectorName] = useState('Копыл И.А. (Практикант)');
  const [managerName, setManagerName] = useState('Иванова А.С. (Директор магазина)');
  const [accountantName, setAccountantName] = useState('Федорова М.В. (Старший бухгалтер)');

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

  const handleScanTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const idx = Number(e.target.value);
    if (isNaN(idx) || idx < 0) {
      setNewProduct({
        barcode: '',
        name: '',
        category: 'dairy',
        price: 0,
        quantity: 1,
        expirationDate: '',
        manufactureDate: '',
        location: 'shelf_1',
  isUnlimited: false 
      });
      return;
    }
    
    const template = productTemplates[idx];
    const today = new Date();
    const mDate = new Date();
    mDate.setDate(today.getDate() - 2);
    const eDate = new Date();
    eDate.setDate(today.getDate() + (template.shelfLifeDays - 2));

    const format = (d: Date) => d.toISOString().split('T')[0];

    setNewProduct({
      barcode: template.barcode,
      name: template.name,
      category: template.category as ProductCategory,
      price: template.price,
      quantity: Math.floor(Math.random() * 10) + 1,
      manufactureDate: format(mDate),
      expirationDate: format(eDate),
      location: 'shelf_1',
  isUnlimited: false 
    });
  };

  // ==========================================================
  // ✅ СОЗДАНИЕ ТОВАРА
  // ==========================================================
  const handleCreateProduct = async (e: React.FormEvent) => {
  e.preventDefault();
  
  // ✅ Проверка: скоропортящиеся товары не могут быть бессрочными
  const perishableCategories = ['dairy', 'bakery', 'meat_sausage', 'confectionery'];
  if (newProduct.isUnlimited && perishableCategories.includes(newProduct.category)) {
    alert('⚠️ Для скоропортящихся товаров (молочные, хлеб, мясо, кондитерские) обязательно указывать срок годности!');
    return;
  }
  
  // ✅ Для бессрочных товаров не проверяем срок годности
  if (!newProduct.isUnlimited && !newProduct.expirationDate) {
    alert("Пожалуйста, заполните поле 'Срок годности' или отметьте товар как бессрочный!");
    return;
  }
  
  if (!newProduct.name || !newProduct.barcode) {
    alert("Пожалуйста, заполните основные поля: Название и Штрихкод!");
    return;
  }

  try {
    const trimmedBarcode = newProduct.barcode.trim();

    // Проверяем, существует ли товар
    const { data: existingProducts, error: searchError } = await supabase
      .from('products')
      .select('id, name, barcode')
      .eq('barcode', trimmedBarcode);

    if (searchError) {
      console.error('❌ Ошибка поиска товара:', searchError);
      throw searchError;
    }

    let productId;

    if (existingProducts && existingProducts.length > 0) {
      productId = existingProducts[0].id;
      alert(`Товар "${existingProducts[0].name}" уже есть в базе. Добавляем новую партию.`);
    } else {
      const product = await createProduct({
        barcode: trimmedBarcode,
        name: newProduct.name,
        category_id: newProduct.category,
        base_price: Number(newProduct.price),
        shelf_life_days: newProduct.isUnlimited ? 99999 : 7
      });
      
      if (!product || !product.id) {
        throw new Error('Не удалось создать товар');
      }
      productId = product.id;
    }

    // ✅ Для бессрочных товаров устанавливаем срок на 100 лет вперёд
    const expirationDate = newProduct.isUnlimited 
      ? new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      : newProduct.expirationDate;

    await createBatch({
      product_id: productId,
      store_id: 'store_1',
      quantity: Number(newProduct.quantity),
      manufacture_date: newProduct.manufactureDate || new Date().toISOString().split('T')[0],
      expiration_date: expirationDate,
      location_id: newProduct.location || 'shelf_1'
    });

    await onDataChange();
    
    setShowAddModal(false);
    setNewProduct({
      barcode: '',
      name: '',
      category: 'dairy',
      price: 0,
      quantity: 1,
      expirationDate: '',
      manufactureDate: '',
      location: 'shelf_1',
      isUnlimited: false
    });
    
  } catch (error) {
    console.error('❌ Ошибка при создании товара:', error);
    alert('Не удалось создать товар. Проверьте подключение к базе данных.');
  }
};

  // ==========================================================
  // ✅ ФУНКЦИЯ УЦЕНКИ (с проверкой прав и статуса)
  // ==========================================================
  const applyMarkdown = async () => {
    if (!selectedProduct) {
      console.warn('Нет выбранного товара');
      return;
    }
    
    // Проверка прав
    if (!canMarkdown) {
      alert('У вас нет прав для проведения уценки!');
      return;
    }
    
    // Проверка статуса товара
    if (selectedProduct.status !== 'expiring_soon' && selectedProduct.status !== 'marked_down') {
      alert('Уценка возможна только для товаров с истекающим сроком годности!');
      return;
    }
    
    try {
      console.log('🔄 Применяем уценку...');
      
      await createMarkdown({
        batch_id: selectedProduct.id,
        employee_id: currentUser?.id || '1',
        discount_percent: markdownPercent,
        old_price: selectedProduct.price,
        new_price: Math.round(selectedProduct.price * (1 - markdownPercent / 100))
      });
      
      await addTelemetry({
        employee_id: currentUser?.id || '1',
        action_type: 'MARKDOWN_PRODUCT',
        payload: { batch_id: selectedProduct.id, discount_percent: markdownPercent }
      });
      
      const updatedProducts = await getActiveProducts();
      setProducts(updatedProducts);
      
      setShowMarkdownModal(false);
      setSelectedProduct(null);
      
      console.log('✅ Уценка применена успешно');
    } catch (error) {
      console.error('❌ Ошибка при уценке:', error);
      alert('Не удалось применить уценку.');
    }
  };

  // ==========================================================
  // ✅ СПИСАНИЕ
  // ==========================================================
  const applyWriteOff = async () => {
    if (!selectedProduct) return;
    
    try {
      console.log('🔄 Начинаем списание товара:', selectedProduct.id);
      
      const { data: batchData, error: batchError } = await supabase
        .from('batches')
        .select('product_id, quantity')
        .eq('id', selectedProduct.id)
        .single();
      
      if (batchError || !batchData) {
        console.error('❌ Ошибка поиска товара для партии:', batchError);
        alert('Не удалось найти товар для этой партии');
        return;
      }

      const productId = batchData.product_id;
      console.log('📦 Найден product_id:', productId);

      const act = await createWriteoffAct({
        act_number: `АКТ-ТОРГ16-00${Date.now().toString().slice(-5)}`,
        store_id: 'store_1',
        creator_id: currentUser?.id || '1',
        approved_by_id: null,
        is_exported_to_1c: false
      });

      if (!act) {
        throw new Error('Не удалось создать акт списания');
      }
      console.log('✅ Создан акт:', act.id);
      
      await createWriteoffItems([{
        act_id: act.id,
        product_id: productId,
        quantity: selectedProduct.quantity,
        reason: writeOffReason,
        unit_price: selectedProduct.price
      }]);
      console.log('✅ Созданы строки списания');
      
      const { error: updateError } = await supabase
        .from('batches')
        .update({ 
          is_written_off: true,
          writeoff_reason: writeOffReason
        })
        .eq('id', selectedProduct.id);
      
      if (updateError) {
        console.error('❌ Ошибка обновления партии:', updateError);
        alert('Ошибка при обновлении партии: ' + updateError.message);
        return;
      }
      console.log('✅ Партия помечена как списанная');
      
      await addTelemetry({
        employee_id: currentUser?.id || '1',
        action_type: 'CREATE_WRITEOFF_ACT',
        payload: { act_id: act.id, items_count: 1 }
      });
      
      await onDataChange();
      
      setShowWriteOffModal(false);
      setSelectedProduct(null);
      
      alert('✅ Товар успешно списан! Акт ТОРГ-16 создан.');
    } catch (error) {
      console.error('❌ Ошибка при списании:', error);
      alert('Не удалось списать товар: ' + (error as any).message);
    }
  };

  // ==========================================================
  // РЕНДЕР СТАТУСОВ
  // ==========================================================
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
if (product.status === 'long_term') {
    return (
      <span className="bg-purple-100 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-900/30 px-2.5 py-1 rounded-md text-[10px] font-extrabold flex items-center w-fit space-x-1">
        <span>📦 Длительное хранение</span>
        <span className="text-[9px] font-normal opacity-70">({product.daysRemaining} дн.)</span>
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

  // ==========================================================
  // ВЫЧИСЛЕНИЯ ДЛЯ АНАЛИТИКИ
  // ==========================================================
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

  const getProgressColor = (percent: number) => {
    if (percent <= 25) return 'bg-red-500';
    if (percent <= 50) return 'bg-amber-500';
    return 'bg-green-600';
  };

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

  const lossesByCategory: Record<ProductCategory, number> = {
    dairy: 0, bakery: 0, meat_sausage: 0, grocery: 0, beverages: 0, confectionery: 0, other: 0
  };
  writtenOffProducts.forEach(p => {
    lossesByCategory[p.category] += p.price * p.quantity;
  });

  // ==========================================================
  // JSX
  // ==========================================================
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

      {/* Sub tabs */}
      <div className="flex border-b border-gray-100 dark:border-slate-800 no-print transition-colors duration-200">
        <button
          onClick={() => setActiveSubTab('catalog')}
          className={`px-5 py-3 text-xs font-bold border-b-2 transition-all ${activeSubTab === 'catalog' ? 'border-green-600 text-green-700 dark:text-green-400' : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200'}`}
        >
          Каталог & Контроль Сроков
        </button>
        <button
          onClick={() => setActiveSubTab('writeoffs')}
          className={`px-5 py-3 text-xs font-bold border-b-2 transition-all ${activeSubTab === 'writeoffs' ? 'border-green-600 text-green-700 dark:text-green-400' : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200'}`}
        >
          Акт Списания (ТОРГ-16)
        </button>
        <button
          onClick={() => setActiveSubTab('markdown')}
          className={`px-5 py-3 text-xs font-bold border-b-2 transition-all ${activeSubTab === 'markdown' ? 'border-green-600 text-green-700 dark:text-green-400' : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200'}`}
        >
          Журнал Уценки
        </button>
        <button
          onClick={() => setActiveSubTab('analytics')}
          className={`px-5 py-3 text-xs font-bold border-b-2 transition-all ${activeSubTab === 'analytics' ? 'border-green-600 text-green-700 dark:text-green-400' : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200'}`}
        >
          Аналитика Потерь
        </button>
      </div>

      {/* SUB-TAB 1: CATALOG */}
      {activeSubTab === 'catalog' && (
        <div className="space-y-4 no-print">
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
                  <option value="long_term">📦 Длительное хранение</option>
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
  {product.status === 'long_term' ? (
    <div>
      <span className="font-bold text-purple-600 dark:text-purple-400 block">
        ♾️ Бессрочный
      </span>
      <span className="text-[10px] text-gray-400 dark:text-slate-500 block mt-0.5">
        изгот: {product.manufactureDate?.split('-').reverse().join('.') || 'не указана'}
      </span>
    </div>
  ) : (
    <>
      <span className="font-bold text-gray-700 dark:text-slate-300 block">
        {product.expirationDate.split('-').reverse().join('.')}
      </span> 
      <span className="text-[10px] text-gray-400 dark:text-slate-500 block mt-0.5">
        изгот: {product.manufactureDate?.split('-').reverse().join('.') || 'нет данных'}
      </span>
    </>
  )}
</td>
                        <td className="px-4 py-4">
  {isWrittenOff ? (
    <span className="text-red-500 dark:text-red-400 font-mono text-[10px] font-bold">Снято с полки</span>
  ) : product.status === 'long_term' ? (
    <span className="text-purple-500 dark:text-purple-400 font-mono text-[10px] font-bold">♾️ Бессрочный</span>
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
                        <td className="px-5 py-4 text-right">
                          <div className="flex justify-end space-x-1.5">
                            {/* ✅ Кнопка уценки — только для Директора и Старшего товароведа */}
                            {!isWrittenOff && !isMarkedDown && canMarkdown && (
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

      {/* SUB-TAB 2: WRITE-OFFS */}
      {activeSubTab === 'writeoffs' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl p-4 shadow-2xs no-print flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-colors duration-200">
            <div>
              <h3 className="text-xs font-extrabold text-gray-900 dark:text-slate-100 uppercase">Официальный Акт о списании (Унифицированная форма № ТОРГ-16)</h3>
              <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-1 leading-relaxed">
                Сюда автоматически подтягиваются все списанные позиции.
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

          <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 rounded-xl p-5 shadow-2xs no-print transition-colors duration-200">
            <h4 className="text-[11px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-3.5 flex items-center space-x-1.5">
              <Layers className="w-4 h-4 text-green-600 dark:text-green-400" />
              <span>ИНТЕРАКТИВНЫЕ ДЕЙСТВИЯ ДЛЯ ВАШЕЙ СРЕДЫ</span>
            </h4>

            {currentUser.role === 'Директор магазина' && (
              <div className="bg-slate-50 dark:bg-slate-850 border border-slate-200/60 dark:border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className={`w-2 h-2 rounded-full ${isApprovedByDirector ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`}></span>
                    <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-sm ${isApprovedByDirector ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40' : 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40'}`}>
                      СТАТУС: {isApprovedByDirector ? 'УТВЕРЖДЕНО ЭЦП ДИРЕКТОРА' : 'ОЖИДАЕТ УТВЕРЖДЕНИЯ'}
                    </span>
                  </div>
                  <h5 className="text-xs font-bold text-gray-900 dark:text-slate-200">Терминал директора: Утверждение ТОРГ-16</h5>
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
                    <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-sm ${isExportedTo1C ? 'text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40' : 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40'}`}>
                      1C: {isExportedTo1C ? 'ВЫГРУЖЕНО В БУХГАЛТЕРИЮ' : 'ОЖИДАЕТ ПРОВОДОК'}
                    </span>
                  </div>
                  <h5 className="text-xs font-bold text-gray-900 dark:text-slate-200">Бухгалтерский пульт</h5>
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
                      className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-tight flex items-center space-x-2 transition-all active:scale-98 shadow-xs ${!isApprovedByDirector ? 'bg-gray-100 text-gray-400 dark:bg-slate-800 dark:text-slate-600 border border-gray-200 dark:border-slate-800 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer'}`}
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
              <label className="block text-[10px] font-extrabold text-gray-500 dark:text-slate-400 uppercase mb-1">Составитель акта</label>
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
              <p className="mt-2 font-bold">от {new Date().toISOString().split('T')[0].split('-').reverse().join('.')}</p>
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
                      Списанные товары отсутствуют.
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
              Всего списано товаров на общую сумму <span className="font-bold underline decoration-black dark:decoration-slate-600">{totalLossRub.toLocaleString()} рублей 00 копеек</span>.
            </p>

            <div className="relative grid grid-cols-2 gap-x-8 gap-y-4 pt-4 mt-6 border-t border-gray-200 dark:border-slate-800">
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
                <p className="mb-4">Составитель акта:</p>
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
              Здесь фиксируются товары, срок годности которых скоро закончится, и на которые сделана скидка.
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
                    Пока нет уцененных товаров.
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

      {/* SUB-TAB 4: ANALYTICS */}
      {activeSubTab === 'analytics' && (
        <div className="space-y-6 no-print">
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                        <div className="h-full bg-red-500 rounded-md transition-all duration-500" style={{ width: `${pct}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl p-5 shadow-2xs flex flex-col justify-between transition-colors duration-200">
              <div>
                <h3 className="text-xs font-extrabold text-gray-900 dark:text-slate-100 uppercase mb-3">Эффективность превентивной уценки</h3>
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
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD PRODUCT */}
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
                  <select
                    value={newProduct.location}
                    onChange={(e) => setNewProduct({ ...newProduct, location: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:border-green-500 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none transition-colors duration-200"
                  >
                    <option value="shelf_1">Холодильник молочной гастрономии (shelf_1)</option>
                    <option value="shelf_2">Холодильная витрина колбас и мяса (shelf_2)</option>
                    <option value="shelf_3">Полки хлебобулочных изделий (shelf_3)</option>
                    <option value="shelf_4">Стеллажи бакалеи (shelf_4)</option>
                    <option value="shelf_5">Стеллаж кондитерской продукции (shelf_5)</option>
                  </select>
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
  
  {!newProduct.isUnlimited ? (
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
  ) : (
    <div>
      <label className="block text-[10px] font-extrabold text-gray-600 dark:text-slate-400 uppercase mb-1">Срок годности</label>
      <div className="w-full bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-slate-400 flex items-center">
        <span>♾️ Бессрочный</span>
      </div>
    </div>
  )}
</div>

{/* ✅ ЧЕКБОКС "БЕССРОЧНЫЙ ТОВАР" */}
{/* ✅ ЧЕКБОКС "БЕССРОЧНЫЙ ТОВАР" — только для нескоропортящихся категорий */}
{/* Скоропортящиеся категории: dairy, bakery, meat_sausage, confectionery */}
{!['dairy', 'bakery', 'meat_sausage', 'confectionery'].includes(newProduct.category) && (
  <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-slate-800/50 rounded-lg border border-gray-100 dark:border-slate-700">
    <input
      type="checkbox"
      id="unlimited-checkbox"
      checked={newProduct.isUnlimited}
      onChange={(e) => {
        const isChecked = e.target.checked;
        setNewProduct({ 
          ...newProduct, 
          isUnlimited: isChecked,
          expirationDate: isChecked ? '' : newProduct.expirationDate,
          manufactureDate: isChecked ? '' : newProduct.manufactureDate
        });
      }}
      className="w-4 h-4 text-green-600 focus:ring-green-500 border-gray-300 rounded cursor-pointer"
    />
    <label htmlFor="unlimited-checkbox" className="text-xs font-bold text-gray-700 dark:text-slate-300 cursor-pointer select-none">
      ♾️ Бессрочный товар (срок годности не ограничен)
    </label>
  </div>
)}

{/* ✅ Если категория скоропортящаяся, показываем предупреждение */}
{['dairy', 'bakery', 'meat_sausage', 'confectionery'].includes(newProduct.category) && (
  <div className="flex items-center space-x-3 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-900/30">
    <span className="text-amber-500 text-lg">⚠️</span>
    <span className="text-xs text-amber-700 dark:text-amber-300 font-medium">
      Для скоропортящихся товаров обязательно укажите срок годности
    </span>
  </div>
)}

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

      {/* MODAL: MARKDOWN */}
      {showMarkdownModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 no-print">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-2xl w-full max-w-sm p-6 animate-zoom-in transition-colors duration-200">
            <h3 className="text-sm font-black text-gray-900 dark:text-slate-100 uppercase pb-3 border-b border-gray-100 dark:border-slate-800">
              Уценка скоропортящегося товара
            </h3>
            
            {selectedProduct.status !== 'expiring_soon' && selectedProduct.status !== 'marked_down' && (
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-lg p-3 my-3">
                <p className="text-xs text-amber-800 dark:text-amber-300 font-bold">
                  ⚠️ Уценка возможна только для товаров с истекающим сроком годности (осталось ≤ 2 дней).
                </p>
                <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">
                  Текущий статус: <span className="font-bold">{selectedProduct.status}</span>
                </p>
              </div>
            )}
            
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
                disabled={selectedProduct.status !== 'expiring_soon' && selectedProduct.status !== 'marked_down'}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
                  selectedProduct.status === 'expiring_soon' || selectedProduct.status === 'marked_down'
                    ? 'bg-green-600 hover:bg-green-700 text-white cursor-pointer'
                    : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                }`}
              >
                Применить уценку
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: WRITE-OFF */}
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
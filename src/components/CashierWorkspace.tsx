import React, { useState, useEffect } from 'react';
import { 
  Search, Trash2, CreditCard, 
  Printer, Download, CheckCircle, AlertCircle
} from 'lucide-react';
import { 
  searchProductsForSale, 
  getAvailableBatches, 
  createReceipt, 
  createReceiptItems, 
  getTodayReceipts,
  getNextReceiptNumber,
  recordSaleInSupabase,
  getActiveProducts,
  searchReceiptsForReturn,
  createReturnReceipt
} from '../api/databaseAPI';
import { supabase } from '../lib/supabaseClient';
import { Product, Employee } from '../types';

interface CashierWorkspaceProps {
  currentUser: Employee;
  onDataChange: () => Promise<void>;
}

interface CartItem {
  product: Product;
  batchId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export default function CashierWorkspace({ currentUser, onDataChange }: CashierWorkspaceProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');
  const [paidAmount, setPaidAmount] = useState<number>(0);

  // ==========================================================
  // СОСТОЯНИЯ ДЛЯ ВОЗВРАТА
  // ==========================================================
  const [returnMode, setReturnMode] = useState(false);
  const [searchReceiptTerm, setSearchReceiptTerm] = useState('');
  const [foundReceipts, setFoundReceipts] = useState<any[]>([]);
  const [selectedReceiptForReturn, setSelectedReceiptForReturn] = useState<any>(null);
  const [selectedReturnItems, setSelectedReturnItems] = useState<Set<string>>(new Set());

  // ==========================================================
  // ЗАГРУЗКА ЧЕКОВ
  // ==========================================================
  const loadReceipts = async () => {
    try {
      const data = await getTodayReceipts(currentUser.id);
      setReceipts(data || []);
    } catch (error) {
      console.error('❌ Ошибка загрузки чеков:', error);
    }
  };

  useEffect(() => {
    loadReceipts();
  }, []);

  // ==========================================================
  // ПОИСК ТОВАРОВ
  // ==========================================================
  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }
    
    try {
      setLoading(true);
      const results = await searchProductsForSale(searchTerm);
      setSearchResults(results || []);
    } catch (error) {
      console.error('❌ Ошибка поиска:', error);
      setError('Ошибка поиска товаров');
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // КОРЗИНА
  // ==========================================================
  const addToCart = async (product: Product) => {
  try {
    console.log('🔄 Добавляем товар:', product.name);
    
    if (!product.id) {
      setError('Ошибка: у товара нет ID');
      setTimeout(() => setError(null), 3000);
      return;
    }

    let batches = [];
    try {
      batches = await getAvailableBatches(product.id);
    } catch (error) {
      console.error('❌ Ошибка получения партий:', error);
      const activeProducts = await getActiveProducts();
      const foundProduct = activeProducts.find(p => p.id === product.id);
      if (foundProduct && foundProduct.quantity > 0) {
        batches = [{
          id: `batch_${Date.now()}`,
          product_id: product.id,
          quantity: foundProduct.quantity,
          expiration_date: foundProduct.expirationDate || new Date().toISOString().split('T')[0]
        }];
      }
    }
    
    if (!batches || batches.length === 0) {
      setError('Нет доступных партий этого товара на полках');
      setTimeout(() => setError(null), 3000);
      return;
    }

    const batch = batches[0];
    
    // ✅ Проверяем, есть ли уценка для этой партии
    let unitPrice = product.price || 0;
    
    const { data: markdowns, error: markdownError } = await supabase
      .from('markdown_log')
      .select('new_price')
      .eq('batch_id', batch.id)
      .order('marked_at', { ascending: false })
      .limit(1);
    
    if (!markdownError && markdowns && markdowns.length > 0) {
      unitPrice = markdowns[0].new_price;
      console.log('🏷️ Найдена уценка, цена:', unitPrice);
    }

    const existingItem = cart.find(item => item.product.id === product.id && item.batchId === batch.id);
    
    if (existingItem) {
      if (existingItem.quantity >= (batch.quantity || 999)) {
        setError('Недостаточно товара на полке');
        setTimeout(() => setError(null), 3000);
        return;
      }
      setCart(cart.map(item => 
        item.product.id === product.id && item.batchId === batch.id
          ? { ...item, quantity: item.quantity + 1, totalPrice: (item.quantity + 1) * unitPrice }
          : item
      ));
    } else {
      setCart([...cart, {
        product,
        batchId: batch.id,
        quantity: 1,
        unitPrice: unitPrice,
        totalPrice: unitPrice
      }]);
    }
    
    setSuccessMessage('Товар добавлен в чек');
    setTimeout(() => setSuccessMessage(null), 2000);
  } catch (error) {
    console.error('❌ Ошибка добавления товара:', error);
    setError('Ошибка добавления товара');
    setTimeout(() => setError(null), 3000);
  }
};


  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const clearCart = () => {
    setCart([]);
  };

  const getTotal = () => {
    return cart.reduce((sum: number, item: CartItem) => sum + (item.totalPrice || 0), 0);
  };

  // ==========================================================
  // ОПЛАТА
  // ==========================================================
  const handlePayment = async () => {
  console.log('🟢 handlePayment вызвана!');
  console.log('📦 Корзина:', cart);
  
  if (cart.length === 0) {
    setError('Корзина пуста');
    setTimeout(() => setError(null), 3000);
    return;
  }

  const total = getTotal();
  console.log('💰 Итоговая сумма:', total);
  
  if (paymentMethod === 'cash' && paidAmount < total) {
    setError('Внесена недостаточная сумма');
    setTimeout(() => setError(null), 3000);
    return;
  }

  try {
    setLoading(true);
    console.log('🔄 Начинаем оформление чека...');
    
    const receiptNumber = await getNextReceiptNumber('store_1');
    console.log('📋 Номер чека:', receiptNumber);
    
    const receipt = await createReceipt({
      receipt_number: receiptNumber,
      cashier_id: currentUser.id,
      store_id: 'store_1',
      total_amount: total,
      payment_method: paymentMethod,
      paid_amount: paymentMethod === 'cash' ? paidAmount : total,
      change_amount: paymentMethod === 'cash' ? paidAmount - total : 0,
      is_return: false
    });

    if (!receipt) {
      throw new Error('Не удалось создать чек');
    }
    console.log('✅ Чек создан:', receipt.id);

    const items = [];
    let saleSuccess = true;
    
    for (const item of cart) {
      console.log(`🔄 Обрабатываем товар: ${item.product?.name}`);
      
      // Проверяем уценку
      const { data: markdowns } = await supabase
        .from('markdown_log')
        .select('new_price')
        .eq('batch_id', item.batchId)
        .order('marked_at', { ascending: false })
        .limit(1);
      
      const actualPrice = (markdowns && markdowns.length > 0) 
        ? markdowns[0].new_price 
        : item.unitPrice;
      
      console.log(`💰 Цена: ${actualPrice}, Кол-во: ${item.quantity}`);
      
      items.push({
        receipt_id: receipt.id,
        product_id: item.product.id,
        batch_id: item.batchId,
        quantity: item.quantity,
        unit_price: actualPrice,
        total_price: item.quantity * actualPrice
      });

      // ✅ Списываем товар
      console.log('🔄 Вызываем recordSaleInSupabase...');
      const success = await recordSaleInSupabase(
        item.product.id,
        item.quantity,
        actualPrice,
        item.batchId
      );
      
      if (success) {
        console.log('✅ Товар успешно списан');
      } else {
        console.error('❌ Ошибка списания товара');
        saleSuccess = false;
      }
    }

    if (!saleSuccess) {
      console.error('❌ Ошибка при списании товаров');
    }

    await createReceiptItems(items);
    console.log('✅ Позиции чека созданы');
    
    await loadReceipts();
    await onDataChange();
    
    clearCart();
    setPaidAmount(0);
    
    setSuccessMessage(`Чек №${receiptNumber} успешно оформлен!`);
    setTimeout(() => setSuccessMessage(null), 3000);
    
  } catch (error) {
    console.error('❌ Ошибка оформления чека:', error);
    setError('Ошибка оформления чека');
    setTimeout(() => setError(null), 3000);
  } finally {
    setLoading(false);
  }
};

  // ==========================================================
  // СКАЧИВАНИЕ ЧЕКОВ И ОТЧЁТОВ
  // ==========================================================
  const handleDownloadReceipt = (receipt: any) => {
  const items = receipt.receipt_items || [];
  const date = new Date(receipt.created_at).toLocaleString('ru-RU');
  
  const isReturn = receipt.is_return === true;
  const receiptType = isReturn ? 'ЧЕК ВОЗВРАТА' : 'КАССОВЫЙ ЧЕК';
  
  // Считаем общее количество товаров
  const totalItems = items.reduce((sum: number, item: any) => sum + item.quantity, 0);
  
  let text = `
==================================================
           ТС «Мария-Ра» - Филиал №142
           г. Барнаул, пр. Ленина, 54
           ИНН: 2221003491 / КПП: 222101001
==================================================
${receiptType} №: ${receipt.receipt_number}
Дата: ${date}
Кассир: ${currentUser.name}
${isReturn ? `Основание: возврат по чеку №${receipt.return_for_id || 'не указан'}` : ''}
--------------------------------------------------
№  Товар                     Кол-во    Цена
--------------------------------------------------`;

  items.forEach((item: any, index: number) => {
    const productName = item.products?.name || 'Товар';
    const line = `${(index + 1).toString().padEnd(3)} ${productName.padEnd(25)} ${item.quantity.toString().padStart(6)} x ${item.unit_price.toFixed(2)} = ${item.total_price.toFixed(2)} ₽`;
    text += `\n${line}`;
  });

  text += `
--------------------------------------------------
${isReturn ? 'ВОЗВРАТ' : 'ИТОГО'}:${' '.repeat(28)} ${receipt.total_amount.toFixed(2)} ₽
Количество товаров:${' '.repeat(20)} ${totalItems} шт.
Оплата:${' '.repeat(30)} ${receipt.payment_method === 'cash' ? 'Наличными' : 'Банковской картой'}
Внесено:${' '.repeat(28)} ${receipt.paid_amount.toFixed(2)} ₽
${isReturn ? '' : `Сдача:${' '.repeat(30)} ${receipt.change_amount.toFixed(2)} ₽`}
${isReturn ? '' : `Способ оплаты:${' '.repeat(23)} Полный расчёт`}
==================================================
${isReturn ? 
  '    Возврат принят. Средства возвращены покупателю.' : 
  '    Благодарим за покупку!\n    Ждём вас снова в ТС «Мария-Ра»'}
${isReturn ? '' : '\n    Товар надлежащего качества обмену и возврату\n    не подлежит согласно Закону РФ "О защите прав\n    потребителей"'}
==================================================
  `;

  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${isReturn ? 'возврат' : 'чек'}_${receipt.receipt_number}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};


  const handleDownloadShiftReport = () => {
    if (!receipts || receipts.length === 0) {
      setError('Нет чеков за сегодня');
      setTimeout(() => setError(null), 3000);
      return;
    }

    const date = new Date().toLocaleDateString('ru-RU');
    const totalRevenue = receipts.reduce((sum: number, r: any) => sum + (r.total_amount || 0), 0);
    const totalItems = receipts.reduce((sum: number, r: any) => {
      const items = r.receipt_items || [];
      return sum + items.reduce((itemSum: number, item: any) => itemSum + (item.quantity || 0), 0);
    }, 0);
    
    let text = `
==================================================
    ТС «Мария-Ра» - Филиал №142
    г. Барнаул, пр. Ленина, 54
==================================================
    ОТЧЁТ ЗА СМЕНУ
    Дата: ${date}
    Кассир: ${currentUser.name}
==================================================
    ИТОГИ:
    Всего чеков: ${receipts.length}
    Всего товаров (шт.): ${totalItems}
    Общая выручка: ${totalRevenue.toFixed(2)} ₽
==================================================
    ЧЕКИ ЗА СМЕНУ:
`;

    receipts.forEach((receipt: any, index: number) => {
      const items = receipt.receipt_items || [];
      const totalQtyInReceipt = items.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
      
      text += `
${index + 1}. Чек №${receipt.receipt_number}
   Время: ${new Date(receipt.created_at).toLocaleTimeString('ru-RU')}
   Товаров (шт.): ${totalQtyInReceipt}
   Сумма: ${receipt.total_amount?.toFixed(2) || '0.00'} ₽
   Оплата: ${receipt.payment_method === 'cash' ? 'Наличные' : 'Карта'}
`;
    });

    text += `
==================================================
    КОНЕЦ ОТЧЁТА
    Спасибо за работу!
==================================================
    `;

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `отчёт_за_смену_${date}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ==========================================================
  // ПОИСК ЧЕКОВ ДЛЯ ВОЗВРАТА
  // ==========================================================
  const handleSearchReceipts = async () => {
  if (!searchReceiptTerm.trim()) {
    setFoundReceipts([]);
    return;
  }
  
  try {
    setLoading(true);
    const results = await searchReceiptsForReturn(searchReceiptTerm);
    
    // ✅ Получаем список ID чеков, которые уже были возвращены
    const { data: returns } = await supabase
      .from('receipts')
      .select('return_for_id')
      .eq('is_return', true);
    
    const returnedIds = new Set(returns?.map((r: any) => r.return_for_id) || []);
    
    // ✅ Фильтруем: показываем только чеки, которые ещё не возвращали
    const filteredResults = results.filter(receipt => !returnedIds.has(receipt.id));
    
    setFoundReceipts(filteredResults);
    
    if (filteredResults.length === 0 && results.length > 0) {
      setError('Все найденные чеки уже были возвращены');
      setTimeout(() => setError(null), 3000);
    }
  } catch (error) {
    console.error('❌ Ошибка поиска чеков:', error);
    setError('Ошибка поиска чеков');
    setTimeout(() => setError(null), 3000);
  } finally {
    setLoading(false);
  }
};


  // ==========================================================
  // ОФОРМЛЕНИЕ ВОЗВРАТА
  // ==========================================================
  const handleReturn = async () => {
  if (!selectedReceiptForReturn) {
    setError('Выберите чек для возврата');
    setTimeout(() => setError(null), 3000);
    return;
  }
  
  // ✅ Проверяем, не был ли уже возвращён этот чек
  const { data: existingReturns } = await supabase
    .from('receipts')
    .select('id')
    .eq('return_for_id', selectedReceiptForReturn.id)
    .eq('is_return', true);
  
  if (existingReturns && existingReturns.length > 0) {
    setError('Этот чек уже был возвращён!');
    setTimeout(() => setError(null), 3000);
    setSelectedReceiptForReturn(null);
    setSelectedReturnItems(new Set());
    return;
  }
  
  const items = selectedReceiptForReturn.receipt_items || [];
  const selectedItems = items.filter((item: any) => selectedReturnItems.has(item.id));
  
  if (selectedItems.length === 0) {
    setError('Выберите хотя бы один товар для возврата');
    setTimeout(() => setError(null), 3000);
    return;
  }

    try {
      setLoading(true);
      
      const returnItems = selectedItems.map((item: any) => ({
        receipt_item_id: item.id,
        product_id: item.product_id,
        batch_id: item.batch_id,
        quantity: item.quantity,
        unit_price: item.unit_price
      }));
      
      const receipt = await createReturnReceipt(
        selectedReceiptForReturn.id,
        returnItems,
        currentUser.id,
        'cash'
      );
      
      await loadReceipts();
      await onDataChange();
      
      setSuccessMessage(`Возврат оформлен! Чек №${receipt.receipt_number}`);
      setTimeout(() => setSuccessMessage(null), 3000);
      
      setReturnMode(false);
      setSelectedReceiptForReturn(null);
      setSelectedReturnItems(new Set());
      setFoundReceipts([]);
      setSearchReceiptTerm('');
      
    } catch (error) {
      console.error('❌ Ошибка оформления возврата:', error);
      setError('Ошибка оформления возврата');
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // JSX
  // ==========================================================
  return (
    <div className="space-y-6">
      <h3 className="text-base font-black text-gray-900 dark:text-slate-100 uppercase tracking-tight">
        🧾 Кассовый терминал
      </h3>
      
      {error && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-xl p-3 text-sm text-red-700 dark:text-red-400 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      
      {successMessage && (
        <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/30 rounded-xl p-3 text-sm text-green-700 dark:text-green-400 flex items-center space-x-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Левая колонка: Поиск и корзина */}
        <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl p-5">
          <h4 className="text-sm font-black text-gray-700 dark:text-slate-300 mb-4">
            Добавление товара в чек
          </h4>
          
          <div className="flex gap-3 mb-4">
            <input
              type="text"
              placeholder="Поиск по названию или штрихкоду..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-green-500"
            />
            <button
              onClick={handleSearch}
              disabled={loading}
              className="px-5 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Search className="w-5 h-5" />
              )}
            </button>
          </div>
          
          {searchResults.length > 0 && (
            <div className="space-y-1 max-h-48 overflow-y-auto mb-4">
              {searchResults.map((product) => (
                <div
                  key={product.id}
                  className="flex justify-between items-center p-3 bg-gray-50 dark:bg-slate-800 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-bold text-gray-900 dark:text-slate-100 block truncate">
                      {product.name || 'Без названия'}
                    </span>
                    <span className="text-xs text-gray-400">
                      {product.base_price || product.price || 0} ₽ | {product.barcode || 'Нет штрихкода'}
                    </span>
                  </div>
                  <button
                    onClick={() => addToCart(product)}
                    disabled={loading}
                    className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-bold transition-colors ml-3 shrink-0 disabled:opacity-50"
                  >
                    + Добавить
                  </button>
                </div>
              ))}
            </div>
          )}
          
          <div className="border-t border-gray-100 dark:border-slate-800 pt-4">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-black text-gray-700 dark:text-slate-300">
                Текущий чек
              </span>
              <span className="text-xs text-gray-400">
                {cart.length} позиций
              </span>
            </div>
            
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {cart.length === 0 ? (
                <div className="text-center py-6 text-gray-400 text-sm">
                  Корзина пуста. Добавьте товары через поиск.
                </div>
              ) : (
                cart.map((item, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center text-sm py-2 border-b border-gray-50 dark:border-slate-800"
                  >
                    <span className="text-gray-700 dark:text-slate-300 text-sm flex-1">
                      {item.product?.name || 'Товар'} × {item.quantity}
                    </span>
                    <div className="flex items-center space-x-3 shrink-0">
                      <span className="font-bold">{item.totalPrice?.toFixed(2) || '0.00'} ₽</span>
                      <button
                        onClick={() => removeFromCart(index)}
                        className="text-red-500 hover:text-red-700 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-200 dark:border-slate-700">
              <span className="text-base font-black text-gray-900 dark:text-slate-100">ИТОГО:</span>
              <span className="text-base font-black text-green-600 dark:text-green-400">
                {getTotal().toFixed(2)} ₽
              </span>
            </div>
          </div>
          
          <div className="flex gap-3 mt-4 flex-wrap">
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as 'cash' | 'card')}
              className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-4 py-3 text-sm font-bold text-gray-700 dark:text-slate-300 focus:outline-none focus:border-green-500"
            >
              <option value="cash">Наличные</option>
              <option value="card">Карта</option>
            </select>
            
            {paymentMethod === 'cash' && (
              <input
                type="number"
                placeholder="Внесено ₽"
                value={paidAmount || ''}
                onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                className="flex-1 min-w-[120px] bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-green-500"
                step="0.01"
              />
            )}
            
            <button
              onClick={handlePayment}
              disabled={loading || cart.length === 0}
              className="flex-1 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 dark:disabled:bg-slate-700 text-white rounded-lg text-sm font-bold transition-colors disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <CreditCard className="w-5 h-5" />
                  <span>Оплатить</span>
                </>
              )}
            </button>
          </div>
          
          <button
            onClick={clearCart}
            disabled={cart.length === 0}
            className="w-full mt-3 py-2 bg-red-100 hover:bg-red-200 disabled:bg-gray-100 dark:bg-red-950/20 dark:hover:bg-red-950/40 dark:disabled:bg-slate-800 text-red-700 dark:text-red-400 disabled:text-gray-400 dark:disabled:text-slate-600 rounded-lg text-sm font-bold transition-colors disabled:cursor-not-allowed"
          >
            Очистить чек
          </button>
        </div>
        
        {/* Правая колонка: История чеков */}
        <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl p-5">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-sm font-black text-gray-700 dark:text-slate-300">
              📋 История чеков
            </h4>
            <span className="text-xs text-gray-400">
              Сегодня: {receipts?.length || 0} чеков
            </span>
          </div>
          
          {/* ✅ КНОПКА ВОЗВРАТА */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => {
                setReturnMode(!returnMode);
                if (!returnMode) {
                  setSelectedReceiptForReturn(null);
                  setSelectedReturnItems(new Set());
                  setFoundReceipts([]);
                }
              }}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                returnMode 
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-gray-200 dark:bg-slate-800 hover:bg-gray-300 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300'
              }`}
            >
              {returnMode ? '❌ Отмена возврата' : '🔄 Возврат товара'}
            </button>
          </div>
          
          {/* ✅ БЛОК ВОЗВРАТА */}
          {returnMode && (
            <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-4 mb-4 border border-gray-200 dark:border-slate-700">
              <h4 className="text-sm font-black text-gray-700 dark:text-slate-300 mb-3">
                🔄 Поиск чека для возврата
              </h4>
              
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  placeholder="Введите номер чека..."
                  value={searchReceiptTerm}
                  onChange={(e) => setSearchReceiptTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchReceipts()}
                  className="flex-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-green-500"
                />
                <button
                  onClick={handleSearchReceipts}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
                >
                  {loading ? '...' : 'Найти'}
                </button>
              </div>
              
              {foundReceipts.length > 0 && (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {foundReceipts.map((receipt) => (
                    <div
                      key={receipt.id}
                      onClick={() => {
                        setSelectedReceiptForReturn(receipt);
                        setSelectedReturnItems(new Set(
                          (receipt.receipt_items || []).map((item: any) => item.id)
                        ));
                      }}
                      className={`bg-white dark:bg-slate-900 border-2 rounded-lg p-3 cursor-pointer transition-colors ${
                        selectedReceiptForReturn?.id === receipt.id
                          ? 'border-green-500 bg-green-50 dark:bg-green-950/10'
                          : 'border-gray-200 dark:border-slate-700 hover:border-green-300'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-sm font-bold text-gray-900 dark:text-slate-100">
                            Чек №{receipt.receipt_number}
                          </span>
                          <span className="text-xs text-gray-400 block">
                            {new Date(receipt.created_at).toLocaleString('ru-RU')}
                          </span>
                        </div>
                        <span className="text-sm font-bold text-green-600 dark:text-green-400">
                          {receipt.total_amount?.toFixed(2) || '0.00'} ₽
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {selectedReceiptForReturn && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
                  <h5 className="text-xs font-bold text-gray-700 dark:text-slate-300 mb-2">
                    Выберите товары для возврата:
                  </h5>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {(selectedReceiptForReturn.receipt_items || []).map((item: any) => (
                      <div
                        key={item.id}
                        className="flex items-center space-x-3 p-2 bg-white dark:bg-slate-900 rounded-lg border border-gray-100 dark:border-slate-800"
                      >
                        <input
                          type="checkbox"
                          checked={selectedReturnItems.has(item.id)}
                          onChange={() => {
                            const newSet = new Set(selectedReturnItems);
                            if (newSet.has(item.id)) {
                              newSet.delete(item.id);
                            } else {
                              newSet.add(item.id);
                            }
                            setSelectedReturnItems(newSet);
                          }}
                          className="w-4 h-4 text-green-600 rounded cursor-pointer"
                        />
                        <span className="text-sm flex-1 text-gray-700 dark:text-slate-300">
                          {item.products?.name || 'Товар'} × {item.quantity}
                        </span>
                        <span className="text-sm font-bold text-gray-900 dark:text-slate-100">
                          {item.total_price?.toFixed(2) || '0.00'} ₽
                        </span>
                      </div>
                    ))}
                  </div>
                  
                  <button
                    onClick={handleReturn}
                    disabled={loading || selectedReturnItems.size === 0}
                    className="w-full mt-3 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-bold transition-colors disabled:cursor-not-allowed"
                  >
                    {loading ? 'Обработка...' : `Оформить возврат (${selectedReturnItems.size} товаров)`}
                  </button>
                </div>
              )}
            </div>
          )}
          
          {/* Список чеков */}
          <div className="space-y-3 max-h-[350px] overflow-y-auto">
            {!receipts || receipts.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm">
                Нет чеков за сегодня
              </div>
            ) : (
              receipts.map((receipt) => (
                <div
                  key={receipt.id}
                  className="bg-gray-50 dark:bg-slate-800 rounded-lg p-4 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-sm font-bold text-gray-900 dark:text-slate-100 block">
                        Чек №{receipt.receipt_number}
                        {receipt.is_return && (
                          <span className="ml-2 text-xs text-red-500 font-bold">(Возврат)</span>
                        )}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(receipt.created_at).toLocaleString('ru-RU')}
                      </span>
                      <div className="mt-1 space-y-0.5">
                        {(receipt.receipt_items || []).map((item: any, idx: number) => (
                          <div key={idx} className="text-xs text-gray-600 dark:text-gray-400 flex justify-between">
                            <span className="truncate max-w-[180px]">
                              {item.products?.name || 'Товар'} × {item.quantity}
                            </span>
                            <span className="font-medium">{item.total_price?.toFixed(2) || '0.00'} ₽</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <span className="text-base font-bold text-green-600 dark:text-green-400">
                        {receipt.total_amount?.toFixed(2) || '0.00'} ₽
                      </span>
                      <div className="flex gap-1 mt-1">
                        <button
                          onClick={() => handleDownloadReceipt(receipt)}
                          className="px-3 py-1.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded text-xs font-bold hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors flex items-center space-x-1"
                          title="Скачать чек"
                        >
                          <Download className="w-4 h-4" />
                          <span>Скачать</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-800">
            <button
              onClick={handleDownloadShiftReport}
              className="w-full py-3 bg-gray-200 dark:bg-slate-800 hover:bg-gray-300 dark:hover:bg-slate-700 rounded-lg text-sm font-bold transition-colors flex items-center justify-center space-x-2"
            >
              <Printer className="w-5 h-5" />
              <span>Скачать отчёт за смену</span>
            </button>
          </div>
        </div>
        
      </div>
    </div>
  );
}
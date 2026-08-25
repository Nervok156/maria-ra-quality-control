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
  getActiveProducts
} from '../api/databaseAPI';
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
      const unitPrice = product.base_price || product.price || 0;

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
    if (cart.length === 0) {
      setError('Корзина пуста');
      setTimeout(() => setError(null), 3000);
      return;
    }

    const total = getTotal();
    if (paymentMethod === 'cash' && paidAmount < total) {
      setError('Внесена недостаточная сумма');
      setTimeout(() => setError(null), 3000);
      return;
    }

    try {
      setLoading(true);
      
      const receiptNumber = await getNextReceiptNumber('store_1');
      
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

      const items = [];
      for (const item of cart) {
        items.push({
          receipt_id: receipt.id,
          product_id: item.product.id,
          batch_id: item.batchId,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total_price: item.totalPrice
        });

        try {
          await recordSaleInSupabase(
            item.product.id,
            item.quantity,
            item.unitPrice,
            item.batchId
          );
        } catch (saleError) {
          console.error('❌ Ошибка списания товара:', saleError);
        }
      }

      await createReceiptItems(items);
      
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
    
    let text = `
==================================================
    ТС «Мария-Ра» - Филиал №142
    г. Барнаул, пр. Ленина, 54
==================================================
ЧЕК №: ${receipt.receipt_number}
Дата: ${date}
Кассир: ${currentUser.name}
--------------------------------------------------
Товар                           Кол-во   Цена
--------------------------------------------------`;

    items.forEach((item: any) => {
      const productName = item.products?.name || 'Товар';
      text += `\n${productName.padEnd(35)} ${item.quantity} x ${item.unit_price} = ${item.total_price} ₽`;
    });

    text += `
--------------------------------------------------
ИТОГО:                                    ${receipt.total_amount.toFixed(2)} ₽
Оплата: ${receipt.payment_method === 'cash' ? 'Наличные' : 'Карта'}
Внесено: ${receipt.paid_amount.toFixed(2)} ₽
Сдача: ${receipt.change_amount.toFixed(2)} ₽
==================================================
    Спасибо за покупку!
    Товар возврату не подлежит
==================================================
    `;

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `чек_${receipt.receipt_number}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ==========================================================
  // СКАЧИВАНИЕ ОТЧЁТА ЗА СМЕНУ
  // ==========================================================
  const handleDownloadShiftReport = () => {
    if (!receipts || receipts.length === 0) {
      setError('Нет чеков за сегодня');
      setTimeout(() => setError(null), 3000);
      return;
    }

    const date = new Date().toLocaleDateString('ru-RU');
    
    // Рассчитываем общую выручку
    const totalRevenue = receipts.reduce((sum: number, r: any) => sum + (r.total_amount || 0), 0);
    
    // Рассчитываем общее количество товаров (штук)
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
                    </div>
                    <div className="text-right">
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
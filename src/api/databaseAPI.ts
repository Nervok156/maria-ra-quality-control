import { supabase } from '../lib/supabaseClient';
import { Product, ProductCategory } from '../types';

// ==========================================================
// 1. РАБОТА С КАТЕГОРИЯМИ
// ==========================================================
export async function getCategories() {
  const { data, error } = await supabase.from('categories').select('*');
  if (error) throw error;
  return data || [];
}

// ==========================================================
// 2. РАБОТА С РОЛЯМИ
// ==========================================================
export async function getRoles() {
  const { data, error } = await supabase.from('roles').select('*');
  if (error) throw error;
  return data || [];
}

// ==========================================================
// 3. РАБОТА С МАГАЗИНАМИ
// ==========================================================
export async function getStores() {
  const { data, error } = await supabase.from('stores').select('*');
  if (error) throw error;
  return data || [];
}

// ==========================================================
// 4. РАБОТА С ПОСТАВЩИКАМИ
// ==========================================================
export async function getSuppliers() {
  const { data, error } = await supabase.from('suppliers').select('*');
  if (error) throw error;
  return data || [];
}

// ==========================================================
// 5. РАБОТА С СОТРУДНИКАМИ
// ==========================================================
export async function getEmployees() {
  const { data, error } = await supabase
    .from('employees')
    .select('*, roles(*), stores(*)');
  if (error) throw error;
  return data || [];
}

export async function getEmployeeById(id: string) {
  const { data, error } = await supabase
    .from('employees')
    .select('*, roles(*), stores(*)')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function createEmployee(employee: any) {
  const { data, error } = await supabase
    .from('employees')
    .insert([employee])
    .select();
  if (error) throw error;
  return data?.[0];
}

export async function updateEmployee(id: string, updates: any) {
  const { data, error } = await supabase
    .from('employees')
    .update(updates)
    .eq('id', id)
    .select();
  if (error) throw error;
  return data?.[0];
}

// ==========================================================
// 6. РАБОТА С ТОВАРАМИ
// ==========================================================
export async function getProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*, categories(*)');
  if (error) throw error;
  return data || [];
}

export async function getProductById(id: string) {
  const { data, error } = await supabase
    .from('products')
    .select('*, categories(*)')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function createProduct(product: any) {
  const { data, error } = await supabase
    .from('products')
    .insert([{
      id: product.id || `p${Date.now()}`,
      barcode: product.barcode,
      name: product.name,
      category_id: product.category_id,
      base_price: product.base_price,
      shelf_life_days: product.shelf_life_days || 7
    }])
    .select();
  
  if (error) {
    console.error('❌ Ошибка создания товара:', error);
    throw error;
  }
  return data?.[0];
}

export async function updateProduct(id: string, updates: any) {
  const { data, error } = await supabase
    .from('products')
    .update(updates)
    .eq('id', id)
    .select();
  if (error) throw error;
  return data?.[0];
}

// ==========================================================
// 7. РАБОТА С МЕСТАМИ ВЫКЛАДКИ
// ==========================================================
export async function getShelfLocations() {
  const { data, error } = await supabase.from('shelf_locations').select('*');
  if (error) throw error;
  return data || [];
}

// ==========================================================
// 8. РАБОТА С ПАРТИЯМИ ТОВАРОВ
// ==========================================================
export async function getBatches() {
  const { data, error } = await supabase
    .from('batches')
    .select('*, products(*), shelf_locations(*)');
  if (error) throw error;
  return data || [];
}

export async function getBatchesByProduct(productId: string) {
  const { data, error } = await supabase
    .from('batches')
    .select('*, products(*), shelf_locations(*)')
    .eq('product_id', productId);
  if (error) throw error;
  return data || [];
}

export async function createBatch(batch: any) {
  const { data, error } = await supabase
    .from('batches')
    .insert([{
      id: batch.id || `batch_${Date.now()}`,
      product_id: batch.product_id,
      store_id: batch.store_id || 'store_1',
      quantity: batch.quantity,
      manufacture_date: batch.manufacture_date,
      expiration_date: batch.expiration_date,
      location_id: batch.location_id || 'shelf_1',
      added_at: new Date().toISOString(),
      is_written_off: false
    }])
    .select();
  
  if (error) {
    console.error('❌ Ошибка создания партии:', error);
    throw error;
  }
  return data?.[0];
}

export async function updateBatch(id: string, updates: any) {
  const { data, error } = await supabase
    .from('batches')
    .update(updates)
    .eq('id', id)
    .select();
  if (error) throw error;
  return data?.[0];
}

// ==========================================================
// 9. РАБОТА С ПОСТАВКАМИ
// ==========================================================
export async function getDeliveries() {
  const { data, error } = await supabase
    .from('deliveries')
    .select('*, suppliers(*), stores(*), employees!receiver_id(*)');
  if (error) throw error;
  return data || [];
}

export async function createDelivery(delivery: any) {
  const { data, error } = await supabase
    .from('deliveries')
    .insert([delivery])
    .select();
  if (error) throw error;
  return data?.[0];
}

// ==========================================================
// 10. РАБОТА С АКТАМИ СПИСАНИЯ (ТОРГ-16)
// ==========================================================
export async function getWriteoffActs() {
  const { data, error } = await supabase
    .from('writeoff_acts')
    .select('*, stores(*)');
  if (error) throw error;
  return data || [];
}

export async function createWriteoffAct(act: any) {
  const { data, error } = await supabase
    .from('writeoff_acts')
    .insert([{
      id: act.id || `act_${Date.now()}`,
      act_number: act.act_number,
      store_id: act.store_id || 'store_1',
      creator_id: act.creator_id,
      approved_by_id: act.approved_by_id || null,
      is_exported_to_1c: act.is_exported_to_1c || false,
      created_at: new Date().toISOString()
    }])
    .select();
  
  if (error) {
    console.error('❌ Ошибка создания акта списания:', error);
    throw error;
  }
  return data?.[0];
}

export async function approveWriteoffAct(id: string, approverId: string) {
  const { data, error } = await supabase
    .from('writeoff_acts')
    .update({ approved_by_id: approverId })
    .eq('id', id)
    .select();
  if (error) throw error;
  return data?.[0];
}

export async function exportTo1C(id: string) {
  const { data, error } = await supabase
    .from('writeoff_acts')
    .update({ is_exported_to_1c: true })
    .eq('id', id)
    .select();
  if (error) throw error;
  return data?.[0];
}

// ==========================================================
// 11. РАБОТА СО СТРОКАМИ АКТОВ СПИСАНИЯ
// ==========================================================
export async function getWriteoffItems() {
  const { data, error } = await supabase
    .from('writeoff_items')
    .select('*, writeoff_acts(*), products(*)');
  if (error) throw error;
  return data || [];
}

export async function createWriteoffItems(items: any[]) {
  const formattedItems = items.map(item => ({
    id: item.id || `item_${Date.now()}`,
    act_id: item.act_id,
    product_id: item.product_id,
    quantity: item.quantity,
    reason: item.reason,
    unit_price: item.unit_price
  }));

  const { data, error } = await supabase
    .from('writeoff_items')
    .insert(formattedItems)
    .select();
  
  if (error) {
    console.error('❌ Ошибка создания строк списания:', error);
    throw error;
  }
  return data || [];
}

// ==========================================================
// 12. РАБОТА С ЖУРНАЛОМ УЦЕНОК
// ==========================================================
export async function getMarkdownLog() {
  const { data, error } = await supabase
    .from('markdown_log')
    .select('*, batches(*), employees(*)');
  if (error) throw error;
  return data || [];
}

export async function createMarkdown(markdown: any) {
  const { data, error } = await supabase
    .from('markdown_log')
    .insert([{
      id: markdown.id || `md_${Date.now()}`,
      batch_id: markdown.batch_id,
      employee_id: markdown.employee_id,
      discount_percent: markdown.discount_percent,
      old_price: markdown.old_price,
      new_price: markdown.new_price,
      marked_at: new Date().toISOString()
    }])
    .select();
  
  if (error) {
    console.error('❌ Ошибка создания уценки:', error);
    throw error;
  }
  return data?.[0];
}

// ==========================================================
// 13. РАБОТА С ЖУРНАЛОМ АУДИТОВ
// ==========================================================
export async function getAuditLogs() {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*, employees(*), categories(*)');
  if (error) throw error;
  return data || [];
}

export async function createAuditLog(audit: any) {
  const { data, error } = await supabase
    .from('audit_logs')
    .insert([audit])
    .select();
  if (error) throw error;
  return data?.[0];
}

// ==========================================================
// 14. РАБОТА С ИСТОРИЕЙ ЦЕН
// ==========================================================
export async function getPriceHistory() {
  const { data, error } = await supabase
    .from('price_history')
    .select('*, products(*)');
  if (error) throw error;
  return data || [];
}

export async function createPriceHistory(entry: any) {
  const { data, error } = await supabase
    .from('price_history')
    .insert([entry])
    .select();
  if (error) throw error;
  return data?.[0];
}

// ==========================================================
// 15. РАБОТА С РАСПИСАНИЕМ СОТРУДНИКОВ (СТАРАЯ ВЕРСИЯ)
// ==========================================================
export async function getEmployeeSchedules() {
  const { data, error } = await supabase
    .from('employee_schedules')
    .select('*, employees(*)');
  if (error) throw error;
  return data || [];
}

export async function createEmployeeSchedule(schedule: any) {
  const { data, error } = await supabase
    .from('employee_schedules')
    .insert([schedule])
    .select();
  if (error) throw error;
  return data?.[0];
}

// ==========================================================
// 16. РАБОТА С ЖУРНАЛОМ ПРОДАЖ
// ==========================================================
export async function getSalesLog() {
  const { data, error } = await supabase
    .from('sales_log')
    .select('*, products(*)');
  if (error) throw error;
  return data || [];
}

export async function createSale(sale: any) {
  const { data, error } = await supabase
    .from('sales_log')
    .insert([{
      id: sale.id || `sale_${Date.now()}`,
      product_id: sale.product_id,
      quantity: sale.quantity,
      unit_price: sale.unit_price,
      total_sum: sale.total_sum || (sale.quantity * sale.unit_price),
      sold_at: new Date().toISOString()
    }])
    .select();
  
  if (error) {
    console.error('❌ Ошибка создания продажи:', error);
    throw error;
  }
  return data?.[0];
}

// ==========================================================
// 17. РАБОТА С СИСТЕМНОЙ ТЕЛЕМЕТРИЕЙ
// ==========================================================
export async function getTelemetry() {
  const { data, error } = await supabase
    .from('system_telemetry')
    .select('*, employees(*)');
  if (error) throw error;
  return data || [];
}

export async function addTelemetry(telemetry: any) {
  const { data, error } = await supabase
    .from('system_telemetry')
    .insert([{
      id: telemetry.id || `tel_${Date.now()}`,
      employee_id: telemetry.employee_id,
      action_type: telemetry.action_type,
      payload: typeof telemetry.payload === 'string' ? telemetry.payload : JSON.stringify(telemetry.payload),
      ip_address: telemetry.ip_address || '192.168.12.44',
      occurred_at: new Date().toISOString()
    }])
    .select();
  
  if (error) {
    console.error('❌ Ошибка добавления телеметрии:', error);
    throw error;
  }
  return data?.[0];
}

// ==========================================================
// 18. ПОЛУЧЕНИЕ ВСЕХ ДАННЫХ (ДЛЯ СОВМЕСТИМОСТИ)
// ==========================================================
export async function getFullState() {
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
    salesLog,
    categories
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
    getSalesLog(),
    getCategories()
  ]);

  return {
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
    categories: categories || []
  };
}

// ==========================================================
// 19. ПОЛУЧЕНИЕ АКТИВНЫХ ТОВАРОВ
// ==========================================================
export async function getActiveProducts() {
  try {
    const { data: batches, error: batchesError } = await supabase
      .from('batches')
      .select('*')
      .eq('is_written_off', false);
    
    if (batchesError) throw batchesError;

    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*');
    
    if (productsError) throw productsError;

    const { data: markdowns, error: markdownsError } = await supabase
      .from('markdown_log')
      .select('*');
    
    if (markdownsError) throw markdownsError;

    const activeProducts: Product[] = batches.map((batch: any) => {
      const product = products.find((p: any) => p.id === batch.product_id);
      const markdown = markdowns.find((m: any) => m.batch_id === batch.id);
      
      const today = new Date();
      const expiry = new Date(batch.expiration_date);
      const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      let status: 'fresh' | 'expired' | 'expiring_soon' | 'marked_down' | 'written_off' = 'fresh';
      if (diffDays <= 0) status = 'expired';
      else if (diffDays <= 2) status = 'expiring_soon';
      if (markdown) status = 'marked_down';
      if (batch.is_written_off) status = 'written_off';
      
      return {
        id: batch.id,
        barcode: product?.barcode || '0000000000000',
        name: product?.name || 'Неизвестный товар',
        category: (product?.category_id || 'other') as ProductCategory,
        price: product?.base_price || 0,
        quantity: batch.quantity || 0,
        expirationDate: batch.expiration_date || '',
        manufactureDate: batch.manufacture_date || '',
        status: status,
        markdownPrice: markdown?.new_price,
        markdownPercent: markdown?.discount_percent,
        location: batch.location_id || '',
        addedAt: batch.added_at || ''
      };
    });

    return activeProducts;
  } catch (error) {
    console.error('❌ Ошибка получения активных товаров:', error);
    throw error;
  }
}

// ==========================================================
// 20. ЗАПИСЬ ПРОДАЖИ В SUPABASE
// ==========================================================
export async function recordSaleInSupabase(productId: string, quantity: number, unitPrice: number, batchId: string) {
  try {
    console.log('🔄 Записываем продажу в Supabase...');
    console.log(`📦 Товар: ${productId}, Кол-во: ${quantity}, Цена: ${unitPrice}, Партия: ${batchId}`);

    const { data: batch, error: batchError } = await supabase
      .from('batches')
      .select('quantity, product_id')
      .eq('id', batchId)
      .maybeSingle();
    
    if (batchError) {
      console.error('❌ Ошибка поиска партии:', batchError);
      return false;
    }

    if (!batch) {
      console.error('❌ Партия не найдена:', batchId);
      return false;
    }

    if (batch.quantity < quantity) {
      console.error(`❌ Недостаточно товара на полке: есть ${batch.quantity}, нужно ${quantity}`);
      return false;
    }

    const newQuantity = batch.quantity - quantity;
    const { error: updateError } = await supabase
      .from('batches')
      .update({ quantity: newQuantity })
      .eq('id', batchId);
    
    if (updateError) {
      console.error('❌ Ошибка обновления партии:', updateError);
      return false;
    }

    if (newQuantity <= 0) {
      await supabase
        .from('batches')
        .update({ is_written_off: true })
        .eq('id', batchId);
      console.log('📦 Партия полностью распродана');
    }

    const totalSum = quantity * unitPrice;
    const { error: saleError } = await supabase
      .from('sales_log')
      .insert([{
        id: `sale_${Date.now()}`,
        product_id: productId,
        quantity: quantity,
        unit_price: unitPrice,
        total_sum: totalSum,
        sold_at: new Date().toISOString()
      }]);
    
    if (saleError) {
      console.error('❌ Ошибка записи продажи:', saleError);
      return false;
    }

    console.log(`✅ Продажа записана: ${quantity} шт. на сумму ${totalSum.toFixed(2)} ₽`);
    return true;
  } catch (error) {
    console.error('❌ Ошибка при записи продажи:', error);
    return false;
  }
}

// ==========================================================
// 21. РАБОТА С РАСПИСАНИЕМ СОТРУДНИКОВ (ПО ДАТАМ) - НОВАЯ ВЕРСИЯ
// ==========================================================

export async function getSchedulesByDate(date: Date) {
  const dateStr = date.toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('employee_schedules')
    .select('*, employees(*)')
    .eq('schedule_date', dateStr);
  
  if (error) {
    console.error('❌ Ошибка получения расписания:', error);
    throw error;
  }
  return data || [];
}

export async function getSchedulesForMonth(year: number, month: number) {
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0);
  
  const startStr = startDate.toISOString().split('T')[0];
  const endStr = endDate.toISOString().split('T')[0];
  
  const { data, error } = await supabase
    .from('employee_schedules')
    .select('*, employees(*)')
    .gte('schedule_date', startStr)
    .lte('schedule_date', endStr);
  
  if (error) {
    console.error('❌ Ошибка получения расписания на месяц:', error);
    throw error;
  }
  return data || [];
}

export async function updateScheduleForDate(
  employeeId: string, 
  date: Date, 
  shiftName: string, 
  status: string,
  dayType: string
) {
  const dateStr = date.toISOString().split('T')[0];
  
  // Проверяем, есть ли уже запись
  const { data: existing, error: findError } = await supabase
    .from('employee_schedules')
    .select('id')
    .eq('employee_id', employeeId)
    .eq('schedule_date', dateStr)
    .maybeSingle();
  
  if (findError) {
    console.error('❌ Ошибка поиска расписания:', findError);
    return null;
  }
  
  if (existing) {
    // Обновляем существующую запись
    const { data, error } = await supabase
      .from('employee_schedules')
      .update({
        shift_name: shiftName,
        status: status,
        day_type: dayType
      })
      .eq('id', existing.id)
      .select();
    
    if (error) {
      console.error('❌ Ошибка обновления расписания:', error);
      return null;
    }
    return data?.[0];
  } else {
    // ✅ СОЗДАЁМ НОВУЮ ЗАПИСЬ С ГЕНЕРАЦИЕЙ ID
    const { data, error } = await supabase
      .from('employee_schedules')
      .insert([{
        id: `sched_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`, // ✅ Генерируем ID
        employee_id: employeeId,
        schedule_date: dateStr,
        shift_name: shiftName,
        status: status,
        day_type: dayType
      }])
      .select();
    
    if (error) {
      console.error('❌ Ошибка создания расписания:', error);
      return null;
    }
    return data?.[0];
  }
}

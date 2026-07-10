// Инициализация и управление 17 реляционными базами данных (таблицами) ТС «Мария-Ра»
// Все таблицы хранятся в LocalStorage для симуляции реальной СУБД PostgreSQL/1С

export interface DBTableData {
  products: any[];
  batches: any[];
  categories: any[];
  employees: any[];
  roles: any[];
  stores: any[];
  writeoff_acts: any[];
  writeoff_items: any[];
  markdown_log: any[];
  deliveries: any[];
  suppliers: any[];
  shelf_locations: any[];
  audit_logs: any[];
  price_history: any[];
  system_telemetry: any[];
  employee_schedules: any[];
  sales_log: any[];
}

export const initialCategories = [
  { id: 'dairy', name: 'dairy', code: 'DAIRY', russianName: 'Молочная гастрономия', color_code: '#3b82f6' },
  { id: 'bakery', name: 'bakery', code: 'BAKERY', russianName: 'Хлебобулочные изделия', color_code: '#f59e0b' },
  { id: 'meat_sausage', name: 'meat_sausage', code: 'MEAT_SAUSAGE', russianName: 'Мясные изделия & Колбасы', color_code: '#ef4444' },
  { id: 'grocery', name: 'grocery', code: 'GROCERY', russianName: 'Бакалейные товары', color_code: '#f97316' },
  { id: 'beverages', name: 'beverages', code: 'BEVERAGES', russianName: 'Напитки & Соки', color_code: '#14b8a6' },
  { id: 'confectionery', name: 'confectionery', code: 'CONFECTIONERY', russianName: 'Кондитерские изделия', color_code: '#ec4899' },
  { id: 'other', name: 'other', code: 'OTHER', russianName: 'Прочие товары', color_code: '#64748b' }
];

export const initialRoles = [
  { id: 'role_dir', name: 'Директор магазина', can_write_off: true, can_markdown: true, can_edit_catalog: true },
  { id: 'role_acc', name: 'Старший бухгалтер', can_write_off: true, can_markdown: false, can_edit_catalog: false },
  { id: 'role_mer', name: 'Старший товаровед', can_write_off: true, can_markdown: true, can_edit_catalog: true },
  { id: 'role_tra', name: 'Товаровед-кассир', can_write_off: false, can_markdown: true, can_edit_catalog: false }
];

export const initialStores = [
  { id: 'store_1', store_number: '№142', city: 'Барнаул', address: 'пр. Ленина, 54', director_id: '2' },
  { id: 'store_2', store_number: '№108', city: 'Бийск', address: 'ул. Советская, 21', director_id: '5' }
];

export const initialSuppliers = [
  { id: 'sup_1', inn: '2221003491', name: 'ООО Алтайская Молочная Компания', phone: '+7 (3852) 50-11-22', reliability_rating: 'Высокий' },
  { id: 'sup_2', inn: '2225010043', name: 'ОАО Алтайхлеб', phone: '+7 (3852) 44-33-22', reliability_rating: 'Отличный' },
  { id: 'sup_3', inn: '2204098124', name: 'ООО Барнаульский Пищевик', phone: '+7 (3852) 65-00-11', reliability_rating: 'Средний' },
  { id: 'sup_4', inn: '5406123049', name: 'АО Сибирский Кондитер', phone: '+7 (383) 220-30-40', reliability_rating: 'Высокий' }
];

export const initialShelfLocations = [
  { id: 'shelf_1', zone_code: 'COLD-DAIRY-01', description: 'Холодильник молочной гастрономии', temp_regime: '+2..+6 °C' },
  { id: 'shelf_2', zone_code: 'COLD-MEAT-02', description: 'Холодильная витрина колбас и мяса', temp_regime: '+0..+4 °C' },
  { id: 'shelf_3', zone_code: 'DRY-BAKERY-01', description: 'Полки хлебобулочных изделий', temp_regime: 'комнатная' },
  { id: 'shelf_4', zone_code: 'DRY-GROCERY-01', description: 'Стеллажи бакалеи', temp_regime: 'комнатная' },
  { id: 'shelf_5', zone_code: 'DRY-SWEETS-02', description: 'Стеллаж кондитерской продукции', temp_regime: 'комнатная' }
];

export const getInitialSchedules = () => [
  { id: 'sched_1', employee_id: '1', shift_name: 'Дневная смена (08:00 - 15:30)', day_type: 'today', status: 'Работает' },
  { id: 'sched_2', employee_id: '2', shift_name: 'Дневная смена (08:00 - 15:30)', day_type: 'today', status: 'Работает' },
  { id: 'sched_3', employee_id: '3', shift_name: '—', day_type: 'today', status: 'Выходной' },
  { id: 'sched_4', employee_id: '4', shift_name: 'Дневная смена (08:00 - 15:30)', day_type: 'today', status: 'Работает' },
  { id: 'sched_5', employee_id: '5', shift_name: 'Вечерняя смена (15:30 - 23:00)', day_type: 'today', status: 'Работает' },

  { id: 'sched_6', employee_id: '1', shift_name: 'Вечерняя смена (15:30 - 23:00)', day_type: 'tomorrow', status: 'Работает' },
  { id: 'sched_7', employee_id: '2', shift_name: 'Дневная смена (08:00 - 15:30)', day_type: 'tomorrow', status: 'Работает' },
  { id: 'sched_8', employee_id: '3', shift_name: '—', day_type: 'tomorrow', status: 'Выходной' },
  { id: 'sched_9', employee_id: '4', shift_name: 'Вечерняя смена (15:30 - 23:00)', day_type: 'tomorrow', status: 'Работает' },
  { id: 'sched_10', employee_id: '5', shift_name: 'Дневная смена (08:00 - 15:30)', day_type: 'tomorrow', status: 'Работает' }
];

export const getInitialSales = () => [
  { id: 'sale_1', product_id: '1', quantity: 4, unit_price: 69.00, total_sum: 276.00, sold_at: '2026-07-01T12:30:00Z' },
  { id: 'sale_2', product_id: '3', quantity: 10, unit_price: 34.00, total_sum: 340.00, sold_at: '2026-07-01T14:15:00Z' },
  { id: 'sale_3', product_id: '7', quantity: 2, unit_price: 95.00, total_sum: 190.00, sold_at: '2026-07-01T15:45:00Z' },
  { id: 'sale_4', product_id: '8', quantity: 5, unit_price: 90.00, total_sum: 450.00, sold_at: '2026-07-01T17:10:00Z' }
];

export const getDBState = (): DBTableData => {
  const data = localStorage.getItem('maria_ra_db_state');
  if (data) {
    try {
      const parsed = JSON.parse(data);
      let updated = false;
      // Защитное добавление новых таблиц при обновлении
      if (!parsed.employee_schedules || parsed.employee_schedules.length === 0) {
        parsed.employee_schedules = getInitialSchedules();
        updated = true;
      }
      if (!parsed.sales_log || parsed.sales_log.length === 0) {
        parsed.sales_log = getInitialSales();
        updated = true;
      }
      if (!parsed.system_telemetry) {
        parsed.system_telemetry = [];
        updated = true;
      }
      // Убедимся, что 5 сотрудников есть в базе
      if (parsed.employees && parsed.employees.length < 5) {
        const hasSmirnov = parsed.employees.some((e: any) => e.id === '5');
        if (!hasSmirnov) {
          parsed.employees.push({ id: '5', name: 'Смирнов А.В.', role_id: 'role_tra', store_id: 'store_1', personnel_number: 'C-0842', is_active: true });
          updated = true;
        }
      }
      // Обновление ролей на профессиональное имя
      if (parsed.roles) {
        const traRole = parsed.roles.find((r: any) => r.id === 'role_tra');
        if (traRole && traRole.name !== 'Товаровед-кассир') {
          traRole.name = 'Товаровед-кассир';
          updated = true;
        }
      }
      if (updated) {
        localStorage.setItem('maria_ra_db_state', JSON.stringify(parsed));
      }
      return parsed;
    } catch (e) {
      console.error("Ошибка парсинга БД", e);
    }
  }

  // Засеивание начальных данных
  const state: DBTableData = {
    products: [
      { id: '1', barcode: '4607142210012', name: 'Молоко Мария-Ра 2.5%, 900 мл', category_id: 'dairy', base_price: 69.00, shelf_life_days: 7, created_at: '2026-06-01T10:00:00Z' },
      { id: '2', barcode: '4607142210050', name: 'Творог Модест детский 3.2%, 100 г', category_id: 'dairy', base_price: 42.00, shelf_life_days: 8, created_at: '2026-06-02T11:30:00Z' },
      { id: '3', barcode: '4607002340021', name: 'Батон Алтайский нарезанный, 350 г', category_id: 'bakery', base_price: 34.00, shelf_life_days: 3, created_at: '2026-06-03T09:15:00Z' },
      { id: '4', barcode: '4607002340038', name: 'Хлеб ржаной Мария-Ра, 400 г', category_id: 'bakery', base_price: 29.00, shelf_life_days: 3, created_at: '2026-06-03T09:20:00Z' },
      { id: '5', barcode: '4607123980112', name: 'Колбаса Докторская ГОСТ СПК, 400 г', category_id: 'meat_sausage', base_price: 340.00, shelf_life_days: 20, created_at: '2026-06-05T08:00:00Z' },
      { id: '6', barcode: '4607123980143', name: 'Сардельки Свиные Барнаульский МК, 500 г', category_id: 'meat_sausage', base_price: 290.00, shelf_life_days: 15, created_at: '2026-06-06T14:40:00Z' },
      { id: '7', barcode: '4607142210043', name: 'Сметана Плавыч 15%, 350 г', category_id: 'dairy', base_price: 95.00, shelf_life_days: 14, created_at: '2026-06-01T10:30:00Z' },
      { id: '8', barcode: '4600120150221', name: 'Шоколад Алёнка молочный, 90 г', category_id: 'confectionery', base_price: 90.00, shelf_life_days: 120, created_at: '2026-06-10T12:00:00Z' },
      { id: '9', barcode: '4601230490012', name: 'Рис Круглозерный Алтайская Сказка, 800 г', category_id: 'grocery', base_price: 89.00, shelf_life_days: 365, created_at: '2026-06-12T11:00:00Z' }
    ],
    batches: [
      { id: 'batch_1', product_id: '1', store_id: 'store_1', quantity: 12, manufacture_date: '2026-06-25', expiration_date: '2026-07-01', location_id: 'shelf_1', added_at: '2026-06-26T08:00:00' },
      { id: 'batch_2', product_id: '2', store_id: 'store_1', quantity: 8, manufacture_date: '2026-06-20', expiration_date: '2026-06-28', location_id: 'shelf_1', added_at: '2026-06-21T09:00:00' },
      { id: 'batch_3', product_id: '3', store_id: 'store_1', quantity: 15, manufacture_date: '2026-06-27', expiration_date: '2026-06-30', location_id: 'shelf_3', added_at: '2026-06-28T07:30:00' },
      { id: 'batch_4', product_id: '4', store_id: 'store_1', quantity: 5, manufacture_date: '2026-06-26', expiration_date: '2026-06-29', location_id: 'shelf_3', added_at: '2026-06-27T08:00:00' },
      { id: 'batch_5', product_id: '5', store_id: 'store_1', quantity: 6, manufacture_date: '2026-06-11', expiration_date: '2026-07-01', location_id: 'shelf_2', added_at: '2026-06-12T09:00:00' },
      { id: 'batch_6', product_id: '6', store_id: 'store_1', quantity: 10, manufacture_date: '2026-06-30', expiration_date: '2026-07-15', location_id: 'shelf_2', added_at: '2026-06-30T07:00:00' },
      { id: 'batch_7', product_id: '7', store_id: 'store_1', quantity: 14, manufacture_date: '2026-06-22', expiration_date: '2026-07-06', location_id: 'shelf_1', added_at: '2026-06-23T11:00:00' }
    ],
    categories: initialCategories,
    employees: [
      { id: '1', name: 'Копыл И.А.', role_id: 'role_tra', store_id: 'store_1', personnel_number: 'T-0421', is_active: true },
      { id: '2', name: 'Иванова А.С.', role_id: 'role_dir', store_id: 'store_1', personnel_number: 'D-0012', is_active: true },
      { id: '3', name: 'Федорова М.В.', role_id: 'role_acc', store_id: 'store_1', personnel_number: 'B-0089', is_active: true },
      { id: '4', name: 'Васильев П.С.', role_id: 'role_mer', store_id: 'store_1', personnel_number: 'M-0145', is_active: true },
      { id: '5', name: 'Смирнов А.В.', role_id: 'role_tra', store_id: 'store_1', personnel_number: 'C-0842', is_active: true }
    ],
    roles: initialRoles,
    stores: initialStores,
    writeoff_acts: [
      { id: 'act_1', act_number: 'АКТ-ТОРГ16-00341', store_id: 'store_1', created_at: '2026-06-29T18:30:00', creator_id: '1', approved_by_id: '2', is_exported_to_1c: true },
      { id: 'act_2', act_number: 'АКТ-ТОРГ16-00342', store_id: 'store_1', created_at: '2026-07-01T10:15:00', creator_id: '4', approved_by_id: '', is_exported_to_1c: false }
    ],
    writeoff_items: [
      { id: 'item_1', act_id: 'act_1', product_id: '2', quantity: 8, reason: 'Просрочка', unit_price: 42.00 },
      { id: 'item_2', act_id: 'act_1', product_id: '4', quantity: 5, reason: 'Просрочка', unit_price: 29.00 }
    ],
    markdown_log: [
      { id: 'md_1', batch_id: 'batch_1', employee_id: '1', discount_percent: 30, old_price: 69.00, new_price: 48.30, marked_at: '2026-06-30T14:20:00' }
    ],
    deliveries: [
      { id: 'del_1', supplier_id: 'sup_1', store_id: 'store_1', delivery_date: '2026-06-25', receiver_id: '4', total_sum: 48900.00 },
      { id: 'del_2', supplier_id: 'sup_2', store_id: 'store_1', delivery_date: '2026-06-28', receiver_id: '4', total_sum: 15200.00 }
    ],
    suppliers: initialSuppliers,
    shelf_locations: initialShelfLocations,
    audit_logs: [
      { id: 'audit_1', employee_id: '1', category_id: 'dairy', checked_at: '2026-06-30T09:15:00', expired_found: 2, expiring_found: 4 },
      { id: 'audit_2', employee_id: '4', category_id: 'bakery', checked_at: '2026-06-30T11:40:00', expired_found: 1, expiring_found: 2 }
    ],
    price_history: [
      { id: 'ph_1', product_id: '1', price_before: 65.00, price_after: 69.00, changed_at: '2026-06-20T00:00:00' },
      { id: 'ph_2', product_id: '3', price_before: 32.00, price_after: 34.00, changed_at: '2026-06-20T00:00:00' }
    ],
    system_telemetry: [
      { id: 'tel_1', employee_id: '1', action_type: 'LOGIN', payload: '{"device": "TSD Honeywell EDA51", "status": "success"}', ip_address: '192.168.12.44', occurred_at: '2026-07-01T08:00:00' },
      { id: 'tel_2', employee_id: '1', action_type: 'SCAN_BARCODE', payload: '{"barcode": "4607142210012", "result": "product_found"}', ip_address: '192.168.12.44', occurred_at: '2026-07-01T08:15:00' },
      { id: 'tel_3', employee_id: '1', action_type: 'CREATE_WRITEOFF_DRAFT', payload: '{"items_count": 2}', ip_address: '192.168.12.44', occurred_at: '2026-07-01T10:30:00' }
    ],
    employee_schedules: getInitialSchedules(),
    sales_log: getInitialSales()
  };

  saveDBState(state);
  return state;
};

export const saveDBState = (state: DBTableData) => {
  localStorage.setItem('maria_ra_db_state', JSON.stringify(state));
};


// Функция JOIN для получения списка товаров на полках со статусами и ценами уценки
export const getActiveProductsFromDB = (state: DBTableData): any[] => {
  return state.batches.map(b => {
    const p = state.products.find(prod => prod.id === b.product_id);
    const cat = state.categories.find(c => c.id === (p ? p.category_id : 'other'));
    const md = state.markdown_log.find(m => m.batch_id === b.id);
    
    const today = new Date('2026-06-30');
    const expiry = new Date(b.expiration_date);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    let status = 'fresh';
    if (diffDays <= 0) {
      status = 'expired';
    } else if (diffDays <= 2) {
      status = 'expiring_soon';
    }
    
    if (md) {
      status = 'marked_down';
    }

    if (b.is_written_off) {
      status = 'written_off';
    }
    
    return {
      id: b.id, // ID партии выступает как уникальный ID товара на полке
      barcode: p ? p.barcode : '0000000000000',
      name: p ? p.name : 'Товар удален из каталога',
      category: p ? p.category_id : 'other',
      price: p ? p.base_price : 0,
      quantity: b.quantity,
      expirationDate: b.expiration_date,
      manufactureDate: b.manufacture_date,
      status: status,
      markdownPrice: md ? md.new_price : undefined,
      markdownPercent: md ? md.discount_percent : undefined,
      writeOffReason: b.writeoff_reason,
      location: b.location_id,
      addedAt: b.added_at ? b.added_at.slice(0, 10) : '2026-06-30'
    };
  });
};

// Мутация: Добавление нового товара в номенклатуру (products)
export const addProductToDB = (barcode: string, name: string, category_id: string, base_price: number, shelf_life_days: number) => {
  const state = getDBState();
  const id = `p_${Date.now()}`;
  const newProduct = {
    id,
    barcode,
    name,
    category_id,
    base_price,
    shelf_life_days,
    created_at: new Date().toISOString()
  };
  state.products.unshift(newProduct);
  saveDBState(state);
  return id;
};

// Мутация: Создание новой партии (batches)
export const addBatchToDB = (product_id: string, quantity: number, manufacture_date: string, expiration_date: string, location_id: string) => {
  const state = getDBState();
  const id = `batch_${Date.now()}`;
  const newBatch = {
    id,
    product_id,
    store_id: 'store_1',
    quantity,
    manufacture_date,
    expiration_date,
    location_id,
    added_at: new Date().toISOString()
  };
  state.batches.unshift(newBatch);
  saveDBState(state);
  return id;
};

// Мутация: Оформление уценки товара (markdown_log)
export const markdownBatchInDB = (batch_id: string, employee_id: string, discount_percent: number) => {
  const state = getDBState();
  const batch = state.batches.find(b => b.id === batch_id);
  if (!batch) return;
  const product = state.products.find(p => p.id === batch.product_id);
  if (!product) return;
  
  const old_price = product.base_price;
  const new_price = parseFloat((old_price * (1 - discount_percent / 100)).toFixed(2));
  
  const newMarkdown = {
    id: `md_${Date.now()}`,
    batch_id,
    employee_id,
    discount_percent,
    old_price,
    new_price,
    marked_at: new Date().toISOString()
  };
  
  state.markdown_log.unshift(newMarkdown);
  saveDBState(state);
  addTelemetry(employee_id, 'MARKDOWN_PRODUCT', { batch_id, discount_percent, old_price, new_price });
};

// Мутация: Создание акта списания ТОРГ-16 и его элементов (writeoff_acts, writeoff_items)
export const createWriteoffActInDB = (employee_id: string, items: { product_id: string, quantity: number, reason: string, unit_price: number }[]) => {
  const state = getDBState();
  const act_id = `act_${Date.now()}`;
  const count = state.writeoff_acts.length + 341;
  const act_number = `АКТ-ТОРГ16-00${count}`;
  
  const newAct = {
    id: act_id,
    act_number,
    store_id: 'store_1',
    created_at: new Date().toISOString(),
    creator_id: employee_id,
    approved_by_id: '',
    is_exported_to_1c: false
  };
  
  state.writeoff_acts.unshift(newAct);
  
  items.forEach(item => {
    const item_id = `item_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    state.writeoff_items.push({
      id: item_id,
      act_id,
      product_id: item.product_id,
      quantity: item.quantity,
      reason: item.reason,
      unit_price: item.unit_price
    });
  });
  
  saveDBState(state);
  addTelemetry(employee_id, 'CREATE_WRITEOFF_ACT', { act_id, items_count: items.length });
  return act_id;
};

// Мутация: Подписание акта директором (approved_by_id)
export const approveActInDB = (act_id: string, director_id: string) => {
  const state = getDBState();
  const act = state.writeoff_acts.find(a => a.id === act_id);
  if (act) {
    act.approved_by_id = director_id;
    saveDBState(state);
    addTelemetry(director_id, 'APPROVE_WRITEOFF_ACT', { act_id });
  }
};

// Мутация: Выгрузка в 1С бухгалтером (is_exported_to_1c)
export const syncActTo1CInDB = (act_id: string, accountant_id: string) => {
  const state = getDBState();
  const act = state.writeoff_acts.find(a => a.id === act_id);
  if (act) {
    act.is_exported_to_1c = true;
    saveDBState(state);
    addTelemetry(accountant_id, 'EXPORT_TO_1C', { act_id });
  }
};

// Функция добавления логов телеметрии
export const addTelemetry = (employeeId: string, actionType: string, payload: any) => {
  const state = getDBState();
  const newLog = {
    id: `tel_${Date.now()}`,
    employee_id: employeeId,
    action_type: actionType,
    payload: typeof payload === 'string' ? payload : JSON.stringify(payload),
    ip_address: '192.168.12.44',
    occurred_at: new Date().toISOString()
  };
  state.system_telemetry.unshift(newLog);
  // Ограничим логи телеметрии 100 записями
  if (state.system_telemetry.length > 100) {
    state.system_telemetry.pop();
  }
  saveDBState(state);
};

// Мутация: Изменение расписания сотрудника
export const updateEmployeeScheduleInDB = (director_id: string, employee_id: string, day_type: 'today' | 'tomorrow', shift_name: string, status: string) => {
  const state = getDBState();
  const schedule = state.employee_schedules.find(s => s.employee_id === employee_id && s.day_type === day_type);
  if (schedule) {
    schedule.shift_name = shift_name;
    schedule.status = status;
  } else {
    state.employee_schedules.push({
      id: `sched_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      employee_id,
      shift_name,
      day_type,
      status
    });
  }
  saveDBState(state);
  
  const empName = state.employees.find(e => e.id === employee_id)?.name || employee_id;
  addTelemetry(director_id, 'UPDATE_SCHEDULE', { employee_id, employee_name: empName, day_type, shift_name, status });
};

// Мутация: Регистрация розничной продажи (Заработок магазина)
export const recordSaleInDB = (productId: string, quantity: number, unitPrice: number, batchId: string) => {
  const state = getDBState();
  
  // Находим партию
  const batch = state.batches.find(b => b.id === batchId);
  if (!batch) return false;
  
  if (batch.quantity < quantity) {
    return false; // Недостаточно остатка на полке
  }
  
  // Списываем количество
  batch.quantity -= quantity;
  if (batch.quantity <= 0) {
    state.batches = state.batches.filter(b => b.id !== batchId);
  }
  
  // Добавляем запись в кассовую книгу
  const saleId = `sale_${Date.now()}_${Math.random().toString(36).substr(2,4)}`;
  const totalSum = parseFloat((quantity * unitPrice).toFixed(2));
  
  state.sales_log.unshift({
    id: saleId,
    product_id: productId,
    quantity,
    unit_price: unitPrice,
    total_sum: totalSum,
    sold_at: new Date().toISOString()
  });
  
  saveDBState(state);
  
  const prod = state.products.find(p => p.id === productId);
  addTelemetry('system', 'RETAIL_SALE', {
    product_name: prod ? prod.name : productId,
    quantity,
    total_sum: totalSum
  });
  
  return true;
};



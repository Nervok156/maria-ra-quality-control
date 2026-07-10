import React, { useState, useEffect } from 'react';
import { 
  Database, Table, Key, Link2, Copy, Check, Info, 
  Search, Trash2, Plus, RotateCcw, AlertTriangle, Play
} from 'lucide-react';
import { getDBState, saveDBState, addTelemetry, DBTableData, initialCategories, initialRoles, initialStores, initialSuppliers, initialShelfLocations } from '../data/databaseState';

interface Column {
  name: string;
  type: string;
  isPrimary?: boolean;
  isForeign?: boolean;
  refTable?: string;
  nullable?: boolean;
  description: string;
}

interface DBTable {
  name: keyof DBTableData;
  russianName: string;
  description: string;
  columns: Column[];
}

const dbTables: DBTable[] = [
  {
    name: 'products',
    russianName: 'Товары (Номенклатура)',
    description: 'Основной справочник товарных артикулов розничной сети «Мария-Ра»',
    columns: [
      { name: 'id', type: 'VARCHAR(36)', isPrimary: true, description: 'Уникальный UUID товара' },
      { name: 'barcode', type: 'VARCHAR(13)', nullable: false, description: 'Штрихкод EAN-13' },
      { name: 'name', type: 'VARCHAR(255)', nullable: false, description: 'Наименование товара' },
      { name: 'category_id', type: 'VARCHAR(36)', isForeign: true, refTable: 'categories', description: 'Ссылка на категорию/отдел' },
      { name: 'base_price', type: 'DECIMAL(10,2)', nullable: false, description: 'Базовая цена реализации, руб.' },
      { name: 'shelf_life_days', type: 'INTEGER', nullable: false, description: 'Установленный срок годности в днях' },
      { name: 'created_at', type: 'TIMESTAMP', nullable: false, description: 'Дата внесения в номенклатуру' }
    ]
  },
  {
    name: 'batches',
    russianName: 'Партии товаров на полках',
    description: 'Конкретные партии товаров в торговом зале с привязкой к срокам годности',
    columns: [
      { name: 'id', type: 'VARCHAR(36)', isPrimary: true, description: 'Идентификатор партии' },
      { name: 'product_id', type: 'VARCHAR(36)', isForeign: true, refTable: 'products', description: 'Ссылка на карточку товара' },
      { name: 'store_id', type: 'VARCHAR(36)', isForeign: true, refTable: 'stores', description: 'Ссылка на филиал' },
      { name: 'quantity', type: 'INTEGER', nullable: false, description: 'Текущий фактический остаток на полке' },
      { name: 'manufacture_date', type: 'DATE', nullable: true, description: 'Дата производства партии' },
      { name: 'expiration_date', type: 'DATE', nullable: false, description: 'Дата окончания срока годности' },
      { name: 'location_id', type: 'VARCHAR(36)', isForeign: true, refTable: 'shelf_locations', description: 'Размещение партии на стеллаже' },
      { name: 'added_at', type: 'TIMESTAMP', nullable: false, description: 'Время выкладки товара на полку' }
    ]
  },
  {
    name: 'categories',
    russianName: 'Категории и отделы',
    description: 'Справочник торговых отделов (молочный, хлебный, мясной и др.)',
    columns: [
      { name: 'id', type: 'VARCHAR(36)', isPrimary: true, description: 'Идентификатор отдела' },
      { name: 'code', type: 'VARCHAR(50)', nullable: false, description: 'Внутренний код отдела (например, DAIRY, BAKERY)' },
      { name: 'name', type: 'VARCHAR(100)', nullable: false, description: 'Название отдела' },
      { name: 'color_code', type: 'VARCHAR(20)', description: 'Цветовое обозначение отдела' }
    ]
  },
  {
    name: 'employees',
    russianName: 'Персонал магазина',
    description: 'Список зарегистрированных работников филиала ООО «Розница К-1»',
    columns: [
      { name: 'id', type: 'VARCHAR(36)', isPrimary: true, description: 'Идентификатор сотрудника' },
      { name: 'name', type: 'VARCHAR(150)', nullable: false, description: 'ФИО сотрудника' },
      { name: 'role_id', type: 'VARCHAR(36)', isForeign: true, refTable: 'roles', description: 'Ссылка на роль в системе' },
      { name: 'store_id', type: 'VARCHAR(36)', isForeign: true, refTable: 'stores', description: 'Привязка к филиалу' },
      { name: 'personnel_number', type: 'VARCHAR(20)', nullable: false, description: 'Табельный номер сотрудника' },
      { name: 'is_active', type: 'BOOLEAN', nullable: false, description: 'Статус активности учетной записи' }
    ]
  },
  {
    name: 'roles',
    russianName: 'Роли и полномочия',
    description: 'Реестр ролей доступа к функциям торговой платформы',
    columns: [
      { name: 'id', type: 'VARCHAR(36)', isPrimary: true, description: 'Идентификатор роли' },
      { name: 'name', type: 'VARCHAR(50)', nullable: false, description: 'Название роли (Директор, Бухгалтер, Товаровед)' },
      { name: 'can_write_off', type: 'BOOLEAN', nullable: false, description: 'Разрешено оформлять списания ТОРГ-16' },
      { name: 'can_markdown', type: 'BOOLEAN', nullable: false, description: 'Разрешено проводить уценку товаров' },
      { name: 'can_edit_catalog', type: 'BOOLEAN', nullable: false, description: 'Разрешено изменять номенклатуру товаров' }
    ]
  },
  {
    name: 'stores',
    russianName: 'Реестр филиалов сети',
    description: 'Список магазинов сети «Мария-Ра» Алтайского региона и Сибири',
    columns: [
      { name: 'id', type: 'VARCHAR(36)', isPrimary: true, description: 'Идентификатор магазина' },
      { name: 'store_number', type: 'VARCHAR(10)', nullable: false, description: 'Номер филиала (например, №142)' },
      { name: 'city', type: 'VARCHAR(100)', nullable: false, description: 'Город местонахождения' },
      { name: 'address', type: 'VARCHAR(255)', nullable: false, description: 'Адрес магазина' },
      { name: 'director_id', type: 'VARCHAR(36)', description: 'Директор филиала' }
    ]
  },
  {
    name: 'writeoff_acts',
    russianName: 'Реестр актов ТОРГ-16',
    description: 'Документы официального списания и утилизации товаров',
    columns: [
      { name: 'id', type: 'VARCHAR(36)', isPrimary: true, description: 'Идентификатор акта' },
      { name: 'act_number', type: 'VARCHAR(50)', nullable: false, description: 'Регистрационный номер документа' },
      { name: 'store_id', type: 'VARCHAR(36)', isForeign: true, refTable: 'stores', description: 'Филиал составления' },
      { name: 'created_at', type: 'TIMESTAMP', nullable: false, description: 'Дата и время составления' },
      { name: 'creator_id', type: 'VARCHAR(36)', isForeign: true, refTable: 'employees', description: 'Составитель акта' },
      { name: 'approved_by_id', type: 'VARCHAR(36)', isForeign: true, refTable: 'employees', description: 'Директор, утвердивший акт' },
      { name: 'is_exported_to_1c', type: 'BOOLEAN', nullable: false, description: 'Проведено в бухгалтерии 1С:Предприятие' }
    ]
  },
  {
    name: 'writeoff_items',
    russianName: 'Строки актов списания',
    description: 'Детализация списанных партий внутри каждого акта ТОРГ-16',
    columns: [
      { name: 'id', type: 'VARCHAR(36)', isPrimary: true, description: 'Уникальный ID строки' },
      { name: 'act_id', type: 'VARCHAR(36)', isForeign: true, refTable: 'writeoff_acts', description: 'Родительский акт списания' },
      { name: 'product_id', type: 'VARCHAR(36)', isForeign: true, refTable: 'products', description: 'Списываемый товар' },
      { name: 'quantity', type: 'INTEGER', nullable: false, description: 'Списываемое количество, шт.' },
      { name: 'reason', type: 'VARCHAR(255)', nullable: false, description: 'Причина утилизации (Брак/Просрочка)' },
      { name: 'unit_price', type: 'DECIMAL(10,2)', nullable: false, description: 'Себестоимость списания за ед., руб.' }
    ]
  },
  {
    name: 'markdown_log',
    russianName: 'Журнал уценок по качеству',
    description: 'История проведения превентивных уценок товаров на полках',
    columns: [
      { name: 'id', type: 'VARCHAR(36)', isPrimary: true, description: 'Идентификатор уценки' },
      { name: 'batch_id', type: 'VARCHAR(36)', isForeign: true, refTable: 'batches', description: 'Уцененная партия' },
      { name: 'employee_id', type: 'VARCHAR(36)', isForeign: true, refTable: 'employees', description: 'Сотрудник, сделавший скидку' },
      { name: 'discount_percent', type: 'INTEGER', nullable: false, description: 'Процент уценки (-30% / -50%)' },
      { name: 'old_price', type: 'DECIMAL(10,2)', nullable: false, description: 'Первоначальная цена, руб.' },
      { name: 'new_price', type: 'DECIMAL(10,2)', nullable: false, description: 'Акционная цена со скидкой, руб.' },
      { name: 'marked_at', type: 'TIMESTAMP', nullable: false, description: 'Дата и время уценки' }
    ]
  },
  {
    name: 'deliveries',
    russianName: 'Поставки (Приходные накладные)',
    description: 'Журнал регистрации прихода товаров на склад магазина от контрагентов',
    columns: [
      { name: 'id', type: 'VARCHAR(36)', isPrimary: true, description: 'Номер накладной' },
      { name: 'supplier_id', type: 'VARCHAR(36)', isForeign: true, refTable: 'suppliers', description: 'Поставщик продукции' },
      { name: 'store_id', type: 'VARCHAR(36)', isForeign: true, refTable: 'stores', description: 'Магазин-получатель' },
      { name: 'delivery_date', type: 'DATE', nullable: false, description: 'Дата фактической приемки' },
      { name: 'receiver_id', type: 'VARCHAR(36)', isForeign: true, refTable: 'employees', description: 'Принявший товаровед' },
      { name: 'total_sum', type: 'DECIMAL(12,2)', nullable: false, description: 'Итоговая сумма накладной, руб.' }
    ]
  },
  {
    name: 'suppliers',
    russianName: 'Справочник поставщиков',
    description: 'База данных производителей и дистрибьюторов торговой сети',
    columns: [
      { name: 'id', type: 'VARCHAR(36)', isPrimary: true, description: 'Код контрагента' },
      { name: 'inn', type: 'VARCHAR(12)', nullable: false, description: 'ИНН организации' },
      { name: 'name', type: 'VARCHAR(255)', nullable: false, description: 'Наименование юридического лица' },
      { name: 'phone', type: 'VARCHAR(20)', description: 'Телефон отдела логистики' },
      { name: 'reliability_rating', type: 'VARCHAR(20)', description: 'Рейтинг благонадежности' }
    ]
  },
  {
    name: 'shelf_locations',
    russianName: 'Адреса выкладки (Стеллажи)',
    description: 'Карта зон торгового зала и складских холодильников',
    columns: [
      { name: 'id', type: 'VARCHAR(36)', isPrimary: true, description: 'Код зоны' },
      { name: 'zone_code', type: 'VARCHAR(50)', nullable: false, description: 'Код адреса выкладки (например, COLD-R1)' },
      { name: 'description', type: 'VARCHAR(150)', nullable: false, description: 'Описание места хранения' },
      { name: 'temp_regime', type: 'VARCHAR(50)', description: 'Температурный режим хранения' }
    ]
  },
  {
    name: 'audit_logs',
    russianName: 'Журнал ревизий свежести',
    description: 'Регистрационный табель плановых проверок сроков годности',
    columns: [
      { name: 'id', type: 'VARCHAR(36)', isPrimary: true, description: 'Идентификатор проверки' },
      { name: 'employee_id', type: 'VARCHAR(36)', isForeign: true, refTable: 'employees', description: 'Проводящий ревизию' },
      { name: 'category_id', type: 'VARCHAR(36)', isForeign: true, refTable: 'categories', description: 'Проверяемый отдел' },
      { name: 'checked_at', type: 'TIMESTAMP', nullable: false, description: 'Время окончания аудита' },
      { name: 'expired_found', type: 'INTEGER', nullable: false, description: 'Найдено просроченных товаров' },
      { name: 'expiring_found', type: 'INTEGER', nullable: false, description: 'Найдено уценяемых товаров' }
    ]
  },
  {
    name: 'price_history',
    russianName: 'История изменения цен',
    description: 'Журнал плановых переоценок номенклатуры',
    columns: [
      { name: 'id', type: 'VARCHAR(36)', isPrimary: true, description: 'Идентификатор изменения' },
      { name: 'product_id', type: 'VARCHAR(36)', isForeign: true, refTable: 'products', description: 'Ссылка на товар' },
      { name: 'price_before', type: 'DECIMAL(10,2)', nullable: false, description: 'Старая розничная цена' },
      { name: 'price_after', type: 'DECIMAL(10,2)', nullable: false, description: 'Новая розничная цена' },
      { name: 'changed_at', type: 'TIMESTAMP', nullable: false, description: 'Дата активации ценника' }
    ]
  },
  {
    name: 'system_telemetry',
    russianName: 'Системные логи ТСД',
    description: 'Аудит действий персонала в системе ТСД для контроля честности',
    columns: [
      { name: 'id', type: 'VARCHAR(36)', isPrimary: true, description: 'Идентификатор события' },
      { name: 'employee_id', type: 'VARCHAR(36)', isForeign: true, refTable: 'employees', description: 'Пользователь ТСД' },
      { name: 'action_type', type: 'VARCHAR(100)', nullable: false, description: 'Тип действия' },
      { name: 'payload', type: 'TEXT', description: 'Детали действия (JSON)' },
      { name: 'ip_address', type: 'VARCHAR(45)', description: 'IP сетевого терминала' },
      { name: 'occurred_at', type: 'TIMESTAMP', nullable: false, description: 'Точное время действия' }
    ]
  },
  {
    name: 'employee_schedules',
    russianName: 'Расписание смен персонала',
    description: 'Планировщик рабочих смен сотрудников по дням и режимам работы',
    columns: [
      { name: 'id', type: 'VARCHAR(36)', isPrimary: true, description: 'Идентификатор записи' },
      { name: 'employee_id', type: 'VARCHAR(36)', isForeign: true, refTable: 'employees', description: 'Сотрудник' },
      { name: 'shift_name', type: 'VARCHAR(100)', nullable: false, description: 'Название рабочей смены (часы работы)' },
      { name: 'day_type', type: 'VARCHAR(20)', nullable: false, description: 'Тип дня (today/tomorrow)' },
      { name: 'status', type: 'VARCHAR(50)', nullable: false, description: 'Статус (Работает/Выходной)' }
    ]
  },
  {
    name: 'sales_log',
    russianName: 'Журнал розничных продаж (Выручка)',
    description: 'Фискальная книга розничной реализации товаров через кассовый терминал магазина',
    columns: [
      { name: 'id', type: 'VARCHAR(36)', isPrimary: true, description: 'Номер чека/транзакции' },
      { name: 'product_id', type: 'VARCHAR(36)', isForeign: true, refTable: 'products', description: 'Проданный товар' },
      { name: 'quantity', type: 'INTEGER', nullable: false, description: 'Количество купленного товара, шт.' },
      { name: 'unit_price', type: 'DECIMAL(10,2)', nullable: false, description: 'Фактическая цена продажи, руб.' },
      { name: 'total_sum', type: 'DECIMAL(10,2)', nullable: false, description: 'Итоговая стоимость покупки, руб.' },
      { name: 'sold_at', type: 'TIMESTAMP', nullable: false, description: 'Дата и время фискального чека' }
    ]
  }
];

export default function DatabaseSchema() {
  const [activeTab, setActiveTab] = useState<'data' | 'ddl'>('data');
  const [selectedTable, setSelectedTable] = useState<DBTable>(dbTables[0]);
  const [tableSearch, setTableSearch] = useState('');
  const [rowSearch, setRowSearch] = useState('');
  
  // Состояние СУБД в памяти (загружается из LocalStorage)
  const [dbState, setDbState] = useState<DBTableData>(getDBState());
  const [copied, setCopied] = useState(false);
  
  // Состояния модального окна добавления записи
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRowData, setNewRowData] = useState<Record<string, any>>({});
  
  // Принудительное обновление состояния из LocalStorage
  const refreshDbState = () => {
    setDbState(getDBState());
  };

  useEffect(() => {
    refreshDbState();
    // Слушаем глобальное событие обновления БД в рамках вкладки
    const handleStorageChange = () => {
      refreshDbState();
    };
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [selectedTable]);

  const filteredTables = dbTables.filter(t => 
    t.name.toLowerCase().includes(tableSearch.toLowerCase()) ||
    t.russianName.toLowerCase().includes(tableSearch.toLowerCase()) ||
    t.description.toLowerCase().includes(tableSearch.toLowerCase())
  );

  // Сброс базы данных к исходным настройкам
  const handleResetDb = () => {
    if (window.confirm("Вы действительно хотите сбросить все 15 баз данных к заводским корпоративным настройкам? Все ваши добавленные записи будут очищены!")) {
      localStorage.removeItem('maria_ra_db_state');
      const freshState = getDBState();
      setDbState(freshState);
      addTelemetry('2', 'RESET_SYSTEM_DATABASE', { status: 'success' });
      alert("Все 15 реляционных баз данных успешно перезагружены и заполнены тестовыми строками ТС «Мария-Ра».");
    }
  };

  // Удаление записи из выбранной таблицы
  const handleDeleteRow = (rowId: string) => {
    const tableKey = selectedTable.name;
    const currentRows = dbState[tableKey] || [];
    const updatedRows = currentRows.filter(row => row.id !== rowId);
    
    const newState = {
      ...dbState,
      [tableKey]: updatedRows
    };
    
    setDbState(newState);
    saveDBState(newState);
    addTelemetry('2', 'DELETE_RECORD_DATABASE', { table: tableKey, record_id: rowId });
    
    // Также триггерим обновление на уровне приложения
    window.dispatchEvent(new Event('maria_ra_db_updated'));
  };

  // Открыть модалку для новой записи
  const handleOpenAddModal = () => {
    // Инициализируем поля пустыми значениями
    const initialData: Record<string, any> = {};
    selectedTable.columns.forEach(col => {
      if (col.isPrimary) {
        // Автогенерация ID
        const prefix = selectedTable.name === 'products' ? 'p_' : selectedTable.name === 'batches' ? 'batch_' : 'id_';
        initialData[col.name] = `${prefix}${Date.now()}`;
      } else {
        if (col.type.includes('BOOLEAN')) {
          initialData[col.name] = false;
        } else if (col.type.includes('INTEGER') || col.type.includes('DECIMAL')) {
          initialData[col.name] = 0;
        } else if (col.type.includes('TIMESTAMP') || col.type.includes('DATE')) {
          initialData[col.name] = new Date().toISOString().split('T')[0];
        } else {
          initialData[col.name] = '';
        }
      }
    });
    setNewRowData(initialData);
    setShowAddModal(true);
  };

  // Сохранить новую запись
  const handleSaveNewRow = (e: React.FormEvent) => {
    e.preventDefault();
    const tableKey = selectedTable.name;
    const currentRows = dbState[tableKey] || [];
    
    // Валидация на заполненность NOT NULL полей
    for (const col of selectedTable.columns) {
      if (col.nullable === false && (newRowData[col.name] === undefined || newRowData[col.name] === '')) {
        alert(`Поле «${col.description}» не может быть пустым!`);
        return;
      }
    }

    // Приведение типов
    const formattedData: Record<string, any> = { ...newRowData };
    selectedTable.columns.forEach(col => {
      if (col.type.includes('INTEGER')) {
        formattedData[col.name] = parseInt(formattedData[col.name]) || 0;
      } else if (col.type.includes('DECIMAL')) {
        formattedData[col.name] = parseFloat(formattedData[col.name]) || 0;
      } else if (col.type.includes('BOOLEAN')) {
        formattedData[col.name] = formattedData[col.name] === true || formattedData[col.name] === 'true';
      }
    });

    const newState = {
      ...dbState,
      [tableKey]: [formattedData, ...currentRows]
    };

    setDbState(newState);
    saveDBState(newState);
    addTelemetry('2', 'INSERT_RECORD_DATABASE', { table: tableKey, record_id: formattedData.id });
    setShowAddModal(false);
    
    // Триггерим глобальное обновление, чтобы другие компоненты узнали об изменениях
    window.dispatchEvent(new Event('maria_ra_db_updated'));
  };

  // Получить реальные записи выбранной таблицы
  const activeRows = dbState[selectedTable.name] || [];

  // Фильтрация записей
  const filteredRows = activeRows.filter(row => {
    if (!rowSearch) return true;
    return Object.values(row).some(val => 
      String(val).toLowerCase().includes(rowSearch.toLowerCase())
    );
  });

  // Вспомогательная функция для красивого отображения FK связей
  const renderForeignKeyCell = (colName: string, val: any) => {
    if (!val) return <span className="text-gray-400">—</span>;
    
    // Если ссылка на товары
    if (colName === 'product_id') {
      const p = dbState.products.find(item => item.id === val);
      return (
        <span className="inline-flex items-center bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 px-1.5 py-0.5 rounded text-[11px] font-bold border border-blue-200/50">
          {p ? p.name : val}
        </span>
      );
    }
    // Если ссылка на категории
    if (colName === 'category_id') {
      const c = dbState.categories.find(item => item.id === val);
      return (
        <span className="inline-flex items-center bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 px-1.5 py-0.5 rounded text-[11px] font-bold border border-amber-200/50">
          {c ? c.russianName : val}
        </span>
      );
    }
    // Если ссылка на сотрудников
    if (colName === 'employee_id' || colName === 'creator_id' || colName === 'approved_by_id' || colName === 'receiver_id') {
      const emp = dbState.employees.find(e => e.id === val);
      return (
        <span className="inline-flex items-center bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 px-1.5 py-0.5 rounded text-[11px] font-bold border border-emerald-200/50">
          {emp ? emp.name : `Сотрудник ID: ${val}`}
        </span>
      );
    }
    // Если ссылка на роли
    if (colName === 'role_id') {
      const role = dbState.roles.find(r => r.id === val);
      return (
        <span className="inline-flex items-center bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 px-1.5 py-0.5 rounded text-[11px] font-bold border border-purple-200/50">
          {role ? role.name : val}
        </span>
      );
    }
    // Ссылка на поставщика
    if (colName === 'supplier_id') {
      const sup = dbState.suppliers.find(s => s.id === val);
      return (
        <span className="inline-flex items-center bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 px-1.5 py-0.5 rounded text-[11px] font-bold border border-teal-200/50">
          {sup ? sup.name : val}
        </span>
      );
    }
    // Адрес полки
    if (colName === 'location_id') {
      const loc = dbState.shelf_locations.find(s => s.id === val);
      return (
        <span className="inline-flex items-center bg-gray-50 dark:bg-slate-800 text-gray-800 dark:text-slate-300 px-1.5 py-0.5 rounded text-[11px] font-mono border border-gray-200 dark:border-slate-700">
          {loc ? loc.zone_code : val}
        </span>
      );
    }
    return <span className="font-mono text-gray-700 dark:text-slate-300">{String(val)}</span>;
  };

  const copySqlToClipboard = () => {
    let sql = `-- ==========================================================\n`;
    sql += `-- Схема базы данных ИС контроля качества ТС «Мария-Ра»\n`;
    sql += `-- Состоит из 15 связанных реляционных таблиц PostgreSQL\n`;
    sql += `-- Решение для комплексной автоматизации торгового зала ООО «Розница К-1»\n`;
    sql += `-- ==========================================================\n\n`;

    dbTables.forEach(t => {
      sql += `-- Таблица: ${t.name} (${t.russianName})\n`;
      sql += `-- Описание: ${t.description}\n`;
      sql += `CREATE TABLE ${t.name} (\n`;
      const colLines = t.columns.map(c => {
        let line = `  ${c.name} ${c.type}`;
        if (c.isPrimary) {
          line += ` PRIMARY KEY`;
        } else if (!c.nullable) {
          line += ` NOT NULL`;
        }
        line += ` -- ${c.description}`;
        return line;
      });

      t.columns.forEach(c => {
        if (c.isForeign && c.refTable) {
          colLines.push(`  CONSTRAINT fk_${t.name}_${c.name} FOREIGN KEY (${c.name}) REFERENCES ${c.refTable}(id) ON DELETE CASCADE`);
        }
      });

      sql += colLines.join(',\n');
      sql += `\n);\n\n`;
    });

    navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="space-y-6">
      
      {/* Dynamic Header Mode Switcher */}
      <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-6 shadow-xs transition-colors duration-200">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="p-1.5 bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400 rounded-lg">
                <Database className="w-5 h-5" />
              </span>
              <h2 className="text-sm font-black text-gray-900 dark:text-slate-100 uppercase tracking-tight">
                Консоль СУБД ТС «Мария-Ра» (15 Связанных Таблиц)
              </h2>
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed max-w-3xl">
              Полнофункциональная рабочая среда реляционных баз данных. Изменения в этих таблицах (добавление, удаление) мгновенно влияют на товары на полках, приходные накладные, акты списания и логи телеметрии всей системы!
            </p>
          </div>
          
          <div className="flex items-center space-x-2 w-full md:w-auto shrink-0">
            <button
              onClick={() => setActiveTab('data')}
              className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-xs font-black uppercase tracking-tight cursor-pointer border ${
                activeTab === 'data'
                  ? 'bg-green-600 text-white border-green-700 shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-gray-600 dark:text-slate-300 border-gray-100 dark:border-slate-800 hover:bg-gray-100 dark:hover:bg-slate-850'
              }`}
            >
              📊 Активные Данные ({dbState.products?.length + dbState.batches?.length + dbState.writeoff_acts?.length || 15} записей)
            </button>
            <button
              onClick={() => setActiveTab('ddl')}
              className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-xs font-black uppercase tracking-tight cursor-pointer border ${
                activeTab === 'ddl'
                  ? 'bg-green-600 text-white border-green-700 shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-gray-600 dark:text-slate-300 border-gray-100 dark:border-slate-800 hover:bg-gray-100 dark:hover:bg-slate-850'
              }`}
            >
              📐 Схема & DDL Код
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'data' ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Sidebar: Table Selection */}
          <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl p-4 shadow-2xs h-[320px] lg:h-[650px] flex flex-col transition-colors duration-200">
            <div className="flex items-center space-x-2 bg-gray-50 dark:bg-slate-850 border border-gray-150 dark:border-slate-800 rounded-lg px-3 py-2 mb-3">
              <Search className="w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Поиск таблицы..."
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                className="bg-transparent border-none text-xs text-gray-900 dark:text-slate-100 focus:outline-none w-full font-bold"
              />
            </div>

            <div className="text-[10px] uppercase font-black tracking-wider text-gray-400 mb-2 px-1">Таблицы базы данных ({filteredTables.length})</div>
            
            <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
              {filteredTables.map((t) => {
                const isSelected = selectedTable.name === t.name;
                const rowsCount = dbState[t.name]?.length || 0;
                return (
                  <div
                    key={t.name}
                    onClick={() => {
                      setSelectedTable(t);
                      setRowSearch('');
                    }}
                    className={`p-3 rounded-lg border text-left cursor-pointer transition-all flex items-center justify-between select-none ${
                      isSelected
                        ? 'bg-green-600 text-white border-green-700 shadow-xs font-extrabold'
                        : 'bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-300 border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-850'
                    }`}
                  >
                    <div className="truncate flex-1 pr-2">
                      <span className="text-xs font-mono font-bold block">{t.name}</span>
                      <span className={`text-[9px] block font-medium truncate ${isSelected ? 'text-green-100' : 'text-gray-400'}`}>{t.russianName}</span>
                    </div>
                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold font-mono ${
                      isSelected ? 'bg-green-700 text-white' : 'bg-gray-100 dark:bg-slate-850 text-gray-500'
                    }`}>
                      {rowsCount}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-gray-100 dark:border-slate-800 mt-2">
              <button
                onClick={handleResetDb}
                className="w-full flex items-center justify-center space-x-1.5 px-3 py-2 border border-red-200 hover:bg-red-50 dark:border-red-950/40 dark:hover:bg-red-950/20 text-red-600 dark:text-red-400 rounded-lg text-xs font-black uppercase transition-all cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Сбросить БД</span>
              </button>
            </div>
          </div>

          {/* Main Grid: Live records browser */}
          <div className="lg:col-span-3 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl p-5 shadow-2xs h-[500px] lg:h-[650px] flex flex-col transition-colors duration-200">
            
            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-gray-50 dark:border-slate-800 pb-4 mb-4 shrink-0">
              <div className="flex items-center space-x-2.5">
                <span className="p-1.5 bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400 rounded-lg">
                  <Table className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-sm font-black text-gray-900 dark:text-slate-100 font-mono tracking-tight">{selectedTable.name}</h3>
                  <span className="text-[10px] text-gray-500 font-medium block">{selectedTable.description}</span>
                </div>
              </div>

              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <div className="flex items-center space-x-1 bg-gray-50 dark:bg-slate-850 border border-gray-150 dark:border-slate-800 rounded-lg px-2.5 py-1.5 w-full sm:w-48">
                  <Search className="w-3.5 h-3.5 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Фильтр строк..."
                    value={rowSearch}
                    onChange={(e) => setRowSearch(e.target.value)}
                    className="bg-transparent border-none text-[11px] text-gray-900 dark:text-slate-100 focus:outline-none w-full font-bold"
                  />
                </div>
                
                <button
                  onClick={handleOpenAddModal}
                  className="flex items-center space-x-1 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-tight cursor-pointer shrink-0 active:scale-98 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Добавить</span>
                </button>
              </div>
            </div>

            {/* Live Data Grid */}
            <div className="flex-1 overflow-auto custom-scrollbar border border-gray-100 dark:border-slate-800 rounded-lg">
              {filteredRows.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-16 text-gray-400 dark:text-slate-500 italic">
                  <AlertTriangle className="w-8 h-8 text-amber-500 mb-2" />
                  <span>Нет записей в таблице. Создайте новую запись кнопкой «Добавить»!</span>
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50/70 dark:bg-slate-800/40 border-b border-gray-150 dark:border-slate-800 text-gray-400 dark:text-slate-500 font-extrabold text-[9px] uppercase tracking-wider sticky top-0 z-10">
                      {selectedTable.columns.map(col => (
                        <th key={col.name} className="px-4 py-3 min-w-[120px] bg-gray-50 dark:bg-slate-800/70">{col.description} ({col.name})</th>
                      ))}
                      <th className="px-4 py-3 bg-gray-50 dark:bg-slate-800/70 text-right">Действия</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-slate-800 font-semibold">
                    {filteredRows.map((row, idx) => (
                      <tr key={row.id || idx} className="hover:bg-gray-50/40 dark:hover:bg-slate-900/50 transition-colors">
                        {selectedTable.columns.map(col => {
                          const val = row[col.name];
                          return (
                            <td key={col.name} className="px-4 py-3 text-[11px]">
                              {col.isPrimary && (
                                <span className="font-mono font-black text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 px-1 rounded">
                                  {val}
                                </span>
                              )}
                              {col.isForeign && renderForeignKeyCell(col.name, val)}
                              {!col.isPrimary && !col.isForeign && (
                                typeof val === 'boolean' ? (
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                                    val ? 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300'
                                  }`}>
                                    {val ? 'ИСТИНА' : 'ЛОЖЬ'}
                                  </span>
                                ) : (
                                  <span className="text-gray-900 dark:text-slate-100">
                                    {typeof val === 'number' && col.type.includes('DECIMAL') ? `${val.toFixed(2)} ₽` : String(val !== undefined ? val : '')}
                                  </span>
                                )
                              )}
                            </td>
                          );
                        })}
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleDeleteRow(row.id)}
                            className="p-1 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 hover:text-red-700 rounded-md transition-all cursor-pointer"
                            title="Удалить строку"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="shrink-0 pt-3 border-t border-gray-50 dark:border-slate-800 mt-2 text-right text-[10px] text-gray-400 dark:text-slate-500 font-medium">
              *Все изменения автоматически записываются в транзакционном режиме LocalStorage.
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Table list in DDL view */}
          <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl p-4 shadow-2xs h-[300px] lg:h-[650px] flex flex-col transition-colors duration-200">
            <div className="text-[10px] uppercase font-black tracking-wider text-gray-400 mb-3 px-1">Схемы 15 таблиц PostgreSQL / 1С</div>
            <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
              {dbTables.map((t, idx) => {
                const isSelected = selectedTable.name === t.name;
                return (
                  <div
                    key={t.name}
                    onClick={() => setSelectedTable(t)}
                    className={`p-3 rounded-lg border text-left cursor-pointer transition-all flex items-start space-x-3 select-none ${
                      isSelected
                        ? 'bg-green-600 text-white border-green-700 shadow-xs font-extrabold'
                        : 'bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-300 border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-850'
                    }`}
                  >
                    <span className={`p-1 rounded-md text-[10px] font-bold ${
                      isSelected ? 'bg-green-700 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-500'
                    }`}>
                      {idx + 1}
                    </span>
                    <div className="truncate flex-1">
                      <span className="text-xs font-mono font-bold block">{t.name}</span>
                      <span className={`text-[9px] block font-medium ${isSelected ? 'text-green-100' : 'text-gray-400'}`}>{t.russianName}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <button
              onClick={copySqlToClipboard}
              className="mt-3 w-full flex items-center justify-center space-x-2 bg-slate-900 hover:bg-black text-white dark:bg-green-600 dark:hover:bg-green-700 py-2.5 rounded-xl text-xs font-black uppercase tracking-tight transition-all shadow-xs cursor-pointer active:scale-98"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Код DDL скопирован!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Копировать весь DDL</span>
                </>
              )}
            </button>
          </div>

          {/* DDL Details panel */}
          <div className="lg:col-span-2 flex flex-col h-[500px] lg:h-[650px] space-y-4">
            <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl p-5 shadow-2xs transition-colors duration-200 flex-1 overflow-y-auto custom-scrollbar">
              <div className="border-b border-gray-50 dark:border-slate-800 pb-4 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <span className="p-1.5 bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400 rounded-lg">
                      <Table className="w-5 h-5" />
                    </span>
                    <div>
                      <h3 className="text-sm font-black text-gray-900 dark:text-slate-100 font-mono tracking-tight">{selectedTable.name}</h3>
                      <span className="text-[10px] font-extrabold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/40 px-2 py-0.5 rounded-sm border border-green-200/50">
                        Справочная таблица: {selectedTable.russianName}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-400 font-mono font-bold">Колонок: {selectedTable.columns.length}</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-3 font-semibold leading-relaxed">
                  <b>Назначение в системе:</b> {selectedTable.description}
                </p>
              </div>

              {/* Column specifications */}
              <div className="border border-gray-100 dark:border-slate-800 rounded-xl overflow-hidden mb-4">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50/70 dark:bg-slate-800/40 border-b border-gray-100 dark:border-slate-800 text-gray-400 dark:text-slate-500 font-extrabold text-[10px] uppercase">
                      <th className="px-4 py-3">Поле (Column)</th>
                      <th className="px-4 py-3">Тип (Type)</th>
                      <th className="px-4 py-3">Атрибуты</th>
                      <th className="px-4 py-3">Описание</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-slate-800 font-semibold">
                    {selectedTable.columns.map(col => (
                      <tr key={col.name} className="hover:bg-gray-50/40 dark:hover:bg-slate-900/50 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-gray-900 dark:text-slate-100 flex items-center space-x-1.5">
                          {col.isPrimary && <Key className="w-3 h-3 text-amber-500 shrink-0" title="Primary Key" />}
                          {col.isForeign && <Link2 className="w-3 h-3 text-blue-500 shrink-0" title="Foreign Key" />}
                          <span>{col.name}</span>
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-slate-500 dark:text-slate-400">{col.type}</td>
                        <td className="px-4 py-3 text-[10px]">
                          {col.isPrimary && <span className="bg-amber-100 text-amber-800 font-extrabold px-1.5 py-0.5 rounded-sm uppercase tracking-wide">PK</span>}
                          {col.isForeign && (
                            <span className="bg-blue-100 text-blue-800 font-extrabold px-1.5 py-0.5 rounded-sm uppercase tracking-wide block w-fit">
                              FK → {col.refTable}
                            </span>
                          )}
                          {!col.isPrimary && !col.isForeign && (col.nullable === false ? <span className="text-red-500 font-extrabold font-mono">NOT NULL</span> : <span className="text-gray-400">NULL</span>)}
                        </td>
                        <td className="px-4 py-3 text-[11px] text-gray-600 dark:text-slate-300 leading-snug">{col.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* DDL Pre block */}
              <div className="bg-slate-950 text-slate-300 rounded-xl p-4 font-mono text-[10px] leading-relaxed relative border border-slate-800">
                <span className="text-slate-500 text-[9px] uppercase font-black block border-b border-slate-800 pb-1.5 mb-2">Автоматически сгенерированный SQL DDL таблицы:</span>
                <pre className="overflow-x-auto text-slate-100 font-semibold">{`CREATE TABLE ${selectedTable.name} (
${selectedTable.columns.map(c => {
  let line = `  ${c.name} ${c.type}`;
  if (c.isPrimary) line += ' PRIMARY KEY';
  else if (c.nullable === false) line += ' NOT NULL';
  return line;
}).join(',\n')}${selectedTable.columns.some(c => c.isForeign) ? ',\n' + selectedTable.columns.filter(c => c.isForeign).map(c => `  CONSTRAINT fk_${selectedTable.name}_${c.name} FOREIGN KEY (${c.name}) REFERENCES ${c.refTable}(id) ON DELETE CASCADE`).join(',\n') : ''}
);`}</pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DYNAMIC ROW INSERTION MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 rounded-2xl max-w-lg w-full overflow-hidden shadow-xl animate-scale-up">
            
            <div className="bg-green-600 text-white px-6 py-4 flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <Database className="w-5 h-5" />
                <span className="font-extrabold uppercase tracking-tight text-xs">Добавить запись: {selectedTable.name}</span>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-white/80 hover:text-white font-black text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveNewRow} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <p className="text-[11px] text-gray-500 dark:text-slate-400">
                Заполните столбцы для новой реляционной строки в таблице <b>{selectedTable.russianName}</b>. Внешние ключи будут связаны автоматически.
              </p>

              {selectedTable.columns.map(col => {
                const label = `${col.description} (${col.name})`;
                const isRequired = col.nullable === false && !col.isPrimary;

                // Если это Primary Key, показываем его заблокированным с автогенерацией
                if (col.isPrimary) {
                  return (
                    <div key={col.name} className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase block">{label}</label>
                      <input 
                        type="text" 
                        disabled
                        value={newRowData[col.name] || ''}
                        className="w-full bg-gray-50 dark:bg-slate-850 border border-gray-150 dark:border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-gray-400 font-bold"
                      />
                    </div>
                  );
                }

                // Сценарий для FOREIGN KEY: выводим селект с реальными данными!
                if (col.isForeign && col.refTable) {
                  const refTableRows = dbState[col.refTable as keyof DBTableData] || [];
                  return (
                    <div key={col.name} className="space-y-1">
                      <label className="text-[10px] font-black text-gray-700 dark:text-slate-300 uppercase block">
                        {label} {isRequired && <span className="text-red-500">*</span>}
                      </label>
                      <select
                        value={newRowData[col.name] || ''}
                        onChange={(e) => setNewRowData({ ...newRowData, [col.name]: e.target.value })}
                        className="w-full bg-white dark:bg-slate-850 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-bold text-gray-800 dark:text-slate-100 focus:ring-green-500"
                        required={isRequired}
                      >
                        <option value="">-- Выберите из таблицы {col.refTable} --</option>
                        {refTableRows.map((refRow: any) => {
                          const displayVal = refRow.name || refRow.act_number || refRow.store_number || refRow.id || '';
                          return (
                            <option key={refRow.id} value={refRow.id}>
                              {displayVal} ({refRow.id})
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  );
                }

                // Логические типы
                if (col.type.includes('BOOLEAN')) {
                  return (
                    <div key={col.name} className="flex items-center space-x-3 p-1.5 bg-gray-50/50 dark:bg-slate-850 rounded-lg border border-gray-100 dark:border-slate-800">
                      <input 
                        type="checkbox"
                        id={`add-form-${col.name}`}
                        checked={!!newRowData[col.name]}
                        onChange={(e) => setNewRowData({ ...newRowData, [col.name]: e.target.checked })}
                        className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded cursor-pointer"
                      />
                      <label htmlFor={`add-form-${col.name}`} className="text-xs font-bold text-gray-700 dark:text-slate-300 cursor-pointer select-none">
                        {col.description}
                      </label>
                    </div>
                  );
                }

                // Числовые типы
                if (col.type.includes('INTEGER') || col.type.includes('DECIMAL')) {
                  return (
                    <div key={col.name} className="space-y-1">
                      <label className="text-[10px] font-black text-gray-700 dark:text-slate-300 uppercase block">
                        {label} {isRequired && <span className="text-red-500">*</span>}
                      </label>
                      <input 
                        type="number"
                        step={col.type.includes('DECIMAL') ? '0.01' : '1'}
                        value={newRowData[col.name] !== undefined ? newRowData[col.name] : ''}
                        onChange={(e) => setNewRowData({ ...newRowData, [col.name]: e.target.value })}
                        className="w-full bg-white dark:bg-slate-850 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-bold text-gray-850 dark:text-slate-100 focus:ring-green-500"
                        placeholder="0"
                        required={isRequired}
                      />
                    </div>
                  );
                }

                // Дата и время
                if (col.type.includes('DATE') || col.type.includes('TIMESTAMP')) {
                  return (
                    <div key={col.name} className="space-y-1">
                      <label className="text-[10px] font-black text-gray-700 dark:text-slate-300 uppercase block">
                        {label} {isRequired && <span className="text-red-500">*</span>}
                      </label>
                      <input 
                        type="date"
                        value={newRowData[col.name] || ''}
                        onChange={(e) => setNewRowData({ ...newRowData, [col.name]: e.target.value })}
                        className="w-full bg-white dark:bg-slate-850 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-bold text-gray-850 dark:text-slate-100 focus:ring-green-500 font-mono"
                        required={isRequired}
                      />
                    </div>
                  );
                }

                // Стандартное текстовое поле
                return (
                  <div key={col.name} className="space-y-1">
                    <label className="text-[10px] font-black text-gray-700 dark:text-slate-300 uppercase block">
                      {label} {isRequired && <span className="text-red-500">*</span>}
                    </label>
                    <input 
                      type="text"
                      value={newRowData[col.name] || ''}
                      onChange={(e) => setNewRowData({ ...newRowData, [col.name]: e.target.value })}
                      className="w-full bg-white dark:bg-slate-850 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-bold text-gray-850 dark:text-slate-100 focus:ring-green-500"
                      placeholder={`Введите ${col.description.toLowerCase()}...`}
                      required={isRequired}
                    />
                  </div>
                );
              })}

              <div className="pt-4 border-t border-gray-50 dark:border-slate-800 flex space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-xl text-xs font-black uppercase tracking-tight transition-all cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-black uppercase tracking-tight transition-all cursor-pointer shadow-xs"
                >
                  Сохранить строку
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}

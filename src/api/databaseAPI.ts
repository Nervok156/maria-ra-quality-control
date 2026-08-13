import { supabase } from '../lib/supabaseClient';
// ==========================================================
// 1. РАБОТА С СОТРУДНИКАМИ
// ==========================================================

export async function getEmployees() {
  const { data, error } = await supabase
    .from('employees')
    .select('*, roles(*), stores(*)');
  
  if (error) {
    console.error('❌ Ошибка получения сотрудников:', error);
    throw error;
  }
  return data || [];
}

export async function getEmployeeById(id: string) {
  const { data, error } = await supabase
    .from('employees')
    .select('*, roles(*), stores(*)')
    .eq('id', id)
    .single();
  
  if (error) {
    console.error('❌ Ошибка получения сотрудника:', error);
    throw error;
  }
  return data;
}

// ==========================================================
// 2. РАБОТА С ТОВАРАМИ
// ==========================================================

export async function getProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*');
  
  if (error) {
    console.error('❌ Ошибка получения товаров:', error);
    throw error;
  }
  return data || [];
}

export async function getProductById(id: string) {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    console.error('❌ Ошибка получения товара:', error);
    throw error;
  }
  return data;
}

export async function createProduct(product: any) {
  const { data, error } = await supabase
    .from('products')
    .insert([product])
    .select();
  
  if (error) {
    console.error('❌ Ошибка создания товара:', error);
    throw error;
  }
  return data?.[0];
}

// ==========================================================
// 3. РАБОТА С ПАРТИЯМИ ТОВАРОВ
// ==========================================================

export async function getBatches() {
  const { data, error } = await supabase
    .from('batches')
    .select('*, products(*), shelf_locations(*)');
  
  if (error) {
    console.error('❌ Ошибка получения партий:', error);
    throw error;
  }
  return data || [];
}

export async function createBatch(batch: any) {
  const { data, error } = await supabase
    .from('batches')
    .insert([batch])
    .select();
  
  if (error) {
    console.error('❌ Ошибка создания партии:', error);
    throw error;
  }
  return data?.[0];
}

// ==========================================================
// 4. РАБОТА С КАТЕГОРИЯМИ
// ==========================================================

export async function getCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('*');
  
  if (error) {
    console.error('❌ Ошибка получения категорий:', error);
    throw error;
  }
  return data || [];
}
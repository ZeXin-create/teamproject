'use client';

import { supabase } from '../lib/supabase';
import {
  GoodsType,
  ServerArea,
  TeamBadge,
  SaleStatus,
  TeamSale,
  CreateTeamSaleRequest,
  TeamSaleQueryParams
} from '../types/teamSales';

// 发布商品
export const createTeamSale = async (data: CreateTeamSaleRequest): Promise<TeamSale> => {
  // 验证必填字段
  if (!data.goods_type || !data.server_area || !data.price || !data.description || !data.contact) {
    throw new Error('缺少必填字段');
  }

  // 验证价格
  if (data.price <= 0) {
    throw new Error('价格必须大于0');
  }

  // 根据商品类型验证字段
  if (data.goods_type === GoodsType.TEAM || data.goods_type === GoodsType.TEAM_AND_ID) {
    if (!data.team_size || data.team_size <= 0) {
      throw new Error('战队人数必须大于0');
    }
    if (!data.team_badge) {
      throw new Error('请选择战队标');
    }
  }

  if (data.goods_type === GoodsType.ID || data.goods_type === GoodsType.TEAM_AND_ID) {
    if (!data.id_name) {
      throw new Error('请输入ID名称');
    }

    // 检查ID名称是否已存在
    try {
      const { data: existingId } = await supabase
        .from('team_sales')
        .select('id')
        .eq('id_name', data.id_name)
        .eq('status', SaleStatus.ON_SALE)
        .single();

      if (existingId) {
        throw new Error('该ID名称已存在');
      }
    } catch (err) {
      console.log('检查ID名称失败:', err);
      // 继续执行，不阻止创建
    }
  }

  // 构建插入数据，只包含必要字段，确保不包含数据库中不存在的字段
  const insertData: {
    goods_type: GoodsType;
    server_area: ServerArea;
    price: number;
    description: string;
    contact: string;
    status: SaleStatus;
    team_size: number;
    team_badge?: TeamBadge;
    id_name?: string;
    image_url?: string;
  } = {
    goods_type: data.goods_type,
    server_area: data.server_area,
    price: data.price,
    description: data.description,
    contact: data.contact,
    status: SaleStatus.ON_SALE,
    // 确保 team_size 字段始终存在且为正数
    team_size: (data.goods_type === GoodsType.TEAM || data.goods_type === GoodsType.TEAM_AND_ID) ? data.team_size! : 1
  };

  // 只添加相关字段
  if (data.goods_type === GoodsType.TEAM || data.goods_type === GoodsType.TEAM_AND_ID) {
    insertData.team_badge = data.team_badge;
  }

  if (data.goods_type === GoodsType.ID || data.goods_type === GoodsType.TEAM_AND_ID) {
    insertData.id_name = data.id_name;
  }

  if (data.image_url) {
    insertData.image_url = data.image_url;
  }

  // 确保不包含数据库中不存在的字段
  // 由于我们只添加了有效的字段，所以不需要这个检查

  // 创建商品
  const { data: newSale, error } = await supabase
    .from('team_sales')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    throw new Error(`创建商品失败: ${typeof error === 'object' && error !== null && 'message' in error ? error.message : String(error)}`);
  }

  return newSale as TeamSale;
};

// 获取商品列表
export const getTeamSales = async (params: TeamSaleQueryParams = {}): Promise<TeamSale[]> => {
  let query = supabase
    .from('team_sales')
    .select('*');

  // 应用筛选条件
  if (params.goods_type) {
    query = query.eq('goods_type', params.goods_type);
  }

  if (params.server_area) {
    query = query.eq('server_area', params.server_area);
  }

  if (params.team_badge) {
    query = query.eq('team_badge', params.team_badge);
  }

  if (params.status) {
    query = query.eq('status', params.status);
  } else {
    // 默认只显示出售中的商品
    query = query.eq('status', SaleStatus.ON_SALE);
  }

  // 应用排序
  if (params.sort_by) {
    const order = params.sort_order || 'desc';
    query = query.order(params.sort_by, { ascending: order === 'asc' });
  } else {
    // 默认按创建时间降序
    query = query.order('created_at', { ascending: false });
  }

  // 应用分页
  if (params.page && params.limit) {
    const offset = (params.page - 1) * params.limit;
    query = query.range(offset, offset + params.limit - 1);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`获取商品列表失败: ${typeof error === 'object' && error !== null && 'message' in error ? error.message : String(error)}`);
  }

  return data as TeamSale[];
};

// 获取商品详情
export const getTeamSaleById = async (id: string): Promise<TeamSale> => {
  const { data, error } = await supabase
    .from('team_sales')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    throw new Error(`获取商品详情失败: ${typeof error === 'object' && error !== null && 'message' in error ? error.message : String(error)}`);
  }

  return data as TeamSale;
};

// 更新商品状态
export const updateTeamSaleStatus = async (id: string, status: SaleStatus): Promise<TeamSale> => {
  const { data, error } = await supabase
    .from('team_sales')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`更新商品状态失败: ${typeof error === 'object' && error !== null && 'message' in error ? error.message : String(error)}`);
  }

  return data as TeamSale;
};

// 商品类型枚举
export enum GoodsType {
  TEAM = 'TEAM',
  ID = 'ID',
  TEAM_AND_ID = 'TEAM_AND_ID'
}

// 大区枚举
export enum ServerArea {
  IOS_QQ = 'IOS_QQ',
  ANDROID_QQ = 'ANDROID_QQ',
  IOS_WECHAT = 'IOS_WECHAT',
  ANDROID_WECHAT = 'ANDROID_WECHAT'
}

// 战队标枚举
export enum TeamBadge {
  NONE = 'NONE',
  THIRD_PLACE = 'THIRD_PLACE',
  SECOND_PLACE = 'SECOND_PLACE',
  FIRST_PLACE = 'FIRST_PLACE'
}

// 出售状态枚举
export enum SaleStatus {
  ON_SALE = 'ON_SALE',
  SOLD = 'SOLD',
  OFF_SHELF = 'OFF_SHELF'
}

// 商品类型定义
export interface TeamSale {
  id: string;
  goods_type: GoodsType;
  server_area: ServerArea;
  price: number;
  description: string;
  contact: string;
  status: SaleStatus;
  team_size?: number;
  team_badge?: TeamBadge;
  id_name?: string;
  image_url?: string;
  created_at: string;
  updated_at: string;
}

// 创建商品请求类型
export interface CreateTeamSaleRequest {
  goods_type: GoodsType;
  server_area: ServerArea;
  price: number;
  description: string;
  contact: string;
  team_size?: number;
  team_badge?: TeamBadge;
  id_name?: string;
  image_url?: string;
}

// 商品列表查询参数类型
export interface TeamSaleQueryParams {
  goods_type?: GoodsType;
  server_area?: ServerArea;
  team_badge?: TeamBadge;
  status?: SaleStatus;
  sort_by?: 'price' | 'created_at';
  sort_order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

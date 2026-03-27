'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GoodsType, ServerArea, TeamBadge, SaleStatus, TeamSale, TeamSaleQueryParams } from '../types/teamSales';
import { getTeamSales } from '../services/teamSalesService';
import Navbar from '../components/Navbar';

export default function TeamSalesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sales, setSales] = useState<TeamSale[]>([]);
  
  const [filters, setFilters] = useState<TeamSaleQueryParams>({
    goods_type: undefined,
    server_area: undefined,
    team_badge: undefined,
    status: SaleStatus.ON_SALE,
    sort_by: 'created_at',
    sort_order: 'desc'
  });

  const fetchSales = async () => {
    setLoading(true);
    try {
      const data = await getTeamSales(filters);
      setSales(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取商品列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, [filters]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value === '' ? undefined : value
    }));
  };

  const getGoodsTypeLabel = (type: GoodsType) => {
    switch (type) {
      case GoodsType.TEAM: return '战队';
      case GoodsType.ID: return 'ID';
      case GoodsType.TEAM_AND_ID: return '战队+ID';
    }
  };

  const getServerAreaLabel = (area: ServerArea) => {
    switch (area) {
      case ServerArea.IOS_QQ: return 'iOS QQ';
      case ServerArea.ANDROID_QQ: return '安卓 QQ';
      case ServerArea.IOS_WECHAT: return 'iOS 微信';
      case ServerArea.ANDROID_WECHAT: return '安卓 微信';
    }
  };

  const getTeamBadgeLabel = (badge?: TeamBadge) => {
    if (!badge) return '无';
    switch (badge) {
      case TeamBadge.NONE: return '无标';
      case TeamBadge.THIRD_PLACE: return '季军标';
      case TeamBadge.SECOND_PLACE: return '亚军标';
      case TeamBadge.FIRST_PLACE: return '冠军标/王标';
    }
  };

  const getStatusLabel = (status: SaleStatus) => {
    switch (status) {
      case SaleStatus.ON_SALE: return '出售中';
      case SaleStatus.SOLD: return '已售出';
      case SaleStatus.OFF_SHELF: return '已下架';
    }
  };

  const getStatusColor = (status: SaleStatus) => {
    switch (status) {
      case SaleStatus.ON_SALE: return 'bg-green-100 text-green-700';
      case SaleStatus.SOLD: return 'bg-red-100 text-red-700';
      case SaleStatus.OFF_SHELF: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/')}
              className="glass-button px-4 py-2 text-white font-medium flex items-center gap-2"
            >
              ← 返回主页
            </button>
            <h1 className="text-3xl font-bold gradient-text">王者荣耀战队/ID出售</h1>
          </div>
          <button
            onClick={() => router.push('/team-sales/new')}
            className="glass-button px-6 py-3 text-white font-medium"
          >
            发布商品
          </button>
        </div>
        
        {/* 筛选条件 */}
        <div className="glass-card p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-gray-700 font-medium mb-2">商品类型</label>
              <select
                name="goods_type"
                value={filters.goods_type || ''}
                onChange={handleFilterChange}
                className="glass-input w-full px-4 py-2"
              >
                <option value="">全部</option>
                <option value={GoodsType.TEAM}>战队</option>
                <option value={GoodsType.ID}>ID</option>
                <option value={GoodsType.TEAM_AND_ID}>战队+ID</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-2">大区</label>
              <select
                name="server_area"
                value={filters.server_area || ''}
                onChange={handleFilterChange}
                className="glass-input w-full px-4 py-2"
              >
                <option value="">全部</option>
                {Object.values(ServerArea).map(area => (
                  <option key={area} value={area}>
                    {getServerAreaLabel(area)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-2">战队标</label>
              <select
                name="team_badge"
                value={filters.team_badge || ''}
                onChange={handleFilterChange}
                className="glass-input w-full px-4 py-2"
              >
                <option value="">全部</option>
                {Object.values(TeamBadge).map(badge => (
                  <option key={badge} value={badge}>
                    {getTeamBadgeLabel(badge)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-2">排序</label>
              <select
                name="sort_by"
                value={filters.sort_by}
                onChange={handleFilterChange}
                className="glass-input w-full px-4 py-2"
              >
                <option value="created_at">最新发布</option>
                <option value="price">价格排序</option>
              </select>
            </div>
          </div>
        </div>
        
        {error && (
          <div className="mb-6 p-4 bg-red-100/80 backdrop-blur-sm text-red-700 rounded-2xl border border-red-200">
            {error}
          </div>
        )}
        
        {loading ? (
          <div className="glass-card p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">加载中...</p>
          </div>
        ) : sales.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <div className="text-6xl mb-4">🎮</div>
            <p className="text-gray-600 text-lg">暂无商品</p>
            <p className="text-gray-400 text-sm mt-2">快来发布第一个商品吧~</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sales.map(sale => (
              <div key={sale.id} className="glass-card p-6 hover:scale-[1.02] transition-transform">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-2">
                      {getGoodsTypeLabel(sale.goods_type)}
                      {sale.id_name && ` - ${sale.id_name}`}
                    </h3>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-sm font-medium">
                        {getServerAreaLabel(sale.server_area)}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(sale.status)}`}>
                        {getStatusLabel(sale.status)}
                      </span>
                    </div>
                  </div>
                  <div className="text-xl font-bold text-pink-500">
                    ¥{sale.price}
                  </div>
                </div>
                
                {(sale.goods_type === GoodsType.TEAM || sale.goods_type === GoodsType.TEAM_AND_ID) && (
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-1">
                      <span className="text-gray-600">人数:</span>
                      <span className="font-medium">{sale.team_size}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-gray-600">战队标:</span>
                      <span className="font-medium">{getTeamBadgeLabel(sale.team_badge)}</span>
                    </div>
                  </div>
                )}
                
                <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                  {sale.description}
                </p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <span>联系方式:</span>
                    <span className="font-medium">{sale.contact}</span>
                  </div>
                  <div className="text-xs text-gray-400">
                    {new Date(sale.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

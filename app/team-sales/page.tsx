'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { GoodsType, ServerArea, TeamBadge, SaleStatus, TeamSale, TeamSaleQueryParams } from '../types/teamSales';
import { getTeamSales } from '../services/teamSalesService';
import Navbar from '../components/Navbar';
import PageLayout from '../components/layout/PageLayout';
import ErrorBoundary from '../components/ErrorBoundary';
import { supabase } from '../lib/supabase';

export default function TeamSalesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sales, setSales] = useState<TeamSale[]>([]);
  const [selectedSale, setSelectedSale] = useState<TeamSale | null>(null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  
  const [filters, setFilters] = useState<TeamSaleQueryParams>({
    goods_type: undefined,
    server_area: undefined,
    team_badge: undefined,
    status: SaleStatus.ON_SALE,
    sort_by: 'created_at',
    sort_order: 'desc'
  });

  const fetchSales = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getTeamSales(filters);
      
      // 获取卖家信息 - 尝试使用各种可能的字段名
      const salesWithSellers = await Promise.all(
        (data as Array<any>).map(async (sale) => {
          let sellerNickname = '未知用户'
          
          // 打印完整的 sale 数据结构，方便调试
          console.log('完整的 sale 数据:', JSON.stringify(sale, null, 2))
          
          // 尝试多种可能的卖家ID字段名
          const sellerId = sale.author_id || sale.seller_id || sale.user_id || sale.created_by
          
          // 或者直接检查是否有 seller 或 profiles 字段
          if (sale.seller?.nickname) {
            sellerNickname = sale.seller.nickname
          } else if (sale.profiles?.nickname) {
            sellerNickname = sale.profiles.nickname
          } else if (sellerId) {
            try {
              const { data: sellerData } = await supabase
                .from('profiles')
                .select('nickname')
                .eq('id', sellerId)
                .single()
              
              if (sellerData?.nickname) {
                sellerNickname = sellerData.nickname
              }
            } catch (err) {
              console.log('获取卖家信息失败:', err)
            }
          }
          
          return {
            ...sale,
            profiles: {
              nickname: sellerNickname
            }
          }
        })
      )
      
      setSales(salesWithSellers);
      // 默认选中第一个
      if (salesWithSellers.length > 0 && !selectedSale) {
        setSelectedSale(salesWithSellers[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取商品列表失败');
    } finally {
      setLoading(false);
    }
  }, [filters, selectedSale]);

  useEffect(() => {
    fetchSales();
  }, [filters, fetchSales]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value === '' ? undefined : value
    }));
  };

  // 复制联系方式
  const copyContact = (contact: string) => {
    navigator.clipboard.writeText(contact)
      .then(() => {
        alert('联系方式已复制到剪贴板');
      })
      .catch(err => {
        console.error('复制失败:', err);
      });
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
    if (!badge) return '无标';
    switch (badge) {
      case TeamBadge.NONE: return '无标';
      case TeamBadge.SECOND_PLACE: return '亚军标';
      case TeamBadge.FIRST_PLACE: return '王标';
      default: return '无标';
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

  // 骨架屏组件
  const SkeletonCard = () => (
    <div className="card p-4 animate-pulse">
      <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
    </div>
  );

  return (
    <ErrorBoundary>
    <div className="min-h-screen">
      <Navbar />
      <PageLayout>
        <div className="container mx-auto px-4 pb-8">
          {/* 页面标题和发布按钮 */}
          <div className="card p-6 mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.push('/')}
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <h1 className="text-2xl font-bold gradient-text">王者荣耀战队/ID出售</h1>
              </div>
              <button
                onClick={() => router.push('/team-sales/new')}
                className="btn-primary px-6 py-2 text-white font-medium"
              >
                发布商品
              </button>
            </div>
          </div>
          
          {/* 交易猫风格的横向筛选栏 */}
          <div className="card p-4 mb-6">
            <div className="flex flex-wrap items-center gap-4">
              {/* 商品类型 */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-600">商品类型：</span>
                <select
                  name="goods_type"
                  value={filters.goods_type || ''}
                  onChange={handleFilterChange}
                  className="px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">全部</option>
                  <option value={GoodsType.ID}>仅ID</option>
                  <option value={GoodsType.TEAM}>仅战队</option>
                  <option value={GoodsType.TEAM_AND_ID}>战队+ID</option>
                </select>
              </div>
              
              {/* 大区 */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-600">大区：</span>
                <select
                  name="server_area"
                  value={filters.server_area || ''}
                  onChange={handleFilterChange}
                  className="px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">全部</option>
                  <option value={ServerArea.IOS_QQ}>iOS QQ</option>
                  <option value={ServerArea.ANDROID_QQ}>安卓 QQ</option>
                  <option value={ServerArea.IOS_WECHAT}>iOS 微信</option>
                  <option value={ServerArea.ANDROID_WECHAT}>安卓 微信</option>
                </select>
              </div>
              
              {/* 战队标 */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-600">战队标：</span>
                <select
                  name="team_badge"
                  value={filters.team_badge || ''}
                  onChange={handleFilterChange}
                  className="px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">全部</option>
                  <option value={TeamBadge.NONE}>无标</option>
                  <option value={TeamBadge.SECOND_PLACE}>亚军标</option>
                  <option value={TeamBadge.FIRST_PLACE}>王标</option>
                </select>
              </div>
              
              {/* 排序 */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-600">排序：</span>
                <select
                  name="sort_by"
                  value={filters.sort_by}
                  onChange={handleFilterChange}
                  className="px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="price">价格</option>
                  <option value="created_at">最新发布</option>
                </select>
              </div>
            </div>
          </div>
          
          {error && (
            <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-lg">
              {error}
            </div>
          )}
          
          {/* 主体布局 */}
          <div className="flex flex-col lg:flex-row gap-6">
            {/* 左侧列表 */}
            <div className="w-full lg:w-96">
              <div className="card p-4">
                <h2 className="text-xl font-semibold mb-4">商品列表</h2>
                <div className="max-h-[calc(100vh-200px)] overflow-y-auto pr-2 space-y-4">
                  {loading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <SkeletonCard key={i} />
                      ))}
                    </div>
                  ) : sales.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      <div className="text-6xl mb-4">🎮</div>
                      <p className="text-gray-600 text-lg">暂无商品</p>
                      <p className="text-gray-400 text-sm mt-2">快来发布第一个商品吧~</p>
                    </div>
                  ) : (
                    sales.map(sale => (
                      <div
                        key={sale.id}
                        className={`card p-4 cursor-pointer transition-all duration-300 ${selectedSale?.id === sale.id ? 'ring-2 ring-primary-500' : 'hover:shadow-md'}`}
                        onClick={() => {
                          setSelectedSale(sale);
                          setMobileDetailOpen(true);
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold">{sale.id_name || getGoodsTypeLabel(sale.goods_type)}</h3>
                            <div className="flex gap-2 mt-1">
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">{getGoodsTypeLabel(sale.goods_type)}</span>
                              <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">{getServerAreaLabel(sale.server_area)}</span>
                            </div>
                            <div className="text-sm font-bold text-primary-500 mt-2">¥{sale.price}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              卖家：{sale.profiles?.nickname || '未知用户'}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                              {new Date(sale.created_at).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`px-2 py-1 rounded-full text-xs ${getStatusColor(sale.status)}`}>
                              {getStatusLabel(sale.status)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* 右侧详情 */}
            <div className="hidden lg:block flex-1">
              {selectedSale ? (
                <div className="card p-6">
                  <h2 className="text-xl font-semibold mb-4">商品详情</h2>
                  <div className="space-y-6">
                    {/* 商品图片 */}
                    <div className="bg-gray-100 rounded-lg p-4 text-center">
                      <div className="text-6xl mb-2">🎮</div>
                      <p className="text-gray-500">暂无商品图片</p>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-bold">{selectedSale.id_name || getGoodsTypeLabel(selectedSale.goods_type)}</h3>
                      <div className="text-2xl font-bold text-primary-500 mt-2">¥{selectedSale.price}</div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500 mb-1">商品类型</p>
                        <p className="font-medium">{getGoodsTypeLabel(selectedSale.goods_type)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 mb-1">服务器</p>
                        <p className="font-medium">{getServerAreaLabel(selectedSale.server_area)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 mb-1">战队标</p>
                        <p className="font-medium">{getTeamBadgeLabel(selectedSale.team_badge)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 mb-1">状态</p>
                        <p className={`font-medium ${selectedSale.status === SaleStatus.ON_SALE ? 'text-green-600' : 'text-gray-600'}`}>
                          {getStatusLabel(selectedSale.status)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 mb-1">卖家</p>
                        <p className="font-medium">{selectedSale.profiles?.nickname || '未知用户'}</p>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-500 mb-1">详细描述</p>
                      <p className="font-medium">{selectedSale.description || '暂无描述'}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-500 mb-1">联系方式</p>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{selectedSale.contact}</p>
                        <button
                          onClick={() => copyContact(selectedSale.contact)}
                          className="text-primary-500 hover:text-primary-600 transition-colors"
                        >
                          复制
                        </button>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-500 mb-1">发布时间</p>
                      <p className="font-medium">{new Date(selectedSale.created_at).toLocaleString()}</p>
                    </div>
                    
                    <div className="flex gap-4 pt-4 border-t border-gray-200">
                      <button
                        onClick={() => copyContact(selectedSale.contact)}
                        className="btn-primary px-6 py-3 text-white font-medium flex-1"
                      >
                        联系卖家
                      </button>
                      <button
                        onClick={() => router.push(`/team-sales/new?edit=${selectedSale.id}`)}
                        className="btn-secondary px-6 py-3 text-gray-700 font-medium flex-1"
                      >
                        编辑商品
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="card p-12 text-center">
                  <div className="text-6xl mb-4">🎮</div>
                  <p className="text-gray-500">请选择一个商品查看详情</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 移动端详情模态框 */}
        {mobileDetailOpen && selectedSale && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center lg:hidden">
            <div className="bg-white rounded-t-xl w-full max-h-[80vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">商品详情</h2>
                  <button
                    onClick={() => setMobileDetailOpen(false)}
                    className="text-gray-500 hover:text-gray-800"
                  >
                    ×
                  </button>
                </div>
                
                <div className="space-y-6">
                  {/* 商品图片 */}
                  <div className="bg-gray-100 rounded-lg p-4 text-center">
                    <div className="text-6xl mb-2">🎮</div>
                    <p className="text-gray-500">暂无商品图片</p>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-bold">{selectedSale.id_name || getGoodsTypeLabel(selectedSale.goods_type)}</h3>
                    <div className="text-2xl font-bold text-primary-500 mt-2">¥{selectedSale.price}</div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">商品类型</p>
                      <p className="font-medium">{getGoodsTypeLabel(selectedSale.goods_type)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">服务器</p>
                      <p className="font-medium">{getServerAreaLabel(selectedSale.server_area)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">战队标</p>
                      <p className="font-medium">{getTeamBadgeLabel(selectedSale.team_badge)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">状态</p>
                      <p className={`font-medium ${selectedSale.status === SaleStatus.ON_SALE ? 'text-green-600' : 'text-gray-600'}`}>
                        {getStatusLabel(selectedSale.status)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">卖家</p>
                      <p className="font-medium">{selectedSale.profiles?.nickname || '未知用户'}</p>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500 mb-1">详细描述</p>
                    <p className="font-medium">{selectedSale.description || '暂无描述'}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500 mb-1">联系方式</p>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{selectedSale.contact}</p>
                      <button
                        onClick={() => copyContact(selectedSale.contact)}
                        className="text-primary-500 hover:text-primary-600 transition-colors"
                      >
                        复制
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500 mb-1">发布时间</p>
                    <p className="font-medium">{new Date(selectedSale.created_at).toLocaleString()}</p>
                  </div>
                  
                  <div className="flex gap-4 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => copyContact(selectedSale.contact)}
                      className="btn-primary px-6 py-3 text-white font-medium flex-1"
                    >
                      联系卖家
                    </button>
                    <button
                      onClick={() => router.push(`/team-sales/new?edit=${selectedSale.id}`)}
                      className="btn-secondary px-6 py-3 text-gray-700 font-medium flex-1"
                    >
                      编辑商品
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </PageLayout>
    </div>
    </ErrorBoundary>
  );
}

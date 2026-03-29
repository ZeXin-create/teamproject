'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GoodsType, ServerArea, TeamBadge, CreateTeamSaleRequest } from '../../types/teamSales';
import { createTeamSale } from '../../services/teamSalesService';
import Navbar from '../../components/Navbar';

export default function CreateTeamSalePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState<{
    goods_type: GoodsType;
    server_area: ServerArea;
    price: number | string;
    description: string;
    contact: string;
    team_size: number | string;
    team_badge: TeamBadge;
    id_name: string;
  }>({
    goods_type: GoodsType.TEAM,
    server_area: ServerArea.IOS_QQ,
    price: '',
    description: '',
    contact: '',
    team_size: '',
    team_badge: TeamBadge.NONE,
    id_name: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // 验证价格
    const price = typeof formData.price === 'string' ? parseFloat(formData.price) : formData.price;
    if (!price || price <= 0) {
      setError('请输入有效的价格（必须大于0）');
      return;
    }

    // 验证战队人数
    const teamSize = typeof formData.team_size === 'string' ? parseInt(formData.team_size) : formData.team_size;
    if ((formData.goods_type === GoodsType.TEAM || formData.goods_type === GoodsType.TEAM_AND_ID) && (!teamSize || teamSize <= 0)) {
      setError('请输入有效的战队人数（必须大于0）');
      return;
    }

    setLoading(true);

    try {
      const submitData: CreateTeamSaleRequest = {
        goods_type: formData.goods_type,
        server_area: formData.server_area,
        price: price,
        description: formData.description,
        contact: formData.contact,
        team_size: teamSize || 0,
        team_badge: formData.team_badge,
        id_name: formData.id_name
      };
      
      await createTeamSale(submitData);
      setSuccess('商品发布成功！');
      // 3秒后跳转到商品列表页
      setTimeout(() => {
        router.push('/team-sales');
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '发布失败，请稍后重试');
    } finally {
      setLoading(false);
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

  const getTeamBadgeLabel = (badge: TeamBadge) => {
    switch (badge) {
      case TeamBadge.NONE: return '无标';
      case TeamBadge.THIRD_PLACE: return '季军标';
      case TeamBadge.SECOND_PLACE: return '亚军标';
      case TeamBadge.FIRST_PLACE: return '冠军标/王标';
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="glass-card p-8 max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold gradient-text mb-6 text-center">发布商品</h1>
          
          {error && (
            <div className="mb-6 p-4 bg-red-100/80 backdrop-blur-sm text-red-700 rounded-2xl border border-red-200">
              {error}
            </div>
          )}
          
          {success && (
            <div className="mb-6 p-4 bg-green-100/80 backdrop-blur-sm text-green-700 rounded-2xl border border-green-200">
              {success}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 商品类型 */}
            <div>
              <label className="block text-gray-700 font-medium mb-2">商品类型 *</label>
              <select
                name="goods_type"
                value={formData.goods_type}
                onChange={handleChange}
                className="glass-input w-full px-4 py-3"
                required
              >
                <option value={GoodsType.TEAM}>战队</option>
                <option value={GoodsType.ID}>ID（战队名称）</option>
                <option value={GoodsType.TEAM_AND_ID}>战队+ID 组合</option>
              </select>
            </div>
            
            {/* 大区 */}
            <div>
              <label className="block text-gray-700 font-medium mb-2">大区 *</label>
              <select
                name="server_area"
                value={formData.server_area}
                onChange={handleChange}
                className="glass-input w-full px-4 py-3"
                required
              >
                {Object.values(ServerArea).map(area => (
                  <option key={area} value={area}>
                    {getServerAreaLabel(area)}
                  </option>
                ))}
              </select>
            </div>
            
            {/* 价格 */}
            <div>
              <label className="block text-gray-700 font-medium mb-2">价格（元）*</label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                min="0.01"
                step="0.01"
                placeholder="请输入价格"
                className="glass-input w-full px-4 py-3"
                required
              />
            </div>
            
            {/* 战队人数（仅战队和组合显示） */}
            {(formData.goods_type === GoodsType.TEAM || formData.goods_type === GoodsType.TEAM_AND_ID) && (
              <div>
                <label className="block text-gray-700 font-medium mb-2">战队人数 *</label>
                <input
                  type="number"
                  name="team_size"
                  value={formData.team_size}
                  onChange={handleChange}
                  min="1"
                  placeholder="请输入战队人数"
                  className="glass-input w-full px-4 py-3"
                  required
                />
              </div>
            )}
            
            {/* 战队标（仅战队和组合显示） */}
            {(formData.goods_type === GoodsType.TEAM || formData.goods_type === GoodsType.TEAM_AND_ID) && (
              <div>
                <label className="block text-gray-700 font-medium mb-2">战队标 *</label>
                <select
                  name="team_badge"
                  value={formData.team_badge}
                  onChange={handleChange}
                  className="glass-input w-full px-4 py-3"
                  required
                >
                  {Object.values(TeamBadge).map(badge => (
                    <option key={badge} value={badge}>
                      {getTeamBadgeLabel(badge)}
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            {/* ID名称（仅ID和组合显示） */}
            {(formData.goods_type === GoodsType.ID || formData.goods_type === GoodsType.TEAM_AND_ID) && (
              <div>
                <label className="block text-gray-700 font-medium mb-2">ID名称 *</label>
                <input
                  type="text"
                  name="id_name"
                  value={formData.id_name}
                  onChange={handleChange}
                  placeholder="请输入ID名称（全区唯一）"
                  className="glass-input w-full px-4 py-3"
                  required
                />
              </div>
            )}
            
            {/* 商品描述 */}
            <div>
              <label className="block text-gray-700 font-medium mb-2">商品描述 *</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                placeholder="请详细描述商品信息，包括特点、优势等"
                className="glass-input w-full px-4 py-3"
                required
              ></textarea>
            </div>
            
            {/* 联系方式 */}
            <div>
              <label className="block text-gray-700 font-medium mb-2">联系方式 *</label>
              <input
                type="text"
                name="contact"
                value={formData.contact}
                onChange={handleChange}
                placeholder="请输入QQ或微信等联系方式"
                className="glass-input w-full px-4 py-3"
                required
              />
            </div>
            
            <button
              type="submit"
              className="w-full glass-button py-3 text-white font-medium text-lg"
              disabled={loading}
            >
              {loading ? '发布中...' : '发布商品'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

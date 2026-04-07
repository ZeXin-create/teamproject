'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { GoodsType, ServerArea, TeamBadge, CreateTeamSaleRequest } from '../../types/teamSales';
import { createTeamSale } from '../../services/teamSalesService';
import { supabase } from '../../lib/supabase';
import Navbar from '../../components/Navbar';

export default function CreateTeamSalePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<{
    goods_type: GoodsType;
    server_area: ServerArea;
    price: number | string;
    description: string;
    contact: string;
    team_size: number | string;
    team_badge: TeamBadge;
    id_name: string;
    image_url: string;
  }>({
    goods_type: GoodsType.TEAM,
    server_area: ServerArea.IOS_QQ,
    price: '',
    description: '',
    contact: '',
    team_size: '',
    team_badge: TeamBadge.NONE,
    id_name: '',
    image_url: ''
  });

  const [image, setImage] = useState<File | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // 处理图片上传
  const handleImageUpload = async (file: File) => {
    try {
      // 获取当前用户
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !authUser) {
        throw new Error('请先登录');
      }

      // 生成纯 UUID 文件名（不带后缀）
      const fileName = crypto.randomUUID();
      const filePath = `${authUser.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('team-images')
        .upload(filePath, file, {
          contentType: file.type, // 关键：指定 MIME 类型，让 Supabase 识别图片
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('上传错误详情:', uploadError);
        throw uploadError;
      }

      // 获取公开 URL（Supabase 会自动处理，无需加后缀）
      const { data: { publicUrl } } = supabase.storage
        .from('team-images')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('上传图片失败:', error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // 表单验证
    let isValid = true;
    const newErrors: Record<string, string> = {};

    // 验证价格
    const price = typeof formData.price === 'string' ? parseFloat(formData.price) : formData.price;
    if (!price || price <= 0) {
      newErrors.price = '请输入有效的价格（必须大于0）';
      isValid = false;
    }

    // 验证战队人数
    if (formData.goods_type === GoodsType.TEAM || formData.goods_type === GoodsType.TEAM_AND_ID) {
      const teamSize = typeof formData.team_size === 'string' ? parseInt(formData.team_size) : formData.team_size;
      if (!teamSize || teamSize <= 0) {
        newErrors.team_size = '请输入有效的战队人数（必须大于0）';
        isValid = false;
      }
    }

    // 验证ID名称
    if (formData.goods_type === GoodsType.ID || formData.goods_type === GoodsType.TEAM_AND_ID) {
      if (!formData.id_name.trim()) {
        newErrors.id_name = '请输入ID名称';
        isValid = false;
      }
    }

    // 验证商品描述
    if (!formData.description.trim()) {
      newErrors.description = '请输入商品描述';
      isValid = false;
    }

    // 验证联系方式
    if (!formData.contact.trim()) {
      newErrors.contact = '请输入联系方式';
      isValid = false;
    }

    setErrors(newErrors);

    if (!isValid) {
      setError('请检查表单填写是否正确');
      return;
    }

    setLoading(true);

    try {
      let imageUrl = formData.image_url;

      // 上传图片
      if (image) {
        imageUrl = await handleImageUpload(image);
      }

      // 计算战队人数
      const teamSize = formData.goods_type === GoodsType.TEAM || formData.goods_type === GoodsType.TEAM_AND_ID
        ? (typeof formData.team_size === 'string' ? parseInt(formData.team_size) : formData.team_size)
        : 0;

      const submitData: CreateTeamSaleRequest = {
        goods_type: formData.goods_type,
        server_area: formData.server_area,
        price: price,
        description: formData.description,
        contact: formData.contact,
        team_size: teamSize || 0,
        team_badge: formData.team_badge,
        id_name: formData.id_name,
        image_url: imageUrl
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
          {/* 返回主页面导航 */}
          <div className="flex items-center mb-6">
            <button
              className="glass-card px-4 py-2 text-gray-700 hover:text-pink-500 transition-colors flex items-center gap-2"
              onClick={() => router.push('/')}
            >
              <span>←</span> 返回主页面
            </button>
          </div>
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
                onBlur={() => {
                  const price = typeof formData.price === 'string' ? parseFloat(formData.price) : formData.price;
                  if (!price || price <= 0) {
                    setErrors(prev => ({ ...prev, price: '请输入有效的价格（必须大于0）' }));
                  } else {
                    setErrors(prev => {
                      const newErrors = { ...prev };
                      delete newErrors.price;
                      return newErrors;
                    });
                  }
                }}
                min="0.01"
                step="0.01"
                placeholder="请输入价格"
                className={`glass-input w-full px-4 py-3 ${errors.price ? 'border-red-500' : ''}`}
                required
              />
              {errors.price && <p className="mt-1 text-sm text-red-600">{errors.price}</p>}
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
                  onBlur={() => {
                    const teamSize = typeof formData.team_size === 'string' ? parseInt(formData.team_size) : formData.team_size;
                    if (!teamSize || teamSize <= 0) {
                      setErrors(prev => ({ ...prev, team_size: '请输入有效的战队人数（必须大于0）' }));
                    } else {
                      setErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors.team_size;
                        return newErrors;
                      });
                    }
                  }}
                  min="1"
                  placeholder="请输入战队人数"
                  className={`glass-input w-full px-4 py-3 ${errors.team_size ? 'border-red-500' : ''}`}
                  required
                />
                {errors.team_size && <p className="mt-1 text-sm text-red-600">{errors.team_size}</p>}
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
                  onBlur={() => {
                    if (!formData.id_name.trim()) {
                      setErrors(prev => ({ ...prev, id_name: '请输入ID名称' }));
                    } else {
                      setErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors.id_name;
                        return newErrors;
                      });
                    }
                  }}
                  placeholder="请输入ID名称（全区唯一）"
                  className={`glass-input w-full px-4 py-3 ${errors.id_name ? 'border-red-500' : ''}`}
                  required
                />
                {errors.id_name && <p className="mt-1 text-sm text-red-600">{errors.id_name}</p>}
              </div>
            )}

            {/* 商品描述 */}
            <div>
              <label className="block text-gray-700 font-medium mb-2">商品描述 *</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                onBlur={() => {
                  if (!formData.description.trim()) {
                    setErrors(prev => ({ ...prev, description: '请输入商品描述' }));
                  } else {
                    setErrors(prev => {
                      const newErrors = { ...prev };
                      delete newErrors.description;
                      return newErrors;
                    });
                  }
                }}
                rows={4}
                placeholder="请详细描述商品信息，包括特点、优势等"
                className={`glass-input w-full px-4 py-3 ${errors.description ? 'border-red-500' : ''}`}
                required
              ></textarea>
              {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
            </div>

            {/* 联系方式 */}
            <div>
              <label className="block text-gray-700 font-medium mb-2">联系方式 *</label>
              <input
                type="text"
                name="contact"
                value={formData.contact}
                onChange={handleChange}
                onBlur={() => {
                  if (!formData.contact.trim()) {
                    setErrors(prev => ({ ...prev, contact: '请输入联系方式' }));
                  } else {
                    setErrors(prev => {
                      const newErrors = { ...prev };
                      delete newErrors.contact;
                      return newErrors;
                    });
                  }
                }}
                placeholder="请输入QQ或微信等联系方式"
                className={`glass-input w-full px-4 py-3 ${errors.contact ? 'border-red-500' : ''}`}
                required
              />
              {errors.contact && <p className="mt-1 text-sm text-red-600">{errors.contact}</p>}
            </div>

            {/* 商品图片 */}
            <div>
              <label className="block text-gray-700 font-medium mb-2">商品图片</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setImage(e.target.files[0]);
                  }
                }}
                className="glass-input w-full px-4 py-3"
              />
              {formData.image_url && (
                <div className="mt-2">
                  <img
                    src={formData.image_url}
                    alt="商品图片"
                    className="w-32 h-32 object-cover rounded-lg"
                  />
                </div>
              )}
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

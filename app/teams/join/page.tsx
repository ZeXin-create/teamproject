'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { getHeroes } from '../../services/teamGroupingService'
import { notifyTeamApplication } from '../../services/notificationService'
import { Position, Hero, AvailableTime } from '../../types/teamGrouping'
import Navbar from '../../components/Navbar'
import PageLayout from '../../components/layout/PageLayout'
import ErrorBoundary from '../../components/ErrorBoundary'

interface Team {
  id: string
  name: string
  region: string
  province: string
  city: string
  district?: string
  declaration?: string
  avatar_url?: string
}

export default function JoinTeamPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRegion, setSelectedRegion] = useState('')
  const [teams, setTeams] = useState<Team[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const [showApplicationForm, setShowApplicationForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [heroes, setHeroes] = useState<Hero[]>([])

  const { user } = useAuth()
    
  // 获取英雄列表
  const fetchHeroes = useCallback(async () => {
    try {
      const heroesData = await getHeroes()
      setHeroes(heroesData)
    } catch (err) {
      console.error('获取英雄列表失败:', err)
    }
  }, [])

  useEffect(() => {
    fetchHeroes()
  }, [fetchHeroes])

  // 游戏资料表单数据
  const [formData, setFormData] = useState<{
    gameId: string;
    currentRank: string;
    mainPositions: Position[];
    positionStats: Record<string, {
      winRate: string;
      kda: string;
      rating: string;
      power: string;
      heroes: number[];
    }>;
    availableTime: AvailableTime[];
    acceptPositionAdjustment: boolean;
  }>({
    gameId: '',
    currentRank: '',
    mainPositions: [] as Position[],
    positionStats: {
      '上单': { winRate: '', kda: '', rating: '', power: '', heroes: [] },
      '打野': { winRate: '', kda: '', rating: '', power: '', heroes: [] },
      '中单': { winRate: '', kda: '', rating: '', power: '', heroes: [] },
      '射手': { winRate: '', kda: '', rating: '', power: '', heroes: [] },
      '辅助': { winRate: '', kda: '', rating: '', power: '', heroes: [] }
    },
    availableTime: [] as AvailableTime[],
    acceptPositionAdjustment: false
  })

  // 错误信息状态
  const [errors, setErrors] = useState<{
    gameId?: string;
    currentRank?: string;
    mainPositions?: string;
    positionStats?: Record<string, {
      winRate?: string;
      kda?: string;
      rating?: string;
      power?: string;
      heroes?: string;
    }>;
    availableTime?: string;
  }>({
    positionStats: {
      '上单': {},
      '打野': {},
      '中单': {},
      '射手': {},
      '辅助': {}
    }
  })

  const [newTimeSlot, setNewTimeSlot] = useState({
    day: '周五',
    startTime: '12:00',
    endTime: '23:59'
  })
          
  const positions: Position[] = ['上单', '打野', '中单', '射手', '辅助']
  const days = ['周五', '周六', '周日']
  const ranks = [
    '倔强青铜',
    '秩序白银',
    '荣耀黄金',
    '尊贵铂金',
    '永恒钻石',
    '至尊星耀',
    '最强王者',
    '无双王者',
    '荣耀王者',
    '传奇王者'
  ]

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSearching(true)
    setError('')

    try {
      let query = supabase
        .from('teams')
        .select('*')
        .ilike('name', `%${searchQuery}%`)
                    
      if (selectedRegion) {
        query = query.eq('region', selectedRegion)
      }
                
      const { data, error } = await query

      if (error) {
        throw error
      }

      setTeams((data as Team[]) || [])
    } catch (err: unknown) {
      console.error('搜索战队失败:', err)
      setError(typeof err === 'object' && err !== null && 'message' in err ? String(err.message) : '搜索战队失败，请稍后重试')
    } finally {  
      setIsSearching(false)
    }
  }

  // 实时校验函数
  const validateField = (field: string, value: string | string[] | number[] | boolean | AvailableTime[], position?: string, statField?: string) => {
    let errorMessage = '';

    switch (field) {
      case 'gameId':
        if (typeof value !== 'string' || !value.trim()) {
          errorMessage = '请输入游戏ID';
        }
        break;
      case 'currentRank':
        if (!value) {
          errorMessage = '请选择当前段位';
        }
        break;
      case 'mainPositions':
        if (!Array.isArray(value) || value.length === 0) {
          errorMessage = '请至少选择一个擅长位置';
        }
        break;
      case 'availableTime':
        if (!Array.isArray(value) || value.length === 0) {
          errorMessage = '请至少添加一个可比赛时间段';
        }
        break;
      case 'positionStats':
        if (position && statField) {
          switch (statField) {
            case 'winRate':
              if (!value) {
                errorMessage = '请输入胜率';
              } else if (Number(value) < 0 || Number(value) > 100) {
                errorMessage = '胜率必须在0-100之间';
              }
              break;
            case 'kda':
              if (!value) {
                errorMessage = '请输入KDA';
              } else if (Number(value) < 0 || Number(value) > 20) {
                errorMessage = 'KDA必须在0-20之间';
              }
              break;
            case 'rating':
              if (!value) {
                errorMessage = '请输入评分';
              } else if (Number(value) < 0 || Number(value) > 100) {
                errorMessage = '评分必须在0-100之间';
              }
              break;
            case 'power':
              if (!value) {
                errorMessage = '请输入战力';
              } else if (Number(value) < 0 || Number(value) > 99999) {
                errorMessage = '战力必须在0-99999之间';
              }
              break;
            case 'heroes':
              if (!Array.isArray(value) || value.length === 0) {
                errorMessage = '请至少选择一个常用英雄';
              }
              break;
          }
        }
        break;
    }

    return errorMessage;
  };

  const handlePositionChange = (position: Position) => {
    setFormData(prev => {
      const currentPositions = [...prev.mainPositions]
      if (currentPositions.includes(position)) {
        const newPositions = currentPositions.filter(p => p !== position);
        setErrors(prevErrors => ({
          ...prevErrors,
          mainPositions: validateField('mainPositions', newPositions)
        }));
        return {
          ...prev,
          mainPositions: newPositions
        }
      } else {
        // 限制最多选择2个位置
        if (currentPositions.length >= 2) {
          setError('最多只能选择2个擅长位置')
          return prev
        }
        const newPositions = [...currentPositions, position];
        setErrors(prevErrors => ({
          ...prevErrors,
          mainPositions: validateField('mainPositions', newPositions)
        }));
        return {
          ...prev,
          mainPositions: newPositions
        }
      }
    })
  }

  const handleHeroChange = (heroId: number, position: Position) => {
    setFormData(prev => {
      const hero = heroes.find(h => h.id === heroId)
      if (!hero) return prev

      const currentHeroes = [...prev.positionStats[position].heroes]
      if (currentHeroes.includes(heroId)) {
        // 移除英雄
        const newHeroes = currentHeroes.filter(id => id !== heroId);
        setErrors(prevErrors => ({
          ...prevErrors,
          positionStats: {
            ...prevErrors.positionStats!,
            [position]: {
              ...prevErrors.positionStats![position],
              heroes: validateField('positionStats', newHeroes, position, 'heroes')
            }
          }
        }));
        return {
          ...prev,
          positionStats: {
            ...prev.positionStats,
            [position]: {
              ...prev.positionStats[position],
              heroes: newHeroes
            }
          }
        }
      } else {
        // 添加英雄，每个位置最多3个
        if (currentHeroes.length >= 3) {
          setError('每个位置最多选择3个英雄')
          return prev
        }
        const newHeroes = [...currentHeroes, heroId];
        setErrors(prevErrors => ({
          ...prevErrors,
          positionStats: {
            ...prevErrors.positionStats!,
            [position]: {
              ...prevErrors.positionStats![position],
              heroes: validateField('positionStats', newHeroes, position, 'heroes')
            }
          }
        }));
        return {
          ...prev,
          positionStats: {
            ...prev.positionStats,
            [position]: {
              ...prev.positionStats[position],
              heroes: newHeroes
            }
          }
        }
      }
    })
  }

  // 处理时间槽添加和删除的校验
  const handleAddTimeSlot = () => {
    setFormData(prev => {
      const newAvailableTime = [...prev.availableTime, {
        day: newTimeSlot.day,
        start_time: newTimeSlot.startTime,
        end_time: newTimeSlot.endTime
      }];
      setErrors(prevErrors => ({
        ...prevErrors,
        availableTime: validateField('availableTime', newAvailableTime)
      }));
      return {
        ...prev,
        availableTime: newAvailableTime
      };
    });
    // 重置表单
    setNewTimeSlot({
      day: '周五',
      startTime: '12:00',
      endTime: '23:59'
    });
  };

  const handleRemoveTimeSlot = (index: number) => {
    setFormData(prev => {
      const newAvailableTime = prev.availableTime.filter((_, i) => i !== index);
      setErrors(prevErrors => ({
        ...prevErrors,
        availableTime: validateField('availableTime', newAvailableTime)
      }));
      return {
        ...prev,
        availableTime: newAvailableTime
      };
    });
  };

  const handleTimeSlotChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>, field: string) => {
    setNewTimeSlot(prev => ({
      ...prev,
      [field]: e.target.value
    }))
  }



  const handleJoin = (teamId: string) => {
    if (!user) {
      setError('请先登录')
      return
    }

    setSelectedTeamId(teamId)
    setShowApplicationForm(true)
  }

  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTeamId || !user) return

    // 表单验证
    let isValid = true;
    const newErrors: {
      gameId?: string;
      currentRank?: string;
      mainPositions?: string;
      availableTime?: string;
      positionStats: Record<string, {
        winRate?: string;
        kda?: string;
        rating?: string;
        power?: string;
        heroes?: string;
      }>;
    } = {
      positionStats: {
        '上单': {},
        '打野': {},
        '中单': {},
        '射手': {},
        '辅助': {}
      }
    };

    // 验证基本信息
    newErrors.gameId = validateField('gameId', formData.gameId);
    newErrors.currentRank = validateField('currentRank', formData.currentRank);
    newErrors.mainPositions = validateField('mainPositions', formData.mainPositions);
    newErrors.availableTime = validateField('availableTime', formData.availableTime);

    // 验证每个选中位置的英雄和数据
    for (const position of formData.mainPositions) {
      newErrors.positionStats[position].winRate = validateField('positionStats', formData.positionStats[position].winRate, position, 'winRate');
      newErrors.positionStats[position].kda = validateField('positionStats', formData.positionStats[position].kda, position, 'kda');
      newErrors.positionStats[position].rating = validateField('positionStats', formData.positionStats[position].rating, position, 'rating');
      newErrors.positionStats[position].power = validateField('positionStats', formData.positionStats[position].power, position, 'power');
      newErrors.positionStats[position].heroes = validateField('positionStats', formData.positionStats[position].heroes, position, 'heroes');
    }

    // 检查是否有错误
    for (const key in newErrors) {
      if (key === 'positionStats') {
        for (const position in newErrors.positionStats) {
          const positionStats = newErrors.positionStats[position];
          if (positionStats.winRate || positionStats.kda || positionStats.rating || positionStats.power || positionStats.heroes) {
            isValid = false;
          }
        }
      } else if (key === 'gameId' && newErrors.gameId) {
        isValid = false;
      } else if (key === 'currentRank' && newErrors.currentRank) {
        isValid = false;
      } else if (key === 'mainPositions' && newErrors.mainPositions) {
        isValid = false;
      } else if (key === 'availableTime' && newErrors.availableTime) {
        isValid = false;
      }
    }

    setErrors(newErrors);

    if (!isValid) {
      setError('请检查表单填写是否正确');
      return;
    }

    setLoading(true)
    try {
      // 检查是否已经在战队中
      const { data: existingMember } = await supabase
        .from('team_members')
        .select('id, role')
        .eq('user_id', user.id)
        .eq('status', 'active')

      if (existingMember && existingMember.length > 0) {
        // 检查是否是队长
        const isCaptain = (existingMember as Array<{ role: string }>).some(member => member.role === '队长')
        if (isCaptain) {
          setError('您是一个战队的队长，不能加入其他战队')
        } else {
          setError('您已经加入了一个战队')
        }
        return
      }

      // 检查是否已经申请过
      const { data: existingApplications } = await supabase
        .from('team_applications')
        .select('id')
        .eq('user_id', user.id)
        .eq('team_id', selectedTeamId)
        .eq('status', 'pending')

      if (existingApplications && existingApplications.length > 0) {
        setError('您已经申请过这个战队')
        return
      }

      // 提交申请，包含游戏资料（队长同意后才会保存到player_profiles）
      console.log('Submitting application with data:', {
        user_id: user.id,
        team_id: selectedTeamId,
        game_id: formData.gameId,
        current_rank: formData.currentRank,
        main_positions: formData.mainPositions,
        position_stats: formData.positionStats,
        available_time: formData.availableTime,
        accept_position_adjustment: formData.acceptPositionAdjustment
      });

      const { error: insertError } = await supabase
        .from('team_applications')
        .insert({
          user_id: user.id,
          team_id: selectedTeamId,
          game_id: formData.gameId,
          current_rank: formData.currentRank,
          main_positions: formData.mainPositions,
          position_stats: formData.positionStats,
          available_time: formData.availableTime,
          accept_position_adjustment: formData.acceptPositionAdjustment
        });

      if (insertError) {
        console.error('Error submitting application:', insertError);
        throw new Error(`提交申请失败: ${typeof insertError === 'object' && insertError !== null && 'message' in insertError ? insertError.message : String(insertError)}`);
      }

      console.log('Application submitted successfully');

      // 通知战队队长
      await notifyTeamApplication(selectedTeamId, formData.gameId, user.id)

      setSuccess('申请加入战队成功！等待队长审批')
      setShowApplicationForm(false)
      setSelectedTeamId(null)
      // 重置表单
      setFormData({
        gameId: '',
        currentRank: '',
        mainPositions: [] as Position[],
        positionStats: {
          '上单': { winRate: '', kda: '', rating: '', power: '', heroes: [] },
          '打野': { winRate: '', kda: '', rating: '', power: '', heroes: [] },
          '中单': { winRate: '', kda: '', rating: '', power: '', heroes: [] },
          '射手': { winRate: '', kda: '', rating: '', power: '', heroes: [] },
          '辅助': { winRate: '', kda: '', rating: '', power: '', heroes: [] }
        },
        availableTime: [] as AvailableTime[],
        acceptPositionAdjustment: false
      })
    } catch (err: unknown) {
      console.error('申请加入战队失败:', err)
      setError(typeof err === 'object' && err !== null && 'message' in err ? String(err.message) : '申请加入战队失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ErrorBoundary>
    <div className="min-h-screen bg-gradient-to-br from-white to-pink-50">
      <Navbar />
      <PageLayout>
      <div className="container mx-auto px-4 py-8">
        {/* 顶部导航 */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          {/* 左侧返回按钮 */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.history.back()
                }
              }}
              className="flex items-center justify-center w-12 h-12 rounded-xl text-gray-700 hover:text-pink-500 hover:bg-white/80 transition-all duration-300 font-medium shadow-sm border border-white/50"
              title="返回上一页"
            >
              <span className="text-lg">←</span>
            </button>
            <button
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.location.href = '/'
                }
              }}
              className="flex items-center justify-center w-12 h-12 rounded-xl text-gray-700 hover:text-pink-500 hover:bg-white/80 transition-all duration-300 font-medium shadow-sm border border-white/50"
              title="返回主页面"
            >
              <span className="text-xl">🏠</span>
            </button>
          </div>
          
          {/* 中间标题 */}
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold gradient-text text-center">加入战队</h1>
          </div>
          
          {/* 右侧占位 */}
          <div className="w-24"></div>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-50 text-red-700 rounded-2xl border border-red-100 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">❌</span>
              <span>{error}</span>
            </div>
          </motion.div>
        )}

        {success && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-green-50 text-green-700 rounded-2xl border border-green-100 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">✅</span>
              <span>{success}</span>
            </div>
          </motion.div>
        )}

        {!showApplicationForm ? (
          <>
            <motion.form 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              onSubmit={handleSearch} 
              className="mb-8"
            >
              <div className="flex flex-col md:flex-row gap-3">
                <input
                  type="text"
                  className="flex-1 px-5 py-3 border border-gray-200 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent transition-all duration-300"
                  placeholder="搜索战队名称"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <select
                  className="px-5 py-3 border border-gray-200 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent transition-all duration-300"
                  value={selectedRegion}
                  onChange={(e) => setSelectedRegion(e.target.value)}
                >
                  <option value="">所有大区</option>
                  <option value="安卓QQ">安卓QQ</option>
                  <option value="安卓微信">安卓微信</option>
                  <option value="iOS QQ">iOS QQ</option>
                  <option value="iOS 微信">iOS 微信</option>
                </select>
                <button
                  type="submit"
                  className="px-8 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-2xl hover:from-pink-600 hover:to-purple-600 transition-all duration-300 font-medium shadow-sm hover:shadow-md flex items-center justify-center gap-2"
                  disabled={isSearching}
                >
                  {isSearching && (
                    <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  )}
                  {isSearching ? '搜索中...' : '搜索'}
                </button>
              </div>
            </motion.form>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {teams.length > 0 ? (
                teams.map((team, index) => (
                  <motion.div 
                    key={team.id} 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ y: -8, boxShadow: '0 15px 30px -10px rgba(236, 72, 153, 0.2)' }}
                    className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-pink-100/50 shadow-sm hover:shadow-md transition-all duration-300"
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <div className="relative">
                        {team.avatar_url ? (
                          <div className="w-20 h-20 rounded-2xl overflow-hidden border-3 border-white shadow-lg">
                            <Image
                              src={team.avatar_url}
                              alt={team.name}
                              width={80}
                              height={80}
                              className="object-cover w-full h-full transition-transform duration-500 hover:scale-110"
                            />
                          </div>
                        ) : (
                          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white text-3xl font-bold border-3 border-white shadow-lg">
                            {team.name?.charAt(0).toUpperCase() || '战'}
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-800 mb-2">{team.name}</h3>
                        <div className="flex flex-wrap gap-2 mb-2">
                          <span className="px-3 py-1 bg-pink-100 text-pink-700 rounded-full text-sm font-medium shadow-sm">
                            {team.region}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 font-medium">{team.province} {team.city} {team.district || ''}</p>
                      </div>
                    </div>
                    <p className="text-gray-600 mb-6 line-clamp-2">{team.declaration || '暂无宣言'}</p>
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white py-3 rounded-xl hover:from-pink-600 hover:to-purple-600 transition-all duration-300 font-medium shadow-sm hover:shadow-md"
                      onClick={() => handleJoin(team.id)}
                    >
                      申请加入
                    </motion.button>
                  </motion.div>
                ))
              ) : (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="col-span-full text-center py-16 bg-white/50 rounded-2xl border border-pink-100/50"
                >
                  <div className="text-7xl mb-6">🔍</div>
                  <h3 className="text-xl font-bold text-gray-800 mb-4">未找到战队</h3>
                  <p className="text-gray-600 mb-6">请尝试使用其他关键词搜索</p>
                </motion.div>
              )}
            </motion.div>
          </>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-4xl mx-auto"
          >
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-pink-100/50 shadow-sm">
              <h2 className="text-2xl font-bold mb-6 gradient-text text-center">填写游戏资料</h2>
              <form onSubmit={handleSubmitApplication} className="space-y-6">
                {/* 游戏ID */}
                <div>
                  <label htmlFor="gameId" className="block text-gray-700 font-medium mb-3">
                    游戏ID *
                  </label>
                  <input
                    type="text"
                    id="gameId"
                    value={formData.gameId}
                    onChange={(e) => setFormData(prev => ({ ...prev, gameId: e.target.value }))}
                    onBlur={(e) => setErrors(prev => ({ ...prev, gameId: validateField('gameId', e.target.value) }))}
                    className={`w-full px-5 py-3 border rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent transition-all duration-300 ${errors.gameId ? 'border-red-500' : 'border-gray-200'}`}
                    required
                    placeholder="请输入王者荣耀游戏ID"
                  />
                  {errors.gameId && <p className="mt-2 text-sm text-red-600">{errors.gameId}</p>}
                </div>

                {/* 当前段位 */}
                <div>
                  <label htmlFor="currentRank" className="block text-gray-700 font-medium mb-3">
                    当前段位 *
                  </label>
                  <select
                    id="currentRank"
                    value={formData.currentRank}
                    onChange={(e) => setFormData(prev => ({ ...prev, currentRank: e.target.value }))}
                    onBlur={(e) => setErrors(prev => ({ ...prev, currentRank: validateField('currentRank', e.target.value) }))}
                    className={`w-full px-5 py-3 border rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent transition-all duration-300 ${errors.currentRank ? 'border-red-500' : 'border-gray-200'}`}
                    required
                  >
                    <option value="">选择当前段位</option>
                    {ranks.map((rank) => (
                      <option key={rank} value={rank}>
                        {rank}
                      </option>
                    ))}
                  </select>
                  {errors.currentRank && <p className="mt-2 text-sm text-red-600">{errors.currentRank}</p>}
                </div>

                {/* 常用位置 */}
                <div>
                  <label className="block text-gray-700 font-medium mb-4">
                    擅长位置 * (最多选择2个)
                  </label>
                  <div className="flex flex-wrap gap-4">
                    {positions.map(position => (
                      <motion.button
                        key={position}
                        type="button"
                        onClick={() => handlePositionChange(position)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={`px-5 py-3 rounded-2xl border-2 transition-all duration-300 ${formData.mainPositions.includes(position) ? 'border-blue-500 bg-blue-100 text-blue-600 shadow-sm' : 'border-gray-200 text-gray-600 hover:border-blue-300'}`}
                      >
                        {position}
                      </motion.button>
                    ))}
                  </div>
                  {errors.mainPositions && <p className="mt-2 text-sm text-red-600">{errors.mainPositions}</p>}
                </div>

                {/* 位置数据 */}
                {formData.mainPositions.map(position => (
                  <motion.div 
                    key={position} 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="border border-gray-200 rounded-2xl p-6 bg-white/50 shadow-sm"
                  >
                    <h3 className="text-xl font-medium text-gray-800 mb-6">{position}数据</h3>

                    {/* 胜率、KDA、评分、战力 */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                      <div>
                        <label className="block text-gray-700 font-medium mb-3">
                          胜率 *
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={formData.positionStats[position].winRate}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '' || (Number(value) >= 0 && Number(value) <= 100)) {
                              setFormData(prev => ({
                                ...prev,
                                positionStats: {
                                  ...prev.positionStats,
                                  [position]: {
                                    ...prev.positionStats[position],
                                    winRate: value
                                  }
                                }
                              }));
                            }
                          }}
                          onBlur={(e) => setErrors(prev => ({
                            ...prev,
                            positionStats: {
                              ...prev.positionStats!,
                              [position]: {
                                ...prev.positionStats![position],
                                winRate: validateField('positionStats', e.target.value, position, 'winRate')
                              }
                            }
                          }))}
                          className={`w-full px-4 py-2 border rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent transition-all duration-300 ${errors.positionStats?.[position]?.winRate ? 'border-red-500' : 'border-gray-200'}`}
                          placeholder="0-100"
                        />
                        {errors.positionStats?.[position]?.winRate && <p className="mt-1 text-sm text-red-600">{errors.positionStats[position].winRate}</p>}
                      </div>
                      <div>
                        <label className="block text-gray-700 font-medium mb-3">
                          KDA *
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="20"
                          step="0.1"
                          value={formData.positionStats[position].kda}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '' || (Number(value) >= 0 && Number(value) <= 20)) {
                              setFormData(prev => ({
                                ...prev,
                                positionStats: {
                                  ...prev.positionStats,
                                  [position]: {
                                    ...prev.positionStats[position],
                                    kda: value
                                  }
                                }
                              }));
                            }
                          }}
                          onBlur={(e) => setErrors(prev => ({
                            ...prev,
                            positionStats: {
                              ...prev.positionStats!,
                              [position]: {
                                ...prev.positionStats![position],
                                kda: validateField('positionStats', e.target.value, position, 'kda')
                              }
                            }
                          }))}
                          className={`w-full px-4 py-2 border rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent transition-all duration-300 ${errors.positionStats?.[position]?.kda ? 'border-red-500' : 'border-gray-200'}`}
                          placeholder="0-20"
                        />
                        {errors.positionStats?.[position]?.kda && <p className="mt-1 text-sm text-red-600">{errors.positionStats[position].kda}</p>}
                      </div>
                      <div>
                        <label className="block text-gray-700 font-medium mb-3">
                          评分 *
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={formData.positionStats[position].rating}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '' || (Number(value) >= 0 && Number(value) <= 100)) {
                              setFormData(prev => ({
                                ...prev,
                                positionStats: {
                                  ...prev.positionStats,
                                  [position]: {
                                    ...prev.positionStats[position],
                                    rating: value
                                  }
                                }
                              }));
                            }
                          }}
                          onBlur={(e) => setErrors(prev => ({
                            ...prev,
                            positionStats: {
                              ...prev.positionStats!,
                              [position]: {
                                ...prev.positionStats![position],
                                rating: validateField('positionStats', e.target.value, position, 'rating')
                              }
                            }
                          }))}
                          className={`w-full px-4 py-2 border rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent transition-all duration-300 ${errors.positionStats?.[position]?.rating ? 'border-red-500' : 'border-gray-200'}`}
                          placeholder="0-100"
                        />
                        {errors.positionStats?.[position]?.rating && <p className="mt-1 text-sm text-red-600">{errors.positionStats[position].rating}</p>}
                      </div>
                      <div>
                        <label className="block text-gray-700 font-medium mb-3">
                          战力 *
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="99999"
                          step="1"
                          value={formData.positionStats[position].power}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '' || (Number(value) >= 0 && Number(value) <= 99999)) {
                              setFormData(prev => ({
                                ...prev,
                                positionStats: {
                                  ...prev.positionStats,
                                  [position]: {
                                    ...prev.positionStats[position],
                                    power: value
                                  }
                                }
                              }));
                            }
                          }}
                          onBlur={(e) => setErrors(prev => ({
                            ...prev,
                            positionStats: {
                              ...prev.positionStats!,
                              [position]: {
                                ...prev.positionStats![position],
                                power: validateField('positionStats', e.target.value, position, 'power')
                              }
                            }
                          }))}
                          className={`w-full px-4 py-2 border rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent transition-all duration-300 ${errors.positionStats?.[position]?.power ? 'border-red-500' : 'border-gray-200'}`}
                          placeholder="0-99999"
                        />
                        {errors.positionStats?.[position]?.power && <p className="mt-1 text-sm text-red-600">{errors.positionStats[position].power}</p>}
                      </div>
                    </div>

                    {/* 常用英雄 */}
                    <div>
                      <label className="block text-gray-700 font-medium mb-3">
                        常用英雄 * (最多选择3个)
                      </label>
                      <div className={`flex flex-wrap gap-2 max-h-48 overflow-y-auto p-3 border rounded-xl shadow-sm ${errors.positionStats?.[position]?.heroes ? 'border-red-500' : 'border-gray-200'}`}>
                        {heroes
                          .filter(hero => hero.position === position)
                          .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
                          .map(hero => (
                            <motion.button
                              key={hero.id}
                              type="button"
                              onClick={() => handleHeroChange(hero.id, position)}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              className={`px-3 py-2 rounded-full text-sm border-2 transition-all duration-300 ${formData.positionStats[position].heroes.includes(hero.id) ? 'border-purple-500 bg-purple-100 text-purple-600 shadow-sm' : 'border-gray-200 text-gray-600 hover:border-purple-300'}`}
                            >
                              {hero.name}
                            </motion.button>
                          ))}
                      </div>
                      {errors.positionStats?.[position]?.heroes && <p className="mt-2 text-sm text-red-600">{errors.positionStats[position].heroes}</p>}
                    </div>
                  </motion.div>
                ))}

                {/* 可比赛时间段 */}
                <div>
                  <label className="block text-gray-700 font-medium mb-4">
                    可比赛时间段 *
                  </label>
                  <div className="space-y-4">
                    {formData.availableTime.map((time, index) => (
                      <motion.div 
                        key={index} 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center gap-3 p-3 bg-white/50 rounded-xl border border-gray-100 shadow-sm"
                      >
                        <span className="w-20 text-gray-700 font-medium">{time.day}</span>
                        <span className="w-24 text-gray-700">{time.start_time}</span>
                        <span className="w-8 text-gray-400">至</span>
                        <span className="w-24 text-gray-700">{time.end_time}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTimeSlot(index)}
                          className="px-3 py-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                        >
                          删除
                        </button>
                      </motion.div>
                    ))}
                    <div className="flex flex-col sm:flex-row items-center gap-3 p-4 bg-white/50 rounded-xl border border-dashed border-gray-200">
                      <select
                        value={newTimeSlot.day}
                        onChange={(e) => handleTimeSlotChange(e, 'day')}
                        className="w-full sm:w-24 px-4 py-2 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent transition-all duration-300"
                      >
                        {days.map(day => (
                          <option key={day} value={day}>{day}</option>
                        ))}
                      </select>
                      <input
                        type="time"
                        value={newTimeSlot.startTime}
                        onChange={(e) => handleTimeSlotChange(e, 'startTime')}
                        className="w-full sm:w-28 px-4 py-2 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent transition-all duration-300"
                      />
                      <span className="w-8 text-gray-400 text-center">至</span>
                      <input
                        type="time"
                        value={newTimeSlot.endTime}
                        onChange={(e) => handleTimeSlotChange(e, 'endTime')}
                        className="w-full sm:w-28 px-4 py-2 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent transition-all duration-300"
                      />
                      <motion.button
                        type="button"
                        onClick={handleAddTimeSlot}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="px-4 py-2 bg-blue-100 text-blue-600 rounded-xl hover:bg-blue-200 transition-colors shadow-sm"
                      >
                        添加
                      </motion.button>
                    </div>
                  </div>
                  {errors.availableTime && <p className="mt-2 text-sm text-red-600">{errors.availableTime}</p>}
                </div>

                {/* 是否接受位置微调 */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={formData.acceptPositionAdjustment}
                    onChange={(e) => setFormData(prev => ({ ...prev, acceptPositionAdjustment: e.target.checked }))}
                    className="w-5 h-5 accent-pink-500"
                  />
                  <span className="text-gray-700 font-medium">接受位置微调</span>
                </div>

                <div className="flex justify-end gap-4 pt-4">
                  <motion.button
                    type="button"
                    onClick={() => {
                      setShowApplicationForm(false)
                      setSelectedTeamId(null)
                    }}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                    className="px-8 py-3 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all duration-300 font-medium shadow-sm"
                  >
                    取消
                  </motion.button>
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                    className="px-8 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl hover:from-pink-600 hover:to-purple-600 transition-all duration-300 font-medium shadow-sm hover:shadow-md flex items-center justify-center gap-2"
                    disabled={loading}
                  >
                    {loading && (
                      <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    )}
                    {loading ? '提交中...' : '提交申请'}
                  </motion.button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </div>
      </PageLayout>
    </div>
    </ErrorBoundary>
  )
}

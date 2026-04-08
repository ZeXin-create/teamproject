'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import Image from 'next/image'
import { getHeroes } from '../../services/teamGroupingService'
import { notifyTeamApplication } from '../../services/notificationService'
import { Position, Hero, AvailableTime } from '../../types/teamGrouping'
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

      setTeams(data)
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
        const isCaptain = existingMember.some(member => member.role === '队长')
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
      await supabase
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
        })

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
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">加入战队</h1>

        {error && (
          <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-2 bg-green-100 text-green-700 rounded">
            {success}
          </div>
        )}

        {!showApplicationForm ? (
          <>
            <form onSubmit={handleSearch} className="mb-6">
              <div className="flex gap-2">
                <input
                  type="text"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded"
                  placeholder="搜索战队名称"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <select
                  className="px-4 py-2 border border-gray-300 rounded"
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
                  className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  disabled={isSearching}
                >
                  {isSearching ? '搜索中...' : '搜索'}
                </button>
              </div>
            </form>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teams.map((team) => (
                <div key={team.id} className="bg-white p-4 rounded-lg shadow-md">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="relative w-16 h-16 rounded-full overflow-hidden">
                      <Image
                        src={team.avatar_url || 'https://via.placeholder.com/100'}
                        alt={team.name}
                        width={64}
                        height={64}
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">{team.name}</h3>
                      <p className="text-gray-600">{team.region}</p>
                      <p className="text-gray-600">{team.province} {team.city} {team.district || ''}</p>
                    </div>
                  </div>
                  <p className="text-gray-600 mb-4">{team.declaration || '暂无宣言'}</p>
                  <button
                    className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
                    onClick={() => handleJoin(team.id)}
                  >
                    申请加入
                  </button>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl font-bold mb-4">填写游戏资料</h2>
            <form onSubmit={handleSubmitApplication} className="space-y-6">
              {/* 游戏ID */}
              <div>
                <label htmlFor="gameId" className="block text-gray-700 font-medium mb-2">
                  游戏ID *
                </label>
                <input
                  type="text"
                  id="gameId"
                  value={formData.gameId}
                  onChange={(e) => setFormData(prev => ({ ...prev, gameId: e.target.value }))}
                  onBlur={(e) => setErrors(prev => ({ ...prev, gameId: validateField('gameId', e.target.value) }))}
                  className={`w-full px-4 py-2 border rounded ${errors.gameId ? 'border-red-500' : 'border-gray-300'}`}
                  required
                  placeholder="请输入王者荣耀游戏ID"
                />
                {errors.gameId && <p className="mt-1 text-sm text-red-600">{errors.gameId}</p>}
              </div>

              {/* 当前段位 */}
              <div>
                <label htmlFor="currentRank" className="block text-gray-700 font-medium mb-2">
                  当前段位 *
                </label>
                <select
                  id="currentRank"
                  value={formData.currentRank}
                  onChange={(e) => setFormData(prev => ({ ...prev, currentRank: e.target.value }))}
                  onBlur={(e) => setErrors(prev => ({ ...prev, currentRank: validateField('currentRank', e.target.value) }))}
                  className={`w-full px-4 py-2 border rounded ${errors.currentRank ? 'border-red-500' : 'border-gray-300'}`}
                  required
                >
                  <option value="">选择当前段位</option>
                  {ranks.map((rank) => (
                    <option key={rank} value={rank}>
                      {rank}
                    </option>
                  ))}
                </select>
                {errors.currentRank && <p className="mt-1 text-sm text-red-600">{errors.currentRank}</p>}
              </div>

              {/* 常用位置 */}
              <div>
                <label className="block text-gray-700 font-medium mb-3">
                  擅长位置 * (最多选择2个)
                </label>
                <div className="flex flex-wrap gap-3">
                  {positions.map(position => (
                    <button
                      key={position}
                      type="button"
                      onClick={() => handlePositionChange(position)}
                      className={`px-4 py-2 rounded-full border-2 ${formData.mainPositions.includes(position) ? 'border-blue-500 bg-blue-100 text-blue-600' : 'border-gray-300 text-gray-600 hover:border-blue-300'}`}
                    >
                      {position}
                    </button>
                  ))}
                </div>
                {errors.mainPositions && <p className="mt-1 text-sm text-red-600">{errors.mainPositions}</p>}
              </div>

              {/* 位置数据 */}
              {formData.mainPositions.map(position => (
                <div key={position} className="border border-gray-200 rounded-2xl p-4">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">{position}数据</h3>

                  {/* 胜率、KDA、评分、战力 */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <label className="block text-gray-700 font-medium mb-2">
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
                        className={`w-full px-4 py-2 border rounded ${errors.positionStats?.[position]?.winRate ? 'border-red-500' : 'border-gray-300'}`}
                        placeholder="0-100"
                      />
                      {errors.positionStats?.[position]?.winRate && <p className="mt-1 text-sm text-red-600">{errors.positionStats[position].winRate}</p>}
                    </div>
                    <div>
                      <label className="block text-gray-700 font-medium mb-2">
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
                        className={`w-full px-4 py-2 border rounded ${errors.positionStats?.[position]?.kda ? 'border-red-500' : 'border-gray-300'}`}
                        placeholder="0-20"
                      />
                      {errors.positionStats?.[position]?.kda && <p className="mt-1 text-sm text-red-600">{errors.positionStats[position].kda}</p>}
                    </div>
                    <div>
                      <label className="block text-gray-700 font-medium mb-2">
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
                        className={`w-full px-4 py-2 border rounded ${errors.positionStats?.[position]?.rating ? 'border-red-500' : 'border-gray-300'}`}
                        placeholder="0-100"
                      />
                      {errors.positionStats?.[position]?.rating && <p className="mt-1 text-sm text-red-600">{errors.positionStats[position].rating}</p>}
                    </div>
                    <div>
                      <label className="block text-gray-700 font-medium mb-2">
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
                        className={`w-full px-4 py-2 border rounded ${errors.positionStats?.[position]?.power ? 'border-red-500' : 'border-gray-300'}`}
                        placeholder="0-99999"
                      />
                      {errors.positionStats?.[position]?.power && <p className="mt-1 text-sm text-red-600">{errors.positionStats[position].power}</p>}
                    </div>
                  </div>

                  {/* 常用英雄 */}
                  <div>
                    <label className="block text-gray-700 font-medium mb-2">
                      常用英雄 * (最多选择3个)
                    </label>
                    <div className={`flex flex-wrap gap-2 max-h-48 overflow-y-auto p-2 border rounded ${errors.positionStats?.[position]?.heroes ? 'border-red-500' : 'border-gray-300'}`}>
                      {heroes
                        .filter(hero => hero.position === position)
                        .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
                        .map(hero => (
                          <button
                            key={hero.id}
                            type="button"
                            onClick={() => handleHeroChange(hero.id, position)}
                            className={`px-3 py-1 rounded-full text-sm border-2 transition-all ${formData.positionStats[position].heroes.includes(hero.id) ? 'border-purple-500 bg-purple-100 text-purple-600' : 'border-gray-300 text-gray-600 hover:border-purple-300'}`}
                          >
                            {hero.name}
                          </button>
                        ))}
                    </div>
                    {errors.positionStats?.[position]?.heroes && <p className="mt-1 text-sm text-red-600">{errors.positionStats[position].heroes}</p>}
                  </div>
                </div>
              ))}

              {/* 可比赛时间段 */}
              <div>
                <label className="block text-gray-700 font-medium mb-3">
                  可比赛时间段 *
                </label>
                <div className="space-y-4">
                  {formData.availableTime.map((time, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="w-20 text-gray-600">{time.day}</span>
                      <span className="w-24 text-gray-600">{time.start_time}</span>
                      <span className="w-8 text-gray-400">至</span>
                      <span className="w-24 text-gray-600">{time.end_time}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTimeSlot(index)}
                        className="px-2 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200"
                      >
                        删除
                      </button>
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    <select
                      value={newTimeSlot.day}
                      onChange={(e) => handleTimeSlotChange(e, 'day')}
                      className="w-20 px-2 py-2 border border-gray-300 rounded"
                    >
                      {days.map(day => (
                        <option key={day} value={day}>{day}</option>
                      ))}
                    </select>
                    <input
                      type="time"
                      value={newTimeSlot.startTime}
                      onChange={(e) => handleTimeSlotChange(e, 'startTime')}
                      className="w-24 px-2 py-2 border border-gray-300 rounded"
                    />
                    <span className="w-8 text-gray-400">至</span>
                    <input
                      type="time"
                      value={newTimeSlot.endTime}
                      onChange={(e) => handleTimeSlotChange(e, 'endTime')}
                      className="w-24 px-2 py-2 border border-gray-300 rounded"
                    />
                    <button
                      type="button"
                      onClick={handleAddTimeSlot}
                      className="px-3 py-2 bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
                    >
                      添加
                    </button>
                  </div>
                </div>
                {errors.availableTime && <p className="mt-1 text-sm text-red-600">{errors.availableTime}</p>}
              </div>

              {/* 是否接受位置微调 */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.acceptPositionAdjustment}
                    onChange={(e) => setFormData(prev => ({ ...prev, acceptPositionAdjustment: e.target.checked }))}
                    className="w-4 h-4"
                  />
                  <span className="text-gray-700">接受位置微调</span>
                </label>
              </div>

              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowApplicationForm(false)
                    setSelectedTeamId(null)
                  }}
                  className="px-6 py-3 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700"
                  disabled={loading}
                >
                  {loading ? '提交中...' : '提交申请'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
    </ErrorBoundary>
  )
}

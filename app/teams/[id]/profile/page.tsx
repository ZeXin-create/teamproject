'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '../../../context/AuthContext'
import { getHeroes, getPlayerProfile, createOrUpdatePlayerProfile } from '../../../services/teamGroupingService'
import { TeamDataService } from '../../../services/teamDataService'
import { Position, Hero, AvailableTime } from '../../../types/teamGrouping'
import Navbar from '../../../components/Navbar'
import { ProfileSkeleton } from '../../../components/Skeleton'
import { useNotification, NotificationContainer } from '../../../components/Notification'

export default function PlayerProfilePage() {
  const params = useParams()
  const router = useRouter()
  const teamId = params.id as string
  const { user } = useAuth()
  const { success: showSuccess, error: showError } = useNotification()
  const showErrorRef = React.useRef(showError)

  // 当showError变化时更新ref
  useEffect(() => {
    showErrorRef.current = showError
  }, [showError])

  const [loading, setLoading] = useState(true)
  const [heroes, setHeroes] = useState<Hero[]>([])
  const [showProfileCard, setShowProfileCard] = useState(true)
  // 已移除未使用的profile状态

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

  const [newTimeSlot, setNewTimeSlot] = useState({
    day: '周五',
    startTime: '12:00',
    endTime: '23:59'
  })

  const positions: Position[] = ['上单', '打野', '中单', '射手', '辅助']
  const days = ['周五', '周六', '周日']
  const ranks = [
    '最强王者',
    '非凡王者',
    '无双王者',
    '绝世王者',
    '至圣王者',
    '荣耀王者',
    '传奇王者'
  ]

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      // 获取英雄库 - 对接腾讯官网英雄列表接口
      const heroesData = await getHeroes()
      setHeroes(heroesData)

      // 从本地存储获取资料
      const storedProfile = localStorage.getItem(`playerProfile_${user!.id}_${teamId}`)
      if (storedProfile) {
        const parsedProfile = JSON.parse(storedProfile)
        setFormData(parsedProfile)
        // 当获取到资料时，显示资料卡片
        setShowProfileCard(true)
      } else {
        // 获取队员资料
        const profileData = await getPlayerProfile(user!.id, teamId)
        if (profileData) {
          const formDataValue = {
            gameId: profileData.game_id || '',
            currentRank: profileData.current_rank || '',
            mainPositions: profileData.main_positions || [],
            positionStats: {
              '上单': {
                winRate: profileData.position_stats?.['上单']?.win_rate || '',
                kda: profileData.position_stats?.['上单']?.kda || '',
                rating: profileData.position_stats?.['上单']?.rating || '',
                power: profileData.position_stats?.['上单']?.power || '',
                heroes: profileData.position_stats?.['上单']?.heroes || []
              },
              '打野': {
                winRate: profileData.position_stats?.['打野']?.win_rate || '',
                kda: profileData.position_stats?.['打野']?.kda || '',
                rating: profileData.position_stats?.['打野']?.rating || '',
                power: profileData.position_stats?.['打野']?.power || '',
                heroes: profileData.position_stats?.['打野']?.heroes || []
              },
              '中单': {
                winRate: profileData.position_stats?.['中单']?.win_rate || '',
                kda: profileData.position_stats?.['中单']?.kda || '',
                rating: profileData.position_stats?.['中单']?.rating || '',
                power: profileData.position_stats?.['中单']?.power || '',
                heroes: profileData.position_stats?.['中单']?.heroes || []
              },
              '射手': {
                winRate: profileData.position_stats?.['射手']?.win_rate || '',
                kda: profileData.position_stats?.['射手']?.kda || '',
                rating: profileData.position_stats?.['射手']?.rating || '',
                power: profileData.position_stats?.['射手']?.power || '',
                heroes: profileData.position_stats?.['射手']?.heroes || []
              },
              '辅助': {
                winRate: profileData.position_stats?.['辅助']?.win_rate || '',
                kda: profileData.position_stats?.['辅助']?.kda || '',
                rating: profileData.position_stats?.['辅助']?.rating || '',
                power: profileData.position_stats?.['辅助']?.power || '',
                heroes: profileData.position_stats?.['辅助']?.heroes || []
              }
            },
            availableTime: profileData.available_time || [],
            acceptPositionAdjustment: profileData.accept_position_adjustment || false
          }
          setFormData(formDataValue)
          // 保存到本地存储
          localStorage.setItem(`playerProfile_${user!.id}_${teamId}`, JSON.stringify(formDataValue))
          // 当获取到资料时，显示资料卡片
          setShowProfileCard(true)
        }
      }
    } catch (err) {
      console.error('获取数据失败:', err)
      showErrorRef.current(err instanceof Error ? err.message : '获取数据失败')
    } finally {
      setLoading(false)
    }
  }, [teamId, user])

  useEffect(() => {
    if (user && teamId) {
      fetchData()
    }
  }, [user, teamId, fetchData])

  const handlePositionChange = (position: Position) => {
    setFormData(prev => {
      const currentPositions = [...prev.mainPositions]
      if (currentPositions.includes(position)) {
        return {
          ...prev,
          mainPositions: currentPositions.filter(p => p !== position)
        }
      } else {
        // 限制最多选择2个位置
        if (currentPositions.length >= 2) {
          showError('最多只能选择2个擅长位置')
          return prev
        }
        return {
          ...prev,
          mainPositions: [...currentPositions, position]
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
        return {
          ...prev,
          positionStats: {
            ...prev.positionStats,
            [position]: {
              ...prev.positionStats[position],
              heroes: currentHeroes.filter(id => id !== heroId)
            }
          }
        }
      } else {
        // 添加英雄，每个位置最多3个
        if (currentHeroes.length >= 3) {
          showError('每个位置最多选择3个英雄')
          return prev
        }
        return {
          ...prev,
          positionStats: {
            ...prev.positionStats,
            [position]: {
              ...prev.positionStats[position],
              heroes: [...currentHeroes, heroId]
            }
          }
        }
      }
    })
  }

  const handleTimeSlotChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>, field: string) => {
    setNewTimeSlot(prev => ({
      ...prev,
      [field]: e.target.value
    }))
  }

  const addTimeSlot = () => {
    setFormData(prev => ({
      ...prev,
      availableTime: [...prev.availableTime, {
        day: newTimeSlot.day,
        start_time: newTimeSlot.startTime,
        end_time: newTimeSlot.endTime
      }]
    }))
    // 重置表单
    setNewTimeSlot({
      day: '周五',
      startTime: '12:00',
      endTime: '23:59'
    })
  }

  const removeTimeSlot = (index: number) => {
    setFormData(prev => ({
      ...prev,
      availableTime: prev.availableTime.filter((_, i) => i !== index)
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // 表单验证
    if (!formData.gameId) {
      showError('请输入游戏ID')
      return
    }

    if (!formData.currentRank) {
      showError('请选择当前段位')
      return
    }

    if (formData.mainPositions.length === 0) {
      showError('请至少选择一个常用位置')
      return
    }

    if (formData.availableTime.length === 0) {
      showError('请至少添加一个可比赛时间段')
      return
    }

    // 验证每个选中位置的英雄和数据
    for (const position of formData.mainPositions) {
      const stats = formData.positionStats[position]
      if (stats.heroes.length === 0) {
        showError(`请为${position}位置选择至少一个常用英雄`)
        return
      }
      if (!stats.winRate) {
        showError(`请输入${position}位置的胜率`)
        return
      }
      if (!stats.kda) {
        showError(`请输入${position}位置的KDA`)
        return
      }
      if (!stats.rating) {
        showError(`请输入${position}位置的评分`)
        return
      }
      if (!stats.power) {
        showError(`请输入${position}位置的战力`)
        return
      }
    }

    setLoading(true)
    try {
      // 提取所有选中的英雄ID，并去重以避免409 Conflict错误
      const heroIds = Array.from(new Set(formData.mainPositions.flatMap(position => formData.positionStats[position].heroes)))

      // 保存游戏资料
      await createOrUpdatePlayerProfile(user!.id, teamId, {
        current_rank: formData.currentRank,
        main_positions: formData.mainPositions,
        available_time: formData.availableTime,
        accept_position_adjustment: formData.acceptPositionAdjustment,
        hero_ids: heroIds
      })

      // 保存个人数据
      await TeamDataService.updatePlayerProfile(user!.id, teamId, {
        current_rank: formData.currentRank,
        rank_updated_at: new Date().toISOString()
      })

      // 保存到本地存储
      localStorage.setItem(`playerProfile_${user!.id}_${teamId}`, JSON.stringify(formData))

      showSuccess('资料保存成功！')
      setShowProfileCard(true)
    } catch (err) {
      console.error('保存资料失败:', err)
      showError(err instanceof Error ? err.message : '保存失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <ProfileSkeleton />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="glass-card p-8 max-w-4xl mx-auto">
          {/* 返回主页面导航 */}
          <div className="flex items-center mb-6">
            <button
              className="glass-card px-4 py-2 text-gray-700 hover:text-pink-500 transition-colors flex items-center gap-2"
              onClick={() => router.push('/')}
            >
              <span>←</span> 返回主页面
            </button>
          </div>
          <h1 className="text-3xl font-bold gradient-text mb-6 text-center">填写游戏资料</h1>

          {showProfileCard ? (
            <div className="mb-6 space-y-4">
              <div className="glass-card p-6 rounded-2xl border border-gray-200">
                <h2 className="text-2xl font-bold mb-4">游戏资料卡片</h2>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">游戏ID：</span>
                    <span className="font-medium">{formData.gameId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">当前段位：</span>
                    <span className="font-medium">{formData.currentRank}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">擅长位置：</span>
                    <span className="font-medium">{formData.mainPositions.join('、')}</span>
                  </div>
                  {formData.mainPositions.map(position => (
                    <div key={position} className="mt-4">
                      <h3 className="text-lg font-medium mb-2">{position}数据</h3>
                      <div className="grid grid-cols-4 gap-4">
                        <div>
                          <span className="text-gray-600">胜率：</span>
                          <span className="font-medium">{formData.positionStats[position].winRate}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">KDA：</span>
                          <span className="font-medium">{formData.positionStats[position].kda}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">评分：</span>
                          <span className="font-medium">{formData.positionStats[position].rating}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">战力：</span>
                          <span className="font-medium">{formData.positionStats[position].power}</span>
                        </div>
                      </div>
                      <div className="mt-2">
                        <span className="text-gray-600">常用英雄：</span>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {formData.positionStats[position].heroes.map(heroId => {
                            const hero = heroes.find(h => h.id === heroId);
                            return hero ? (
                              <span key={heroId} className="px-2 py-1 bg-purple-100 text-purple-600 rounded-full text-sm">
                                {hero.name}
                              </span>
                            ) : null;
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between">
                    <span className="text-gray-600">可比赛时间段：</span>
                    <div>
                      {formData.availableTime.map((time, index) => (
                        <div key={index}>{time.day} {time.start_time}-{time.end_time}</div>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">接受位置微调：</span>
                    <span className="font-medium">{formData.acceptPositionAdjustment ? '是' : '否'}</span>
                  </div>
                </div>
                <div className="mt-6 flex justify-end gap-4">
                  <button
                    type="button"
                    onClick={() => setShowProfileCard(false)}
                    className="px-6 py-3 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200"
                  >
                    编辑资料
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-8">
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
                    className="glass-input w-full px-4 py-3"
                    required
                    placeholder="请输入王者荣耀游戏ID"
                  />
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
                    className="glass-input w-full px-4 py-3"
                    required
                  >
                    <option value="">选择当前段位</option>
                    {ranks.map((rank) => (
                      <option key={rank} value={rank}>
                        {rank}
                      </option>
                    ))}
                  </select>
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
                          type="text"
                          value={formData.positionStats[position].winRate}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            positionStats: {
                              ...prev.positionStats,
                              [position]: {
                                ...prev.positionStats[position],
                                winRate: e.target.value
                              }
                            }
                          }))}
                          className="glass-input w-full px-4 py-2"
                          placeholder="例如：55.5%"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-700 font-medium mb-2">
                          KDA *
                        </label>
                        <input
                          type="text"
                          value={formData.positionStats[position].kda}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            positionStats: {
                              ...prev.positionStats,
                              [position]: {
                                ...prev.positionStats[position],
                                kda: e.target.value
                              }
                            }
                          }))}
                          className="glass-input w-full px-4 py-2"
                          placeholder="例如：2.5"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-700 font-medium mb-2">
                          评分 *
                        </label>
                        <input
                          type="text"
                          value={formData.positionStats[position].rating}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            positionStats: {
                              ...prev.positionStats,
                              [position]: {
                                ...prev.positionStats[position],
                                rating: e.target.value
                              }
                            }
                          }))}
                          className="glass-input w-full px-4 py-2"
                          placeholder="例如：85.5"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-700 font-medium mb-2">
                          战力 *
                        </label>
                        <input
                          type="number"
                          value={formData.positionStats[position].power}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            positionStats: {
                              ...prev.positionStats,
                              [position]: {
                                ...prev.positionStats[position],
                                power: e.target.value
                              }
                            }
                          }))}
                          className="glass-input w-full px-4 py-2"
                          placeholder="例如：12000"
                          min="0"
                          step="1"
                        />
                      </div>
                    </div>

                    {/* 常用英雄 */}
                    <div>
                      <label className="block text-gray-700 font-medium mb-2">
                        常用英雄 * (最多选择3个)
                      </label>
                      <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-2 glass-card">
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
                          onClick={() => removeTimeSlot(index)}
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
                        className="glass-input w-20 px-2 py-2"
                      >
                        {days.map(day => (
                          <option key={day} value={day}>{day}</option>
                        ))}
                      </select>
                      <input
                        type="time"
                        value={newTimeSlot.startTime}
                        onChange={(e) => handleTimeSlotChange(e, 'startTime')}
                        className="glass-input w-24 px-2 py-2"
                      />
                      <span className="w-8 text-gray-400">至</span>
                      <input
                        type="time"
                        value={newTimeSlot.endTime}
                        onChange={(e) => handleTimeSlotChange(e, 'endTime')}
                        className="glass-input w-24 px-2 py-2"
                      />
                      <button
                        type="button"
                        onClick={addTimeSlot}
                        className="px-3 py-2 bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
                      >
                        添加
                      </button>
                    </div>
                  </div>
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
                    onClick={() => setShowProfileCard(true)}
                    className="px-6 py-3 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="glass-button px-6 py-3 text-white font-medium"
                    disabled={loading}
                  >
                    {loading ? '保存中...' : '保存资料'}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
      <NotificationContainer />
    </div>
  )
}

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { supabase } from '../../../lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import { getHeroes, createOrUpdatePlayerProfile } from '../../../services/teamGroupingService'
import { Position, Hero, AvailableTime } from '../../../types/teamGrouping'
import Navbar from '../../../components/Navbar'
import ProfileSkeleton from '../../../components/Skeleton'
import { TeamDataService } from '../../../services/teamDataService'
import { useErrorHandler } from '../../../hooks/useErrorHandler'
import ErrorToast from '../../../components/ErrorToast'
import { LoadingOverlay, LoadingButton } from '../../../components/LoadingComponents'

export default function ProfilePage() {
  const { id: teamId } = useParams<{ id: string }>()
  const router = useRouter()
  const { user } = useAuth()
  
  const [loading, setLoading] = useState(true)
  const [heroes] = useState<Hero[]>(getHeroes())
  const [showProfileCard, setShowProfileCard] = useState(true)
  const [formData, setFormData] = useState({
    gameId: '',
    currentRank: '',
    mainPositions: [] as Position[],
    positionStats: {
      '上单': { win_rate: '', kda: '', rating: '', power: '', heroes: [] as number[] },
      '打野': { win_rate: '', kda: '', rating: '', power: '', heroes: [] as number[] },
      '中单': { win_rate: '', kda: '', rating: '', power: '', heroes: [] as number[] },
      '射手': { win_rate: '', kda: '', rating: '', power: '', heroes: [] as number[] },
      '辅助': { win_rate: '', kda: '', rating: '', power: '', heroes: [] as number[] }
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
    
  const { error, showError, clearError, handleError } = useErrorHandler()
  const [success, setSuccess] = useState('')
  
  const showSuccessMessage = (message: string) => {
    setSuccess(message)
    setTimeout(() => setSuccess(''), 3000)
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('player_profiles')
        .select('*')
        .eq('user_id', user!.id)
        .eq('team_id', teamId)
        .single()

      if (!profileError && profileData) {
        const positionStats = profileData.position_stats || {
          '上单': { win_rate: '', kda: '', rating: '', power: '', heroes: [] },
          '打野': { win_rate: '', kda: '', rating: '', power: '', heroes: [] },
          '中单': { win_rate: '', kda: '', rating: '', power: '', heroes: [] },
          '射手': { win_rate: '', kda: '', rating: '', power: '', heroes: [] },
          '辅助': { win_rate: '', kda: '', rating: '', power: '', heroes: [] }
        }
        
        Object.keys(positionStats).forEach(position => {
          if (!positionStats[position].heroes) {
            positionStats[position].heroes = []
          }
          if (!positionStats[position].win_rate) {
            positionStats[position].win_rate = ''
          }
        })
  
        const formDataValue = {
          gameId: profileData.game_id || '',
          currentRank: profileData.current_rank || '',
          mainPositions: profileData.main_positions || [],
          positionStats: positionStats,
          availableTime: profileData.available_time || [],
          acceptPositionAdjustment: profileData.accept_position_adjustment || false
        }
  
        setFormData(formDataValue)
      }
    } catch (err) {
      console.error('获取资料失败:', err)
      handleError(err, '获取资料失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }, [user, teamId, handleError])

  useEffect(() => {
    if (user) {
      fetchData()
    }
  }, [user, fetchData])

  const handlePositionChange = (position: Position) => {
    setFormData(prev => {
      const isSelected = prev.mainPositions.includes(position)
      let newPositions: Position[]
      
      if (isSelected) {
        newPositions = prev.mainPositions.filter(pos => pos !== position)
      } else {
        if (prev.mainPositions.length >= 2) {
          showError('最多只能选择2个擅长位置')
          return prev
        }
        newPositions = [...prev.mainPositions, position]
      }
      
      return {
        ...prev,
        mainPositions: newPositions
      }
    })
  }

  const handleHeroChange = (heroId: number, position: Position) => {
    setFormData(prev => {
      const currentHeroes = prev.positionStats[position].heroes
      const isSelected = currentHeroes.includes(heroId)
      let newHeroes: number[]
      
      if (isSelected) {
        newHeroes = currentHeroes.filter(id => id !== heroId)
      } else {
        if (currentHeroes.length >= 3) {
          newHeroes = [...currentHeroes.slice(1), heroId]
        } else {
          newHeroes = [...currentHeroes, heroId]
        }
      }
      
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
    })
  }

  const handleTimeSlotChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>, field: keyof typeof newTimeSlot) => {
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
  }

  const removeTimeSlot = (index: number) => {
    setFormData(prev => ({
      ...prev,
      availableTime: prev.availableTime.filter((_, i) => i !== index)
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
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
  
    for (const position of formData.mainPositions) {
      const stats = formData.positionStats[position]
      if (stats.heroes.length === 0) {
        showError(`请为${position}位置选择至少一个常用英雄`)
        return
      }
      if (!stats.win_rate) {
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
      await createOrUpdatePlayerProfile({
        user_id: user!.id,
        team_id: teamId,
        game_id: formData.gameId,
        current_rank: formData.currentRank,
        main_positions: formData.mainPositions,
        position_stats: formData.positionStats,
        available_time: formData.availableTime,
        accept_position_adjustment: formData.acceptPositionAdjustment
      })
      
      await TeamDataService.updatePlayerProfile(user!.id, teamId, {
        current_rank: formData.currentRank,
        rank_updated_at: new Date().toISOString()
      })

      localStorage.setItem(`playerProfile_${user!.id}_${teamId}`, JSON.stringify(formData))
      
      showSuccessMessage('资料保存成功！')
      setShowProfileCard(true)
    } catch (err) {
      console.error('保存资料失败:', err)
      handleError(err, '保存失败，请稍后重试')
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
      {error && <ErrorToast message={error} onClose={clearError} />}
      {loading && <LoadingOverlay message="保存中..." />}
      <div className="container m
x-auto px-4 py-8">
      <div className="glass-card p-8 max-w-4xl mx-auto">
        <div className="flex items-center mb-6">
          <button
            className="glass-card px-4 py-2 text-gray-700 hover:text-pink-500 transition-colors flex items-center gap-2"
            onClick={() => router.push('/teams/space')}
            >
              <span>←</span> 返回战队管理后台
            </button>
          </div>
          <h1 className="text-3xl font-bold gradient-text mb-6 text-center">填写游戏资料</h1>

          {success && (
            <div className="mb-4 p-4 bg-green-100 text-green-700 rounded-lg">
              {success}
            </div>
          )}

          {showProfileCard ? (
            <div className="mb-6 space-y-4">
              <div className="glass-card p-6 rounded-2xl border border-gray-200">
                <h2 className="text-2xl font-bold mb-4">游戏资料卡片</h2>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">游戏ID：</span>
                    <span className="font-medium">{formData.gameId || '未填写'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">当前段位：</span>
                    <span className="font-medium">{formData.currentRank || '未填写'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">擅长位置：</span>
                    <span className="font-medium">{formData.mainPositions.join('、') || '未填写'}</span>
                  </div>
                  {formData.mainPositions.map(position => (
                    <div key={position}>
                      <h3 className="text-lg font-medium mb-2">{position}数据</h3>
                      <div className="grid grid-cols-4 gap-4">
                        <div>
                          <span className="text-gray-600">胜率：</span>
                          <span className="font-medium">{formData.positionStats[position].win_rate || '未填写'}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">KDA：</span>
                          <span className="font-medium">{formData.positionStats[position].kda || '未填写'}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">评分：</span>
                          <span className="font-medium">{formData.positionStats[position].rating || '未填写'}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">战力：</span>
                          <span className="font-medium">{formData.positionStats[position].power || '未填写'}</span>
                        </div>
                      </div>
                      <div className="mt-2">
                        <span className="text-gray-600">常用英雄：</span>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {formData.positionStats[position].heroes.length > 0 ? (
                            formData.positionStats[position].heroes.map(heroId => {
                              const hero = heroes.find(h => h.id === heroId)
                              return hero ? (
                                <span key={heroId} className="px-2 py-1 bg-purple-100 text-purple-600 rounded-full text-sm">
                                  {hero.name}
                                </span>
                              ) : null
                            })
                          ) : (
                            <span className="text-gray-400">未选择</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between">
                    <span className="text-gray-600">可比赛时间段：</span>
                    <div>
                      {formData.availableTime.length > 0 ? (
                        formData.availableTime.map((time, index) => (
                          <div key={index}>{time.day} {time.start_time}-{time.end_time}</div>
                        ))  
                      ) : (
                        <span className="text-gray-400">未填写</span>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">接受位置微调：</span>
                    <span className="font-medium">{formData.acceptPositionAdjustment ? '是' : '否'}</span>
                  </div>
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
          ) : (
            <form onSubmit={handleSubmit} className="space-y-8">
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
                      className={`px-4 py-2 border-2 rounded-lg transition-all ${formData.mainPositions.includes(position) ? 'border-blue-500 bg-blue-100 text-blue-600' : 'border-gray-300 text-gray-600 hover:border-blue-300'}`}
                    >
                      {position}
                    </button>
                  ))}
                </div>
              </div>
                          
              {formData.mainPositions.map(position => (
                <div key={position} className="border border-gray-200 rounded-2xl p-4">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">{position}数据</h3>
          
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <label className="block text-gray-700 font-medium mb-2">
                        胜率 *
                      </label>  
                      <input
                        type="text"
                        value={formData.positionStats[position].win_rate}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev,
                          positionStats: {
                            ...prev.positionStats,
                            [position]: {
                              ...prev.positionStats[position],
                              win_rate: e.target.value
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
                        type="text"
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
                      />
                    </div>  
                  </div>
          
                  <div>
                    <label className="block text-gray-700 font-medium mb-3">  
                      常用英雄 * (最多选择3个，点击已选中的英雄可取消选择，点击新英雄会自动替换最早选择的英雄)
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
                      onClick={addTimeSlot}
                      className="px-3 py-2 bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
                    >
                      添加
                    </button>
                  </div>
                </div>
              </div>
            
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
                <LoadingButton
                  type="submit"
                  loading={loading}
                  className="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  保存资料
                </LoadingButton>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
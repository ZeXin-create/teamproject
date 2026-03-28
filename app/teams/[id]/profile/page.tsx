'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '../../../context/AuthContext'
import { getHeroes, getHeroesByPosition, getPlayerProfile, createOrUpdatePlayerProfile } from '../../../services/teamGroupingService'
import { Position, Hero, AvailableTime } from '../../../types/teamGrouping'
import Navbar from '../../../components/Navbar'
import Image from 'next/image'

export default function PlayerProfilePage() {
  const router = useRouter()
  const params = useParams()
  const teamId = params.id as string
  const { user } = useAuth()
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [heroes, setHeroes] = useState<Hero[]>([])
  const [selectedHeroes, setSelectedHeroes] = useState<number[]>([])
  const [profile, setProfile] = useState<any>(null)
  
  const [formData, setFormData] = useState({
    mainPositions: [] as Position[],
    historicalRating: 0,
    recentRating: 0,
    availableTime: [] as AvailableTime[],
    acceptPositionAdjustment: false
  })
  
  const [newTimeSlot, setNewTimeSlot] = useState({
    day: '周一',
    startTime: '00:00',
    endTime: '23:59'
  })
  
  const positions: Position[] = ['上单', '打野', '中单', '射手', '辅助']
  const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
  
  useEffect(() => {
    if (user && teamId) {
      fetchData()
    }
  }, [user, teamId])
  
  const fetchData = async () => {
    setLoading(true)
    try {
      // 获取英雄库
      const heroesData = await getHeroes()
      setHeroes(heroesData)
      
      // 获取队员资料
      const profileData = await getPlayerProfile(user!.id, teamId)
      if (profileData) {
        setProfile(profileData)
        setFormData({
          mainPositions: profileData.main_positions,
          historicalRating: profileData.historical_rating || 0,
          recentRating: profileData.recent_rating || 0,
          availableTime: profileData.available_time || [],
          acceptPositionAdjustment: profileData.accept_position_adjustment || false
        })
        // 设置已选择的英雄
        if (profileData.heroes) {
          setSelectedHeroes(profileData.heroes.map((hero: Hero) => hero.id))
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取数据失败')
    } finally {
      setLoading(false)
    }
  }
  
  const handlePositionChange = (position: Position) => {
    setFormData(prev => {
      const currentPositions = [...prev.mainPositions]
      if (currentPositions.includes(position)) {
        return {
          ...prev,
          mainPositions: currentPositions.filter(p => p !== position)
        }
      } else {
        return {
          ...prev,
          mainPositions: [...currentPositions, position]
        }
      }
    })
  }
  
  const handleHeroChange = (heroId: number) => {
    setSelectedHeroes(prev => {
      if (prev.includes(heroId)) {
        return prev.filter(id => id !== heroId)
      } else {
        // 每个位置最多选择3个英雄
        const hero = heroes.find(h => h.id === heroId)
        if (hero) {
          const samePositionHeroes = selectedHeroes.filter(id => {
            const h = heroes.find(hero => hero.id === id)
            return h && h.position === hero.position
          })
          if (samePositionHeroes.length >= 3) {
            setError('每个位置最多选择3个英雄')
            return prev
          }
        }
        return [...prev, heroId]
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
      day: '周一',
      startTime: '00:00',
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
    setError('')
    setSuccess('')
    
    // 表单验证
    if (formData.mainPositions.length === 0) {
      setError('请至少选择一个常用位置')
      return
    }
    
    if (formData.availableTime.length === 0) {
      setError('请至少添加一个可比赛时间段')
      return
    }
    
    if (selectedHeroes.length === 0) {
      setError('请至少选择一个擅长英雄')
      return
    }
    
    setLoading(true)
    try {
      await createOrUpdatePlayerProfile(user!.id, teamId, {
        main_positions: formData.mainPositions,
        historical_rating: formData.historicalRating,
        recent_rating: formData.recentRating,
        available_time: formData.availableTime,
        accept_position_adjustment: formData.acceptPositionAdjustment,
        hero_ids: selectedHeroes
      })
      setSuccess('资料保存成功！')
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">加载中...</div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="glass-card p-8 max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold gradient-text mb-6 text-center">填写游戏资料</h1>
          
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
          
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* 常用位置 */}
            <div>
              <label className="block text-gray-700 font-medium mb-3">
                常用位置 *
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
            
            {/* 擅长英雄 */}
            <div>
              <label className="block text-gray-700 font-medium mb-3">
                擅长英雄 * (每个位置最多选择3个)
              </label>
              {positions.map(position => {
                const positionHeroes = heroes.filter(hero => hero.position === position)
                return (
                  <div key={position} className="mb-4">
                    <h3 className="text-sm font-medium text-gray-600 mb-2">{position}</h3>
                    <div className="flex flex-wrap gap-2">
                      {positionHeroes.map(hero => (
                        <button
                          key={hero.id}
                          type="button"
                          onClick={() => handleHeroChange(hero.id)}
                          className={`px-3 py-1 rounded-full text-sm border-2 ${selectedHeroes.includes(hero.id) ? 'border-purple-500 bg-purple-100 text-purple-600' : 'border-gray-300 text-gray-600 hover:border-purple-300'}`}
                        >
                          {hero.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
            
            {/* 评分 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="historicalRating" className="block text-gray-700 font-medium mb-2">
                  历史评分 *
                </label>
                <input
                  type="number"
                  id="historicalRating"
                  value={formData.historicalRating}
                  onChange={(e) => setFormData(prev => ({ ...prev, historicalRating: parseInt(e.target.value) || 0 }))}
                  min="0"
                  max="100"
                  className="glass-input w-full px-4 py-3"
                  required
                />
              </div>
              <div>
                <label htmlFor="recentRating" className="block text-gray-700 font-medium mb-2">
                  近期评分 *
                </label>
                <input
                  type="number"
                  id="recentRating"
                  value={formData.recentRating}
                  onChange={(e) => setFormData(prev => ({ ...prev, recentRating: parseInt(e.target.value) || 0 }))}
                  min="0"
                  max="100"
                  className="glass-input w-full px-4 py-3"
                  required
                />
              </div>
            </div>
            
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
                onClick={() => router.back()}
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
        </div>
      </div>
    </div>
  )
}

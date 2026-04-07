'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { TeamDataService, MatchRecord } from '../../../services/teamDataService'
import { supabase } from '../../../lib/supabase'
import { useRouter } from 'next/navigation'
import Navbar from '../../../components/Navbar'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, PointElement, LineElement } from 'chart.js'
import { Pie, Bar, Line } from 'react-chartjs-2'

// 定义权限常量
const ANALYTICS_PERMISSIONS = ['队长', '副队', '领队']

// 注册Chart.js组件
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, PointElement, LineElement)

export default function AnalyticsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [userRole, setUserRole] = useState('')
  const [teamStats, setTeamStats] = useState<{
    totalMatches: number;
    wins: number;
    winRate: string;
    statusDistribution: Record<string, number>;
    rankDistribution: Record<string, number>;
    positionDistribution: Record<string, number>;
  } | null>(null)
  const [matchRecords, setMatchRecords] = useState<MatchRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!user?.id) return
    
    const fetchData = async () => {
      try {
        const { data: teamMember } = await supabase
          .from('team_members')
          .select('team_id, role')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .single()

        if (teamMember) {
          setUserRole(teamMember.role || '')
          const stats = await TeamDataService.getTeamStatistics(teamMember.team_id)
          setTeamStats(stats)
          const records = await TeamDataService.getMatchRecords(teamMember.team_id)
          setMatchRecords(records)
        }
      } catch (err) {
        console.error('获取数据失败:', err)
        setError('发生错误')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user])

  // 检查用户是否有查看数据可视化的权限
  const hasAnalyticsPermission = () => {
    return ANALYTICS_PERMISSIONS.includes(userRole)
  }

  // 准备图表数据
  const getRankDistributionData = () => {
    if (!teamStats?.rankDistribution) {
      return { labels: [], datasets: [] }
    }

    // 使用与编辑游戏资料表单相同的段位数组
    const ranks = ['最强王者', '非凡王者', '无双王者', '绝世王者', '至圣王者', '荣耀王者', '传奇王者']
    const data = ranks.map(rank => teamStats.rankDistribution[rank] || 0)

    return {
      labels: ranks,
      datasets: [
        {
          label: '队员数量',
          data: data,
          backgroundColor: '#3B82F6',
          borderColor: '#3B82F6',
          borderWidth: 1
        }
      ]
    }
  }

  const getMatchHistoryData = () => {
    if (!matchRecords || matchRecords.length === 0) {
      return { labels: [], datasets: [] }
    }

    // 按日期排序
    const sortedRecords = [...matchRecords].sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime())
    
    const labels = sortedRecords.map(record => record.match_date)
    const data = sortedRecords.map(record => record.result === '胜利' ? 1 : 0)

    return {
      labels: labels,
      datasets: [
        {
          label: '比赛结果',
          data: data,
          backgroundColor: data.map(value => value === 1 ? '#4CAF50' : '#F44336'),
          borderColor: data.map(value => value === 1 ? '#4CAF50' : '#F44336'),
          borderWidth: 1
        }
      ]
    }
  }

  // 位置分布数据
  const getPositionDistributionData = () => {
    if (!teamStats?.positionDistribution) {
      return { labels: [], datasets: [] }
    }

    return {
      labels: Object.keys(teamStats.positionDistribution),
      datasets: [
        {
          data: Object.values(teamStats.positionDistribution),
          backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'],
          borderWidth: 1
        }
      ]
    }
  }

  // 胜率趋势数据
  const getWinRateTrendData = () => {
    if (!matchRecords || matchRecords.length === 0) {
      return { labels: [], datasets: [] }
    }

    // 按日期排序
    const sortedRecords = [...matchRecords].sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime())
    
    // 计算累计胜率
    let winCount = 0
    const labels: string[] = []
    const winRates: number[] = []
    
    sortedRecords.forEach((record, index) => {
      if (record.result === '胜利') {
        winCount++
      }
      const winRate = (winCount / (index + 1)) * 100
      labels.push(record.match_date)
      winRates.push(winRate)
    })

    return {
      labels: labels,
      datasets: [
        {
          label: '胜率趋势',
          data: winRates,
          borderColor: '#3B82F6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 2,
          tension: 0.4,
          fill: true
        }
      ]
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-4 text-gray-600">加载中...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <button
              className="px-4 py-2 rounded-2xl text-gray-700 hover:text-pink-500 hover:bg-white/50 transition-all duration-300 font-medium flex items-center gap-2"
              onClick={() => router.push('/teams/space')}
            >
              <span>←</span> 返回战队管理后台
            </button>
            <h1 className="text-2xl font-bold gradient-text">数据可视化</h1>
            <button
              onClick={async () => {
                setLoading(true)
                try {
                  const { data: teamMember } = await supabase
                    .from('team_members')
                    .select('team_id')
                    .eq('user_id', user?.id)
                    .eq('status', 'active')
                    .single()

                  if (teamMember) {
                    const stats = await TeamDataService.getTeamStatistics(teamMember.team_id)
                    setTeamStats(stats)
                    const records = await TeamDataService.getMatchRecords(teamMember.team_id)
                    setMatchRecords(records)
                  }
                } catch (err) {
                  console.error('更新数据失败:', err)
                  setError('更新数据失败')
                } finally {
                  setLoading(false)
                }
              }}
              className="px-4 py-2 rounded-2xl bg-blue-500 text-white hover:bg-blue-600 transition-all duration-300 font-medium flex items-center gap-2"
            >
              <span>🔄</span> 更新数据
            </button>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {hasAnalyticsPermission() ? (
            <>
              {/* 战队统计概览 */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="glass-card p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">{teamStats?.totalMatches || 0}</div>
                  <div className="text-gray-600">总比赛数</div>
                </div>
                <div className="glass-card p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{teamStats?.wins || 0}</div>
                  <div className="text-gray-600">胜利数</div>
                </div>
                <div className="glass-card p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600">{teamStats?.winRate || '0.00'}%</div>
                  <div className="text-gray-600">胜率</div>
                </div>
                <div className="glass-card p-4 text-center">
                  <div className="text-2xl font-bold text-orange-600">{matchRecords?.length || 0}</div>
                  <div className="text-gray-600">记录数</div>
                </div>
              </div>

              {/* 图表区域 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 段位分布柱状图 */}
                <div className="glass-card p-4">
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <span>🏆</span> 段位分布
                  </h2>
                  <div className="h-64">
                    <Bar data={getRankDistributionData()} options={{ 
                      responsive: true, 
                      maintainAspectRatio: false,
                      scales: {
                        y: {
                          beginAtZero: true
                        }
                      }
                    }} />
                  </div>
                </div>

                {/* 位置分布饼图 */}
                <div className="glass-card p-4">
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <span>🎮</span> 位置分布
                  </h2>
                  <div className="h-64">
                    <Pie data={getPositionDistributionData()} options={{ 
                      responsive: true, 
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'bottom'
                        }
                      }
                    }} />
                  </div>
                </div>

                {/* 胜率趋势折线图 */}
                <div className="glass-card p-4 md:col-span-2">
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <span>📈</span> 胜率趋势
                  </h2>
                  <div className="h-64">
                    <Line data={getWinRateTrendData()} options={{ 
                      responsive: true, 
                      maintainAspectRatio: false,
                      scales: {
                        y: {
                          beginAtZero: true,
                          max: 100,
                          ticks: {
                            callback: function(value) {
                              return value + '%'
                            }
                          }
                        }
                      }
                    }} />
                  </div>
                </div>

                {/* 比赛历史柱状图 */}
                <div className="glass-card p-4 md:col-span-2">
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <span>📅</span> 比赛历史
                  </h2>
                  <div className="h-64">
                    <Bar data={getMatchHistoryData()} options={{ 
                      responsive: true, 
                      maintainAspectRatio: false,
                      scales: {
                        y: {
                          beginAtZero: true,
                          max: 1,
                          ticks: {
                            stepSize: 1,
                            callback: function(value) {
                              return value === 1 ? '胜利' : '失败'
                            }
                          }
                        }
                      }
                    }} />
                  </div>
                </div>
              </div>

              {/* 数据表格 */}
              <div className="mt-8">
                <h2 className="text-lg font-semibold mb-4">最近比赛记录</h2>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="px-4 py-2 border">日期</th>
                        <th className="px-4 py-2 border">对手</th>
                        <th className="px-4 py-2 border">结果</th>
                        <th className="px-4 py-2 border">比分</th>
                        <th className="px-4 py-2 border">分析</th>
                      </tr>
                    </thead>
                    <tbody>
                      {matchRecords.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-4 text-center text-gray-500">
                            暂无比赛记录
                          </td>
                        </tr>
                      ) : (
                        matchRecords.slice(0, 10).map((record, index) => (
                          <tr key={record.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-4 py-2 border">{record.match_date}</td>
                            <td className="px-4 py-2 border">{record.opponent}</td>
                            <td className={`px-4 py-2 border ${record.result === '胜利' ? 'text-green-600' : 'text-red-600'}`}>
                              {record.result}
                            </td>
                            <td className="px-4 py-2 border">{record.score || '-'}</td>
                            <td className="px-4 py-2 border">{record.analysis || '-'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">📊</div>
              <p className="text-gray-600 text-lg">您没有权限查看数据可视化</p>
              <p className="text-gray-400 text-sm mt-2">只有领队、副队、队长可查看数据可视化</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
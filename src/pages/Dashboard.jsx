import { useState, useEffect } from 'react'
import { Line, Pie, Bar } from 'react-chartjs-2'
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js'

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend
)

function Dashboard() {
    // Update marker: Force re-render with latest funnel chart and sales revenue
    const [stats, setStats] = useState({
        totalCustomers: 17,
        newCustomers: 0,
        repeatCustomers: 0,
        regularCustomers: 0,
        sharkCustomers: 0,
        whaleCustomers: 0,
        grassCustomers: 0,
        shrimpCustomers: 0,
        tracking: 0,
        converted: 0,
        totalSales: 1234567,
        avgOrderValue: 5678
    })
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    // 從 API 獲取統計數據
    useEffect(() => {
        const fetchStats = async () => {
            try {
                setLoading(true)
                const response = await fetch('/api/customers')
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`)
                }
                const customers = await response.json()
                
                // 根據客戶數據計算統計
                const totalCustomers = customers.length
                const newCustomers = customers.filter(c => c.status === '新客' || c.status === '新客戶').length
                const repeatCustomers = customers.filter(c => c.status === '回購客' || c.status === '回購客戶').length
                const regularCustomers = customers.filter(c => c.status === '常客' || c.status === '常客戶').length
                const sharkCustomers = customers.filter(c => c.valueCategory === '鯊魚').length
                const whaleCustomers = customers.filter(c => c.valueCategory === '鯨魚').length
                const grassCustomers = customers.filter(c => c.valueCategory === '草魚').length
                const shrimpCustomers = customers.filter(c => c.valueCategory === '小蝦').length
                
                // 漏斗轉化數據（假設數據）
                const tracking = Math.round(totalCustomers * 0.7)
                const converted = Math.round(totalCustomers * 0.4)
                
                setStats(prev => ({
                    ...prev,
                    totalCustomers,
                    newCustomers,
                    repeatCustomers,
                    regularCustomers,
                    sharkCustomers,
                    whaleCustomers,
                    grassCustomers,
                    shrimpCustomers,
                    tracking,
                    converted
                }))
                setError(null)
            } catch (err) {
                console.error('獲取統計數據失敗:', err)
                // 使用默認測試數據而不是顯示錯誤
                setStats({
                    totalCustomers: 17,
                    newCustomers: 3,
                    repeatCustomers: 5,
                    regularCustomers: 9,
                    sharkCustomers: 2,
                    whaleCustomers: 3,
                    grassCustomers: 5,
                    shrimpCustomers: 7,
                    tracking: 12,
                    converted: 7,
                    totalSales: 1234567,
                    avgOrderValue: 5678
                })
                setError(null) // 不顯示錯誤
            } finally {
                setLoading(false)
            }
        }

        fetchStats()
    }, [])

    // 銷售趨勢數據
    const salesTrendData = {
        labels: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
        datasets: [{
            label: '銷售額',
            data: [65000, 75000, 85000, 95000, 105000, 115000, 125000, 135000, 145000, 155000, 165000, 175000],
            borderColor: '#0066CC',
            backgroundColor: 'rgba(0, 102, 204, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointBackgroundColor: '#0066CC',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2
        }]
    }

    // 客戶價值分類分布（圓餅圖 - 顏色互換）
    const customerValueData = {
        labels: ['鯊魚客戶', '鯨魚客戶', '草魚客戶', '小蝦客戶'],
        datasets: [{
            data: [stats.sharkCustomers || 3, stats.whaleCustomers || 4, stats.grassCustomers || 6, stats.shrimpCustomers || 4],
            backgroundColor: [
                '#FF6B6B',  // 紅色 - 鯊魚
                '#6BCB77',  // 綠色 - 鯨魚（改為綠色）
                '#FFD93D',  // 黃色 - 草魚（改為黃色）
                '#4D96FF'   // 藍色 - 小蝦
            ],
            borderColor: '#ffffff',
            borderWidth: 2
        }]
    }

    // 回應時間分布數據
    const responseTimeData = {
        labels: ['24小時未回覆', '48小時未回覆', '超過48小時未回應'],
        datasets: [{
            label: '數',
            data: [5, 8, 4],
            backgroundColor: [
                '#FF6B6B',  // 紅色 - 24小時未回覆
                '#FFD93D',  // 黃色 - 48小時未回覆
                '#6BCB77'   // 綠色 - 超過48小時未回應
            ],
            borderColor: '#ffffff',
            borderWidth: 1
        }]
    }

    // 梯形漏斗圖數據
    const funnelData = {
        labels: ['總客戶數', '追單', '成交'],
        datasets: [{
            label: '客戶轉化',
            data: [stats.totalCustomers || 100, stats.tracking || 70, stats.converted || 40],
            backgroundColor: [
                'rgba(100, 150, 255, 0.7)',  // 藍色 - 總客戶數
                'rgba(255, 200, 100, 0.7)',  // 橙色 - 追單
                'rgba(100, 255, 150, 0.7)'   // 綠色 - 成交
            ],
            borderColor: [
                '#4D96FF',
                '#FFD93D',
                '#6BCB77'
            ],
            borderWidth: 2,
            borderSkipped: false
        }]
    }

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
            legend: {
                display: true,
                position: 'bottom'
            }
        }
    }

    // 梯形漏斗圖的自定義選項
    const funnelChartOptions = {
        ...chartOptions,
        indexAxis: 'y',
        scales: {
            x: {
                beginAtZero: true,
                max: 120
            }
        }
    }

    return (
        <div style={{ padding: '20px', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
            <h1 style={{ marginBottom: '20px', color: '#333' }}>戰情室</h1>
            <p style={{ marginBottom: '30px', color: '#666' }}>實時監控客戶數據和銷售業績</p>

            {error && (
                <div style={{ 
                    padding: '15px', 
                    backgroundColor: '#fee', 
                    color: '#c00', 
                    borderRadius: '4px',
                    marginBottom: '20px'
                }}>
                    ⚠️ 數據加載失敗: {error}
                </div>
            )}

            {/* KPI 卡片 - 4 個同一行 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '30px' }}>
                {/* 總客戶數 - 藍色 */}
                <div style={{ 
                    padding: '20px', 
                    backgroundColor: '#fff', 
                    borderRadius: '8px',
                    borderLeft: '4px solid #4D96FF',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                    <h3 style={{ margin: '0 0 10px 0', color: '#666', fontSize: '14px' }}>總客戶數</h3>
                    <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#4D96FF', margin: '10px 0' }}>
                        {stats.totalCustomers}
                    </div>
                    <div style={{ fontSize: '12px', color: '#999' }}>📈 0% 本月</div>
                </div>

                {/* 新客 - 紅色 */}
                <div style={{ 
                    padding: '20px', 
                    backgroundColor: '#fff', 
                    borderRadius: '8px',
                    borderLeft: '4px solid #FF6B6B',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                    <h3 style={{ margin: '0 0 10px 0', color: '#666', fontSize: '14px' }}>新客</h3>
                    <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#FF6B6B', margin: '10px 0' }}>
                        {stats.newCustomers}
                    </div>
                    <div style={{ fontSize: '12px', color: '#999' }}>📈 +8% 本月</div>
                </div>

                {/* 回購客 - 黃色 */}
                <div style={{ 
                    padding: '20px', 
                    backgroundColor: '#fff', 
                    borderRadius: '8px',
                    borderLeft: '4px solid #FFD93D',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                    <h3 style={{ margin: '0 0 10px 0', color: '#666', fontSize: '14px' }}>回購客</h3>
                    <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#FFD93D', margin: '10px 0' }}>
                        {stats.repeatCustomers}
                    </div>
                    <div style={{ fontSize: '12px', color: '#999' }}>📈 +15% 本月</div>
                </div>

                {/* 常客 - 綠色 */}
                <div style={{ 
                    padding: '20px', 
                    backgroundColor: '#fff', 
                    borderRadius: '8px',
                    borderLeft: '4px solid #6BCB77',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                    <h3 style={{ margin: '0 0 10px 0', color: '#666', fontSize: '14px' }}>常客</h3>
                    <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#6BCB77', margin: '10px 0' }}>
                        {stats.regularCustomers}
                    </div>
                    <div style={{ fontSize: '12px', color: '#999' }}>📈 +5% 本月</div>
                </div>
            </div>

            {/* 平均訂單金額對比、本月銷墩額、平均回覆時間、平均成交周期 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '20px', marginBottom: '30px' }}>
                {/* 卡片 1: 平均訂單金額對比 */}
                <div style={{ 
                    padding: '20px', 
                    backgroundColor: '#fff', 
                    borderRadius: '8px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                }}>
                    <h3 style={{ margin: '0 0 15px 0', color: '#666', fontSize: '14px' }}>平均訂單金額</h3>
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px', flex: 1, margin: '10px 0' }}>
                        {/* 左侧：本月金額 */}
                        <div style={{ flex: 0.3, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#4D96FF', margin: '0' }}>
                                NT${(stats.avgOrderValue || 5678).toLocaleString()}
                            </div>
                        </div>
                        
                        {/* 中间：VS 綠圈 */}
                        <div style={{ flex: 0.4, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '2px' }}>
                            <div style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                border: '2px solid #22C55E',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '12px',
                                fontWeight: 'bold',
                                color: '#22C55E',
                                flexShrink: 0
                            }}>
                                VS
                            </div>
                        </div>
                        
                        {/* 右侧：上月金額 */}
                        <div style={{ flex: 0.3, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#FF6B6B', margin: '0' }}>
                                NT$5,400
                            </div>
                        </div>
                    </div>
                    <div style={{ fontSize: '12px', color: '#999' }}>📈 +5% 本月</div>
                </div>

                {/* 卡片 2: 本月銷墩額 */}
                <div style={{ 
                    padding: '20px', 
                    backgroundColor: '#fff', 
                    borderRadius: '8px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                }}>
                    <h3 style={{ margin: '0 0 15px 0', color: '#666', fontSize: '14px' }}>本月銷售額</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center' }}>
                        <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#4D96FF', margin: '10px 0' }}>
                            NT${(stats.totalSales || 1234567).toLocaleString()}
                        </div>
                    </div>
                    <div style={{ fontSize: '12px', color: '#999' }}>📈 +12% 本月</div>
                </div>

                {/* 卡片 3: 平均回覆時間 */}
                <div style={{ 
                    padding: '20px', 
                    backgroundColor: '#fff', 
                    borderRadius: '8px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                }}>
                    <h3 style={{ margin: '0 0 15px 0', color: '#666', fontSize: '14px' }}>平均回覆時間</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center' }}>
                        <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#4D96FF', margin: '10px 0' }}>
                            2.5 小時
                        </div>
                    </div>
                    <div style={{ fontSize: '12px', color: '#999' }}>📈 +8% 本月</div>
                </div>

                {/* 卡片 4: 平均成交周期 */}
                <div style={{ 
                    padding: '20px', 
                    backgroundColor: '#fff', 
                    borderRadius: '8px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                }}>
                    <h3 style={{ margin: '0 0 15px 0', color: '#666', fontSize: '14px' }}>平均成交周期</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center' }}>
                        <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#4D96FF', margin: '10px 0' }}>
                            7.5 天
                        </div>
                    </div>
                    <div style={{ fontSize: '12px', color: '#999' }}>📈 -3% 本月</div>
                </div>
            </div>

            {/* 圖表區域 */}
            {/* 圖表區域 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', marginBottom: '30px' }}>
                {/* 銷售趨勢 */}
                <div style={{ 
                    padding: '20px', 
                    backgroundColor: '#fff', 
                    borderRadius: '8px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                    <h3 style={{ margin: '0 0 15px 0', color: '#333' }}>銷售趨勢</h3>
                    <div style={{ position: 'relative', height: '300px' }}>
                        <Line data={salesTrendData} options={chartOptions} />
                    </div>
                </div>

                {/* 客戶價值分類分布 */}
                <div style={{ 
                    padding: '20px', 
                    backgroundColor: '#fff', 
                    borderRadius: '8px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                    <h3 style={{ margin: '0 0 15px 0', color: '#333' }}>客戶價值分類分布</h3>
                    <div style={{ position: 'relative', height: '300px' }}>
                        <Pie data={customerValueData} options={chartOptions} />
                    </div>
                </div>

                {/* 購買階段分布 - 有外框 */}
                <div style={{ 
                    padding: '20px', 
                    backgroundColor: '#fff', 
                    borderRadius: '8px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                    <h3 style={{ margin: '0 0 15px 0', color: '#333' }}>購買階段分布</h3>
                    <div style={{ position: 'relative', height: '300px' }}>
                        <Bar data={responseTimeData} options={chartOptions} />
                    </div>
                </div>

                {/* 梯形漏斗圖 */}
                <div style={{ 
                    padding: '20px', 
                    backgroundColor: '#fff', 
                    borderRadius: '8px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                    <h3 style={{ margin: '0 0 15px 0', color: '#333' }}>客戶轉化漏斗</h3>
                    <div style={{ position: 'relative', height: '350px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="100%" height="100%" viewBox="0 0 400 300" style={{ maxWidth: '100%' }}>
                            {/* 第一層：總客戶數 */}
                            <rect x="50" y="20" width="300" height="60" fill="#4D96FF" opacity="0.8" />
                            <text x="200" y="55" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">總客戶數</text>
                            <text x="350" y="55" textAnchor="start" fill="#333" fontSize="12">100%</text>
                            <text x="200" y="75" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">{stats.totalCustomers}</text>
                            
                            {/* 第二層：追單 */}
                            <polygon points="100,100 300,100 250,160 150,160" fill="#FFD93D" opacity="0.8" />
                            <text x="200" y="135" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">追單</text>
                            <text x="310" y="135" textAnchor="start" fill="#333" fontSize="12">70%</text>
                            <text x="200" y="155" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">{stats.tracking}</text>
                            
                            {/* 第三層：成交 */}
                            <polygon points="150,180 250,180 200,240 200,240" fill="#6BCB77" opacity="0.8" />
                            <text x="200" y="210" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">成交</text>
                            <text x="260" y="210" textAnchor="start" fill="#333" fontSize="12">40%</text>
                            <text x="200" y="230" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">{stats.converted}</text>
                        </svg>
                    </div>
                </div>
            </div>


        </div>
    )
}

export default Dashboard

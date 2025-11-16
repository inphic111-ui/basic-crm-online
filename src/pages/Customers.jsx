import React, { useState, useEffect } from 'react'
import '../styles/customers.css'

// 清理和轉換 annual_consumption 欄位
const cleanAnnualConsumption = (value) => {
  if (value === null || value === undefined || value === '') {
    return 0;
  }
  
  // 如果是字符串，移除 'NT$' 前綴和其他非數字字符
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9.]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }
  
  // 如果是數字，直接返回
  if (typeof value === 'number') {
    return isNaN(value) ? 0 : value;
  }
  
  return 0;
}

// 根據採購量計算 V 評分
// 採購量範圍：每年採購總額（包含下限，不包含上限）
const calculateVScore = (price, annualConsumption = 0) => {
  const p = parseFloat(price) || 0
  const ac = parseFloat(annualConsumption) || 0
  const total = p + ac
  if (total >= 1000000) return 10 // V = 10：總額 ≥ 100 萬
  if (total >= 500000) return 8   // V = 8：50 萬 ≤ 總額 < 100 萬
  if (total >= 300000) return 6   // V = 6：30 萬 ≤ 總額 < 50 萬
  if (total >= 100000) return 4   // V = 4：10 萬 ≤ 總額 < 30 萬
  if (total > 0) return 2         // V = 2：0 < 總額 < 10 萬
  return 0                          // V = 0：總額 = 0
}

// 根據報價計算 P 評分
// 報價範圍：單筆交易金額（包含下限，不包含上限）
const calculatePScore = (purchasePrice) => {
  if (!purchasePrice) return 0
  const price = parseFloat(purchasePrice)
  if (price >= 100000) return 10  // P = 10：報價 ≥ 10 萬
  if (price >= 50000) return 8    // P = 8：5 萬 ≤ 報價 < 10 萬
  if (price >= 30000) return 6    // P = 6：3 萬 ≤ 報價 < 5 萬
  if (price >= 10000) return 4    // P = 4：1 萬 ≤ 報價 < 3 萬
  if (price > 0) return 2         // P = 2：0 < 報價 < 1 萬
  return 0                        // P = 0：報價 = 0
}

// N 評分描述
const getNScoreDescription = (score) => {
  const descriptions = {
    '10': '立即採購 | 已確認規格數量，僅待報價/下單',
    '8': '強烈需求 | 多次詢問報價，明確短期採購計畫',
    '6': '中等需求 | 有詢價評估中，短期可能成交',
    '4': '初步需求 | 有興趣但需求不明確',
    '2': '潛在需求 | 對產品有興趣，長期培養客戶',
    '0': '無需求 | 完全沒有需求或明確拒絕'
  }
  return descriptions[score] || ''
}

// F 評分描述
const getFScoreDescription = (score) => {
  const descriptions = {
    '10': '充足預算 | 預算已確認，可直接支付',
    '8': '高預算確定 | 預算接近標準，可能需分期',
    '6': '需內部審批 | 預算待內部核准',
    '4': '需籌措資金 | 有意願但需融資',
    '2': '可能無預算 | 對價格敏感，難以接受報價',
    '0': '完全無資金 | 無法支付'
  }
  return descriptions[score] || ''
}

// 計算 CVI 評分：客戶價值指數
const calculateCVI = (nScore, fScore, vScore, pScore) => {
  const n = parseFloat(nScore) || 0
  const f = parseFloat(fScore) || 0
  const v = parseFloat(vScore) || 0
  const p = parseFloat(pScore) || 0
  
  const cvi = (n * 0.4) + (f * 0.3) + (v * 0.2) + (p * 0.1)
  return parseFloat(cvi.toFixed(2))
}

// 根據 V 和 P 評分判斷客戶類型
const getCustomerTypeByVP = (vScore, pScore) => {
  if (!vScore || !pScore) return 'unclassified'
  const v = parseFloat(vScore)
  const p = parseFloat(pScore)
  
  // 高採購量 + 高價格 = 鯨魚客戶
  if (v >= 6 && p >= 6) return 'shark'
  // 低採購量 + 高價格 = 鯨魚客戶
  if (v <= 4 && p >= 6) return 'whale'
  // 高採購量 + 低價格 = 草魚客戶
  if (v >= 6 && p <= 4) return 'grass'
  // 低採購量 + 低價格 = 小蝦客戶
  if (v <= 4 && p <= 4) return 'shrimp'
  
  // 中間值的判斷
  if (v >= 5 && p >= 5) return 'shark'
  if (v <= 5 && p >= 5) return 'whale'
  if (v >= 5 && p <= 5) return 'grass'
  return 'shrimp'
}

// 客戶分類邏輯：基於 NFVP 分數
const getCustomerType = (nfvpScore) => {
  // 資訊不足 = 未分類
  if (!nfvpScore || nfvpScore === '-') return 'unclassified'
  
  const score = parseFloat(nfvpScore)
  
  // 根據 NFVP 分數計算客戶類型
  if (score >= 8.5) return 'shark' // 🦈 鯨魚 - NFVP >= 8.5
  if (score >= 7.0) return 'whale' // 🐋 鯨魚 - NFVP 7.0-8.4
  if (score >= 5.5) return 'grass' // 🐟 草魚 - NFVP 5.5-6.9
  return 'shrimp' // 🦐 蝦 - NFVP < 5.5
}

const getTypeEmoji = (type) => {
  const emojis = {
    shark: '🦈',
    whale: '🐋',
    grass: '🐟',
    shrimp: '🦐',
    unclassified: '?'
  }
  return emojis[type] || '❓'
}

const getTypeLabel = (type) => {
  const labels = {
    shark: '鯊魚客戶',
    whale: '鯨魚客戶',
    grass: '草魚客戶',
    shrimp: '小蝦客戶',
    unclassified: '未分類'
  }
  return labels[type] || '未分類'
}

// 解析 AI 分析歷史 JSON 並提取成交機率
const parseAnalysisHistory = (historyJson) => {
  try {
    if (!historyJson) return null
    const history = typeof historyJson === 'string' ? JSON.parse(historyJson) : historyJson
    
    // 支持两种数据结构：
    // 1. { analyses: [...] } - 前端构造的结构
    // 2. [...] - 后端直接返回的数组
    let analyses = null
    if (Array.isArray(history)) {
      analyses = history
    } else if (history.analyses && Array.isArray(history.analyses)) {
      analyses = history.analyses
    }
    
    if (!analyses || analyses.length === 0) return null
    return analyses
  } catch (err) {
    console.error('解析分析歷史失敗:', err)
    return null
  }
}

// 從 AI 分析文本中提取成交機率（百分比）
const extractProbability = (analysisText) => {
  if (!analysisText) return null
  // 尋找 "成交機率：XX%" 或 "成交機率: XX%" 的模式
  const match = analysisText.match(/成交機率[：:](\s*)([0-9]+)%/)
  if (match) {
    return parseInt(match[2], 10)
  }
  return null
}

// 根據 nfvp_score 產生中文分類描述
const getNFVPDescription = (nfvpScore) => {
  if (!nfvpScore) return ''
  const score = parseFloat(nfvpScore)
  
  if (score >= 9.0) return '超級VIP'
  if (score >= 8.0) return '高價值客戶'
  if (score >= 7.0) return '優質客戶'
  if (score >= 6.0) return '潛力客戶'
  if (score >= 5.0) return '普通客戶'
  return '低價值客戶'
}

// LOL 牌位勳章風格的評級徽章
const getRatingBadge = (rating) => {
  const badgeStyles = {
    'S': {
      background: 'linear-gradient(135deg, #0099FF 0%, #FFFFFF 50%, #0099FF 100%)',
      border: '2px solid #FFC700',
      boxShadow: '0 0 15px rgba(255, 215, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
      textShadow: '0 2px 4px rgba(0, 0, 0, 0.6)'
    },
    'A': {
      background: 'linear-gradient(135deg, #0066FF 0%, #00CCFF 50%, #FFFFFF 100%)',
      border: '2px solid #0066FF',
      boxShadow: '0 0 12px rgba(0, 102, 255, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.4)',
      textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)'
    },
    'B': {
      background: 'linear-gradient(135deg, #00CC99 0%, #00FF99 55%, #00DD88 100%)',
      border: '2px solid #00AA77',
      boxShadow: '0 0 10px rgba(0, 204, 153, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
      textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)'
    },
    'C': {
      background: 'linear-gradient(135deg, #FFD700 0%, #FFED4E 50%, #FFC700 100%)',
      border: '2px solid #CC9900',
      boxShadow: '0 0 10px rgba(255, 215, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
      textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)'
    },
    'D': {
      background: 'linear-gradient(135deg, #C0C0C0 0%, #E8E8E8 50%, #A9A9A9 100%)',
      border: '2px solid #808080',
      boxShadow: '0 0 8px rgba(192, 192, 192, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.4)',
      textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)'
    },
    'E': {
      background: 'linear-gradient(135deg, #CD7F32 0%, #E8A76A 50%, #B87333 100%)',
      border: '2px solid #8B4513',
      boxShadow: '0 0 8px rgba(205, 127, 50, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
      textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)'
    }
  }
  
  const ratingNotes = {
    'S': '確認待收款',
    'A': '優質跟進客戶',
    'B': '跟進客戶',
    'C': '養成客戶',
    'D': '低價值客戶',
    'E': '黑名單/unknown'
  }
  
  const style = badgeStyles[rating] || badgeStyles['E']
  const note = ratingNotes[rating] || ''
  
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '32px',
      height: '32px',
      borderRadius: '50%',
      fontSize: '14px',
      fontWeight: 'bold',
      color: (rating === 'B' || rating === 'A') ? 'white' : 'white',
      cursor: 'pointer',
      ...style
    }}
    title={note}
    >
      {rating || '-'}
    </span>
  )
}

// 訂單狀態標籤
const getOrderStatusTag = (status) => {
  const statusMap = {
    '未處理': { color: '#999999', label: '未處理' },
    '追單': { color: '#FF9800', label: '追單' },
    '購買': { color: '#4CAF50', label: '購買' },
    '成交': { color: '#4CAF50', label: '購買' },
    '售後': { color: '#2196F3', label: '售後' },
    '流失': { color: '#F44336', label: '流失' }
  }
  
  const statusInfo = statusMap[status] || { color: '#999', label: status || '-' }
  
  return (
    <span style={{
      display: 'inline-block',
      backgroundColor: statusInfo.color,
      color: 'white',
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '12px'
    }}>
      {statusInfo.label}
    </span>
  )
}

function Customers() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [formData, setFormData] = useState({})
  const [saving, setSaving] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editFormData, setEditFormData] = useState({})
  const [renderTrigger, setRenderTrigger] = useState(0)
  
  // 搜尋功能的 state
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterResponsible, setFilterResponsible] = useState('')
  const [responsiblePersons, setResponsiblePersons] = useState([])
  
  // 分頁功能的 state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(50)
  
  // 排序功能的 state
  const [sortByRating, setSortByRating] = useState(null)
  const [sortByType, setSortByType] = useState(null)
  const [sortByLastContact, setSortByLastContact] = useState(null)
  
  // 音檔上傳的 state
  const [audioUploadLoading, setAudioUploadLoading] = useState(false)
  const [audioUploadError, setAudioUploadError] = useState(null)
  const [audioUploadSuccess, setAudioUploadSuccess] = useState(false)

  // 生成隨機人名列表
  const generateResponsiblePersons = () => {
    const names = [
      '王建宏', '李美玲', '陳芬芬', '黃家豪', '吳欣怡',
      '林志偉', '劉思妤', '張家榕', '楊家誠', '何俊傑',
      '賴建志', '曾郁涵', '許家豪', '鄭家慧', '郭家銘'
    ]
    setResponsiblePersons(names)
  }

  // 根據搜尋條件過濾客戶列表
  const getFilteredCustomers = () => {
    let filtered = customers.filter(customer => {
      // 搜尋欄過濾（客戶編號或名稱）
      const matchesSearch = !searchQuery || 
        customer.customer_id?.toString().includes(searchQuery) ||
        customer.name?.toLowerCase().includes(searchQuery.toLowerCase())
      
      // 狀態過濾
      const matchesStatus = !filterStatus || customer.order_status === filterStatus
      
      // 負責人過濾（暫時不實現，因為數據中沒有負責人字段）
      const matchesResponsible = !filterResponsible || true
      
      return matchesSearch && matchesStatus && matchesResponsible
    })
    
    // 應用評級排序
    if (sortByRating) {
      filtered = [...filtered].sort((a, b) => {
        const ratingOrder = { 'S': 5, 'A': 4, 'B': 3, 'C': 2, 'D': 1, 'E': 0 }
        const aRating = ratingOrder[a.customer_rating] || -1
        const bRating = ratingOrder[b.customer_rating] || -1
        return sortByRating === 'asc' ? aRating - bRating : bRating - aRating
      })
    }
    
    // 應用客戶類型排序
    if (sortByType) {
      filtered = [...filtered].sort((a, b) => {
        const typeOrder = { 'shark': 3, 'whale': 2, 'grass': 1, 'shrimp': 0, 'unclassified': -1 }
        const aType = typeOrder[a.customer_type] || -1
        const bType = typeOrder[b.customer_type] || -1
        return sortByType === 'asc' ? aType - bType : bType - aType
      })
    }
    
    // 應用最後聯繫時間排序
    if (sortByLastContact) {
      filtered = [...filtered].sort((a, b) => {
        const aTime = a.last_contact_time ? new Date(a.last_contact_time).getTime() : 0
        const bTime = b.last_contact_time ? new Date(b.last_contact_time).getTime() : 0
        return sortByLastContact === 'asc' ? aTime - bTime : bTime - aTime
      })
    }
    
    return filtered
  }
  
  // 切換評級排序
  const toggleRatingSort = () => {
    if (sortByRating === null) {
      setSortByRating('asc')
    } else if (sortByRating === 'asc') {
      setSortByRating('desc')
    } else {
      setSortByRating(null)
    }
    setCurrentPage(1)
  }
  
  // 切換客戶類型排序
  const toggleTypeSort = () => {
    if (sortByType === null) {
      setSortByType('asc')
    } else if (sortByType === 'asc') {
      setSortByType('desc')
    } else {
      setSortByType(null)
    }
    setCurrentPage(1)
  }
  
  // 切換最後聯繫時間排序
  const toggleLastContactSort = () => {
    if (sortByLastContact === null) {
      setSortByLastContact('desc')  // 預設按最新時間排序
    } else if (sortByLastContact === 'desc') {
      setSortByLastContact('asc')
    } else {
      setSortByLastContact(null)
    }
    setCurrentPage(1)
  }

  // 計算分頁數據
  const getPaginatedCustomers = () => {
    const filtered = getFilteredCustomers()
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return {
      data: filtered.slice(startIndex, endIndex),
      total: filtered.length,
      totalPages: Math.ceil(filtered.length / itemsPerPage),
      currentPage
    }
  }

  // 從 API 獲取客戶列表
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/customers')
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        const data = await response.json()
        setCustomers(data)
        setError(null)
      } catch (err) {
        console.error('獲取客戶數據失敗:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchCustomers()
    generateResponsiblePersons()
  }, [])

  // 打開詳細視窗（可編輯模式）
  const handleViewDetail = (customer) => {
    setSelectedCustomer(customer)
      // 確保 n_score 和 f_score 有預設值，並清理 annual_consumption
    const formData = {
      ...customer,
      annual_consumption: cleanAnnualConsumption(customer.annual_consumption),
      n_score: customer.n_score || '',
      f_score: customer.f_score || '',
      nfvp_score: customer.nfvp_score || ''
    }
    setEditFormData(formData)
    setIsEditMode(true)
    setShowDetailModal(true)
  }

  // 打開詳細視窗（只讀模式）
  const handleViewDetailReadOnly = (customer) => {
    setSelectedCustomer(customer)
    // 清理 annual_consumption 並確保 n_score 和 f_score 有值
    const cleanedCustomer = {
      ...customer,
      annual_consumption: cleanAnnualConsumption(customer.annual_consumption),
      n_score: customer.n_score || '',
      f_score: customer.f_score || '',
      // 添加模擬的時間軸數據（用於測試）
      ai_analysis_history: JSON.stringify([
        {
          timestamp: new Date(Date.now() - 2*24*60*60*1000).toISOString(),
          probability: 15,
          timeline_text: '2025-11-10 09:06:09 | 成交率：15%',
          type: 'text'
        },
        {
          timestamp: new Date(Date.now() - 1*24*60*60*1000).toISOString(),
          probability: 45,
          timeline_text: '2025-11-11 10:30:45 | 成交率：45% | ⬆️ +30%',
          type: 'audio',
          audio_url: 'https://example.com/audio.mp3'
        },
        {
          timestamp: new Date().toISOString(),
          probability: 65,
          timeline_text: '2025-11-12 14:30:00 | 成交率：65% | ⬆️ +20%',
          type: 'text'
        }
      ]),
      audioUrl: 'https://example.com/audio.mp3'
    }
    setEditFormData(cleanedCustomer)
    setIsEditMode(false)
    setShowDetailModal(true)
  }

      // 關閉詳細視窗
      const handleCloseDetailModal = () => {
        setShowDetailModal(false)
        // 不清空 editFormData，保留最新的數據
        // setEditFormData({}) // 已註釋 - 保留最新的客戶數據
        setIsEditMode(false)
      }

  // 打開新增客戶表單
  const handleOpenAddModal = () => {
    setFormData({
      customer_id: '',
      name: '',
      company_name: '',
      initial_product: '',
      price: '',
      budget: '',
      phone: '',
      telephone: '',
      order_status: '',
      total_consumption: '',
      customer_rating: '',
      customer_type: '',
      source: '',
      capital_amount: '',
      nfvp_score: '',
      n_score: '',
      f_score: '',
      notes: ''
    })
    setShowAddModal(true)
  }

  // 關閉新增客戶表單
  const handleCloseAddModal = () => {
    setShowAddModal(false)
    setFormData({})
  }

  // 更新表單字段
  const handleFormChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // 更新編輯表單字段
  const handleEditFormChange = (e) => {
    const { name, value } = e.target
    setEditFormData(prev => {
      const updated = {
        ...prev,
        [name]: value
      }
      
      // 当 N 评分、F 评分、价格、年度消费变化时，实时计算 CVI 评分和客户类型
      if (['n_score', 'f_score', 'price', 'annual_consumption'].includes(name)) {
        const vScore = calculateVScore(updated.price || prev.price, updated.annual_consumption || prev.annual_consumption)
        const pScore = calculatePScore(updated.price || prev.price)
        const cviValue = calculateCVI(updated.n_score || prev.n_score, updated.f_score || prev.f_score, vScore, pScore)
        const customerType = getCustomerTypeByVP(vScore, pScore)
        
        updated.v_score = vScore
        updated.p_score = pScore
        updated.nfvp_score = cviValue
        updated.cvi_score = cviValue
        updated.customer_type = customerType
      }
      
      return updated
    })
  }

  // 保存編輯的客戶
  const handleSaveEditCustomer = async () => {
    try {
      setSaving(true)
      
      // 在保存前計算新的評分和類型
      const vScore = calculateVScore(editFormData.price, editFormData.annual_consumption)
      const pScore = calculatePScore(editFormData.price)
      const customerType = getCustomerTypeByVP(vScore, pScore)
      const nfvpValue = calculateCVI(editFormData.n_score, editFormData.f_score, vScore, pScore)
      const customerTypeLabel = getTypeLabel(customerType)  // 轉換為中文描述
      
      // 只發送數據庫中存在的字段
      const allowedFields = [
        'name', 'email', 'phone', 'company_name', 'initial_product', 'price', 'budget',
        'telephone', 'order_status', 'total_consumption', 'annual_consumption',
        'customer_rating', 'customer_type', 'source', 'capital_amount',
        'nfvp_score', 'cvi_score', 'notes', 'status', 'product_url', 'ai_analysis',
        'n_score', 'f_score', 'ai_analysis_history'
      ]
      
      const dataToSave = {}
      for (const field of allowedFields) {
        if (editFormData.hasOwnProperty(field)) {
          dataToSave[field] = editFormData[field]
        }
      }
      
      // 添加計算的值
      dataToSave.nfvp_score = nfvpValue  // 保存計算後的 CVI 分數（數值）
      dataToSave.cvi_score = nfvpValue  // 保存 CVI 分數（數值），不是文字描述
      dataToSave.customer_type = customerType  // 保存計算後的客戶類型
      
      
      const response = await fetch(`/api/customers/${selectedCustomer.id}/update-with-analysis`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dataToSave)
      })

      if (!response.ok) {
        throw new Error(`保存失敗: ${response.status}`)
      }

      const responseData = await response.json()
      const updatedCustomer = responseData.customer || responseData
      
      // 添加計算的字段到返回的客戶對象
      updatedCustomer.nfvp_score = nfvpValue  // CVI 分數
      updatedCustomer.cvi_score = customerTypeLabel  // 客戶分類中文
      updatedCustomer.v_score = vScore
      updatedCustomer.p_score = pScore
      
      // 如果後端返回了 ai_analysis 和 ai_analysis_history_json，也設置到 updatedCustomer
      if (responseData.analysis) {
        updatedCustomer.ai_analysis = responseData.analysis
      }
      if (responseData.history) {
        updatedCustomer.ai_analysis_history = JSON.stringify(responseData.history)
      }
      
      setCustomers(customers.map(c => c.id === updatedCustomer.id ? updatedCustomer : c))
      // 更新 editFormData 以反映最新的數據（包括更新後的 ai_analysis_history_json）
      setEditFormData(updatedCustomer)
      setSelectedCustomer(updatedCustomer)
      handleCloseDetailModal()
      alert('客戶已更新')
    } catch (err) {
      console.error('保存失敗:', err)
      alert(`保存失敗: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  // 生成 AI 分析
  const handleGenerateAIAnalysis = async (customer) => {
    try {
      setSaving(true)
      
      // 準備分析所需的客戶信息
      const analysisPrompt = `你是一位專業的销售顾問師。請根據以下客戶信息進行綜合分析。
客戶信息:
- 客戶名稱: ${customer.name}
- 公司名稱: ${customer.company_name}
- 詢問產品: ${customer.initial_product}
- N 計分: ${customer.n_score}
- F 計分: ${customer.f_score}
- V 計分: ${customer.v_score}
- P 計分: ${customer.p_score}
- 預算: NT$${customer.price}
- 預算: NT$${customer.budget}
- 詢問產品: ${customer.initial_product}

請提供:
1. 客戶需求分析
2. 下一步建議的行動(例如:提供報價單、確認收款等)
3. 成交概率估計(%)
4. 其他建議`
      
      const response = await fetch('/api/analyze-customer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customerId: customer.id,
          prompt: analysisPrompt
        })
      })
      
      if (!response.ok) {
        throw new Error(`分析失敗: ${response.status}`)
      }
      
      const result = await response.json()
      setEditFormData(prev => ({
        ...prev,
        ai_analysis: result.analysis
      }))
      
      alert('AI 分析完成')
    } catch (err) {
      console.error('AI 分析失敗:', err)
      alert(`AI 分析失敗: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  // 保存新客戶
  const handleSaveCustomer = async () => {
    try {
      setSaving(true)
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        throw new Error(`保存失敗: ${response.status}`)
      }

      const newCustomer = await response.json()
      setCustomers([newCustomer, ...customers])
      handleCloseAddModal()
      alert('客戶已新增')
    } catch (err) {
      console.error('保存失敗:', err)
      alert(`保存失敗: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  // 刪除客戶
  const handleDeleteCustomer = async (id) => {
    if (!window.confirm('確定要刪除此客戶嗎？')) return

    try {
      const response = await fetch(`/api/customers/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error(`刪除失敗: ${response.status}`)
      }

      setCustomers(customers.filter(c => c.id !== id))
      handleCloseDetailModal()
      alert('客戶已刪除')
    } catch (err) {
      console.error('刪除失敗:', err)
      alert(`刪除失敗: ${err.message}`)
    }
  }

  return (
    <div className="customers-page">
      <div className="page-header">
        <h1>客戶資料管理</h1>
        <p>管理和查看所有客戶信息</p>
      </div>

      {error && (
        <div className="error-banner">
          ⚠️ 數據加載失敗: {error}
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h3>客戶清單 {loading && '(加載中...)'}</h3>
        </div>

        {/* 搜尋和篩選區域 */}
        {!loading && customers.length > 0 && (
          <div className="search-filter-area" style={{
            padding: '16px',
            backgroundColor: '#f5f5f5',
            borderBottom: '1px solid #ddd',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '12px',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ marginRight: '8px', fontSize: '14px', fontWeight: '500' }}>搜尋:</span>
              <input
                type="text"
                placeholder="輸入客戶編號或名稱..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1)
                }}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value)
                  setCurrentPage(1)
                }}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  border: '1px solid #0066FF',
                  borderRadius: '4px',
                  fontSize: '14px',
                  backgroundColor: '#f0f8ff',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                <option value="">狀態</option>
                <option value="未處理">未處理</option>
                <option value="追單">追單</option>
                <option value="購買">購買</option>
                <option value="售後">售後</option>
                <option value="流失">流失</option>
              </select>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <select
                value={filterResponsible}
                onChange={(e) => {
                  setFilterResponsible(e.target.value)
                  setCurrentPage(1)
                }}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  border: '1px solid #0066FF',
                  borderRadius: '4px',
                  fontSize: '14px',
                  backgroundColor: '#f0f8ff',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                <option value="">業務名</option>
                {responsiblePersons.map((person, index) => (
                  <option key={index} value={person}>{person}</option>
                ))}
              </select>
              <button 
                onClick={toggleRatingSort}
                style={{
                  padding: '8px 12px',
                  backgroundColor: sortByRating ? '#0066FF' : '#ddd',
                  color: sortByRating ? 'white' : '#333',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  whiteSpace: 'nowrap',
                  marginLeft: '8px'
                }}
                title="評級排序"
              >
                評級 {sortByRating === 'asc' ? '↑' : sortByRating === 'desc' ? '↓' : ''}
              </button>
              <button 
                onClick={toggleTypeSort}
                style={{
                  padding: '8px 12px',
                  backgroundColor: sortByType ? '#0066FF' : '#ddd',
                  color: sortByType ? 'white' : '#333',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  whiteSpace: 'nowrap',
                  marginLeft: '8px'
                }}
                title="客戶類型排序"
              >
                客戶類型 {sortByType === 'asc' ? '↑' : sortByType === 'desc' ? '↓' : ''}
              </button>
              <button 
                onClick={toggleLastContactSort}
                style={{
                  padding: '8px 12px',
                  backgroundColor: sortByLastContact ? '#0066FF' : '#ddd',
                  color: sortByLastContact ? 'white' : '#333',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  whiteSpace: 'nowrap',
                  marginLeft: '8px'
                }}
                title="最後聯繫時間排序"
              >
                最後聯繫 {sortByLastContact === 'desc' ? '↓' : sortByLastContact === 'asc' ? '↑' : ''}
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="loading-state">
            ⏳ 正在加載客戶數據...
          </div>
        ) : customers.length === 0 ? (
          <div className="empty-state">
            📭 暫無客戶數據
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="customers-table">
              <thead>
                <tr>
                  <th>客戶編號</th>
                  <th>客戶名稱</th>
                  <th>公司名稱</th>
                  <th>詢問產品</th>
                  <th>報價</th>
                  <th onClick={() => handleSort("lastContact")} style={{ cursor: "pointer" }}>最後聯繫時間</th>
                  <th>訂單狀態</th>
                  <th>總消費</th>
                  <th>評級</th>
                  <th>客戶類型</th>
                  <th>來源</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {getPaginatedCustomers().data.map(customer => {
                  // 使用保存的客戶類型（已經根據 V/P 評分計算）
                  const customerType = customer.customer_type || 'unclassified'
                  
                  return (
                    <tr key={customer.id}>
                      <td className="clickable" onClick={() => handleViewDetailReadOnly(customer)}>
                        <span className="customer-id-link">{customer.customer_id}</span>
                      </td>
                      <td>{customer.name}</td>
                      <td>{customer.company_name || '-'}</td>
                      <td>
                        {customer.initial_product ? (
                          customer.product_url ? (
                            <a href={customer.product_url} target="_blank" rel="noopener noreferrer" style={{color: '#0066FF', textDecoration: 'underline'}}>
                              {customer.initial_product}
                            </a>
                          ) : (
                            customer.initial_product
                          )
                        ) : (
                          '-'
                        )}
                      </td>
                      <td>NT${parseFloat(customer.price || 0).toLocaleString()}</td>
                      <td>NT${parseFloat(customer.budget || 0).toLocaleString()}</td>
                      <td>{(() => {
                        if (customer.ai_analysis_history) {
                          try {
                            const history = typeof customer.ai_analysis_history === 'string' 
                              ? JSON.parse(customer.ai_analysis_history) 
                              : customer.ai_analysis_history;
                            if (Array.isArray(history) && history.length > 0) {
                              const lastRecord = history[history.length - 1];
                              const timeStr = lastRecord.timeline_text?.split(' |')[0] || '無記錄';
                              const isAudio = lastRecord.type === 'audio';
                              return (
                                <span>
                                  {isAudio ? '🎵 ' : ''}{timeStr}
                                </span>
                              );
                            }
                          } catch (err) {
                            console.error('解析時間軸失敗:', err);
                          }
                        }
                        return '無記錄';
                      })()}</td>
                      <td>{getOrderStatusTag(customer.order_status)}</td>
                      <td>NT${parseFloat(customer.total_consumption || 0).toLocaleString()}</td>
                      <td>{getRatingBadge(customer.customer_rating)}</td>
                      <td>
                        <span title={getTypeLabel(customerType)}>
                          {getTypeEmoji(customerType)} {getTypeLabel(customerType)}
                        </span>
                      </td>
                      <td>{customer.source || '-'}</td>
                      <td>
                        <button
                          className="btn btn-small"
                          onClick={() => handleViewDetail(customer)}
                        >
                          編輯
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            
            {/* 分頁控件 */}
            {getPaginatedCustomers().totalPages >= 1 && (
              <div style={{
                padding: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderTop: '1px solid #ddd',
                backgroundColor: '#f9f9f9'
              }}>
                <div style={{ fontSize: '14px', color: '#666' }}>
                  顯示 {(currentPage - 1) * itemsPerPage + 1} 到 {Math.min(currentPage * itemsPerPage, getPaginatedCustomers().total)} 筆，共 {getPaginatedCustomers().total} 筆
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    style={{
                      padding: '8px 12px',
                      backgroundColor: currentPage === 1 ? '#ccc' : '#2196F3',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    上一頁
                  </button>
                  
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    {Array.from({ length: getPaginatedCustomers().totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        style={{
                          padding: '6px 10px',
                          backgroundColor: page === currentPage ? '#2196F3' : '#e0e0e0',
                          color: page === currentPage ? 'white' : '#333',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: page === currentPage ? 'bold' : 'normal'
                        }}
                      >
                        {page}
                      </button>
                    ))}
                  </div>
                  
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(getPaginatedCustomers().totalPages, prev + 1))}
                    disabled={currentPage === getPaginatedCustomers().totalPages}
                    style={{
                      padding: '8px 12px',
                      backgroundColor: currentPage === getPaginatedCustomers().totalPages ? '#ccc' : '#2196F3',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: currentPage === getPaginatedCustomers().totalPages ? 'not-allowed' : 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    下一頁
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 詳細視窗 */}
      {showDetailModal && selectedCustomer && (
        <div className="modal-overlay" onClick={handleCloseDetailModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>客戶詳細資訊</h2>
              <button className="close-btn" onClick={handleCloseDetailModal}>×</button>
            </div>

            <div className="modal-body">
              <div className="detail-section">
                <h3>基本資訊</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>客戶編號:</label>
                    {isEditMode ? (
                      <input type="text" name="customer_id" value={editFormData.customer_id || ''} onChange={handleEditFormChange} />
                    ) : (
                      <span>{selectedCustomer.customer_id}</span>
                    )}
                  </div>
                  <div className="detail-item">
                    <label>客戶名稱:</label>
                    {isEditMode ? (
                      <input type="text" name="name" value={editFormData.name || ''} onChange={handleEditFormChange} />
                    ) : (
                      <span>{selectedCustomer.name}</span>
                    )}
                  </div>
                  <div className="detail-item">
                    <label>公司名稱:</label>
                    {isEditMode ? (
                      <input type="text" name="company_name" value={editFormData.company_name || ''} onChange={handleEditFormChange} />
                    ) : (
                      <span>{selectedCustomer.company_name || '-'}</span>
                    )}
                  </div>
                  <div className="detail-item">
                    <label>資本額:</label>
                    {isEditMode ? (
                      <input type="number" name="capital_amount" value={editFormData.capital_amount || ''} onChange={handleEditFormChange} />
                    ) : (
                      <span>NT${parseFloat(selectedCustomer.capital_amount || 0).toLocaleString()}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <h3>評分資訊</h3>
                <div className="detail-grid">
                  {/* 第一行: N 評分 + F 評分 */}
                  <div className="detail-item">
                    <label>N 評分:</label>
                    {isEditMode ? (
                      <select name="n_score" value={editFormData.n_score || ''} onChange={handleEditFormChange}>
                        <option value="">-- 選擇 --</option>
                        <option value="0">0 - 無需求 | 完全沒有需求或明確拒絕</option>
                        <option value="2">2 - 潛在需求 | 對產品有興趣，長期培養客戶</option>
                        <option value="4">4 - 初步需求 | 有興趣但需求不明確</option>
                        <option value="6">6 - 中等需求 | 有詢價評估中，短期可能成交</option>
                        <option value="8">8 - 強烈需求 | 多次詢問報價，明確短期採購計畫</option>
                        <option value="10">10 - 立即採購 | 已確認規格數量，僅待報價/下單</option>
                      </select>
                    ) : (
                      <span>
                        {(() => {
                          const scoreStr = String(editFormData.n_score || '');
                          const firstChar = scoreStr.charAt(0);
                          return (firstChar >= '0' && firstChar <= '9') ? scoreStr.split(' ')[0] : '-';
                        })()}
                      </span>
                    )}
                  </div>
                  <div className="detail-item">
                    <label>F 評分:</label>
                    {isEditMode ? (
                      <select name="f_score" value={editFormData.f_score || ''} onChange={handleEditFormChange}>
                        <option value="">-- 選擇 --</option>
                        <option value="0">0 - 完全無資金 | 無法支付</option>
                        <option value="2">2 - 可能無預算 | 對價格敵感，難以接受報價</option>
                        <option value="4">4 - 需籌措資金 | 有意願但需融資</option>
                        <option value="6">6 - 需內部審批 | 預算待內部核准</option>
                        <option value="8">8 - 高預算確定 | 預算接近標準，可能需分期</option>
                        <option value="10">10 - 充足預算 | 預算已確認，可直接支付</option>
                      </select>
                    ) : (
                      <span>
                        {(() => {
                          const scoreStr = String(editFormData.f_score || '');
                          const firstChar = scoreStr.charAt(0);
                          return (firstChar >= '0' && firstChar <= '9') ? scoreStr.split(' ')[0] : '-';
                        })()}
                      </span>
                    )}
                  </div>

                  {/* 第二行: V 評分 + P 評分 */}
                  <div className="detail-item">
                    <label>V 評分 (採購量):</label>
                    <span>{calculateVScore(editFormData.price, editFormData.annual_consumption)}</span>
                  </div>
                  <div className="detail-item">
                    <label>P 評分 (報價額):</label>
                    <span>{calculatePScore(editFormData.price)}</span>
                  </div>

                  {/* 第三行: CVI 分數 + 客戶類型 */}
                  <div className="detail-item">
                    <label>CVI 評分:</label>
                    <span>
                      {(() => {
                        const cviValue = calculateCVI(editFormData.n_score, editFormData.f_score, calculateVScore(editFormData.price, editFormData.annual_consumption), calculatePScore(editFormData.price))
                        return cviValue
                      })()}
                    </span>
                  </div>
                  <div className="detail-item">
                    <label>客戶類型:</label>
                    <span>{getTypeLabel(getCustomerTypeByVP(calculateVScore(editFormData.price, editFormData.annual_consumption), calculatePScore(editFormData.price)))}</span>
                  </div>

                  {/* 第四行: 客戶評級 */}
                  <div className="detail-item">
                    <label>客戶評級:</label>
                    {isEditMode ? (
                      <select name="customer_rating" value={editFormData.customer_rating || ''} onChange={handleEditFormChange}>
                        <option value="">-- 選擇 --</option>
                        <option value="S">S - 確認待收款</option>
                        <option value="A">A - 優質跟進客戶</option>
                        <option value="B">B - 跟進客戶</option>
                        <option value="C">C - 養成客戶</option>
                        <option value="D">D - 低價值客戶</option>
                        <option value="E">E - 黑名單/unknown</option>
                      </select>
                    ) : (
                      <span>{getRatingBadge(editFormData.customer_rating)}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <h3>交易資訊</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>詢問產品:</label>
                    {isEditMode ? (
                      <input type="text" name="initial_product" value={editFormData.initial_product || ''} onChange={handleEditFormChange} />
                    ) : (
                      <span>{selectedCustomer.initial_product || '-'}</span>
                    )}
                  </div>
                  {isEditMode && (
                    <div className="detail-item">
                      <label>商品超連結:</label>
                      <input type="text" name="product_url" value={editFormData.product_url || ''} onChange={handleEditFormChange} placeholder="輸入商品連結 URL" />
                    </div>
                  )}
                  <div className="detail-item">
                    <label>預算:</label>
                    {isEditMode ? (
                      <input type="number" name="budget" value={editFormData.budget || ''} onChange={handleEditFormChange} />
                    ) : (
                      <span>NT${parseFloat(editFormData.budget || 0).toLocaleString()}</span>
                    )}
                  </div>
                  <div className="detail-item">
                    <label>最後聯繫時間:</label>
                    {isEditMode ? (
                      <input type="text" disabled value={(() => {
                        if (editFormData.ai_analysis_history) {
                          try {
                            const history = typeof editFormData.ai_analysis_history === 'string' 
                              ? JSON.parse(editFormData.ai_analysis_history) 
                              : editFormData.ai_analysis_history;
                            if (Array.isArray(history) && history.length > 0) {
                              const lastRecord = history[history.length - 1];
                              return lastRecord.timeline_text?.split(' |')[0] || '無記錄';
                            }
                          } catch (err) {
                            console.error('解析時間軸失敗:', err);
                          }
                        }
                        return '無記錄';
                      })()} />
                    ) : (
                      <span>{(() => {
                        if (editFormData.ai_analysis_history) {
                          try {
                            const history = typeof editFormData.ai_analysis_history === 'string' 
                              ? JSON.parse(editFormData.ai_analysis_history) 
                              : editFormData.ai_analysis_history;
                            if (Array.isArray(history) && history.length > 0) {
                              const lastRecord = history[history.length - 1];
                              return lastRecord.timeline_text?.split(' |')[0] || '無記錄';
                            }
                          } catch (err) {
                            console.error('解析時間軸失敗:', err);
                          }
                        }
                        return '無記錄';
                      })()}</span>
                    )}
                  </div>
                  <div className="detail-item">
                    <label>訂單狀態:</label>
                    {isEditMode ? (
                      <select name="order_status" value={editFormData.order_status || ''} onChange={handleEditFormChange}>
                        <option value="">-- 選擇 --</option>
                        <option value="未處理">未處理</option>
                        <option value="追單">追單</option>
                        <option value="購買">購買</option>
                        <option value="售後">售後</option>
                        <option value="流失">流失</option>
                      </select>
                    ) : (
                      <span>{getOrderStatusTag(selectedCustomer.order_status)}</span>
                    )}
                  </div>
                  <div className="detail-item">
                    <label>報價:</label>
                    {isEditMode ? (
                      <input type="number" name="price" value={editFormData.price || ''} onChange={handleEditFormChange} />
                    ) : (
                      <span>NT${parseFloat(editFormData.price || 0).toLocaleString()}</span>
                    )}
                  </div>
                  <div className="detail-item">
                    <label>年度消費:</label>
                    <span>NT${parseFloat(editFormData.annual_consumption || 0).toLocaleString()}</span>
                  </div>
                  <div className="detail-item">
                    <label>總消費:</label>
                    <span>NT${parseFloat(editFormData.total_consumption || 0).toLocaleString()}</span>
                  </div>
                  <div className="detail-item">
                    <label>來源:</label>
                    {isEditMode ? (
                      <select name="source" value={editFormData.source || ''} onChange={handleEditFormChange}>
                        <option value="">-- 選擇 --</option>
                        <option value="Kipo">Kipo</option>
                        <option value="Inphic">Inphic</option>
                      </select>
                    ) : (
                      <span>{editFormData.source || '-'}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* 自動計算資訊區塊已移除 - 現在只在評分資訊部分顯示 V 評分和 P 評分 */}

              <div className="detail-section">
                <div style={{ marginTop: '0px' }}>
                  {isEditMode ? (
                    <>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>音檔上傳:</label>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <input 
                          type="file" 
                          accept="audio/*" 
                          id="audio-upload"
                          disabled={audioUploadLoading}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            
                            const maxSize = 50 * 1024 * 1024;
                            if (file.size > maxSize) {
                              setAudioUploadError('文件大小超過 50MB 限制');
                              return;
                            }
                            
                            const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm'];
                            if (!allowedTypes.includes(file.type)) {
                              setAudioUploadError('不支援的音檔格式，請上傳 MP3、WAV、OGG 或 WebM 格式');
                              return;
                            }
                            
                            setAudioUploadLoading(true);
                            setAudioUploadError(null);
                            setAudioUploadSuccess(false);
                            
                            const formData = new FormData();
                            formData.append('file', file);
                            formData.append('customerId', editFormData.id);
                            
                            fetch('/api/audio/upload', {
                              method: 'POST',
                              body: formData
                            })
                            .then(res => {
                              if (!res.ok) {
                                return res.json().then(data => {
                                  throw new Error(data.error || `HTTP ${res.status}: 上傳失敗`);
                                });
                              }
                              return res.json();
                            })
                            .then(data => {
                              if (data.success && data.audio_url) {
                                setEditFormData({...editFormData, audioUrl: data.audio_url});
                                setAudioUploadSuccess(true);
                                setAudioUploadError(null);
                                setTimeout(() => setAudioUploadSuccess(false), 3000);
                              } else {
                                throw new Error(data.error || '上傳失敗：未收到有效的 URL');
                              }
                            })
                            .catch(err => {
                              console.error('音檔上傳錯誤:', err);
                              setAudioUploadError(`❌ ${err.message}`);
                            })
                            .finally(() => {
                              setAudioUploadLoading(false);
                            });
                          }}
                          style={{ display: 'none' }}
                        />
                        <button 
                          className="btn btn-primary"
                          onClick={() => document.getElementById('audio-upload').click()}
                          style={{ padding: '8px 16px', fontSize: '14px' }}
                        >
選擇音檔
                        </button>
                        {editFormData.audioUrl && (
                          <>
                            <audio controls style={{ height: '32px', flex: 1 }}>
                              <source src={editFormData.audioUrl} />
您的瀏覽器不支援音檔播放
                            </audio>
                            <button 
                              className="btn btn-danger"
                              onClick={() => {
                                fetch(`/api/audio/delete/${editFormData.id}`, { method: 'DELETE' })
                                .then(res => res.json())
                                .then(data => {
                                  if (data.success) {
                                    setEditFormData({...editFormData, audioUrl: null});
                                  }
                                });
                              }}
                              style={{ padding: '8px 12px', fontSize: '12px' }}
                            >
刪除
                            </button>
                          </>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      {selectedCustomer.audioUrl && (
                        <>
                          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>\ud83c\udd0a \u901a\u8a71\u7d00\u9304:</label>
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <span style={{ fontSize: '24px', cursor: 'pointer' }} title="\u64ad\u653e\u97f3\u6a94">\ud83d\udd0a</span>
                            <audio controls style={{ height: '32px', flex: 1 }}>
                              <source src={selectedCustomer.audioUrl} />
\u60a8\u7684\u700f\u89bd\u5668\u4e0d\u652f\u63f4\u97f3\u6a94\u64ad\u653e
                            </audio>
                          </div>
                          <div style={{ marginTop: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>AI \u5206\u6790:</label>
                            <div style={{ padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px', minHeight: '60px' }}>
                              {selectedCustomer.aiAnalysis || '\u6b62\u4e0d\u6709 AI \u5206\u6790\u8cc7\u6599'}
                            </div>
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="detail-section">
                <h3>溝通紀錄時間軸</h3>
                <div className="notes-box">
                  {(() => {
                    const timelineRecords = [];
                    
                    // 如果有音檔，添加音檔紀錄
                    if (selectedCustomer.audioUrl) {
                      timelineRecords.push({
                        type: 'audio',
                        date: selectedCustomer.audio_upload_date || new Date().toLocaleDateString('zh-TW'),
                        description: '通話錄音'
                      });
                    }
                    
                    // 如果有 AI 分析歷史，添加文字紀錄
                    if (editFormData.ai_analysis_history) {
                      let history = null;
                      try {
                        if (typeof editFormData.ai_analysis_history === 'string') {
                          history = JSON.parse(editFormData.ai_analysis_history);
                        } else {
                          history = editFormData.ai_analysis_history;
                        }
                      } catch (err) {
                        console.error('解析 ai_analysis_history 失敗:', err);
                      }
                      
                      if (history && Array.isArray(history)) {
                        history.forEach((record) => {
                          timelineRecords.push({
                            type: record.type || 'text',
                            date: record.timeline_text ? record.timeline_text.split(' |')[0] : new Date(record.timestamp).toLocaleDateString('zh-TW'),
                            description: record.timeline_text || (record.type === 'audio' ? '通話錄音' : '文字紀錄'),
                            audio_url: record.audio_url
                          });
                        });
                      }
                    }
                    
                    // 如果沒有紀錄
                    if (timelineRecords.length === 0) {
                      return (
                        <div style={{padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '4px', color: '#999', textAlign: 'center'}}>
                          暫無溝通紀錄
                        </div>
                      );
                    }
                    
                    // 反轉時間軸順序，使最新的時間在最上面
                    const reversedRecords = [...timelineRecords].reverse();
                    
                    // 渲染時間軸
                    return (
                      <div style={{position: 'relative', paddingLeft: '30px'}}>
                        {/* 時間軸豎線 */}
                        <div style={{
                          position: 'absolute',
                          left: '10px',
                          top: '0',
                          bottom: '0',
                          width: '2px',
                          backgroundColor: '#0066FF'
                        }}></div>
                        
                        {/* 時間軸項目 */}
                        {reversedRecords.map((record, idx) => (
                          <div key={idx} style={{marginBottom: '20px', position: 'relative'}}>
                            {/* 時間軸圓點 */}
                            <div style={{
                              position: 'absolute',
                              left: '-22px',
                              top: '2px',
                              width: '14px',
                              height: '14px',
                              backgroundColor: record.type === 'audio' ? '#FF6B6B' : '#4CAF50',
                              borderRadius: '50%',
                              border: '2px solid white',
                              boxShadow: '0 0 0 2px #0066FF'
                            }}></div>
                            
                            {/* 時間軸內容 */}
                            <div style={{
                              padding: '10px 12px',
                              backgroundColor: '#f9f9f9',
                              border: '1px solid #e0e0e0',
                              borderRadius: '4px'
                            }}>
                              <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px'}}>
                                <span style={{
                                  display: 'inline-block',
                                  padding: '2px 8px',
                                  backgroundColor: record.type === 'audio' ? '#FFE6E6' : '#E8F5E9',
                                  color: record.type === 'audio' ? '#D32F2F' : '#2E7D32',
                                  borderRadius: '3px',
                                  fontSize: '12px',
                                  fontWeight: 'bold'
                                }}>
                                  {record.type === 'audio' ? '🎵 音檔' : '📝 文字'}
                                </span>
                                <span style={{fontSize: '13px', color: '#666'}}>{record.date}</span>
                              </div>
                              <div style={{fontSize: '14px', color: '#333'}}>{record.description}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div className="detail-section">
                <h3>備註</h3>
                {isEditMode ? (
                  <textarea name="notes" value={editFormData.notes || ''} onChange={handleEditFormChange} style={{width: '100%', minHeight: '100px'}} />
                ) : (
                  <div className="notes-box">
                    {editFormData.notes || '無備註'}
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              {isEditMode ? (
                <>
                  <button className="btn btn-primary" onClick={handleSaveEditCustomer} disabled={saving}>
                    {saving ? '保存中...' : '儲存'}
                  </button>
                  <button className="btn btn-secondary" onClick={handleCloseDetailModal}>
                    取消
                  </button>
                </>
              ) : (
                <button className="btn btn-secondary" onClick={handleCloseDetailModal}>
                  關閉
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 新增客戶表單 */}
      {showAddModal && (
        <div className="modal-overlay" onClick={handleCloseAddModal}>
          <div className="modal-content large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>新增客戶</h2>
              <button className="close-btn" onClick={handleCloseAddModal}>×</button>
            </div>

            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>客戶編號 *</label>
                  <input
                    type="text"
                    name="customer_id"
                    value={formData.customer_id || ''}
                    onChange={handleFormChange}
                    placeholder="例: 20251106001"
                  />
                </div>

                <div className="form-group">
                  <label>客戶名稱 *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name || ''}
                    onChange={handleFormChange}
                    placeholder="輸入客戶名稱"
                  />
                </div>

                <div className="form-group">
                  <label>公司名稱</label>
                  <input
                    type="text"
                    name="company_name"
                    value={formData.company_name || ''}
                    onChange={handleFormChange}
                    placeholder="輸入公司名稱"
                  />
                </div>

                <div className="form-group">
                  <label>詢問產品</label>
                  <input
                    type="text"
                    name="initial_product"
                    value={formData.initial_product || ''}
                    onChange={handleFormChange}
                    placeholder="輸入詢問產品"
                  />
                </div>

                <div className="form-group">
                  <label>商品超連結</label>
                  <input
                    type="text"
                    name="product_url"
                    value={formData.product_url || ''}
                    onChange={handleFormChange}
                    placeholder="輸入商品連結 URL"
                  />
                </div>

                <div className="form-group">
                  <label>報價</label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price || ''}
                    onChange={handleFormChange}
                    placeholder="輸入報價"
                  />
                </div>

                <div className="form-group">
                  <label>預算</label>
                  <input
                    type="number"
                    name="budget"
                    value={formData.budget || ''}
                    onChange={handleFormChange}
                    placeholder="輸入預算"
                  />
                </div>

                <div className="form-group">
                  <label>電話</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone || ''}
                    onChange={handleFormChange}
                    placeholder="輸入電話"
                  />
                </div>

                <div className="form-group">
                  <label>電話號碼</label>
                  <input
                    type="tel"
                    name="telephone"
                    value={formData.telephone || ''}
                    onChange={handleFormChange}
                    placeholder="輸入電話號碼"
                  />
                </div>

                <div className="form-group">
                  <label>訂單狀態</label>
                  <select
                    name="order_status"
                    value={formData.order_status || ''}
                    onChange={handleFormChange}
                  >
                    <option value="">-- 選擇 --</option>
                    <option value="未處理">未處理</option>
                    <option value="追單">追單</option>
                    <option value="購買">購買</option>
                    <option value="售後">售後</option>
                    <option value="流失">流失</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>總消費</label>
                  <input
                    type="number"
                    name="total_consumption"
                    value={formData.total_consumption || ''}
                    onChange={handleFormChange}
                    placeholder="輸入總消費"
                  />
                </div>

                <div className="form-group">
                  <label>客戶評級</label>
                  <select
                    name="customer_rating"
                    value={formData.customer_rating || ''}
                    onChange={handleFormChange}
                  >
                    <option value="">-- 選擇 --</option>
                    <option value="S">S</option>
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                    <option value="D">D</option>
                    <option value="E">E</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>來源</label>
                  <input
                    type="text"
                    name="source"
                    value={formData.source || ''}
                    onChange={handleFormChange}
                    placeholder="輸入來源"
                  />
                </div>

                <div className="form-group">
                  <label>資本額</label>
                  <input
                    type="number"
                    name="capital_amount"
                    value={formData.capital_amount || ''}
                    onChange={handleFormChange}
                    placeholder="輸入資本額"
                  />
                </div>

                <div className="form-group">
                  <label>NFVP 評分</label>
                  <input
                    type="number"
                    step="0.1"
                    // nfvp_score 是旧的評分，不再更新
                    // name="nfvp_score"
                    // value={formData.nfvp_score || ''}
                    onChange={handleFormChange}
                    placeholder="輸入 NFVP 評分"
                  />
                </div>

                <div className="form-group">
                  <label>CVI 評分</label>
                  <input
                    type="number"
                    step="0.01"
                    name="cvi_score"
                    value={formData.cvi_score || ''}
                    onChange={handleFormChange}
                    placeholder="輸入 CVI 評分"
                  />
                </div>

                <div className="form-group full-width">
                  <label>備註</label>
                  <textarea
                    name="notes"
                    value={formData.notes || ''}
                    onChange={handleFormChange}
                    placeholder="輸入備註"
                    rows="4"
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-primary"
                onClick={handleSaveCustomer}
                disabled={saving}
              >
                {saving ? '保存中...' : '保存'}
              </button>
              <button className="btn btn-secondary" onClick={handleCloseAddModal}>
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Customers

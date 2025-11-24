import React, { useState, useEffect } from 'react';
import CustomerDetailModal from '../components/CustomerDetailModal';
import '../styles/customers.css';


// ... (保留所有的輔助函數，例如 cleanAnnualConsumption, calculateVScore, etc.)

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
  const [showAnalysisModal, setShowAnalysisModal] = useState(false)
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

  // 生成業務名列表（只有 4 個固定名字）
  const generateResponsiblePersons = () => {
    const names = [
      '何雨達', '郭庭碩', '鍾汶憲', '何佳珊'
    ]
    setResponsiblePersons(names)
  }

  // 根據搜尋條件過濾客戶列表
  const filteredCustomers = customers.filter(customer => {
    const query = searchQuery.toLowerCase()
    const nameMatch = customer.customer_name && customer.customer_name.toLowerCase().includes(query)
    const phoneMatch = customer.phone && customer.phone.toLowerCase().includes(query)
    const statusMatch = filterStatus ? customer.order_status === filterStatus : true
    const responsibleMatch = filterResponsible ? customer.responsible_person === filterResponsible : true
    return (nameMatch || phoneMatch) && statusMatch && responsibleMatch
  })

  // 排序邏輯
  const sortedCustomers = [...filteredCustomers].sort((a, b) => {
    if (sortByRating) {
      const ratingA = a.customer_rating || ''
      const ratingB = b.customer_rating || ''
      return sortByRating === 'asc' ? ratingA.localeCompare(ratingB) : ratingB.localeCompare(ratingA)
    }
    if (sortByType) {
      const typeA = getCustomerType(a.nfvp_score)
      const typeB = getCustomerType(b.nfvp_score)
      return sortByType === 'asc' ? typeA.localeCompare(typeB) : typeB.localeCompare(typeA)
    }
    if (sortByLastContact) {
      const dateA = a.last_contact_date ? new Date(a.last_contact_date) : 0
      const dateB = b.last_contact_date ? new Date(b.last_contact_date) : 0
      return sortByLastContact === 'asc' ? dateA - dateB : dateB - dateA
    }
    return 0
  })

  // 分頁邏輯
  const indexOfLastCustomer = currentPage * itemsPerPage
  const indexOfFirstCustomer = indexOfLastCustomer - itemsPerPage
  const currentCustomers = sortedCustomers.slice(indexOfFirstCustomer, indexOfLastCustomer)

  const paginate = (pageNumber) => setCurrentPage(pageNumber)

  const fetchCustomers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/customers')
      if (!response.ok) {
        throw new Error('無法獲取客戶數據')
      }
      const data = await response.json()
      setCustomers(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCustomers()
    generateResponsiblePersons()
  }, [renderTrigger])

  const handleViewDetail = (customer) => {
    setSelectedCustomer(customer)
    setEditFormData(customer)
    setShowDetailModal(true)
    setIsEditMode(false)
  }

  const handleViewDetailReadOnly = (customer) => {
    setSelectedCustomer(customer)
    setEditFormData(customer)
    setShowDetailModal(true)
    setIsEditMode(false)
  }

  const handleCloseDetailModal = () => {
    setShowDetailModal(false)
    setSelectedCustomer(null)
  }

  const handleCloseAnalysisModal = () => {
    setShowAnalysisModal(false)
  }

  const handleAddCustomer = () => {
    setFormData({})
    setShowAddModal(true)
  }

  const handleCloseAddModal = () => {
    setShowAddModal(false)
  }

  const handleFormChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleEditFormChange = (e) => {
    const { name, value } = e.target
    setEditFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSaveCustomer = async () => {
    try {
      setSaving(true)
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      if (!response.ok) {
        throw new Error('保存失敗')
      }
      setShowAddModal(false)
      setRenderTrigger(prev => prev + 1)
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveEditCustomer = async () => {
    try {
      setSaving(true)
      const response = await fetch(`/api/customers/${selectedCustomer.customer_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData)
      })
      if (!response.ok) {
        throw new Error('更新失敗')
      }
      setShowDetailModal(false)
      setRenderTrigger(prev => prev + 1)
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleAudioUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    setAudioUploadLoading(true)
    setAudioUploadError(null)
    setAudioUploadSuccess(false)

    const formData = new FormData()
    formData.append('audio', file)
    formData.append('customer_id', selectedCustomer.customer_id)

    try {
      const response = await fetch('/api/upload-audio', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || '上傳失敗')
      }

      const result = await response.json()
      setAudioUploadSuccess(true)
      // 更新客戶的 AI 分析歷史
      setEditFormData(prev => ({ ...prev, ai_analysis_history: result.ai_analysis_history }))
      // 重新渲染
      setRenderTrigger(prev => prev + 1)
    } catch (err) {
      setAudioUploadError(err.message)
    } finally {
      setAudioUploadLoading(false)
    }
  }

  if (loading) return <div className="loading-container"><div className="loading-spinner"></div></div>
  if (error) return <div className="error-container">錯誤：{error}</div>

  return (
    <div className="customers-page">
      <div className="page-header">
        <h1>客戶列表</h1>
        <button className="btn btn-primary" onClick={handleAddCustomer}>新增客戶</button>
      </div>

      <div className="filters-container">
        <input
          type="text"
          placeholder="搜尋客戶名稱或電話..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="filter-select">
          <option value="">所有狀態</option>
          <option value="未處理">未處理</option>
          <option value="追單">追單</option>
          <option value="購買">購買</option>
          <option value="售後">售後</option>
          <option value="流失">流失</option>
        </select>
        <select value={filterResponsible} onChange={(e) => setFilterResponsible(e.target.value)} className="filter-select">
          <option value="">所有業務</option>
          {responsiblePersons.map(person => <option key={person} value={person}>{person}</option>)}
        </select>
      </div>

      <div className="table-container">
        <table className="customers-table">
          <thead>
            <tr>
              <th>客戶ID</th>
              <th>客戶名稱</th>
              <th>電話</th>
              <th>業務</th>
              <th onClick={() => setSortByRating(sortByRating === 'asc' ? 'desc' : 'asc')}>客戶評級</th>
              <th onClick={() => setSortByType(sortByType === 'asc' ? 'desc' : 'asc')}>客戶分類</th>
              <th>訂單狀態</th>
              <th onClick={() => setSortByLastContact(sortByLastContact === 'asc' ? 'desc' : 'asc')}>最後聯繫日</th>
              <th>成交機率</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {currentCustomers.map(customer => {
              const vScore = calculateVScore(customer.price, customer.annual_consumption)
              const pScore = calculatePScore(customer.price)
              const cviScore = calculateCVI(customer.n_score, customer.f_score, vScore, pScore)
              const customerType = getCustomerTypeByVP(vScore, pScore)
              const analysisHistory = parseAnalysisHistory(customer.ai_analysis_history)
              const latestAnalysis = analysisHistory ? analysisHistory[analysisHistory.length - 1] : null
              const probability = latestAnalysis ? extractProbability(latestAnalysis.analysis_text) : null

              return (
                <tr key={customer.customer_id}>
                  <td>{customer.customer_id}</td>
                  <td>{customer.customer_name}</td>
                  <td className="phone-number" onClick={() => handleViewDetailReadOnly(customer)}>{customer.phone}</td>
                  <td>{customer.responsible_person}</td>
                  <td>{getRatingBadge(customer.customer_rating)}</td>
                  <td>{getTypeEmoji(customerType)} {getTypeLabel(customerType)}</td>
                  <td>{getOrderStatusTag(customer.order_status)}</td>
                  <td>{customer.last_contact_date ? new Date(customer.last_contact_date).toLocaleDateString() : '-'}</td>
                  <td>{probability !== null ? `${probability}%` : '-'}</td>
                  <td>
                    <button className="btn-view" onClick={() => handleViewDetail(customer)}>查看</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {showDetailModal && (
        <CustomerDetailModal
          selectedCustomer={selectedCustomer}
          handleCloseDetailModal={handleCloseDetailModal}
          isEditMode={isEditMode}
          editFormData={editFormData}
          handleEditFormChange={handleEditFormChange}
          handleSaveEditCustomer={handleSaveEditCustomer}
          saving={saving}
          calculateVScore={calculateVScore}
          calculatePScore={calculatePScore}
          calculateCVI={calculateCVI}
          getTypeLabel={getTypeLabel}
          getRatingBadge={getRatingBadge}
          getOrderStatusTag={getOrderStatusTag}
        />
      )}

      {/* 新增客戶 Modal 保持不變 */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>新增客戶</h2>
              <button className="close-button" onClick={handleCloseAddModal}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>客戶名稱</label>
                  <input
                    type="text"
                    name="customer_name"
                    value={formData.customer_name || ''}
                    onChange={handleFormChange}
                    placeholder="輸入客戶名稱"
                  />
                </div>

                <div className="form-group">
                  <label>電話</label>
                  <input
                    type="text"
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

export default Customers;

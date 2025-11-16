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
  
  return 'unclassified'
}

// 客戶類型標籤
const getTypeLabel = (type) => {
  const typeMap = {
    'shark': '鯊魚客戶',
    'whale': '鯨魚客戶',
    'grass': '草魚客戶',
    'shrimp': '小蝦客戶',
    'unclassified': '未分類'
  }
  return typeMap[type] || type
}

// 客戶類型 emoji
const getTypeEmoji = (type) => {
  const emojiMap = {
    'shark': '🦈',
    'whale': '🐋',
    'grass': '🐟',
    'shrimp': '🦐',
    'unclassified': '❓'
  }
  return emojiMap[type] || ''
}

// 客戶評級標籤
const getRatingBadge = (rating, style = {}) => {
  const ratingMap = {
    'S': { bg: '#FF6B6B', label: 'S - 確認待收款' },
    'A': { bg: '#4ECDC4', label: 'A - 優質跟進客戶' },
    'B': { bg: '#45B7D1', label: 'B - 跟進客戶' },
    'C': { bg: '#FFA07A', label: 'C - 養成客戶' },
    'D': { bg: '#98D8C8', label: 'D - 低價值客戶' },
    'E': { bg: '#999999', label: 'E - 黑名單/unknown' }
  }
  
  const ratingInfo = ratingMap[rating] || { bg: '#999', label: rating || '-' }
  const note = ratingInfo.label
  
  return (
    <span style={{
      display: 'inline-block',
      backgroundColor: ratingInfo.bg,
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
    '成交': { color: '#4CAF50', label: '成交' },
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
      f_score: customer.f_score || ''
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
  }

  // 處理表單變化
  const handleFormChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // 處理編輯表單變化
  const handleEditFormChange = (e) => {
    const { name, value } = e.target
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // 保存新客戶
  const handleSaveNewCustomer = async () => {
    if (!formData.customer_id || !formData.name) {
      alert('客戶編號和名稱為必填項')
      return
    }

    try {
      setSaving(true)
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const newCustomer = await response.json()
      setCustomers([...customers, newCustomer])
      handleCloseAddModal()
      alert('客戶新增成功')
    } catch (err) {
      console.error('新增客戶失敗:', err)
      alert(`新增客戶失敗: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  // 保存編輯的客戶
  const handleSaveEditCustomer = async () => {
    if (!editFormData.customer_id || !editFormData.name) {
      alert('客戶編號和名稱為必填項')
      return
    }

    try {
      setSaving(true)
      const response = await fetch(`/api/customers/${editFormData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editFormData)
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const updatedCustomer = await response.json()
      setCustomers(customers.map(c => c.id === editFormData.id ? updatedCustomer : c))
      handleCloseDetailModal()
      alert('客戶更新成功')
    } catch (err) {
      console.error('更新客戶失敗:', err)
      alert(`更新客戶失敗: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  // 刪除客戶
  const handleDeleteCustomer = async (customerId) => {
    if (!window.confirm('確定要刪除此客戶嗎？')) {
      return
    }

    try {
      const response = await fetch(`/api/customers/${customerId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      setCustomers(customers.filter(c => c.id !== customerId))
      handleCloseDetailModal()
      alert('客戶刪除成功')
    } catch (err) {
      console.error('刪除客戶失敗:', err)
      alert(`刪除客戶失敗: ${err.message}`)
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
          ❌ 錯誤: {error}
        </div>
      )}

      <div className="card">
        {/* 搜尋和篩選區域 */}
        {customers.length > 0 && (
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
              <span style={{ marginRight: '8px', fontSize: '14px', fontWeight: '500' }}>狀態:</span>
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value)
                  setCurrentPage(1)
                }}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              >
                <option value="">全部狀態</option>
                <option value="未處理">未處理</option>
                <option value="追單">追單</option>
                <option value="成交">成交</option>
                <option value="售後">售後</option>
                <option value="流失">流失</option>
              </select>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ marginRight: '8px', fontSize: '14px', fontWeight: '500' }}>負責人:</span>
              <select
                value={filterResponsible}
                onChange={(e) => {
                  setFilterResponsible(e.target.value)
                  setCurrentPage(1)
                }}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              >
                <option value="">全部負責人</option>
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
                  whiteSpace: 'nowrap'
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
                  whiteSpace: 'nowrap'
                }}
                title="客戶類型排序"
              >
                客戶類型 {sortByType === 'asc' ? '↑' : sortByType === 'desc' ? '↓' : ''}
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
                  <th>預算</th>
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

            {/* 分頁控制 */}
            {getPaginatedCustomers().totalPages > 1 && (
              <div className="pagination" style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '20px',
                padding: '16px'
              }}>
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="btn btn-secondary"
                >
                  上一頁
                </button>
                <span style={{ padding: '8px 12px', lineHeight: '1.5' }}>
                  第 {currentPage} / {getPaginatedCustomers().totalPages} 頁
                </span>
                <button
                  onClick={() => setCurrentPage(Math.min(getPaginatedCustomers().totalPages, currentPage + 1))}
                  disabled={currentPage === getPaginatedCustomers().totalPages}
                  className="btn btn-secondary"
                >
                  下一頁
                </button>
              </div>
            )}
          </div>
        )}

        <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #eee' }}>
          <button onClick={handleOpenAddModal} className="btn btn-primary">
            + 新增客戶
          </button>
        </div>
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
                    <label>訂單狀態:</label>
                    {isEditMode ? (
                      <select name="order_status" value={editFormData.order_status || ''} onChange={handleEditFormChange}>
                        <option value="">-- 選擇 --</option>
                        <option value="未處理">未處理</option>
                        <option value="追單">追單</option>
                        <option value="成交">成交</option>
                        <option value="售後">售後</option>
                        <option value="流失">流失</option>
                      </select>
                    ) : (
                      <span>{getOrderStatusTag(selectedCustomer.order_status)}</span>
                    )}
                  </div>
                  <div className="detail-item">
                    <label>預算:</label>
                    {isEditMode ? (
                      <input type="number" name="budget" value={editFormData.budget || ''} onChange={handleEditFormChange} />
                    ) : (
                      <span>NT${parseFloat(editFormData.budget || 0).toLocaleString()}</span>
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
                          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>🔊 通話紀錄:</label>
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <span style={{ fontSize: '24px', cursor: 'pointer' }} title="播放音檔">🔊</span>
                            <audio controls style={{ height: '32px', flex: 1 }}>
                              <source src={selectedCustomer.audioUrl} />
您的瀏覽器不支援音檔播放
                            </audio>
                          </div>
                          <div style={{ marginTop: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>AI 分析:</label>
                            <div style={{ padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px', minHeight: '60px' }}>
                              {selectedCustomer.aiAnalysis || '止不有 AI 分析資料'}
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
                <div style={{marginTop: '15px'}}>
                  {(() => {
                    // 構建時間軸紀錄
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
                            type: 'text',
                            date: record.timeline_text ? record.timeline_text.split(' |')[0] : new Date(record.timestamp).toLocaleDateString('zh-TW'),
                            description: record.timeline_text || '文字紀錄'
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
                        {timelineRecords.map((record, idx) => (
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
              <div className="detail-grid">
                <div className="detail-item">
                  <label>客戶編號: *</label>
                  <input type="text" name="customer_id" value={formData.customer_id || ''} onChange={handleFormChange} />
                </div>
                <div className="detail-item">
                  <label>客戶名稱: *</label>
                  <input type="text" name="name" value={formData.name || ''} onChange={handleFormChange} />
                </div>
                <div className="detail-item">
                  <label>公司名稱:</label>
                  <input type="text" name="company_name" value={formData.company_name || ''} onChange={handleFormChange} />
                </div>
                <div className="detail-item">
                  <label>資本額:</label>
                  <input type="number" name="capital_amount" value={formData.capital_amount || ''} onChange={handleFormChange} />
                </div>
                <div className="detail-item">
                  <label>詢問產品:</label>
                  <input type="text" name="initial_product" value={formData.initial_product || ''} onChange={handleFormChange} />
                </div>
                <div className="detail-item">
                  <label>商品超連結:</label>
                  <input type="text" name="product_url" value={formData.product_url || ''} onChange={handleFormChange} placeholder="輸入商品連結 URL" />
                </div>
                <div className="detail-item">
                  <label>報價:</label>
                  <input type="number" name="price" value={formData.price || ''} onChange={handleFormChange} />
                </div>
                <div className="detail-item">
                  <label>預算:</label>
                  <input type="number" name="budget" value={formData.budget || ''} onChange={handleFormChange} />
                </div>
                <div className="detail-item">
                  <label>年度消費:</label>
                  <input type="number" name="annual_consumption" value={formData.annual_consumption || ''} onChange={handleFormChange} />
                </div>
                <div className="detail-item">
                  <label>訂單狀態:</label>
                  <select name="order_status" value={formData.order_status || ''} onChange={handleFormChange}>
                    <option value="">-- 選擇 --</option>
                    <option value="未處理">未處理</option>
                    <option value="追單">追單</option>
                    <option value="成交">成交</option>
                    <option value="售後">售後</option>
                    <option value="流失">流失</option>
                  </select>
                </div>
                <div className="detail-item">
                  <label>客戶評級:</label>
                  <select name="customer_rating" value={formData.customer_rating || ''} onChange={handleFormChange}>
                    <option value="">-- 選擇 --</option>
                    <option value="S">S - 確認待收款</option>
                    <option value="A">A - 優質跟進客戶</option>
                    <option value="B">B - 跟進客戶</option>
                    <option value="C">C - 養成客戶</option>
                    <option value="D">D - 低價值客戶</option>
                    <option value="E">E - 黑名單/unknown</option>
                  </select>
                </div>
                <div className="detail-item">
                  <label>來源:</label>
                  <select name="source" value={formData.source || ''} onChange={handleFormChange}>
                    <option value="">-- 選擇 --</option>
                    <option value="Kipo">Kipo</option>
                    <option value="Inphic">Inphic</option>
                  </select>
                </div>
                <div className="detail-item">
                  <label>N 評分:</label>
                  <select name="n_score" value={formData.n_score || ''} onChange={handleFormChange}>
                    <option value="">-- 選擇 --</option>
                    <option value="0">0 - 無需求</option>
                    <option value="2">2 - 潛在需求</option>
                    <option value="4">4 - 初步需求</option>
                    <option value="6">6 - 中等需求</option>
                    <option value="8">8 - 強烈需求</option>
                    <option value="10">10 - 立即採購</option>
                  </select>
                </div>
                <div className="detail-item">
                  <label>F 評分:</label>
                  <select name="f_score" value={formData.f_score || ''} onChange={handleFormChange}>
                    <option value="">-- 選擇 --</option>
                    <option value="0">0 - 完全無資金</option>
                    <option value="2">2 - 可能無預算</option>
                    <option value="4">4 - 需籌措資金</option>
                    <option value="6">6 - 需內部審批</option>
                    <option value="8">8 - 高預算確定</option>
                    <option value="10">10 - 充足預算</option>
                  </select>
                </div>
              </div>
              <div className="detail-item" style={{marginTop: '15px'}}>
                <label>備註:</label>
                <textarea name="notes" value={formData.notes || ''} onChange={handleFormChange} style={{width: '100%', minHeight: '80px'}} />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-primary" onClick={handleSaveNewCustomer} disabled={saving}>
                {saving ? '新增中...' : '新增'}
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

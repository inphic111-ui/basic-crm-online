import React, { useState, useEffect } from 'react'
import '../styles/customers.css'

// 根據採購量計算 V 評分
// 採購量範圍：每年採購總額（包含下限，不包含上限）
const calculateVScore = (price, annualConsumption = 0) => {
  const p = parseFloat(price) || 0
  const ac = parseFloat(annualConsumption) || 0
  const total = p + ac
  console.log('calculateVScore called with price:', p, 'annualConsumption:', ac, 'total:', total)
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
  console.log('calculateCVI called with:', { nScore, fScore, vScore, pScore })
  const n = parseFloat(nScore) || 0
  const f = parseFloat(fScore) || 0
  const v = parseFloat(vScore) || 0
  const p = parseFloat(pScore) || 0
  
  const cvi = (n * 0.4) + (f * 0.3) + (v * 0.2) + (p * 0.1)
  console.log('calculated CVI:', cvi)
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
  
  const style = badgeStyles[rating] || badgeStyles['E']
  
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
      ...style
    }}>
      {rating || '-'}
    </span>
  )
}

// 訂單狀態標籤
const getOrderStatusTag = (status) => {
  const statusMap = {
    '追單': { color: '#FF9800', label: '追單' },
    '成交': { color: '#4CAF50', label: '成交' },
    '售後': { color: '#2196F3', label: '售後' },
    '不買': { color: '#F44336', label: '不買' }
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
  }, [])

  // 初始化客戶表
  const handleInitTable = async () => {
    try {
      const response = await fetch('/api/customers/init-table', {
        method: 'POST'
      })
      if (!response.ok) {
        throw new Error(`初始化失敗: ${response.status}`)
      }
      alert('客戶表已初始化')
      window.location.reload()
    } catch (err) {
      alert(`初始化失敗: ${err.message}`)
    }
  }

  // 打開詳細視窗（可編輯模式）
  const handleViewDetail = (customer) => {
    console.log('打開編輯模式：客戶數據:', customer)
    setSelectedCustomer(customer)
      // 確保 nfvp_score_n 和 nfvp_score_f 有預設值
    const formData = {
      ...customer,
      nfvp_score_n: customer.nfvp_score_n || '',
      nfvp_score_f: customer.nfvp_score_f || '',
      nfvp_score: customer.nfvp_score || ''
    }
    setEditFormData(formData)
    setIsEditMode(true)
    setShowDetailModal(true)
  }

  // 打開詳細視窗（只讀模式）
  const handleViewDetailReadOnly = (customer) => {
    setSelectedCustomer(customer)
    setEditFormData(customer)
    setIsEditMode(false)
    setShowDetailModal(true)
  }

  // 關閉詳細視窗
  const handleCloseDetailModal = () => {
    setShowDetailModal(false)
    setSelectedCustomer(null)
    setIsEditMode(false)
    setEditFormData({})
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
      nfvp_score_n: '',
      nfvp_score_f: '',
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
    console.log(`編輯表單變化: ${name} = ${value}`)
    console.log('Before update, editFormData.budget:', editFormData.budget)
    setEditFormData(prev => {
      const updated = {
        ...prev,
        [name]: value
      }
      console.log('After update, updated.budget:', updated.budget)
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
      const nfvpValue = calculateCVI(editFormData.nfvp_score_n, editFormData.nfvp_score_f, vScore, pScore)
      const customerTypeLabel = getTypeLabel(customerType)  // 轉換為中文描述
      
      // 更新表單數據以包含計算的值
      // 注意：不發送 nfvp_score_n 和 nfvp_score_f，只發送計算後的 nfvp_score 和 cvi_score（客戶分類類型）
      const dataToSave = {
        ...editFormData,
        nfvp_score: nfvpValue,  // 保存計算後的 CVI 分數（數值）
        cvi_score: customerTypeLabel  // 保存客戶分類中文描述（鯊魚客戶、鯨魚客戶等）
      }
      // 移除 nfvp_score_n 和 nfvp_score_f，不發送給後端
      delete dataToSave.nfvp_score_n
      delete dataToSave.nfvp_score_f
      // 不動 customer_type 和 notes
      delete dataToSave.customer_type
      
      const response = await fetch(`/api/customers/${selectedCustomer.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dataToSave)
      })

      if (!response.ok) {
        throw new Error(`保存失敗: ${response.status}`)
      }

      const updatedCustomer = await response.json()
      
      // 添加計算侌的字段到返回的客戶對象
      updatedCustomer.nfvp_score = nfvpValue  // CVI 分數
      updatedCustomer.cvi_score = customerTypeLabel  // 客戶分類中文
      updatedCustomer.v_score = vScore
      updatedCustomer.p_score = pScore
      
      setCustomers(customers.map(c => c.id === updatedCustomer.id ? updatedCustomer : c))
      handleCloseDetailModal()
      alert('客戶已更新')
    } catch (err) {
      console.error('保存失敗:', err)
      alert(`保存失敗: ${err.message}`)
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
          <div className="button-group">
            <button onClick={handleOpenAddModal} className="btn btn-primary">
              + 新增客戶
            </button>
            <button onClick={handleInitTable} className="btn btn-secondary">
              初始化表
            </button>
          </div>
        </div>

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
                  <th>初始產品</th>
                  <th>報價</th>
                  <th>預算</th>
                  <th>電話</th>
                  <th>訂單狀態</th>
                  <th>總消費</th>
                  <th>評級</th>
                  <th>客戶類型</th>
                  <th>來源</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {customers.map(customer => {
                  // 使用保存的客戶類型（已經根據 V/P 評分計算）
                  const customerType = customer.customer_type || 'unclassified'
                  
                  return (
                    <tr key={customer.id}>
                      <td className="clickable" onClick={() => handleViewDetailReadOnly(customer)}>
                        <span className="customer-id-link">{customer.customer_id}</span>
                      </td>
                      <td>{customer.name}</td>
                      <td>{customer.company_name || '-'}</td>
                      <td>{customer.initial_product || '-'}</td>
                      <td>NT${parseFloat(customer.price || 0).toLocaleString()}</td>
                      <td>NT${parseFloat(customer.budget || 0).toLocaleString()}</td>
                      <td>{customer.phone || '-'}</td>
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
                      <select name="nfvp_score_n" value={editFormData.nfvp_score_n || ''} onChange={handleEditFormChange}>
                        <option value="">-- 選擇 --</option>
                        <option value="0">0 - 無需求 | 完全沒有需求或明確拒絕</option>
                        <option value="2">2 - 潛在需求 | 對產品有興趣，長期培養客戶</option>
                        <option value="4">4 - 初步需求 | 有興趣但需求不明確</option>
                        <option value="6">6 - 中等需求 | 有詢價評估中，短期可能成交</option>
                        <option value="8">8 - 強烈需求 | 多次詢問報價，明確短期採購計畫</option>
                        <option value="10">10 - 立即採購 | 已確認規格數量，僅待報價/下單</option>
                      </select>
                    ) : (
                      <span>{editFormData.nfvp_score_n || '-'}</span>
                    )}
                  </div>
                  <div className="detail-item">
                    <label>F 評分:</label>
                    {isEditMode ? (
                      <select name="nfvp_score_f" value={editFormData.nfvp_score_f || ''} onChange={handleEditFormChange}>
                        <option value="">-- 選擇 --</option>
                        <option value="0">0 - 完全無資金 | 無法支付</option>
                        <option value="2">2 - 可能無預算 | 對價格敏感，難以接受報價</option>
                        <option value="4">4 - 需籌措資金 | 有意願但需融資</option>
                        <option value="6">6 - 需內部審批 | 預算待內部核准</option>
                        <option value="8">8 - 高預算確定 | 預算接近標準，可能需分期</option>
                        <option value="10">10 - 充足預算 | 預算已確認，可直接支付</option>
                      </select>
                    ) : (
                      <span>{editFormData.nfvp_score_f || '-'}</span>
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
                        const cviValue = calculateCVI(editFormData.nfvp_score_n, editFormData.nfvp_score_f, calculateVScore(editFormData.price, editFormData.annual_consumption), calculatePScore(editFormData.price))
                        console.log('CVI 評分渲染:', cviValue, 'editFormData:', editFormData)
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
                      <span>{editFormData.initial_product || '-'}</span>
                    )}
                  </div>
                  <div className="detail-item">
                    <label>訂單狀態:</label>
                    {isEditMode ? (
                      <select name="order_status" value={editFormData.order_status || ''} onChange={handleEditFormChange}>
                        <option value="">-- 選擇 --</option>
                        <option value="追單">追單</option>
                        <option value="成交">成交</option>
                        <option value="不買">不買</option>
                        <option value="售後">售後</option>
                      </select>
                    ) : (
                      <span>{getOrderStatusTag(editFormData.order_status)}</span>
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
                <h3>聯繫資訊</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>手機:</label>
                    {isEditMode ? (
                      <input type="text" name="phone" value={editFormData.phone || ''} onChange={handleEditFormChange} />
                    ) : (
                      <span>{editFormData.phone || '-'}</span>
                    )}
                  </div>
                  <div className="detail-item">
                    <label>市話:</label>
                    {isEditMode ? (
                      <input type="text" name="telephone" value={editFormData.telephone || ''} onChange={handleEditFormChange} />
                    ) : (
                      <span>{editFormData.telephone || '-'}</span>
                    )}
                  </div>
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
                  <label>初始產品</label>
                  <input
                    type="text"
                    name="initial_product"
                    value={formData.initial_product || ''}
                    onChange={handleFormChange}
                    placeholder="輸入初始產品"
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
                    <option value="追單">追單</option>
                    <option value="成交">成交</option>
                    <option value="售後">售後</option>
                    <option value="不買">不買</option>
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

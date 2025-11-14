import React, { useState, useEffect } from 'react'
import '../styles/audio-management.css'
// import AudioUploadDialog from '../components/AudioUploadDialog' // 已移除 - 上傳對話框已移除

const SALESPERSONS = ['何雨達', '郭庭碩', '鍾汶憲', '何佳珊']

export default function Recordings() {
  const [audioFiles, setAudioFiles] = useState([])
  const [filteredAudioFiles, setFilteredAudioFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSalesperson, setSelectedSalesperson] = useState('')
  const [playingAudioId, setPlayingAudioId] = useState(null)
  // 上傳對話框已移除，不再需要此狀态
  const [showTranscriptionModal, setShowTranscriptionModal] = useState(false)
  const [selectedTranscription, setSelectedTranscription] = useState(null)
  
  // 音檔上傳的 state
  const [audioUploadLoading, setAudioUploadLoading] = useState(false)
  const [audioUploadError, setAudioUploadError] = useState(null)
  const [audioUploadSuccess, setAudioUploadSuccess] = useState(false)

  // 獲取音檔列表
  useEffect(() => {
    fetchAudioFiles()
  }, [selectedSalesperson])

  const fetchAudioFiles = async () => {
    try {
      setLoading(true)
      const url = selectedSalesperson 
        ? `/api/audio/list?salesperson=${encodeURIComponent(selectedSalesperson)}`
        : '/api/audio/list'
      
      console.log('🔍 正在獲取音檔列表，URL:', url)
      const response = await fetch(url)
      console.log('📡 API 響應狀態碼:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ API 返回錯誤:', errorText)
        throw new Error(`獲取音檔列表失敗: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('✅ 成功獲取音檔列表，共', data?.length || 0, '筆記錄')
      console.log('📊 音檔數據:', data)
      
      setAudioFiles(data || [])
      setError(null)
    } catch (err) {
      console.error('❌ 獲取音檔列表失敗:', err)
      console.error('❌ 錯誤詳情:', err.message)
      setError(err.message)
      setAudioFiles([])
    } finally {
      setLoading(false)
    }
  }

  // 篩選音檔
  useEffect(() => {
    let filtered = audioFiles

    // 搜尋篩選
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(audio =>
        audio.id?.toString().toLowerCase().includes(query) ||
        audio.customer_name?.toLowerCase().includes(query) ||
        audio.business_name?.toLowerCase().includes(query) ||
        audio.product_name?.toLowerCase().includes(query)
      )
    }

    setFilteredAudioFiles(filtered)
  }, [audioFiles, searchQuery])

  // 格式化日期和時間
  const formatCallDateTime = (callDate, callTime) => {
    if (!callDate && !callTime) return '-'
    const date = callDate || ''
    const time = callTime || ''
    return `${date} ${time}`.trim() || '-'
  }

  // 格式化時長（從 created_at 計算，或返回 '-'）
  const formatDuration = (createdAt) => {
    if (!createdAt) return '-'
    // 如果需要實際時長，需要從音檔信息中獲取
    // 暫時返回 '-'
    return '-'
  }

  // 播放音檔
  const handlePlayAudio = (audioId, audioUrl) => {
    if (playingAudioId === audioId) {
      setPlayingAudioId(null)
    } else {
      setPlayingAudioId(audioId)
    }
  }

  // 上傳音檔 - 上傳對話框已移除，但保留按鈕
  const handleUploadAudio = () => {
    // 直接打開檔案選擇器，不顯示對話框
    const fileInput = document.createElement('input')
    fileInput.type = 'file'
    fileInput.accept = 'audio/*'
    fileInput.onchange = async (e) => {
      const file = e.target.files?.[0]
      if (!file) return
      
      // 直接上傳檔案
      await uploadAudioFile(file)
    }
    fileInput.click()
  }

  const uploadAudioFile = async (file) => {
    try {
      // 驗證文件大小（限制 50MB）
      const maxSize = 50 * 1024 * 1024;
      if (file.size > maxSize) {
        setAudioUploadError('文件大小超過 50MB 限制');
        return;
      }
      
      // 驗證文件類型
      const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm'];
      if (!allowedTypes.includes(file.type)) {
        setAudioUploadError('不支援的音檔格式，請上傳 MP3、WAV、OGG 或 WebM 格式');
        return;
      }
      
      setAudioUploadLoading(true);
      setAudioUploadError(null);
      setAudioUploadSuccess(false);
      
      // 簡化：直接使用檔名的前 4 位作為客戶編號（如果是數字）
      const nameWithoutExt = file.name.replace(/\.[^\/\.]+$/, '')
      const firstPart = nameWithoutExt.split('_')[0]
      
      // 嘗試從檔名中提取客戶編號
      let customerId = '1' // 默認值
      if (/^\d{12}$/.test(firstPart)) {
        // 如果是標準格式，提取後 4 位
        customerId = firstPart.substring(8, 12)
      } else if (/^\d+$/.test(firstPart)) {
        // 如果是純數字，直接使用
        customerId = firstPart
      }
      
      // 上傳檔案
      const formData = new FormData()
      formData.append('file', file)
      formData.append('data', JSON.stringify({
        customer_id: customerId,
        filename: file.name
      }))

      const response = await fetch('/api/audio/upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}: 上傳失敗`);
      }

      const result = await response.json()
      if (result.success && result.audio_url) {
        setAudioUploadSuccess(true);
        setAudioUploadError(null);
        setTimeout(() => setAudioUploadSuccess(false), 3000);
        fetchAudioFiles()
      } else {
        throw new Error(result.error || '上傳失敗：未收到有效的 URL');
      }
    } catch (err) {
      console.error('上傳失敗:', err)
      setAudioUploadError(`❌ ${err.message}`);
    } finally {
      setAudioUploadLoading(false);
    }
  }
  
  // const handleUploadSuccess = (audioRecord) => {
  //   fetchAudioFiles()
  // }

  // 打開轉錄文本對話框
  const handleViewTranscription = (audio) => {
    setSelectedTranscription(audio)
    setShowTranscriptionModal(true)
  }

  // 關閉轉錄文本對話框
  const handleCloseTranscriptionModal = () => {
    setShowTranscriptionModal(false)
    setSelectedTranscription(null)
  }

  // 獲取轉錄狀態顯示
  const getTranscriptionStatusDisplay = (status) => {
    if (!status) return '⏳待轉錄'
    if (status === 'completed' || status === 'done') return '✅已轉錄'
    if (status === 'pending' || status === 'processing') return '⏳轉錄中'
    return status
  }

  // 獲取分析狀態顯示
  const getAnalysisStatusDisplay = (status) => {
    if (!status) return '⏳待分析'
    if (status === 'completed' || status === 'done') return '✅已分析'
    if (status === 'pending' || status === 'processing') return '⏳分析中'
    return status
  }

  // 解析 ai_tags（從 JSON 字符串轉換為陣列）
  const parseAiTags = (tagsData) => {
    if (!tagsData) return []
    
    // 如果已經是陣列，直接返回
    if (Array.isArray(tagsData)) {
      return tagsData
    }
    
    // 如果是字符串，嘗試解析 JSON
    if (typeof tagsData === 'string') {
      try {
        const parsed = JSON.parse(tagsData)
        return Array.isArray(parsed) ? parsed : []
      } catch (err) {
        console.warn('解析 ai_tags 失敗:', err, 'tagsData:', tagsData)
        return []
      }
    }
    
    return []
  }

  return (
    <div className="audio-management-page">
      {/* 頁面標題 */}
      <div className="page-header">
        <div className="header-title">
          <span className="music-icon">🎵</span>
          <h1>錄音管理</h1>
        </div>
        <button className="btn btn-upload" onClick={handleUploadAudio}>
          ⬆️ 上傳音檔
        </button>
      </div>

      {/* 搜尋和篩選 */}
      <div className="search-filter-container">
        <input
          type="text"
          className="search-input"
          placeholder="搜尋客戶、業務、產品..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        
        <select
          className="filter-select"
          value={selectedSalesperson}
          onChange={(e) => setSelectedSalesperson(e.target.value)}
        >
          <option value="">業務</option>
          {SALESPERSONS.map(person => (
            <option key={person} value={person}>
              {person}
            </option>
          ))}
        </select>
      </div>

      {/* 音檔列表 */}
      <div className="audio-list-container">
        <div className="list-header">
          <h3>音檔列表</h3>
          <span className="list-count">共 {filteredAudioFiles.length} 條記錄</span>
        </div>

        {error && (
          <div className="error-message">
            ⚠️ {error}
          </div>
        )}

        {loading ? (
          <div className="loading-message">加載中...</div>
        ) : filteredAudioFiles.length === 0 ? (
          <div className="empty-message">沒有音檔記錄</div>
        ) : (
          <table className="audio-table">
            <thead>
              <tr>
                <th className="checkbox-col">
                  <input type="checkbox" />
                </th>
                <th className="play-col">播放</th>
                <th className="filename-col">檔名</th>
                <th className="customer-col">客戶</th>
                <th className="salesperson-col">業務</th>
                <th className="product-col">產品</th>
                <th className="time-col">時間長度</th>
                <th className="transcription-col">轉錄文本</th>
                <th className="ai-tags-col">AI標籤</th>
                <th className="analysis-col">分析總結</th>
              </tr>
            </thead>
            <tbody>
              {filteredAudioFiles.map((audio, index) => (
                <tr key={audio.id || index}>
                  <td className="checkbox-col">
                    <input type="checkbox" />
                  </td>
                  <td className="play-col">
                    <button
                      className="play-button"
                      onClick={() => handlePlayAudio(audio.id, audio.audio_url)}
                      title="播放音檔"
                    >
                      ▶️
                    </button>
                  </td>
                  <td className="filename-col" title={audio.id}>
                    {audio.id || '-'}
                  </td>
                  <td className="customer-col">{audio.customer_name || '-'}</td>
                  <td className="salesperson-col">{audio.business_name || '-'}</td>
                  <td className="product-col">{audio.product_name || '-'}</td>
                  <td className="time-col">
                    {formatCallDateTime(audio.call_date, audio.call_time)}
                  </td>
                  <td className="transcription-col">
                    <button
                      className="transcription-link"
                      onClick={() => handleViewTranscription(audio)}
                      title="查看轉錄文本"
                    >
                      {audio.transcription_text ? '查看' : '-'}
                    </button>
                  </td>
                  <td className="ai-tags-col">
                    {(() => {
                      const tags = parseAiTags(audio.ai_tags)
                      return tags && tags.length > 0
                        ? tags.slice(0, 3).map((tag, i) => (
                            <span key={i} className="ai-tag">{tag}</span>
                          ))
                        : '-'
                    })()}
                  </td>
                  <td className="analysis-col">
                    {audio.analysis_summary || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 轉錄文本對話框 */}
      {showTranscriptionModal && selectedTranscription && (
        <div className="modal-overlay" onClick={handleCloseTranscriptionModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>轉錄文本</h2>
              <button className="modal-close" onClick={handleCloseTranscriptionModal}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="transcription-info">
                <p><strong>ID：</strong> {selectedTranscription.id}</p>
                <p><strong>客戶：</strong> {selectedTranscription.customer_name}</p>
                <p><strong>業務：</strong> {selectedTranscription.business_name}</p>
                <p><strong>產品：</strong> {selectedTranscription.product_name}</p>
                <p><strong>時間：</strong> {formatCallDateTime(selectedTranscription.call_date, selectedTranscription.call_time)}</p>
              </div>
              <div className="transcription-text">
                {selectedTranscription.transcription_text || '暫無轉錄文本'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 上傳對話框已移除 - 但保留直接上傳功能 */}
    </div>
  )
}

import React, { useState, useEffect } from 'react'
import '../styles/audio-management.css'
import AudioUploadDialog from '../components/AudioUploadDialog'

const SALESPERSONS = ['何雨達', '郭庭碩', '鍾汶憲', '何佳珊']

export default function Recordings() {
  const [audioFiles, setAudioFiles] = useState([])
  const [filteredAudioFiles, setFilteredAudioFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSalesperson, setSelectedSalesperson] = useState('')
  const [playingAudioId, setPlayingAudioId] = useState(null)
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [showTranscriptionModal, setShowTranscriptionModal] = useState(false)
  const [selectedTranscription, setSelectedTranscription] = useState(null)

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
      
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`獲取音檔列表失敗: ${response.status}`)
      }
      const data = await response.json()
      setAudioFiles(data || [])
      setError(null)
    } catch (err) {
      console.error('獲取音檔列表失敗:', err)
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
        audio.filename?.toLowerCase().includes(query) ||
        audio.original_filename?.toLowerCase().includes(query) ||
        audio.customer_name?.toLowerCase().includes(query) ||
        audio.salesperson_name?.toLowerCase().includes(query) ||
        audio.product_name?.toLowerCase().includes(query)
      )
    }

    setFilteredAudioFiles(filtered)
  }, [audioFiles, searchQuery])

  // 格式化日期和時間
  const formatCallDateTime = (callDate, callTime) => {
    if (!callDate || !callTime) return '-'
    try {
      return `${callDate} ${callTime}`
    } catch {
      return '-'
    }
  }

  // 格式化時長
  const formatDuration = (seconds) => {
    if (!seconds) return '-'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // 播放音檔
  const handlePlayAudio = (audioId, audioUrl) => {
    if (playingAudioId === audioId) {
      setPlayingAudioId(null)
    } else {
      setPlayingAudioId(audioId)
    }
  }

  // 上傳音檔
  const handleUploadAudio = () => {
    setShowUploadDialog(true)
  }

  // 上傳成功回調
  const handleUploadSuccess = (audioRecord) => {
    fetchAudioFiles()
  }

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

  // 解析 AI 標籤
  const parseAiTags = (tagsString) => {
    if (!tagsString) return []
    return tagsString.split(',').filter(tag => tag.trim()).slice(0, 3)
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
          placeholder="搜尋檔名、客戶、業務、產品..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        
        <select
          className="filter-select"
          value={selectedSalesperson}
          onChange={(e) => setSelectedSalesperson(e.target.value)}
        >
          <option value="">業務員</option>
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
                <th className="salesperson-col">業務員</th>
                <th className="product-col">產品</th>
                <th className="time-col">時間長度</th>
                <th className="transcription-col">轉錄文本</th>
                <th className="ai-tags-col">AI 標籤</th>
                <th className="summary-col">分析摘要</th>
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
                  <td className="filename-col" title={audio.original_filename}>
                    {audio.filename || '-'}
                  </td>
                  <td className="customer-col">{audio.customer_name || '-'}</td>
                  <td className="salesperson-col">{audio.salesperson_name || '-'}</td>
                  <td className="product-col">{audio.product_name || '-'}</td>
                  <td className="time-col">
                    {formatDuration(audio.duration)}
                  </td>
                  <td className="transcription-col">
                    <button
                      className="transcription-button"
                      onClick={() => handleViewTranscription(audio)}
                      title="查看轉錄文本"
                    >
                      📄 查看
                    </button>
                  </td>
                  <td className="ai-tags-col">
                    <div className="tags-container">
                      {parseAiTags(audio.ai_tags).map((tag, idx) => (
                        <span key={idx} className="tag-badge">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="summary-col">
                    <span className="summary-text" title={audio.summary}>
                      {audio.summary ? audio.summary.substring(0, 30) + (audio.summary.length > 30 ? '...' : '') : '-'}
                    </span>
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
                <p><strong>檔名：</strong> {selectedTranscription.original_filename}</p>
                <p><strong>客戶：</strong> {selectedTranscription.customer_name}</p>
                <p><strong>業務：</strong> {selectedTranscription.salesperson_name}</p>
                <p><strong>時間：</strong> {formatCallDateTime(selectedTranscription.call_date, selectedTranscription.call_time)}</p>
              </div>
              <div className="transcription-text">
                {selectedTranscription.transcription_text || '暫無轉錄文本'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 上傳對話框 */}
      <AudioUploadDialog
        isOpen={showUploadDialog}
        onClose={() => setShowUploadDialog(false)}
        onUploadSuccess={handleUploadSuccess}
      />
    </div>
  )
}

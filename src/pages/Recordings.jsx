import React, { useState, useEffect, useRef } from 'react';
import '../styles/recordings.css';

export default function Recordings() {
  const [recordings, setRecordings] = useState([]);
  const [filteredRecordings, setFilteredRecordings] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBusiness, setSelectedBusiness] = useState('');
  const [selectAll, setSelectAll] = useState(false);
  const [selectedRecordings, setSelectedRecordings] = useState(new Set());
  const [uploading, setUploading] = useState(false);
  const [showTranscriptionModal, setShowTranscriptionModal] = useState(false);
  const [selectedTranscription, setSelectedTranscription] = useState('');
  const [selectedRecordingName, setSelectedRecordingName] = useState('');
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [selectedSummary, setSelectedSummary] = useState('');
  const [selectedSummaryName, setSelectedSummaryName] = useState('');
  const [playingId, setPlayingId] = useState(null);
  const audioRef = useRef(null);
  const fileInputRef = useRef(null);

  const businessNames = ['何雨達', '郭庭碩', '鍾汶憲', '何佳珊'];
  const customerNames = ['王小明', '李四', '張三', '黃五', '朱六', '劉七', '吳八', '黃九', '周十', '林十一'];

  // 獲取錄音列表
  const fetchRecords = async () => {
    try {
      const response = await fetch('/api/audio/list');
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      console.log('獲取錄音列表:', data);
      setRecordings(data || []);
      filterRecords(data || [], searchTerm, selectedBusiness);
    } catch (error) {
      console.error('Failed to fetch recordings:', error);
    }
  };

  // 篩選記錄
  const filterRecords = (records, search, business) => {
    let filtered = records;

    if (search) {
      filtered = filtered.filter(r =>
        (r.id || '').toString().toLowerCase().includes(search.toLowerCase()) ||
        (r.business_name || '').includes(search) ||
        (r.product_name || '').includes(search) ||
        (r.customer_id || '').toString().includes(search)
      );
    }

    if (business) {
      filtered = filtered.filter(r => r.business_name === business);
    }

    setFilteredRecordings(filtered);
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  // 搜尋和篩選
  const handleSearch = (value) => {
    setSearchTerm(value);
    filterRecords(recordings, value, selectedBusiness);
  };

  const handleBusinessFilter = (value) => {
    setSelectedBusiness(value);
    filterRecords(recordings, searchTerm, value);
  };

  // 複選框處理
  const handleSelectAll = (e) => {
    const checked = e.target.checked;
    setSelectAll(checked);
    if (checked) {
      setSelectedRecordings(new Set(filteredRecordings.map(r => r.id)));
    } else {
      setSelectedRecordings(new Set());
    }
  };

  const handleSelectRecording = (id) => {
    const newSelected = new Set(selectedRecordings);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRecordings(newSelected);
    setSelectAll(newSelected.size === filteredRecordings.length);
  };

  // 上傳音檔
  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    const uploadedFiles = [];
    const failedFiles = [];

    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/audio/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();
        
        if (result.success && result.audio_url) {
          uploadedFiles.push({
            name: file.name,
            url: result.audio_url,
            recording_id: result.recording_id
          });
          console.log(`✅ 上傳成功: ${file.name}`, result);
          
          // 顯示成功通知
          alert(`✅ 音檔上傳成功！\n檔名: ${file.name}`);
        } else {
          throw new Error(result.error || '上傳失敗');
        }
      } catch (error) {
        console.error(`❌ 上傳失敗: ${file.name}`, error);
        failedFiles.push(file.name);
        alert(`❌ 上傳失敗: ${file.name}\n錯誤: ${error.message}`);
      }
    }

    setUploading(false);
    
    // 上傳完成後立即重新獲取列表
    if (uploadedFiles.length > 0) {
      console.log(`已上傳 ${uploadedFiles.length} 個文件，重新加載列表...`);
      // 稍微延遲以確保後端已完成寫入
      setTimeout(() => {
        fetchRecords();
      }, 500);
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatDateTime = (date, time, filename) => {
    if (!date && !filename) return '-';
    
    // 先尝試從檔名中提取時間
    // 檔名格式：202509110003_015_1600.mp3
    // 前 8 位：日期 (20250911)
    // 最後 4 位：時間 (1600 = 16:00)
    if (filename && filename.includes('_')) {
      const parts = filename.split('_');
      if (parts.length >= 3) {
        const dateStr = filename.substring(0, 8);
        const timeStr = parts[2].substring(0, 4); // 取最後一个部分的前 4 位
        
        if (dateStr.length === 8 && timeStr.length === 4) {
          // 格式化日期和時間
          const year = dateStr.substring(0, 4);
          const month = dateStr.substring(4, 6);
          const day = dateStr.substring(6, 8);
          const hour = timeStr.substring(0, 2);
          const minute = timeStr.substring(2, 4);
          
          return `${year}-${month}-${day} ${hour}:${minute}`;
        }
      }
    }
    
    // 後備：從 date 和 time 字段提取
    let dateStr = date;
    if (typeof date === 'string' && date.includes('T')) {
      dateStr = date.substring(0, 10);
    }
    const timeOnly = time ? time.substring(0, 5) : '00:00';
    return `${dateStr} ${timeOnly}`;
  };

  const formatDuration = (duration) => {
    if (!duration && duration !== 0) return '-';
    if (duration < 0) return '-';
    
    // 轉換為 分:秒 格式
    const totalSeconds = Math.floor(duration);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    if (minutes > 0) {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    return `0:${seconds.toString().padStart(2, '0')}`;
  };

  const getStatusText = (status) => {
    if (status === 'completed') return '已完成';
    if (status === 'pending') return '待處理';
    return status || '-';
  };

  const handleViewTranscription = (transcriptionText, recordingName) => {
    setSelectedTranscription(transcriptionText || '');
    setSelectedRecordingName(recordingName || '未命名');
    setShowTranscriptionModal(true);
  };

  const handleCloseTranscriptionModal = () => {
    setShowTranscriptionModal(false);
    setSelectedTranscription('');
    setSelectedRecordingName('');
  };

  const handleViewSummary = (summaryText, recordingName) => {
    setSelectedSummary(summaryText || '');
    setSelectedSummaryName(recordingName || 'Unnamed');
    setShowSummaryModal(true);
  };

  const handleCloseSummaryModal = () => {
    setShowSummaryModal(false);
    setSelectedSummary('');
    setSelectedSummaryName('');
  };

  // 播放音檔
  const handlePlayAudio = (audioUrl, recordingId) => {
    if (!audioUrl) {
      alert('音檔 URL 不可用');
      return;
    }

    if (playingId === recordingId && audioRef.current) {
      if (audioRef.current.paused) {
        audioRef.current.play();
        setPlayingId(recordingId); // 確保狀態已更新
      } else {
        audioRef.current.pause();
        setPlayingId(null); // 暫停時重置狀態
      }
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    const audio = new Audio(audioUrl);
    audio.onended = () => setPlayingId(null);
    audio.onerror = () => {
      console.error('播放失敗:', audioUrl);
      alert('無法播放音檔');
      setPlayingId(null);
    };
    audioRef.current = audio;
    setPlayingId(recordingId);
    audio.play().catch(err => {
      console.error('播放錯誤:', err);
      alert('無法播放音檔');
      setPlayingId(null);
    });
  };

  return (
    <div className="recordings-container">
      {/* 頁面頭部 */}
      <div className="recordings-header">
        <div className="header-left">
          <h1>🎵 錄音管理</h1>
        </div>
        <div className="header-right">
          <button
            className="upload-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            📤 上傳音檔
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="audio/*"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
        </div>
      </div>

      {/* 搜尋和篩選 */}
      <div className="search-filter-bar">
        <input
          type="text"
          placeholder="搜尋客戶、業務、產品..."
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          className="search-input"
        />
        <select
          value={selectedBusiness}
          onChange={(e) => handleBusinessFilter(e.target.value)}
          className="filter-select"
        >
          <option value="">業務名</option>
          {businessNames.map(name => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      </div>

      {/* 音檔列表 */}
      <div className="recordings-list">
        <div className="list-header">
          <h2>音檔別表</h2>
          <p>共 {filteredRecordings.length} 條記錄</p>
        </div>

        <table className="recordings-table">
          <thead>
            <tr>
              <th className="col-checkbox">
                <input
                  type="checkbox"
                  checked={selectAll && filteredRecordings.length > 0}
                  onChange={handleSelectAll}
                />
              </th>
              <th className="col-play">播放</th>
              <th className="col-filename">檔名</th>
              <th className="col-customer">客戶</th>
              <th className="col-business">業務</th>
              <th className="col-time">時間</th>
              <th className="col-duration">長度</th>
              <th className="col-transcription">轉錄文本</th>
              <th className="col-tags">AI標籤</th>
              <th className="col-summary">分析總結</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecordings.map(record => (
              <tr key={record.id} className={selectedRecordings.has(record.id) ? 'selected' : ''}>
                <td className="col-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedRecordings.has(record.id)}
                    onChange={() => handleSelectRecording(record.id)}
                  />
                </td>
                <td className="col-play">
                  <button 
                    className="play-btn" 
                    title={playingId === record.id ? "暫停" : "播放"}
                    onClick={() => handlePlayAudio(record.audio_url, record.id)}
                  >
                    {playingId === record.id ? (
                      /* 暫停圖標 */
                      <svg viewBox="0 0 24 24" width="16" height="16" style={{fill: '#2196F3', stroke: 'none'}}>
                        <rect x="6" y="4" width="4" height="16" />
                        <rect x="14" y="4" width="4" height="16" />
                      </svg>
                    ) : (
                      /* 播放圖標 */
                      <svg viewBox="0 0 24 24" width="16" height="16" style={{fill: 'none', stroke: '#2196F3', strokeWidth: 2}}>
                        <polygon points="6,4 20,12 6,20" />
                      </svg>
                    )}
                  </button>
                </td>
                <td className="col-filename">{record.audio_filename || `錄音_${record.id}`}</td>
                <td className="col-customer">-</td>
                <td className="col-business">-</td>
                <td className="col-time">{formatDateTime(record.call_date, record.call_time, record.audio_filename)}</td>
                <td className="col-duration">{formatDuration(record.duration)}</td>
                <td className="col-transcription">
                  {record.transcription_text && record.transcription_text.trim() ? (
                    <button
                      className="view-btn"
                      onClick={() => handleViewTranscription(record.transcription_text, record.audio_filename || `錄音_${record.id}`)}
                      title="查看轉錄文本"
                    >
                      📄 查看
                    </button>
                  ) : (
                    <span>-</span>
                  )}
                </td>
                <td className="col-tags">
                  {(() => {
                    let tags = [];
                    if (record.ai_tags) {
                      if (typeof record.ai_tags === 'string') {
                        try {
                          tags = JSON.parse(record.ai_tags);
                        } catch (e) {
                          tags = record.ai_tags.split(',').map(t => t.trim()).filter(t => t);
                        }
                      } else if (Array.isArray(record.ai_tags)) {
                        tags = record.ai_tags;
                      }
                    }
                    
                    return tags && tags.length > 0 ? (
                      <div className="tags-container">
                        {tags.slice(0, 5).map((tag, idx) => {
                          const displayTag = String(tag).substring(0, 15);
                          return (
                            <span key={idx} className="tag-badge" title={String(tag)}>
                              {displayTag}
                            </span>
                          );
                        })}
                        {tags.length > 5 && <span style={{fontSize: '12px', color: '#999'}}>+{tags.length - 5}</span>}
                      </div>
                    ) : (
                      <span>-</span>
                    );
                  })()}
                </td>
                <td className="col-summary">
                  {record.analysis_summary && record.analysis_summary.trim() ? (
                    <button
                      className="view-btn"
                      onClick={() => handleViewSummary(record.analysis_summary, record.audio_filename || `錄音_${record.id}`)}
                      title="查看分析總結"
                    >
                      📋 查看
                    </button>
                  ) : (
                    <span>-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredRecordings.length === 0 && (
          <div className="empty-state">
            <p>暫無記錄</p>
          </div>
        )}
      </div>

      {/* 轉錄文本模態框 */}
      {showTranscriptionModal && (
        <div className="modal-overlay" onClick={handleCloseTranscriptionModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>原始轉錄文本</h2>
              <button className="modal-close" onClick={handleCloseTranscriptionModal}>✕</button>
            </div>
            <div className="modal-body">
              <div className="transcription-info">
                <p><strong>檔案名稱：</strong> {selectedRecordingName}</p>
              </div>
              <div className="transcription-text">
                {selectedTranscription || '無轉錄內容'}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-close" onClick={handleCloseTranscriptionModal}>關閉</button>
            </div>
          </div>
        </div>
      )}

      {/* 分析總結模態框 */}
      {showSummaryModal && (
        <div className="modal-overlay" onClick={handleCloseSummaryModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>分析總結</h2>
              <button className="modal-close" onClick={handleCloseSummaryModal}>✕</button>
            </div>
            <div className="modal-body">
              <div className="transcription-info">
                <p><strong>檔案名稱：</strong> {selectedSummaryName}</p>
              </div>
              <div className="transcription-text">
                {selectedSummary || '無分析總結'}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-close" onClick={handleCloseSummaryModal}>關閉</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

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
  const fileInputRef = useRef(null);

  const businessNames = ['何雨達', '郭庭碩', '鍾汶憲', '何佳珊'];

  // 獲取錄音列表
  const fetchRecords = async () => {
    try {
      const response = await fetch('/api/audio/list');
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
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
    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/audio/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Upload failed');
        }

        console.log(`✅ 上傳成功: ${file.name}`);
      } catch (error) {
        console.error(`❌ 上傳失敗: ${file.name}`, error);
      }
    }

    setUploading(false);
    fetchRecords();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatDateTime = (date, time) => {
    if (!date) return '-';
    return `${date} ${time || ''}`.trim();
  };

  const getStatusText = (status) => {
    if (status === 'completed') return '已完成';
    if (status === 'pending') return '待處理';
    return status || '-';
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
              <th className="col-tags">AI標籤</th>
              <th className="col-summary">分析總結</th>
              <th className="col-status">狀態</th>
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
                  <button className="play-btn" title="播放">▶</button>
                </td>
                <td className="col-filename">{record.audio_filename || `錄音_${record.id}`}</td>
                <td className="col-customer">{record.customer_id || '-'}</td>
                <td className="col-business">{record.business_name || '-'}</td>
                <td className="col-time">{formatDateTime(record.call_date, record.call_time)}</td>
                <td className="col-duration">-</td>
                <td className="col-tags">-</td>
                <td className="col-summary">{(record.transcription_text || '').substring(0, 50) || '-'}</td>
                <td className="col-status">{getStatusText(record.analysis_status)}</td>
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
    </div>
  );
}

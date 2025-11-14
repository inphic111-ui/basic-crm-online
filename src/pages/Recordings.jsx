import React, { useEffect, useState, useRef } from "react";
import "../styles/recordings.css";
import { Search, Upload } from "lucide-react";

export default function Recordings() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRecords, setSelectedRecords] = useState(new Set());
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterBusiness, setFilterBusiness] = useState("");
  const fileInputRef = useRef(null);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/audio/list");
      if (!res.ok) throw new Error("Failed to fetch records");
      const data = await res.json();
      setRecords(data || []);
      setError(null);
    } catch (err) {
      console.error("Error fetching records:", err);
      setError(err.message);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadError(null);

    try {
      let successCount = 0;
      let failureCount = 0;
      const errors = [];

      for (let i = 0; i < files.length; i++) {
        try {
          const formData = new FormData();
          formData.append("file", files[i]);

          console.log(`[${i + 1}/${files.length}] 開始上傳: ${files[i].name}`);
          
          const res = await fetch("/api/audio/upload", {
            method: "POST",
            body: formData,
          });

          if (!res.ok) {
            const errorData = await res.json();
            console.error(`上傳失敗 ${files[i].name}:`, errorData);
            throw new Error(errorData.error || "Upload failed");
          }

          const result = await res.json();
          console.log(`✅ 上傳成功 ${files[i].name}:`, result);
          successCount++;
        } catch (err) {
          failureCount++;
          console.error(`❌ 上傳失敗 ${files[i].name}:`, err);
          errors.push(`${files[i].name}: ${err.message}`);
        }
      }

      console.log(`上傳完成: 成功 ${successCount}, 失敗 ${failureCount}`);
      
      // 刷新列表
      console.log("開始刷新列表...");
      await fetchRecords();
      console.log("列表刷新完成");

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      if (failureCount > 0) {
        setUploadError(`Success: ${successCount}, Failed: ${failureCount}`);
      } else if (successCount > 0) {
        setUploadError(null);
      }
    } catch (err) {
      console.error("❌ 上傳過程發生錯誤:", err);
      setUploadError(err.message || "Upload failed");
    } finally {
      console.log("上傳流程結束");
      setUploading(false);
    }
  };

  const playAudio = (recordingId, audioUrl) => {
    if (currentPlayer && currentPlayer.id !== recordingId) {
      currentPlayer.audio.pause();
    }

    if (currentPlayer && currentPlayer.id === recordingId) {
      if (currentPlayer.audio.paused) {
        currentPlayer.audio.play();
      } else {
        currentPlayer.audio.pause();
      }
      return;
    }

    const audio = new Audio(audioUrl);
    audio.play();
    setCurrentPlayer({ id: recordingId, audio });
  };

  const toggleSelectRecord = (recordingId) => {
    const newSelected = new Set(selectedRecords);
    if (newSelected.has(recordingId)) {
      newSelected.delete(recordingId);
    } else {
      newSelected.add(recordingId);
    }
    setSelectedRecords(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedRecords.size === filteredRecords.length) {
      setSelectedRecords(new Set());
    } else {
      setSelectedRecords(new Set(filteredRecords.map(r => r.recording_id || r.id)));
    }
  };

  const formatDateTime = (dateStr, timeStr) => {
    if (!dateStr) return "-";
    try {
      const date = new Date(dateStr);
      const time = timeStr ? timeStr : "00:00";
      return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')} ${time}`;
    } catch {
      return dateStr;
    }
  };

  const parseAiTags = (tagsData) => {
    if (!tagsData) return [];
    if (Array.isArray(tagsData)) return tagsData;
    if (typeof tagsData === "string") {
      try {
        const parsed = JSON.parse(tagsData);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  const truncateText = (text, maxLength = 50) => {
    if (!text) return "-";
    if (text.length > maxLength) {
      return text.substring(0, maxLength) + "...";
    }
    return text;
  };

  // 篩選記錄
  const filteredRecords = records.filter(record => {
    const filename = decodeURIComponent(record.audio_url.split("/").pop()).toLowerCase();
    const business = (record.business_name || record.salesperson_name || "").toLowerCase();
    const customer = String(record.customer_id || "").toLowerCase();
    
    const matchesSearch = 
      filename.includes(searchQuery.toLowerCase()) ||
      business.includes(searchQuery.toLowerCase()) ||
      customer.includes(searchQuery.toLowerCase());
    
    const matchesFilter = !filterBusiness || business.includes(filterBusiness.toLowerCase());
    
    return matchesSearch && matchesFilter;
  });

  useEffect(() => {
    fetchRecords();
  }, []);

  if (loading) {
    return (
      <div className="recordings-container">
        <div className="loading-state">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="recordings-container">
      {/* 頭部區域 */}
      <div className="recordings-header-section">
        <div className="header-top">
          <div className="header-title">
            <span className="icon">🎵</span>
            <h1>錄音管理</h1>
          </div>
          <button
            className="upload-btn"
            onClick={handleUploadClick}
            disabled={uploading}
          >
            <Upload size={18} />
            {uploading ? "上傳中..." : "上傳音檔"}
          </button>
        </div>

        {/* 搜尋和篩選區域 */}
        <div className="search-filter-section">
          <div className="search-box">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="搜尋客戶、業務、產品..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
          <select
            value={filterBusiness}
            onChange={(e) => setFilterBusiness(e.target.value)}
            className="filter-select"
          >
            <option value="">業務</option>
            {[...new Set(records.map(r => r.business_name || r.salesperson_name || ""))].filter(Boolean).map(business => (
              <option key={business} value={business}>{business}</option>
            ))}
          </select>
        </div>

        {uploadError && (
          <div className="upload-error">
            ⚠️ {uploadError}
          </div>
        )}
      </div>

      {/* 隱藏的文件輸入 */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="audio/*,.wav,.mp3,.m4a,.ogg,.flac"
        onChange={handleFileSelect}
        style={{ display: "none" }}
      />

      {/* 表格區域 */}
      <div className="recordings-content">
        <div className="table-header">
          <h2>音檔別表</h2>
          <p className="record-count">共 {filteredRecords.length} 條記錄</p>
        </div>

        {filteredRecords.length === 0 ? (
          <div className="empty-state">
            <p>沒有找到相關記錄</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="recordings-table">
              <thead>
                <tr>
                  <th className="col-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedRecords.size === filteredRecords.length && filteredRecords.length > 0}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th className="col-play">播放</th>
                  <th className="col-filename">檔名</th>
                  <th className="col-customer">客戶</th>
                  <th className="col-business">業務</th>
                  <th className="col-datetime">時間</th>
                  <th className="col-duration">長度</th>
                  <th className="col-transcription">轉錄文本</th>
                  <th className="col-ai-tags">AI標籤</th>
                  <th className="col-summary">狀態</th>
                </tr>
              </thead>

              <tbody>
                {filteredRecords.map((record) => {
                  const aiTags = parseAiTags(record.ai_tags);
                  const recordId = record.recording_id || record.id;
                  const isSelected = selectedRecords.has(recordId);

                  return (
                    <tr key={recordId} className={`record-row ${isSelected ? 'selected' : ''}`}>
                      <td className="col-checkbox">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectRecord(recordId)}
                        />
                      </td>

                      <td className="col-play">
                        <button
                          className="play-btn"
                          onClick={() => playAudio(recordId, record.audio_url)}
                          title="播放音檔"
                        >
                          ▶
                        </button>
                      </td>

                      <td className="col-filename">
                        <span className="filename" title={record.audio_filename || decodeURIComponent(record.audio_url.split("/").pop())}>
                          {record.audio_filename || decodeURIComponent(record.audio_url.split("/").pop())}
                        </span>
                      </td>

                      <td className="col-customer">
                        {record.customer_id || "-"}
                      </td>

                      <td className="col-business">
                        {record.business_name || record.salesperson_name || "-"}
                      </td>

                      <td className="col-datetime">
                        {formatDateTime(record.call_date, record.call_time)}
                      </td>

                      <td className="col-duration">
                        {record.duration || "-"}
                      </td>

                      <td className="col-transcription">
                        <span 
                          className="transcription-text" 
                          title={record.transcription_text || ""}
                        >
                          {truncateText(record.transcription_text, 50)}
                        </span>
                      </td>

                      <td className="col-ai-tags">
                        <div className="tags-container">
                          {aiTags.slice(0, 3).map((tag, idx) => (
                            <span key={idx} className="tag" title={tag}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="col-summary">
                        <div className="status-badges">
                          {record.transcription_status === 'completed' && (
                            <span className="badge badge-success">已轉文字</span>
                          )}
                          {record.transcription_status !== 'completed' && (
                            <span className="badge badge-warning">未轉文字</span>
                          )}
                          {record.analysis_status === 'completed' && (
                            <span className="badge badge-success">已分析</span>
                          )}
                          {record.analysis_status !== 'completed' && (
                            <span className="badge badge-warning">未分析</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

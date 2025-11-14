import React, { useEffect, useState } from "react";
import "../styles/recordings.css";

export default function Recordings() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRecords, setSelectedRecords] = useState(new Set());
  const [currentPlayer, setCurrentPlayer] = useState(null);

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
    if (selectedRecords.size === records.length) {
      setSelectedRecords(new Set());
    } else {
      setSelectedRecords(new Set(records.map(r => r.recording_id)));
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

  useEffect(() => {
    fetchRecords();
  }, []);

  if (loading) {
    return (
      <div className="recordings-page">
        <div className="loading-state">
          <p>加載中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="recordings-page">
        <div className="error-state">
          <p>⚠️ 加載失敗: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="recordings-page">
      <div className="recordings-header">
        <h1>音檔別表</h1>
        <p className="record-count">共 {records.length} 條記錄</p>
      </div>

      {records.length === 0 ? (
        <div className="empty-state">
          <p>暫無音檔記錄</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="recordings-table">
            <thead>
              <tr>
                <th className="col-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedRecords.size === records.length && records.length > 0}
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
                <th className="col-summary">文本總結</th>
              </tr>
            </thead>

            <tbody>
              {records.map((record) => {
                const aiTags = parseAiTags(record.ai_tags);
                const isSelected = selectedRecords.has(record.recording_id);

                return (
                  <tr key={record.recording_id} className={`record-row ${isSelected ? 'selected' : ''}`}>
                    {/* 複選框 */}
                    <td className="col-checkbox">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectRecord(record.recording_id)}
                      />
                    </td>

                    {/* 播放按鈕 */}
                    <td className="col-play">
                      <button
                        className="play-btn"
                        onClick={() => playAudio(record.recording_id, record.audio_url)}
                        title="播放音檔"
                      >
                        ▶
                      </button>
                    </td>

                    {/* 檔名 */}
                    <td className="col-filename">
                      <span className="filename" title={decodeURIComponent(record.audio_url.split("/").pop())}>
                        {decodeURIComponent(record.audio_url.split("/").pop())}
                      </span>
                    </td>

                    {/* 客戶 */}
                    <td className="col-customer">
                      {record.customer_id || "-"}
                    </td>

                    {/* 業務 */}
                    <td className="col-business">
                      {record.salesperson_name || "-"}
                    </td>

                    {/* 時間 */}
                    <td className="col-datetime">
                      {formatDateTime(record.call_date, record.call_time)}
                    </td>

                    {/* 長度 */}
                    <td className="col-duration">
                      {record.duration || "-"}
                    </td>

                    {/* 轉錄文本 */}
                    <td className="col-transcription">
                      <span 
                        className="transcription-text" 
                        title={record.transcription_text || ""}
                      >
                        {truncateText(record.transcription_text, 50)}
                      </span>
                    </td>

                    {/* AI標籤 */}
                    <td className="col-ai-tags">
                      <div className="tags-container">
                        {aiTags.slice(0, 3).map((tag, idx) => (
                          <span key={idx} className="tag" title={tag}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* 文本總結 */}
                    <td className="col-summary">
                      <span 
                        className="summary-text" 
                        title={record.summary_text || ""}
                      >
                        {truncateText(record.summary_text, 50)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

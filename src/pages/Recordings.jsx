import React, { useEffect, useState } from "react";
import "../styles/recordings.css";

export default function Recordings() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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
    // 停止之前的播放
    if (currentPlayer && currentPlayer.id !== recordingId) {
      currentPlayer.audio.pause();
    }

    // 如果點擊的是同一個，則切換播放/暫停
    if (currentPlayer && currentPlayer.id === recordingId) {
      if (currentPlayer.audio.paused) {
        currentPlayer.audio.play();
      } else {
        currentPlayer.audio.pause();
      }
      return;
    }

    // 播放新的音檔
    const audio = new Audio(audioUrl);
    audio.play();
    setCurrentPlayer({ id: recordingId, audio });
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  return (
    <div className="recordings-container">
      <div className="recordings-header">
        <h1>音檔管理</h1>
        <p className="subtitle">管理和播放客戶通話錄音</p>
      </div>

      {loading && (
        <div className="loading-state">
          <p>加載中...</p>
        </div>
      )}

      {error && (
        <div className="error-state">
          <p>⚠️ 加載失敗: {error}</p>
        </div>
      )}

      {!loading && !error && records.length === 0 && (
        <div className="empty-state">
          <p>暫無音檔記錄</p>
        </div>
      )}

      {!loading && !error && records.length > 0 && (
        <div className="table-wrapper">
          <table className="recordings-table">
            <thead>
              <tr>
                <th className="col-play">播放</th>
                <th className="col-filename">檔名</th>
                <th className="col-customer">客戶</th>
                <th className="col-business">業務</th>
                <th className="col-product">產品</th>
                <th className="col-date">日期</th>
                <th className="col-time">時間</th>
                <th className="col-transcription">轉錄狀態</th>
                <th className="col-analysis">分析狀態</th>
              </tr>
            </thead>

            <tbody>
              {records.map((record) => (
                <tr key={record.recording_id} className="record-row">
                  {/* 播放按鈕 */}
                  <td className="col-play">
                    <button
                      className="play-button"
                      onClick={() => playAudio(record.recording_id, record.audio_url)}
                      title="播放音檔"
                    >
                      ▶️
                    </button>
                  </td>

                  {/* 檔名 */}
                  <td className="col-filename">
                    <span className="filename">
                      {decodeURIComponent(record.audio_url.split("/").pop())}
                    </span>
                  </td>

                  {/* 客戶編號 */}
                  <td className="col-customer">
                    <span className="customer-id">{record.customer_id || "-"}</span>
                  </td>

                  {/* 業務名稱 */}
                  <td className="col-business">
                    <span className="business-name">{record.salesperson_name || "-"}</span>
                  </td>

                  {/* 產品名稱 */}
                  <td className="col-product">
                    <span className="product-name">{record.product_name || "-"}</span>
                  </td>

                  {/* 通話日期 */}
                  <td className="col-date">
                    <span className="call-date">{record.call_date || "-"}</span>
                  </td>

                  {/* 通話時間 */}
                  <td className="col-time">
                    <span className="call-time">{record.call_time || "-"}</span>
                  </td>

                  {/* 轉錄狀態 */}
                  <td className="col-transcription">
                    <span
                      className={`status-badge ${
                        record.transcription_status === "completed"
                          ? "status-completed"
                          : "status-pending"
                      }`}
                    >
                      {record.transcription_status === "completed"
                        ? "✅ 已完成"
                        : "⏳ 待轉錄"}
                    </span>
                  </td>

                  {/* 分析狀態 */}
                  <td className="col-analysis">
                    <span
                      className={`status-badge ${
                        record.analysis_status === "completed"
                          ? "status-completed"
                          : "status-pending"
                      }`}
                    >
                      {record.analysis_status === "completed"
                        ? "✅ 已完成"
                        : "⏳ 待分析"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

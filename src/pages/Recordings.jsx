import React, { useEffect, useState } from "react";

export default function Recordings() {
  const [records, setRecords] = useState([]);

  // 播放器
  const audioPlayer = new Audio();

  const fetchRecords = async () => {
    const res = await fetch("/api/audio/list");
    const data = await res.json();
    setRecords(data);
  };

  const playAudio = (url) => {
    audioPlayer.src = url;
    audioPlayer.play();
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  return (
    <div className="recordings-page">
      <h2>音檔管理</h2>

      <table className="audio-table">
        <thead>
          <tr>
            <th>播放</th>
            <th>檔名</th>
            <th>客戶</th>
            <th>業務</th>
            <th>產品</th>
            <th>日期</th>
            <th>時間</th>
            <th>轉錄狀態</th>
            <th>分析狀態</th>
          </tr>
        </thead>

        <tbody>
          {records.map((r) => (
            <tr key={r.recording_id}>
              <td>
                <button onClick={() => playAudio(r.audio_url)}>▶️</button>
              </td>

              {/* 檔名從 R2 URL 中截取 */}
              <td>{decodeURIComponent(r.audio_url.split("/").pop())}</td>

              <td>{r.customer_id || "-"}</td>
              <td>{r.salesperson_name || "-"}</td>
              <td>{r.product_name || "-"}</td>
              <td>{r.call_date || "-"}</td>
              <td>{r.call_time || "-"}</td>

              <td>
                {r.transcription_status === "pending"
                  ? "⏳ 待轉錄"
                  : "✅ 已完成"}
              </td>

              <td>
                {r.analysis_status === "pending"
                  ? "⏳ 待分析"
                  : "✅ 已完成"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

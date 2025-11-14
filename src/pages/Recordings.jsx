import React, { useEffect, useState, useRef } from "react";
import "../styles/recordings.css";

export default function Recordings() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRecords, setSelectedRecords] = useState(new Set());
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
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

          const res = await fetch("/api/audio/upload", {
            method: "POST",
            body: formData,
          });

          if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || "Upload failed");
          }

          const result = await res.json();
          console.log("Upload successful:", result);
          successCount++;
        } catch (err) {
          failureCount++;
          errors.push(`${files[i].name}: ${err.message}`);
        }
      }

      await fetchRecords();

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      if (failureCount > 0) {
        setUploadError(`Success: ${successCount}, Failed: ${failureCount}`);
      }
    } catch (err) {
      console.error("Upload error:", err);
      setUploadError(err.message || "Upload failed");
    } finally {
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
    if (selectedRecords.size === records.length) {
      setSelectedRecords(new Set());
    } else {
      setSelectedRecords(new Set(records.map(r => r.recording_id || r.id)));
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
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="recordings-page">
        <div className="error-state">
          <p>Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="recordings-page">
      <div className="recordings-header">
        <div className="header-content">
          <div>
            <h1>Audio Recordings</h1>
            <p className="record-count">Total {records.length} records</p>
          </div>
          <button
            className="upload-btn"
            onClick={handleUploadClick}
            disabled={uploading}
          >
            {uploading ? "Uploading..." : "+ Upload Audio"}
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="audio/*,.wav,.mp3,.m4a,.ogg,.flac"
          onChange={handleFileSelect}
          style={{ display: "none" }}
        />
        {uploadError && (
          <div className="upload-error">
            {uploadError}
          </div>
        )}
      </div>

      {records.length === 0 ? (
        <div className="empty-state">
          <p>No audio records</p>
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
                <th className="col-play">Play</th>
                <th className="col-filename">Filename</th>
                <th className="col-customer">Customer</th>
                <th className="col-business">Business</th>
                <th className="col-datetime">DateTime</th>
                <th className="col-duration">Duration</th>
                <th className="col-transcription">Transcription</th>
                <th className="col-ai-tags">AI Tags</th>
                <th className="col-summary">Summary</th>
              </tr>
            </thead>

            <tbody>
              {records.map((record) => {
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
                        title="Play audio"
                      >
                        ▶
                      </button>
                    </td>

                    <td className="col-filename">
                      <span className="filename" title={decodeURIComponent(record.audio_url.split("/").pop())}>
                        {decodeURIComponent(record.audio_url.split("/").pop())}
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
                      <span 
                        className="summary-text" 
                        title={record.analysis_summary || record.summary_text || ""}
                      >
                        {truncateText(record.analysis_summary || record.summary_text, 50)}
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

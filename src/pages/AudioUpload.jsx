import React, { useState } from 'react';
import { parseAudioFilename } from '../utils/parseFilename';

/**
 * 音檔上傳表單組件
 * 功能：
 * 1. 用戶選擇音檔文件
 * 2. 上傳到 R2
 * 3. 自動解析檔名
 * 4. 填充表單欄位
 * 5. 保存到數據庫
 */
export default function AudioUpload({ onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [uploadedData, setUploadedData] = useState(null);
  const [parsedData, setParsedData] = useState(null);

  // 處理文件選擇
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      
      // 自動解析檔名
      try {
        const parsed = parseAudioFilename(selectedFile.name);
        setParsedData(parsed);
      } catch (err) {
        setError(`檔名解析失敗: ${err.message}`);
        setParsedData(null);
      }
    }
  };

  // 上傳文件到 R2
  const handleUpload = async () => {
    if (!file) {
      setError('請選擇音檔文件');
      return;
    }

    setUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('audio', file);

      // 模擬上傳進度
      const uploadInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(uploadInterval);
            return prev;
          }
          return prev + Math.random() * 30;
        });
      }, 200);

      // 上傳到後端
      const response = await fetch('/api/audio/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(uploadInterval);
      setUploadProgress(100);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '上傳失敗');
      }

      const result = await response.json();
      
      if (result.success) {
        setUploadedData(result.data);
        
        // 調用回調函數，傳遞上傳的數據和解析的數據
        if (onUploadSuccess) {
          onUploadSuccess({
            ...uploadedData,
            ...parsedData,
            audio_url: result.data.url,
          });
        }
      } else {
        throw new Error(result.message || '上傳失敗');
      }
    } catch (err) {
      console.error('上傳失敗:', err);
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  // 重置表單
  const handleReset = () => {
    setFile(null);
    setUploadProgress(0);
    setError(null);
    setUploadedData(null);
    setParsedData(null);
  };

  return (
    <div className="audio-upload-container">
      <div className="upload-form">
        <h2>上傳音檔</h2>

        {/* 文件選擇器 */}
        <div className="file-input-wrapper">
          <input
            type="file"
            accept="audio/*"
            onChange={handleFileChange}
            disabled={uploading}
            id="audio-file-input"
          />
          <label htmlFor="audio-file-input" className="file-input-label">
            {file ? file.name : '選擇音檔文件'}
          </label>
        </div>

        {/* 檔名解析結果 */}
        {parsedData && (
          <div className="parsed-data">
            <h3>檔名解析結果</h3>
            <table>
              <tbody>
                <tr>
                  <td>客戶編號</td>
                  <td>{parsedData.customer_id}</td>
                </tr>
                <tr>
                  <td>業務名</td>
                  <td>{parsedData.salesperson_name}</td>
                </tr>
                <tr>
                  <td>產品名</td>
                  <td>{parsedData.product_name}</td>
                </tr>
                <tr>
                  <td>撥打日期</td>
                  <td>{parsedData.call_date}</td>
                </tr>
                <tr>
                  <td>撥打時間</td>
                  <td>{parsedData.call_time}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* 上傳進度 */}
        {uploading && (
          <div className="upload-progress">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <span className="progress-text">{Math.round(uploadProgress)}%</span>
          </div>
        )}

        {/* 上傳結果 */}
        {uploadedData && (
          <div className="upload-success">
            <h3>✅ 上傳成功</h3>
            <div className="upload-info">
              <p><strong>檔名：</strong> {uploadedData.filename}</p>
              <p><strong>文件大小：</strong> {(uploadedData.size / 1024 / 1024).toFixed(2)} MB</p>
              <p><strong>R2 URL：</strong></p>
              <code>{uploadedData.url}</code>
            </div>
          </div>
        )}

        {/* 錯誤信息 */}
        {error && (
          <div className="error-message">
            ❌ {error}
          </div>
        )}

        {/* 按鈕 */}
        <div className="button-group">
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="btn-upload"
          >
            {uploading ? '上傳中...' : '上傳到 R2'}
          </button>
          <button
            onClick={handleReset}
            disabled={uploading}
            className="btn-reset"
          >
            重置
          </button>
        </div>
      </div>

      <style jsx>{`
        .audio-upload-container {
          padding: 20px;
          max-width: 600px;
          margin: 0 auto;
        }

        .upload-form {
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 20px;
          background: #f9f9f9;
        }

        .upload-form h2 {
          margin-top: 0;
          margin-bottom: 20px;
          color: #333;
        }

        .file-input-wrapper {
          margin-bottom: 20px;
        }

        #audio-file-input {
          display: none;
        }

        .file-input-label {
          display: block;
          padding: 12px 16px;
          border: 2px dashed #007bff;
          border-radius: 4px;
          text-align: center;
          cursor: pointer;
          background: white;
          transition: all 0.3s ease;
        }

        .file-input-label:hover {
          border-color: #0056b3;
          background: #f0f8ff;
        }

        #audio-file-input:disabled + .file-input-label {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .parsed-data {
          margin-bottom: 20px;
          padding: 15px;
          background: white;
          border-radius: 4px;
          border-left: 4px solid #28a745;
        }

        .parsed-data h3 {
          margin-top: 0;
          margin-bottom: 10px;
          color: #28a745;
        }

        .parsed-data table {
          width: 100%;
          border-collapse: collapse;
        }

        .parsed-data td {
          padding: 8px;
          border-bottom: 1px solid #eee;
        }

        .parsed-data td:first-child {
          font-weight: bold;
          width: 100px;
          color: #666;
        }

        .upload-progress {
          margin-bottom: 20px;
        }

        .progress-bar {
          height: 8px;
          background: #e9ecef;
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 8px;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #007bff, #0056b3);
          transition: width 0.3s ease;
        }

        .progress-text {
          font-size: 12px;
          color: #666;
        }

        .upload-success {
          margin-bottom: 20px;
          padding: 15px;
          background: #d4edda;
          border: 1px solid #c3e6cb;
          border-radius: 4px;
          color: #155724;
        }

        .upload-success h3 {
          margin-top: 0;
          margin-bottom: 10px;
        }

        .upload-info {
          font-size: 14px;
        }

        .upload-info p {
          margin: 8px 0;
        }

        .upload-info code {
          display: block;
          background: white;
          padding: 8px;
          border-radius: 4px;
          word-break: break-all;
          font-size: 12px;
          margin-top: 4px;
        }

        .error-message {
          margin-bottom: 20px;
          padding: 12px;
          background: #f8d7da;
          border: 1px solid #f5c6cb;
          border-radius: 4px;
          color: #721c24;
        }

        .button-group {
          display: flex;
          gap: 10px;
        }

        .btn-upload,
        .btn-reset {
          flex: 1;
          padding: 10px 16px;
          border: none;
          border-radius: 4px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .btn-upload {
          background: #007bff;
          color: white;
        }

        .btn-upload:hover:not(:disabled) {
          background: #0056b3;
        }

        .btn-upload:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        .btn-reset {
          background: #6c757d;
          color: white;
        }

        .btn-reset:hover:not(:disabled) {
          background: #545b62;
        }

        .btn-reset:disabled {
          background: #ccc;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}

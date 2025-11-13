import React, { useState } from 'react'

const SALESPERSONS = ['何雨達', '郭庭碩', '鍾汶憲', '何佳珊']

export default function AudioUploadDialog({ isOpen, onClose, onUploadSuccess }) {
  const [step, setStep] = useState(1)
  const [selectedFile, setSelectedFile] = useState(null)
  const [parsedData, setParsedData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  if (!isOpen) return null

  // 第一步：選擇文件
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setSelectedFile(file)
    setLoading(true)
    setError(null)

    try {
      // 調用後端 API 解析檔名
      const response = await fetch('/api/audio/parse-filename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name })
      })

      if (!response.ok) {
        throw new Error(`解析失敗: ${response.status}`)
      }

      const data = await response.json()
      setParsedData(data)
      setStep(2)
    } catch (err) {
      console.error('解析檔名失敗:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // 第二步：確認並上傳
  const handleUpload = async () => {
    if (!selectedFile || !parsedData) return

    setLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('data', JSON.stringify(parsedData))

      const response = await fetch('/api/audio/upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error(`上傳失敗: ${response.status}`)
      }

      const result = await response.json()
      
      // 上傳成功
      onUploadSuccess(result)
      
      // 重置狀態
      setStep(1)
      setSelectedFile(null)
      setParsedData(null)
      onClose()
    } catch (err) {
      console.error('上傳失敗:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // 關閉對話框
  const handleClose = () => {
    setStep(1)
    setSelectedFile(null)
    setParsedData(null)
    setError(null)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>上傳音檔</h2>
          <button className="modal-close" onClick={handleClose}>✕</button>
        </div>

        <div className="modal-body">
          {step === 1 ? (
            // 第一步：選擇文件
            <div className="upload-step-1">
              <p className="step-title">第 1 步：選擇音檔</p>
              <div className="file-input-wrapper">
                <input
                  type="file"
                  id="audio-file"
                  accept="audio/*"
                  onChange={handleFileSelect}
                  disabled={loading}
                  style={{ display: 'none' }}
                />
                <label htmlFor="audio-file" className="file-input-label">
                  {loading ? '解析中...' : '點擊選擇音檔或拖放'}
                </label>
              </div>
              {selectedFile && (
                <p className="file-name">選擇的檔案：{selectedFile.name}</p>
              )}
            </div>
          ) : (
            // 第二步：確認信息
            <div className="upload-step-2">
              <p className="step-title">第 2 步：確認信息</p>
              {parsedData && (
                <div className="parsed-data">
                  <div className="data-row">
                    <label>客戶編號：</label>
                    <span>{parsedData.customer_id || '-'}</span>
                  </div>
                  <div className="data-row">
                    <label>客戶名稱：</label>
                    <span>{parsedData.customer_name || '-'}</span>
                  </div>
                  <div className="data-row">
                    <label>業務員：</label>
                    <span>{parsedData.salesperson_name || '-'}</span>
                  </div>
                  <div className="data-row">
                    <label>產品：</label>
                    <span>{parsedData.product_name || '-'}</span>
                  </div>
                  <div className="data-row">
                    <label>撥打日期：</label>
                    <span>{parsedData.call_date || '-'}</span>
                  </div>
                  <div className="data-row">
                    <label>撥打時間：</label>
                    <span>{parsedData.call_time || '-'}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="error-message">
              ⚠️ {error}
            </div>
          )}
        </div>

        <div className="modal-footer">
          {step === 2 && (
            <button
              className="btn btn-secondary"
              onClick={() => setStep(1)}
              disabled={loading}
            >
              上一步
            </button>
          )}
          <button
            className="btn btn-secondary"
            onClick={handleClose}
            disabled={loading}
          >
            取消
          </button>
          {step === 1 ? (
            <button
              className="btn btn-primary"
              onClick={() => document.getElementById('audio-file').click()}
              disabled={loading}
            >
              選擇文件
            </button>
          ) : (
            <button
              className="btn btn-primary"
              onClick={handleUpload}
              disabled={loading}
            >
              {loading ? '上傳中...' : '確認上傳'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

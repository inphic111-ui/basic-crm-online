import React, { useState, useMemo } from 'react';
// 引入圖標
import { 
  User, PieChart, Bot, ListChecks, FileText, CalendarCheck, 
  Mic, Clock, FileBarChart, Eye, Lightbulb, Target, 
  ShoppingCart, CreditCard, CheckCircle2
} from 'lucide-react';
// 引入 Chart.js
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Radar } from 'react-chartjs-2';

// 註冊 Chart.js 組件
ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

// ==========================================
//  1. 子組件：統計卡片 (用於 Tab2 頂部)
// ==========================================
const StatCard = ({ label, value, icon, description, color, bg = 'white' }) => (
  <div style={{ 
      background: bg, padding: '20px', borderRadius: '8px', 
      border: `1px solid ${bg === 'white' ? '#eee' : color}`,
      boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
      display: 'flex', flexDirection: 'column', gap: '5px'
  }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
          <div style={{ fontSize: '0.9rem', color: '#666', fontWeight: 'bold' }}>{label}</div>
          {icon}
      </div>
      <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: color }}>{value}</div>
      <div style={{ fontSize: '0.8rem', color: '#888' }}>{description}</div>
  </div>
);

// ==========================================
//  2. 子組件：AI 分析引擎 (用於詳細報告 Modal)
// ==========================================
const AIAnalysisEngine = () => {
  const RULES_CONFIG = {
    core1: {
      title: "核心問題一：客戶為什麼要買這個產品？",
      sub: "購買動機詢問完整度",
      rules: [
        { id: 'A1', label: '深度問題探討', keywords: ['採購流程', '出貨流程', '付款條件', '彈性選擇', '預算範圍'] },
        { id: 'A2', label: '痛點發掘與確認', keywords: ['壓力很大', '我的痛點', '解決什麼問題', '影響你的決定'] },
        { id: 'A3', label: '價值感連結', keywords: ['策略規劃', '解放時間', '降低壓力', '長期利益', '無形價值'] },
        { id: 'A4', label: '具體行動承諾', keywords: ['試用一周', '付費方式', '要簽約', '需要哪些文件', '完成時間'] },
      ]
    },
    core2: {
      title: "核心問題二：客戶為什麼不肯付錢？",
      sub: "價格抗拒處理完整度",
      rules: [
        { id: 'B1', label: '真假問題判斷', keywords: ['跟您確認一下', '如果沒有錢', '就會買單對嗎', '價格是唯一考量'] },
        { id: 'B2', label: '價值感補充', keywords: ['研發過程', '團隊心血', '專利保護', '免費維修', '超值'] },
        { id: 'B3', label: '轉移焦點', keywords: ['長期利益', '投資回報', '效益', '改變', '價值', '意義'] },
        { id: 'B4', label: '挖掘真實顧慮', keywords: ['真正顧慮', '真正在乎', '不用在錢', '鬼打牆', '其他考量'] },
      ]
    }
  };

  const mockTranscript = `客戶：我們現在每天處理報表真的覺得壓力很大... 業務：那您想用這個產品解決什麼問題呢？...`;

  const analyze = (rules) => {
    let totalKeywords = 0;
    let foundKeywordsCount = 0;
    const ruleResults = rules.map(rule => {
      const found = rule.keywords.filter(k => mockTranscript.includes(k));
      const missing = rule.keywords.filter(k => !mockTranscript.includes(k));
      totalKeywords += rule.keywords.length;
      foundKeywordsCount += found.length;
      const score = Math.min(100, Math.round((found.length / rule.keywords.length) * 100 * 3)); 
      return { ...rule, found, missing, score };
    });
    return { ruleResults, totalKeywords, foundKeywordsCount };
  };

  const analysisCore1 = analyze(RULES_CONFIG.core1.rules);
  const analysisCore2 = analyze(RULES_CONFIG.core2.rules);
  
  const totalKeys = analysisCore1.totalKeywords + analysisCore2.totalKeywords;
  const detectedKeys = analysisCore1.foundKeywordsCount + analysisCore2.foundKeywordsCount;
  const detectionRate = Math.round((detectedKeys / totalKeys) * 100);
  const overallScore = Math.round((detectionRate / 100) * 10) + 2;

  const renderCoreSection = (config, analysisResult, icon) => (
    <div style={{ marginBottom: '30px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', marginBottom: '15px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
        <h4 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '10px', color: '#2c3e50' }}>{icon} {config.title}</h4>
        <span style={{ fontSize: '0.9rem', color: '#666' }}>{config.sub} <strong style={{color:'#3498db'}}> {Math.round(analysisResult.ruleResults.reduce((a,b)=>a+b.score,0)/40)}/10</strong></span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {analysisResult.ruleResults.map((item) => (
          <div key={item.id} style={{ background: '#f9f9f9', padding: '15px', borderRadius: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ fontWeight: 'bold', color: '#444', display:'flex', alignItems:'center', gap:'5px' }}>
                    {item.score > 0 ? <CheckCircle2 size={16} color="#2ecc71"/> : <Target size={16} color="#999"/>} {item.label} ({item.id})
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:'10px', width:'200px' }}>
                    <div style={{ flex: 1, height: '8px', background: '#eee', borderRadius: '4px', overflow: 'hidden' }}>
                       <div style={{ width: `${item.score}%`, height: '100%', background: item.score > 0 ? '#3498db' : '#ccc', transition: 'width 0.5s ease' }}></div>
                    </div>
                    <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: item.score > 0 ? '#3498db' : '#999' }}>{item.score}%</span>
                </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {item.found.map(k => (<span key={k} style={{ fontSize: '0.8rem', padding: '3px 10px', borderRadius: '12px', background: '#2ecc71', color: 'white' }}>✓ {k}</span>))}
                {item.missing.map(k => (<span key={k} style={{ fontSize: '0.8rem', padding: '3px 10px', borderRadius: '12px', background: '#fff0f0', color: '#e74c3c', border: '1px solid #fadbd8' }}>{k}</span>))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ fontFamily: '"Segoe UI", sans-serif' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginBottom: '30px' }}>
            <StatCard label="總關鍵詞數" value={totalKeys} color="#3498db" bg="#f0f8ff" />
            <StatCard label="偵測到關鍵詞" value={detectedKeys} color="#2ecc71" />
            <StatCard label="整體偵測率" value={`${detectionRate}%`} color="#f39c12" />
            <StatCard label="綜合評分" value={`${overallScore}/10`} color="#3498db" bg="#f0f8ff" />
        </div>
        {renderCoreSection(RULES_CONFIG.core1, analysisCore1, <ShoppingCart size={24} />)}
        {renderCoreSection(RULES_CONFIG.core2, analysisCore2, <CreditCard size={24} />)}
        <div style={{ background: '#fff9e6', padding: '20px', borderRadius: '8px', borderLeft: '5px solid #f39c12' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#d35400', display:'flex', alignItems:'center', gap:'10px' }}><Lightbulb size={20}/> 改進建議</h4>
            <p style={{ margin: 0, color: '#555', fontSize:'0.9rem' }}>
                <strong>立即行動：</strong> {overallScore < 5 ? '加強需求挖掘，多詢問使用情境。' : '持續強化價值連結。'}
            </p>
        </div>
    </div>
  );
};

// ==========================================
//  3. 主組件：CustomerDetailModal
// ==========================================
const CustomerDetailModal = ({ 
  selectedCustomer, handleCloseDetailModal, isEditMode, editFormData, 
  handleEditFormChange, handleSaveEditCustomer, saving,
  // 為了避免父層沒傳這些函數導致報錯，給予預設空函數
  calculateVScore = () => 0, calculatePScore = () => 0, calculateCVI = () => 0,
  getTypeLabel = () => '', getRatingBadge = () => null, getOrderStatusTag = () => null,
}) => {
  
  const [activeTab, setActiveTab] = useState('info');
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // --- 1. 雷達圖數據 ---
  const radarData = useMemo(() => {
    const n = parseInt(editFormData.n_score) || 0;
    const f = parseInt(editFormData.f_score) || 0;
    const v = calculateVScore(editFormData.price, editFormData.annual_consumption) || 0;
    return {
      labels: ['需求挖掘', '價值建立', '異議處理', '行動引導', '關係建立', '成交推進'],
      datasets: [{
          label: '銷售評估',
          data: [n, 6, f, 5, v > 10 ? 10 : v, 7],
          backgroundColor: 'rgba(52, 152, 219, 0.2)',
          borderColor: 'rgba(52, 152, 219, 1)',
          borderWidth: 2,
          pointBackgroundColor: 'rgba(52, 152, 219, 1)',
          pointBorderColor: '#fff',
      }],
    };
  }, [editFormData, calculateVScore]);

  const radarOptions = { scales: { r: { suggestedMin: 0, suggestedMax: 10, ticks: { display: false } } }, plugins: { legend: { display: false } } };

  // --- 2. 時間軸數據 (自動排序：新到舊) ---
  const timelineHistory = useMemo(() => {
    if (editFormData.ai_analysis_history) {
      try {
        const history = typeof editFormData.ai_analysis_history === 'string' ? JSON.parse(editFormData.ai_analysis_history) : editFormData.ai_analysis_history;
        if (Array.isArray(history)) return [...history].sort((a, b) => new Date(b.date) - new Date(a.date));
      } catch (err) { return []; }
    }
    return [];
  }, [editFormData.ai_analysis_history]);

  // --- 3. 成交率連動 (讀取最新分析) ---
  const conversionRate = useMemo(() => {
    if (timelineHistory.length > 0) {
      const latestRecord = timelineHistory[0];
      if (latestRecord.conversion_rate !== undefined) return `${latestRecord.conversion_rate}%`;
      if (latestRecord.probability !== undefined) return `${latestRecord.probability}%`;
    }
    return `${(parseInt(editFormData.n_score || 0) * 10)}%`;
  }, [timelineHistory, editFormData.n_score]);

  if (!selectedCustomer) return null;

  return (
    <div className="modal-overlay" onClick={handleCloseDetailModal} style={{position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000}}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '1100px', width: '95%', height: '90vh', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', background: 'white', borderRadius: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>
        
        {/* Header */}
        <div className="modal-header" style={{ padding: '15px 20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ margin: 0 }}>{selectedCustomer.name}</h2>
            {getRatingBadge && getRatingBadge(editFormData.customer_rating)}
          </div>
          <button className="close-btn" onClick={handleCloseDetailModal} style={{ fontSize: '1.5rem', background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
        </div>

        {/* Tabs Navigation */}
        <div style={{ display: 'flex', borderBottom: '1px solid #dee2e6', background: '#f8f9fa', padding: '0 20px', flexShrink: 0 }}>
          <button onClick={() => setActiveTab('info')} style={{ padding: '15px 20px', background: activeTab === 'info' ? 'white' : 'transparent', border: '1px solid transparent', borderBottom: activeTab === 'info' ? '3px solid #3498db' : '3px solid transparent', fontWeight: activeTab === 'info' ? 'bold' : 'normal', color: activeTab === 'info' ? '#3498db' : '#666', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={18}/> 客戶資訊 (編輯)
          </button>
          <button onClick={() => setActiveTab('profile')} style={{ padding: '15px 20px', background: activeTab === 'profile' ? 'white' : 'transparent', border: '1px solid transparent', borderBottom: activeTab === 'profile' ? '3px solid #2ecc71' : '3px solid transparent', fontWeight: activeTab === 'profile' ? 'bold' : 'normal', color: activeTab === 'profile' ? '#2ecc71' : '#666', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <PieChart size={18}/> 消費者輪廓 (分析)
          </button>
        </div>

        {/* Body Content */}
        <div className="modal-body" style={{ flex: 1, overflowY: 'auto', padding: '20px', background: '#fff' }}>
          
          {/* --- TAB 1: 編輯表單 --- */}
          {activeTab === 'info' && (
            <div className="fade-in" style={{animation: 'fadeIn 0.3s ease-in-out'}}>
              <div className="detail-section" style={{marginBottom: '20px'}}>
                <h3 style={{borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '15px'}}>基本資訊</h3>
                <div className="detail-grid" style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px'}}>
                  <div className="detail-item"><label>客戶名稱:</label>{isEditMode ? <input type="text" name="name" value={editFormData.name || ''} onChange={handleEditFormChange} style={{width:'100%', padding:'8px'}}/> : <span>{selectedCustomer.name}</span>}</div>
                  <div className="detail-item"><label>公司名稱:</label>{isEditMode ? <input type="text" name="company_name" value={editFormData.company_name || ''} onChange={handleEditFormChange} style={{width:'100%', padding:'8px'}}/> : <span>{selectedCustomer.company_name || '-'}</span>}</div>
                  <div className="detail-item"><label>資本額:</label>{isEditMode ? <input type="number" name="capital_amount" value={editFormData.capital_amount || ''} onChange={handleEditFormChange} style={{width:'100%', padding:'8px'}}/> : <span>NT${parseFloat(selectedCustomer.capital_amount || 0).toLocaleString()}</span>}</div>
                </div>
              </div>
              <div className="detail-section" style={{marginBottom: '20px'}}>
                <h3 style={{borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '15px'}}>評分資訊</h3>
                <div className="detail-grid" style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px'}}>
                  <div className="detail-item"><label>N 評分:</label>{isEditMode ? <select name="n_score" value={editFormData.n_score || ''} onChange={handleEditFormChange} style={{width:'100%', padding:'8px'}}><option value="0">0</option><option value="6">6</option><option value="10">10</option></select> : <span>{editFormData.n_score || '-'}</span>}</div>
                  <div className="detail-item"><label>F 評分:</label>{isEditMode ? <select name="f_score" value={editFormData.f_score || ''} onChange={handleEditFormChange} style={{width:'100%', padding:'8px'}}><option value="0">0</option><option value="6">6</option><option value="10">10</option></select> : <span>{editFormData.f_score || '-'}</span>}</div>
                  <div className="detail-item"><label>V 評分:</label><span>{calculateVScore(editFormData.price, editFormData.annual_consumption)}</span></div>
                  <div className="detail-item"><label>P 評分:</label><span>{calculatePScore(editFormData.price)}</span></div>
                  <div className="detail-item"><label>CVI 評分:</label><span>{calculateCVI(editFormData.n_score, editFormData.f_score, calculateVScore(editFormData.price, editFormData.annual_consumption), calculatePScore(editFormData.price))}</span></div>
                </div>
              </div>
              <div className="detail-section" style={{marginBottom: '20px'}}>
                <div style={{ marginTop: '0px', marginBottom:'15px' }}>
                  {isEditMode ? (
                    <>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>音檔上傳:</label>
                      <input type="file" />
                    </>
                  ) : (
                    <>
                      {selectedCustomer.audioUrl && (
                        <>
                          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>🎵 通話紀錄:</label>
                          <audio controls src={selectedCustomer.audioUrl} style={{width:'100%'}} />
                        </>
                      )}
                    </>
                  )}
                </div>
                <h3>備註</h3>
                {isEditMode ? <textarea name="notes" value={editFormData.notes || ''} onChange={handleEditFormChange} style={{width: '100%', minHeight: '100px', padding:'8px'}} /> : <div className="notes-box" style={{background:'#f9f9f9', padding:'10px', borderRadius:'4px'}}>{editFormData.notes || '無備註'}</div>}
              </div>
            </div>
          )}

          {/* --- TAB 2: 消費者輪廓 --- */}
          {activeTab === 'profile' && (
            <div className="fade-in" style={{ paddingTop: '10px', animation: 'fadeIn 0.3s ease-in-out' }}>
              
              {/* 1. 儀表板 4 張卡片 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginBottom: '30px' }}>
                <StatCard label="AI 綜合評估" value={`V${calculateVScore(editFormData.price, editFormData.annual_consumption)}`} description="潛力評分" color="#3498db" icon={<Bot size={24} color="#3498db"/>} bg="#f0f8ff"/>
                <StatCard label="成交機率" value={conversionRate} description="AI 預測" color="#2ecc71" icon={<ListChecks size={24} color="#2ecc71"/>} />
                <StatCard label="最新分析時間" value={timelineHistory.length>0 && timelineHistory[0].date ? timelineHistory[0].date.split(' ')[0] : '無'} description="最近紀錄" color="#f39c12" icon={<FileText size={24} color="#f39c12"/>} />
                <StatCard label="下次跟進" value="2025/11/25" description="建議日期" color="#e74c3c" icon={<CalendarCheck size={24} color="#e74c3c"/>} bg="#fff5f5"/>
              </div>

              {/* 2. 雷達圖 & 弱點分析 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
                <div style={{ background: 'white', border: '1px solid #eee', padding: '20px', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>銷售技巧評估</h3>
                    <button onClick={() => setIsReportModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#2ecc71', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}><FileBarChart size={14}/> 詳細報告</button>
                  </div>
                  <div style={{ height: '300px', display: 'flex', justifyContent: 'center' }}><Radar data={radarData} options={radarOptions} /></div>
                </div>
                <div style={{ background: 'white', border: '1px solid #eee', padding: '20px', borderRadius: '8px' }}>
                  <h3 style={{ margin: '0 0 15px 0', fontSize: '1.1rem', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>弱點分析與建議</h3>
                  <div style={{ background: '#fff9e6', borderLeft: '4px solid #f39c12', padding: '15px', marginBottom: '15px', borderRadius: '4px' }}>
                    <h4 style={{ margin: '0 0 5px 0', color: '#d35400' }}>需求挖掘 ({editFormData.n_score}/10)</h4><p style={{ margin: 0, fontSize: '0.9rem', color:'#555' }}>建議加強開放式提問技巧。</p>
                  </div>
                  <div style={{ background: '#e8f5e9', borderLeft: '4px solid #2ecc71', padding: '15px', borderRadius: '4px' }}>
                    <h4 style={{ margin: '0 0 5px 0', color: '#2e7d32' }}>綜合評估</h4>
                    <p style={{ margin: 0, fontSize: '0.9rem', color:'#555' }}>成交率預測：<strong>{conversionRate}</strong></p>
                  </div>
                </div>
              </div>

              {/* 3. 溝通紀錄時間軸 */}
              <div style={{ background: 'white', border: '1px solid #eee', padding: '20px', borderRadius: '8px' }}>
                <h3 style={{ margin: '0 0 20px 0', fontSize: '1.1rem' }}>溝通紀錄時間軸</h3>
                <div style={{ paddingLeft: '10px' }}>
                   {timelineHistory.length > 0 ? timelineHistory.map((rec, i) => (
                     <div key={i} style={{ marginBottom: '15px', borderLeft: '2px solid #3498db', paddingLeft: '15px' }}>
                       <div style={{ display:'flex', gap:'5px', fontWeight:'bold', color:'#3498db', fontSize:'0.9rem' }}><Clock size={14}/> {rec.date}</div>
                       <p style={{ margin: '5px 0 0 0', color:'#333' }}>{rec.timeline_text}</p>
                     </div>
                   )) : <p style={{ color: '#999' }}>尚無紀錄</p>}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer" style={{ padding: '15px 20px', borderTop: '1px solid #eee', background: '#f8f9fa', flexShrink: 0 }}>
          {isEditMode ? (
            <>
              <button className="btn btn-primary" onClick={handleSaveEditCustomer} disabled={saving} style={{ marginRight: '10px', padding:'8px 16px', background:'#007bff', color:'white', border:'none', borderRadius:'4px', cursor:'pointer' }}>{saving ? '保存中...' : '儲存變更'}</button>
              <button className="btn btn-secondary" onClick={handleCloseDetailModal} style={{ padding:'8px 16px', background:'#6c757d', color:'white', border:'none', borderRadius:'4px', cursor:'pointer' }}>取消</button>
            </>
          ) : (
            <button className="btn btn-secondary" onClick={handleCloseDetailModal} style={{ padding:'8px 16px', background:'#6c757d', color:'white', border:'none', borderRadius:'4px', cursor:'pointer' }}>關閉</button>
          )}
        </div>

        {/* 詳細報告 Modal */}
        {isReportModalOpen && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', zIndex: 1100, display: 'flex', justifyContent: 'center', alignItems: 'center' }} onClick={() => setIsReportModalOpen(false)}>
            <div style={{ background: 'white', borderRadius: '8px', width: '950px', maxWidth: '95%', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
              <div style={{ padding: '20px 30px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div><h3 style={{ margin: '0 0 5px 0', fontSize: '1.5rem' }}>銷售技巧詳細分析報告</h3><p style={{ margin: 0, color: '#666' }}>基於 AI 對話分析的核心問題偵測結果</p></div>
                <button onClick={() => setIsReportModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '28px', cursor: 'pointer' }}>×</button>
              </div>
              <div style={{ padding: '30px', overflowY: 'auto', background: '#f8f9fa' }}>
                <AIAnalysisEngine />
              </div>
              <div style={{ padding: '15px 30px', borderTop: '1px solid #eee', background: 'white', textAlign: 'right' }}>
                <button onClick={() => setIsReportModalOpen(false)} style={{ padding: '8px 25px', background: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>關閉報告</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default CustomerDetailModal;
export default CustomerDetailModal;

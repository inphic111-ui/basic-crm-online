import React, { useState, useMemo } from 'react';
// 引入圖標
import { 
  User, PieChart, Bot, ListChecks, FileText, CalendarCheck, 
  Mic, Clock, FileBarChart, Eye, Lightbulb, Target, 
  ShoppingCart, CreditCard, X 
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
//  1. 子組件：統計卡片 (用於詳細報告)
// ==========================================
const StatCard = ({ label, value, color, bg = 'white' }) => (
  <div style={{ 
      background: bg, padding: '20px', borderRadius: '8px', textAlign: 'center', 
      border: `1px solid ${bg === 'white' ? '#eee' : color}`,
      boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
  }}>
      <div style={{ fontSize: '2rem', fontWeight: 'bold', color: color, marginBottom: '5px' }}>{value}</div>
      <div style={{ color: '#666', fontSize: '0.85rem', fontWeight: '600' }}>{label}</div>
  </div>
);

// ==========================================
//  2. 子組件：AI 分析引擎 (核心規則邏輯)
// ==========================================
const AIAnalysisEngine = () => {
  // 2.1 定義規則庫 (A1-A4, B1-B4)
  const RULES_CONFIG = {
    core1: {
      title: "核心問題一：客戶為什麼要買這個產品？",
      sub: "購買動機詢問完整度",
      rules: [
        { id: 'A1', label: '深度問題探討', keywords: ['採購流程', '出貨流程', '付款條件', '彈性選擇', '專案完成', '確保供貨', '提升生產力', '預算範圍'] },
        { id: 'A2', label: '痛點發掘與確認', keywords: ['每天花多少時間處理', '累死了', '壓力很大', '我的預算', '我的痛點', '解決什麼問題', '影響你的決定'] },
        { id: 'A3', label: '價值感連結', keywords: ['多花時間在', '策略規劃', '家人陪伴', '解放時間', '降低壓力', '長期利益', '無形價值'] },
        { id: 'A4', label: '具體行動承諾', keywords: ['試用一周', '付費方式', '要簽約', '需要哪些文件', '完成時間', '如何開始'] },
      ]
    },
    core2: {
      title: "核心問題二：客戶為什麼不肯付錢？",
      sub: "價格抗拒處理完整度",
      rules: [
        { id: 'B1', label: '真假問題判斷', keywords: ['跟您確認一下', '如果沒有錢這個顧慮', '你就會買單對嗎', '價格是唯一考量'] },
        { id: 'B2', label: '價值感補充', keywords: ['研發過程', '團隊心血', '堅持', '專利保護', '免費維修', '附贈服務', '超值', '咖啡豆配送'] },
        { id: 'B3', label: '轉移焦點', keywords: ['長期利益', '投資回報', '效益', '改變', '價值', '意義'] },
        { id: 'B4', label: '挖掘真實顧慮', keywords: ['真正顧慮', '真正在乎', '不用在錢', '鬼打牆', '其他考量'] },
      ]
    }
  };

  // 2.2 模擬對話內容 (包含關鍵詞以展示亮燈效果)
  const mockTranscript = `
    客戶：我們現在每天處理報表真的覺得壓力很大，而且常常出錯。
    業務：我了解，那您想用這個產品解決什麼問題呢？
    客戶：主要是希望能解放時間，讓我們能多花時間在策略規劃上。
    業務：這款產品的超值之處就在於我們團隊心血研發的自動化引擎。
    客戶：但是價格有點貴。
    業務：跟您確認一下，如果沒有錢這個考量，您會覺得這產品符合需求嗎？
  `;

  // 2.3 分析邏輯
  const analyze = (rules) => {
    let totalKeywords = 0;
    let foundKeywordsCount = 0;
    const ruleResults = rules.map(rule => {
      const found = rule.keywords.filter(k => mockTranscript.includes(k));
      const missing = rule.keywords.filter(k => !mockTranscript.includes(k));
      totalKeywords += rule.keywords.length;
      foundKeywordsCount += found.length;
      
      // 計算單項規則得分 (有問到就有分，最高100%)
      const score = Math.min(100, Math.round((found.length / rule.keywords.length) * 100 * 2)); // 加權顯示用

      return { ...rule, found, missing, score };
    });
    return { ruleResults, totalKeywords, foundKeywordsCount };
  };

  const analysisCore1 = analyze(RULES_CONFIG.core1.rules);
  const analysisCore2 = analyze(RULES_CONFIG.core2.rules);

  // 總體統計
  const totalKeys = analysisCore1.totalKeywords + analysisCore2.totalKeywords;
  const detectedKeys = analysisCore1.foundKeywordsCount + analysisCore2.foundKeywordsCount;
  const detectionRate = Math.round((detectedKeys / totalKeys) * 100);
  const overallScore = Math.round((detectionRate / 100) * 10);

  // 渲染單個核心區塊 (A or B)
  const renderCoreSection = (config, analysisResult, icon) => (
    <div style={{ marginBottom: '40px', background: 'white', padding: '25px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '15px' }}>
        <h4 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px', color: '#2c3e50' }}>
           {icon} {config.title}
        </h4>
        <div style={{textAlign: 'right'}}>
            <div style={{ fontSize: '0.85rem', color: '#999' }}>{config.sub}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#3498db' }}>
                {Math.round(analysisResult.ruleResults.reduce((acc, curr) => acc + curr.score, 0) / 4)}/10
            </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
        {analysisResult.ruleResults.map((item) => (
          <div key={item.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ fontWeight: 'bold', color: '#444' }}>{item.label} ({item.id})</div>
                <div style={{ fontWeight: 'bold', color: item.score > 0 ? '#3498db' : '#999' }}>{item.score}%</div>
            </div>
            <div style={{ height: '8px', background: '#eee', borderRadius: '4px', overflow: 'hidden', marginBottom: '12px' }}>
               <div style={{ width: `${item.score}%`, height: '100%', background: item.score > 0 ? '#3498db' : '#ccc', transition: 'width 0.5s ease' }}></div>
            </div>
            {/* 關鍵詞展示區 */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {/* 亮燈 (已討論) */}
                {item.found.map(k => (
                    <span key={k} style={{ fontSize: '0.85rem', padding: '4px 12px', borderRadius: '20px', background: '#2ecc71', color: 'white', border: '1px solid #27ae60', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        ✓ {k}
                    </span>
                ))}
                {/* 未亮燈 (未討論) */}
                {item.missing.map(k => (
                    <span key={k} style={{ fontSize: '0.85rem', padding: '4px 12px', borderRadius: '20px', background: '#f1f3f5', color: '#adb5bd', border: '1px solid #e9ecef' }}>
                        {k}
                    </span>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ fontFamily: '"Segoe UI", sans-serif' }}>
        {/* 頂部數據概覽 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginBottom: '30px' }}>
            <StatCard label="總關鍵詞數" value={totalKeys} color="#3498db" bg="#f0f8ff" />
            <StatCard label="偵測到關鍵詞" value={detectedKeys} color="#2ecc71" />
            <StatCard label="整體偵測率" value={`${detectionRate}%`} color="#f39c12" />
            <StatCard label="綜合評分" value={`${overallScore}/10`} color="#3498db" bg="#f0f8ff" />
        </div>

        {/* 核心問題分析區塊 */}
        {renderCoreSection(RULES_CONFIG.core1, analysisCore1, <ShoppingCart size={24} />)}
        {renderCoreSection(RULES_CONFIG.core2, analysisCore2, <CreditCard size={24} />)}

        {/* 底部改進建議 */}
        <div style={{ background: '#fff9e6', padding: '20px', borderRadius: '8px', borderLeft: '5px solid #f39c12' }}>
            <h4 style={{ margin: '0 0 15px 0', color: '#d35400', fontSize: '1.1rem', display:'flex', alignItems:'center', gap:'10px' }}>
                <Lightbulb size={20}/> 改進建議與行動計劃
            </h4>
            <div style={{ marginBottom: '10px', fontSize: '0.95rem', color: '#555' }}>
                <strong>📍 立即行動：</strong> {overallScore < 5 ? '立即加強需求挖掘，重點關注客戶痛點與使用情境。' : '持續優化價值論述。'}
            </div>
            <div style={{ fontSize: '0.95rem', color: '#555' }}>
                <strong>🚀 長期發展：</strong> 建立系統化的銷售對話框架，持續追蹤改進成效。
            </div>
        </div>
    </div>
  );
};

// ==========================================
//  3. 主組件：客戶詳細資訊 Modal (Tab1 + Tab2)
// ==========================================
const CustomerDetailModal = ({ 
  selectedCustomer, 
  handleCloseDetailModal, 
  isEditMode, 
  editFormData, 
  handleEditFormChange, 
  handleSaveEditCustomer, 
  saving,
  // 輔助函數預設值
  calculateVScore = () => 0,
  calculatePScore = () => 0,
  calculateCVI = () => 0,
  getCustomerTypeByVP = () => {},
  getTypeLabel = () => '',
  getRatingBadge = () => null,
  getOrderStatusTag = () => null,
}) => {
  
  const [activeTab, setActiveTab] = useState('info');
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // --- Radar Chart Data ---
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

  const radarOptions = {
    scales: { r: { suggestedMin: 0, suggestedMax: 10, ticks: { display: false } } },
    plugins: { legend: { display: false } }
  };

  // --- Timeline Data ---
  const timelineHistory = useMemo(() => {
    if (editFormData.ai_analysis_history) {
      try {
        const history = typeof editFormData.ai_analysis_history === 'string' ? JSON.parse(editFormData.ai_analysis_history) : editFormData.ai_analysis_history;
        // ★★★ 修正：確保時間軸降序排序 ★★★
        if (Array.isArray(history)) {
          return [...history].sort((a, b) => new Date(b.date) - new Date(a.date));
        }
        return [];
      } catch (err) { return []; }
    }
    return [];
  }, [editFormData.ai_analysis_history]);

  // --- Conversion Rate 連動 ---
  const conversionRate = useMemo(() => {
    if (timelineHistory.length > 0 && timelineHistory[0].conversion_rate !== undefined) {
      return `${timelineHistory[0].conversion_rate}%`;
    }
    // 預設回退邏輯：用 N 分數推算
    return `${(parseInt(editFormData.n_score || 0) * 10)}%`;
  }, [timelineHistory, editFormData.n_score]);


  if (!selectedCustomer) return null;

  return (
    <div className="modal-overlay" onClick={handleCloseDetailModal}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '1100px', width: '95%', height: '90vh', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
        
        {/* Header */}
        <div className="modal-header" style={{ padding: '15px 20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ margin: 0 }}>{selectedCustomer.name}</h2>
            {getRatingBadge(editFormData.customer_rating)}
          </div>
          <button className="close-btn" onClick={handleCloseDetailModal} style={{ fontSize: '1.5rem', background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #dee2e6', background: '#f8f9fa', padding: '0 20px', flexShrink: 0 }}>
          <button onClick={() => setActiveTab('info')} style={{ padding: '15px 20px', background: activeTab === 'info' ? 'white' : 'transparent', border: '1px solid transparent', borderBottom: activeTab === 'info' ? '3px solid #3498db' : '3px solid transparent', fontWeight: activeTab === 'info' ? 'bold' : 'normal', color: activeTab === 'info' ? '#3498db' : '#666', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={18}/> 客戶資訊 (編輯)
          </button>
          <button onClick={() => setActiveTab('profile')} style={{ padding: '15px 20px', background: activeTab === 'profile' ? 'white' : 'transparent', border: '1px solid transparent', borderBottom: activeTab === 'profile' ? '3px solid #2ecc71' : '3px solid transparent', fontWeight: activeTab === 'profile' ? 'bold' : 'normal', color: activeTab === 'profile' ? '#2ecc71' : '#666', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <PieChart size={18}/> 消費者輪廓 (分析)
          </button>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ flex: 1, overflowY: 'auto', padding: '20px', background: '#fff' }}>
          
          {/* --- TAB 1: 編輯表單 --- */}
          {activeTab === 'info' && (
            <div className="fade-in">
              {/* 基本資訊 */}
              <div className="detail-section">
                <h3>基本資訊</h3>
                <div className="detail-grid">
                  <div className="detail-item"><label>客戶名稱:</label>{isEditMode ? <input type="text" name="name" value={editFormData.name || ''} onChange={handleEditFormChange} /> : <span>{selectedCustomer.name}</span>}</div>
                  <div className="detail-item"><label>公司名稱:</label>{isEditMode ? <input type="text" name="company_name" value={editFormData.company_name || ''} onChange={handleEditFormChange} /> : <span>{selectedCustomer.company_name || '-'}</span>}</div>
                  <div className="detail-item"><label>資本額:</label>{isEditMode ? <input type="number" name="capital_amount" value={editFormData.capital_amount || ''} onChange={handleEditFormChange} /> : <span>NT${parseFloat(selectedCustomer.capital_amount || 0).toLocaleString()}</span>}</div>
                </div>
              </div>
              {/* 評分資訊 */}
              <div className="detail-section">
                <h3>評分資訊</h3>
                <div className="detail-grid">
                  <div className="detail-item"><label>N 評分:</label>{isEditMode ? <select name="n_score" value={editFormData.n_score || ''} onChange={handleEditFormChange}><option value="0">0</option><option value="6">6</option><option value="10">10</option></select> : <span>{editFormData.n_score || '-'}</span>}</div>
                  <div className="detail-item"><label>F 評分:</label>{isEditMode ? <select name="f_score" value={editFormData.f_score || ''} onChange={handleEditFormChange}><option value="0">0</option><option value="6">6</option><option value="10">10</option></select> : <span>{editFormData.f_score || '-'}</span>}</div>
                  <div className="detail-item"><label>V 評分:</label><span>{calculateVScore(editFormData.price, editFormData.annual_consumption)}</span></div>
                  <div className="detail-item"><label>P 評分:</label><span>{calculatePScore(editFormData.price)}</span></div>
                  <div className="detail-item"><label>CVI 評分:</label><span>{calculateCVI(editFormData.n_score, editFormData.f_score, calculateVScore(editFormData.price, editFormData.annual_consumption), calculatePScore(editFormData.price))}</span></div>
                </div>
              </div>
              {/* 備註 */}
              <div className="detail-section">
                <h3>備註</h3>
                {isEditMode ? <textarea name="notes" value={editFormData.notes || ''} onChange={handleEditFormChange} style={{width: '100%', minHeight: '100px'}} /> : <div className="notes-box">{editFormData.notes || '無備註'}</div>}
              </div>
            </div>
          )}

          {/* --- TAB 2: 消費者輪廓 (儀表板) --- */}
          {activeTab === 'profile' && (
            <div className="fade-in" style={{ paddingTop: '10px' }}>
              
              {/* 1. AI 洞察 */}
              <div style={{ marginBottom: '30px', background: '#f0f8ff', borderLeft: '4px solid #3498db', padding: '20px', borderRadius: '8px' }}>
                <h3 style={{ margin: '0 0 15px 0', display: 'flex', alignItems: 'center', gap: '10px', color: '#2c3e50' }}><Bot size={24}/> AI 智能洞察</h3>
                <p style={{ margin: 0, color: '#555' }}>客戶語氣整體積極，但在預算（F評分: {editFormData.f_score}）方面表現出保留態度。</p>
              </div>

              {/* 2. 推薦行動計劃 */}
              <div style={{ marginBottom: '30px', background: 'white', border: '1px solid #eee', padding: '20px', borderRadius: '8px', borderLeft: '4px solid #2ecc71' }}>
                <h3 style={{ margin: '0 0 15px 0', display: 'flex', alignItems: 'center', gap: '10px', color: '#2c3e50' }}><ListChecks size={24}/> 推薦行動計劃</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', background: '#f0fff0', padding: '10px', borderRadius: '8px' }}>
                  <FileText size={24} color="#2ecc71"/>
                  <div><h4 style={{ margin: 0 }}>準備補充資料</h4><p style={{ margin: 0, color: '#555' }}>準備 {editFormData.initial_product} 的 ROI 分析報告。</p></div>
                </div>
              </div>

              {/* 3. 摘要卡片 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '30px' }}>
                <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #eee', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}><h4 style={{ color: '#3498db', margin: '0 0 10px 0' }}>客戶資料</h4><p>{selectedCustomer.name}</p></div>
                <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #eee', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}><h4 style={{ color: '#3498db', margin: '0 0 10px 0' }}>公司資訊</h4><p>{selectedCustomer.company_name || '-'}</p></div>
                <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #eee', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}><h4 style={{ color: '#3498db', margin: '0 0 10px 0' }}>聯絡狀態</h4><p>積極跟進中</p></div>
              </div>

              {/* 4. 決策結構 */}
              <div style={{ marginBottom: '30px', background: 'white', border: '1px solid #eee', padding: '20px', borderRadius: '8px' }}>
                <h3 style={{ margin: '0 0 15px 0' }}>決策結構分析</h3>
                <p style={{color:'#666'}}>主要決策者：{selectedCustomer.name}</p>
              </div>

              {/* 5. 雷達圖 & 弱點分析 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
                <div style={{ background: 'white', border: '1px solid #eee', padding: '20px', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h3 style={{ margin: 0 }}>銷售技巧評估</h3>
                    <button onClick={() => setIsReportModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#2ecc71', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}>
                      <FileBarChart size={14}/> 詳細報告
                    </button>
                  </div>
                  <div style={{ height: '300px', display: 'flex', justifyContent: 'center' }}><Radar data={radarData} options={radarOptions} /></div>
                </div>
                <div style={{ background: 'white', border: '1px solid #eee', padding: '20px', borderRadius: '8px' }}>
                  <h3 style={{ margin: '0 0 15px 0' }}>弱點分析與建議</h3>
                  <div style={{ background: '#fff9e6', borderLeft: '4px solid #f39c12', padding: '15px', marginBottom: '15px', borderRadius: '4px' }}>
                    <h4 style={{ margin: '0 0 5px 0' }}>需求挖掘</h4><p style={{ margin: 0, fontSize: '0.9rem' }}>建議加強開放式提問。</p>
                  </div>
                </div>
              </div>

              {/* 6. 時間軸 */}
              <div style={{ background: 'white', border: '1px solid #eee', padding: '20px', borderRadius: '8px' }}>
                <h3 style={{ margin: '0 0 20px 0' }}>溝通紀錄時間軸</h3>
                {timelineHistory.length > 0 ? timelineHistory.map((rec, i) => <div key={i}>{rec.timeline_text}</div>) : <p style={{color:'#999'}}>無紀錄</p>}
              </div>

            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer" style={{ padding: '15px 20px', borderTop: '1px solid #eee', background: '#f8f9fa', flexShrink: 0 }}>
          {isEditMode ? (
            <>
              <button className="btn btn-primary" onClick={handleSaveEditCustomer} disabled={saving} style={{ marginRight: '10px' }}>{saving ? '保存中...' : '儲存變更'}</button>
              <button className="btn btn-secondary" onClick={handleCloseDetailModal}>取消</button>
            </>
          ) : (
            <button className="btn btn-secondary" onClick={handleCloseDetailModal}>關閉</button>
          )}
        </div>

        {/* --- 詳細報告 Modal (巢狀) --- */}
        {isReportModalOpen && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', zIndex: 1100, display: 'flex', justifyContent: 'center', alignItems: 'center' }} onClick={() => setIsReportModalOpen(false)}>
            <div style={{ background: 'white', borderRadius: '8px', width: '950px', maxWidth: '95%', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
              
              <div style={{ padding: '20px 30px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div><h3 style={{ margin: '0 0 5px 0', fontSize: '1.5rem' }}>銷售技巧詳細分析報告</h3><p style={{ margin: 0, color: '#666' }}>基於 AI 對話分析的核心問題偵測結果</p></div>
                <button onClick={() => setIsReportModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '28px', cursor: 'pointer' }}>×</button>
              </div>

              <div style={{ padding: '30px', overflowY: 'auto', background: '#f8f9fa' }}>
                {/* 這裡直接嵌入 AI 分析引擎組件 */}
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

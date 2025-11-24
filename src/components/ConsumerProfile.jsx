import React, { useState, useMemo } from 'react';
import { 
  User, MapPin, Phone, Mail, Tag, 
  TrendingUp, ShoppingBag, Clock, Activity,
  LayoutDashboard, FileText, History, X,
  PieChart, Bot, ListChecks, FileText as FileTextIcon, CalendarCheck, 
  Mic, Clock as ClockIcon, FileBarChart, Eye, Lightbulb, Target, 
  ShoppingCart, CreditCard, CheckCircle2
} from 'lucide-react';
import { 
  Radar, RadarChart, PolarGrid, 
  PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer 
} from 'recharts';

// 引入 Chart.js 相關組件
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Radar as ChartJSRadar } from 'react-chartjs-2';

// 註冊 Chart.js 組件 (必須在組件外部執行一次)
// 雖然我們主要使用 recharts，但為了兼容用戶提供的 AIAnalysisEngine，我們保留 ChartJS 的導入和註冊
ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

// ==========================================
//  1. 子組件：統計卡片 (用於 Tab2 頂部)
// ==========================================
const StatCard = ({ label, value, icon: Icon, description, color, bg = 'white' }) => (
  <div style={{ 
      background: bg, padding: '20px', borderRadius: '8px', 
      border: `1px solid ${bg === 'white' ? '#eee' : color}`,
      boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
      display: 'flex', flexDirection: 'column', gap: '5px'
  }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
          <div style={{ fontSize: '0.9rem', color: '#666', fontWeight: 'bold' }}>{label}</div>
          <Icon size={24} color={color} />
      </div>
      <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: color }}>{value}</div>
      <div style={{ fontSize: '0.8rem', color: '#888' }}>{description}</div>
  </div>
);

// ==========================================
//  2. 子組件：AI 分析引擎 (用於 Tab 2 內容)
// ==========================================
const AIAnalysisEngine = () => {
  // 2.1 定義規則庫
  const RULES_CONFIG = {
    core1: {
      title: "核心問題一：客戶為什麼要買這個產品？",
      sub: "購買動機詢問完整度",
      rules: [
        { id: 'A1', label: '深度問題探討', keywords: ['採購流程', '出貨流程', '付款條件', '彈性選擇', '專案完成', '確保供貨', '提升生產力', '預算範圍'] },
        { id: 'A2', label: '痛點發掘與確認', keywords: ['每天花多少時間', '累死了', '壓力很大', '我的預算', '我的痛點', '解決什麼問題', '影響你的決定'] },
        { id: 'A3', label: '價值感連結', keywords: ['多花時間在', '策略規劃', '家人陪伴', '解放時間', '降低壓力', '長期利益', '無形價值'] },
        { id: 'A4', label: '具體行動承諾', keywords: ['試用一周', '付費方式', '要簽約', '需要哪些文件', '完成時間', '如何開始'] },
      ]
    },
    core2: {
      title: "核心問題二：客戶為什麼不肯付錢？",
      sub: "價格抗拒處理完整度",
      rules: [
        { id: 'B1', label: '真假問題判斷', keywords: ['跟您確認一下', '如果沒有錢', '就會買單對嗎', '價格是唯一考量'] },
        { id: 'B2', label: '價值感補充', keywords: ['研發過程', '團隊心血', '堅持', '專利保護', '免費維修', '附贈服務', '超值'] },
        { id: 'B3', label: '轉移焦點', keywords: ['長期利益', '投資回報', '效益', '改變', '價值', '意義'] },
        { id: 'B4', label: '挖掘真實顧慮', keywords: ['真正顧慮', '真正在乎', '不用在錢', '鬼打牆', '其他考量'] },
      ]
    }
  };

  // 2.2 模擬對話內容 (使用靜態模擬數據)
  const mockTranscript = `
    客戶：我們現在每天處理報表真的覺得壓力很大，而且常常出錯。
    業務：我了解，那您想用這個產品解決什麼問題呢？
    客戶：主要是希望能解放時間，讓我們能多花時間在策略規劃上。
    業務：這款產品的超值之處就在於我們團隊心血研發的自動化引擎。
    客戶：但是價格有點貴。
    業務：跟您確認一下，如果沒有錢這個考量，您會覺得這產品符合需求嗎？
  `;

  // 2.3 分析運算邏輯
  const analyze = (rules) => {
    let totalKeywords = 0;
    let foundKeywordsCount = 0;
    const ruleResults = rules.map(rule => {
      const found = rule.keywords.filter(k => mockTranscript.includes(k));
      const missing = rule.keywords.filter(k => !mockTranscript.includes(k));
      totalKeywords += rule.keywords.length;
      foundKeywordsCount += found.length;
      // 模擬分數計算，確保在 0-100 之間
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
  const overallScore = Math.round((detectionRate / 100) * 10) + 1;

  const renderCoreSection = (config, analysisResult, Icon) => (
    <div style={{ marginBottom: '30px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', marginBottom: '15px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
        <h4 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '10px', color: '#2c3e50' }}>
           <Icon size={24} /> {config.title}
        </h4>
        <span style={{ fontSize: '0.9rem', color: '#666' }}>{config.sub} <strong style={{color:'#3498db'}}> {Math.round(analysisResult.ruleResults.reduce((a,b)=>a+b.score,0)/40)}/10</strong></span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {analysisResult.ruleResults.map((item) => (
          <div key={item.id} style={{ background: '#f9f9f9', padding: '15px', borderRadius: '8px' }}>
            <div className="flex items-center justify-between mb-2">
                <div className="font-bold text-gray-700 flex items-center gap-2">
                    {item.score > 0 ? <CheckCircle2 size={16} color="#2ecc71"/> : <Target size={16} color="#999"/>}
                    {item.label} ({item.id})
                </div>
                <div className="flex items-center gap-2 w-48">
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                       <div style={{ width: `${item.score}%`, height: '100%', background: item.score > 0 ? '#3498db' : '#ccc', transition: 'width 0.5s ease' }}></div>
                    </div>
                    <span className="text-sm font-bold" style={{ color: item.score > 0 ? '#3498db' : '#999' }}>{item.score}%</span>
                </div>
            </div>
            {item.found.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                    <span className="text-xs text-green-600 font-bold">✓ 已討論：</span>
                    {item.found.map(k => (
                        <span key={k} className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">{k}</span>
                    ))}
                </div>
            )}
            <div className="flex flex-wrap gap-2">
                <span className="text-xs text-red-600 font-bold">✕ 未討論：</span>
                {item.missing.map(k => (
                    <span key={k} className="text-xs px-2 py-1 rounded-full bg-red-50 text-red-600 border border-red-200">{k}</span>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="p-4" style={{ fontFamily: '"Segoe UI", sans-serif' }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard label="總關鍵詞數" value={totalKeys} color="#3498db" bg="#f0f8ff" icon={ListChecks} description="規則庫總關鍵詞數量" />
            <StatCard label="偵測到關鍵詞" value={detectedKeys} color="#2ecc71" icon={Eye} description="在對話中偵測到的關鍵詞數量" />
            <StatCard label="整體偵測率" value={`${detectionRate}%`} color="#f39c12" icon={PieChart} description="關鍵詞偵測的覆蓋率" />
            <StatCard label="綜合評分" value={`${overallScore}/10`} color="#3498db" bg="#f0f8ff" icon={Bot} description="AI 綜合評估分數" />
        </div>
        {renderCoreSection(RULES_CONFIG.core1, analysisCore1, ShoppingCart)}
        {renderCoreSection(RULES_CONFIG.core2, analysisCore2, CreditCard)}
        <div className="bg-yellow-50 p-4 rounded-xl border-l-4 border-yellow-400 mt-6">
            <h4 className="font-bold text-yellow-800 mb-2 flex items-center gap-2"><Lightbulb size={20}/> 改進建議</h4>
            <p className="text-sm text-yellow-900">
                <strong>立即行動：</strong> {overallScore < 5 ? '加強需求挖掘，多詢問使用情境。' : '持續強化價值連結。'}
            </p>
        </div>
    </div>
  );
};


// --- 3. 子組件：分頁按鈕 ---
const TabButton = ({ id, label, icon: Icon, isActive, onClick }) => (
  <button
    onClick={() => onClick(id)}
    className={`
      flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors duration-200
      ${isActive 
        ? 'border-blue-500 text-blue-600 bg-blue-50/50' 
        : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}
    `}
  >
    <Icon size={18} />
    {label}
  </button>
);

// --- 4. 主組件：ConsumerProfile ---
export default function ConsumerProfile({ 
  selectedCustomer, 
  handleCloseDetailModal,
  // ...其他從 Customers.jsx 傳入的 props
}) {
  // 將 'overview' | 'details' | 'journey' 調整為 'info' | 'analysis' | 'journey'
  const [activeTab, setActiveTab] = useState('info'); 

  if (!selectedCustomer) return null;

  // 將 selectedCustomer 的數據映射到 MOCK_DATA 結構
  const MOCK_DATA = {
    info: {
      id: selectedCustomer.customer_id,
      name: selectedCustomer.customer_name,
      avatar: selectedCustomer.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
      level: selectedCustomer.customer_type || '普通會員',
      email: selectedCustomer.email || 'N/A',
      phone: selectedCustomer.phone || 'N/A',
      location: selectedCustomer.address || 'N/A',
      tags: selectedCustomer.tags || [],
    },
    stats: {
      totalSpent: `$${selectedCustomer.annual_consumption || 0}`,
      orders: selectedCustomer.order_count || 0,
      lastActive: selectedCustomer.last_contact_date || 'N/A',
      avgOrderValue: `$${(selectedCustomer.annual_consumption / selectedCustomer.order_count) || 0}`
    },
    radar: [
      { subject: '品牌忠誠', A: selectedCustomer.n_score || 0, fullMark: 150 },
      { subject: '消費能力', A: selectedCustomer.f_score || 0, fullMark: 150 },
      { subject: '新品嘗鮮', A: 86, fullMark: 150 },
      { subject: '活動參與', A: 99, fullMark: 150 },
      { subject: '社群互動', A: 85, fullMark: 150 },
      { subject: '回購頻率', A: 65, fullMark: 150 },
    ],
    timeline: selectedCustomer.ai_analysis_history || []
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
      <div className="bg-gray-50 rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        
        {/* === 關閉按鈕 === */}
        <button onClick={handleCloseDetailModal} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10">
          <X size={24} />
        </button>

        {/* === A. 頂部頭像與摘要 === */}
        <div className="bg-white rounded-t-xl border-b border-gray-200 p-6 flex flex-col md:flex-row items-center md:items-start gap-6 relative">
          <img src={MOCK_DATA.info.avatar} alt="Avatar" className="w-24 h-24 rounded-full bg-gray-100 border-4 border-white shadow-sm" />
          
          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-col md:flex-row items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold">{MOCK_DATA.info.name}</h1>
              <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs font-bold rounded-full">
                {MOCK_DATA.info.level}
              </span>
            </div>
            
            <div className="flex flex-wrap justify-center md:justify-start gap-4 text-sm text-gray-500 mb-4">
              <span className="flex items-center gap-1"><Mail size={14}/> {MOCK_DATA.info.email}</span>
              <span className="flex items-center gap-1"><Phone size={14}/> {MOCK_DATA.info.phone}</span>
              <span className="flex items-center gap-1"><MapPin size={14}/> {MOCK_DATA.info.location}</span>
            </div>

            <div className="flex flex-wrap gap-2 justify-center md:justify-start">
              {MOCK_DATA.info.tags.map(tag => (
                <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded flex items-center gap-1">
                  <Tag size={10} /> {tag}
                </span>
              ))}
            </div>
          </div>

          {/* 快速指標 */}
          <div className="grid grid-cols-2 gap-4 w-full md:w-auto border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6">
            <div className="text-center md:text-right">
              <div className="text-xs text-gray-400">總消費額</div>
              <div className="text-xl font-bold text-blue-600">{MOCK_DATA.stats.totalSpent}</div>
            </div>
            <div className="text-center md:text-right">
              <div className="text-xs text-gray-400">訂單數</div>
              <div className="text-xl font-bold text-gray-700">{MOCK_DATA.stats.orders}</div>
            </div>
          </div>
        </div>

        {/* === B. 分頁導航欄 === */}
        <div className="bg-white border-b border-gray-200 flex overflow-x-auto shrink-0">
          <TabButton 
            id="info" 
            label="客戶資訊 (Tab 1)" 
            icon={FileTextIcon} 
            isActive={activeTab === 'info'} 
            onClick={setActiveTab} 
          />
          <TabButton 
            id="analysis" 
            label="AI 分析 (Tab 2)" 
            icon={Bot} 
            isActive={activeTab === 'analysis'} 
            onClick={setActiveTab} 
          />
          <TabButton 
            id="journey" 
            label="行為軌跡" 
            icon={History} 
            isActive={activeTab === 'journey'} 
            onClick={setActiveTab} 
          />
        </div>

        {/* === C. 分頁內容區域 === */}
        <div className="bg-white rounded-b-xl p-6 overflow-y-auto">
          
          {/* Tab 1: 客戶資訊 (原來的 overview + details) */}
          {activeTab === 'info' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-300">
              {/* 左側：雷達圖 */}
              <div className="lg:col-span-1 border border-gray-100 rounded-xl p-4 flex flex-col items-center">
                <h3 className="text-lg font-bold mb-4 text-gray-700">AI 畫像分析</h3>
                <div className="w-full h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={MOCK_DATA.radar}>
                      <PolarGrid stroke="#e5e7eb" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 150]} tick={false} axisLine={false} />
                      <Radar name="Consumer" dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.5} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-sm text-gray-500 text-center mt-2">該客戶屬於「高品質生活追求者」，對新品接受度高。</p>
              </div>

              {/* 右側：詳細指標卡片 */}
              <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: '平均客單價', val: MOCK_DATA.stats.avgOrderValue, icon: ShoppingBag, color: 'bg-blue-100 text-blue-600' },
                  { label: '最近活躍', val: MOCK_DATA.stats.lastActive, icon: ClockIcon, color: 'bg-green-100 text-green-600' },
                  { label: '互動頻率', val: '高', icon: Activity, color: 'bg-purple-100 text-purple-600' },
                  { label: '預測流失率', val: '2.5%', icon: TrendingUp, color: 'bg-red-100 text-red-600' },
                ].map((stat, idx) => (
                  <div key={idx} className="p-4 border border-gray-100 rounded-xl hover:shadow-md transition-shadow flex items-center gap-4">
                    <div className={`p-3 rounded-lg ${stat.color}`}>
                      <stat.icon size={24} />
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">{stat.label}</div>
                      <div className="text-xl font-bold text-gray-800">{stat.val}</div>
                    </div>
                  </div>
                ))}
                
                {/* 策略建議區塊 */}
                <div className="col-span-1 sm:col-span-2 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100 mt-2">
                  <h4 className="font-bold text-blue-800 mb-2 flex items-center gap-2">💡 AI 營銷建議</h4>
                  <p className="text-sm text-blue-900/80">
                    建議在下週新品發布時，向此客戶發送 VIP 專屬早鳥優惠券（轉換率預估 +15%）。
                  </p>
                </div>

                {/* 詳細資料區塊 (從原來的 details tab 移過來) */}
                <div className="col-span-1 sm:col-span-2 mt-6">
                  <h3 className="text-lg font-bold mb-6 border-b pb-2">基本檔案資料</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">客戶 ID</label>
                        <div className="p-2 bg-gray-50 rounded border border-gray-200 text-gray-700">{MOCK_DATA.info.id}</div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">全名</label>
                        <div className="p-2 bg-gray-50 rounded border border-gray-200 text-gray-700">{MOCK_DATA.info.name}</div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">生日</label>
                        <div className="p-2 bg-gray-50 rounded border border-gray-200 text-gray-700">1990-05-20</div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">職業</label>
                        <div className="p-2 bg-gray-50 rounded border border-gray-200 text-gray-700">UI 設計師</div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">偏好聯絡時間</label>
                        <div className="p-2 bg-gray-50 rounded border border-gray-200 text-gray-700">平日晚上 19:00 後</div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">地址</label>
                        <div className="p-2 bg-gray-50 rounded border border-gray-200 text-gray-700">{MOCK_DATA.info.location}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: AI 分析 (新的 AIAnalysisEngine) */}
          {activeTab === 'analysis' && (
            <div className="animate-in fade-in duration-300">
              <AIAnalysisEngine />
            </div>
          )}

          {/* Tab 3: 行為軌跡 (時間軸) */}
          {activeTab === 'journey' && (
            <div className="animate-in fade-in duration-300 max-w-3xl mx-auto">
              <h3 className="text-lg font-bold mb-6">最近互動紀錄</h3>
              <div className="relative border-l-2 border-gray-200 ml-3 space-y-8">
                {MOCK_DATA.timeline.length > 0 ? MOCK_DATA.timeline.map((event, idx) => (
                  <div key={idx} className="relative pl-8">
                    {/* 時間軸圓點 */}
                    <div className={`
                      absolute -left-[9px] top-0 w-5 h-5 rounded-full border-4 border-white shadow-sm
                      ${event.type === 'buy' ? 'bg-green-500' : event.type === 'support' ? 'bg-red-500' : 'bg-blue-400'}
                    `}></div>
                    
                    {/* 內容卡片 */}
                    <div className="bg-white border border-gray-100 p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-bold text-gray-800">{event.timeline_text}</span>
                        <span className="text-xs text-gray-400">{new Date(event.timestamp).toLocaleString()}</span>
                      </div>
                      {event.audio_url && (
                        <audio controls src={event.audio_url} className="w-full mt-2"></audio>
                      )}
                    </div>
                  </div>
                )) : (
                  <p className="text-center text-gray-500">目前沒有互動紀錄。</p>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

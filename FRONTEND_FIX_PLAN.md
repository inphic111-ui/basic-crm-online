# 前端顯示問題修復計劃

## 問題總結

**資料庫有數據，但前端沒有顯示**

### 資料庫中的數據（已確認）
```json
{
  "radar_purchase_intention": 8,
  "radar_budget_capacity": 9,
  "radar_decision_urgency": 5,
  "radar_trust_level": 7,
  "radar_communication_quality": 8,
  "radar_repeat_potential": 7,
  "sales_analysis": {
    "closing_probability": 65,
    "strengths": [...],
    "weaknesses": [...],
    "key_concerns": [...],
    "recommended_strategy": "...",
    "next_steps": [...]
  },
  "ai_analysis_status": "completed"
}
```

### 前端當前問題
1. **雷達圖使用硬編碼假數據**（CustomerDetailModal.jsx 第 166 行）
   ```javascript
   data: [n, 6, f, 5, v > 10 ? 10 : v, 7],  // ← 假數據！
   ```

2. **成交機率使用假數據**（第 263 行）
   ```javascript
   <StatCard label="成交機率" value={conversionRate} .../>
   // conversionRate 來自哪裡？
   ```

3. **AI 洞察分析使用硬編碼文本**（第 280 行）
   ```javascript
   <p>客戶較關注氣積極，對售後服務表現出明顯興趣...</p>  // ← 假文本！
   ```

4. **溝通紀錄時間軸可能沒有正確讀取**

---

## 修復計劃

### 第 1 步：修改後端 API，返回 AI 分析數據

**文件**：`server.mjs`

**修改位置**：`GET /api/customers/:id` API

**需要添加的欄位**：
```javascript
{
  // 現有欄位...
  
  // 新增 AI 分析欄位
  radar_purchase_intention,
  radar_budget_capacity,
  radar_decision_urgency,
  radar_trust_level,
  radar_communication_quality,
  radar_repeat_potential,
  sales_analysis,  // JSONB
  communication_timeline,  // JSONB
  ai_analysis_status,
  ai_analysis_date
}
```

---

### 第 2 步：修改前端，讀取 AI 分析數據

**文件**：`src/components/CustomerDetailModal.jsx`

#### 2.1 修改雷達圖數據（第 158-174 行）

**當前代碼**：
```javascript
const radarData = useMemo(() => {
  const n = parseInt(editFormData.n_score) || 0;
  const f = parseInt(editFormData.f_score) || 0;
  const v = calculateVScore(...) || 0;
  return {
    labels: ['需求挖掘', '價值建立', '異議處理', '行動引導', '關係建立', '成交推進'],
    datasets: [{
      data: [n, 6, f, 5, v > 10 ? 10 : v, 7],  // ← 假數據
      ...
    }],
  };
}, [editFormData, calculateVScore]);
```

**修改後**：
```javascript
const radarData = useMemo(() => {
  // 優先使用 AI 分析數據
  const purchaseIntention = editFormData.radar_purchase_intention || 0;
  const budgetCapacity = editFormData.radar_budget_capacity || 0;
  const decisionUrgency = editFormData.radar_decision_urgency || 0;
  const trustLevel = editFormData.radar_trust_level || 0;
  const communicationQuality = editFormData.radar_communication_quality || 0;
  const repeatPotential = editFormData.radar_repeat_potential || 0;
  
  return {
    labels: ['購買意願', '預算能力', '決策急迫性', '信任程度', '溝通品質', '回購潛力'],
    datasets: [{
      data: [
        purchaseIntention,
        budgetCapacity,
        decisionUrgency,
        trustLevel,
        communicationQuality,
        repeatPotential
      ],
      ...
    }],
  };
}, [editFormData]);
```

#### 2.2 修改成交機率顯示（第 263 行）

**當前代碼**：
```javascript
<StatCard label="成交機率" value={conversionRate} .../>
```

**修改後**：
```javascript
const closingProbability = editFormData.sales_analysis?.closing_probability || 0;
<StatCard label="成交機率" value={`${closingProbability}%`} .../>
```

#### 2.3 修改 AI 洞察分析（第 280 行）

**當前代碼**：
```javascript
<p>客戶較關注氣積極，對售後服務表現出明顯興趣...</p>
```

**修改後**：
```javascript
const aiInsights = editFormData.sales_analysis?.recommended_strategy || '尚無 AI 分析數據';
<p>{aiInsights.substring(0, 200)}...</p>
```

#### 2.4 修改關鍵需求識別（第 287 行）

**當前代碼**：
```javascript
<p>客戶關注的三個需求：降低維護成本...</p>
```

**修改後**：
```javascript
const keyConcerns = editFormData.sales_analysis?.key_concerns || [];
<p>客戶關注的需求：{keyConcerns.join('、') || '尚無數據'}</p>
```

#### 2.5 修改推薦行動計劃（第 299+ 行）

**修改後**：
```javascript
const nextSteps = editFormData.sales_analysis?.next_steps || [];
{nextSteps.map((step, index) => (
  <div key={index} style={{...}}>
    <p>{step}</p>
  </div>
))}
```

---

### 第 3 步：測試

1. 重啟伺服器
2. 打開 CRM 系統
3. 查看潘小姐的消費者輪廓
4. 驗證：
   - ✅ 雷達圖顯示正確的分數（8, 9, 5, 7, 8, 7）
   - ✅ 成交機率顯示 65%
   - ✅ AI 洞察分析顯示真實的建議策略
   - ✅ 關鍵需求識別顯示真實的顧慮
   - ✅ 推薦行動計劃顯示真實的下一步行動

---

## 預期結果

修復後，消費者輪廓頁面應該顯示：

- **雷達圖分數**：8, 9, 5, 7, 8, 7
- **成交機率**：65%
- **AI 洞察分析**：深化需求理解、價值導向溝通...
- **關鍵需求識別**：軟體實際效益評估、總體成本考量...
- **推薦行動計劃**：與潘小姐確認產品演示時間...

---

## 下一步

1. 修改後端 API（添加 AI 分析欄位到返回數據）
2. 修改前端組件（讀取 AI 分析數據）
3. 測試並驗證
4. 提交代碼到 GitHub

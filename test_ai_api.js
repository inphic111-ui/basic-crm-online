const customerId = 1;
const prompt = `你是一位專業的销售顾問師。請根據以下客戶信息進行綜合分析。
客戶信息:
- 客戶名稱: 李明
- 公司名稱: 科技有限公司
- 詢問產品: 軟件開發
- N 計分: 6
- F 計分: 8
- V 計分: 10
- P 計分: 9
- 預算: NT$50000

請提供:
1. 客戶需求分析
2. 下一步建議的行動(例如:提供報價單、確認收款等)
3. 成交概率估計(%)
4. 其他建議`;

const apiKey = process.env.OPENAI_API_KEY;
console.log('OpenAI API Key:', apiKey ? '已設置' : '未設置');

if (!apiKey) {
  console.error('錯誤: OpenAI API Key 未設置');
  process.exit(1);
}

fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`
  },
  body: JSON.stringify({
    model: 'gpt-3.5-turbo',
    messages: [
      {
        role: 'system',
        content: '你是一位專業的销售顾問師。請提供具体、实用的分析和建議。'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.7,
    max_tokens: 1000
  })
})
.then(res => {
  console.log('API 響應狀態:', res.status);
  return res.json();
})
.then(data => {
  if (data.error) {
    console.error('OpenAI API 錯誤:', data.error);
  } else {
    console.log('AI 分析結果:');
    console.log(data.choices[0].message.content);
  }
})
.catch(err => {
  console.error('請求失敗:', err.message);
});

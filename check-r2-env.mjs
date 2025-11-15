// 檢查 R2 環境變數
console.log('=== R2 環境變數檢查 ===');
console.log('R2_ENDPOINT:', process.env.R2_ENDPOINT ? '✓ 已設置' : '✗ 未設置');
console.log('R2_BUCKET_NAME:', process.env.R2_BUCKET_NAME ? '✓ 已設置' : '✗ 未設置');
console.log('R2_PUBLIC_URL:', process.env.R2_PUBLIC_URL ? '✓ 已設置' : '✗ 未設置');
console.log('R2_ACCESS_KEY_ID:', process.env.R2_ACCESS_KEY_ID ? '✓ 已設置' : '✗ 未設置');
console.log('R2_SECRET_ACCESS_KEY:', process.env.R2_SECRET_ACCESS_KEY ? '✓ 已設置' : '✗ 未設置');

console.log('\n=== 詳細值 ===');
console.log('R2_ENDPOINT:', process.env.R2_ENDPOINT);
console.log('R2_BUCKET_NAME:', process.env.R2_BUCKET_NAME);
console.log('R2_PUBLIC_URL:', process.env.R2_PUBLIC_URL);

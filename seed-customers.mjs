import mysql from 'mysql2/promise';

const connection = await mysql.createConnection({
  host: process.env.DATABASE_URL?.split('@')[1]?.split(':')[0] || 'localhost',
  user: process.env.DATABASE_URL?.split('://')[1]?.split(':')[0] || 'root',
  password: process.env.DATABASE_URL?.split(':')[2]?.split('@')[0] || '',
  database: process.env.DATABASE_URL?.split('/').pop() || 'test',
  ssl: true,
});

const customers = [
  {
    name: '台灣科技股份有限公司',
    email: 'contact@taiwantech.com',
    phone: '02-1234-5678',
    company: '台灣科技股份有限公司',
    priority: 'S級-確認待收款',
    classification: '鯨魚',
    notes: '大型企業客戶，月訂單金額 $100,000+',
  },
  {
    name: '創意設計工作室',
    email: 'hello@creativestudio.tw',
    phone: '03-9876-5432',
    company: '創意設計工作室',
    priority: 'A級-優質跟進客戶',
    classification: '鯊魚',
    notes: '設計服務提供商，有持續合作潛力',
  },
  {
    name: '綠色環保公司',
    email: 'info@greeneco.com',
    phone: '04-5555-6666',
    company: '綠色環保公司',
    priority: 'B級-跟進客戶',
    classification: '小魚',
    notes: '環保相關企業，正在評估產品',
  },
  {
    name: '王小明',
    email: 'wang.xiaoming@email.com',
    phone: '0912-345-678',
    company: '個人工作室',
    priority: 'C級-養成客戶',
    classification: '小蝦',
    notes: '自由工作者，需要定期跟進',
  },
  {
    name: '李美麗',
    email: 'li.meili@example.com',
    phone: '0923-456-789',
    company: '美麗顧問有限公司',
    priority: 'B級-跟進客戶',
    classification: '小魚',
    notes: '美容諮詢服務，有中期合作機會',
  },
];

try {
  for (const customer of customers) {
    await connection.execute(
      'INSERT INTO customers (name, email, phone, company, priority, classification, notes, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
      [customer.name, customer.email, customer.phone, customer.company, customer.priority, customer.classification, customer.notes]
    );
  }
  console.log('✓ Successfully seeded 5 customers');
  process.exit(0);
} catch (error) {
  console.error('✗ Error seeding customers:', error);
  process.exit(1);
} finally {
  await connection.end();
}

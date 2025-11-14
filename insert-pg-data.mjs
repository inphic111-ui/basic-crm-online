import { Pool } from 'pg';

const pool = new Pool({
  connectionString: 'postgresql://postgres:ogzTiXiZsfxqloDQwcjwVdIpQkgEGeEy@postgres-eeb1.railway.internal:5432/railway',
  ssl: { rejectUnauthorized: false }
});

const testData = [
  { customer_id: 1, business_name: 'Tech Corp', product_name: 'AI Software', call_date: '2025-11-10', call_time: '09:30:00', audio_url: 'https://example.com/audio1.mp3', transcription_text: 'Customer inquired about AI software features, pricing and implementation timeline.', transcription_status: 'completed', analysis_summary: 'Customer interested in AI software, needs further quote and technical demo', analysis_status: 'completed', ai_tags: ['interested', 'demo_needed', 'budget_sufficient'], overall_status: 'pending' },
  { customer_id: 2, business_name: 'Finance Services', product_name: 'Investment Advisor', call_date: '2025-11-10', call_time: '10:15:00', audio_url: 'https://example.com/audio2.mp3', transcription_text: 'Discussed portfolio management, risk assessment and market analysis tools.', transcription_status: 'completed', analysis_summary: 'Customer requests further investment plan and cost analysis', analysis_status: 'completed', ai_tags: ['investment_mgmt', 'risk_assessment', 'data_analysis'], overall_status: 'pending' },
  { customer_id: 3, business_name: 'Retail Store', product_name: 'Inventory Management System', call_date: '2025-11-10', call_time: '11:00:00', audio_url: 'https://example.com/audio3.mp3', transcription_text: 'Inquired about system integration capability, cost and implementation timeline.', transcription_status: 'completed', analysis_summary: 'Customer satisfied with system features, needs demo and integration testing', analysis_status: 'completed', ai_tags: ['inventory_mgmt', 'system_integration', 'cost_effective'], overall_status: 'pending' },
  { customer_id: 4, business_name: 'Manufacturing', product_name: 'ERP System', call_date: '2025-11-10', call_time: '14:30:00', audio_url: 'https://example.com/audio4.mp3', transcription_text: 'Discussed production process optimization, report functionality and data visualization.', transcription_status: 'completed', analysis_summary: 'Customer needs customization solution, expected decision next week', analysis_status: 'completed', ai_tags: ['ERP', 'production_mgmt', 'customization'], overall_status: 'pending' },
  { customer_id: 5, business_name: 'Healthcare Institution', product_name: 'Patient Management System', call_date: '2025-11-10', call_time: '15:45:00', audio_url: 'https://example.com/audio5.mp3', transcription_text: 'Inquired about system security, compliance and patient data privacy protection.', transcription_status: 'completed', analysis_summary: 'Customer concerned about data privacy, needs compliance certificate and security assessment', analysis_status: 'completed', ai_tags: ['healthcare_compliance', 'data_security', 'privacy_protection'], overall_status: 'pending' },
  { customer_id: 1, business_name: 'Education Institution', product_name: 'Online Teaching Platform', call_date: '2025-11-11', call_time: '09:00:00', audio_url: 'https://example.com/audio6.mp3', transcription_text: 'Discussed course management, student interaction and online exam functionality.', transcription_status: 'completed', analysis_summary: 'Customer interested in platform features, planning trial', analysis_status: 'completed', ai_tags: ['online_education', 'interactive_features', 'learning_analytics'], overall_status: 'pending' },
  { customer_id: 2, business_name: 'Real Estate', product_name: 'Property Management System', call_date: '2025-11-11', call_time: '10:30:00', audio_url: 'https://example.com/audio7.mp3', transcription_text: 'Inquired about tenant management, maintenance work orders and fee calculation functionality.', transcription_status: 'completed', analysis_summary: 'Customer needs multi-property support, needs quote', analysis_status: 'completed', ai_tags: ['property_mgmt', 'tenant_service', 'auto_billing'], overall_status: 'pending' },
  { customer_id: 3, business_name: 'Logistics Company', product_name: 'Transportation Management System', call_date: '2025-11-11', call_time: '13:15:00', audio_url: 'https://example.com/audio8.mp3', transcription_text: 'Discussed route optimization, real-time tracking and fuel cost management.', transcription_status: 'completed', analysis_summary: 'Customer interested in cost saving effect', analysis_status: 'completed', ai_tags: ['logistics_mgmt', 'route_optimization', 'cost_saving'], overall_status: 'pending' },
  { customer_id: 4, business_name: 'Hotel Group', product_name: 'Booking Management System', call_date: '2025-11-11', call_time: '14:00:00', audio_url: 'https://example.com/audio9.mp3', transcription_text: 'Inquired about multi-language support, payment integration and customer relationship management functionality.', transcription_status: 'completed', analysis_summary: 'Customer planning to sign next month, needs final quote', analysis_status: 'completed', ai_tags: ['booking_mgmt', 'payment_integration', 'revenue_mgmt'], overall_status: 'pending' },
  { customer_id: 5, business_name: 'Law Firm', product_name: 'Case Management System', call_date: '2025-11-11', call_time: '15:30:00', audio_url: 'https://example.com/audio10.mp3', transcription_text: 'Discussed document management, time tracking and billing functionality.', transcription_status: 'completed', analysis_summary: 'Customer satisfied with system features, expected decision this month', analysis_status: 'completed', ai_tags: ['case_mgmt', 'document_mgmt', 'time_tracking'], overall_status: 'pending' }
];

async function insertData() {
  try {
    console.log('Connecting to PostgreSQL...');
    
    // Delete old data
    console.log('Deleting old data...');
    await pool.query('DELETE FROM audio_recordings');
    console.log('Old data deleted.');
    
    // Insert new data
    console.log('Inserting 10 new records...');
    for (const data of testData) {
      const query = `
        INSERT INTO audio_recordings (customer_id, business_name, product_name, call_date, call_time, audio_url, transcription_text, transcription_status, analysis_summary, analysis_status, ai_tags, overall_status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
      `;
      const values = [
        data.customer_id,
        data.business_name,
        data.product_name,
        data.call_date,
        data.call_time,
        data.audio_url,
        data.transcription_text,
        data.transcription_status,
        data.analysis_summary,
        data.analysis_status,
        JSON.stringify(data.ai_tags),
        data.overall_status
      ];
      await pool.query(query, values);
      console.log(`Inserted record: ${data.business_name}`);
    }
    
    // Verify
    const result = await pool.query('SELECT COUNT(*) as total FROM audio_recordings');
    console.log(`\nTotal records in audio_recordings: ${result.rows[0].total}`);
    console.log('✅ Data insertion completed successfully!');
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

insertData();

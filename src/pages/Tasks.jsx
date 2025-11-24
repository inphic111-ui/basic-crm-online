import React from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const Tasks = () => {
  // 統計數據
  const stats = [
    { label: '總任務數', value: '120', color: '#4D96FF', subLabel: '所有任務' },
    { label: '未開始', value: '67', color: '#FFB84D', subLabel: '待處理任務' },
    { label: '進行中', value: '38', color: '#4D96FF', subLabel: '正在執行中' },
    { label: '已完成', value: '15', color: '#52C41A', subLabel: '完成進度 13%' },
    { label: '逾期', value: '0', color: '#FF6B6B', subLabel: '超時未完成' }
  ];

  // 進度條數據
  const progressData = {
    completed: 13,
    remaining: 87
  };

  // 任務狀態分佈數據
  const statusDistribution = [
    { name: '未開始', value: 67, fill: '#A8A8A8' },
    { name: '進行中', value: 38, fill: '#4D96FF' },
    { name: '已完成', value: 15, fill: '#52C41A' }
  ];

  // 截止日期分析數據
  const deadlineAnalysis = [
    { name: '逾期', value: 0 },
    { name: '今天', value: 5 },
    { name: '本週', value: 12 },
    { name: '本月', value: 28 },
    { name: '未來', value: 75 }
  ];

  // 人員工作負荷數據
  const workloadData = [
    { name: '未指派', completed: 20, inProgress: 40 },
    { name: '王小明', completed: 8, inProgress: 12 },
    { name: '李美麗', completed: 5, inProgress: 10 },
    { name: '陳大衛', completed: 2, inProgress: 8 }
  ];

  // 優先級分佈數據
  const priorityData = [
    { name: '高', value: 28 },
    { name: '中', value: 21 },
    { name: '低', value: 15 },
    { name: '無', value: 14 }
  ];

  return (
    <div style={{ padding: '24px', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      {/* 頂部標題 */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: '0 0 8px 0' }}>任務戰情室</h1>
        <p style={{ fontSize: '14px', color: '#666', margin: '0' }}>實時監控所有任務進度和狀態</p>
      </div>

      {/* 統計卡片 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {stats.map((stat, idx) => (
          <div key={idx} style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '140px'
          }}>
            <div>
              <p style={{ fontSize: '12px', color: '#999', margin: '0 0 8px 0' }}>{stat.label}</p>
              <p style={{ fontSize: '32px', fontWeight: 'bold', color: stat.color, margin: '0 0 10px 0' }}>
                {stat.value}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontSize: '12px', color: '#999', margin: '0' }}>{stat.subLabel}</p>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: `${stat.color}20`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <span style={{ fontSize: '20px', color: stat.color }}>●</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 進度條 */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        marginBottom: '24px'
      }}>
        <h3 style={{ fontSize: '14px', fontWeight: 'bold', margin: '0 0 16px 0' }}>本月完成度</h3>
        <p style={{ fontSize: '12px', color: '#999', margin: '0 0 12px 0' }}>本月已完成 0 個任務</p>
        <div style={{
          width: '100%',
          height: '8px',
          backgroundColor: '#f0f0f0',
          borderRadius: '4px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${progressData.completed}%`,
            height: '100%',
            backgroundColor: '#52C41A',
            borderRadius: '4px'
          }} />
        </div>
        <p style={{ fontSize: '12px', color: '#999', margin: '8px 0 0 0' }}>{progressData.completed}% 完成</p>
      </div>

      {/* 圖表區域 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {/* 任務狀態分佈 */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ fontSize: '14px', fontWeight: 'bold', margin: '0 0 16px 0' }}>任務狀態分佈</h3>
          <p style={{ fontSize: '12px', color: '#999', margin: '0 0 16px 0' }}>各狀態任務數量</p>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name} ${value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {statusDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* 截止日期分析 */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ fontSize: '14px', fontWeight: 'bold', margin: '0 0 16px 0' }}>截止日期分析</h3>
          <p style={{ fontSize: '12px', color: '#999', margin: '0 0 16px 0' }}>按截止日期分類</p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={deadlineAnalysis}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#4D96FF" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 第二行圖表 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '16px'
      }}>
        {/* 人員工作負荷 */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ fontSize: '14px', fontWeight: 'bold', margin: '0 0 16px 0' }}>人員工作負荷</h3>
          <p style={{ fontSize: '12px', color: '#999', margin: '0 0 16px 0' }}>各人員的任務分佈</p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={workloadData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="completed" fill="#52C41A" name="已完成" />
              <Bar dataKey="inProgress" fill="#4D96FF" name="進行中" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 優先級分佈 */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ fontSize: '14px', fontWeight: 'bold', margin: '0 0 16px 0' }}>優先級分佈</h3>
          <p style={{ fontSize: '12px', color: '#999', margin: '0 0 16px 0' }}>各優先級任務數量</p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={priorityData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#FFB84D" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Tasks;

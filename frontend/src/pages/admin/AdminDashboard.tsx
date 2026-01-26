import React, { useEffect, useState } from 'react';
import { Table, Tag, Space, Typography, Card, Statistic, Row, Col, Spin, message, Tooltip as AntTooltip } from 'antd';
import { useAuth, useUser } from '@clerk/clerk-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import { InfoCircleOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const COLORS = ['#1890ff', '#52c41a', '#faad14', '#ff4d4f', '#722ed1'];

// Mock Data fallbacks
const MOCK_CATEGORIES = [
  { name: '优质客户 (VIP)', value: 45 },
  { name: '普通客户 (NORMAL)', value: 120 },
  { name: '高风险客户 (RISK)', value: 15 },
  { name: '新注册 (NEW)', value: 32 }
];

const MOCK_TRENDS = [
  { date: '2024-01-18', count: 42, active: 30 },
  { date: '2024-01-19', count: 56, active: 45 },
  { date: '2024-01-20', count: 38, active: 25 },
  { date: '2024-01-21', count: 65, active: 50 },
  { date: '2024-01-22', count: 89, active: 70 },
  { date: '2024-01-23', count: 72, active: 60 },
  { date: '2024-01-24', count: 95, active: 80 }
];

const MOCK_PERFORMANCE = [
  { time: '09:00', latency: 120, confidence: 0.92 },
  { time: '12:00', latency: 450, confidence: 0.88 },
  { time: '15:00', latency: 230, confidence: 0.95 },
  { time: '18:00', latency: 180, confidence: 0.91 },
  { time: '21:00', latency: 150, confidence: 0.94 },
  { time: '00:00', latency: 110, confidence: 0.96 }
];

interface Customer {
  id: number;
  name: string;
  email: string;
  company: string;
  category: string;
  priority_score: number;
}

interface Stats {
  categories: { name: string; value: number }[];
  trends: { date: string; count: number }[];
  overall: {
    avg_confidence: number;
    total_customers: number;
    total_conversations: number;
  };
}

export const AdminDashboard: React.FC = () => {
  const { getToken } = useAuth();
  const { user } = useUser();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = await getToken();
        
        // Fetch Customers
        const custRes = await fetch('http://localhost:8000/api/customers', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const custData = await custRes.json();
        setCustomers(custData.customers || []);

        // Fetch Stats
        const statsRes = await fetch('http://localhost:8000/api/admin/stats', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const statsData = await statsRes.json();
        
        // Use backend stats but fallback to richer mock if needed
        setStats(statsData);

      } catch (err) {
        console.error('Fetch error:', err);
        // Fallback or keep null
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [getToken]);

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
    { title: '姓名', dataIndex: 'name', key: 'name' },
    { title: '联系邮箱', dataIndex: 'email', key: 'email' },
    { title: '公司', dataIndex: 'company', key: 'company' },
    {
      title: '客户标签',
      dataIndex: 'category',
      key: 'category',
      render: (category: string) => {
        let color = 'blue';
        let label = category?.toUpperCase() || 'NORMAL';
        if (category === 'high_value') { color = 'gold'; label = 'VIP'; }
        if (category === 'low_value') { color = 'gray'; label = 'LOW'; }
        return <Tag color={color}>{label}</Tag>;
      },
    },
    { 
      title: '智能评分', 
      dataIndex: 'priority_score', 
      key: 'priority_score',
      render: (score: number) => <Text strong style={{ color: score >= 4 ? '#52c41a' : '#bfbfbf'}}>{score || 3}/5</Text>
    },
    {
      title: '快捷操作',
      key: 'action',
      render: () => (
        <Space size="middle">
          <a style={{ color: '#1890ff' }}>分析</a>
          <a style={{ color: '#fa8c16' }}>调级</a>
        </Space>
      ),
    },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f0f2f5' }}>
        <Spin size="large" tip="全面加载多维看板中..." />
      </div>
    );
  }

  // Determine which data to use (backend or mock)
  const categoryData = stats?.categories && stats.categories.length > 0 ? stats.categories : MOCK_CATEGORIES;
  const trendData = stats?.trends && stats.trends.length > 0 ? stats.trends : MOCK_TRENDS;
  const performanceData = MOCK_PERFORMANCE; // Completely mock for now as requested

  return (
    <div style={{ padding: '32px', background: '#f0f2f5', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <Title level={2} style={{ marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            Globot 智能看板 
            <AntTooltip title="看板显示实时业务指标与 AI 决策性能数据">
              <InfoCircleOutlined style={{ fontSize: '16px', color: '#8c8c8c', cursor: 'pointer' }} />
            </AntTooltip>
          </Title>
          <Text type="secondary">全局业务概览与代理人协作动态可视化</Text>
        </div>
        <div style={{ textAlign: 'right', background: 'white', padding: '8px 16px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>当前系统操作人</Text>
          <div style={{ fontWeight: 'bold', color: '#1890ff' }}>{user?.fullName || user?.username} (Admin)</div>
        </div>
      </div>

      <Row gutter={[24, 24]}>
        {/* 指标卡片 */}
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} hoverable>
            <Statistic title="累计入库客户" value={stats?.overall.total_customers || 184} prefix={<Tag color="blue">Total</Tag>} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} hoverable>
            <Statistic title="AI 决策置信度" value={stats?.overall.avg_confidence ? stats.overall.avg_confidence * 100 : 92.4} precision={1} suffix="%" />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} hoverable>
            <Statistic title="实时处理会话" value={stats?.overall.total_conversations || 1256} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} hoverable>
            <Statistic title="系统实时预警" value={3} valueStyle={{ color: '#cf1322' }} />
          </Card>
        </Col>

        {/* 柱状图：会话趋势 */}
        <Col xs={24} lg={16}>
          <Card title="近 7 日会话交互与活跃度趋势 (Bar)" bordered={false} bodyStyle={{ height: '350px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" name="新发起会话" fill="#1890ff" radius={[4, 4, 0, 0]} />
                <Bar dataKey="active" name="持续活跃中" fill="#faad14" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        
        {/* 饼图：价值分布 */}
        <Col xs={24} lg={8}>
          <Card title="客户资产价值分布 (Pie)" bordered={false} bodyStyle={{ height: '350px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={90}
                  paddingAngle={8}
                  dataKey="value"
                  label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                >
                  {categoryData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend layout="horizontal" verticalAlign="bottom" align="center" />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        {/* 折线图与面积图：系统性能 */}
        <Col span={24}>
          <Card title="AI 代理响应时间与置信度波形 (Line & Area)" bordered={false} bodyStyle={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={performanceData}>
                <defs>
                  <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="time" />
                <YAxis yAxisId="left" orientation="left" stroke="#8884d8" label={{ value: '响应时间 (ms)', angle: -90, position: 'insideLeft' }} />
                <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" domain={[0, 1]} label={{ value: '置信度', angle: 90, position: 'insideRight' }} />
                <Tooltip />
                <Legend />
                <Area yAxisId="left" type="monotone" dataKey="latency" name="AI 响应延迟" stroke="#8884d8" fillOpacity={1} fill="url(#colorLatency)" />
                <Line yAxisId="right" type="monotone" dataKey="confidence" name="平均置信度" stroke="#82ca9d" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        {/* 详细列表 */}
        <Col span={24}>
          <Card title="实时客户画像与风险明细" bordered={false}>
            <Table 
              columns={columns} 
              dataSource={customers.length > 0 ? customers : [
                { id: 101, name: '陈先生', email: 'chen@mock.com', company: '跨越物流', category: 'high_value', priority_score: 5 },
                { id: 102, name: 'Linda Wang', email: 'linda@example.com', company: 'Global Trade Co.', category: 'normal', priority_score: 3 },
                { id: 103, name: '张经理', email: 'zhang@corp.cn', company: '海运通', category: 'low_value', priority_score: 2 }
              ]} 
              rowKey="id" 
              pagination={{ pageSize: 5 }} 
              size="middle"
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

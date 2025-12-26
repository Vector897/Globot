import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Progress } from 'antd';
import {
  TeamOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  RiseOutlined
} from '@ant-design/icons';
import { chatAPI } from '../../services/api';

const HandoffStats = () => {
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    processing: 0,
    completed: 0,
    avgResponseTime: 0
  });

  useEffect(() => {
    fetchStats();
    // 每30秒刷新一次
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const response = await chatAPI.getHandoffs();
      const handoffs = response.data.handoffs;
      
      const pending = handoffs.filter(h => h.status === 'pending').length;
      const processing = handoffs.filter(h => h.status === 'processing').length;
      const completed = handoffs.filter(h => h.status === 'completed').length;
      
      setStats({
        total: handoffs.length,
        pending,
        processing,
        completed,
        avgResponseTime: calculateAvgResponseTime(handoffs)
      });
    } catch (error) {
      console.error('获取统计数据失败:', error);
    }
  };

  const calculateAvgResponseTime = (handoffs) => {
    const completedHandoffs = handoffs.filter(h => h.status === 'completed' && h.updated_at && h.created_at);
    if (completedHandoffs.length === 0) return 0;
    
    const totalTime = completedHandoffs.reduce((sum, h) => {
      const created = new Date(h.created_at);
      const updated = new Date(h.updated_at);
      return sum + (updated - created);
    }, 0);
    
    return Math.round(totalTime / completedHandoffs.length / 1000 / 60); // 转换为分钟
  };

  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  return (
    <div style={{ marginBottom: 24 }}>
      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总转人工数"
              value={stats.total}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="待处理"
              value={stats.pending}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="处理中"
              value={stats.processing}
              prefix={<RiseOutlined />}
              valueStyle={{ color: '#13c2c2' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已完成"
              value={stats.completed}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>
      
      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={12}>
          <Card title="平均响应时间">
            <Statistic
              value={stats.avgResponseTime}
              suffix="分钟"
              valueStyle={{ fontSize: 32 }}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="完成率">
            <Progress
              type="dashboard"
              percent={completionRate}
              strokeColor={{
                '0%': '#108ee9',
                '100%': '#87d068',
              }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default HandoffStats;

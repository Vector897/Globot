import React, { useState, useEffect } from 'react';
import { Table, Tag, Button, Space, message as antMessage, Badge, Card, Modal, Input } from 'antd';
import { EyeOutlined, ReloadOutlined, ClockCircleOutlined, CheckCircleOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { chatAPI } from '../../services/api';
import HandoffStats from './HandoffStats';
import styles from './HandoffQueue.module.css';

const HandoffQueue = () => {
  const [handoffs, setHandoffs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('pending'); // pending/processing/all
  const [takeoverModalVisible, setTakeoverModalVisible] = useState(false);
  const [selectedHandoffId, setSelectedHandoffId] = useState(null);
  const [agentName, setAgentName] = useState('');
  const navigate = useNavigate();

  const fetchHandoffs = async () => {
    try {
      setLoading(true);
      const params = filter === 'all' ? {} : { status: filter };
      const response = await chatAPI.getHandoffs(params);
      setHandoffs(response.data.handoffs || []);
    } catch (error) {
      console.error('获取转人工列表失败:', error);
      antMessage.error('获取转人工列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHandoffs();
    // 自动刷新（每30秒）
    const interval = setInterval(fetchHandoffs, 30000);
    return () => clearInterval(interval);
  }, [filter]);

  const showTakeoverModal = (handoffId) => {
    setSelectedHandoffId(handoffId);
    setAgentName('销售-李四');
    setTakeoverModalVisible(true);
  };

  const handleTakeOver = async () => {
    if (!agentName.trim()) {
      antMessage.warning('请输入您的姓名');
      return;
    }

    try {
      setTakeoverModalVisible(false);
      await chatAPI.updateHandoffStatus(selectedHandoffId, {
        status: 'processing',
        agent_name: agentName
      });
      
      antMessage.success(`${agentName} 已接手对话`);
      await fetchHandoffs();
    } catch (error) {
      console.error('接手失败:', error);
      antMessage.error('接手失败');
    }
  };

  const getPriorityTag = (priority) => {
    const config = {
      5: { color: 'red', text: '紧急' },
      4: { color: 'orange', text: '重要' },
      3: { color: 'blue', text: '一般' },
      2: { color: 'default', text: '较低' },
      1: { color: 'default', text: '低' }
    };
    const { color, text } = config[priority] || config[3];
    return <Tag color={color}>{text}</Tag>;
  };

  const getCategoryTag = (category) => {
    const config = {
      high_value: { color: 'red', text: '高价值' },
      normal: { color: 'green', text: '普通' },
      low_value: { color: 'default', text: '低价值' }
    };
    const { color, text } = config[category] || config.normal;
    return <Tag color={color}>{text}</Tag>;
  };

  const getStatusTag = (status) => {
    const config = {
      pending: { color: 'orange', text: '待处理', icon: <ClockCircleOutlined /> },
      processing: { color: 'blue', text: '处理中', icon: <ClockCircleOutlined /> },
      completed: { color: 'green', text: '已完成', icon: <CheckCircleOutlined /> }
    };
    const { color, text, icon } = config[status] || config.pending;
    return <Tag color={color} icon={icon}>{text}</Tag>;
  };

  const getReasonText = (reason) => {
    const reasons = {
      customer_request: '客户要求',
      low_confidence: 'AI置信度低',
      manual_request: '手动转接',
      complex_query: '复杂咨询'
    };
    return reasons[reason] || reason;
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60
    },
    {
      title: '客户信息',
      key: 'customer',
      render: (_, record) => (
        <div>
          <div><strong>{record.customer.name}</strong></div>
          <div style={{ fontSize: 12, color: '#8c8c8c' }}>{record.customer.email}</div>
        </div>
      )
    },
    {
      title: '优先级',
      key: 'priority',
      width: 80,
      render: (_, record) => getPriorityTag(record.customer.priority_score),
      sorter: (a, b) => b.customer.priority_score - a.customer.priority_score,
      defaultSortOrder: 'ascend'
    },
    {
      title: '客户分类',
      key: 'category',
      width: 100,
      render: (_, record) => getCategoryTag(record.customer.category)
    },
    {
      title: '转接原因',
      dataIndex: 'trigger_reason',
      key: 'trigger_reason',
      width: 120,
      render: (reason) => getReasonText(reason)
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => getStatusTag(status)
    },
    {
      title: '接手人',
      dataIndex: 'agent_name',
      key: 'agent_name',
      width: 100,
      render: (name) => name || '-'
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      render: (text) => new Date(text).toLocaleString('zh-CN'),
      sorter: (a, b) => new Date(a.created_at) - new Date(b.created_at)
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_, record) => (
        <Space size="small">
          {record.status === 'pending' && (
            <Button
              type="primary"
              size="small"
              icon={<PlayCircleOutlined />}
              onClick={() => showTakeoverModal(record.id)}
            >
              接手
            </Button>
          )}
          <Button
            type="default"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/admin/handoff/${record.id}`)}
          >
            查看
          </Button>
        </Space>
      )
    }
  ];

  const pendingCount = handoffs.filter(h => h.status === 'pending').length;
  const processingCount = handoffs.filter(h => h.status === 'processing').length;

  return (
    <div className={styles.handoffQueue} style={{ padding: 24 }}>
      {/* 统计面板 */}
      <HandoffStats />
      
      <Card>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space size="large">
            <div>
              <strong style={{ fontSize: 18 }}>转人工队列</strong>
              <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>
                待处理: {pendingCount} | 处理中: {processingCount}
              </div>
            </div>
            <Space>
              <Button
                type={filter === 'pending' ? 'primary' : 'default'}
                onClick={() => setFilter('pending')}
              >
                <Badge count={pendingCount} offset={[10, 0]}>
                  待处理
                </Badge>
              </Button>
              <Button
                type={filter === 'processing' ? 'primary' : 'default'}
                onClick={() => setFilter('processing')}
              >
                处理中
              </Button>
              <Button
                type={filter === 'all' ? 'primary' : 'default'}
                onClick={() => setFilter('all')}
              >
                全部
              </Button>
            </Space>
          </Space>

          <Button icon={<ReloadOutlined />} onClick={fetchHandoffs}>
            刷新
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={handoffs}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条记录`
          }}
        />
      </Card>

      {/* 接手对话弹窗 */}
      <Modal
        title="接手对话"
        open={takeoverModalVisible}
        onOk={handleTakeOver}
        onCancel={() => setTakeoverModalVisible(false)}
        okText="确认接手"
        cancelText="取消"
      >
        <Input
          placeholder="请输入您的姓名"
          value={agentName}
          onChange={(e) => setAgentName(e.target.value)}
          onPressEnter={handleTakeOver}
          autoFocus
        />
      </Modal>
    </div>
  );
};

export default HandoffQueue;

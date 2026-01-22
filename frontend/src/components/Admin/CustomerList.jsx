import React, { useState, useEffect } from 'react';
import { Table, Tag, Button, Input, Space, message as antMessage } from 'antd';
import { EyeOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { chatAPI } from '../../services/api';
import { formatUTCDateTimeCN } from '../../utils/timeUtils';

const CustomerList = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const navigate = useNavigate();

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const response = await chatAPI.getCustomers();
      // 后端返回 {total: X, customers: [...]}
      setCustomers(response.data.customers || []);
    } catch (error) {
      console.error('获取客户列表失败:', error);
      antMessage.error('获取客户列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const getCategoryTag = (category, priority) => {
    const config = {
      HIGH_VALUE: { color: 'red', text: '高价值' },
      NORMAL: { color: 'green', text: '普通' },
      LOW_VALUE: { color: 'default', text: '低价值' }
    };
    const { color, text } = config[category] || config.NORMAL;
    return <Tag color={color}>{text} ({priority})</Tag>;
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60,
      sorter: (a, b) => a.id - b.id
    },
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      filteredValue: [searchText],
      onFilter: (value, record) =>
        record.name.toLowerCase().includes(value.toLowerCase()),
      render: (text) => <strong>{text}</strong>
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email'
    },
    {
      title: '公司',
      dataIndex: 'company',
      key: 'company',
      render: (text) => text || '-'
    },
    {
      title: '客户分类',
      dataIndex: 'category',
      key: 'category',
      render: (category, record) => getCategoryTag(category, record.priority_score),
      sorter: (a, b) => b.priority_score - a.priority_score,
      defaultSortOrder: 'ascend'
    },
    {
      title: '创建时间 (UTC)',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text) => formatUTCDateTimeCN(text),
      sorter: (a, b) => new Date(a.created_at) - new Date(b.created_at)
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/admin/conversations/${record.id}`)}
          >
            查看对话
          </Button>
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Input
          placeholder="搜索客户姓名"
          prefix={<SearchOutlined />}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: 300 }}
        />
        <Button icon={<ReloadOutlined />} onClick={fetchCustomers}>
          刷新
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={customers}
        rowKey="id"
        loading={loading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 个客户`
        }}
      />
    </div>
  );
};

export default CustomerList;

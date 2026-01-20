import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Timeline, Button, Tag, Spin, Empty, message as antMessage,
  Descriptions, Input, Space, Divider, Modal
} from 'antd';
import {
  ArrowLeftOutlined, RobotOutlined, UserOutlined, SendOutlined,
  CheckCircleOutlined, PlayCircleOutlined, UserSwitchOutlined
} from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import { chatAPI } from '../../services/api';
import styles from './HandoffDetail.module.css';
import { formatUTCDateTimeCN } from '../../utils/timeUtils';

const { TextArea } = Input;

const HandoffDetail = () => {
  const { handoffId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [handoff, setHandoff] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [replyContent, setReplyContent] = useState('');
  const [agentName, setAgentName] = useState('');
  const [takeoverModalVisible, setTakeoverModalVisible] = useState(false);
  const [tempAgentName, setTempAgentName] = useState('');

  const fetchHandoffDetail = async () => {
    try {
      setLoading(true);
      // 获取转人工详情
      const handoffsRes = await chatAPI.getHandoffs();
      const handoffData = handoffsRes.data.handoffs.find(h => h.id === parseInt(handoffId));
      
      if (!handoffData) {
        antMessage.error('转人工记录不存在');
        navigate('/admin/handoffs');
        return;
      }
      
      setHandoff(handoffData);
      setCustomer(handoffData.customer);
      
      // 获取对话历史 - 修复：使用 conversation_id 而不是 customer_id
      const convRes = await chatAPI.getConversation(handoffData.conversation_id);
      // 将单个对话包装成数组，保持与原有渲染逻辑兼容
      setConversations(convRes.data ? [convRes.data] : []);
    } catch (error) {
      console.error('获取详情失败:', error);
      antMessage.error('获取详情失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHandoffDetail();
  }, [handoffId]);

  const handleSendReply = async () => {
    if (!replyContent.trim()) {
      antMessage.warning('请输入回复内容');
      return;
    }

    try {
      setSending(true);
      await chatAPI.sendHumanMessage({
        conversation_id: handoff.conversation_id,
        content: replyContent,
        agent_name: agentName || '人工客服'
      });
      
      antMessage.success('回复发送成功');
      setReplyContent('');
      
      // 刷新对话
      await fetchHandoffDetail();
    } catch (error) {
      console.error('发送失败:', error);
      antMessage.error('发送失败');
    } finally {
      setSending(false);
    }
  };

  const showTakeoverModal = () => {
    setTempAgentName(agentName || '销售-李四');
    setTakeoverModalVisible(true);
  };

  const handleTakeOver = async () => {
    if (!tempAgentName.trim()) {
      antMessage.warning('请输入您的姓名');
      return;
    }

    try {
      setTakeoverModalVisible(false);
      await chatAPI.updateHandoffStatus(handoffId, {
        status: 'processing',
        agent_name: tempAgentName
      });
      
      setAgentName(tempAgentName);
      antMessage.success(`${tempAgentName} 已接手对话`);
      
      // 发送浏览器通知
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('转人工已接手', {
          body: `${tempAgentName} 已接手对话`,
          icon: '/logo.png'
        });
      }
      
      await fetchHandoffDetail();
    } catch (error) {
      console.error('接手失败:', error);
      antMessage.error('接手失败');
    }
  };

  // 请求通知权限
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const handleComplete = async () => {
    try {
      await chatAPI.updateHandoffStatus(handoffId, {
        status: 'completed'
      });
      
      antMessage.success('已完成服务');
      navigate('/admin/handoffs');
    } catch (error) {
      console.error('完成失败:', error);
      antMessage.error('完成失败');
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!handoff) {
    return <Empty description="转人工记录不存在" />;
  }

  const getSenderIcon = (sender) => {
    if (sender === 'customer') return <UserOutlined style={{ fontSize: 16 }} />;
    if (sender === 'human') return <UserSwitchOutlined style={{ fontSize: 16 }} />;
    return <RobotOutlined style={{ fontSize: 16 }} />;
  };

  const getSenderColor = (sender) => {
    if (sender === 'customer') return 'blue';
    if (sender === 'human') return 'purple';
    return 'green';
  };

  const getSenderText = (sender) => {
    if (sender === 'customer') return '客户';
    if (sender === 'human') return '人工';
    return 'AI';
  };

  return (
    <div style={{ padding: 24 }}>
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/admin/handoffs')}
        style={{ marginBottom: 16 }}
      >
        返回转人工队列
      </Button>

      {/* 客户和转接信息 */}
      <Card title="转接信息" style={{ marginBottom: 24 }}>
        <Descriptions>
          <Descriptions.Item label="客户姓名">
            <strong>{customer.name}</strong>
          </Descriptions.Item>
          <Descriptions.Item label="客户邮箱">{customer.email}</Descriptions.Item>
          <Descriptions.Item label="优先级">
            <Tag color={customer.priority_score >= 4 ? 'red' : 'blue'}>
              {customer.priority_score} 分
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="转接原因">{handoff.trigger_reason}</Descriptions.Item>
          <Descriptions.Item label="状态">
            <Tag color={handoff.status === 'completed' ? 'green' : 'orange'}>
              {handoff.status}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="接手人">{handoff.agent_name || '-'}</Descriptions.Item>
        </Descriptions>
      </Card>

      {/* 对话历史 */}
      <Card
        title="对话历史"
        extra={
          <Space>
            {handoff.status === 'pending' && (
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                onClick={showTakeoverModal}
              >
                接手对话
              </Button>
            )}
            {handoff.status === 'processing' && (
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={handleComplete}
              >
                完成服务
              </Button>
            )}
          </Space>
        }
      >
        {conversations.length === 0 ? (
          <Empty description="暂无对话记录" />
        ) : (
          conversations.map((conversation) => (
            <div key={conversation.id} style={{ marginBottom: 32 }}>
              <Timeline>
                {conversation.messages && conversation.messages.map((message) => (
                  <Timeline.Item
                    key={message.id}
                    dot={getSenderIcon(message.sender.toLowerCase())}
                    color={getSenderColor(message.sender.toLowerCase())}
                  >
                    <div className={styles.messageItem}>
                      <div className={styles.messageHeader}>
                        <Tag color={getSenderColor(message.sender.toLowerCase())}>
                          {getSenderText(message.sender.toLowerCase())}
                        </Tag>
                        <span className={styles.messageTime}>
                          {formatUTCDateTimeCN(message.created_at)}
                        </span>
                        {message.ai_confidence !== undefined && (
                          <Tag>置信度: {(message.ai_confidence * 100).toFixed(0)}%</Tag>
                        )}
                      </div>
                      <div className={styles.messageContent}>
                        {message.sender.toLowerCase() !== 'customer' ? (
                          <ReactMarkdown>{message.content}</ReactMarkdown>
                        ) : (
                          <p>{message.content}</p>
                        )}
                      </div>
                    </div>
                  </Timeline.Item>
                ))}
              </Timeline>
            </div>
          ))
        )}
      </Card>

      {/* 人工回复面板 */}
      {handoff.status !== 'completed' && (
        <>
          <Divider />
          <Card title="人工回复" size="small">
            <Space direction="vertical" style={{ width: '100%' }}>
              <TextArea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="输入您的回复..."
                rows={4}
                disabled={sending}
              />
              <div style={{ textAlign: 'right' }}>
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  onClick={handleSendReply}
                  loading={sending}
                  disabled={!replyContent.trim()}
                >
                  发送回复
                </Button>
              </div>
            </Space>
          </Card>
        </>
      )}

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
          value={tempAgentName}
          onChange={(e) => setTempAgentName(e.target.value)}
          onPressEnter={handleTakeOver}
          autoFocus
        />
      </Modal>
    </div>
  );
};

export default HandoffDetail;

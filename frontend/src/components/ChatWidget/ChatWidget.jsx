import React, { useState, useEffect, useRef } from 'react';
import { Button, Input, Card, Avatar, Badge, Spin, message as antMessage } from 'antd';
import { MessageOutlined, SendOutlined, CloseOutlined, RobotOutlined, UserOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import { chatAPI } from '../../services/api';
import messageService from '../../services/messageService';
import styles from './ChatWidget.module.css';

const { TextArea } = Input;

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [customerId, setCustomerId] = useState(null);
  const [customerName, setCustomerName] = useState('');
  const [showNameInput, setShowNameInput] = useState(true);
  const messagesEndRef = useRef(null);
  const subscriptionRef = useRef(null);

  // 滚动到最新消息
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 订阅消息更新
  useEffect(() => {
    if (customerId && isOpen) {
      subscriptionRef.current = messageService.subscribe(customerId, (conversations) => {
        if (conversations && conversations.length > 0) {
          const latestConversation = conversations[0];
          if (latestConversation.messages) {
            setMessages(latestConversation.messages);
          }
        }
      });

      return () => {
        if (subscriptionRef.current) {
          messageService.unsubscribe(subscriptionRef.current);
        }
      };
    }
  }, [customerId, isOpen]);

  // 创建客户
  const handleStartChat = async () => {
    if (!customerName.trim()) {
      antMessage.warning('请输入您的姓名');
      return;
    }

    try {
      setLoading(true);
      const response = await chatAPI.createCustomer({
        name: customerName,
        email: `${customerName.toLowerCase()}@temp.com` // 临时邮箱
      });
      setCustomerId(response.data.id);
      setShowNameInput(false);
      antMessage.success('欢迎！开始咨询吧');
    } catch (error) {
      console.error('创建客户失败:', error);
      antMessage.error('连接失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 发送消息
  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMessage = {
      id: Date.now(),
      sender: 'CUSTOMER',
      content: inputValue,
      created_at: new Date().toISOString()
    };

    // 立即显示用户消息
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setLoading(true);

    try {
      const response = await chatAPI.sendMessage({
        customer_id: customerId,
        message: inputValue,
        language: 'zh-cn'
      });

      // 添加AI回复
      const aiMessage = {
        id: Date.now() + 1,
        sender: 'AI',
        content: response.data.answer,
        ai_confidence: response.data.confidence,
        created_at: new Date().toISOString()
      };

      setMessages(prev => [...prev, aiMessage]);

      // 如果需要转人工
      if (response.data.should_handoff) {
        antMessage.info('您的问题已转接人工客服，请稍候');
      }
    } catch (error) {
      console.error('发送消息失败:', error);
      antMessage.error('发送失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 按Enter发送
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={styles.chatWidget}>
      {/* 浮动按钮 */}
      {!isOpen && (
        <Badge count={messages.length} offset={[-10, 10]}>
          <Button
            type="primary"
            shape="circle"
            size="large"
            icon={<MessageOutlined />}
            onClick={() => setIsOpen(true)}
            className={styles.chatButton}
          />
        </Badge>
      )}

      {/* 聊天窗口 */}
      {isOpen && (
        <Card
          className={styles.chatWindow}
          title={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <RobotOutlined style={{ marginRight: 8 }} />
                DJI 销售助手
              </div>
              <Button
                type="text"
                icon={<CloseOutlined />}
                onClick={() => setIsOpen(false)}
              />
            </div>
          }
        >
          {/* 欢迎界面 */}
          {showNameInput ? (
            <div className={styles.welcomeScreen}>
              <Avatar size={64} icon={<RobotOutlined />} style={{ marginBottom: 16 }} />
              <h3>欢迎咨询 DJI 工业无人机</h3>
              <p style={{ color: '#8c8c8c', marginBottom: 24 }}>
                请输入您的姓名开始对话
              </p>
              <Input
                placeholder="您的姓名"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                onPressEnter={handleStartChat}
                style={{ marginBottom: 16 }}
              />
              <Button
                type="primary"
                block
                onClick={handleStartChat}
                loading={loading}
              >
                开始咨询
              </Button>
            </div>
          ) : (
            <>
              {/* 消息列表 */}
              <div className={styles.messagesContainer}>
                {messages.length === 0 && (
                  <div style={{ textAlign: 'center', color: '#8c8c8c', padding: 32 }}>
                    <RobotOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                    <p>您好！我是DJI销售助手</p>
                    <p>有什么可以帮您？</p>
                  </div>
                )}
                
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`${styles.message} ${msg.sender === 'CUSTOMER' ? styles.userMessage : styles.aiMessage}`}
                  >
                    <Avatar
                      size="small"
                      icon={msg.sender === 'CUSTOMER' ? <UserOutlined /> : <RobotOutlined />}
                      style={{
                        backgroundColor: msg.sender === 'CUSTOMER' ? '#1890ff' : '#52c41a'
                      }}
                    />
                    <div className={styles.messageContent}>
                      {msg.sender === 'AI' ? (
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      ) : (
                        <div>{msg.content}</div>
                      )}
                      {msg.ai_confidence !== undefined && (
                        <div className={styles.confidenceBadge}>
                          置信度: {(msg.ai_confidence * 100).toFixed(0)}%
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {loading && (
                  <div className={`${styles.message} ${styles.aiMessage}`}>
                    <Avatar size="small" icon={<RobotOutlined />} style={{ backgroundColor: '#52c41a' }} />
                    <div className={styles.messageContent}>
                      <Spin size="small" /> AI正在思考...
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

              {/* 输入框 */}
              <div className={styles.inputContainer}>
                <TextArea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="输入消息... (Enter发送，Shift+Enter换行)"
                  autoSize={{ minRows: 1, maxRows: 4 }}
                  disabled={loading}
                />
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  onClick={handleSend}
                  loading={loading}
                  disabled={!inputValue.trim()}
                >
                  发送
                </Button>
              </div>
            </>
          )}
        </Card>
      )}
    </div>
  );
};

export default ChatWidget;

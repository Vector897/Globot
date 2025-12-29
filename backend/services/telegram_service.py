"""
Telegram Bot 服务
用于处理 Telegram 消息的收发
"""
import requests
import logging
from typing import Optional, Dict, Any
from config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)


class TelegramService:
    """Telegram Bot API 封装"""
    
    def __init__(self):
        self.token = settings.telegram_bot_token
        self.base_url = f"https://api.telegram.org/bot{self.token}"
        self.webhook_url = settings.telegram_webhook_url
        
        if not self.token:
            logger.warning("Telegram bot token 未配置")
        else:
            logger.info(f"Telegram Bot 服务已初始化")
    
    def send_message(
        self, 
        chat_id: int, 
        text: str,
        parse_mode: str = "Markdown",
        reply_to_message_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        发送消息到 Telegram
        
        Args:
            chat_id: Telegram 聊天 ID
            text: 消息文本
            parse_mode: 解析模式 (Markdown/HTML)
            reply_to_message_id: 回复的消息 ID
            
        Returns:
            API 响应
        """
        url = f"{self.base_url}/sendMessage"
        
        payload = {
            "chat_id": chat_id,
            "text": text,
            "parse_mode": parse_mode
        }
        
        if reply_to_message_id:
            payload["reply_to_message_id"] = reply_to_message_id
        
        try:
            response = requests.post(url, json=payload, timeout=10)
            response.raise_for_status()
            
            result = response.json()
            if result.get("ok"):
                logger.info(f"消息已发送到 chat_id={chat_id}")
                return result
            else:
                logger.error(f"发送消息失败: {result}")
                return result
                
        except requests.exceptions.RequestException as e:
            logger.error(f"发送消息异常: {e}")
            raise
    
    def send_typing_action(self, chat_id: int):
        """
        发送 "正在输入" 状态
        """
        url = f"{self.base_url}/sendChatAction"
        
        payload = {
            "chat_id": chat_id,
            "action": "typing"
        }
        
        try:
            response = requests.post(url, json=payload, timeout=5)
            response.raise_for_status()
        except Exception as e:
            logger.warning(f"发送输入状态失败: {e}")
    
    def set_webhook(self, url: Optional[str] = None) -> Dict[str, Any]:
        """
        设置 Webhook URL
        
        Args:
            url: Webhook URL（如果为 None，使用配置中的 URL）
            
        Returns:
            API 响应
        """
        webhook_url = url or self.webhook_url
        
        if not webhook_url:
            raise ValueError("Webhook URL 未配置")
        
        api_url = f"{self.base_url}/setWebhook"
        
        payload = {
            "url": webhook_url,
            "allowed_updates": ["message", "edited_message"]
        }
        
        try:
            response = requests.post(api_url, json=payload, timeout=10)
            response.raise_for_status()
            
            result = response.json()
            
            if result.get("ok"):
                logger.info(f"Webhook 设置成功: {webhook_url}")
            else:
                logger.error(f"Webhook 设置失败: {result}")
            
            return result
            
        except requests.exceptions.RequestException as e:
            logger.error(f"设置 Webhook 异常: {e}")
            raise
    
    def delete_webhook(self) -> Dict[str, Any]:
        """
        删除 Webhook
        """
        url = f"{self.base_url}/deleteWebhook"
        
        try:
            response = requests.post(url, timeout=10)
            response.raise_for_status()
            
            result = response.json()
            logger.info(f"Webhook 已删除: {result}")
            return result
            
        except requests.exceptions.RequestException as e:
            logger.error(f"删除 Webhook 异常: {e}")
            raise
    
    def get_webhook_info(self) -> Dict[str, Any]:
        """
        获取 Webhook 信息
        """
        url = f"{self.base_url}/getWebhookInfo"
        
        try:
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            
            result = response.json()
            
            if result.get("ok"):
                info = result.get("result", {})
                logger.info(f"Webhook 信息: URL={info.get('url')}, pending={info.get('pending_update_count')}")
            
            return result
            
        except requests.exceptions.RequestException as e:
            logger.error(f"获取 Webhook 信息异常: {e}")
            raise
    
    def get_me(self) -> Dict[str, Any]:
        """
        获取 Bot 信息
        """
        url = f"{self.base_url}/getMe"
        
        try:
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            
            result = response.json()
            
            if result.get("ok"):
                bot_info = result.get("result", {})
                logger.info(f"Bot 信息: @{bot_info.get('username')} (ID: {bot_info.get('id')})")
            
            return result
            
        except requests.exceptions.RequestException as e:
            logger.error(f"获取 Bot 信息异常: {e}")
            raise
    
    @staticmethod
    def extract_user_info(message: Dict[str, Any]) -> Dict[str, str]:
        """
        从 Telegram 消息中提取用户信息
        
        Args:
            message: Telegram 消息对象
            
        Returns:
            用户信息字典
        """
        from_user = message.get("from", {})
        chat = message.get("chat", {})
        
        user_info = {
            "telegram_id": str(from_user.get("id", "")),
            "username": from_user.get("username", ""),
            "first_name": from_user.get("first_name", ""),
            "last_name": from_user.get("last_name", ""),
            "language_code": from_user.get("language_code", "en"),
            "chat_id": str(chat.get("id", ""))
        }
        
        # 构建完整名称
        full_name = user_info["first_name"]
        if user_info["last_name"]:
            full_name += f" {user_info['last_name']}"
        
        user_info["full_name"] = full_name
        
        return user_info
    
    @staticmethod
    def format_message_for_telegram(text: str, confidence: float = None) -> str:
        """
        格式化消息以适配 Telegram Markdown
        
        Args:
            text: 原始消息文本
            confidence: AI 置信度（可选）
            
        Returns:
            格式化后的文本
        """
        # 转义特殊字符（Telegram Markdown）
        # text = text.replace("_", "\\_").replace("*", "\\*").replace("[", "\\[").replace("]", "\\]")
        
        # 如果置信度较低，添加提示
        if confidence is not None and confidence < 0.7:
            text += "\n\n_💡 提示：如需更详细的咨询，可以联系我们的专业销售团队。_"
        
        return text


# 全局单例
_telegram_service = None

def get_telegram_service() -> TelegramService:
    """获取 Telegram 服务实例（单例）"""
    global _telegram_service
    if _telegram_service is None:
        _telegram_service = TelegramService()
    return _telegram_service


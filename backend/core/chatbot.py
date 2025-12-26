"""
智能对话模块 (Module 3)
基于增强RAG的智能客服机器人
支持元数据过滤、混合检索、重排序
"""
from services.llm_service import get_llm_service
from services.knowledge_base import get_knowledge_base
from services.enhanced_knowledge_base import get_enhanced_knowledge_base
from typing import Dict, List
import logging
import json

logger = logging.getLogger(__name__)

class DJIChatbot:
    """大疆产品智能客服机器人（增强版）"""
    
    def __init__(self, use_enhanced_rag: bool = True):
        self.llm = get_llm_service()
        # 使用增强的RAG系统
        if use_enhanced_rag:
            self.kb = get_enhanced_knowledge_base()
            logger.info("使用增强RAG系统（元数据过滤+混合检索+重排序）")
        else:
            self.kb = get_knowledge_base()
            logger.info("使用基础RAG系统")
        self.conversation_memory = {}  # 简单的内存存储（生产环境应使用数据库）
        self.use_enhanced = use_enhanced_rag
    
    def chat(self, customer_id: int, message: str, language: str = 'zh-cn') -> Dict:
        """
        处理客户消息
        
        Args:
            customer_id: 客户ID
            message: 消息内容
            language: 语言
            
        Returns:
            {
                "answer": "AI回复",
                "confidence": 0.0-1.0,
                "should_handoff": bool,
                "retrieved_docs": [...],
                "product_tag": "M30/M400/Dock3"
            }
        """
        # 1. 检测产品类型
        product_tag = self._detect_product(message)
        logger.info(f"检测到产品: {product_tag}")
        
        # 2. RAG检索（使用增强功能）
        if self.use_enhanced:
            retrieved_docs = self.kb.search(
                message, 
                product_filter=product_tag,
                top_k=5,
                use_hybrid=True,  # 混合检索 (BM25 + Vector)
                use_rerank=True,  # 重排序
                similarity_threshold=0.3
            )
        else:
            retrieved_docs = self.kb.search(message, product_filter=product_tag, top_k=5)
        
        # 3. 构建上下文
        context = self._build_context(retrieved_docs)
        
        # 4. 获取历史对话
        history = self._get_conversation_history(customer_id)
        
        # 5. 生成回复（使用中等创造性）
        prompt = self._build_chat_prompt(message, context, history, language)
        answer = self.llm.generate(prompt, temperature=0.5, max_tokens=300)  # 适度减少创造性
        
        # 6. 计算置信度
        confidence = self._calculate_confidence(retrieved_docs, answer)
        
        # 7. 判断是否转人工
        should_handoff = self._should_handoff(message, confidence)
        
        # 8. 保存对话历史
        self._save_to_memory(customer_id, message, answer)
        
        return {
            "answer": answer,
            "confidence": confidence,
            "should_handoff": should_handoff,
            "retrieved_docs": [doc.page_content[:200] for doc in retrieved_docs],
            "product_tag": product_tag
        }
    
    def _detect_product(self, message: str) -> str:
        """检测消息中提到的产品"""
        message_lower = message.lower()
        
        # 产品关键词映射
        if any(kw in message_lower for kw in ['m30', 'matrice 30', 'matrice30']):
            return 'M30'
        elif any(kw in message_lower for kw in ['m400', 'matrice 400', 'matrice400']):
            return 'M400'
        elif any(kw in message_lower for kw in ['dock 3', 'dock3', 'm4d', '机场']):
            return 'Dock3'
        elif any(kw in message_lower for kw in ['rtk', 'd-rtk']):
            return 'RTK'
        else:
            return None  # 未明确指定产品
    
    def _build_context(self, docs: List) -> str:
        """构建检索上下文"""
        if not docs:
            return "未找到相关文档"
        
        context_parts = []
        for i, doc in enumerate(docs, 1):
            metadata = doc.metadata
            product = metadata.get('product_tag', '未知产品')
            doc_type = metadata.get('doc_type', '文档')
            content = doc.page_content[:500]  # 限制长度
            
            context_parts.append(f"[{product} - {doc_type}]\n{content}")
        
        return "\n\n---\n\n".join(context_parts)
    
    def _build_chat_prompt(self, message: str, context: str, history: List, language: str) -> str:
        """构建对话提示词"""
        
        # 格式化历史对话
        history_text = "\n".join([
            f"{'客户' if h['role'] == 'user' else 'AI'}: {h['content']}"
            for h in history[-3:]  # 最近3轮对话
        ]) if history else "（这是第一次对话）"
        
        prompt = f"""# 角色定义
你是大疆（DJI）无人机的专业B2B销售顾问，专注于Matrice系列工业级无人机销售。

# 核心职责
1. 基于产品手册准确回答技术问题
2. 识别客户需求并推荐合适产品
3. 在适当时机引导客户深入沟通
4. 保持专业、友好、以解决问题为导向

# 知识库检索结果
{context}

# 对话历史
{history_text}

# 客户最新问题
{message}

# 回复指南

## 回复策略
- **直接回答**: 不重复问题，直奔主题
- **引用来源**: 技术参数必须标注来源（如"根据M30用户手册"）
- **需求挖掘**: 如客户问题模糊，通过反问明确需求
- **价值传递**: 不只说参数，说明对客户的价值

## 回复格式
- 语气: 专业但不生硬，热情但不推销
- 长度: 50-100字（重要信息可适当延长）
- 语言: {'中文' if language == 'zh-cn' else 'English'}
- 结构: 先回答核心问题，再补充相关信息

## 特殊处理
- 如检索结果为空: 诚实告知并建议联系专家
- 如涉及价格/商务: 提供参考并建议转人工报价
- 如多产品对比: 先问使用场景，再推荐

现在请回复客户："""
        
        return prompt
    
    def _calculate_confidence(self, docs: List, answer: str) -> float:
        """计算置信度（简化版）"""
        if not docs:
            return 0.5  # 没有检索到文档
        elif len(docs) >= 2:
            return 0.85  # 检索到多个相关文档
        else:
            return 0.7  # 仅检索到1个文档
    
    def _should_handoff(self, message: str, confidence: float) -> bool:
        """判断是否转人工"""
        # 转人工关键词
        handoff_keywords = ['转人工', '人工客服', '联系销售', 'human', 'agent']
        if any(kw in message.lower() for kw in handoff_keywords):
            return True
        
        # 低置信度
        if confidence < 0.7:
            return True
        
        # 购买意向强烈（询问价格、合同、付款等）
        buy_keywords = ['价格', '报价', '多少钱', '合同', '付款', '购买', 'price', 'buy']
        if any(kw in message.lower() for kw in buy_keywords):
            return True
        
        return False
    
    def _get_conversation_history(self, customer_id: int) -> List[Dict]:
        """获取对话历史"""
        return self.conversation_memory.get(customer_id, [])
    
    def _save_to_memory(self, customer_id: int, user_msg: str, ai_msg: str):
        """保存对话到内存"""
        if customer_id not in self.conversation_memory:
            self.conversation_memory[customer_id] = []
        
        self.conversation_memory[customer_id].append({"role": "user", "content": user_msg})
        self.conversation_memory[customer_id].append({"role": "assistant", "content": ai_msg})
        
        # 限制历史长度（仅保留最近10轮）
        if len(self.conversation_memory[customer_id]) > 20:
            self.conversation_memory[customer_id] = self.conversation_memory[customer_id][-20:]

# 全局单例
_chatbot = None

def get_chatbot() -> DJIChatbot:
    """获取聊天机器人实例（单例）"""
    global _chatbot
    if _chatbot is None:
        _chatbot = DJIChatbot()
    return _chatbot

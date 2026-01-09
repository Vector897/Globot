from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    """系统配置"""
    
    # 数据库
    database_url: str = "postgresql://user:password@localhost:5432/dji_sales_mvp"
    
    # LLM选择: ollama 或 openai
    llm_provider: str = "ollama"

    # Ollama配置（使用本地LLM）
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "qwen2.5:latest"  # 或 llama3, mistral等

    # OpenAI配置（使用ChatGPT）
    openai_api_key: str | None = None
    openai_base_url: str | None = None  # 可自定义代理/自建兼容接口
    openai_model: str = "gpt-4o-mini"
    
    # 向量数据库
    chroma_persist_dir: str = "./data/vectordb"
    
    # 文件上传
    upload_dir: str = "./data/uploads"
    max_upload_size_mb: int = 50
    
    # ===== Telegram Bot 配置 =====
    telegram_bot_token: str = ""  # 从 @BotFather 获取的 token
    telegram_webhook_url: str = ""  # 你的服务器 webhook URL，例如：https://yourdomain.com/webhook/telegram
    
    # ===== Azure OpenAI 配置（Imagine Cup 版本）=====
    # 取消注释并填写以启用 Azure AI 服务
    # azure_openai_endpoint: str = ""
    # azure_openai_key: str = ""
    # azure_openai_api_version: str = "2024-02-01"
    # azure_openai_chat_deployment: str = "gpt-4"
    # azure_openai_embedding_deployment: str = "text-embedding-ada-002"
    
    # ===== Azure AI Search 配置 =====
    # azure_search_endpoint: str = ""
    # azure_search_key: str = ""
    # azure_search_index_name: str = "dji-knowledge-base"
    
    # 系统配置
    log_level: str = "INFO"
    debug: bool = True
    
    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"  # Allow extra env vars (demo_mode, azure_*, etc.)

@lru_cache()
def get_settings() -> Settings:
    """获取配置实例（单例模式）"""
    return Settings()

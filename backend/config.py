from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache
from typing import Optional


class Settings(BaseSettings):
    """系统配置"""
    
    # Pydantic V2 config
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",  # Ignore extra env vars not defined here
    )
    
    # 数据库
    database_url: str = "postgresql://user:password@localhost:5432/dji_sales_mvp"
    
    # LLM选择: ollama 或 openai
    llm_provider: str = "ollama"

    # Ollama配置（使用本地LLM）
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "qwen2.5:latest"  # 或 llama3, mistral等

    # OpenAI配置（使用ChatGPT）
    openai_api_key: Optional[str] = None
    openai_base_url: Optional[str] = None  # 可自定义代理/自建兼容接口
    openai_model: str = "gpt-4o-mini"
    
    # 向量数据库
    chroma_persist_dir: str = "./data/vectordb"
    
    # 文件上传
    upload_dir: str = "./data/uploads"
    max_upload_size_mb: int = 50
    
    # ===== Telegram Bot 配置 =====
    telegram_bot_token: str = ""  # 从 @BotFather 获取的 token
    telegram_webhook_url: str = ""  # 你的服务器 webhook URL
    
    # ===== Azure OpenAI 配置 =====
    azure_openai_endpoint: str = ""
    azure_openai_api_key: str = ""
    azure_openai_api_version: str = "2024-12-01-preview"
    azure_openai_deployment_name: str = "gpt-4o-mini"
    azure_openai_chat_deployment: str = "gpt-4"
    azure_openai_embedding_deployment: str = "text-embedding-ada-002"
    
    # ===== Azure AI Search 配置 =====
    azure_search_endpoint: str = ""
    azure_search_key: str = ""
    azure_search_index_name: str = "dji-knowledge-base"
    
    # ===== Azure AI Foundry (Market Sentinel) 配置 =====
    # Env var: AZURE_FOUNDRY_PROJECT_ENDPOINT
    azure_foundry_project_endpoint: str = ""
    # Env var: AZURE_FOUNDRY_MODEL (default: gpt-4.1-mini)
    azure_foundry_model: str = "gpt-4.1-mini"
    # Env var: AZURE_BING_CONNECTION_ID (Azure resource path to Bing connection)
    azure_bing_connection_id: str = "/subscriptions/c349553e-2065-4a16-ab24-c5a3826f189f/resourceGroups/rg-tlin56-1409/providers/Microsoft.CognitiveServices/accounts/tlin56-1409-resource/projects/tlin56-1409/connections/bingsearchinstance"
    
    # 系统配置
    log_level: str = "INFO"
    debug: bool = True


@lru_cache()
def get_settings() -> Settings:
    """获取配置实例（单例模式）"""
    return Settings()

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
    
    # Google API (for Gemini embeddings)
    google_api_key: Optional[str] = None
    
    # Google Maps API (for Static Maps - can be same or different from google_api_key)
    google_maps_api_key: Optional[str] = None

    # 向量数据库
    chroma_persist_dir: str = "./data/vectordb"
    maritime_kb_persist_dir: str = "./data/vectordb/maritime"
    chroma_api_key: Optional[str] = None
    chroma_tenant: Optional[str] = None
    chroma_database: Optional[str] = None

    # 文件上传
    upload_dir: str = "./data/uploads"
    documents_upload_dir: str = "./data/uploads/documents"
    max_upload_size_mb: int = 50

    # Maritime Compliance Settings
    maritime_regulations_dir: str = "./data/maritime_regulations"

    # CrewAI Feature Flags
    document_analysis_use_crewai: bool = True
    
    # Clerk配置
    clerk_issuer_url: Optional[str] = None
    admin_whitelist: str = "thaumatext@gmail.com"

    # 系统配置
    log_level: str = "INFO"
    debug: bool = True


@lru_cache()
def get_settings() -> Settings:
    """获取配置实例（单例模式）"""
    return Settings()

import os
import json
from typing import List, Dict, Any, Optional, Type, TypeVar
from openai import OpenAI, AsyncOpenAI
from pydantic import BaseModel
from core.config import REQUESTY_API_KEY, REQUESTY_MODEL, REQUESTY_BASE_URL
from rich.console import Console

console = Console()

T = TypeVar("T", bound=BaseModel)

def get_requesty_client() -> OpenAI:
    """Returns a synchronous OpenAI client configured for Requesty router gateway."""
    api_key = REQUESTY_API_KEY or os.getenv("REQUESTY_API_KEY")
    if not api_key:
        console.print("[bold red]Warning: REQUESTY_API_KEY is not set in environment or config.[/bold red]")
    return OpenAI(
        base_url=REQUESTY_BASE_URL,
        api_key=api_key or "missing_key",
    )

def get_async_requesty_client() -> AsyncOpenAI:
    """Returns an asynchronous OpenAI client configured for Requesty router gateway."""
    api_key = REQUESTY_API_KEY or os.getenv("REQUESTY_API_KEY")
    if not api_key:
        console.print("[bold red]Warning: REQUESTY_API_KEY is not set in environment or config.[/bold red]")
    return AsyncOpenAI(
        base_url=REQUESTY_BASE_URL,
        api_key=api_key or "missing_key",
    )

async def async_chat_completion(
    messages: List[Dict[str, str]],
    system_prompt: Optional[str] = None,
    model: Optional[str] = None,
    temperature: float = 0.7,
    response_format: Optional[Dict[str, Any]] = None,
) -> str:
    """Sends a chat completion request via Requesty OpenAI client."""
    client = get_async_requesty_client()
    target_model = model or REQUESTY_MODEL
    
    formatted_messages = []
    if system_prompt:
        formatted_messages.append({"role": "system", "content": system_prompt})
    formatted_messages.extend(messages)
    
    kwargs: Dict[str, Any] = {
        "model": target_model,
        "messages": formatted_messages,
        "temperature": temperature,
    }
    if response_format:
        kwargs["response_format"] = response_format
        
    try:
        response = await client.chat.completions.create(**kwargs)
        content = response.choices[0].message.content
        return content.strip() if content else ""
    except Exception as e:
        console.print(f"[bold red]Requesty Chat Completion Error ({target_model}): {e}[/bold red]")
        raise e

async def async_structured_output(
    system_prompt: str,
    user_content: str,
    response_model: Type[T],
    model: Optional[str] = None,
    temperature: float = 0.2,
) -> T:
    """Sends a structured completion request via Requesty OpenAI client returning a Pydantic object."""
    client = get_async_requesty_client()
    target_model = model or REQUESTY_MODEL
    
    json_schema = response_model.model_json_schema()
    strict_system_prompt = (
        f"{system_prompt}\n\n"
        f"CRITICAL: You MUST respond ONLY with a single valid JSON object strictly matching this JSON Schema:\n"
        f"{json.dumps(json_schema, indent=2)}\n"
        f"Do NOT include any markdown codeblocks (no ```json), commentary, or extra text."
    )
    
    messages = [
        {"role": "system", "content": strict_system_prompt},
        {"role": "user", "content": user_content},
    ]
    
    try:
        try:
            response = await client.beta.chat.completions.parse(
                model=target_model,
                messages=messages,
                response_format=response_model,
                temperature=temperature,
            )
            if response.choices[0].message.parsed:
                return response.choices[0].message.parsed
        except Exception:
            pass
            
        raw_text = await async_chat_completion(
            messages=[{"role": "user", "content": user_content}],
            system_prompt=strict_system_prompt,
            model=target_model,
            temperature=temperature,
            response_format={"type": "json_object"},
        )
        
        clean_text = raw_text.strip()
        if clean_text.startswith("```"):
            lines = clean_text.splitlines()
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].startswith("```"):
                lines = lines[:-1]
            clean_text = "\n".join(lines).strip()
            
        data_dict = json.loads(clean_text)
        return response_model.model_validate(data_dict)
    except Exception as e:
        console.print(f"[bold red]Structured Output Parsing Error ({target_model}): {e}[/bold red]")
        raise e

async def generate_embedding(
    text: str,
    model: str = "openai/text-embedding-3-small"
) -> List[float]:
    """Generates text embedding vector using Requesty embedding endpoint."""
    client = get_async_requesty_client()
    try:
        response = await client.embeddings.create(
            input=text,
            model=model
        )
        return response.data[0].embedding
    except Exception as e:
        console.print(f"[yellow]Embedding generation warning ({model}): {e}. Returning zero vector.[/yellow]")
        return [0.0] * 1536

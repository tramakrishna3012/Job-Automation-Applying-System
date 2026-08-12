import traceback
import functools
from typing import Callable, Any, Dict
from pydantic import BaseModel
from rich.console import Console

from core.db import log_telemetry, get_db_connection
from core.ai_gateway import async_structured_output

console = Console()

SELF_HEAL_PROMPT = (
    "You are an expert AI Self-Healing Systems Engineer. "
    "Analyze the provided Python traceback and execution context from an agent graph node. "
    "Propose a fix description, code patch, and risk classification. "
    "RISK CLASSIFICATION RULES: "
    "- 'low': Config value fixes, CSS selector tweaks, string formatting, or fallback handling. "
    "- 'high': Anything modifying auto-apply submission logic or cold email dispatching logic."
)

class SelfHealProposal(BaseModel):
    summary: str
    proposed_fix: str
    risk_level: str  # 'low' | 'high'

async def analyze_node_failure(node_name: str, error_trace: str, context_str: str) -> SelfHealProposal:
    """Uses AI Gateway to analyze exception traceback and propose self-healing patch."""
    user_content = f"Node Name: {node_name}\nError Traceback:\n{error_trace}\nContext:\n{context_str}"
    return await async_structured_output(
        system_prompt=SELF_HEAL_PROMPT,
        user_content=user_content,
        response_model=SelfHealProposal,
        temperature=0.1
    )

def log_review_queue_item(node_name: str, proposal: SelfHealProposal, traceback_str: str):
    """Logs high-risk or low-risk fix proposals to Neon DB telemetry review queue."""
    log_telemetry(
        "SelfHeal",
        f"[{proposal.risk_level.upper()} RISK] Node '{node_name}' failure fix proposed: {proposal.summary}"
    )
    conn = get_db_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO agent_logs (agent_name, message) VALUES (%s, %s)",
                    ("SelfHealReviewQueue", f"Node: {node_name} | Risk: {proposal.risk_level} | Patch: {proposal.proposed_fix[:300]}")
                )
        except Exception:
            pass
        finally:
            conn.close()

def self_healing_node(node_name: str):
    """Decorator wrapping graph node execution with self-healing diagnostics."""
    def decorator(func: Callable[..., Any]):
        @functools.wraps(func)
        def wrapper(state: Dict[str, Any], *args, **kwargs):
            try:
                return func(state, *args, **kwargs)
            except Exception as e:
                err_str = traceback.format_exc()
                console.print(f"[bold red]ALERT: Exception in Graph Node '{node_name}': {e}[/bold red]")
                log_telemetry("SelfHeal", f"Exception captured in node '{node_name}': {str(e)}")

                try:
                    import asyncio
                    try:
                        loop = asyncio.get_running_loop()
                    except RuntimeError:
                        loop = None

                    if loop and loop.is_running():
                        task = loop.create_task(analyze_node_failure(node_name, err_str, str(state)[:1000]))
                    else:
                        proposal = asyncio.run(analyze_node_failure(node_name, err_str, str(state)[:1000]))
                        console.print(f"[bold yellow]Self-Heal Proposal ({proposal.risk_level.upper()} risk): {proposal.summary}[/bold yellow]")
                        log_review_queue_item(node_name, proposal, err_str)
                except Exception as heal_err:
                    console.print(f"[red]Self-healing analysis notice: {heal_err}[/red]")

                # Return un-mutated state so pipeline degrades gracefully instead of crashing server
                return state
        return wrapper
    return decorator

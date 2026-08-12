import pytest
from unittest.mock import AsyncMock, patch
from core.self_heal import self_healing_node, SelfHealProposal

def test_self_healing_node_success():
    @self_healing_node("test_node")
    def sample_node(state):
        state["processed"] = True
        return state

    result = sample_node({"processed": False})
    assert result["processed"] is True

def test_self_healing_node_exception_graceful_degradation():
    @self_healing_node("failing_node")
    def failing_node(state):
        raise ValueError("Simulated node failure")

    proposal = SelfHealProposal(
        summary="Add fallback error handling",
        proposed_fix="return state",
        risk_level="low"
    )

    with patch("core.self_heal.analyze_node_failure", new_callable=AsyncMock) as mock_analyze, \
         patch("core.self_heal.log_telemetry") as mock_telemetry:
        mock_analyze.return_value = proposal
        
        state_input = {"initial": "value"}
        result = failing_node(state_input)
        
        # Ensures original state returned without crashing graph
        assert result == state_input
        mock_telemetry.assert_called()

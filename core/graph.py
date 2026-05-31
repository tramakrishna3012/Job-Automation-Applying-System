from langgraph.graph import StateGraph, START, END
from core.state import ApplicationState

from agents.scout import run_scout

def scout_jobs_node(state: ApplicationState):
    return run_scout(state)

from agents.editor import run_editor

def tailor_resume_node(state: ApplicationState):
    return run_editor(state)

from agents.dispatcher import run_dispatcher

def apply_to_jobs_node(state: ApplicationState):
    return run_dispatcher(state)

from agents.communicator import run_communicator

def send_emails_node(state: ApplicationState):
    return run_communicator(state)

from agents.visibility import run_visibility
from agents.connector import run_connector

def network_node(state: ApplicationState):
    state = run_visibility(state)
    state = run_connector(state)
    return state

# Build the graph
workflow = StateGraph(ApplicationState)

workflow.add_node("scout", scout_jobs_node)
workflow.add_node("tailor", tailor_resume_node)
workflow.add_node("apply", apply_to_jobs_node)
workflow.add_node("email", send_emails_node)
workflow.add_node("network", network_node)

# Flow
workflow.add_edge(START, "scout")
workflow.add_edge("scout", "tailor")
workflow.add_edge("tailor", "apply")
workflow.add_edge("apply", "email")
workflow.add_edge("email", "network")
workflow.add_edge("network", END)

app = workflow.compile()

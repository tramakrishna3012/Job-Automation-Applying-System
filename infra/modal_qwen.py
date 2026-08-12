import modal

app = modal.App("job-automation-qwen35b")

vllm_image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install(
        "vllm>=0.6.0",
        "huggingface_hub",
        "torch",
        "fastapi"
    )
)

MODEL_NAME = "Qwen/Qwen3.6-35B-A3B-FP8"

@app.function(
    image=vllm_image,
    gpu="A10G",
    container_idle_timeout=300,
    allow_concurrent_inputs=10,
)
@modal.asgi_app()
def web_server():
    import subprocess
    import os
    from fastapi import FastAPI

    # vLLM OpenAI-compatible server command
    cmd = [
        "vllm", "serve", MODEL_NAME,
        "--port", "8000",
        "--max-model-len", "262144",
        "--reasoning-parser", "qwen3",
        "--trust-remote-code"
    ]
    
    proc = subprocess.Popen(cmd)
    
    api_app = FastAPI(title="Qwen3.6-35B Modal vLLM Server")
    
    @api_app.get("/health")
    def health():
        return {"status": "ok", "model": MODEL_NAME, "backend": "Modal vLLM"}
        
    return api_app

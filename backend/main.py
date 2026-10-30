
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from backend.models.workflow import WorkflowDefinition
from backend.engine.validator import validate_workflow
from backend.engine.executor import execute_workflow

app = FastAPI(
    title="Welvox Flow Engine",
    description="Workflow automation API",
    version="0.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    return {
        "product": "Welvox Flow Engine",
        "version": "0.1.0",
        "status": "online"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "engine": "Welvox Flow Engine"
    }


@app.post("/api/workflows/validate")
def validate(workflow: WorkflowDefinition):
    result = validate_workflow(workflow)

    if not result["valid"]:
        raise HTTPException(
            status_code=400,
            detail=result["errors"]
        )

    return result


@app.post("/api/workflows/execute")
def execute(workflow: WorkflowDefinition):
    result = execute_workflow(workflow)

    if result["status"] == "failed":
        raise HTTPException(
            status_code=400,
            detail=result
        )

    return result

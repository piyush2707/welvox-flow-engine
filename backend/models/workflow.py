
from pydantic import BaseModel, Field
from typing import Any, Optional


class WorkflowNode(BaseModel):
    id: str
    type: str
    name: str
    config: dict[str, Any] = Field(default_factory=dict)


class WorkflowConnection(BaseModel):
    source: str
    target: str


class WorkflowDefinition(BaseModel):
    id: Optional[str] = None
    name: str
    description: str = ""
    nodes: list[WorkflowNode]
    connections: list[WorkflowConnection] = Field(
        default_factory=list
    )

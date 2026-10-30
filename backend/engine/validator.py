
from backend.models.workflow import WorkflowDefinition


def validate_workflow(workflow: WorkflowDefinition):
    errors = []

    if not workflow.name.strip():
        errors.append("Workflow name is required.")

    if not workflow.nodes:
        errors.append("Workflow must contain at least one node.")

    node_ids = [node.id for node in workflow.nodes]

    if len(node_ids) != len(set(node_ids)):
        errors.append("Every node must have a unique ID.")

    valid_ids = set(node_ids)

    for connection in workflow.connections:
        if connection.source not in valid_ids:
            errors.append(
                f"Unknown source node: {connection.source}"
            )

        if connection.target not in valid_ids:
            errors.append(
                f"Unknown target node: {connection.target}"
            )

    if errors:
        return {
            "valid": False,
            "errors": errors
        }

    return {
        "valid": True,
        "errors": [],
        "message": "Workflow validation successful."
    }

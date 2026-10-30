
from collections import deque
from backend.models.workflow import WorkflowDefinition
from backend.engine.validator import validate_workflow


def execute_workflow(workflow: WorkflowDefinition):
    validation = validate_workflow(workflow)

    if not validation["valid"]:
        return {
            "status": "failed",
            "errors": validation["errors"],
            "logs": []
        }

    nodes = {node.id: node for node in workflow.nodes}
    outgoing = {node_id: [] for node_id in nodes}
    incoming = {node_id: 0 for node_id in nodes}

    for connection in workflow.connections:
        outgoing[connection.source].append(connection.target)
        incoming[connection.target] += 1

    queue = deque(
        node_id for node_id in nodes
        if incoming[node_id] == 0
    )

    execution_order = []

    while queue:
        node_id = queue.popleft()
        execution_order.append(node_id)

        for target in outgoing[node_id]:
            incoming[target] -= 1

            if incoming[target] == 0:
                queue.append(target)

    if len(execution_order) != len(nodes):
        return {
            "status": "failed",
            "errors": ["Workflow contains a cycle."],
            "logs": []
        }

    logs = []
    context = {}

    for node_id in execution_order:
        node = nodes[node_id]

        try:
            if node.type == "start":
                message = "Workflow started."

            elif node.type == "log":
                message = node.config.get("message", "Log action executed.")

            elif node.type == "set_value":
                key = node.config.get("key")
                value = node.config.get("value")

                if not key:
                    raise ValueError("A value key is required.")

                context[key] = value
                message = f"Stored value: {key}"

            else:
                raise ValueError(
                    f"Unsupported action type: {node.type}"
                )

            logs.append({
                "node_id": node_id,
                "node_name": node.name,
                "status": "success",
                "message": str(message)
            })

        except Exception as error:
            logs.append({
                "node_id": node_id,
                "node_name": node.name,
                "status": "failed",
                "message": str(error)
            })

            return {
                "status": "failed",
                "errors": [str(error)],
                "logs": logs,
                "context": context
            }

    return {
        "status": "completed",
        "errors": [],
        "logs": logs,
        "context": context
    }

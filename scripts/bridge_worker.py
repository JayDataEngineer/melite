#!/usr/bin/env python3
"""
bridge_worker.py — Python worker for ComfyUI bridge plugin.

Runs as a subprocess managed by the C++ bridge plugin.
Reads JSON requests from stdin, executes ComfyUI nodes, writes results to stdout.

Protocol:
  Request:  {"node":"ControlNetPreprocessor","config":{...},"inputs":{...}}
  Response: {"outputs":{...},"metadata":{...}}
"""

import argparse
import json
import sys
import traceback

# Add ComfyUI to path
sys.path.insert(0, "/opt/ComfyUI")


class BridgeWorker:
    """Executes ComfyUI nodes in-process."""

    def __init__(self):
        self.node_cache = {}  # class_type -> instantiated node

    def execute(self, request: dict) -> dict:
        """Execute a ComfyUI node."""
        node_type = request.get("node", "")
        config = request.get("config", {})
        inputs = request.get("inputs", {})

        try:
            # Import the node class
            node_class = self._import_node(node_type)
            if not node_class:
                return {"error": f"Unknown node type: {node_type}"}

            # Instantiate if not cached
            if node_type not in self.node_cache:
                self.node_cache[node_type] = node_class()

            node = self.node_cache[node_type]

            # Execute the node
            # ComfyUI nodes use INPUT_TYPES dict for input spec
            result = node_function(node, inputs, config)

            return {"outputs": result, "metadata": {"node_type": node_type}}

        except Exception as e:
            return {"error": str(e), "traceback": traceback.format_exc()}

    def _import_node(self, node_type: str):
        """Import a ComfyUI node class by name."""
        try:
            # Try common ComfyUI node registries
            import comfy.nodes
            import comfy_extras.nodes

            # Search in registered nodes
            for node_cls in comfy.nodes.NODE_CLASS_MAPPINGS.values():
                if hasattr(node_cls, 'FUNCTION'):
                    if node_cls.__name__ == node_type:
                        return node_cls

            # Try direct import from comfy_extras
            import importlib
            for module_name in dir(comfy_extras):
                if module_name.startswith("nodes_"):
                    mod = importlib.import_module(f"comfy_extras.{module_name}")
                    if hasattr(mod, 'NODE_CLASS_MAPPINGS'):
                        if node_type in mod.NODE_CLASS_MAPPINGS:
                            return mod.NODE_CLASS_MAPPINGS[node_type]

        except Exception as e:
            print(f"Import error for {node_type}: {e}", file=sys.stderr)

        return None


def node_function(node, inputs: dict, config: dict) -> dict:
    """Execute a ComfyUI node's FUNCTION method."""
    func_name = getattr(node, 'FUNCTION', 'execute')

    # Map inputs to the function's parameter names
    # ComfyUI nodes declare inputs via INPUT_TYPES classmethod
    if hasattr(node, 'INPUT_TYPES'):
        input_spec = node.INPUT_TYPES(**{})  # dynamic inputs
        # Build kwargs from inputs matching the spec
        kwargs = {}
        for key in inputs:
            if key in input_spec:
                kwargs[key] = inputs[key]
        return getattr(node, func_name)(**kwargs)

    # Fallback: pass all inputs
    return getattr(node, func_name)(**inputs)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--node-type", help="ComfyUI node class name")
    args = parser.parse_args()

    worker = BridgeWorker()

    # If --node-type given, execute a single request from stdin
    if args.node_type:
        request_line = sys.stdin.readline()
        if request_line:
            request = json.loads(request_line)
            request["node"] = args.node_type
            result = worker.execute(request)
            json.dump(result, sys.stdout)
            sys.stdout.write("\n")
            sys.stdout.flush()
        return

    # Otherwise, loop reading requests
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            request = json.loads(line)
            result = worker.execute(request)
        except json.JSONDecodeError as e:
            result = {"error": f"Invalid JSON: {e}"}

        json.dump(result, sys.stdout)
        sys.stdout.write("\n")
        sys.stdout.flush()


if __name__ == "__main__":
    main()

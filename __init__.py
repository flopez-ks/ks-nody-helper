from pathlib import Path
from .nody_helper import NodyHelperNode

print("[NODY] loaded nody init py")

# Register the node class
NODE_CLASS_MAPPINGS = {
    "NodyHelperNode": NodyHelperNode,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "NodyHelperNode": "Nody Helper Loader",
}

# Tell ComfyUI where to find frontend assets (JS)
WEB_DIRECTORY = str(Path(__file__).parent / "web")
print("[NODY] WEB_DIRECTORY =", WEB_DIRECTORY)

__all__ = ['NODE_CLASS_MAPPINGS', 'NODE_DISPLAY_NAME_MAPPINGS', 'WEB_DIRECTORY']
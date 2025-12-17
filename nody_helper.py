# nody_helper.py
print("[NODY] loaded nody_helper.py") #✓

from aiohttp import web
from server import PromptServer


# -----------------------------
# Minimal backend routes (proof of life)
# -----------------------------
@PromptServer.instance.routes.get("/nody/ping")
async def nody_ping(request):
    print("[NODY] python code loaded and reachable: /nody/ping hit") # ✓
    return web.json_response({"ok": True, "msg": "pong"})


@PromptServer.instance.routes.post("/nody/echo")
async def nody_echo(request):
    data = await request.json()
    return web.json_response({"ok": True, "received": data})


# -----------------------------
# Minimal node (keeps ComfyUI happy) : it works
# -----------------------------
class NodyHelperNode:
    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {"trigger": ("BOOLEAN", {"default": True})}}

    RETURN_TYPES = ()
    FUNCTION = "run"
    CATEGORY = "utils/nody_helper"

    def run(self, trigger=True):
        # Node does nothing (prototype); routes do the real proof.
        return ()


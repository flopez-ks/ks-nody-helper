# nody_helper.py
print("[NODY] loaded nody_helper.py")

class NodyHelperNode:
    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {"trigger": ("BOOLEAN", {"default": True})}}

    RETURN_TYPES = ()
    FUNCTION = "run"
    CATEGORY = "utils/nody_helper"

    def run(self, trigger=True):
        return ()

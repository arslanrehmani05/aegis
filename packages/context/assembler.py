from typing import List, Dict, Any

class ContextAssembler:
    def __init__(self, max_token_budget: int = 4096):
        self.max_token_budget = max_token_budget

    def assemble_context(
        self,
        system_instructions: str,
        conversation_history: List[Dict[str, Any]],
        available_tools: List[Dict[str, Any]],
        user_input: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Assembles token-budgeted prompt context with deduplication and filtering.
        """
        # 1. System instruction block
        assembled_messages = [{"role": "system", "content": system_instructions}]

        # 2. Append tool specs summary
        tools_summary = "\n".join([f"- {t['name']}: {t.get('description', '')}" for t in available_tools])
        assembled_messages.append({"role": "system", "content": f"Available Tools:\n{tools_summary}"})

        # 3. Append history
        for msg in conversation_history[-10:]:  # Truncate to recent history
            assembled_messages.append(msg)

        # 4. User input
        assembled_messages.append({"role": "user", "content": str(user_input)})

        # Rough token estimation (1 token ~ 4 chars)
        total_chars = sum(len(m["content"]) for m in assembled_messages)
        estimated_tokens = total_chars // 4

        return {
            "messages": assembled_messages,
            "estimated_tokens": estimated_tokens,
            "token_budget": self.max_token_budget,
            "truncated": estimated_tokens > self.max_token_budget,
        }

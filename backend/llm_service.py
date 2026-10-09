from groq import Groq
from dotenv import load_dotenv
from math_service import generate_math_chart_spec
import os, time
import json
from lp_charts.lp_service import generate_lp_chart_spec
from lp_charts.lp_min_max import solve_linear_min_max

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# ============================================================
# FALLBACK MODELS — Order matters
# ============================================================
MODELS = [
    # "invalid-model-name",
    "openai/gpt-oss-120b",        # Primary
    "openai/gpt-oss-20b",         # Fallback  
    # "llama-3.1-8b-instant",       # Fallback (Not working)
]

# Combined system prompt — detects math vs business
SYSTEM_PROMPT = """You are an intelligent question analyzer. Given a user question, you must first classify it as either "math" or "business" and return ONLY valid JSON.

## Type 1: MATH (function plotting)
If the question asks to PLOT/GRAPH a mathematical function, return:
{
  "type": "math",
  "expression": "x**2",          // Python-style math expression
  "variable": "x",                // Usually "x"
  "x_min": -5,                    // Start of range
  "x_max": 5,                     // End of range
  "title": "y = x²",             // Human-readable title
  "confidence": 0.95
}

Rules for MATH:
- Use ** for power (e.g., x**2, not x^2)
- Use sin(x), cos(x), tan(x), log(x), exp(x), sqrt(x), abs(x)
- Use pi for π, e for Euler's number
- If no range is given, use -10 to 10
- Do NOT solve equations — only plot functions
- Examples: "plot y = x^2", "graph sin(x)", "draw y = 2x + 1"

## Type 2: BUSINESS (data charts)
If the question asks about real-world data (sales, revenue, market share, etc.), return:
{
  "type": "business",
  "chart_type": "bar" | "line" | "pie" | "scatter" | "area",
  "title": "string",
  "x_axis": {
    "label": "string",
    "data": ["item1", "item2"]
  },
  "y_axis": {
    "label": "string"
  },
  "series": [
    {"name": "string", "data": [1, 2, 3]}
  ],
  "confidence": 0.0
}

Rules for BUSINESS:
- Generate realistic approximate data values
- Choose chart_type based on the question

## Type 3: LINEAR PROGRAMMING

FIRST, check if the question asks for BOTH minimize AND maximize:
- Trigger words: "min and max", "minimize and maximize", "both", "min & max"

### If BOTH min and max requested:
{
  "type": "linear_programming_dual",
  "objective": {
    "coeffs": [3, 9]
  },
  "constraints": [
    {"coeffs": [1, 3], "op": "<=", "rhs": 60},
    {"coeffs": [1, 1], "op": ">=", "rhs": 10}
  ],
  "bounds": {
    "x_min": 0, "x_max": 100,
    "y_min": 0, "y_max": 100
  },
  "confidence": 0.95
}

### If ONLY one (min OR max):
{
  "type": "linear_programming",
  "objective": {
    "coeffs": [3, 2],
    "type": "maximize"
  },
  "constraints": [...],
  "bounds": {...},
  "confidence": 0.95
}

Rules for LINEAR PROGRAMMING:
- Trigger words for MAXIMIZE: "maximize", "maximum", "max"
- Trigger words for MINIMIZE: "minimize", "minimum", "min"
- If BOTH min and max mentioned → use "linear_programming_dual"
- Only include constraints EXPLICITLY mentioned in the question
- DO NOT invent, hallucinate, or add extra constraints
- Count the constraints carefully before returning
- Include x >= 0, y >= 0 as BOUNDS (x_min=0, y_min=0) — NOT as constraints
- Parse each inequality EXACTLY as written
- Return ONLY the JSON

CRITICAL CONSTRAINT RULES 
- ONLY include constraints EXPLICITLY mentioned in the question
- DO NOT invent, hallucinate, or add extra constraints
- DO NOT add constraints that are not in the original text
- If question has 3 constraints, return exactly 3 constraints
- If question has 2 constraints, return exactly 2 constraints
- Count the constraints carefully before returning

- Include x >= 0, y >= 0 as BOUNDS (x_min=0, y_min=0) — NOT as constraints
- Set x_max, y_max to TIGHT bounds — just enough to show feasible region
- Parse each inequality EXACTLY as written (same coefficients, same operator, same RHS)
- Return ONLY the JSON

## Error Case
If the question cannot be visualized at all:
{"error": "reason"}

## Output Rules
- Return ONLY the JSON object
- NO markdown, NO explanation
- Choose the correct type based on the question
"""
def _call_groq(question: str, model: str, retries: int = 2):
    """Call Groq API with retry logic."""
    last_error = None
    
    for attempt in range(retries + 1):
        try:
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": question},
                ],
                response_format={"type": "json_object"},
                temperature=0.0,
                max_tokens=2048,
            )
            return response.choices[0].message.content
        
        except Exception as e:
            last_error = e
            error_msg = str(e).lower()
            
            if "json_validate_failed" in error_msg:
                raise
            
            if "429" in error_msg or "rate_limit" in error_msg:
                if attempt < retries:
                    wait = 2 ** attempt
                    print(f"Rate limited on {model}, retrying in {wait}s...")
                    time.sleep(wait)
                    continue
            
            if attempt < retries:
                time.sleep(1)
                continue
            
            raise
    
    raise last_error

def generate_chart_spec(question: str) -> dict:
  """Generate chart specification (with fallback models)."""
  last_error = None
    
  for model in MODELS:
    try:
        print(f"🔄 Trying model: {model}")
        content = _call_groq(question, model)
        spec = json.loads(content)
        
        # Route to math service if needed
        if spec.get("type") == "math":
            math_result = generate_math_chart_spec(
                expression=spec.get("expression", ""),
                x_min=float(spec.get("x_min", -10)),
                x_max=float(spec.get("x_max", 10)),
                title=spec.get("title"),
                variable=spec.get("variable", "x")
            )
            return math_result
        
        # Linear Programming      
        if spec.get("type") == "linear_programming":
          result = generate_lp_chart_spec(spec)
          result["chart_type"] = "linear_programming"
          return result

        # Linear Programming — DUAL (both min AND max)
        if spec.get("type") == "linear_programming_dual":
            objective = spec.get("objective", {})
            constraints = spec.get("constraints", [])
            bounds = spec.get("bounds", {})
            
            result = solve_linear_min_max(
                objective_coeffs=objective.get("coeffs", [1, 1]),
                constraints=constraints,
                x_min=bounds.get("x_min", 0),
                x_max=bounds.get("x_max", 100),
                y_min=bounds.get("y_min", 0),
                y_max=bounds.get("y_max", 100)
            )
            result["chart_type"] = "linear_programming_dual"
            return result
        
        # Business chart — return as-is
        if spec.get("type") == "business":
            # Remove "type" field to keep compatibility
            spec.pop("type", None)
            return spec
        
        # Error or fallback
        return spec
    
    except Exception as e:
        last_error = e
        print(f"Model {model} failed: {str(e)[:100]}")
        continue

  # All models failed
  error_msg = str(last_error)

  # JSON validation error (Groq hallucination)
  if "json_validate_failed" in error_msg or "Failed to validate JSON" in error_msg:
      return {
          "error": "The AI couldn't generate a valid chart for this question. Please try again.",
          "type": "llm_json_error"
      }
        
  # Rate limit error
  if "rate_limit" in error_msg.lower() or "429" in error_msg:
      return {
          "error": "Too many requests. Please wait a moment and try again.",
          "type": "rate_limit"
      }
        
  # Generic error
  return {
      "error": "Something went wrong. Please try again.",
      "type": "llm_error"
  }



if __name__ == "__main__":
    # Test math
    print("=== MATH TEST ===")
    result = generate_chart_spec("Plot y = x^2 from -5 to 5")
    print(json.dumps({k: v for k, v in result.items() if k != "series"}, indent=2))
    print(f"Series data points: {len(result.get('series', [{}])[0].get('data', []))}")
    
    print("\n=== BUSINESS TEST ===")
    result = generate_chart_spec("Compare revenue of Tata, Adani, Reliance")
    print(json.dumps(result, indent=2))
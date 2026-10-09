import numpy as np
import sympy as sp
from sympy.parsing.sympy_parser import (
    parse_expr,
    standard_transformations,
    implicit_multiplication_application,
    convert_xor
)

# Convert ^2, ^3, etc. to Unicode superscripts
SUPERSCRIPT_MAP = {
    '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
    '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
    '-': '⁻', '+': '⁺'
}

def format_power(text: str) -> str:
    """Convert x^2 or x**2 to x², x^3 to x³, etc. for pretty display."""
    if not text:
        return text
    
    import re
    # Match ^ or ** followed by numbers (with optional sign)
    def replace_match(m):
        digits = m.group(1)
        return ''.join(SUPERSCRIPT_MAP.get(d, d) for d in digits)
    
    # First handle ** (double asterisk) — most common from LLM
    text = re.sub(r'\*\*(\-?\d+)', replace_match, text)
    # Then handle ^ (caret) — for safety
    text = re.sub(r'\^(\-?\d+)', replace_match, text)
    
    return text

# Allowed transformations for safe parsing
TRANSFORMATIONS = (
    standard_transformations
    + (implicit_multiplication_application, convert_xor)
)

# Whitelist of allowed functions (security)
ALLOWED_FUNCTIONS = {
    'sin': sp.sin, 'cos': sp.cos, 'tan': sp.tan,
    'asin': sp.asin, 'acos': sp.acos, 'atan': sp.atan,
    'sinh': sp.sinh, 'cosh': sp.cosh, 'tanh': sp.tanh,
    'log': sp.log, 'ln': sp.log, 'log10': lambda x: sp.log(x, 10),
    'exp': sp.exp, 'sqrt': sp.sqrt, 'abs': sp.Abs,
    'pi': sp.pi, 'e': sp.E,
    'floor': sp.floor, 'ceil': sp.ceiling,
}

def compute_function_data(
    expression: str,
    x_min: float,
    x_max: float,
    num_points: int = 200,
    variable: str = "x"
) -> dict:
    """
    Compute function values using SymPy + NumPy.
    
    Args:
        expression: Math expression as string (e.g., "x**2", "sin(x)")
        x_min: Start of range
        x_max: End of range
        num_points: Number of data points
        variable: Variable name (usually "x")
    
    Returns:
        dict with x values and y values
    """
    try:
        # Parse the expression safely
        x = sp.Symbol(variable)
        expr = parse_expr(
            expression,
            local_dict={variable: x, **ALLOWED_FUNCTIONS},
            transformations=TRANSFORMATIONS,
            evaluate=True
        )
        
        # Convert to numpy function
        f = sp.lambdify(x, expr, modules=['numpy'])
        
        # Generate x values
        x_values = np.linspace(x_min, x_max, num_points)
        
        # Compute y values
        y_values = f(x_values)
        
        # Handle complex numbers (take real part)
        if np.iscomplexobj(y_values):
            y_values = np.real(y_values)
        
        # Convert to lists (JSON serializable)
        x_list = x_values.tolist()
        y_list = [
            None if (np.isnan(v) or np.isinf(v)) else float(v)
            for v in y_values
        ]
        
        return {
            "success": True,
            "x_values": x_list,
            "y_values": y_list,
            "expression": str(expr)
        }
    
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


def generate_math_chart_spec(
    expression: str,
    x_min: float,
    x_max: float,
    title: str = None,
    variable: str = "x"
) -> dict:
    """
    Generate a chart spec from a math expression.
    """
    result = compute_function_data(expression, x_min, x_max, variable=variable)
    
    if not result["success"]:
        return {"error": f"Math error: {result['error']}"}
    
    x_values = result["x_values"]
    y_values = result["y_values"]
    
        # Format x-axis labels (rounded for readability)
    x_labels = [f"{v:.1f}" for v in x_values]
    
    # ✅ Format title and series name with superscripts
    formatted_title = format_power(title or f"y = {expression}")
    formatted_name = format_power(f"y = {expression}")
    
    return {
        "type": "math",
        "chart_type": "line",
        "title": formatted_title,        # ← x² dikhega
        "x_axis": {
            "label": variable,
            "data": x_labels,
        },
        "y_axis": {
            "label": "y"
        },
        "series": [
            {
                "name": formatted_name,  # ← Legend mein bhi x²
                "data": y_values
            }
        ],
        "confidence": 1.0,
        "is_math": True
    }
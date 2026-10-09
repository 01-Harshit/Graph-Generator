# ============================================================
# lp_charts/lp_min_max.py
# Handles BOTH minimize AND maximize LP in one question
# Exports: solve_linear_min_max, generate_lp_dual_spec
# ============================================================

from lp_charts.lp_service import solve_linear_program


# ============================================================
# MAIN SOLVER — Min + Max together
# ============================================================
def solve_linear_min_max(
    objective_coeffs: list,
    constraints: list,
    x_min: float = 0,
    x_max: float = 100,
    y_min: float = 0,
    y_max: float = 100
) -> dict:
    """
    Solve LP for BOTH minimize and maximize.
    Returns a combined spec with both solutions.
    """
    try:
        # Solve MINIMIZE
        min_result = solve_linear_program(
            objective_coeffs=objective_coeffs,
            objective_type="minimize",
            constraints=constraints,
            x_min=x_min, x_max=x_max,
            y_min=y_min, y_max=y_max
        )

        # Solve MAXIMIZE
        max_result = solve_linear_program(
            objective_coeffs=objective_coeffs,
            objective_type="maximize",
            constraints=constraints,
            x_min=x_min, x_max=x_max,
            y_min=y_min, y_max=y_max
        )

        # If both failed → return error
        if "error" in min_result and "error" in max_result:
            return min_result

        # Build combined spec — use whichever succeeded as base
        base_result = min_result if "error" not in min_result else max_result

        combined = {
            "type": "linear_programming_dual",
            "chart_type": "line",
            "title": f"Z = {objective_coeffs[0]}x + {objective_coeffs[1]}y (Min + Max)",
            "x_axis": {"label": "x"},
            "y_axis": {"label": "y"},
            "objective": {
                "coeffs": objective_coeffs,
                "type": "dual"
            },
            "minimize": min_result,
            "maximize": max_result,
            "confidence": 0.95,
            "is_math": True,
            # Copy shared data from base result
            "constraints": base_result.get("constraints", []),
            "feasible_region": base_result.get(
                "feasible_region",
                {"points": [], "empty": True}
            ),
            "corner_points": base_result.get("corner_points", []),
            "bounds": base_result.get("bounds", {
                "x_min": x_min, "x_max": x_max,
                "y_min": y_min, "y_max": y_max
            }),
            # Flag if either case is unbounded
            "is_unbounded": (
                min_result.get("is_unbounded", False) or
                max_result.get("is_unbounded", False)
            ),
            "unbounded_message": _build_unbounded_message(min_result, max_result),
        }

        return combined

    except Exception as e:
        return {"error": f"Min-Max LP solve error: {str(e)}"}


# ============================================================
# HELPER — Build unbounded message
# ============================================================
def _build_unbounded_message(min_result, max_result):
    """Build appropriate unbounded message for min+max mode."""
    min_unbounded = min_result.get("is_unbounded", False)
    max_unbounded = max_result.get("is_unbounded", False)

    if min_unbounded and max_unbounded:
        return "Both minimize and maximize are UNBOUNDED."
    elif min_unbounded:
        return "Minimize is UNBOUNDED — only maximize solution is meaningful."
    elif max_unbounded:
        return "Maximize is UNBOUNDED — only minimize solution is meaningful."
    return None


# ============================================================
# ENTRY POINT — Parse LLM data and solve (min + max)
# ============================================================
def generate_lp_dual_spec(lp_data: dict) -> dict:
    """Generate min+max LP chart spec from parsed LLM data."""
    try:
        objective = lp_data.get("objective", {})
        constraints = lp_data.get("constraints", [])
        bounds = lp_data.get("bounds", {})

        return solve_linear_min_max(
            objective_coeffs=objective.get("coeffs", [1, 1]),
            constraints=constraints,
            x_min=bounds.get("x_min", 0),
            x_max=bounds.get("x_max", 100),
            y_min=bounds.get("y_min", 0),
            y_max=bounds.get("y_max", 100)
        )
    except Exception as e:
        return {"error": f"Min-Max LP parsing error: {str(e)}"}
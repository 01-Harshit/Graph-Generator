import numpy as np
from scipy.optimize import linprog
from scipy.spatial import ConvexHull
from itertools import combinations


# ============================================================
# TIGHT BOUNDS — Auto-compute axis bounds from constraints
# ============================================================
def compute_tight_bounds(constraints):
    """Auto-compute tight bounds from constraints to fill the chart."""
    x_vals = [0]
    y_vals = [0]

    for con in constraints:
        a, b = con["coeffs"]
        c = con["rhs"]

        if abs(a) > 1e-9:
            x_vals.append(abs(c / a))
        if abs(b) > 1e-9:
            y_vals.append(abs(c / b))

    max_x = max(x_vals) if x_vals else 20
    max_y = max(y_vals) if y_vals else 20

    # 70% padding to include extended corners
    return {
        "x_max": max_x * 1.7,
        "y_max": max_y * 1.7,
        "x_min": 0,
        "y_min": 0
    }


# ============================================================
# FEASIBLE REGION — Built from corner points (ConvexHull)
# ============================================================
def compute_feasible_region_from_corners(corner_points):
    """Build feasible region polygon directly from corner points."""
    if not corner_points or len(corner_points) < 3:
        return {"points": [], "empty": True}

    points = np.array([[p["x"], p["y"]] for p in corner_points])

    try:
        hull = ConvexHull(points)
        hull_points = points[hull.vertices]
        hull_list = hull_points.tolist()
        hull_list.append(hull_list[0])  # Close polygon

        return {
            "points": [[float(x), float(y)] for x, y in hull_list],
            "empty": False
        }
    except Exception:
        sorted_pts = sorted(corner_points, key=lambda p: (p["x"], p["y"]))
        closed = sorted_pts + [sorted_pts[0]]
        return {
            "points": [[float(p["x"]), float(p["y"])] for p in closed],
            "empty": False
        }


# ============================================================
# CORNER POINTS — Intersections of constraint lines
# ============================================================
def compute_corner_points(constraints, x_min, x_max, y_min, y_max, objective_coeffs=None):
    """Find intersection points of constraint lines."""
    corners = []

    lines = []
    for con in constraints:
        a, b = con["coeffs"]
        c = con["rhs"]
        lines.append((a, b, c))

    # Add axis boundaries
    if x_min is not None:
        lines.append((1, 0, x_min))
    if y_min is not None:
        lines.append((0, 1, y_min))

    # Find intersections
    for (a1, b1, c1), (a2, b2, c2) in combinations(lines, 2):
        det = a1 * b2 - a2 * b1
        if abs(det) < 1e-9:
            continue
        x = (c1 * b2 - c2 * b1) / det
        y = (a1 * c2 - a2 * c1) / det

        # Relaxed bounds
        x_padding = (x_max - x_min) * 0.1
        y_padding = (y_max - y_min) * 0.1
        if not (x_min - x_padding <= x <= x_max + x_padding):
            continue
        if not (y_min - y_padding <= y <= y_max + y_padding):
            continue
        if x < -0.01 or y < -0.01:
            continue

        # Feasibility check
        is_feasible = True
        for con in constraints:
            a, b = con["coeffs"]
            op = con["op"]
            rhs = con["rhs"]
            val = a * x + b * y

            if op == "<=" and val > rhs + 0.01:
                is_feasible = False
                break
            elif op == ">=" and val < rhs - 0.01:
                is_feasible = False
                break

        if is_feasible:
            is_duplicate = False
            for c in corners:
                if abs(c["x"] - x) < 0.01 and abs(c["y"] - y) < 0.01:
                    is_duplicate = True
                    break
            if not is_duplicate:
                corners.append({"x": float(x), "y": float(y)})

    # Add Z value
    if objective_coeffs:
        a, b = objective_coeffs
        for c in corners:
            c["z"] = float(a * c["x"] + b * c["y"])

    return corners


# ============================================================
# OBJECTIVE LINE — 2 points where Z = ax + by intersects bounds
# ============================================================
def compute_objective_line(objective_coeffs, optimal_z, x_min, x_max, y_min, y_max):
    """Compute 2 points where the objective line Z = ax + by touches chart bounds."""
    a, b = objective_coeffs
    points = []

    if abs(b) > 1e-9:
        y_at_xmin = (optimal_z - a * x_min) / b
        if y_min - 0.01 <= y_at_xmin <= y_max + 0.01:
            points.append([x_min, y_at_xmin])

        y_at_xmax = (optimal_z - a * x_max) / b
        if y_min - 0.01 <= y_at_xmax <= y_max + 0.01:
            points.append([x_max, y_at_xmax])

    if abs(a) > 1e-9:
        x_at_ymin = (optimal_z - b * y_min) / a
        if x_min - 0.01 <= x_at_ymin <= x_max + 0.01:
            points.append([x_at_ymin, y_min])

        x_at_ymax = (optimal_z - b * y_max) / a
        if x_min - 0.01 <= x_at_ymax <= x_max + 0.01:
            points.append([x_at_ymax, y_max])

    unique_points = []
    for p in points:
        is_dup = False
        for q in unique_points:
            if abs(p[0] - q[0]) < 0.01 and abs(p[1] - q[1]) < 0.01:
                is_dup = True
                break
        if not is_dup:
            unique_points.append(p)

    return unique_points[:2] if len(unique_points) >= 2 else []


# ============================================================
# MAIN SOLVER
# ============================================================
def solve_linear_program(
    objective_coeffs: list,
    objective_type: str,
    constraints: list,
    x_min: float = 0,
    x_max: float = 100,
    y_min: float = 0,
    y_max: float = 100
) -> dict:
    try:
        # Auto-compute tight bounds
        tight_bounds = compute_tight_bounds(constraints)
        x_max = tight_bounds["x_max"]
        y_max = tight_bounds["y_max"]

        print(f"DEBUG: x_max = {x_max}, y_max = {y_max}")

        # --- 1. Solve using scipy ---
        c = np.array(objective_coeffs, dtype=float)

        if objective_type == "maximize":
            c_solve = -c
        else:
            c_solve = c

        A_ub = []
        b_ub = []
        constraint_lines = []

        for con in constraints:
            coeffs = con["coeffs"]
            op = con["op"]
            rhs = con["rhs"]

            if op == "<=":
                A_ub.append([coeffs[0], coeffs[1]])
                b_ub.append(rhs)
            elif op == ">=":
                A_ub.append([-coeffs[0], -coeffs[1]])
                b_ub.append(-rhs)

            constraint_lines.append({
                "coeffs": coeffs,
                "op": op,
                "rhs": rhs,
                "label": f"{coeffs[0]}x + {coeffs[1]}y {op} {rhs}"
            })

        # Solve WITHOUT upper bounds to detect unboundedness
        result_unbounded_check = linprog(
            c_solve,
            A_ub=np.array(A_ub) if A_ub else None,
            b_ub=np.array(b_ub) if b_ub else None,
            bounds=[(0, None), (0, None)],
            method="highs"
        )

        # ============================================================
        # UNBOUNDED CASE — Simple (only constraints + corners)
        # ============================================================
        if result_unbounded_check.status == 3:
            corner_points = compute_corner_points(
                constraints, x_min, x_max, y_min, y_max, objective_coeffs
            )

            best_corner = None
            if corner_points:
                if objective_type == "minimize":
                    best_corner = min(corner_points, key=lambda p: p.get("z", 0))
                else:
                    best_corner = max(corner_points, key=lambda p: p.get("z", 0))

            feasible_poly = compute_feasible_region_from_corners(corner_points)

            return {
                "type": "linear_programming",
                "chart_type": "line",
                "title": f"{objective_type.capitalize()} Z = {objective_coeffs[0]}x + {objective_coeffs[1]}y",
                "x_axis": {"label": "x"},
                "y_axis": {"label": "y"},
                "constraints": constraint_lines,
                "feasible_region": feasible_poly,
                "corner_points": corner_points,
                "optimal_point": best_corner,
                "objective": {
                    "coeffs": objective_coeffs,
                    "type": objective_type
                },
                "bounds": {
                    "x_min": x_min, "x_max": x_max,
                    "y_min": y_min, "y_max": y_max
                },
                "is_unbounded": True,
                "unbounded_message": "Feasible region is UNBOUNDED. Best corner shown for reference, but actual optimum does NOT exist.",
                "confidence": 0.95,
                "is_math": True
            }

        # ============================================================
        # INFEASIBLE CASE
        # ============================================================
        if result_unbounded_check.status == 2:
            return {
                "error": "The linear programming problem is INFEASIBLE. No solution satisfies all constraints.",
                "type": "infeasible"
            }

        # ============================================================
        # OTHER ERRORS
        # ============================================================
        if result_unbounded_check.status != 0:
            return {
                "error": f"LP solver error (status {result_unbounded_check.status}).",
                "type": "solver_error"
            }

        # ============================================================
        # BOUNDED CASE
        # ============================================================
        optimal_x, optimal_y = result_unbounded_check.x
        optimal_z = c[0] * optimal_x + c[1] * optimal_y

        corner_points = compute_corner_points(
            constraints, x_min, x_max, y_min, y_max, objective_coeffs
        )

        feasible_poly = compute_feasible_region_from_corners(corner_points)

        objective_line = compute_objective_line(
            objective_coeffs, optimal_z, x_min, x_max, y_min, y_max
        )

        return {
            "type": "linear_programming",
            "chart_type": "line",
            "title": f"{objective_type.capitalize()} Z = {objective_coeffs[0]}x + {objective_coeffs[1]}y",
            "x_axis": {"label": "x"},
            "y_axis": {"label": "y"},
            "constraints": constraint_lines,
            "feasible_region": feasible_poly,
            "corner_points": corner_points,
            "optimal_point": {
                "x": float(optimal_x),
                "y": float(optimal_y),
                "z": float(optimal_z)
            },
            "objective_line": {
                "points": objective_line,
                "z_value": float(optimal_z),
                "label": f"Z = {int(optimal_z)}"
            },
            "objective": {
                "coeffs": objective_coeffs,
                "type": objective_type
            },
            "bounds": {
                "x_min": x_min, "x_max": x_max,
                "y_min": y_min, "y_max": y_max
            },
            "confidence": 0.95,
            "is_math": True
        }

    except Exception as e:
        return {"error": f"LP solve error: {str(e)}"}


# ============================================================
# ENTRY POINT — Parse LLM data and solve
# ============================================================
def generate_lp_chart_spec(lp_data: dict) -> dict:
    """Generate LP chart spec from parsed LLM data."""
    try:
        objective = lp_data.get("objective", {})
        constraints = lp_data.get("constraints", [])
        bounds = lp_data.get("bounds", {})

        return solve_linear_program(
            objective_coeffs=objective.get("coeffs", [1, 1]),
            objective_type=objective.get("type", "maximize"),
            constraints=constraints,
            x_min=bounds.get("x_min", 0),
            x_max=bounds.get("x_max", 100),
            y_min=bounds.get("y_min", 0),
            y_max=bounds.get("y_max", 100)
        )
    except Exception as e:
        return {"error": f"LP parsing error: {str(e)}"}
import json
import requests
from datetime import datetime
from pathlib import Path

API_URL = "http://127.0.0.1:8000/generate-graph"
TIMEOUT = 30


def call_api(question: str):
    """Call backend API"""
    try:
        response = requests.post(
            API_URL,
            json={"question": question},
            timeout=TIMEOUT
        )
        if response.status_code == 429:
            return {"error": "rate_limit"}
        return response.json()
    except Exception as e:
        return {"error": str(e)}


def run_eval():
    # Load test questions
    script_dir = Path(__file__).parent
    with open(script_dir / "test_questions.json") as f:
        tests = json.load(f)

    results = {
        "total": len(tests),
        "valid": 0,
        "correct_type": 0,
        "rate_limited": 0,
        "failures": []
    }

    print(f"\n{'='*60}")
    print(f"🧪 Running Eval — {len(tests)} questions")
    print(f"{'='*60}\n")

    for i, test in enumerate(tests, 1):
        question = test["question"]
        expected = test["expected_type"]

        print(f"[{i}/{results['total']}] {question[:55]}...", end=" ")
        data = call_api(question)

        # Rate limit check
        if data.get("error") == "rate_limit":
            print("⏳ Rate limited")
            results["rate_limited"] += 1
            continue

        # Error check
        if "error" in data:
            print(f"❌ Error")
            results["failures"].append({
                "question": question,
                "expected": expected,
                "got": "error",
                "detail": data.get("error")
            })
            continue

        # Structural validity
        if data.get("chart_type"):
            results["valid"] += 1

            # Get acceptable alternatives
            acceptable = test.get("acceptable", [expected])

            # Chart type accuracy
            if data["chart_type"] in acceptable:
                results["correct_type"] += 1
                print(f"{data['chart_type']}")
            else:
                print(f"{data['chart_type']} (expected {expected})")
                results["failures"].append({
                    "question": question,
                    "expected": expected,
                    "acceptable": acceptable,
                    "got": data["chart_type"]
                })
        else:
            print("❌ Invalid JSON")
            results["failures"].append({
                "question": question,
                "expected": expected,
                "got": "invalid"
            })

    # Calculate metrics
    tested = results["total"] - results["rate_limited"]
    if tested == 0:
        print("\n All requests rate limited. Wait 60s and retry.")
        return

    sv = results["valid"] / tested * 100
    cta = results["correct_type"] / tested * 100
    vcs = 0.4 * sv + 0.6 * cta

    # Print report
    print(f"\n{'='*60}")
    print(f"📊 EVAL REPORT — {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print(f"{'='*60}")
    print(f"Total Questions:       {results['total']}")
    print(f"Tested (non-limited):  {tested}")
    print(f"Rate Limited:          {results['rate_limited']}")
    print(f"{'-'*60}")
    print(f"Valid JSON:            {results['valid']}/{tested}")
    print(f"Correct Chart Type:    {results['correct_type']}/{tested}")
    print(f"{'-'*60}")
    print(f"Structural Validity:   {sv:.1f}%")
    print(f"Chart Type Accuracy:   {cta:.1f}%")
    print(f"Overall VCS:           {vcs:.1f}%")
    print(f"{'='*60}")

    # Failures
    if results["failures"]:
        print(f"\n❌ Failures ({len(results['failures'])}):")
        for f in results["failures"][:10]:
            print(f"   • {f['question'][:50]}")
            print(f"     Expected: {f['expected']}, Got: {f['got']}")

    # Save report
    report_path = script_dir / f"report_{datetime.now().strftime('%Y%m%d_%H%M')}.json"
    with open(report_path, "w") as f:
        json.dump({
            "timestamp": datetime.now().isoformat(),
            "sv": sv,
            "cta": cta,
            "vcs": vcs,
            "results": results
        }, f, indent=2)
    print(f"\n Report saved: {report_path.name}")


if __name__ == "__main__":
    run_eval()
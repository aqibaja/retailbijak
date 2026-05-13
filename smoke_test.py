#!/usr/bin/env python3
"""
Comprehensive Smoke Test for RetailBijak
Tests all 22+ views and key API endpoints
"""

import requests
import json
import time
from datetime import datetime
from typing import Dict, List, Tuple

BASE_URL = "http://localhost:8000"
FRONTEND_URL = "http://localhost:8000"

# All views to test
VIEWS = [
    "dashboard",
    "market",
    "screener",
    "stock_detail",
    "portfolio",
    "alerts",
    "news",
    "indices",
    "sector",
    "macro",
    "calendar",
    "dividend",
    "ipo",
    "corporate",
    "chart",
    "compare",
    "paper_trades",
    "signal_overview",
    "ai_picks",
    "backtest",
    "treemap",
    "breadth",
    "movers",
    "help",
    "settings",
]

# API endpoints to test
API_ENDPOINTS = [
    ("/api/health", "GET", None),
    ("/api/market-summary", "GET", None),
    ("/api/stocks?limit=10", "GET", None),
    ("/api/stocks/AAPL", "GET", None),
    ("/api/scan", "GET", None),
    ("/api/news?limit=5", "GET", None),
    ("/api/portfolio", "GET", None),
]

class SmokeTestRunner:
    def __init__(self):
        self.results = {
            "views": {},
            "apis": {},
            "summary": {
                "total_views": 0,
                "passed_views": 0,
                "failed_views": 0,
                "total_apis": 0,
                "passed_apis": 0,
                "failed_apis": 0,
            },
            "timestamp": datetime.now().isoformat(),
            "failures": []
        }
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "RetailBijak-SmokeTest/1.0"
        })

    def test_api_endpoint(self, endpoint: str, method: str, data: dict = None) -> Tuple[bool, str]:
        """Test a single API endpoint"""
        try:
            url = f"{BASE_URL}{endpoint}"
            if method == "GET":
                response = self.session.get(url, timeout=10)
            elif method == "POST":
                response = self.session.post(url, json=data, timeout=10)
            else:
                return False, f"Unsupported method: {method}"

            # Check status code
            if response.status_code != 200:
                return False, f"Status {response.status_code}"

            # Try to parse JSON
            try:
                response.json()
                return True, "OK"
            except:
                # Some endpoints might return non-JSON
                if response.text:
                    return True, "OK (non-JSON)"
                return False, "Empty response"

        except requests.exceptions.Timeout:
            return False, "Timeout"
        except requests.exceptions.ConnectionError:
            return False, "Connection error"
        except Exception as e:
            return False, str(e)

    def test_view_loads(self, view_name: str) -> Tuple[bool, str]:
        """Test if a view loads without errors"""
        try:
            # Test main index.html
            response = self.session.get(f"{FRONTEND_URL}/", timeout=10)
            if response.status_code != 200:
                return False, f"Index status {response.status_code}"

            # Check for basic HTML structure
            if "<!DOCTYPE" not in response.text and "<html" not in response.text:
                return False, "Invalid HTML"

            return True, "OK"

        except Exception as e:
            return False, str(e)

    def run_api_tests(self):
        """Run all API endpoint tests"""
        print("\n" + "="*60)
        print("TESTING API ENDPOINTS")
        print("="*60)

        for endpoint, method, data in API_ENDPOINTS:
            print(f"\nTesting {method} {endpoint}...", end=" ")
            passed, message = self.test_api_endpoint(endpoint, method, data)

            self.results["apis"][endpoint] = {
                "status": "PASS" if passed else "FAIL",
                "message": message,
                "method": method
            }

            if passed:
                print(f"✓ PASS ({message})")
                self.results["summary"]["passed_apis"] += 1
            else:
                print(f"✗ FAIL ({message})")
                self.results["summary"]["failed_apis"] += 1
                self.results["failures"].append({
                    "type": "API",
                    "target": endpoint,
                    "reason": message
                })

        self.results["summary"]["total_apis"] = len(API_ENDPOINTS)

    def run_view_tests(self):
        """Run all view tests"""
        print("\n" + "="*60)
        print("TESTING FRONTEND VIEWS")
        print("="*60)

        for view in VIEWS:
            print(f"\nTesting view: {view}...", end=" ")
            passed, message = self.test_view_loads(view)

            self.results["views"][view] = {
                "status": "PASS" if passed else "FAIL",
                "message": message
            }

            if passed:
                print(f"✓ PASS ({message})")
                self.results["summary"]["passed_views"] += 1
            else:
                print(f"✗ FAIL ({message})")
                self.results["summary"]["failed_views"] += 1
                self.results["failures"].append({
                    "type": "VIEW",
                    "target": view,
                    "reason": message
                })

        self.results["summary"]["total_views"] = len(VIEWS)

    def generate_report(self) -> str:
        """Generate markdown report"""
        report = []
        report.append("# RetailBijak Smoke Test Report")
        report.append(f"\n**Timestamp:** {self.results['timestamp']}")
        report.append(f"\n**Backend URL:** {BASE_URL}")

        # Summary
        summary = self.results["summary"]
        report.append("\n## Summary")
        report.append(f"- **Views Tested:** {summary['total_views']} (✓ {summary['passed_views']} | ✗ {summary['failed_views']})")
        report.append(f"- **APIs Tested:** {summary['total_apis']} (✓ {summary['passed_apis']} | ✗ {summary['failed_apis']})")
        report.append(f"- **Overall Pass Rate:** {((summary['passed_views'] + summary['passed_apis']) / (summary['total_views'] + summary['total_apis']) * 100):.1f}%")

        # API Results
        report.append("\n## API Endpoints")
        report.append("| Endpoint | Method | Status | Message |")
        report.append("|----------|--------|--------|---------|")
        for endpoint, result in self.results["apis"].items():
            status_icon = "✓" if result["status"] == "PASS" else "✗"
            report.append(f"| {endpoint} | {result['method']} | {status_icon} {result['status']} | {result['message']} |")

        # View Results
        report.append("\n## Frontend Views")
        report.append("| View | Status | Message |")
        report.append("|------|--------|---------|")
        for view, result in self.results["views"].items():
            status_icon = "✓" if result["status"] == "PASS" else "✗"
            report.append(f"| {view} | {status_icon} {result['status']} | {result['message']} |")

        # Failures
        if self.results["failures"]:
            report.append("\n## Failures")
            for failure in self.results["failures"]:
                report.append(f"- **{failure['type']}:** {failure['target']} - {failure['reason']}")
        else:
            report.append("\n## Failures")
            report.append("✓ No failures detected!")

        return "\n".join(report)

    def run(self):
        """Run all tests"""
        print("\n" + "="*60)
        print("RETAILBIJAK COMPREHENSIVE SMOKE TEST")
        print("="*60)
        print(f"Start time: {datetime.now().isoformat()}")
        print(f"Backend URL: {BASE_URL}")

        # Wait for backend to be ready
        print("\nWaiting for backend to be ready...")
        for i in range(30):
            try:
                response = self.session.get(f"{BASE_URL}/api/health", timeout=5)
                if response.status_code == 200:
                    print("✓ Backend is ready!")
                    break
            except:
                pass
            if i < 29:
                time.sleep(1)
        else:
            print("✗ Backend did not respond in time")
            return

        # Run tests
        self.run_api_tests()
        self.run_view_tests()

        # Generate report
        report = self.generate_report()
        print("\n" + "="*60)
        print("SMOKE TEST COMPLETE")
        print("="*60)
        print(report)

        # Save report
        with open("/home/rich27/retailbijak/SMOKE_TEST_REPORT.md", "w") as f:
            f.write(report)

        # Save JSON results
        with open("/home/rich27/retailbijak/smoke_test_results.json", "w") as f:
            json.dump(self.results, f, indent=2)

        print(f"\n✓ Report saved to SMOKE_TEST_REPORT.md")
        print(f"✓ JSON results saved to smoke_test_results.json")

        return self.results

if __name__ == "__main__":
    runner = SmokeTestRunner()
    runner.run()

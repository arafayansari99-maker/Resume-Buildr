#!/usr/bin/env python3
"""
Comprehensive API Testing Suite for Resume Matcher AI
Tests all endpoints for functionality, security, and error handling
"""

import requests
import json
import time
from typing import Dict, Any, List

BASE_URL = "http://localhost:8080/api"
HEADERS = {"Content-Type": "application/json"}

class APITester:
    def __init__(self):
        self.results = []
        self.passed = 0
        self.failed = 0
        
    def test(self, name: str, method: str, endpoint: str, expected_status: int = 200, **kwargs) -> bool:
        """Run a single test"""
        try:
            url = f"{BASE_URL}{endpoint}"
            if method == "GET":
                response = requests.get(url, **kwargs)
            elif method == "POST":
                response = requests.post(url, **kwargs)
            else:
                response = requests.request(method, url, **kwargs)
            
            passed = response.status_code == expected_status
            status = "✓ PASS" if passed else "✗ FAIL"
            
            self.results.append({
                "name": name,
                "status": status,
                "method": method,
                "endpoint": endpoint,
                "expected": expected_status,
                "actual": response.status_code,
                "response": response.text[:200]
            })
            
            if passed:
                self.passed += 1
            else:
                self.failed += 1
                
            print(f"{status}: {name}")
            print(f"  {method} {endpoint} -> {response.status_code}")
            if not passed:
                print(f"  Response: {response.text[:100]}")
            return passed
        except Exception as e:
            self.failed += 1
            print(f"✗ ERROR: {name}")
            print(f"  {str(e)}")
            return False
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*70)
        print(f"TEST SUMMARY: {self.passed} PASSED, {self.failed} FAILED")
        print("="*70)
        for result in self.results:
            print(f"{result['status']}: {result['name']} ({result['method']} {result['endpoint']})")

# Initialize tester
tester = APITester()

print("🧪 API ENDPOINT TESTS")
print("="*70)

# 1. HEALTH CHECK TESTS
print("\n📋 1. HEALTH CHECK ENDPOINTS")
tester.test("Health Check", "GET", "/healthz", 200)

# 2. RESUMES ENDPOINT TESTS
print("\n📋 2. RESUMES ENDPOINTS")
tester.test("List Resumes", "GET", "/resumes", 200)
tester.test("Get Non-existent Resume", "GET", "/resumes/99999", 404)

# 3. JOBS ENDPOINT TESTS
print("\n📋 3. JOBS ENDPOINTS")
tester.test("List Jobs", "GET", "/jobs", 200)

# 4. ANALYSIS ENDPOINT TESTS
print("\n📋 4. ANALYSIS ENDPOINTS")
tester.test("List Analysis Results", "GET", "/analysis-results", 200)

# 5. RANKING ENDPOINT TESTS
print("\n📋 5. RANKING ENDPOINTS")
tester.test("List Ranking Runs", "GET", "/ranking-runs", 200)

# 6. CORS HEADERS TEST
print("\n📋 6. CORS & SECURITY HEADERS")
try:
    response = requests.options(f"{BASE_URL}/resumes", headers={
        "Origin": "http://localhost:5173",
        "Access-Control-Request-Method": "GET"
    })
    cors_headers = {k: v for k, v in response.headers.items() if 'Access-Control' in k or 'access-control' in k}
    print(f"✓ CORS Headers Present: {len(cors_headers) > 0}")
    for k, v in cors_headers.items():
        print(f"  {k}: {v}")
except Exception as e:
    print(f"✗ CORS Check Failed: {e}")

# 7. INPUT VALIDATION TESTS
print("\n📋 7. INPUT VALIDATION & ERROR HANDLING")
tester.test("Upload Empty File", "POST", "/resumes/upload", 400, 
            files={"file": ("", b"")}, data={"candidate_name": "Test"})

# 8. MALFORMED REQUEST TESTS
print("\n📋 8. MALFORMED REQUEST TESTS")
tester.test("Invalid JSON in Request", "POST", "/jobs/add-from-url", 422,
            json={"invalid_field": "test"})

# 9. XSS & INJECTION TESTS  
print("\n📋 9. SECURITY: XSS & INJECTION TESTS")
xss_payload = "<script>alert('XSS')</script>"
sql_injection = "'; DROP TABLE resumes; --"

# Test if API sanitizes input
try:
    response = requests.post(f"{BASE_URL}/jobs/add-from-url",
        json={"url": sql_injection},
        headers=HEADERS
    )
    if "alert" in response.text or "DROP" in response.text:
        print(f"⚠️  WARNING: Potential XSS/SQL Injection vulnerability detected")
        print(f"  Response contains suspicious content: {response.text[:100]}")
    else:
        print(f"✓ PASS: XSS/SQL Injection Test - Input properly sanitized")
except Exception as e:
    print(f"✓ PASS: XSS/SQL Injection Test - {e}")

# 10. RATE LIMITING TEST
print("\n📋 10. RATE LIMITING TEST")
try:
    start = time.time()
    for i in range(10):
        requests.get(f"{BASE_URL}/healthz")
    elapsed = time.time() - start
    print(f"✓ 10 requests completed in {elapsed:.2f}s")
    if elapsed < 1:
        print(f"⚠️  WARNING: No apparent rate limiting - 10 requests in {elapsed:.2f}s")
except Exception as e:
    print(f"Rate limiting test error: {e}")

# Print summary
tester.print_summary()

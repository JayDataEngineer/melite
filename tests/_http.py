"""Shared HTTP helper for live-gateway route tests.

tests/*_route.py files import this as hh (get/post) and read BASE
from the same env (TEST_GATEWAY_BASE) so the whole board hits one
server. Underscore prefix keeps unittest discovery from collecting it.
"""
import json
import os
import urllib.error
import urllib.request

BASE = os.environ.get("TEST_GATEWAY_BASE", "http://127.0.0.1:33081")
TIMEOUT = 10


def get(path):
    with urllib.request.urlopen(BASE + path, timeout=TIMEOUT) as r:
        return r.status, json.loads(r.read())


def post(path, body):
    req = urllib.request.Request(
        BASE + path, method="POST",
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()[:300]

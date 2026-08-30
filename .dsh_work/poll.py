import json, subprocess, sys, time

rid = sys.argv[1]
def status():
    body = json.dumps({"jsonrpc":"2.0","id":1,"method":"tools/call",
                       "params":{"name":"get_run_status","arguments":{"run_id":rid}}})
    out = subprocess.run(["curl","-s","-X","POST","http://127.0.0.1:18090/mcp/messages",
                          "-H","Content-Type: application/json","--data-binary",body,
                          "-m","15"], capture_output=True, text=True).stdout
    # repair the handler's triple-quoting quirk: ,"text":"""<escaped>"}]}}
    out = out.replace(',"text":"""', ',"text":"', 1)
    # repair the bare "id":method token the handler echoes
    out = out.replace('"id":method', '"id":1', 1)
    d = json.loads(out)
    txt = d["result"]["content"][0]["text"]
    if txt.startswith('"'):
        txt = json.loads(txt)          # unquote the embedded JSON string
    return json.loads(txt)

for i in range(120):
    try:
        s = status()
        st = s.get("status")
    except Exception as e:
        st = f"parse-error:{e}"
        s = {}
    print(f"{time.strftime('%H:%M:%S')} poll{i+1} status={st}", flush=True)
    if st in ("success","error","stopped","failed","done","completed"):
        print("FINAL:" + json.dumps(s)[:2000], flush=True)
        break
    time.sleep(10)

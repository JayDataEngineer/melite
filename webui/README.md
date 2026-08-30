# inference.cpp WebUI

Dashboard for monitoring the inference queue and managing subapps.

## Quick Start

```bash
cd webui
python3 server.py
```

Open http://localhost:8090

## Configuration

| Env Variable   | Default                  | Description                    |
|----------------|--------------------------|--------------------------------|
| WEBUI_PORT     | 8090                     | Dashboard port                 |
| GATEWAY_URL    | http://127.0.0.1:8080    | Gateway API base URL           |

## Subapps

Edit the SUBAPPS array in `static/index.html` to add/remove subapps.

Each entry:
```javascript
{
  id: 'comfyui',        // unique key
  name: 'ComfyUI',      // display name
  icon: '&#127912;',    // emoji
  url: 'http://localhost:8188',  // webui URL
  desc: '...',          // description
  port: 8188,           // port
  bg: '#1a1a2e'         // icon background
}
```

## Features

- **Queue Monitor**: Live view of asset requests with status badges
- **Subapp Cards**: See status, open webui links, start/stop controls
- **Auto-refresh**: Updates every 10 seconds
- **Activity Log**: Real-time events in the dashboard
- **Gateway Proxy**: Server proxies /v1/* API calls to the gateway

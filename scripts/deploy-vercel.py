#!/usr/bin/env python3
"""
StudySync — Direct Vercel Deployment via REST API
Script: scripts/deploy-vercel.py
Deploys the static site directly to Vercel and prints the live production URL.
"""

import os
import sys
import json
import urllib.request
import urllib.error
from pathlib import Path

def get_env_var(name):
    # Check OS env first
    if name in os.environ:
        return os.environ[name]
    # Check .env file
    env_file = Path(__file__).resolve().parent.parent / '.env'
    if env_file.exists():
        with open(env_file, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line.startswith(f"{name}="):
                    return line.split('=', 1)[1].strip().strip('"').strip("'")
    return None

def deploy():
    print("\n\033[1;36m========================================\033[0m")
    print("\033[1;36m   StudySync — Vercel Deployer\033[0m")
    print("\033[1;36m========================================\033[0m\n")

    token = get_env_var("VERCEL_TOKEN")
    if not token or token == "your_vercel_token_here":
        print("\033[33mNotice: VERCEL_TOKEN not found in environment or .env\033[0m\n")
        print("To deploy automatically via this script:")
        print("1. Go to https://vercel.com/account/tokens and create an Access Token")
        print("2. Set your token:")
        print("   $env:VERCEL_TOKEN=\"your_token_here\" (PowerShell)")
        print("   OR add VERCEL_TOKEN=your_token_here to .env")
        print("3. Re-run: python scripts/deploy-vercel.py\n")
        return False

    project_dir = Path(__file__).resolve().parent.parent
    files_to_deploy = ["index.html", "style.css", "app.js", "vercel.json"]

    payload_files = []
    for fname in files_to_deploy:
        fpath = project_dir / fname
        if fpath.exists():
            with open(fpath, "r", encoding="utf-8") as f:
                content = f.read()
            payload_files.append({
                "file": fname,
                "data": content
            })

    body_data = {
        "name": "studysync-dashboard",
        "files": payload_files,
        "projectSettings": {
            "framework": None
        }
    }

    req = urllib.request.Request(
        "https://api.vercel.com/v13/deployments",
        data=json.dumps(body_data).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        },
        method="POST"
    )

    print("Uploading project assets to Vercel...")
    try:
        with urllib.request.urlopen(req) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            live_url = f"https://{res_data.get('url')}"
            print("\n\033[1;32m🎉 Successfully deployed to Vercel!\033[0m")
            print(f"\033[1;32m👉 Live URL: {live_url}\033[0m\n")
            return True
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8')
        print(f"\033[31mDeployment failed (HTTP {e.code}): {error_body}\033[0m\n")
        return False

if __name__ == "__main__":
    deploy()

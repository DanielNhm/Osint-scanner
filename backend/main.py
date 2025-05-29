from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import subprocess
import sys
import os
import uuid
import csv

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

task_results = {}
history = []

class HarvesterRequest(BaseModel):
    domain: str
    engine: str = "bing"

class AmassRequest(BaseModel):
    domain: str

class CombinedRequest(BaseModel):
    domain: str
    engine: str = "bing"

@app.post("/scan")
def scan_harvester(request: HarvesterRequest):
    try:
        env = os.environ.copy()
        env["XDG_CONFIG_HOME"] = "C:\\theHarvesterData"
        result = subprocess.run(
            [sys.executable, "theHarvester/theHarvester.py", "-d", request.domain, "-b", request.engine],
            capture_output=True,
            text=True,
            env=env
        )
        record = {
            "type": "harvester",
            "domain": request.domain,
            "engine": request.engine,
            "output": result.stdout,
            "error": result.stderr
        }
        history.append(record)
        return {"output": result.stdout, "error": result.stderr}
    except Exception as e:
        return {"error": str(e)}

@app.post("/amass")
def scan_amass(request: AmassRequest, background_tasks: BackgroundTasks):
    task_id = str(uuid.uuid4())
    task_results[task_id] = {"status": "running"}
    background_tasks.add_task(run_amass, request.domain, task_id)
    return {"task_id": task_id, "status": "started"}

@app.get("/amass/status/{task_id}")
def amass_status(task_id: str):
    return task_results.get(task_id, {"error": "Invalid task ID"})

def run_amass(domain: str, task_id: str):
    try:
        amass_path = "amass.exe"
        result = subprocess.run(
            [amass_path, "enum", "-d", domain],
            capture_output=True,
            text=True,
        )
        task_results[task_id] = {
            "status": "completed",
            "output": result.stdout,
            "error": result.stderr
        }
        record = {
            "type": "amass",
            "domain": domain,
            "output": result.stdout,
            "error": result.stderr
        }
        history.append(record)
    except Exception as e:
        task_results[task_id] = {
            "status": "failed",
            "error": str(e)
        }

@app.post("/scan/all")
def scan_both(request: CombinedRequest, background_tasks: BackgroundTasks):
    task_id = str(uuid.uuid4())
    task_results[task_id] = {"status": "running"}
    background_tasks.add_task(run_both_tools, request.domain, request.engine, task_id)
    return {"task_id": task_id, "status": "started"}

@app.get("/scan/all/status/{task_id}")
def scan_both_status(task_id: str):
    return task_results.get(task_id, {"error": "Invalid task ID"})

def run_both_tools(domain: str, engine: str, task_id: str):
    try:
        env = os.environ.copy()
        env["XDG_CONFIG_HOME"] = "C:\\theHarvesterData"
        harvester_proc = subprocess.run(
            [sys.executable, "theHarvester/theHarvester.py", "-d", domain, "-b", engine],
            capture_output=True,
            text=True,
            env=env
        )
        amass_proc = subprocess.run(
            ["amass.exe", "enum", "-d", domain],
            capture_output=True,
            text=True,
        )
        task_results[task_id] = {
            "status": "completed",
            "harvester_output": harvester_proc.stdout,
            "harvester_error": harvester_proc.stderr,
            "amass_output": amass_proc.stdout,
            "amass_error": amass_proc.stderr
        }
        record = {
            "type": "both",
            "domain": domain,
            "engine": engine,
            "harvester_output": harvester_proc.stdout,
            "harvester_error": harvester_proc.stderr,
            "amass_output": amass_proc.stdout,
            "amass_error": amass_proc.stderr
        }
        history.append(record)
    except Exception as e:
        task_results[task_id] = {
            "status": "failed",
            "error": str(e)
        }

@app.get("/history")
def get_history():
    return history

@app.post("/history/export")
def export_history():
    try:
        with open("history_export.csv", "w", newline='', encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=set().union(*[d.keys() for d in history]))
            writer.writeheader()
            writer.writerows(history)
        return {"status": "exported", "filename": "history_export.csv"}
    except Exception as e:
        return {"status": "failed", "error": str(e)}

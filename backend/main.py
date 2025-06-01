# API Contract (JSON over HTTP):

# POST /scan
# Request Body:
# {
#   "domain": "example.com",
#   "engine": "bing"
# }
# → Runs theHarvester scan.

# POST /amass
# Request Body:
# {
#   "domain": "example.com"
# }
# → Runs Amass scan.

# POST /scan/all
# Request Body:
# {
#   "domain": "example.com",
#   "engine": "bing"
# }
# → Runs both tools concurrently.

# GET /amass/status/{task_id}
# → Returns status & result for Amass.

# GET /scan/all/status/{task_id}
# → Returns status & results for both tools.

# GET /history
# → Returns scan history.

# DELETE /history
# → Clears scan history.

# POST /history/export
# → Exports scan history as CSV.

# All responses are in JSON format.

# API Contract (JSON over HTTP):

# main.py

from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import subprocess
import asyncio
import sys
import os
import uuid
import csv
import json
import logging
from datetime import datetime
from abc import ABC, abstractmethod
from openpyxl import Workbook

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger = logging.getLogger("scanner")
logger.setLevel(logging.INFO)
handler = logging.StreamHandler()
handler.setFormatter(logging.Formatter(
    '{"time": "%(asctime)s", "level": "%(levelname)s", "scan_id": "%(scan_id)s", "message": "%(message)s"}'
))
logger.addHandler(handler)

HISTORY_FILE = "scan_history.json"
task_results = {}
history = []

def load_history():
    global history
    if os.path.exists(HISTORY_FILE):
        with open(HISTORY_FILE, "r", encoding="utf-8") as f:
            history = json.load(f)

def save_history():
    with open(HISTORY_FILE, "w", encoding="utf-8") as f:
        json.dump(history, f, ensure_ascii=False, indent=2)

load_history()

class HarvesterRequest(BaseModel):
    domain: str
    engine: str = "bing"

class AmassRequest(BaseModel):
    domain: str

class CombinedRequest(BaseModel):
    domain: str
    engine: str = "bing"

class Scanner(ABC):
    @abstractmethod
    def run(self, domain: str, **kwargs):
        pass

class HarvesterScanner(Scanner):
    def run(self, domain: str, **kwargs):
        engine = kwargs.get("engine", "bing")
        env = os.environ.copy()
        env["XDG_CONFIG_HOME"] = "C:\\theHarvesterData"
        result = subprocess.run([
            sys.executable, "theHarvester/theHarvester.py", "-d", domain, "-b", engine
        ], capture_output=True, text=True, env=env)
        return {
            "output": result.stdout,
            "error": result.stderr
        }

class AmassScanner(Scanner):
    def run(self, domain: str, **kwargs):
        output_file = kwargs.get("output_file", f"amass_output.txt")
        result = subprocess.run([
            "amass", "enum", "-passive", "-d", domain, "-o", output_file
        ], capture_output=True, text=True)
        output = ""
        if os.path.exists(output_file):
            with open(output_file, "r", encoding="utf-8", errors="ignore") as f:
                output = f.read()
            os.remove(output_file)
        return {
            "output": output or "No results found.",
            "error": result.stderr
        }

class ScannerFactory:
    @staticmethod
    def create(scanner_type: str) -> Scanner:
        if scanner_type == "harvester":
            return HarvesterScanner()
        elif scanner_type == "amass":
            return AmassScanner()
        raise ValueError("Unknown scanner type")

@app.post("/scan")
def scan_harvester(request: HarvesterRequest):
    scan_id = str(uuid.uuid4())
    try:
        start = datetime.utcnow().isoformat()
        scanner = ScannerFactory.create("harvester")
        result = scanner.run(request.domain, engine=request.engine)
        end = datetime.utcnow().isoformat()
        record = {
            "scan_id": scan_id, "type": "harvester", "domain": request.domain, "engine": request.engine,
            "output": result["output"], "error": result["error"], "start_time": start, "end_time": end
        }
        history.append(record)
        save_history()
        logger.info("Harvester completed", extra={"scan_id": scan_id})
        return record
    except Exception as e:
        logger.error(f"Harvester failed: {str(e)}", extra={"scan_id": scan_id})
        return {"error": str(e)}

@app.post("/amass")
async def scan_amass(request: AmassRequest):
    task_id = str(uuid.uuid4())
    task_results[task_id] = {"status": "running"}
    asyncio.create_task(run_amass(request.domain, task_id))
    return {"task_id": task_id, "status": "started"}

@app.get("/amass/status/{task_id}")
def amass_status(task_id: str):
    return task_results.get(task_id, {"error": "Invalid task ID"})

@app.post("/both")
async def scan_both(request: CombinedRequest):
    task_id = str(uuid.uuid4())
    task_results[task_id] = {"status": "running"}
    asyncio.create_task(run_both_scans(request.domain, request.engine, task_id))
    return {"task_id": task_id, "status": "started"}

@app.get("/both/status/{task_id}")
def both_status(task_id: str):
    return task_results.get(task_id, {"error": "Invalid task ID"})

async def run_amass(domain: str, task_id: str):
    try:
        start = datetime.utcnow().isoformat()
        output_file = f"amass_output_{task_id}.txt"
        scanner = ScannerFactory.create("amass")
        result = await asyncio.to_thread(scanner.run, domain, output_file=output_file)
        end = datetime.utcnow().isoformat()
        task_results[task_id] = {
            "status": "completed", "output": result["output"], "error": result["error"]
        }
        history.append({
            "scan_id": task_id, "type": "amass", "domain": domain,
            "output": result["output"], "error": result["error"],
            "start_time": start, "end_time": end
        })
        save_history()
        logger.info("Amass completed", extra={"scan_id": task_id})
    except Exception as e:
        task_results[task_id] = {"status": "failed", "error": str(e)}
        logger.error(f"Amass failed: {str(e)}", extra={"scan_id": task_id})

async def run_both_scans(domain: str, engine: str, task_id: str):
    try:
        start = datetime.utcnow().isoformat()
        harvester = ScannerFactory.create("harvester")
        amass = ScannerFactory.create("amass")

        harvester_task = asyncio.to_thread(harvester.run, domain, engine=engine)
        amass_task = asyncio.to_thread(amass.run, domain, output_file=f"amass_output_{task_id}.txt")

        harvester_result = await harvester_task
        task_results[task_id].update({
            "harvester_output": harvester_result["output"],
            "harvester_error": harvester_result["error"]
        })

        amass_result = await amass_task
        task_results[task_id].update({
            "amass_output": amass_result["output"],
            "amass_error": amass_result["error"],
            "status": "completed"
        })

        end = datetime.utcnow().isoformat()
        history.append({
            "scan_id": task_id, "type": "both", "domain": domain, "engine": engine,
            **task_results[task_id], "start_time": start, "end_time": end
        })
        save_history()
        logger.info("Both completed", extra={"scan_id": task_id})
    except Exception as e:
        task_results[task_id] = {"status": "failed", "error": str(e)}
        logger.error(f"Both failed: {str(e)}", extra={"scan_id": task_id})

@app.get("/history")
def get_history():
    return history

@app.delete("/history")
def clear_history():
    history.clear()
    save_history()
    return {"status": "cleared"}

@app.post("/history/export")
def export_csv():
    try:
        with open("history_export.csv", "w", newline='', encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=set().union(*[d.keys() for d in history]))
            writer.writeheader()
            writer.writerows(history)
        return {"status": "exported", "filename": "history_export.csv"}
    except Exception as e:
        return {"status": "failed", "error": str(e)}

@app.post("/history/export/xlsx")
def export_xlsx():
    try:
        wb = Workbook()
        ws = wb.active
        ws.title = "Scan History"
        headers = list(set().union(*[d.keys() for d in history]))
        ws.append(headers)
        for record in history:
            ws.append([record.get(k, '') for k in headers])
        filename = "history_export.xlsx"
        wb.save(filename)
        return {"status": "exported", "filename": filename}
    except Exception as e:
        return {"status": "failed", "error": str(e)}

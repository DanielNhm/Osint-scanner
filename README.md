# OSINT Scanner

This is a full-stack OSINT (Open Source Intelligence) application for domain reconnaissance. It integrates theHarvester and Amass tools into a unified web interface using a FastAPI backend and a React frontend.

## Quick Start

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/osint-scanner.git
   ```
2. Build the containers:
   ```bash
   cd osint-scanner
   docker compose build
   ```
3. Start the application:
   ```bash
   docker compose up
   ```

## Overview

The OSINT Scanner allows users to run domain-based scans using two major passive reconnaissance tools:

- **theHarvester**: Gathers emails, names, subdomains, IPs, and URLs using public sources.
- **Amass**: Performs passive subdomain enumeration.

Scans can be executed individually or simultaneously. Results are stored in a local JSON history and can be exported as CSV or Excel (XLSX) files.

## Features

- FastAPI backend (Python 3)
- React frontend with real-time status updates
- Background task execution with polling
- JSON logging with meaningful log levels and traceable scan IDs
- Export to `.csv` and `.xlsx`
- Secure subprocess execution (no shell injection risks)
- Fully Dockerized

## Project Structure

```
osint-scanner/
├── backend/
│   ├── main.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   └── package.json
├── docker-compose.yml
├── Dockerfile.backend
├── Dockerfile.frontend
├── README.md
└── answers.md
```

## API Contract (JSON over HTTP)

### POST /scan
Runs a theHarvester scan.

### POST /amass
Runs an Amass scan asynchronously.

### POST /both
Runs both tools in parallel.

### GET /amass/status/{task_id}
Returns the status and result of an Amass scan.

### GET /both/status/{task_id}
Returns the status and results of the combined scan.

### GET /history
Returns a list of all past scans.

### POST /history/export
Exports history as CSV.

### POST /history/export/xlsx
Exports history as Excel (XLSX).

### DELETE /history
Clears the scan history.

## Logging

Logs are structured in JSON format and include:

- Timestamps
- Log level (INFO, ERROR)
- `scan_id` for traceability
- Descriptive messages

## Security

- All subprocess executions use `subprocess.run()` or `asyncio.to_thread()` safely.
- No use of `shell=True`.
- User input is never passed directly to the shell.

## License

This project is open-source and free to use under the MIT License.

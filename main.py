# Small wrapper to expose ASGI app for uvicorn
from backend.backend import app

# Now you can run: uvicorn main:app --reload --host 0.0.0.0 --port 8000

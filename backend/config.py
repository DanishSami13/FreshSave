import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "database", "freshsave.db")

SECRET_KEY = "freshsave_secret_key"
"""Reset the application schema before the first multi-user deployment.

Run once with the production DATABASE_URL and CONFIRM_RESET=YES. Do not leave
the confirmation variable enabled in a deployment environment.
"""

import os

from dotenv import load_dotenv

load_dotenv()

from database import Base, create_tables, engine


if os.getenv("CONFIRM_RESET") != "YES":
    raise SystemExit("Set CONFIRM_RESET=YES to permanently delete all application data.")

Base.metadata.drop_all(bind=engine)
create_tables()
print("Application database reset and empty schema created.")
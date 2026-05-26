import os
from motor.motor_asyncio import AsyncIOMotorClient

mongo_url = os.environ["MONGO_URL"]
_client = AsyncIOMotorClient(mongo_url)
db = _client[os.environ["DB_NAME"]]

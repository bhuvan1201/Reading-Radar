import os

import clickhouse_connect
import psycopg2
import psycopg2.extras

POSTGRES_DSN = os.environ.get(
    "POSTGRES_DSN", "postgresql://reading_radar:reading_radar@localhost:5432/reading_radar"
)
CLICKHOUSE_HOST = os.environ.get("CLICKHOUSE_HOST", "localhost")
CLICKHOUSE_PORT = int(os.environ.get("CLICKHOUSE_PORT", "8123"))
CLICKHOUSE_USER = os.environ.get("CLICKHOUSE_USER", "default")
CLICKHOUSE_PASSWORD = os.environ.get("CLICKHOUSE_PASSWORD", "reading_radar")
CLICKHOUSE_DATABASE = os.environ.get("CLICKHOUSE_DATABASE", "reading_radar")
# ClickHouse Cloud serves HTTPS on 8443 and requires secure=True; local Docker uses
# plain HTTP on 8123. Set CLICKHOUSE_SECURE=true (and CLICKHOUSE_PORT=8443) for Cloud.
CLICKHOUSE_SECURE = os.environ.get("CLICKHOUSE_SECURE", "false").lower() == "true"


def get_pg_conn():
    conn = psycopg2.connect(POSTGRES_DSN)
    conn.cursor_factory = psycopg2.extras.RealDictCursor
    return conn


def get_ch_client():
    return clickhouse_connect.get_client(
        host=CLICKHOUSE_HOST,
        port=CLICKHOUSE_PORT,
        username=CLICKHOUSE_USER,
        password=CLICKHOUSE_PASSWORD,
        database=CLICKHOUSE_DATABASE,
        secure=CLICKHOUSE_SECURE,
    )

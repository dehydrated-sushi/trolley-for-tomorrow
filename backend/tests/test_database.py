from core.database import db
from sqlalchemy import text


def test_db_instance_is_sqlalchemy(app):
    assert db is not None
    assert hasattr(db, "session")
    assert hasattr(db, "Model")


def test_db_connection_works(app):
    with app.app_context():
        result = db.session.execute(text("SELECT 1")).scalar()
        assert result == 1


def test_db_create_and_query_table(app):
    with app.app_context():
        db.session.execute(text("CREATE TABLE test_table (id INTEGER PRIMARY KEY, name TEXT)"))
        db.session.execute(text("INSERT INTO test_table (id, name) VALUES (1, 'test')"))
        db.session.commit()

        row = db.session.execute(text("SELECT name FROM test_table WHERE id = 1")).scalar()
        assert row == "test"

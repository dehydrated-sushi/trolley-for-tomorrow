from datetime import datetime
from core.database import db


class ReceiptItem(db.Model):
    __tablename__ = "receipt_items"

    id = db.Column(db.Integer, primary_key=True)
    receipt_filename = db.Column(db.String(255), nullable=False)
    receipt_path = db.Column(db.String(500), nullable=False)

    name = db.Column(db.String(255), nullable=False)
    qty = db.Column(db.String(50), nullable=False, default="1")
    price = db.Column(db.Float, nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "receipt_filename": self.receipt_filename,
            "receipt_path": self.receipt_path,
            "name": self.name,
            "qty": self.qty,
            "price": self.price,
            "created_at": self.created_at.isoformat()
        }
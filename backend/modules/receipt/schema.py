from datetime import datetime
from core.database import db
from sqlalchemy import text


class Receipt(db.Model):
    __tablename__ = "receipts"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, nullable=False, default=1)
    original_filename = db.Column(db.String(255), nullable=False)
    stored_file_path = db.Column(db.String(500), nullable=True)
    scan_source = db.Column(db.String(50), nullable=False, default="upload")
    store_name = db.Column(db.String(255), nullable=True)
    purchase_date = db.Column(db.Date, nullable=True)
    scan_status = db.Column(db.String(50), nullable=False, default="uploaded")
    raw_ocr_text = db.Column(db.Text, nullable=True)
    parser_version = db.Column(db.String(50), nullable=True)
    item_count = db.Column(db.Integer, nullable=False, default=0)
    total_amount = db.Column(db.Float, nullable=True)
    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        server_default=text("CURRENT_TIMESTAMP"),
        nullable=False,
    )
    updated_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        server_default=text("CURRENT_TIMESTAMP"),
        nullable=False,
    )

    items = db.relationship("ReceiptItem", back_populates="receipt", lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "original_filename": self.original_filename,
            "stored_file_path": self.stored_file_path,
            "scan_source": self.scan_source,
            "store_name": self.store_name,
            "purchase_date": self.purchase_date.isoformat() if self.purchase_date else None,
            "scan_status": self.scan_status,
            "raw_ocr_text": self.raw_ocr_text,
            "parser_version": self.parser_version,
            "item_count": self.item_count,
            "total_amount": self.total_amount,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }


class ReceiptItem(db.Model):
    __tablename__ = "receipt_items"

    id = db.Column(db.Integer, primary_key=True)
    receipt_id = db.Column(db.Integer, db.ForeignKey("receipts.id"), nullable=True)
    receipt_filename = db.Column(db.String(255), nullable=False)
    receipt_path = db.Column(db.String(500), nullable=False)

    name = db.Column(db.String(255), nullable=False)
    qty = db.Column(db.String(50), nullable=False, default="1")
    price = db.Column(db.Float, nullable=True)

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        server_default=text("CURRENT_TIMESTAMP"),
        nullable=False,
    )

    receipt = db.relationship("Receipt", back_populates="items")

    def to_dict(self):
        return {
            "id": self.id,
            "receipt_id": self.receipt_id,
            "receipt_filename": self.receipt_filename,
            "receipt_path": self.receipt_path,
            "name": self.name,
            "qty": self.qty,
            "price": self.price,
            "created_at": self.created_at.isoformat()
        }

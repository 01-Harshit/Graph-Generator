# ============================================================
# models.py — SQLAlchemy database models
# ============================================================

from sqlalchemy import Column, String, Text, Float, Boolean, DateTime, Integer
from sqlalchemy.dialects.postgresql import UUID, JSONB
from datetime import datetime
import uuid

from database import Base


# ============================================================
# GRAPHS TABLE — Stores every generated chart
# ============================================================
class Graph(Base):
    __tablename__ = "graphs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    question = Column(Text, nullable=False)            # For display
    question_normalized = Column(Text, nullable=True, index=True)  # For Normalized
    chart_spec = Column(JSONB, nullable=False)
    chart_type = Column(String(50), nullable=True)
    confidence = Column(Float, nullable=True)
    is_math = Column(Boolean, default=False)
    is_unbounded = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": str(self.id),
            "question": self.question,
            "chart_spec": self.chart_spec,
            "chart_type": self.chart_type,
            "confidence": self.confidence,
            "is_math": self.is_math,
            "is_unbounded": self.is_unbounded,
            "created_at": self.created_at.isoformat() + "Z" if self.created_at else None,
        }
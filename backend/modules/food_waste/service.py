from __future__ import annotations

import re
import threading
import uuid
from pathlib import Path
from typing import Any

import cv2
import numpy as np
from PIL import Image, UnidentifiedImageError
from ultralytics import YOLO
from werkzeug.datastructures import FileStorage
from werkzeug.utils import secure_filename


class FoodWasteServiceError(Exception):
    """Raised when validation or inference fails in a user-safe way."""


class FoodWasteService:
    def __init__(self, model_path: Path, predictions_dir: Path, temp_upload_dir: Path) -> None:
        self.model_path = Path(model_path)
        self.predictions_dir = Path(predictions_dir)
        self.temp_upload_dir = Path(temp_upload_dir)
        self.allowed_extensions = {"jpg", "jpeg", "png", "webp"}
        self._prediction_lock = threading.Lock()

        self.predictions_dir.mkdir(parents=True, exist_ok=True)
        self.temp_upload_dir.mkdir(parents=True, exist_ok=True)

        if not self.model_path.exists():
            raise RuntimeError(f"YOLO model not found at {self.model_path}")

        self.model = YOLO(str(self.model_path))
        self.class_names = self._normalize_model_names(self.model.names)

    def predict(self, image_file: FileStorage) -> dict[str, Any]:
        temp_file_path = self._save_temp_upload(image_file)

        try:
            with self._prediction_lock:
                results = self.model.predict(
                    source=str(temp_file_path),
                    verbose=False,
                    save=False,
                    imgsz=640,
                    device="cpu",
                )
        except Exception as exc:
            raise FoodWasteServiceError(f"Model inference failed: {exc}") from exc
        finally:
            temp_file_path.unlink(missing_ok=True)

        if not results:
            raise FoodWasteServiceError("The model did not return any prediction results.")

        result = results[0]
        image_height, image_width = result.orig_shape
        image_area = float(image_height * image_width)

        detections = self._extract_detections(result, image_area)
        if not detections:
            raise FoodWasteServiceError("No objects were detected in the uploaded image.")

        class_area_map = self._build_class_area_map(result, image_height, image_width)
        summary = self._build_summary(detections, image_area, class_area_map)
        annotated_image_name = self._save_annotated_image(result)

        return {
            "success": True,
            "food_percentage": round(summary["food_percentage"], 2),
            "empty_percentage": round(summary["empty_percentage"], 2),
            "predicted_class": summary["predicted_class"],
            "confidence": round(summary["confidence"], 4) if summary["confidence"] is not None else None,
            "annotated_image_name": annotated_image_name,
            "detections": detections,
            "model_classes": list(self.class_names.values()),
        }

    def _save_temp_upload(self, image_file: FileStorage) -> Path:
        original_name = secure_filename(image_file.filename or "")
        extension = Path(original_name).suffix.lower().lstrip(".")

        if not original_name or extension not in self.allowed_extensions:
            raise FoodWasteServiceError("Only .jpg, .jpeg, .png, and .webp files are allowed.")

        temp_filename = f"{uuid.uuid4().hex}_{original_name}"
        temp_path = self.temp_upload_dir / temp_filename
        image_file.save(temp_path)

        try:
            with Image.open(temp_path) as uploaded_image:
                detected_format = (uploaded_image.format or "").lower()
                uploaded_image.verify()
        except (UnidentifiedImageError, OSError) as exc:
            temp_path.unlink(missing_ok=True)
            raise FoodWasteServiceError("The uploaded file is not a valid image.") from exc

        if detected_format not in self.allowed_extensions:
            temp_path.unlink(missing_ok=True)
            raise FoodWasteServiceError("Image content must be jpg, jpeg, png, or webp.")

        return temp_path

    def _extract_detections(self, result: Any, image_area: float) -> list[dict[str, Any]]:
        boxes = result.boxes
        masks = getattr(result, "masks", None)
        mask_polygons = masks.xy if masks is not None and getattr(masks, "xy", None) is not None else None

        if boxes is None or len(boxes) == 0:
            return []

        detections: list[dict[str, Any]] = []
        classes = boxes.cls.cpu().numpy().astype(int)
        confidences = boxes.conf.cpu().numpy()
        coordinates = boxes.xyxy.cpu().numpy()

        for index, class_id in enumerate(classes):
            class_name = self.class_names.get(class_id, str(class_id))
            confidence = float(confidences[index])
            x1, y1, x2, y2 = coordinates[index].tolist()

            mask_area = 0.0
            if mask_polygons is not None and index < len(mask_polygons):
                polygon = np.asarray(mask_polygons[index], dtype=np.float32)
                if len(polygon) >= 3:
                    mask_area = float(cv2.contourArea(polygon))

            detections.append(
                {
                    "class_id": int(class_id),
                    "class_name": class_name,
                    "confidence": round(confidence, 4),
                    "bbox": {
                        "x1": round(float(x1), 2),
                        "y1": round(float(y1), 2),
                        "x2": round(float(x2), 2),
                        "y2": round(float(y2), 2),
                    },
                    "mask_area": round(mask_area, 2),
                    "mask_percentage": round((mask_area / image_area) * 100, 2) if mask_area > 0 else 0.0,
                }
            )

        return detections

    def _build_summary(
        self,
        detections: list[dict[str, Any]],
        image_area: float,
        class_area_map: dict[str, float],
    ) -> dict[str, Any]:
        top_detection = max(detections, key=lambda item: item["confidence"])
        class_names = {
            self._canonical_class_name(detection["class_name"])
            for detection in detections
        }

        if {"food", "plate", "empty_space"} & class_names:
            return self._summarize_food_plate_mode(class_area_map, image_area, top_detection)

        if class_names and all(name.endswith("_percent") for name in class_names):
            return self._summarize_percentage_class_mode(class_area_map, image_area, top_detection)

        return {
            "food_percentage": top_detection["mask_percentage"],
            "empty_percentage": max(0.0, 100.0 - top_detection["mask_percentage"]),
            "predicted_class": top_detection["class_name"],
            "confidence": top_detection["confidence"],
        }

    def _summarize_food_plate_mode(
        self,
        class_area_map: dict[str, float],
        image_area: float,
        top_detection: dict[str, Any],
    ) -> dict[str, Any]:
        food_area = class_area_map.get("food", 0.0)
        empty_area = class_area_map.get("empty_space", 0.0)
        plate_area = class_area_map.get("plate", 0.0)

        reference_area = plate_area if plate_area > 0 else image_area
        food_percentage = (food_area / reference_area) * 100 if reference_area else 0.0
        empty_percentage = (empty_area / reference_area) * 100 if reference_area else 0.0

        return {
            "food_percentage": min(food_percentage, 100.0),
            "empty_percentage": min(empty_percentage, 100.0),
            "predicted_class": top_detection["class_name"],
            "confidence": top_detection["confidence"],
        }

    def _summarize_percentage_class_mode(
        self,
        class_area_map: dict[str, float],
        image_area: float,
        top_detection: dict[str, Any],
    ) -> dict[str, Any]:
        derived_food_percentage = self._parse_percentage_from_class_name(top_detection["class_name"])
        class_mask_area = class_area_map.get(top_detection["class_name"].lower(), 0.0)
        mask_percentage = (class_mask_area / image_area) * 100 if class_mask_area > 0 and image_area else 0.0

        if mask_percentage > 0:
            food_percentage = mask_percentage
        else:
            food_percentage = float(derived_food_percentage or 0.0)

        empty_percentage = max(0.0, 100.0 - food_percentage)

        return {
            "food_percentage": min(food_percentage, 100.0),
            "empty_percentage": min(empty_percentage, 100.0),
            "predicted_class": top_detection["class_name"],
            "confidence": top_detection["confidence"],
        }

    def _build_class_area_map(self, result: Any, image_height: int, image_width: int) -> dict[str, float]:
        boxes = result.boxes
        masks = getattr(result, "masks", None)
        mask_polygons = masks.xy if masks is not None and getattr(masks, "xy", None) is not None else None

        if boxes is None or len(boxes) == 0 or mask_polygons is None:
            return {}

        class_union_masks: dict[str, np.ndarray] = {}
        classes = boxes.cls.cpu().numpy().astype(int)

        for index, class_id in enumerate(classes):
            if index >= len(mask_polygons):
                continue

            polygon = np.asarray(mask_polygons[index], dtype=np.float32)
            if len(polygon) < 3:
                continue

            class_name = self.class_names.get(class_id, str(class_id)).lower()
            class_name = self._canonical_class_name(class_name)
            union_mask = class_union_masks.setdefault(
                class_name,
                np.zeros((image_height, image_width), dtype=np.uint8),
            )
            points = np.round(polygon).astype(np.int32)
            cv2.fillPoly(union_mask, [points], 1)

        return {
            class_name: float(mask.sum())
            for class_name, mask in class_union_masks.items()
        }

    def _save_annotated_image(self, result: Any) -> str:
        annotated_frame = result.plot()
        annotated_name = f"{uuid.uuid4().hex}.jpg"
        annotated_path = self.predictions_dir / annotated_name

        if not cv2.imwrite(str(annotated_path), annotated_frame):
            raise FoodWasteServiceError("Failed to save the annotated prediction image.")

        return annotated_name

    @staticmethod
    def _normalize_model_names(names: Any) -> dict[int, str]:
        if isinstance(names, dict):
            return {int(key): str(value) for key, value in names.items()}
        if isinstance(names, (list, tuple)):
            return {index: str(value) for index, value in enumerate(names)}
        return {}

    @staticmethod
    def _parse_percentage_from_class_name(class_name: str) -> int | None:
        match = re.search(r"(\d+)", class_name)
        return int(match.group(1)) if match else None

    @staticmethod
    def _canonical_class_name(class_name: str) -> str:
        normalized = class_name.strip().lower()
        aliases = {
            "empty_plate": "empty_space",
            "empty": "empty_space",
        }
        return aliases.get(normalized, normalized)


def init_food_waste_service(app) -> None:
    """Load the YOLO model once during app startup."""
    service = FoodWasteService(
        model_path=app.config["FOOD_WASTE_MODEL_PATH"],
        predictions_dir=app.config["FOOD_WASTE_PREDICTIONS_DIR"],
        temp_upload_dir=app.config["FOOD_WASTE_TEMP_UPLOAD_DIR"],
    )
    app.extensions["food_waste_service"] = service

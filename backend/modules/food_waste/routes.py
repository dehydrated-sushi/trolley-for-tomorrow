from http import HTTPStatus

from flask import Blueprint, current_app, jsonify, request, url_for
from werkzeug.exceptions import RequestEntityTooLarge

from .service import FoodWasteServiceError


bp = Blueprint("food_waste_bp", __name__, url_prefix="/api/food-waste")


@bp.post("/predict")
def predict_food_waste():
    service = current_app.extensions["food_waste_service"]
    image_file = request.files.get("image")

    if image_file is None:
        return (
            jsonify({"success": False, "error": "No image file was provided in the 'image' field."}),
            HTTPStatus.BAD_REQUEST,
        )

    try:
        result = service.predict(image_file)
        result["annotated_image_url"] = url_for(
            "static",
            filename=f"predictions/{result['annotated_image_name']}",
            _external=True,
        )
        result.pop("annotated_image_name", None)
        return jsonify(result), HTTPStatus.OK
    except FoodWasteServiceError as exc:
        return jsonify({"success": False, "error": str(exc)}), HTTPStatus.BAD_REQUEST
    except RequestEntityTooLarge:
        return (
            jsonify({"success": False, "error": "Image exceeds the 10MB upload limit."}),
            HTTPStatus.REQUEST_ENTITY_TOO_LARGE,
        )
    except Exception:
        current_app.logger.exception("Unexpected prediction failure")
        return (
            jsonify({"success": False, "error": "Prediction failed due to an internal server error."}),
            HTTPStatus.INTERNAL_SERVER_ERROR,
        )


@bp.errorhandler(RequestEntityTooLarge)
def handle_large_upload(_error):
    return (
        jsonify({"success": False, "error": "Image exceeds the 10MB upload limit."}),
        HTTPStatus.REQUEST_ENTITY_TOO_LARGE,
    )

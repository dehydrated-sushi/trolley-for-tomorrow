#!/bin/bash
apt-get update
apt-get install -y tesseract-ocr
cd backend && gunicorn --bind=0.0.0.0 --timeout 600 "app:create_app()"

#!/usr/bin/env python3
"""
MFO Shield Ukraine - Risk API Backend
Endpoint for subject risk assessment: POST /subjects/{id}/risk
"""

from flask import Flask, jsonify, request
from datetime import datetime
import uuid
from typing import Dict, Any

app = Flask(__name__)

class RiskCalculator:
    """Calculate financial risk for MFO subjects"""
    
    RISK_FACTORS = {
        "overdue_payments": 0.3,
        "loan_defaults": 0.25,
        "compliance_violations": 0.25,
        "regulatory_flags": 0.2
    }
    
    @staticmethod
    def calculate_risk_score(subject_data: Dict[str, Any]) -> float:
        """Calculate overall risk score (0-100)"""
        score = 0
        for factor, weight in RiskCalculator.RISK_FACTORS.items():
            if factor in subject_data:
                score += subject_data[factor] * weight
        return min(max(score, 0), 100)
    
    @staticmethod
    def get_risk_level(score: float) -> str:
        """Determine risk level based on score"""
        if score >= 80:
            return "CRITICAL"
        elif score >= 60:
            return "HIGH"
        elif score >= 40:
            return "MEDIUM"
        elif score >= 20:
            return "LOW"
        else:
            return "MINIMAL"

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "healthy", "service": "MFO-Shield-Risk-API"}), 200

@app.route('/subjects/<string:subject_id>/risk', methods=['POST'])
def calculate_subject_risk(subject_id: str):
    """
    Calculate risk assessment for a subject
    
    Request body:
    {
        "overdue_payments": 0-100,
        "loan_defaults": 0-100,
        "compliance_violations": 0-100,
        "regulatory_flags": 0-100
    }
    
    Response:
    {
        "assessment_id": "uuid",
        "subject_id": "string",
        "risk_score": 0-100,
        "risk_level": "MINIMAL|LOW|MEDIUM|HIGH|CRITICAL",
        "timestamp": "ISO8601",
        "details": {...}
    }
    """
    try:
        data = request.get_json() or {}
        
        # Validate subject_id
        if not subject_id or not isinstance(subject_id, str):
            return jsonify({"error": "Invalid subject_id"}), 400
        
        # Calculate risk
        risk_score = RiskCalculator.calculate_risk_score(data)
        risk_level = RiskCalculator.get_risk_level(risk_score)
        
        response = {
            "assessment_id": str(uuid.uuid4()),
            "subject_id": subject_id,
            "risk_score": round(risk_score, 2),
            "risk_level": risk_level,
            "timestamp": datetime.utcnow().isoformat(),
            "details": {
                "overdue_payments": data.get("overdue_payments", 0),
                "loan_defaults": data.get("loan_defaults", 0),
                "compliance_violations": data.get("compliance_violations", 0),
                "regulatory_flags": data.get("regulatory_flags", 0)
            }
        }
        
        return jsonify(response), 200
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Endpoint not found"}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({"error": "Internal server error"}), 500

if __name__ == "__main__":
    # Run on port 5000 (development)
    # For production: use gunicorn or similar
    app.run(debug=False, host="0.0.0.0", port=5000)

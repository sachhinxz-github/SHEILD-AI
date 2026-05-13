"""
SHIELD_AI - Malicious Website Tracker Backend API
Flask server that provides phishing detection using ML model
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import os
from features import extract_features
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)  # Enable CORS for browser extension

# Load the trained model
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'phishing_model.pkl')
model = None

def load_model():
    """Load the ML model on first request"""
    global model
    if model is None:
        if os.path.exists(MODEL_PATH):
            model = joblib.load(MODEL_PATH)
            print("✅ Model loaded successfully")
        else:
            print("❌ Model file not found. Please train the model first.")
            raise FileNotFoundError("Model file not found. Run train.py first.")
    return model

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'SHIELD_AI API',
        'version': '1.0.0'
    })

@app.route('/predict', methods=['POST'])
def predict():
    """
    Predict if a URL is phishing or safe
    
    Expected JSON body:
    {
        "url": "https://example.com"
    }
    
    Returns:
    {
        "url": "https://example.com",
        "is_phishing": true/false,
        "confidence": 0.95,
        "risk_level": "high/medium/low/safe"
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'url' not in data:
            return jsonify({
                'error': 'URL is required',
                'message': 'Please provide a URL to analyze'
            }), 400
        
        url = data['url']
        
        if not url or not isinstance(url, str):
            return jsonify({
                'error': 'Invalid URL',
                'message': 'URL must be a non-empty string'
            }), 400
        
        # Load model
        model = load_model()
        
        # Extract features from URL
        features_dict = extract_features(url)
        # Get feature values in the same order as training
        feature_columns = ['url_length', 'n_dots', 'n_hypens', 'n_underline', 
                          'n_slash', 'n_questionmark', 'n_equal', 'n_at', 'n_and', 'n_exclamation']
        features = [features_dict[col] for col in feature_columns]
        
        # Make prediction
        prediction = model.predict([features])[0]
        probabilities = model.predict_proba([features])[0]
        
        # Calculate confidence
        confidence = float(max(probabilities))
        phishing_probability = float(probabilities[1]) if len(probabilities) > 1 else 0.0
        
        # Determine risk level
        if phishing_probability >= 0.7:
            risk_level = "high"
        elif phishing_probability >= 0.4:
            risk_level = "medium"
        elif phishing_probability >= 0.2:
            risk_level = "low"
        else:
            risk_level = "safe"
        
        result = {
            'url': url,
            'is_phishing': bool(prediction),
            'confidence': round(confidence, 4),
            'phishing_probability': round(phishing_probability, 4),
            'risk_level': risk_level,
            'features': features_dict
        }
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            'error': 'Prediction failed',
            'message': str(e)
        }), 500

@app.route('/batch-predict', methods=['POST'])
def batch_predict():
    """
    Batch prediction for multiple URLs
    
    Expected JSON body:
    {
        "urls": ["https://example1.com", "https://example2.com"]
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'urls' not in data:
            return jsonify({
                'error': 'URLs are required',
                'message': 'Please provide a list of URLs to analyze'
            }), 400
        
        urls = data['urls']
        
        if not isinstance(urls, list) or len(urls) == 0:
            return jsonify({
                'error': 'Invalid URLs list',
                'message': 'URLs must be a non-empty list'
            }), 400
        
        # Limit batch size
        if len(urls) > 100:
            return jsonify({
                'error': 'Batch size too large',
                'message': 'Maximum batch size is 100 URLs'
            }), 400
        
        # Load model
        model = load_model()
        
        results = []
        for url in urls:
            if not url or not isinstance(url, str):
                results.append({
                    'url': url,
                    'error': 'Invalid URL'
                })
                continue
            
            try:
                features_dict = extract_features(url)
                feature_columns = ['url_length', 'n_dots', 'n_hypens', 'n_underline', 
                                  'n_slash', 'n_questionmark', 'n_equal', 'n_at', 'n_and', 'n_exclamation']
                features = [features_dict[col] for col in feature_columns]
                prediction = model.predict([features])[0]
                probabilities = model.predict_proba([features])[0]
                
                confidence = float(max(probabilities))
                phishing_probability = float(probabilities[1]) if len(probabilities) > 1 else 0.0
                
                if phishing_probability >= 0.7:
                    risk_level = "high"
                elif phishing_probability >= 0.4:
                    risk_level = "medium"
                elif phishing_probability >= 0.2:
                    risk_level = "low"
                else:
                    risk_level = "safe"
                
                results.append({
                    'url': url,
                    'is_phishing': bool(prediction),
                    'confidence': round(confidence, 4),
                    'phishing_probability': round(phishing_probability, 4),
                    'risk_level': risk_level
                })
            except Exception as e:
                results.append({
                    'url': url,
                    'error': str(e)
                })
        
        return jsonify({
            'total': len(results),
            'results': results
        })
        
    except Exception as e:
        return jsonify({
            'error': 'Batch prediction failed',
            'message': str(e)
        }), 500

@app.errorhandler(404)
def not_found(e):
    return jsonify({
        'error': 'Not Found',
        'message': 'Endpoint not found'
    }), 404

@app.errorhandler(405)
def method_not_allowed(e):
    return jsonify({
        'error': 'Method Not Allowed',
        'message': 'HTTP method not supported for this endpoint'
    }), 405

@app.errorhandler(500)
def internal_error(e):
    return jsonify({
        'error': 'Internal Server Error',
        'message': 'An unexpected error occurred'
    }), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_DEBUG', 'false').lower() == 'true'
    
    print(f"🚀 Starting SHIELD_AI API server on port {port}")
    print(f"📖 API Documentation:")
    print(f"   GET  /health - Health check")
    print(f"   POST /predict - Predict single URL")
    print(f"   POST /batch-predict - Predict multiple URLs")
    
    app.run(host='0.0.0.0', port=port, debug=debug)